/* ============================================================
   THE CORNER IS YOU (2.17.1). The sidebar's top-left workspace button
   (#ws-btn in src/body.html) shows your avatar and display name once you
   have a profile, with your status emoji. Until then it shows the workspace
   icon and name as before (14-shell.js setBrandMark). The favicon is left alone.

   2.18 (agent 'you'): the corner is a little bigger (a 34 px avatar, your name
   in your nameplate style, and a small line under it: your status, else your
   title, else your level), and a FRIENDS BUTTON sits right next to you
   (#ws-friends, made here): one click to the Friends tab, the friend requests
   waiting as a count, else a green dot while a friend is around. It is a real
   button (Tab, Enter / Space, a label with the counts, aria-current on
   Friends) and in the icon rail it sits under your avatar.

   Clicking it opens the hub: your compact card (Edit profile, Set status
   with the quick statuses inline), Friends (who is around, Open Friends,
   Add a friend, What my friends can see), Your relay and Sync with a
   one-word state, then the workspace menu items (registerMoreItem where
   'workspace', 14-shell.js), unchanged and in their order. It replaces the
   2.17 top-bar chip; the Friends sidebar item is hidden by default
   (Customise sidebar brings it back).

     profileCornerPaint()        repaint the corner and its Friends button (renderShell, profileSet, friends
                                 data and presence); true when it drew your avatar (the shell then leaves the mark alone)
     profileCornerHasYou()       is there a profile to show: you changed something, or said the starting avatar is fine
     profileHubOpen(anchor?, o)  the hub -> true when it opened; o.status: open on the quick statuses
                                 (profileOpenPop and the palette's "Set your status" come here). With the
                                 sidebar hidden it opens from the More button instead.

   Keys in the hub: Up / Down move between rows, Left / Right inside a row
   (the statuses, friends' avatars, the card's buttons), Home / End, Esc
   closes and puts the focus back on the corner. Friend names go in with
   textContent (and title / aria-label attributes) only.
   ============================================================ */
const _pfc = { sync: null, syncAt: 0, syncP: null, syncErr: false, statusOpen: false, frErr: null };
const _PFC_AROUND = Object.freeze({ online: 'here now', focusing: 'focusing', travelling: 'travelling' });

function _pfcEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function _pfcPlural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

/** A profile to show in the corner: you changed something in it (here or on another device), or chose to keep the starting avatar. */
function profileCornerHasYou() {
  try {
    const raw = typeof state !== 'undefined' && state ? state.profile : null;
    if (raw && typeof raw === 'object' && Number(raw.updatedAt) > 0) return true;
    return typeof _froPrefs === 'function' && !!_froPrefs().avatarOk;
  } catch (e) { return false; }
}
/** Friends at a glance from the last /api/friends answer (96-friends-0core.js), or null before the first one. */
function _pfcFriends() {
  const d = typeof _fr !== 'undefined' && _fr ? _fr.data : null;
  if (!d) return null;
  const all = Array.isArray(d.friends) ? d.friends : [];
  const friends = all.filter(f => f && f.status === 'friend');
  const rank = (f) => (typeof _frPresRank === 'function' ? _frPresRank(f) : 0);
  const around = friends.filter(f => Object.prototype.hasOwnProperty.call(_PFC_AROUND, f.presence))
    .sort((a, b) => rank(a) - rank(b) || (b.lastAt || 0) - (a.lastAt || 0));
  return { friends: friends.length, requests: all.filter(f => f && f.status === 'incoming').length, around, relay: !!(d.relay && d.relay.home) };
}

/* ---------- the corner itself ---------- */
/**
 * The Friends button next to you (2.18, user request 24 Oct: "on you there should be a friends button next
 * to you"): one click to the Friends tab, with the requests waiting as a count and a green dot while a friend
 * is around. Made here (not in body.html) so a build without the profile has no dead button. A real button:
 * Tab reaches it after the corner, Enter / Space opens Friends, its label says the counts, and it shows
 * aria-current while you are on Friends. In the icon rail it sits under your avatar.
 */
function _pfcFriendsBtn(btn) {
  let fb = document.getElementById('ws-friends');
  if (fb && fb.isConnected) return fb;
  const head = btn.parentNode;
  if (!head) return null;
  fb = _pfcEl('button', 'sb-fr-btn'); fb.id = 'ws-friends'; fb.type = 'button';
  fb.innerHTML = icon('users');
  fb.setAttribute('aria-label', 'Friends');
  fb.setAttribute('data-tip', 'Friends');
  fb.onclick = (e) => {
    e.stopPropagation();
    if (typeof _shellCloseDrawer === 'function') _shellCloseDrawer();
    if (String((typeof state !== 'undefined' && state && state.view) || '') === 'friends') {   // already there: back to the top, nothing else
      const m = document.getElementById('main');
      if (m && m.scrollTop > 0) m.scrollTo({ top: 0, behavior: _pfMotionOk() ? 'smooth' : 'auto' });
      return;
    }
    if (typeof setView === 'function') setView('friends');
  };
  head.insertBefore(fb, btn.nextSibling);
  return fb;
}
function _pfcFriendsBtnPaint(btn, fr, view) {
  const fb = _pfcFriendsBtn(btn);
  if (!fb) return;
  const requests = fr ? fr.requests : 0, around = fr ? fr.around.length : 0, here = /^friends(:|$)/.test(view);
  const key = [requests, around, here, fr ? fr.friends : -1].join('|');
  if (fb.dataset.k === key) return;
  fb.dataset.k = key;
  if (here) fb.setAttribute('aria-current', 'page'); else fb.removeAttribute('aria-current');
  let n = fb.querySelector(':scope > .sb-fr-n'), dot = fb.querySelector(':scope > .sb-fr-dot');
  if (requests) {
    if (!n) { n = _pfcEl('span', 'sb-fr-n'); n.setAttribute('aria-hidden', 'true'); fb.appendChild(n); }
    n.textContent = requests > 9 ? '9+' : String(requests);
  } else if (n) n.remove();
  if (around && !requests) { if (!dot) { dot = _pfcEl('span', 'sb-fr-dot'); dot.setAttribute('aria-hidden', 'true'); fb.appendChild(dot); } }
  else if (dot) dot.remove();
  const bits = [];
  if (requests) bits.push(_pfcPlural(requests, 'friend request') + ' waiting');
  if (around) bits.push(_pfcPlural(around, 'friend') + ' around now');
  fb.setAttribute('aria-label', 'Friends' + (bits.length ? ': ' + bits.join(', ') : ''));
  fb.setAttribute('data-tip', bits.length ? 'Friends · ' + bits.join(' · ') : 'Friends');
}
/* integrate 2.18: your pet (agent 'pets', 97-pets-1core.js) curls up at the avatar's foot in the corner, asleep at night like
   everywhere else. Still (no idle motion in the sidebar), decorative (the corner button already says who you are), gone
   with the Fun level Off or the pet put away. */
function _pfcPetKey() {
  try {
    if (typeof petHas !== 'function' || !petHas() || (typeof _ptFun === 'function' && _ptFun() === 'off')) return '';
    const g = petGet(), m = typeof petMood === 'function' ? petMood() || {} : {};
    return JSON.stringify([g.look, g.name, m.key || '', m.pose || '']);
  } catch (e) { return ''; }
}
function _pfcPetPaint(me, you) {
  let pe = me.querySelector(':scope > .sb-ws-pet');
  const key = you ? _pfcPetKey() : '';
  if (!key) { if (pe) pe.remove(); return; }
  const el = typeof petEl === 'function' ? petEl('me', 22, { motion: false }) : null;
  if (!el) { if (pe) pe.remove(); return; }
  if (!pe) { pe = _pfcEl('span', 'sb-ws-pet'); pe.setAttribute('aria-hidden', 'true'); me.appendChild(pe); }
  el.removeAttribute('role'); el.removeAttribute('aria-label');
  pe.replaceChildren(el);
  pe.setAttribute('data-tip', typeof petName === 'function' ? petName() : 'Your pet');
}
if (typeof document !== 'undefined') document.addEventListener('opendash:pet', () => { try { _pf.chipKey = ''; _pfChipPaint(); } catch (e) { /* the next paint */ } });
/** The small line under your name in the corner: your status, else your title, else your level (with the game on), else nothing. */
function _pfcSubLine(p, st) {
  if (st) return [st.emoji, st.text].filter(Boolean).join(' ');
  const t = typeof profileTitleOf === 'function' ? profileTitleOf(p) : null;
  if (t) return t.label;
  const live = typeof gameOn !== 'function' || gameOn() ? profileLive() : {};
  return live.level ? `Level ${live.level}${typeof gameTitleOf === 'function' ? ' · ' + gameTitleOf(live.level) : ''}` : '';
}
function profileCornerPaint() {
  if (typeof document === 'undefined') return false;
  const btn = document.getElementById('ws-btn'), me = document.getElementById('ws-me'), mark = document.getElementById('brand-mark');
  if (!btn || !me || !mark) return false;
  const you = profileCornerHasYou();
  const fr = _pfcFriends(), requests = fr ? fr.requests : 0, around = fr ? fr.around.length : 0;
  const view = String((typeof state !== 'undefined' && state && state.view) || '');
  btn.classList.toggle('is-here', view === 'settings:me');   // Friends has its own button beside you (2.18)
  try { _pfcFriendsBtnPaint(btn, fr, view); } catch (e) { console.error('[corner] friends button', e); }
  let p = null, st = null, mood = null, key;
  if (you) {
    p = profileGet(); st = profileStatusNow(p); mood = profileMood();
    const live = profileLive(), h = live.hour;
    const sky = h >= 21 || h < 5 ? 'night' : h >= 17 || h < 7 ? 'golden' : 'day';   // the 'sky' background's light (97-profile-0kit.js)
    key = JSON.stringify([2, p.avatar, p.theme, p.look, st, mood, live.level, Math.round((live.levelPct || 0) * 50), live.streak, live.season, sky, profileDisplayName(p),
      typeof gameOn === 'function' ? gameOn() : 1, _pfcPetKey()]);
  } else key = JSON.stringify([0, typeof userName === 'function' ? userName() : '']);
  if (key === _pf.chipKey && me.dataset.painted) return you;
  _pf.chipKey = key; me.dataset.painted = '1';

  // your avatar, or the workspace icon (14-shell.js paints that one when this returns false)
  mark.hidden = you;
  if (you && mark.firstChild) { mark.replaceChildren(); delete mark.dataset.mark; mark.classList.remove('has-local-scene', 'has-logo', 'has-sym'); }
  let av = me.querySelector(':scope > .sb-ws-av');
  if (you) {
    if (!av) { av = _pfcEl('span', 'sb-ws-av'); me.insertBefore(av, mark.nextSibling); }
    av.replaceChildren(profileAvatarEl(null, 34, { mood }));
  } else if (av) av.remove();
  me.classList.toggle('has-avatar', you);
  btn.classList.toggle('has-you', you);
  // your status emoji (your own text, still set as text)
  let se = me.querySelector(':scope > .sb-ws-st');
  if (st && st.emoji) { if (!se) { se = _pfcEl('span', 'sb-ws-st'); me.appendChild(se); } se.textContent = st.emoji; }
  else if (se) se.remove();
  const oldFr = me.querySelector(':scope > .sb-ws-fr'); if (oldFr) oldFr.remove();   // the 2.17.1 badge on the avatar is the Friends button's now
  try { _pfcPetPaint(me, you); } catch (e) { console.error('[corner] pet', e); }
  // the name, clearly, with a small line under it (your status, else your title or level)
  const bn = document.getElementById('brand-name');
  let txt = btn.querySelector(':scope > .sb-ws-txt');
  if (bn && !txt && bn.parentNode === btn) { txt = _pfcEl('span', 'sb-ws-txt'); btn.insertBefore(txt, bn); txt.appendChild(bn); }
  const name = you ? profileDisplayName(p) : ((typeof userName === 'function' && userName()) || 'OpenDash');
  if (you && bn && bn.textContent !== name) bn.textContent = name;
  if (txt) {
    let sub = txt.querySelector(':scope > .sb-ws-sub');
    const line = you ? _pfcSubLine(p, st) : '';
    if (line) { if (!sub) { sub = _pfcEl('span', 'sb-ws-sub'); txt.appendChild(sub); } sub.textContent = line; }
    else if (sub) sub.remove();
  }
  if (bn) {
    const np = you && typeof profileNameplateApply === 'function' ? profileNameplateApply : null;
    if (np) np(bn, p, { small: true }); else { bn.removeAttribute('style'); bn.className = 'sb-ws-name'; }
  }
  btn.setAttribute('aria-label', `${name}: your profile, quick status and workspace menu${st ? '. ' + [st.emoji, st.text].filter(Boolean).join(' ') : ''}`);
  btn.title = [name].concat(st ? [[st.emoji, st.text].filter(Boolean).join(' ')] : []).join(' · ');
  return you;
}

/* ---------- one-word states for the relay and sync ---------- */
function _pfcRelayWord(fr) { return fr ? (fr.relay ? 'Connected' : 'Not set up') : (_pfc.frErr ? 'Unknown' : ''); }
function _pfcSyncWord(st) {
  if (!st) return '';
  // Settings > Sync's own status word when it is there (docs/dev/SIMPLIFY_PLAN.md: syncSummary), else these.
  if (typeof syncSummary === 'function') { try { const w = syncSummary(st, typeof _syncPres === 'function' ? _syncPres() : null, typeof _shHealth !== 'undefined' ? _shHealth : null, Date.now(), null).word; if (w) return w; } catch (e) { /* the words below */ } }   // clock-ok: a status word
  if (!st.enabled) return 'Off';
  if (st.state === 'error') return 'Paused';
  if (st.state === 'locked' || st.state === 'waiting') return 'Waiting';
  if (st.mode === 'shadow') return 'Previewing';
  return 'On';
}
/** /api/sync/status, kept a minute (Settings > Sync's last answer counts too). Read-only: Sync's own files stay untouched. */
function _pfcSyncLoad() {
  if (typeof _syncSt !== 'undefined' && _syncSt && !_pfc.sync) { _pfc.sync = _syncSt; _pfc.syncAt = Date.now(); }   // clock-ok: a cache age
  if (_pfc.syncP) return _pfc.syncP;
  if (_pfc.sync && Date.now() - _pfc.syncAt < 60000) return Promise.resolve(_pfc.sync);   // clock-ok: a cache age
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), 8000) : 0;
  _pfc.syncP = fetch('/api/sync/status', { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((s) => { _pfc.sync = s; _pfc.syncAt = Date.now(); _pfc.syncErr = false; return s; })   // clock-ok: a cache age
    .catch((e) => { _pfc.syncErr = true; throw e; })
    .finally(() => { clearTimeout(t); _pfc.syncP = null; });
  return _pfc.syncP;
}

/* ---------- the hub ---------- */
function _pfcVisible(el) {
  if (!el || !el.isConnected || !el.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  if (!r.width || r.right <= 0 || r.left >= window.innerWidth) return false;   // the drawer off screen
  try { return getComputedStyle(el).visibility !== 'hidden'; } catch (e) { return true; }   // the collapsed sidebar
}
function profileHubOpen(anchor, o) {
  o = o || {};
  if (typeof openPopover !== 'function' || typeof document === 'undefined') return false;
  const ws = document.getElementById('ws-btn'), more = document.getElementById('more-btn');
  const a = _pfcVisible(anchor) ? anchor : _pfcVisible(ws) ? ws : _pfcVisible(more) ? more : null;
  if (!a) return false;
  if (a._popClose) { a._popClose(); if (!o.status) return true; }   // a second click closes it; "Set your status" opens it again on the statuses
  _pfc.statusOpen = !!o.status;
  openPopover(a, (el, close) => _pfcBuild(el, close), {
    className: 'pfc-pop', width: 336, align: a === ws ? 'start' : 'end', role: 'dialog', focus: false,
    // Focus goes back to the corner when the hub closes with it inside (an item, a status); a dialog an item opens returns there too.
    onClose: () => { const f = document.activeElement; if ((!f || f === document.body) && _pfcVisible(a)) { try { a.focus({ preventScroll: true }); } catch (e) { /* gone */ } } },
  });
  return true;
}
function _pfcBuild(el, close) {
  el.setAttribute('aria-label', 'Your profile, friends and workspace');
  const status = _pfcEl('div', 'pfc-status'); status.id = 'pfc-status';
  const toggle = (btn) => {
    _pfc.statusOpen = !_pfc.statusOpen;
    btn.setAttribute('aria-expanded', String(_pfc.statusOpen));
    _pfcStatusPaint(status, close);
    if (_pfc.statusOpen) _pfcFocus(status.querySelector('.pf-pop-emo[aria-pressed="true"]') || status.querySelector('.pf-pop-emo'));
  };
  el.appendChild(_pfcCard(close, toggle));
  el.appendChild(status);
  _pfcStatusPaint(status, close);
  // Life one click away (2.18, NAVIGATION_PLAN.md 2.5): Open Life and an icon per Life tab (15-nav-life.js).
  if (typeof lifeHubEl === 'function') { try { const life = lifeHubEl(close); if (life) el.appendChild(life); } catch (e) { console.error('[corner] life', e); } }

  el.appendChild(_pfcEl('div', 'pop-sep'));
  const friends = _pfcEl('div', 'pfc-friends');
  el.appendChild(friends);
  el.appendChild(_pfcEl('div', 'pop-sep'));
  const sys = _pfcEl('div', 'pfc-menu'); sys.setAttribute('role', 'menu'); sys.setAttribute('aria-label', 'Relay and sync');
  el.appendChild(sys);
  const paintFriends = () => { _pfcFriendsPaint(friends, close, paintFriends); _pfcSysPaint(sys, close); };
  paintFriends();
  if (!_pfcFriends() && typeof friendsLoad === 'function') {
    friendsLoad(false).then(() => { _pfc.frErr = null; if (el.isConnected) paintFriends(); })
      .catch((e) => { _pfc.frErr = e; if (el.isConnected) paintFriends(); });
  }
  _pfcSyncLoad().catch(() => null).then(() => { if (el.isConnected) _pfcSysPaint(sys, close); });

  // the workspace menu, as it was
  el.appendChild(_pfcEl('div', 'pop-sep'));
  const ws = _pfcEl('div', 'pfc-menu'); ws.setAttribute('role', 'menu'); ws.setAttribute('aria-label', 'Workspace');
  buildMenuItems(ws, typeof shellMenuItems === 'function' ? shellMenuItems('workspace') : [], close);
  el.appendChild(ws);

  el.addEventListener('keydown', (e) => _pfcKeys(e, el), true);
  _pfcFocus(_pfc.statusOpen ? (status.querySelector('.pf-pop-emo[aria-pressed="true"]') || status.querySelector('.pf-pop-emo')) : el.querySelector('.pfc-me-acts .btn'));
}
function _pfcFocus(b) { if (b) setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (e) { /* gone */ } }, 0); }

/** Your card, bigger since 2.18 (the same card friends see, compact: banner, avatar, name in your nameplate, title, status, level), with Edit profile and Set status. */
function _pfcCard(close, toggle) {
  const acts = _pfcEl('div', 'pfc-me-acts pfc-row');
  const btn = (label, ic, run) => {
    const b = _pfcEl('button', 'btn btn-secondary btn-sm'); b.type = 'button';
    b.innerHTML = icon(ic, 'i-sm');
    b.appendChild(_pfcEl('span', null, label));
    b.onclick = (e) => { e.stopPropagation(); run(b); };
    return b;
  };
  const set = btn('Set status', 'circle-user', toggle);
  set.setAttribute('aria-expanded', String(_pfc.statusOpen)); set.setAttribute('aria-controls', 'pfc-status');
  acts.append(btn('Edit profile', 'user-round-pen', () => { close(); setView('settings:me'); }), set);
  const wrap = _pfcEl('div', 'pfc-me');
  wrap.appendChild(profileCardEl(null, { compact: true, visits: true }));
  wrap.appendChild(acts);
  return wrap;
}

/** The quick statuses (the 2.17 chip's popover, inline): each clears tonight, with Undo. */
function _pfcStatusPaint(host, close) {
  host.replaceChildren();
  host.hidden = !_pfc.statusOpen;
  if (!_pfc.statusOpen) return;
  const cur = profileStatusNow();
  const row = _pfcEl('div', 'pf-pop-st pfc-row');
  row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Quick statuses: each clears tonight');
  for (const [e, t] of PF_STATUS_PRESETS) {
    const on = !!(cur && cur.emoji === e && cur.text === t);
    const b = _pfcEl('button', 'pf-pop-emo', e); b.type = 'button';
    b.setAttribute('aria-label', t); b.setAttribute('data-tip', t);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.onclick = (ev) => {
      ev.stopPropagation();
      if (on) return;   // already your status: nothing to do
      const before = Object.assign({}, profileGet().status);
      profileSet({ status: { emoji: e, text: t, until: _pfEndOfDay() } });
      close();
      toast(`Status: ${e} ${t}, until tonight.`, { icon: 'circle-user', action: { label: 'Undo', run: () => profileSet({ status: before }) } });
    };
    row.appendChild(b);
  }
  host.appendChild(row);
  const items = [];
  if (cur) {
    items.push({ icon: 'x', label: 'Clear status', run: () => {
      const before = Object.assign({}, profileGet().status);
      profileSet({ status: { emoji: '', text: '', until: 0 } });
      toast('Status cleared.', { icon: 'circle-user', action: { label: 'Undo', run: () => profileSet({ status: before }) } });
    } });
  }
  items.push({ icon: 'pencil', label: 'Write your own…', run: () => setView('settings:me') });
  const m = _pfcEl('div', 'pfc-menu'); m.setAttribute('role', 'menu'); m.setAttribute('aria-label', 'Status');
  buildMenuItems(m, items, close);
  host.appendChild(m);
}

/** Friends: who is around (click: their page), Open Friends with the counts, Add a friend, What my friends can see. */
function _pfcFriendsPaint(host, close, again) {
  host.replaceChildren();
  host.appendChild(_pfcEl('div', 'pop-label', 'Friends'));
  const fr = _pfcFriends();
  if (!fr) {
    if (_pfc.frErr) {
      host.appendChild(_pfcEl('div', 'pfc-note', 'Friends could not load. ' + (typeof netErrorMessage === 'function' ? netErrorMessage(_pfc.frErr) : '')));
      const m = _pfcEl('div', 'pfc-menu'); m.setAttribute('role', 'menu'); m.setAttribute('aria-label', 'Friends');
      buildMenuItems(m, [{ icon: 'refresh-cw', label: 'Try again', keepOpen: true, run: () => {
        _pfc.frErr = null; again();
        friendsLoad(true).then(() => { if (host.isConnected) again(); }).catch((e) => { _pfc.frErr = e; if (host.isConnected) again(); });
      } }], close);
      host.appendChild(m);
    } else host.appendChild(_pfcEl('div', 'pfc-note', 'Looking for your friends…'));
  } else if (fr.around.length) {
    const row = _pfcEl('div', 'pfc-around pfc-row');
    row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Friends around now');
    const shown = fr.around.slice(0, 7);
    for (const f of shown) {
      const name = typeof friendName === 'function' ? friendName(f) : 'Your friend';
      const b = _pfcEl('button', 'pfc-fr'); b.type = 'button';
      b.setAttribute('aria-label', `${name}, ${_PFC_AROUND[f.presence] || 'around'}: open their page`);
      b.appendChild(typeof _frAvatarWrap === 'function' ? _frAvatarWrap(f, 28) : profileAvatarEl(f, 28));
      b.onclick = (e) => { e.stopPropagation(); close(); if (window.Friends && Friends.open) Friends.open(f.id); else setView('friends:' + f.id); };
      row.appendChild(b);
    }
    if (fr.around.length > shown.length) row.appendChild(_pfcEl('span', 'pfc-more', '+' + (fr.around.length - shown.length)));
    host.appendChild(row);
  } else host.appendChild(_pfcEl('div', 'pfc-note', fr.friends ? 'No one is around right now.' : fr.requests ? (fr.requests === 1 ? 'A friend request is waiting for you.' : fr.requests + ' friend requests are waiting for you.') : 'No friends yet.'));
  const counts = fr ? [fr.requests ? _pfcPlural(fr.requests, 'request') : '', fr.around.length ? fr.around.length + ' online' : ''].filter(Boolean).join(' · ') : '';
  const items = [
    { icon: 'users', label: 'Open Friends', hint: counts, className: fr && fr.requests ? 'pfc-has-req' : '', run: () => setView('friends') },
    { icon: 'user-plus', label: 'Add a friend', run: () => { if (typeof friendsAddDialog === 'function') friendsAddDialog(); else setView('friends'); } },
    { icon: 'shield-check', label: 'What my friends can see', run: () => setView('settings:privacy') },
  ];
  const m = _pfcEl('div', 'pfc-menu'); m.setAttribute('role', 'menu'); m.setAttribute('aria-label', 'Friends');
  buildMenuItems(m, items, close);
  host.appendChild(m);
}

/** Your relay and Sync, each with its state in one word. */
function _pfcSysPaint(host, close) {
  const fr = _pfcFriends();
  const sync = _pfc.syncErr ? 'Unknown' : _pfcSyncWord(_pfc.sync);
  const had = host.contains(document.activeElement) ? [...host.querySelectorAll('.pop-item')].indexOf(document.activeElement) : -1;
  host.replaceChildren();
  buildMenuItems(host, [
    { icon: 'cloud', label: 'Your relay', hint: _pfcRelayWord(fr) || '…', run: () => { if (typeof relaySettingsOpen === 'function') relaySettingsOpen(); else setView('settings:relay'); } },
    { icon: 'refresh-cw', label: 'Sync', hint: sync || '…', run: () => setView('settings:sync') },
  ], close);
  if (had >= 0) { const b = host.querySelectorAll('.pop-item')[had]; if (b) b.focus({ preventScroll: true }); }   // a state arriving keeps your place
}

/** Up / Down between rows, Left / Right inside one, Home / End. Rows: a .pfc-row (its buttons), else each button. */
function _pfcKeys(e, root) {
  const k = e.key;
  if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(k) || e.altKey || e.ctrlKey || e.metaKey) return;
  const all = [...root.querySelectorAll('button:not(:disabled)')].filter(b => !b.closest('[hidden]'));
  if (!all.length) return;
  const rowOf = (b) => b.closest('.pfc-row') || b;
  const rows = [];
  for (const b of all) { const r = rowOf(b); if (!rows.includes(r)) rows.push(r); }
  const cur = document.activeElement, i = all.indexOf(cur);
  const go = (b) => { e.preventDefault(); e.stopPropagation(); if (b) b.focus(); };
  if (k === 'Home') return go(all[0]);
  if (k === 'End') return go(all[all.length - 1]);
  if (i < 0) return go(all[0]);
  const row = rowOf(cur);
  if (k === 'ArrowLeft' || k === 'ArrowRight') {
    if (row === cur) return;   // a plain row: nothing sideways
    const inRow = all.filter(b => rowOf(b) === row), j = inRow.indexOf(cur);
    return go(inRow[(j + (k === 'ArrowRight' ? 1 : -1) + inRow.length) % inRow.length]);
  }
  const n = rows.length, next = rows[(rows.indexOf(row) + (k === 'ArrowDown' ? 1 : -1) + n) % n];
  if (next.tagName === 'BUTTON') return go(next);
  return go(next.querySelector('button[aria-pressed="true"]:not(:disabled)') || all.find(b => rowOf(b) === next));
}

/* ---------- the sidebar hidden (Ctrl+\): you and Friends move to the top of the More menu (2.18) ---------- */
function _pfcSidebarHidden() {
  try {
    if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) return false;   // the drawer: the corner shows when it opens
    return !!(typeof state !== 'undefined' && state && state.sidebarCollapsed);
  } catch (e) { return false; }
}
if (typeof registerMoreItem === 'function') {
  registerMoreItem({ id: 'you-profile', label: 'You: card, status and friends', icon: 'circle-user', order: -20, where: ['more'], hidden: () => !_pfcSidebarHidden(),
    run: () => { const m = document.getElementById('more-btn'); setTimeout(() => profileHubOpen(m), 0); } });
  registerMoreItem({ id: 'you-friends', label: 'Friends', icon: 'users', order: -10, where: ['more'], hidden: () => !_pfcSidebarHidden(),
    hint: () => { const fr = _pfcFriends(); return fr && fr.requests ? _pfcPlural(fr.requests, 'request') : fr && fr.around.length ? fr.around.length + ' online' : ''; },
    run: () => setView('friends') });
}
