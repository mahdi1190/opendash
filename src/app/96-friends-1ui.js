/* ============================================================
   FRIENDS: the Friends tab (owner: Friends; docs/dev/FRIENDS.md).
   #view=friends (the hangout) and #view=friends:<id> (a friend's page).
   Group 'home'. The way in is the corner (your avatar on the sidebar's
   workspace button, 97-profile-3corner.js, 2.17.1); the sidebar's Friends
   item (after Memories) is hidden by default and comes back from
   Customise sidebar (Home > Friends).

     hangout      everyone's avatars with live presence, requests waiting
                  (approve with the check code), friend cards (their level,
                  streak, your friendship level and streak), the activity
                  feed, panels from other agents, and the quiet settings
     friend page  their profile, friendship level / streak / milestones,
                  their game, what they share with you, your feed together,
                  Cheer, Remove, Block (with Undo)
     Add a friend an invite link (single use, expires), your friend code
                  (same relay), or paste an invite

   2.18 (UI_CLEANUP_PLAN.md C6, SIMPLIFY_PLAN.md 5.9): buttons are uiButton, errors toastError,
   copies copyText (11-ui-kit.js). The page's one primary action (Add a friend; Cheer on a friend's
   page) and the rest go to the shared header (headerActions); until the shell draws them the page
   keeps its own row (frShellHeadOn, 96-friends-0core.js). The settings fold is short: your name
   (it lives on Profile), Online status (one select), your relay; Blocked under More; Connect
   directly and Lost a computer? (Lock out a lost computer) under Advanced.

   Friend strings are set with textContent only (the owner's rule); markup
   strings here are static or icon(). Entrance motion plays once per entry.
   ============================================================ */
const _frUI = { entry: '', root: null, feedN: 30, feed: null, feedAt: 0, feedBusy: false, detail: new Map(), detailAt: new Map(), burstSeen: new Set() };
const _FR_PRES = Object.freeze({ online: ['Here now', 'circle-dot'], focusing: ['Focusing', 'timer'], travelling: ['Travelling', 'plane'], away: ['Away', 'moon'], offline: ['Not around', 'moon'] });
const _FR_CHEERS = Object.freeze(['👏', '🎉', '💪', '🔥', '❤️', '🌟']);
/** Every Friends view: the five tabs (96-friends-2tabs.js) and a friend's page. */
const _FR_VIEW_RE = /^friends(:(feed|requests|shared|settings|data(:[0-9a-f]{16})?|[0-9a-f]{16}))?$/;
function _frIdOf(v) { const m = /^friends:([0-9a-f]{16})$/.exec(String(v || '')); return m ? m[1] : null; }

registerSection('friends', {
  match: v => _FR_VIEW_RE.test(String(v || '')),
  title: () => 'Friends',
  crumb: v => { const id = _frIdOf(v); if (!id) return []; const f = friendsGet(id); return [{ label: 'Friends', view: 'friends' }, f ? friendName(f) : 'Friend']; },
  group: 'life', layout: 'page', hashable: true, taskControls: false,   // Life > Friends since 2.18 (NAVIGATION_PLAN.md 2.2)
  mount(container, view) { _frMount(container, view || state.view); },
  unmount() { _frUI.entry = ''; _frUI.root = null; },
  // The page template (UX_BLUEPRINT.md 3): one primary action in the shared header, the rest under its More.
  headerActions(view) { frShellHeadMark('friends'); return _frHeadActions(view || state.view); },
});
/** The header's primary action (Add a friend, on every tab) and its More items. A friend's own actions (Cheer, Share a task, Remove, Block) sit on their card. */
function _frHeadActions(view) {
  return { primary: { label: 'Add a friend', icon: 'user-plus', run: () => friendsAddDialog() }, more: _frMoreItems(_fr.data) };
}
/** The hangout's occasional things (the header's More, or the page's own More until the shell draws it). */
function _frMoreItems(d) {
  const items = [];
  if (d && d.me && d.me.id) items.push({ label: 'Show my friend code', icon: 'key-round', run: () => friendsAddDialog('code') });
  items.push({ label: 'Check for news now', icon: 'refresh-cw', run: () => _frCheckNow(null) });
  if (typeof friendsOnboardOpen === 'function') items.push({ label: 'Getting started', icon: 'sparkles', run: () => friendsOnboardOpen() });
  if (typeof friendsHelpOpen === 'function') items.push({ label: 'How friends work', icon: 'circle-help', run: () => friendsHelpOpen() });
  items.push({ label: 'What friends can see', icon: 'shield-check', run: () => setView('settings:privacy') });
  return items;
}
function _frHeadAnchor() { return document.querySelector('#view-header .btn-primary') || document.getElementById('view-header') || document.body; }
/** Ask friends' computers for anything new now (the feed's refresh and the More item). */
function _frCheckNow(btn) {
  return _frDo(btn, async () => { const r = await _frApi('/api/friends/check', {}); _frUI.feedAt = 0; await friendsLoad(true); _frRepaint(); return r; },
    (r) => (r && r.got ? `${r.got} new` : 'Up to date'), 'check for news');
}
// Life's first tab (2.18): the sidebar row, the tab strip, All pages and the corner hub read this. The Home row it
// replaces ('friends-nav', hidden by default in 2.17.1) is gone; a friend's page offers the shared 'Back to'.
registerPage({
  id: 'friends', view: 'friends', match: v => _FR_VIEW_RE.test(String(v || '')),
  label: 'Friends', icon: 'users', area: 'life', tab: true, order: 10, since: '2.17', discover: true,
  desc: 'Your friends, cheers, and things to do together',
  keywords: 'friends social hangout cheer cheers streak level feed invite gifts stickers together',
  badge: () => { const d = _fr.data; const n = d && d.friends ? d.friends.filter(f => f.status === 'incoming' || (f.status === 'requested' && f.step === 'check')).length : 0; return n ? String(n) : ''; },
});
registerCommand({ id: 'friends-open', label: 'Friends', icon: 'users', group: 'Go to', keywords: 'friends social hangout cheer streak level', run: () => setView('friends') });
registerCommand({ id: 'friends-add', label: 'Add a friend', icon: 'user-plus', keywords: 'friend invite code add connect link', run: () => friendsAddDialog() });

/* ---------- small builders (text always through textContent) ---------- */
function _frEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = String(text);
  return e;
}
/**
 * Run fn with btn busy; ok: the success toast (text, or (result) -> text). o: what failed, as a verb phrase
 * ('approve them'), or {what, retry: false} when Try again cannot work (a request with its own Cancel).
 * An error says "Couldn't <what>: <reason>." with Try again (toastError, 11-ui-kit.js).
 */
async function _frDo(btn, fn, ok, o) {
  const opt = typeof o === 'string' ? { what: o } : (o || {});
  if (btn) { btn.disabled = true; btn.classList.add('is-busy'); btn.setAttribute('aria-busy', 'true'); }
  try {
    const r = await fn();
    if (ok) toast(typeof ok === 'function' ? ok(r) : ok, { kind: 'ok' });
    return r;
  } catch (e) {
    if (e && e.name === 'AbortError') return null;
    toastError(opt.what || '', e, opt.retry === false ? undefined : () => _frDo(null, fn, ok, opt));
    return null;
  } finally { if (btn && btn.isConnected) { btn.disabled = false; btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy'); } }
}
function _frReduced() { return !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
function _frAgo(ms) {
  const s = Math.max(0, Math.round((Date.now() - Number(ms)) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  const d = Math.round(s / 86400);
  return d === 1 ? 'yesterday' : d < 30 ? d + ' days ago' : new Date(Number(ms)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d > 300 ? 'numeric' : undefined });
}
function _frDate(ms) { return ms ? new Date(Number(ms)).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : ''; }
const _FR_COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f08c00', '#0c8599', '#d6336c', '#5f3dc4'];
function _frColorOf(f) {
  const c = f && f.profile && f.profile.color;
  if (typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c;
  let h = 0; const s = String((f && f.id) || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return _FR_COLORS[h % _FR_COLORS.length];
}
/** A friend's avatar: agent 'profile' draws it when profileAvatarEl is defined; else initials or their emoji (never a picture from them). */
function friendAvatarEl(f, size) {
  const sz = Number(size) || 40;
  if (typeof profileAvatarEl === 'function') {
    try { const el = profileAvatarEl(f, { size: sz }); if (el && el.nodeType === 1) return el; } catch (e) { console.error('[friends] avatar', e); }
  }
  const el = _frEl('span', 'fr-av');
  el.style.setProperty('--size', sz + 'px');
  el.style.setProperty('--c', _frColorOf(f));
  const em = f && f.profile && typeof f.profile.emoji === 'string' ? f.profile.emoji : '';
  if (em) { el.classList.add('is-emoji'); el.textContent = em; }
  else el.textContent = avatarInitials(friendName(f));
  return el;
}
/** The avatar with its presence ring and dot (repainted live: data-fr-presence). */
function _frAvatarWrap(f, size, o) {
  o = o || {};
  const w = _frEl('span', 'fr-avw' + (o.cls ? ' ' + o.cls : ''));
  w.style.setProperty('--size', (Number(size) || 40) + 'px');
  w.appendChild(friendAvatarEl(f, size));
  if (f && f.id && o.presence !== false) {
    w.setAttribute('data-fr-presence', f.id);
    w.setAttribute('data-p', f.presence || 'offline');
    const dot = _frEl('span', 'fr-dot');
    dot.setAttribute('aria-hidden', 'true');
    w.appendChild(dot);
    w.title = `${friendName(f)}: ${(_FR_PRES[f.presence] || _FR_PRES.offline)[0]}`;
  }
  return w;
}
function _frMeAvatar(d, size) {
  return _frAvatarWrap({ id: '', name: (d.me && d.me.name) || 'You', profile: null }, size, { presence: false, cls: 'is-me' });
}
/** A ring (SVG, static markup) for a level: pct 0..1. */
function _frRingSvg(pct) {
  const p = Math.max(0, Math.min(1, Number(pct) || 0)) * 100;
  return `<svg class="fr-ring" viewBox="0 0 36 36" aria-hidden="true"><circle class="fr-ring-bg" cx="18" cy="18" r="15.9"/><circle class="fr-ring-fg" cx="18" cy="18" r="15.9" style="stroke-dasharray:${p.toFixed(1)} 100"/></svg>`;
}
/** A little burst of colour (a new friend, a milestone, a cheer sent). Nothing with reduced motion. */
function _frBurst(anchor) {
  if (_frReduced() || !anchor || !anchor.getBoundingClientRect) return;
  const r = anchor.getBoundingClientRect();
  const host = _frEl('div', 'fr-burst');
  host.setAttribute('aria-hidden', 'true');
  host.style.left = (r.left + r.width / 2) + 'px';
  host.style.top = (r.top + r.height / 2) + 'px';
  for (let i = 0; i < 14; i++) {
    const s = _frEl('i');
    const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
    const dist = 34 + Math.random() * 30;
    s.style.setProperty('--x', Math.cos(a) * dist + 'px');
    s.style.setProperty('--y', Math.sin(a) * dist + 'px');
    s.style.setProperty('--c', _FR_COLORS[i % _FR_COLORS.length]);
    host.appendChild(s);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 1100);
}
/** Settings > Your relay; start: begin setting one up there now (the relay page's own "Set up my relay"). */
function _frOpenRelaySettings(start) {
  if (typeof relaySettingsOpen === 'function') { try { relaySettingsOpen(start ? { start: true } : undefined); return; } catch (e) { console.error('[friends] relay settings', e); } }
  setView('settings:relay');
}
/** "Set up my relay", or "Update my relay" when it is yours already: the relay page's own words (SIMPLIFY_PLAN.md 2). */
function _frRelayBtn(d, o) {
  const home = d && d.relay && d.relay.home;
  o = o || {};
  if (home && home.role === 'owner') {
    return uiButton({ label: 'Update my relay', icon: 'cloud', kind: o.kind || 'secondary', size: o.size, run: () => {
      if (o.close) o.close();
      _frOpenRelaySettings(false);
      // as the relay page's own Update button does, after reading it fresh (never from a stale view)
      if (typeof relayConnect === 'function' && typeof _rlLoad === 'function') {
        Promise.resolve(_rlLoad()).then(() => { const st = typeof _rlSt !== 'undefined' ? _rlSt : null; if (st && !st.error && st.relay && !(st.connect && st.connect.state === 'running')) relayConnect(); })
          .catch((e) => console.error('[friends] relay update', e));
      }
    } });
  }
  return uiButton({ label: 'Set it up', icon: 'cloud', kind: o.kind || 'primary', size: o.size, run: () => { if (o.close) o.close(); _frOpenRelaySettings(true); } });
}

/* ---------- mount and repaint ---------- */
function _frMount(container, view) {
  _fr.opened = true;
  const tab = _frTabOf(view);
  const entering = _frUI.entry !== tab;   // moving between friends on one tab is not an entrance
  _frUI.entry = tab;
  const root = _frEl('div', 'fr-page' + (entering ? ' is-enter' : ''));
  container.appendChild(root);
  _frUI.root = root;
  const d = _fr.data;
  if (!d || !d.me || !d.me.id) {
    headerSubTabs(_frSubTabs(tab, d), /^friends(:|$)/);   // the tabs are there from the first paint: nothing moves when the page has loaded
    root.appendChild(_frLoading());
    friendsLoad(true).then(() => friendsPageRefresh()).catch((e) => { if (!root.isConnected) return; root.textContent = ''; root.appendChild(_frErrorCard(e)); });
    return;
  }
  _frRender(root, view);
  if (entering && window.Motion && Motion.stagger) Motion.stagger(root, { selector: '.fr-sec, .fr-fhero, .fr-pend, .md-list', step: 35, max: 6 });
  if (entering || Date.now() - _fr.at > 15000) friendsLoad(true).then(() => friendsPageRefresh()).catch(() => {});
}
/** Paint the open Friends page again in place (no entrance motion, scroll kept). */
function friendsPageRefresh() {
  const root = _frUI.root;
  if (!root || !root.isConnected) return;
  const main = document.getElementById('main');
  const top = main ? main.scrollTop : 0;
  const focus = document.activeElement && root.contains(document.activeElement) && document.activeElement.id ? document.activeElement.id : null;
  root.textContent = '';
  root.classList.remove('is-enter');
  if (!_fr.data || !_fr.data.me) { root.appendChild(_frLoading()); return; }
  _frRender(root, state.view);
  if (main) main.scrollTop = top;
  if (focus) { const el = document.getElementById(focus); if (el) el.focus(); }
}
function _frRender(root, view) {
  try {
    _frRenderTabs(root, view);   // 96-friends-2tabs.js
  } catch (e) {
    console.error('[friends] page', e);
    root.textContent = '';
    root.appendChild(_frErrorCard(e));
  }
}
function _frLoading() {
  const el = _frEl('div', 'fr-loading');
  el.innerHTML = icon('loader-circle', 'i-lg fr-spin');
  el.appendChild(_frEl('span', null, 'Opening your hangout…'));
  return el;
}
function _frErrorCard(e) {
  const el = _frEl('div', 'card fr-empty');
  el.innerHTML = icon('circle-alert', 'i-lg');
  const t = _frEl('div');
  t.append(_frEl('b', null, "Friends couldn't open"), _frEl('span', 'muted', netErrorMessage(e)));
  el.appendChild(t);
  el.appendChild(uiButton({ label: 'Try again', icon: 'refresh-cw', wait: true, run: () => friendsLoad(true).then(() => friendsPageRefresh()).catch((x) => toastError('open Friends', x)) }));
  return el;
}

/* ---------- the hangout ---------- */
const _frPresRank = (f) => ({ online: 0, focusing: 1, travelling: 2, away: 3 })[f.presence] ?? 4;
/** A section of the page: the kit's section header (secHead, 11-ui-kit.js) and an optional action beside it. */
function _frSec(title, ic, extra) {
  const s = _frEl('section', 'fr-sec');
  s.appendChild(secHead({ title, icon: ic || 'sparkles', cls: 'fr-sec-h', actions: extra ? [extra] : [] }));
  return s;
}
/** No relay yet: status first (Not set up, grey: nothing is wrong), one sentence, Set up my relay (SIMPLIFY_PLAN.md 5.9). */
function _frNoRelay(d) {
  const el = _frEl('section', 'card fr-norelay fr-sec');
  const ic = _frEl('div', 'fr-norelay-ic');
  ic.innerHTML = icon('cloud', 'i-lg');
  const t = _frEl('div', 'fr-norelay-t');
  t.appendChild(setStatusLine('off', 'Not set up', 'Set up your relay to add friends'));
  t.appendChild(_frEl('span', 'muted', "Free, about 2 minutes. Or join a friend's with their invite."));
  const a = _frEl('div', 'fr-norelay-a');
  a.appendChild(_frRelayBtn(d));
  a.appendChild(uiButton({ label: 'Paste an invite', icon: 'clipboard', run: () => friendsAddDialog('paste') }));
  el.append(ic, t, a);
  return el;
}

/* ---------- requests: approve with the check code ---------- */
function _frPendingSec(list) {
  const sec = _frSec(list.some(f => f.status === 'incoming' || f.step === 'check') ? 'Waiting for you' : 'Requests', 'user-check');
  for (const f of list) sec.appendChild(_frPendCard(f));
  return sec;
}
// 2.20.1: the check code as 3 pictures both screens show (from its 6 digits, so an older OpenDash
// on the other side still compares by the numbers, shown small underneath).
const FR_PICTURES = [
  ['🐢', 'Turtle'], ['🍎', 'Apple'], ['⭐', 'Star'], ['🐱', 'Cat'], ['🌻', 'Sunflower'], ['🚲', 'Bicycle'], ['🍌', 'Banana'], ['🐟', 'Fish'],
  ['🎈', 'Balloon'], ['🌙', 'Moon'], ['🐶', 'Dog'], ['🍓', 'Strawberry'], ['🚗', 'Car'], ['🌲', 'Tree'], ['🐝', 'Bee'], ['🎁', 'Present'],
  ['🦊', 'Fox'], ['🍋', 'Lemon'], ['☂️', 'Umbrella'], ['🐸', 'Frog'], ['🔑', 'Key'], ['🍄', 'Mushroom'], ['🐘', 'Elephant'], ['🚀', 'Rocket'],
  ['🌈', 'Rainbow'], ['🐧', 'Penguin'], ['🍇', 'Grapes'], ['⚓', 'Anchor'], ['🦋', 'Butterfly'], ['🍕', 'Pizza'], ['🐴', 'Horse'], ['🎸', 'Guitar'],
  ['🐻', 'Bear'], ['🍒', 'Cherries'], ['⛵', 'Sailboat'], ['🐰', 'Rabbit'], ['🌵', 'Cactus'], ['🔔', 'Bell'], ['🦉', 'Owl'], ['🍩', 'Doughnut'],
  ['🐳', 'Whale'], ['🌷', 'Tulip'], ['🚂', 'Train'], ['🐞', 'Ladybird'], ['🍉', 'Watermelon'], ['☕', 'Cup'], ['🦁', 'Lion'], ['🎩', 'Hat'],
  ['🐌', 'Snail'], ['🥕', 'Carrot'], ['✈️', 'Plane'], ['🐼', 'Panda'], ['🍐', 'Pear'], ['🎺', 'Trumpet'], ['🦆', 'Duck'], ['🧁', 'Cupcake'],
  ['🐙', 'Octopus'], ['🌽', 'Corn'], ['🏠', 'House'], ['🦒', 'Giraffe'], ['🥝', 'Kiwi'], ['📚', 'Books'], ['🐮', 'Cow'], ['🍪', 'Cookie'],
];
/** The 3 pictures for a check code ("123 456" or "123456"): the same on both screens. */
function friendsCheckPictures(code) {
  const n = Number(String(code || '').replace(/\D/g, ''));
  if (!Number.isFinite(n) || String(code || '').replace(/\D/g, '').length !== 6) return [];
  return [n % 64, Math.floor(n / 64) % 64, Math.floor(n / 4096) % 64].map(i => FR_PICTURES[i]);
}
function _frCodeEl(code) {
  const wrap = _frEl('div', 'fr-check');
  const pics = friendsCheckPictures(code);
  const row = _frEl('div', 'fr-check-pics');
  for (const [e, w] of pics) { const p = _frEl('span', 'fr-check-pic'); const em = _frEl('span', 'fr-check-e', e); em.setAttribute('aria-hidden', 'true'); p.append(em, _frEl('span', 'fr-check-w', w)); row.appendChild(p); }
  row.setAttribute('role', 'img'); row.setAttribute('aria-label', 'Pictures: ' + pics.map(p => p[1]).join(', '));
  wrap.appendChild(row);
  wrap.appendChild(_frEl('span', 'muted fr-small num', 'If their screen shows numbers instead: ' + (code || '')));
  return wrap;
}
function _frPendCard(f) {
  const el = _frEl('div', 'card fr-pend' + (f.step === 'check' ? ' is-check' : ''));
  el.appendChild(_frAvatarWrap(f, 44, { presence: false }));
  const body = _frEl('div', 'fr-pend-b');
  const name = friendName(f);
  const acts = _frEl('div', 'fr-pend-a');
  if (f.status === 'incoming') {
    body.appendChild(_frEl('b', null, `${name} wants to connect`));
    body.appendChild(_frEl('span', 'muted fr-small', f.how === 'invite' ? 'They used your invite link.' : 'They found you with your friend code.'));
    if (f.step === 'check') {
      body.appendChild(_frEl('span', null, `Is it really ${name}? Accept only if their screen shows these same pictures:`));
      body.appendChild(_frCodeEl(f.code));
      acts.appendChild(uiButton({ label: 'Accept', icon: 'check', kind: 'primary', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/approve', { id: f.id }); _frBurst(b); await friendsLoad(true); _frRepaint(); }, null, 'accept ' + name) }));
      acts.appendChild(uiButton({ label: "No, they're different", size: 'sm', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/mismatch', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Stopped. Nothing was shared. You can try adding each other again.', 'stop this request') }));
    } else {
      const w = _frEl('span', 'fr-wait');
      w.innerHTML = icon('loader-circle', 'i-sm fr-spin');
      w.appendChild(_frEl('span', null, `Getting the pictures to check… ${name}'s Freeflo needs to be on.`));
      body.appendChild(w);
    }
    acts.appendChild(uiButton({ label: 'Decline', size: 'sm', kind: 'ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/decline', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Declined. They are not told why.', 'decline') }));
    acts.appendChild(uiButton({ icon: 'lock', size: 'sm', kind: 'ghost', tip: 'Block: they can never reach you again', aria: 'Block', run: () => _frRemove(f, true) }));
  } else {
    if (f.step === 'check') {
      // Added by code: this side compares the code too (a relay could have answered for someone else).
      body.appendChild(_frEl('b', null, f.theyApproved ? `${name} accepted: check the pictures to finish` : `Check the pictures with ${name}`));
      body.appendChild(_frEl('span', null, `Does ${name}'s screen show these same pictures?`));
      body.appendChild(_frCodeEl(f.code));
      acts.appendChild(uiButton({ label: 'Yes, the same', icon: 'check', kind: 'primary', run: (e, b) => _frDo(b, async () => { const r = await _frApi('/api/friends/confirm', { id: f.id }); if (r && r.friend && r.friend.status === 'friend') _frBurst(b); await friendsLoad(true); _frRepaint(); }, null, 'finish adding ' + name) }));
      acts.appendChild(uiButton({ label: "No, they're different", size: 'sm', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/mismatch', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Stopped. Nothing was shared. You can try adding each other again.', 'stop this request') }));
    } else if (f.step === 'approve') {
      body.appendChild(_frEl('b', null, `Waiting for ${name} to accept`));
      body.appendChild(_frEl('span', null, f.how === 'code' ? 'You checked the pictures. They accept once their screen shows the same:' : 'Tell them your pictures. They accept once their screen shows the same:'));
      body.appendChild(_frCodeEl(f.code));
      acts.appendChild(uiButton({ label: "No, they're different", size: 'sm', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/mismatch', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Stopped. Nothing was shared. You can try again with a new invite.', 'stop this request') }));
    } else {
      body.appendChild(_frEl('b', null, `Request sent to ${name}`));
      const w = _frEl('span', 'fr-wait');
      w.innerHTML = icon('hourglass', 'i-sm');
      w.appendChild(_frEl('span', null, `Sent. It arrives when ${name} is next online.`));
      body.appendChild(w);
    }
    acts.appendChild(uiButton({ label: 'Cancel', size: 'sm', kind: 'ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/cancel', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Request cancelled', 'cancel the request') }));
  }
  el.append(body, acts);
  return el;
}
function _frDeclinedSec(list) {
  const sec = _frSec('Not this time', 'hourglass');
  for (const f of list) {
    const row = _frEl('div', 'fr-row');
    row.appendChild(_frAvatarWrap(f, 28, { presence: false }));
    const why = f.why === 'codes-differed' ? `The pictures with ${friendName(f)} were different, so nothing was shared.`
      : f.why === 'you-declined' ? `You declined ${friendName(f)}.` : `${friendName(f)} didn't accept this time.`;
    row.appendChild(_frEl('span', 'fr-row-t', why));
    row.appendChild(uiButton({ label: 'Dismiss', size: 'sm', kind: 'ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/cancel', { id: f.id }); await friendsLoad(true); _frRepaint(); }, null, 'dismiss it') }));
    sec.appendChild(row);
  }
  return sec;
}

/* ---------- friend cards ---------- */
function _frCheerMenu(anchor, f) {
  openPopover(anchor, (el, close) => {
    el.classList.add('fr-cheers');
    el.appendChild(_frEl('div', 'pop-label', `Cheer ${friendName(f)} on`));
    const row = _frEl('div', 'fr-cheer-row');
    for (const em of _FR_CHEERS) {
      const b = _frEl('button', 'fr-cheer-em', em);
      b.type = 'button';
      b.setAttribute('aria-label', 'Send ' + em);
      b.onclick = () => { close(); _frDo(null, async () => { const r = await friendsCheer(f.id, em); _frBurst(anchor); if (r && !r.sent && !r.queued) throw new Error(`${friendName(f)} isn't receiving cheers from you right now.`); return r; }, (r) => (r && r.queued && !r.sent ? `Cheer for ${friendName(f)} is waiting to send` : `Cheer sent to ${friendName(f)} ${em}`), 'send the cheer'); };
      row.appendChild(b);
    }
    el.appendChild(row);
  }, { align: 'end' });
}

/* ---------- the activity feed ---------- */
function _frDescribe(e, f) {
  const fn = _fr.describers.get(e.k) || (e.k.includes(':') ? _fr.describers.get(e.k.slice(0, e.k.indexOf(':') + 1) + '*') : null);
  if (fn) { try { const r = fn(e, f, _fr.data && _fr.data.me); if (r && r.text) return r; } catch (x) { console.error('[friends] describe ' + e.k, x); } }
  const who = f ? friendName(f) : 'A friend';
  const mine = e.dir === 'out' || e.dir === 'local';
  const b = e.b && typeof e.b === 'object' ? e.b : {};
  const t = (s) => (s ? ` “${s}”` : '');
  if (e.txt) return { icon: e.ic || 'sparkles', text: e.txt };
  switch (e.k) {
    case 'friended': return { icon: 'party-popper', text: `You and ${who} became friends`, tone: 'party' };
    case 'renewed': return b.twice
      ? { icon: 'triangle-alert', text: `Paused: two different updates claimed to be from ${who}. Ask them for a fresh invite.` }
      : { icon: 'key-round', text: `${who} updated their security. You're still friends; nothing to do.` };
    case 'cheer': return { icon: 'heart', text: mine ? `You cheered ${who} on ${b.emoji || ''}${b.text ? ':' + t(b.text) : ''}` : `${who} cheered you on ${b.emoji || ''}${b.text ? ':' + t(b.text) : ''}`, tone: 'warm' };
    case 'game:level': return { icon: 'trophy', text: `${who} reached level ${b.level}${b.title ? ` (${b.title})` : ''}`, tone: 'party' };
    case 'game:streak': return { icon: 'flame', text: `${who} is on a ${b.n}-day streak`, tone: 'warm' };
    case 'quest': {
      const q = b.title ? t(b.title) : ' a quest';
      const W = mine ? 'You' : who;
      const m = { offer: `${W} offered${q}`, accept: `${W} joined${q}`, progress: `${W} moved${q} forward${b.of ? ` (${b.n || 0} of ${b.of})` : ''}`, done: `${W} finished${q}`, drop: `${W} left${q}` };
      return { icon: b.state === 'done' ? 'trophy' : 'target', text: m[b.state] || `${W} updated${q}`, tone: b.state === 'done' ? 'party' : '' };
    }
    case 'focus': {
      const W = mine ? 'You' : who;
      const m = { invite: mine ? `You invited ${who} to focus together` : `${who} invited you to focus together`, join: `${W} joined a focus session`, start: `${W} started focusing${b.min ? ` for ${b.min} min` : ''}`, done: `${W} finished ${b.min ? b.min + ' focused minutes' : 'a focus session'}`, leave: `${W} left the focus session` };
      return { icon: 'timer', text: m[b.state] || `${W} focused`, tone: b.state === 'done' ? 'warm' : '' };
    }
    case 'challenge': {
      const c = b.title ? t(b.title) : ' a challenge';
      const W = mine ? 'You' : who;
      const m = { offer: `${W} challenged ${mine ? who : 'you'}:${c}`, accept: `${W} took on${c}`, progress: `${W} scored ${b.score || 0}${b.of ? ` of ${b.of}` : ''} in${c}`, win: `${W} won${c}`, lose: `${W} lost${c}`, draw: `${c.trim()}: a draw`, drop: `${W} dropped${c}` };
      return { icon: 'medal', text: m[b.state] || `${W} updated${c}`, tone: b.state === 'win' ? 'party' : '' };
    }
    case 'note': return { icon: b.icon || 'sparkles', text: b.text || 'Something happened' };
    default:
      if (e.k.startsWith('space:')) return { icon: 'layers', text: mine ? `You changed a shared space${b.title ? ':' + t(b.title) : ''}` : `${who} changed a shared space${b.title ? ':' + t(b.title) : ''}` };
      return { icon: 'sparkles', text: mine ? `You sent ${who} a ${e.k.split(':')[0]}` : `${who} sent you a ${e.k.split(':')[0]}` };
  }
}

/* ---------- settings (quiet, at the bottom; SIMPLIFY_PLAN.md 5.9) ----------
   On the face: your name (one name, changed on Profile), Online status (one select), your relay.
   More: who you blocked. Advanced: connecting directly on the same Wi-Fi, and Lost a computer?. */
function _frSettingsSec(d, o) {
  const open = !!(o && o.open);   // the Settings tab shows it open; elsewhere it would be a fold
  const det = _frEl(open ? 'section' : 'details', 'fr-sec fr-settings' + (open ? ' is-open' : ''));
  det.id = 'fr-settings';
  if (!open) {   // on the Settings tab the tab says it; elsewhere a fold needs its summary
    const sum = _frEl('summary', 'fr-sec-h');
    sum.innerHTML = icon('settings', 'i-sm');
    sum.appendChild(_frEl('h2', null, 'Friends settings and privacy'));
    det.appendChild(sum);
  }
  const body = _frEl('div', 'fr-set-b');
  // your name: one name for greetings, your card and friends (L11); it is changed on Profile
  const toProfile = uiButton({ label: 'Change on your Profile', size: 'sm', icon: 'user-round-pen', run: () => _frOpenProfileName() });
  body.appendChild(_settingsRow(`Your name: ${d.me.name || (typeof profileDisplayName === 'function' ? profileDisplayName() : '') || 'not set'}`, '', toProfile));
  // online status: one select (Off, or how you show) (L15)
  body.appendChild(_settingsRow('Online status', 'A word like “focusing”, never where you are.', _frPresenceSelect(d)));
  // your friend code: people on your relay add you with it
  // 2.20.1: no lasting friend code here any more; "Show my friend code" makes a 4-letter one for 10 minutes.
  body.appendChild(_settingsRow('Your friend code', 'A 4-letter code for a friend to type. It works once, for 10 minutes.', uiButton({ label: 'Show my friend code', icon: 'key-round', size: 'sm', run: () => friendsAddDialog('code') })));
  // your relay
  const home = d.relay && d.relay.home;
  body.appendChild(_settingsRow(home ? (home.role === 'owner' ? 'Relay: yours' : 'Relay: a friend’s') : 'Relay: not set up', '',
    home ? uiButton({ label: 'Your relay', size: 'sm', icon: 'cloud', run: () => _frOpenRelaySettings(false) }) : _frRelayBtn(d, { size: 'sm' })));
  if (d.relay && d.relay.outbox) body.appendChild(emptyLine(`${d.relay.outbox} message${d.relay.outbox === 1 ? '' : 's'} waiting to send.`));
  // More: who you blocked
  setFold(body, 'friends-settings-more', 'More', ({ body: b }) => {
    const blocked = (d.friends || []).filter(f => f.status === 'blocked');
    if (!blocked.length) return;
    b.appendChild(_frEl('div', 'fr-set-l', 'Blocked'));
    for (const f of blocked) {
      const row = _frEl('div', 'fr-row');
      row.appendChild(_frEl('span', 'fr-row-t', friendName(f)));
      row.appendChild(uiButton({ label: 'Unblock', size: 'sm', kind: 'ghost', run: (e, btn) => _frDo(btn, async () => { await _frApi('/api/friends/unblock', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Unblocked. They can send you a request again.', 'unblock ' + friendName(f)) }));
      b.appendChild(row);
    }
  });
  // Advanced: connect directly, and a lost computer
  setFold(body, 'friends-settings-adv', 'Advanced', ({ body: b }) => {
    const on = d.me.prefs.direct !== false;
    const sw = _settingsSwitch(on, 'Connect directly on the same Wi-Fi', (v) => { sw.setAttribute('aria-checked', v ? 'true' : 'false'); _frDo(null, async () => { await _frApi('/api/friends/me', { direct: v }); await friendsLoad(true); }, null, 'change it'); });
    b.appendChild(_settingsRow('Connect directly on the same Wi-Fi', 'Shares this computer’s local address with friends.' + (d.direct && d.direct.on ? '' : ' Off on this computer for now.'), sw));
    if (d.me && d.me.id) b.appendChild(_settingsRow('Lost a computer?', 'Lock it out so it can’t act as you.', _frKeysEl(d)));
  }, { advanced: true });
  det.appendChild(body);
  return det;
}
/** Online status: Off, Automatic, Always "here now", Focusing, Travelling, Away (one control: SIMPLIFY_PLAN.md 5.9, L15). */
function _frPresenceSelect(d) {
  const pres = (d.me && d.me.prefs && d.me.prefs.presence) || {};
  const cur = pres.share ? (pres.state || 'auto') : 'off';
  const sel = _settingsSelect([['off', 'Off'], ['auto', 'Automatic'], ['online', 'Always “here now”'], ['focusing', 'Focusing'], ['travelling', 'Travelling'], ['away', 'Away']], cur, (v) => {
    _frDo(null, () => (v === 'off' ? friendsPresenceShare(false) : friendsPresenceShare(true, v)), v === 'off' ? 'Online status off' : 'Online status on', 'change your online status');
  });
  sel.id = 'fr-set-presence';
  sel.setAttribute('aria-label', 'Online status');
  return sel;
}
/** Settings > Profile, at "Your name" (97-profile-2ui.js). */
function _frOpenProfileName() {
  setView('profile');
  setTimeout(() => { const r = document.querySelector('[data-setting-label="Your name"]'); if (r) { r.scrollIntoView({ block: 'center' }); const i = r.querySelector('input'); if (i) i.focus({ preventScroll: true }); } }, 80);
}

/* ---------- a friend's page ---------- */
function _frDetail(id) {
  const at = _frUI.detailAt.get(id) || 0;
  if (Date.now() - at > 8000 || _fr.at > at) {
    _frUI.detailAt.set(id, Date.now());
    _frApi('/api/friends/friend?id=' + encodeURIComponent(id)).then((r) => {
      _frUI.detail.set(id, r);
      if (_frIdOf(state.view) === id) friendsPageRefresh();
    }).catch(() => {});
  }
  return _frUI.detail.get(id) || null;
}
/** What a friend shares with you, in ONE block: their game (one line of numbers), bio, city, and anything else they publish. null when there is nothing. */
function _frFriendAbout(f, det) {
  const sec = _frSec(`About ${friendName(f)}`, 'user-check');
  const p = f.profile || {}, g = f.game;
  let any = false;
  const line = (label, value) => { if (!value) return; any = true; const r = _frEl('div', 'fr-share'); r.append(_frEl('span', 'muted', label), _frEl('span', null, value)); sec.appendChild(r); };
  if (p.bio) { any = true; sec.appendChild(_frEl('p', 'fr-bio', p.bio)); }
  line('Pronouns', p.pronouns);
  line('City', p.city);
  if (g && g.level) {
    const bits = [`Level ${g.level}${g.title ? ' ' + g.title : ''}`];
    if (g.streak) bits.push(`${g.streak}-day streak`);
    if (g.xpWeek != null) bits.push(`${Number(g.xpWeek).toLocaleString()} XP this week`);
    if (g.quests != null) bits.push(`${g.quests} quests done`);
    if (g.focusMin) bits.push(`${Math.round(g.focusMin / 60)} h focused`);
    line('Game', bits.join(' · '));
  }
  const shared = det && det.shared ? det.shared : {};
  for (const [k, v] of Object.entries(shared)) {
    if (k === 'profile' || k === 'share:game' || !k.startsWith('share:')) continue;
    const bd = v && v.b && typeof v.b === 'object' ? v.b : {};
    line(k.slice(6).replace(/[-_]/g, ' '), typeof bd.text === 'string' && bd.text ? bd.text : `Updated ${_frAgo(v.at)}`);
  }
  return any ? sec : null;
}
function _frRemove(f, block) {
  _frDo(null, async () => {
    const r = await _frApi('/api/friends/remove', { id: f.id, block: !!block });
    await friendsLoad(true);
    if (_frIdOf(state.view) === f.id) setView('friends'); else _frRepaint();
    const name = friendName(f);
    const ms = Math.max(3000, (r.undoUntil || Date.now() + 10000) - Date.now() - 500);
    toast(block
      ? `Blocked ${name}. Your copy of what they shared is deleted, and their app is asked to delete yours (that can't be forced on their device).`
      : `Removed ${name}. Your copy of what they shared is deleted, and their app is asked to delete yours (that can't be forced on their device).`,
    { icon: block ? 'lock' : 'user-minus', timeout: ms, action: { label: 'Undo', run: () => _frDo(null, async () => { await _frApi('/api/friends/remove/undo', { id: f.id }); await friendsLoad(true); _frRepaint(); }, `${name} is back`) } });
  });
}

/* ---------- Add a friend ---------- */
function friendsAddDialog(tab) {
  const d = _fr.data;
  _fr.opened = true;
  let cur = tab || (d && d.relay && d.relay.home ? 'invite' : 'paste');
  openDialog({
    title: 'Add a friend', size: 'md', fixed: true, resizeKey: 'w520',   // its three tabs keep one height (UI_CLEANUP_PLAN.md 1.3)
    body(el, close) {
      el.classList.add('fr-add');
      const tabs = _frEl('div', 'fr-tabs');
      tabs.setAttribute('role', 'tablist');
      const pane = _frEl('div', 'fr-add-pane');
      const TABS = [['invite', 'Invite link', 'link'], ['code', 'Friend code', 'key-round'], ['paste', 'Paste an invite', 'clipboard']];
      const paint = () => {
        tabs.textContent = '';
        for (const [id, label, ic] of TABS) {
          const b = _frEl('button', 'fr-tab');
          b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', id === cur ? 'true' : 'false');
          b.innerHTML = icon(ic, 'i-sm');
          b.appendChild(_frEl('span', null, label));
          b.onclick = () => { if (id === cur) return; cur = id; paint(); };
          tabs.appendChild(b);
        }
        pane.textContent = '';
        const data = _fr.data || d;
        if (cur === 'invite') _frAddInvite(pane, data, close);
        else if (cur === 'code') _frAddCode(pane, data, close);
        else _frAddPaste(pane, close);
      };
      el.append(tabs, pane);
      paint();
    },
  });
}
function _frNeedRelay(pane, close) {
  const e = _frEl('div', 'fr-add-norelay');
  e.innerHTML = icon('cloud', 'i-lg');
  const t = _frEl('div');
  t.append(_frEl('b', null, 'One small set-up first'), _frEl('span', 'muted', "Friends connect through a small private service. Set yours up once (it's free), or paste a friend's invite."));
  e.appendChild(t);
  const a = _frEl('div', 'fr-add-acts');
  a.append(_frRelayBtn(_fr.data, { close }));
  pane.append(e, a);
}
function _frAddInvite(pane, d, close) {
  if (!d || !d.relay || !d.relay.home) { _frNeedRelay(pane, close); return; }
  pane.appendChild(_frEl('p', null, 'Send it to one person, by message or email. It works once; you both check the same pictures before you’re connected.'));
  const opts = _frEl('div', 'fr-add-opts');
  const ttl = document.createElement('select');
  ttl.className = 'input input-sm';
  for (const [v, l] of [['1', 'Expires in 1 day'], ['7', 'Expires in 7 days'], ['30', 'Expires in 30 days']]) { const o = document.createElement('option'); o.value = v; o.textContent = l; if (v === '7') o.selected = true; ttl.appendChild(o); }
  opts.appendChild(ttl);
  let relayChk = null, syncChk = null;
  if (d.relay.home.role === 'owner') {
    const l1 = _frEl('label', 'fr-switch');
    relayChk = document.createElement('input'); relayChk.type = 'checkbox'; relayChk.checked = true;
    l1.append(relayChk, _frEl('span', null, 'Let them use my relay'));
    const l2 = _frEl('label', 'fr-switch');
    syncChk = document.createElement('input'); syncChk.type = 'checkbox'; syncChk.checked = false;
    l2.append(syncChk, _frEl('span', null, '…and sync their computers through it'));
    relayChk.onchange = () => { syncChk.disabled = !relayChk.checked; if (!relayChk.checked) syncChk.checked = false; };
    opts.appendChild(l1);
    setFold(opts, 'friends-invite-more', 'More', ({ body }) => body.appendChild(l2));   // the occasional choice (SIMPLIFY_PLAN.md 5.9)
  }
  pane.appendChild(opts);
  const out = _frEl('div', 'fr-add-out');
  const go = uiButton({ label: 'Make an invite link', icon: 'link', kind: 'primary', run: (e, b) => _frDo(b, async () => {
    const scopes = relayChk && relayChk.checked ? (syncChk && syncChk.checked ? ['message', 'sync'] : ['message']) : null;
    const r = await _frApi('/api/friends/invite', { ttlDays: Number(ttl.value), relayScopes: scopes });
    out.textContent = '';
    _frInviteOut(out, r, d, close);
    friendsLoad(true).catch(() => {});
    return r;
  }, null, 'make the invite link') });
  pane.appendChild(go);
  pane.appendChild(out);
  const open = (d.me && d.me.invites) || [];
  if (open.length) {
    const l = _frEl('div', 'fr-add-open');
    l.appendChild(_frEl('span', 'muted fr-small', `${open.length} open invite${open.length === 1 ? '' : 's'}`));
    for (const inv of open.slice(0, 5)) {
      const row = _frEl('div', 'fr-row');
      row.appendChild(_frEl('span', 'fr-row-t', `Made ${_frAgo(inv.at)}, expires ${_frDate(inv.exp)}`));
      row.appendChild(uiButton({ label: 'Cancel', size: 'sm', kind: 'ghost', tip: 'The link stops working', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/invite/cancel', { id: inv.id }); row.remove(); await friendsLoad(true); }, 'Invite cancelled', 'cancel the invite') }));
      l.appendChild(row);
    }
    pane.appendChild(l);
  }
}
/**
 * A new invite: its QR code (short links fit the app's QR encoder, 58-settings-sync-qr.js), the link
 * with Copy, and a ready-to-send message. A long link (a relay from before short links) has no QR code.
 */
function _frInviteOut(out, r, d, close) {
  const link = String(r.link || r.text || '');
  const message = String(r.message || `Join me on Freeflo: ${link}`);
  const wrap = _frEl('div', 'fr-invite-out');
  if (r.short && typeof syncQrSvg === 'function') {
    try {
      const q = _frEl('div', 'fr-qr');
      const svg = syncQrSvg(link, 168);
      svg.setAttribute('aria-label', 'QR code of your invite link');
      q.appendChild(svg);
      q.appendChild(_frEl('span', 'muted fr-small', 'Scan with a phone camera'));
      wrap.appendChild(q);
    } catch (e) { /* too long for a QR code here: the link and the message still work */ }
  }
  const side = _frEl('div', 'fr-invite-side');
  const ta = document.createElement('textarea');
  ta.className = 'input fr-invite-text'; ta.readOnly = true; ta.rows = r.short ? 2 : 3; ta.value = link;
  ta.setAttribute('aria-label', 'Invite link');
  ta.onfocus = () => ta.select();
  side.appendChild(ta);
  const a = _frEl('div', 'fr-add-acts');
  a.appendChild(uiButton({ label: 'Copy link', icon: 'copy', kind: 'primary', run: () => copyText(link, 'invite link') }));
  a.appendChild(uiButton({ label: 'Copy message', icon: 'message-circle', run: () => copyText(message, 'message') }));
  if (navigator.share) a.appendChild(uiButton({ label: 'Share', icon: 'send', run: () => navigator.share({ title: 'Join me on Freeflo', text: message }).catch(() => {}) }));
  side.appendChild(a);
  const msg = _frEl('div', 'fr-invite-msg');
  msg.appendChild(_frEl('span', 'overline', 'Ready to send'));
  msg.appendChild(_frEl('p', 'fr-small fr-invite-msg-t', message));
  side.appendChild(msg);
  wrap.appendChild(side);
  out.appendChild(wrap);
  if (!r.short) {
    const owner = d && d.relay && d.relay.home && d.relay.home.role === 'owner';
    out.appendChild(_frEl('p', 'muted fr-small', r.shortWhy === 'old-relay'
      ? (owner ? 'A long link (your relay is older). It works the same. Update my relay for short links.' : 'A long link (the relay you use is older). It works the same.')
      : "The short link couldn't be made just now, so this is the long one. It works the same."));
    if (r.shortWhy === 'old-relay' && owner) { const a = _frEl('div', 'fr-add-acts'); a.appendChild(_frRelayBtn(d, { size: 'sm', close })); out.appendChild(a); }
  }
  const c = _frEl('div', 'fr-add-acts');
  c.appendChild(uiButton({ label: 'Cancel this invite', kind: 'ghost', size: 'sm', run: (ev, bb) => _frDo(bb, async () => { await _frApi('/api/friends/invite/cancel', { id: r.id }); out.textContent = ''; await friendsLoad(true); }, 'Invite cancelled: the link no longer works', 'cancel the invite') }));
  out.appendChild(c);
  out.appendChild(_frEl('p', 'muted fr-small', `Works once. Expires ${_frDate(r.exp)}.${r.relayScopes && r.relayScopes.length ? ' It also lets them use your relay.' : ''}`));
}
/**
 * Friend code (2.20.1): "Show my friend code" makes 4 letters that work once, for 10 minutes; the
 * friend types them in their OpenDash, and you see who it is, check the pictures and press Accept.
 * The lasting NAME-7K2QX9 codes are no longer shown, but still work when typed (older OpenDash).
 */
let _frLiveTick = null;
function _frAddCode(pane, d, close) {
  if (!d || !d.relay || !d.relay.home) { _frNeedRelay(pane, close); return; }
  const mine = _frEl('div', 'fr-mycode');
  mine.appendChild(_frEl('span', 'overline', 'Your friend code'));
  const live = d.me && d.me.live && d.me.live.expiresAt > Date.now() ? d.me.live : null;
  const redo = () => { pane.textContent = ''; _frAddCode(pane, _fr.data, close); };
  if (live) {
    const c = _frEl('div', 'fr-live-code', live.code.slice(0, 2) + ' ' + live.code.slice(2));
    c.setAttribute('aria-label', 'Your friend code: ' + live.code.split('').join(' '));
    mine.appendChild(c);
    const left = _frEl('div', 'muted fr-small fr-live-left');
    const tick = () => {
      // Someone typed it (the code is gone before its time): on to Accept.
      const cur = _fr.data && _fr.data.me && _fr.data.me.live;
      if (!cur && live.expiresAt > Date.now() && document.body.contains(left)) {
        clearInterval(_frLiveTick); _frLiveTick = null; close(); _frRepaint();
        toast('Someone typed your code. Check it is your friend, then press Accept.', { icon: 'user-plus', kind: 'ok' });
        return 0;
      }
      const s = Math.max(0, Math.round((live.expiresAt - Date.now()) / 1000));
      // While the code is on screen, look for the friend's request every 10 seconds, so Accept comes up at once.
      if (s && s % 10 === 0 && document.body.contains(left)) _frApi('/api/friends/check', {}).then(() => friendsLoad(true)).catch(() => {});
      left.textContent = s ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' left' : 'This code ran out. Make a new one.'; return s; };
    tick();
    clearInterval(_frLiveTick);
    _frLiveTick = setInterval(() => { if (!document.body.contains(left) || !tick()) { clearInterval(_frLiveTick); _frLiveTick = null; } }, 1000);
    mine.appendChild(left);
    mine.appendChild(_frEl('p', 'fr-small', 'Read these 4 letters to your friend. They type them in their Freeflo: Friends > Add a friend > Friend code. It works once. Then you check it is them and press Accept.'));
    const a = _frEl('div', 'fr-add-acts');
    a.appendChild(uiButton({ label: 'New code', icon: 'refresh-cw', size: 'sm', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/live', {}); await friendsLoad(true); redo(); }, null, 'make a new code') }));
    a.appendChild(uiButton({ label: 'Cancel', size: 'sm', kind: 'ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/live', { cancel: true }); await friendsLoad(true); redo(); }, null, 'stop the code') }));
    mine.appendChild(a);
  } else {
    mine.appendChild(_frEl('p', 'fr-small', 'Your friend is with you, or on the phone? Show them a 4-letter code to type in their Freeflo.'));
    mine.appendChild(uiButton({ label: 'Show my friend code', icon: 'key-round', kind: 'primary', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/live', {}); await friendsLoad(true); redo(); }, null, 'show your friend code') }));
  }
  pane.appendChild(mine);
  const theirs = _frEl('div', 'fr-theircode');
  const lab = _frEl('label', 'fr-set-l', 'Got a code from a friend? Type it here');
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'input fr-code-in num'; inp.placeholder = 'AB CD'; inp.maxLength = 20; inp.autocomplete = 'off'; inp.spellcheck = false;
  lab.appendChild(inp);
  theirs.appendChild(lab);
  const acts = _frEl('div', 'fr-add-acts');
  let ctl = null;
  const stop = uiButton({ label: 'Cancel', size: 'sm', kind: 'ghost', run: () => { if (ctl) ctl.abort(); } });
  stop.hidden = true;
  const add = uiButton({ label: 'Add friend', icon: 'user-plus', kind: 'primary', run: (e, b) => {
    if (!inp.value.trim()) { inp.focus(); return; }
    ctl = new AbortController(); stop.hidden = false;
    _frDo(b, async () => {
      // So the one who showed the code sees your picture beside Accept.
      if (typeof profileShareNow === 'function') await Promise.resolve(profileShareNow(false)).catch(() => {});
      const r = await _frApi('/api/friends/add', { code: inp.value }, { signal: ctl.signal });
      close(); await friendsLoad(true); _frRepaint();
      return r;
    }, (r) => `Asked ${r && r.friend ? friendName(r.friend) : 'them'}. You'll both see the same pictures to check.`, { what: 'add your friend', retry: false }).finally(() => { stop.hidden = true; ctl = null; });
  } });
  inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add.click(); } };
  acts.append(add, stop);
  theirs.appendChild(acts);
  theirs.appendChild(_frEl('p', 'muted fr-small', "Codes only work if you and your friend connect through the same place (for example, one of you joined with the other's invite). Otherwise, send an invite link: the first tab."));
  pane.appendChild(theirs);
  setTimeout(() => inp.focus(), 30);
}
function _frAddPaste(pane, close) {
  pane.appendChild(_frEl('p', null, "Got an invite link from a friend? Paste the whole thing here. If it comes with their relay, you'll join it too."));
  const ta = document.createElement('textarea');
  ta.className = 'input fr-invite-text'; ta.rows = 3; ta.placeholder = 'https://…/i#ODF1.…'; ta.spellcheck = false;
  ta.setAttribute('aria-label', 'Invite link');
  pane.appendChild(ta);
  const acts = _frEl('div', 'fr-add-acts');
  let ctl = null;
  const stop = uiButton({ label: 'Cancel', size: 'sm', kind: 'ghost', run: () => { if (ctl) ctl.abort(); } });
  stop.hidden = true;
  const go = uiButton({ label: 'Use this invite', icon: 'user-plus', kind: 'primary', run: (e, b) => {
    if (!ta.value.trim()) { ta.focus(); return; }
    ctl = new AbortController(); stop.hidden = false;
    _frDo(b, async () => {
      const r = await _frApi('/api/friends/add', { invite: ta.value.trim() }, { signal: ctl.signal });
      close(); await friendsLoad(true); _frRepaint();
      return r;
    }, (r) => `Request sent to ${r && r.friend ? friendName(r.friend) : 'them'}. You'll both see the same pictures to check.`, { what: 'use the invite', retry: false }).finally(() => { stop.hidden = true; ctl = null; });
  } });
  acts.append(go, stop);
  pane.appendChild(acts);
  pane.appendChild(_frEl('p', 'muted fr-small', 'Nothing is shared until they accept you, after you both see the same pictures.'));
  setTimeout(() => ta.focus(), 30);
}

/* ---------- Lock out a lost computer: new friend keys (docs/dev/FRIENDS.md section 15) ----------
   The words follow the glossary (SIMPLIFY_PLAN.md 2): "Lock out a lost computer", never "renew keys"
   on the face; the details of what happens are in the dialog's "What happens" fold. */
/** Friends whose update needs you: two different updates came (paused), or they ask to keep using your relay. */
function _frAttentionSec(list) {
  const sec = _frSec('Needs a look', 'triangle-alert');
  for (const f of list) {
    const el = _frEl('div', 'card fr-pend');
    el.appendChild(_frAvatarWrap(f, 44, { presence: false }));
    const body = _frEl('div', 'fr-pend-b'), acts = _frEl('div', 'fr-pend-a');
    const name = friendName(f);
    if (f.status === 'frozen') {
      body.appendChild(_frEl('b', null, `Paused: check with ${name}`));
      body.appendChild(_frEl('span', 'muted fr-small', `Two different updates claimed to be from ${name}. Ask them for a fresh invite in person or on a call.`));
      acts.appendChild(uiButton({ label: 'Remove', size: 'sm', icon: 'user-minus', run: () => _frRemove(f, false) }));
    } else {
      body.appendChild(_frEl('b', null, `Let ${name} keep using your relay?`));
      body.appendChild(_frEl('span', 'muted fr-small', 'They updated their security; their access moves over.'));
      acts.appendChild(uiButton({ label: 'Let them keep using it', icon: 'check', kind: 'primary', size: 'sm', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/relay-ask', { id: f.id }); await friendsLoad(true); _frRepaint(); }, `${name} can keep using your relay`, 'let them keep using it') }));
      acts.appendChild(uiButton({ label: 'Not now', size: 'sm', kind: 'ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/relay-ask', { id: f.id, allow: false }); await friendsLoad(true); _frRepaint(); }, `Left as it is. ${name}'s old access stays until you remove it in Settings > Your relay.`, 'answer') }));
    }
    el.append(body, acts);
    sec.appendChild(el);
  }
  return sec;
}
function _frLine(ic, text, cls) {
  const p = _frEl('div', 'fr-wait' + (cls ? ' ' + cls : ''));
  p.innerHTML = icon(ic, 'i-sm' + (ic === 'loader-circle' ? ' fr-spin' : ''));
  p.appendChild(_frEl('span', null, text));
  return p;
}
/** Lost a computer?: the Lock it out button, or how locking one out is going. */
function _frKeysEl(d) {
  const box = _frEl('div', 'fr-keys');
  const r = d && d.me ? d.me.rotation : null;
  if (!d || !d.me || !d.me.id) { box.appendChild(emptyLine("Friends isn't set up yet, so there is nothing to lock out.")); return box; }
  if (!r || (r.step === 'done' && Date.now() - (r.doneAt || 0) > 3 * 86400000)) {
    box.appendChild(uiButton({ label: 'Lock it out…', size: 'sm', icon: 'key-round', run: () => friendsRenewKeysDialog() }));
    return box;
  }
  const n = r.friends || 0;
  const progress = n ? `${r.moved} of ${n} friend${n === 1 ? ' has' : 's have'} moved over${r.moved < n ? '; the rest follow when their Freeflo is next on' : ''}.` : '';
  if (r.step === 'done') box.appendChild(_frLine('check', `Locked out ${_frAgo(r.doneAt || r.at)}. ${progress}`.trim()));
  else if (r.waiting === 'relay-update') { box.appendChild(_frLine('key-round', `Locked out here. ${progress}`.trim())); box.appendChild(_frRelayRotateEl()); }
  else if (r.waiting === 'relay-owner') box.appendChild(_frLine('hourglass', `Locked out here. ${progress} Waiting for your relay's owner to let the change in; until then the lost computer can still use that relay.`.replace(/\s+/g, ' ')));
  else if (r.waiting === 'friends') box.appendChild(_frLine('hourglass', `Locked out here. ${progress}`.trim()));
  else box.appendChild(_frLine('loader-circle', 'Locking it out and telling your friends…'));
  if (r.error) {
    box.appendChild(_frLine('triangle-alert', `Waiting: ${r.error}`, 'fr-err'));
    box.appendChild(uiButton({ label: 'Try again', size: 'sm', icon: 'refresh-cw', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/rotate', {}); await friendsLoad(true); _frRepaint(); }, null, 'lock it out') }));
  }
  if (r.failed) box.appendChild(emptyLine(`${r.failed} friend${r.failed === 1 ? '' : 's'} couldn't be told. They can add you again with a fresh invite.`));
  if (r.cancelled && r.step !== 'done') box.appendChild(emptyLine(`${r.cancelled} request${r.cancelled === 1 ? '' : 's'} still in progress stopped, and open invite links no longer work: send new ones.`));
  return box;
}
/** Your own relay after a lock-out: the lost computer can use it until it is updated (server/routes/relay-rotate.mjs). */
const _frRot = { st: null, at: 0, t: 0 };
function _frRelayRotateEl() {
  const el = _frEl('div', 'fr-relay-rot');
  let poll = null;
  const paint = () => {
    el.textContent = '';
    const s = _frRot.st || { state: 'idle' };
    if (s.state === 'running') {
      el.appendChild(_frLine('loader-circle', 'Updating your relay so the lost computer can’t use it…'));
      el.appendChild(uiButton({ label: 'Cancel', size: 'sm', kind: 'ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/relay/cancel', {}); await poll(); }, 'Stopped. The lost computer can use your relay until you update it.', 'stop the update') }));
      return;
    }
    if (s.state === 'error' && s.error) el.appendChild(_frLine('triangle-alert', `${s.error.message} ${s.error.next || ''}`.trim(), 'fr-err'));
    el.appendChild(emptyLine(s.state === 'elsewhere'
      ? 'Update your relay so the lost computer can’t use it: from the computer that set it up, or here (Cloudflare may ask you to sign in).'
      : 'Update your relay so the lost computer can’t use it (same address; Cloudflare may ask you to sign in).'));
    el.appendChild(uiButton({ label: s.state === 'error' ? 'Try again' : 'Update my relay', size: 'sm', icon: s.state === 'error' ? 'refresh-cw' : 'cloud', kind: 'primary', run: (e, b) => _frDo(b, async () => { _frRot.st = await _frApi('/api/relay/rotate', {}); paint(); poll(); }, null, 'update your relay') }));
  };
  poll = async () => {
    clearTimeout(_frRot.t);
    try { _frRot.st = await _frApi('/api/relay/rotate'); _frRot.at = Date.now(); } catch (e) { /* the server is restarting */ }
    if (!el.isConnected) return;
    paint();
    if (_frRot.st && _frRot.st.state === 'running') _frRot.t = setTimeout(poll, 3000);
    else if (_frRot.st && (_frRot.st.state === 'done' || _frRot.st.state === 'not-needed')) friendsLoad(true).then(() => _frRepaint()).catch(() => {});
  };
  paint();
  if (Date.now() - _frRot.at > 2000) setTimeout(poll, 0);
  return el;
}
/**
 * Lock out a lost computer: new friend keys (FRIENDS.md section 15). o.device: the name of a computer just
 * removed from sync ("Lock it out" after Remove). One sentence on the face; what happens, and what it
 * can't do, in the "What happens" fold.
 */
function friendsRenewKeysDialog(o) {
  o = o || {};
  const d = _fr.data;
  if (!d || !d.me || !d.me.id) { toast("Friends isn't set up yet, so there is nothing to lock out.", { icon: 'key-round' }); return; }
  const home = d.relay && d.relay.home;
  const friends = (d.friends || []).filter(f => f.status === 'friend').length;
  const pending = (d.friends || []).filter(f => f.status === 'incoming' || f.status === 'requested').length + ((d.me.invites || []).length);
  openDialog({
    title: o.device ? `Lock out ${o.device}` : 'Lock out a lost computer', size: 'md', resizeKey: 'fr-renew',
    body(el, close) {
      el.classList.add('fr-renew');
      if (o.device) el.appendChild(_frEl('p', null, `“${o.device}” no longer gets your sync changes, but it can still act as you with your friends.`));
      el.appendChild(_frEl('p', 'muted', 'Makes new friend keys so the lost computer can’t act as you. Your friends move over by themselves.'));
      const det = _frEl('details', 'set-more fr-renew-more');
      det.appendChild(_frEl('summary', null, 'What happens'));
      const ul = _frEl('ul', 'fr-renew-list');
      const li = (t) => ul.appendChild(_frEl('li', null, t));
      li('New keys are made on this computer. Your other computers get them through sync; a computer you removed from sync does not.');
      if (friends) li(`Each friend's Freeflo moves you over by itself (${friends} friend${friends === 1 ? '' : 's'}). Your friendships, history and what you share stay as they are.`);
      if (pending) li('Requests still in progress and open invite links stop working: send new ones afterwards.');
      if (d.me.code) li('Your friend code changes.');
      if (home && home.role === 'owner') li('Your relay is updated so it trusts only the new keys (same address; Cloudflare may ask you to sign in).');
      else if (home) li("Your relay belongs to a friend: they get a button to let your new keys in. Until they press it, the lost computer can still use it.");
      li("What it can't do: if the lost computer does this first, friends who hear from it first could be fooled. A friend's Freeflo then pauses your friendship; if a friend tells you that, send them a fresh invite.");
      det.appendChild(ul);
      el.appendChild(det);
      const acts = _frEl('div', 'fr-add-acts');
      let ctl = null;
      const stop = uiButton({ label: 'Stop waiting', size: 'sm', kind: 'ghost', run: () => { if (ctl) ctl.abort(); } });
      stop.hidden = true;
      const go = uiButton({ label: 'Lock it out', icon: 'key-round', kind: 'primary', run: (e, b) => {
        ctl = new AbortController(); stop.hidden = false;
        const sig = ctl.signal;
        _frDo(b, async () => {
          const r = await _frApi('/api/friends/rotate', {}, { signal: sig });
          close(); await friendsLoad(true); _frRepaint();
          return r;
        }, 'Locked out. Your friends are being told now: Friends shows how it goes.', { what: 'lock it out', retry: false }).then((r) => {
          if (r === null && sig.aborted) toast('Stopped waiting. If it goes on, Friends shows it.', { icon: 'key-round' });
        }).finally(() => { stop.hidden = true; ctl = null; });
      } });
      // Cancel leaves it; Not now when it was offered (after removing a computer from sync)
      acts.append(go, uiButton({ label: o.device ? 'Not now' : 'Cancel', kind: 'ghost', run: () => close() }), stop);
      el.appendChild(acts);
    },
  });
}
/** After "Remove this device" in Settings > Sync: offer to lock it out of Friends and the relay too. */
function friendsOfferLockOut(deviceName) {
  const d = _fr.data;
  if (!d || !d.me || !d.me.id) return;
  const r = d.me.rotation;
  if (r && r.step !== 'done') return;
  toast('Lost or stolen? Lock it out of Friends too.', { icon: 'key-round', timeout: 15000, action: { label: 'Lock it out', run: () => friendsRenewKeysDialog({ device: deviceName || 'that computer' }) } });
}
window.friendsOfferLockOut = friendsOfferLockOut;
window.friendsRenewKeysDialog = friendsRenewKeysDialog;
// Settings > Sync's device removal (owned by Sync) goes through _syncPost: after a removal works,
// the offer above follows. A wrapper, so 58-settings-sync.js stays as it is (Sync can also call
// friendsOfferLockOut(name) itself).
(function _frHookDeviceRemoval() {
  if (typeof _syncPost !== 'function') return;
  const orig = _syncPost;
  _syncPost = async function (url, body, okMsg) {
    let name = '';
    if (url === '/api/sync/devices/remove') {
      try { const st = typeof _syncSt !== 'undefined' && _syncSt; const dev = st && (st.devices || []).find(x => x.id === (body && body.id)); name = dev ? String(dev.name || '') : ''; } catch (e) { name = ''; }
    }
    const r = await orig.apply(this, arguments);
    if (r && url === '/api/sync/devices/remove') {
      // 2.20.1: the server locks it out of Friends by itself (server/routes/sync.mjs); here only the news.
      if (r.friendsLockOut) { delete r.friendsLockOut; toast('It is locked out of Friends too.', { icon: 'lock', kind: 'ok' }); friendsLoad(true).catch(() => {}); }
    }
    return r;
  };
})();
// Settings > Friends: Lost a computer?, and the way to the Friends tab (SIMPLIFY_PLAN.md 5.9, 6).
registerSettingsGroup({
  id: 'friends', title: 'Friends', icon: 'users', order: 91.6,
  description: 'Lock out a lost or stolen computer. Everything else is in Friends.',
  search: [
    { label: 'Lost a computer?', description: 'Lock a lost or stolen computer out of Friends', keywords: 'lost stolen computer device lock out renew keys friend keys security' },
    { label: 'Lock out a lost computer', target: 'Lost a computer?', description: 'New friend keys, so the lost computer can’t act as you', keywords: 'renew keys friend keys rotate lost stolen device computer' },
  ],
  render(el) {
    const box = _frEl('div');
    const paint = () => {
      box.textContent = '';
      const d = _fr.data;
      box.appendChild(_settingsRow('Lost a computer?', 'Lock it out so it can’t act as you.', _frKeysEl(d)));
      box.appendChild(_settingsRow('Friends', d && d.counts ? `${d.counts.friends || 0} friend${d.counts.friends === 1 ? '' : 's'}` : 'Your hangout, invites and privacy.', uiButton({ label: 'Open Friends', size: 'sm', icon: 'users', run: () => setView('friends') })));
    };
    el.appendChild(box);
    paint();
    friendsLoad(false).then(() => { if (box.isConnected) paint(); }).catch((e) => {
      if (!box.isConnected) return;
      box.textContent = '';
      box.appendChild(emptyLine(`Friends couldn’t load: ${netErrorReason(e)}.`, { label: 'Try again', run: () => friendsLoad(true).then(() => { if (box.isConnected) paint(); }).catch((x) => toastError('load Friends', x)) }));
    });
  },
});
