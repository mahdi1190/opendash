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

   Friend strings are set with textContent only (the owner's rule); markup
   strings here are static or icon(). Entrance motion plays once per entry.
   ============================================================ */
const _frUI = { entry: '', root: null, feedN: 30, feed: null, feedAt: 0, feedBusy: false, detail: new Map(), detailAt: new Map(), burstSeen: new Set() };
const _FR_PRES = Object.freeze({ online: ['Here now', 'circle-dot'], focusing: ['Focusing', 'timer'], travelling: ['Travelling', 'plane'], away: ['Away', 'moon'], offline: ['Not around', 'moon'] });
const _FR_CHEERS = Object.freeze(['👏', '🎉', '💪', '🔥', '❤️', '🌟']);
function _frIdOf(v) { const m = /^friends:([0-9a-f]{16})$/.exec(String(v || '')); return m ? m[1] : null; }

registerSection('friends', {
  match: v => v === 'friends' || /^friends:[0-9a-f]{16}$/.test(String(v || '')),
  title: () => 'Friends',
  crumb: v => { const id = _frIdOf(v); if (!id) return []; const f = friendsGet(id); return [{ label: 'Friends', view: 'friends' }, f ? friendName(f) : 'Friend']; },
  group: 'life', layout: 'page', hashable: true, taskControls: false,   // Life > Friends since 2.18 (NAVIGATION_PLAN.md 2.2)
  mount(container, view) { _frMount(container, view || state.view); },
  unmount() { _frUI.entry = ''; _frUI.root = null; },
});
// Life's first tab (2.18): the sidebar row, the tab strip, All pages and the corner hub read this. The Home row it
// replaces ('friends-nav', hidden by default in 2.17.1) is gone; a friend's page offers the shared 'Back to'.
registerPage({
  id: 'friends', view: 'friends', match: v => v === 'friends' || /^friends:[0-9a-f]{16}$/.test(String(v || '')),
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
function _frBtn(label, o) {
  o = o || {};
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn ' + (o.kind || 'btn-secondary') + (o.sm ? ' btn-sm' : '') + (o.cls ? ' ' + o.cls : '');
  if (o.icon) b.innerHTML = icon(o.icon);
  if (label) b.appendChild(_frEl('span', null, label));
  if (o.tip) b.setAttribute('data-tip', o.tip);
  if (o.aria) b.setAttribute('aria-label', o.aria);
  if (o.run) b.onclick = (e) => { e.stopPropagation(); o.run(e, b); };
  return b;
}
async function _frDo(btn, fn, ok) {
  if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }
  try {
    const r = await fn();
    if (ok) toast(typeof ok === 'function' ? ok(r) : ok, { kind: 'ok' });
    return r;
  } catch (e) {
    if (e && e.name === 'AbortError') return null;
    toast(netErrorMessage(e), { kind: 'err' });
    return null;
  } finally { if (btn && btn.isConnected) { btn.disabled = false; btn.classList.remove('is-busy'); } }
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
async function _frCopy(text, what) {
  try { await navigator.clipboard.writeText(String(text)); toast(`${what || 'Copied'} copied`, { kind: 'ok', icon: 'copy' }); }
  catch (e) { toast('Copying is blocked here: select the text and copy it yourself.', { kind: 'err' }); }
}
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
function _frOpenRelaySettings() {
  if (typeof relaySettingsOpen === 'function') { try { relaySettingsOpen(); return; } catch (e) { console.error('[friends] relay settings', e); } }
  setView('settings:relay');
}

/* ---------- mount and repaint ---------- */
function _frMount(container, view) {
  _fr.opened = true;
  const entering = _frUI.entry !== view;
  _frUI.entry = view;
  const sub = document.getElementById('view-subtitle');
  if (sub) sub.textContent = 'Cheer each other on, compare streaks, do things together';
  const root = _frEl('div', 'fr-page' + (entering ? ' is-enter' : ''));
  container.appendChild(root);
  _frUI.root = root;
  const d = _fr.data;
  if (!d || !d.me || !d.me.id) {
    root.appendChild(_frLoading());
    friendsLoad(true).then(() => friendsPageRefresh()).catch((e) => { if (!root.isConnected) return; root.textContent = ''; root.appendChild(_frErrorCard(e)); });
    return;
  }
  _frRender(root, view);
  if (entering && window.Motion && Motion.stagger) Motion.stagger(root, { selector: '.fr-sec, .fr-hang, .fr-fhero, .fr-pend', step: 35, max: 8 });
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
    const id = _frIdOf(view);
    if (id) _frFriendPage(root, id); else _frHangout(root);
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
  t.append(_frEl('b', null, 'Friends could not load'), _frEl('span', 'muted', netErrorMessage(e)));
  el.appendChild(t);
  el.appendChild(_frBtn('Try again', { icon: 'refresh-cw', run: () => friendsLoad(true).then(() => friendsPageRefresh()).catch((x) => toast(netErrorMessage(x), { kind: 'err' })) }));
  return el;
}

/* ---------- the hangout ---------- */
function _frHangout(root) {
  const d = _fr.data;
  const all = d.friends || [];
  const friends = all.filter(f => f.status === 'friend').sort((a, b) => _frPresRank(a) - _frPresRank(b) || (b.lastAt || 0) - (a.lastAt || 0) || friendName(a).localeCompare(friendName(b)));
  root.appendChild(_frHangHeader(d, friends));
  if (!d.relay || !d.relay.home) root.appendChild(_frNoRelay(d));
  // A key renewal still on its way (yours), and friends' renewals that need you (FRIENDS.md section 15).
  const rot = d.me && d.me.rotation;
  if (rot && (rot.step !== 'done' || Date.now() - (rot.doneAt || 0) < 3 * 86400000)) { const s = _frSec('Your new keys', 'key-round'); s.appendChild(_frKeysEl(d)); root.appendChild(s); }
  const attn = all.filter(f => f.status === 'frozen' || f.relayAsk);
  if (attn.length) root.appendChild(_frAttentionSec(attn));
  const pend = all.filter(f => f.status === 'incoming' || f.status === 'requested').sort((a, b) => (a.status === 'incoming' ? 0 : 1) - (b.status === 'incoming' ? 0 : 1) || (b.addedAt - a.addedAt));
  if (pend.length) root.appendChild(_frPendingSec(pend));
  const declined = all.filter(f => f.status === 'declined');
  if (declined.length) root.appendChild(_frDeclinedSec(declined));
  root.appendChild(_frGridSec(d, friends));
  for (const p of _fr.panels.filter(x => x.where === 'hangout')) {
    const sec = _frSec(p.title || '', p.icon || 'sparkles');
    try { if (p.render(sec, d) !== false) root.appendChild(sec); } catch (e) { console.error('[friends] panel ' + p.id, e); }
  }
  root.appendChild(_frFeedSec(null));
  root.appendChild(_frSettingsSec(d));
}
const _frPresRank = (f) => ({ online: 0, focusing: 1, travelling: 2, away: 3 })[f.presence] ?? 4;
function _frSec(title, ic, extra) {
  const s = _frEl('section', 'fr-sec');
  const h = _frEl('div', 'fr-sec-h');
  h.innerHTML = icon(ic || 'sparkles', 'i-sm');
  h.appendChild(_frEl('h2', null, title));
  h.appendChild(_frEl('span', 'spacer'));
  if (extra) h.appendChild(extra);
  s.appendChild(h);
  return s;
}
function _frHangHeader(d, friends) {
  const el = _frEl('section', 'fr-hang');
  const top = _frEl('div', 'fr-hang-top');
  const t = _frEl('div', 'fr-hang-t');
  const online = friends.filter(f => f.presence !== 'offline').length;
  t.appendChild(_frEl('div', 'overline', 'Friends'));
  t.appendChild(_frEl('h1', null, friends.length ? 'Your hangout' : 'Bring your people'));
  t.appendChild(_frEl('p', 'muted', friends.length
    ? `${friends.length} friend${friends.length === 1 ? '' : 's'}${online ? ` · ${online} around now` : ''}. Cheer each other on, compare streaks, and do things together.`
    : "Add a friend to cheer each other on, see each other's levels and streaks, and do quests together. Everything between you is end-to-end encrypted."));
  const acts = _frEl('div', 'fr-hang-acts');
  acts.appendChild(_frBtn('Add a friend', { icon: 'user-plus', kind: 'btn-primary', run: () => friendsAddDialog() }));
  if (d.me.code) {
    const chip = _frBtn('', { cls: 'fr-codechip', tip: 'Your friend code: people on your relay add you with it. Click to copy.', run: () => _frCopy(d.me.code, 'Your friend code') });
    chip.innerHTML = icon('key-round', 'i-sm');
    chip.appendChild(_frEl('span', 'num', d.me.code));
    acts.appendChild(chip);
  }
  top.append(t, acts);
  el.appendChild(top);
  // everyone, floating gently
  const row = _frEl('div', 'fr-bubbles');
  const me = _frEl('div', 'fr-bubble is-me');
  me.append(_frMeAvatar(d, 52), _frEl('span', 'fr-bubble-n', 'You'));
  { const fg = typeof friendsSceneFigureEl === 'function' ? friendsSceneFigureEl('me', 60) : null; if (fg) { me.classList.add('has-fig'); me.prepend(fg); } }   // the full figure (99s-friends-scenes-0core.js)
  row.appendChild(me);
  friends.slice(0, 14).forEach((f, i) => {
    const b = _frEl('button', 'fr-bubble');
    b.type = 'button';
    b.style.setProperty('--d', ((i * 0.37) % 2.4).toFixed(2) + 's');
    b.append(_frAvatarWrap(f, 52), _frEl('span', 'fr-bubble-n', friendName(f)));
    { const fg = typeof friendsSceneFigureEl === 'function' ? friendsSceneFigureEl(f, 60) : null; if (fg) { b.classList.add('has-fig'); b.prepend(fg); } }   // their full figure, when they share an avatar
    const pw = (_FR_PRES[f.presence] || _FR_PRES.offline)[0];
    b.setAttribute('aria-label', `${friendName(f)}, ${pw}`);
    b.onclick = () => setView('friends:' + f.id);
    row.appendChild(b);
  });
  if (friends.length > 14) row.appendChild(_frEl('span', 'fr-bubble-more muted', `+${friends.length - 14}`));
  if (!friends.length) {
    for (let i = 0; i < 3; i++) {
      const b = _frEl('button', 'fr-bubble is-empty');
      b.type = 'button';
      b.style.setProperty('--d', (i * 0.6) + 's');
      b.innerHTML = `<span class="fr-av fr-av-empty" style="--size:52px">${icon('plus')}</span>`;
      b.appendChild(_frEl('span', 'fr-bubble-n', i === 0 ? 'Add someone' : ''));
      b.setAttribute('aria-label', 'Add a friend');
      b.onclick = () => friendsAddDialog();
      row.appendChild(b);
    }
  }
  el.appendChild(row);
  return el;
}
function _frNoRelay(d) {
  const el = _frEl('section', 'card fr-norelay fr-sec');
  const ic = _frEl('div', 'fr-norelay-ic');
  ic.innerHTML = icon('cloud', 'i-lg');
  const t = _frEl('div', 'fr-norelay-t');
  t.appendChild(_frEl('b', null, 'No relay yet'));
  t.appendChild(_frEl('span', null, "Friends talk through a small private relay: your own (free on Cloudflare, a few clicks), or a friend's that you join with their invite. It only ever sees scrambled messages."));
  if (d.relay && d.relay.support === false) t.appendChild(_frEl('span', 'muted fr-small', "This version of OpenDash doesn't include relay support yet: it arrives with the relay update."));
  const a = _frEl('div', 'fr-norelay-a');
  a.appendChild(_frBtn('Connect Cloudflare', { icon: 'cloud', kind: 'btn-primary', run: () => _frOpenRelaySettings() }));
  a.appendChild(_frBtn("Paste a friend's invite", { icon: 'clipboard', run: () => friendsAddDialog('paste') }));
  el.append(ic, t, a);
  return el;
}

/* ---------- requests: approve with the check code ---------- */
function _frPendingSec(list) {
  const sec = _frSec(list.some(f => f.status === 'incoming' || f.step === 'check') ? 'Waiting for you' : 'Requests', 'user-check');
  for (const f of list) sec.appendChild(_frPendCard(f));
  return sec;
}
function _frCodeEl(code) {
  const c = _frEl('div', 'fr-code num', code || '');
  c.setAttribute('aria-label', 'Check code ' + String(code || '').split('').join(' '));
  return c;
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
      body.appendChild(_frEl('span', null, `Check that ${name} sees this same code, in person, on a call or in a message you trust:`));
      body.appendChild(_frCodeEl(f.code));
      acts.appendChild(_frBtn('Approve', { icon: 'check', kind: 'btn-primary', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/approve', { id: f.id }); _frBurst(b); await friendsLoad(true); _frRepaint(); }) }));
      acts.appendChild(_frBtn('The codes are different', { sm: true, run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/mismatch', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Stopped. Nothing was shared. You can try adding each other again.') }));
    } else {
      const w = _frEl('span', 'fr-wait');
      w.innerHTML = icon('loader-circle', 'i-sm fr-spin');
      w.appendChild(_frEl('span', null, 'Getting the check code ready. This needs their OpenDash to be running.'));
      body.appendChild(w);
    }
    acts.appendChild(_frBtn('Decline', { sm: true, kind: 'btn-ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/decline', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Declined. They are not told why.') }));
    acts.appendChild(_frBtn('', { icon: 'lock', sm: true, kind: 'btn-ghost', tip: 'Block: they can never reach you again', aria: 'Block', run: () => _frRemove(f, true) }));
  } else {
    if (f.step === 'check') {
      // Added by code: this side compares the code too (a relay could have answered for someone else).
      body.appendChild(_frEl('b', null, f.theyApproved ? `${name} approved: check the code to finish` : `Check the code with ${name}`));
      body.appendChild(_frEl('span', null, `Check that ${name} sees this same code, in person, on a call or in a message you trust:`));
      body.appendChild(_frCodeEl(f.code));
      acts.appendChild(_frBtn('The codes match', { icon: 'check', kind: 'btn-primary', run: (e, b) => _frDo(b, async () => { const r = await _frApi('/api/friends/confirm', { id: f.id }); if (r && r.friend && r.friend.status === 'friend') _frBurst(b); await friendsLoad(true); _frRepaint(); }) }));
      acts.appendChild(_frBtn('The codes are different', { sm: true, run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/mismatch', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Stopped. Nothing was shared. You can try adding each other again.') }));
    } else if (f.step === 'approve') {
      body.appendChild(_frEl('b', null, `Waiting for ${name} to approve`));
      body.appendChild(_frEl('span', null, f.how === 'code' ? 'You checked the code. They approve once it matches the code on their screen:' : 'Tell them your code. They approve once it matches the code on their screen:'));
      body.appendChild(_frCodeEl(f.code));
      acts.appendChild(_frBtn('The codes are different', { sm: true, run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/mismatch', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Stopped. Nothing was shared. You can try again with a new invite.') }));
    } else {
      body.appendChild(_frEl('b', null, `Request sent to ${name}`));
      const w = _frEl('span', 'fr-wait');
      w.innerHTML = icon('hourglass', 'i-sm');
      w.appendChild(_frEl('span', null, "Waiting for their OpenDash to answer. If they're offline it answers when they're back."));
      body.appendChild(w);
    }
    acts.appendChild(_frBtn('Cancel', { sm: true, kind: 'btn-ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/cancel', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Request cancelled') }));
  }
  el.append(body, acts);
  return el;
}
function _frDeclinedSec(list) {
  const sec = _frSec('Not this time', 'hourglass');
  for (const f of list) {
    const row = _frEl('div', 'fr-row');
    row.appendChild(_frAvatarWrap(f, 28, { presence: false }));
    const why = f.why === 'codes-differed' ? `The check codes with ${friendName(f)} were different, so nothing was shared.`
      : f.why === 'you-declined' ? `You declined ${friendName(f)}.` : `${friendName(f)} didn't accept this time.`;
    row.appendChild(_frEl('span', 'fr-row-t', why));
    row.appendChild(_frBtn('Dismiss', { sm: true, kind: 'btn-ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/cancel', { id: f.id }); await friendsLoad(true); _frRepaint(); }) }));
    sec.appendChild(row);
  }
  return sec;
}

/* ---------- friend cards ---------- */
function _frGridSec(d, friends) {
  const sec = _frSec('Friends', 'users');
  if (!friends.length) {
    const e = _frEl('div', 'fr-empty-inline');
    e.innerHTML = icon('sparkles', 'i-lg');
    const t = _frEl('div');
    t.append(_frEl('b', null, 'No friends here yet'), _frEl('span', 'muted', d.relay && d.relay.home ? 'Send someone an invite link, or add them with their friend code if they use your relay.' : "Connect a relay first, or paste a friend's invite to join theirs."));
    e.appendChild(t);
    if (d.relay && d.relay.home) e.appendChild(_frBtn('Add a friend', { icon: 'user-plus', kind: 'btn-primary', run: () => friendsAddDialog() }));
    sec.appendChild(e);
    return sec;
  }
  const grid = _frEl('div', 'fr-grid');
  for (const f of friends) grid.appendChild(_frCard(f));
  sec.appendChild(grid);
  return sec;
}
function _frCard(f) {
  const c = _frEl('div', 'card fr-card');
  c.tabIndex = 0;
  c.setAttribute('role', 'link');
  c.setAttribute('aria-label', `${friendName(f)}'s page`);
  c.onclick = () => setView('friends:' + f.id);
  c.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); setView('friends:' + f.id); } };
  const head = _frEl('div', 'fr-card-h');
  head.appendChild(_frAvatarWrap(f, 48));
  const nm = _frEl('div', 'fr-card-n');
  nm.appendChild(_frEl('b', null, friendName(f)));
  const pr = _FR_PRES[f.presence] || _FR_PRES.offline;
  const pl = _frEl('span', 'fr-pres muted');
  pl.setAttribute('data-fr-presence', f.id);
  pl.setAttribute('data-p', f.presence || 'offline');
  pl.appendChild(_frEl('span', 'fr-pres-dot'));
  pl.appendChild(_frEl('span', null, pr[0] + (f.direct ? ' · connected directly' : '')));
  nm.appendChild(pl);
  head.appendChild(nm);
  c.appendChild(head);
  // their game
  const g = f.game;
  const gl = _frEl('div', 'fr-card-g');
  if (g && g.level) {
    const lv = _frEl('span', 'fr-lv');
    lv.innerHTML = icon('gamepad-2', 'i-xs');
    lv.appendChild(_frEl('span', 'num', `Level ${g.level}`));
    if (g.title) lv.appendChild(_frEl('span', 'muted', ' · ' + g.title));
    gl.appendChild(lv);
    if (g.streak) {
      const st = _frEl('span', 'fr-flame');
      st.innerHTML = icon('flame', 'i-xs');
      st.appendChild(_frEl('span', 'num', String(g.streak)));
      st.title = `${g.streak}-day streak`;
      gl.appendChild(st);
    }
  } else gl.appendChild(_frEl('span', 'muted fr-small', 'Not sharing game progress'));
  c.appendChild(gl);
  // your friendship
  const fs = f.friendship;
  if (fs) {
    const fw = _frEl('div', 'fr-card-f');
    const top = _frEl('div', 'fr-card-ft');
    top.appendChild(_frEl('span', null, fs.title));
    top.appendChild(_frEl('span', 'muted num', `Lv ${fs.level}`));
    fw.appendChild(top);
    const bar = _frEl('div', 'fr-bar');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Friendship level progress');
    bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(fs.need)); bar.setAttribute('aria-valuenow', String(fs.into));
    const i = _frEl('i'); i.style.setProperty('--pct', (fs.pct * 100).toFixed(1) + '%');
    bar.appendChild(i);
    fw.appendChild(bar);
    c.appendChild(fw);
  }
  const foot = _frEl('div', 'fr-card-foot');
  const streak = fs && fs.streak ? `${fs.streak} day${fs.streak === 1 ? '' : 's'} in touch` : (fs && fs.milestone && fs.milestone.today ? fs.milestone.today.label : (f.friendsAt ? 'Friends since ' + new Date(f.friendsAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''));
  foot.appendChild(_frEl('span', 'muted fr-small', streak));
  foot.appendChild(_frEl('span', 'spacer'));
  foot.appendChild(_frBtn('', { icon: 'heart', sm: true, kind: 'btn-ghost', cls: 'fr-cheer', tip: `Cheer ${friendName(f)} on`, aria: `Cheer ${friendName(f)} on`, run: (e, b) => _frCheerMenu(b, f) }));
  c.appendChild(foot);
  if (fs && fs.milestone && fs.milestone.today) c.classList.add('is-milestone');
  if (typeof funFriendCard === 'function') { try { funFriendCard(c, f); } catch (e) { console.error('[friends] fun card', e); } }   // agent 'fun': duo flame, gifts, quick actions
  return c;
}
function _frCheerMenu(anchor, f) {
  openPopover(anchor, (el, close) => {
    el.classList.add('fr-cheers');
    el.appendChild(_frEl('div', 'pop-label', `Cheer ${friendName(f)} on`));
    const row = _frEl('div', 'fr-cheer-row');
    for (const em of _FR_CHEERS) {
      const b = _frEl('button', 'fr-cheer-em', em);
      b.type = 'button';
      b.setAttribute('aria-label', 'Send ' + em);
      b.onclick = () => { close(); _frDo(null, async () => { const r = await friendsCheer(f.id, em); _frBurst(anchor); if (r && !r.sent && !r.queued) throw new Error(`${friendName(f)} isn't receiving cheers from you right now.`); return r; }, (r) => (r && r.queued && !r.sent ? `Cheer for ${friendName(f)} is waiting to go` : `Cheer sent to ${friendName(f)} ${em}`)); };
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
      ? { icon: 'triangle-alert', text: `Two different key renewals came for ${who}, so your friendship is paused. Check with ${who} and ask for a fresh invite.` }
      : { icon: 'key-round', text: `${who} renewed their keys. You're still friends: nothing for you to do.` };
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
function _frFeedSec(friendId) {
  const more = _frBtn('', { icon: 'refresh-cw', sm: true, kind: 'btn-ghost', tip: 'Check for new messages now', aria: 'Check now', run: (e, b) => _frDo(b, async () => { const r = await _frApi('/api/friends/check', {}); _frUI.feedAt = 0; await friendsLoad(true); _frRepaint(); return r; }, (r) => (r && r.got ? `${r.got} new` : 'Up to date')) });
  const sec = _frSec(friendId ? 'You two' : "What's happening", 'sparkles', more);
  const list = _frEl('ul', 'fr-feed');
  sec.appendChild(list);
  const key = friendId || '*';
  const paint = (entries) => {
    list.textContent = '';
    if (!entries.length) {
      const li = _frEl('li', 'fr-feed-empty muted', friendId ? 'Nothing between you yet. Send a cheer to start your streak.' : 'Nothing yet. Cheers, level-ups, streaks and finished quests show up here.');
      list.appendChild(li);
      return;
    }
    for (const e of entries) {
      const f = e.f ? friendsGet(e.f) : (Array.isArray(e.to) && e.to.length ? friendsGet(e.to[0]) : null);
      const dsc = _frDescribe(e, f);
      const li = _frEl('li', 'fr-feed-i' + (dsc.tone ? ' is-' + dsc.tone : '') + (e.dir === 'in' ? ' is-in' : ' is-mine'));
      const av = f ? _frAvatarWrap(f, 30, { presence: false }) : _frEl('span', 'fr-feed-ic');
      if (!f) av.innerHTML = icon(dsc.icon || 'sparkles', 'i-sm');
      li.appendChild(av);
      const tx = _frEl('div', 'fr-feed-t');
      const line = _frEl('span', 'fr-feed-l');
      const ic = _frEl('span', 'fr-feed-k');
      ic.innerHTML = icon(/^[a-z0-9-]{1,40}$/.test(dsc.icon || '') ? dsc.icon : 'sparkles', 'i-xs');
      line.append(ic, _frEl('span', null, dsc.text));
      tx.appendChild(line);
      tx.appendChild(_frEl('span', 'muted fr-small', _frAgo(e.at)));
      if (dsc.el && dsc.el.nodeType === 1) tx.appendChild(dsc.el);   // a describer's card (a postcard: 99s-friends-scenes-2postcards.js)
      li.appendChild(tx);
      if (f && e.dir === 'in' && (e.k === 'game:level' || e.k === 'game:streak' || (e.k === 'quest' && e.b && e.b.state === 'done') || (e.k === 'challenge' && e.b && e.b.state === 'win'))) {
        li.appendChild(_frBtn('', { icon: 'heart', sm: true, kind: 'btn-ghost', cls: 'fr-cheer', tip: `Cheer ${friendName(f)}`, aria: `Cheer ${friendName(f)}`, run: (ev, b) => _frCheerMenu(b, f) }));
      }
      if (typeof funFeedItem === 'function') { try { funFeedItem(li, e, f); } catch (x) { console.error('[friends] fun feed', x); } }   // agent 'fun': reactions, Unwrap, Answer
      list.appendChild(li);
    }
    if (entries.length >= _frUI.feedN) {
      const li = _frEl('li', 'fr-feed-more');
      li.appendChild(_frBtn('Show more', { sm: true, kind: 'btn-ghost', run: () => { _frUI.feedN += 30; _frUI.feedAt = 0; friendsPageRefresh(); } }));
      list.appendChild(li);
    }
  };
  const cached = _frUI.feed && _frUI.feed.key === key ? _frUI.feed.entries : null;
  if (cached) paint(cached); else list.appendChild(_frEl('li', 'fr-feed-empty muted', 'Loading…'));
  const fresh = cached && Date.now() - _frUI.feedAt < 4000 && _frUI.feed.n === _frUI.feedN && _fr.at <= _frUI.feedAt;
  if (!fresh && !_frUI.feedBusy) {
    _frUI.feedBusy = true;
    _frUI.feedAt = Date.now();
    Friends.feed({ friend: friendId || undefined, limit: _frUI.feedN }).then((entries) => {
      _frUI.feed = { key, entries, n: _frUI.feedN };
      if (list.isConnected) paint(entries);
    }).catch(() => { if (list.isConnected && !cached) { list.textContent = ''; list.appendChild(_frEl('li', 'fr-feed-empty muted', 'The feed could not load just now.')); } })
      .finally(() => { _frUI.feedBusy = false; });
  }
  return sec;
}

/* ---------- settings (quiet, at the bottom) ---------- */
function _frSettingsSec(d) {
  const det = _frEl('details', 'fr-sec fr-settings');
  const sum = _frEl('summary', 'fr-sec-h');
  sum.innerHTML = icon('settings', 'i-sm');
  sum.appendChild(_frEl('h2', null, 'Friends settings and privacy'));
  det.appendChild(sum);
  const body = _frEl('div', 'fr-set-b');
  // name
  const nr = _frEl('label', 'fr-set-row');
  nr.appendChild(_frEl('span', 'fr-set-l', 'Your name for friends'));
  const ni = document.createElement('input');
  ni.type = 'text'; ni.className = 'input'; ni.maxLength = 60; ni.id = 'fr-set-name';
  ni.value = d.me.name || ''; ni.placeholder = 'What friends see';
  ni.onchange = () => _frDo(null, async () => { await _frApi('/api/friends/me', { name: ni.value }); await friendsLoad(true); }, 'Saved. Friends see it next time you share.');
  nr.appendChild(ni);
  body.appendChild(nr);
  // presence
  const pr = _frEl('div', 'fr-set-row');
  const pl = _frEl('label', 'fr-set-l fr-switch');
  const pc = document.createElement('input'); pc.type = 'checkbox'; pc.checked = !!d.me.prefs.presence.share;
  pl.append(pc, _frEl('span', null, "Show friends when I'm around"));
  const ps = document.createElement('select');
  ps.className = 'input input-sm';
  for (const [v, l] of [['auto', 'Automatic (focusing, travelling, away)'], ['online', 'Always "here now"'], ['focusing', 'Focusing'], ['travelling', 'Travelling'], ['away', 'Away']]) { const o = document.createElement('option'); o.value = v; o.textContent = l; if (d.me.prefs.presence.state === v) o.selected = true; ps.appendChild(o); }
  ps.disabled = !pc.checked;
  const savePres = () => _frDo(null, async () => { await _frApi('/api/friends/me', { presence: { share: pc.checked, state: ps.value } }); _fr.pres.last = ''; await friendsLoad(true); _frPresenceTick(); });
  pc.onchange = () => { ps.disabled = !pc.checked; savePres(); };
  ps.onchange = savePres;
  pr.append(pl, ps);
  body.appendChild(pr);
  body.appendChild(_frEl('p', 'muted fr-small', "Only a coarse word is shared (here now, focusing, travelling, away), never where you are or what you are doing. With this on, each friend's page still lets you choose whether that friend sees it."));
  // direct
  const dr = _frEl('label', 'fr-set-row fr-switch');
  const dc = document.createElement('input'); dc.type = 'checkbox'; dc.checked = d.me.prefs.direct !== false;
  dc.onchange = () => _frDo(null, async () => { await _frApi('/api/friends/me', { direct: dc.checked }); await friendsLoad(true); });
  dr.append(dc, _frEl('span', null, "Connect directly when we're both online"));
  body.appendChild(dr);
  body.appendChild(_frEl('p', 'muted fr-small', `Faster on the same network. It tells your friends this computer's network address.${d.direct && d.direct.on ? '' : ' (Off on this computer.)'}`));
  // relay
  const rr = _frEl('div', 'fr-set-row');
  const home = d.relay && d.relay.home;
  rr.appendChild(_frEl('span', 'fr-set-l', home ? `Home relay: ${home.host} (${home.role === 'owner' ? 'yours' : "a friend's"})` : 'No home relay yet'));
  rr.appendChild(_frBtn(home ? 'Relay settings' : 'Connect Cloudflare', { sm: true, icon: 'cloud', run: () => _frOpenRelaySettings() }));
  body.appendChild(rr);
  if (d.relay && d.relay.outbox) body.appendChild(_frEl('p', 'muted fr-small', `${d.relay.outbox} message${d.relay.outbox === 1 ? '' : 's'} waiting to go (they retry by themselves).`));
  // your keys (renew them: FRIENDS.md section 15)
  if (d.me && d.me.id) {
    body.appendChild(_frEl('div', 'fr-set-l', 'Your friend keys'));
    body.appendChild(_frKeysEl(d));
  }
  // blocked
  const blocked = (d.friends || []).filter(f => f.status === 'blocked');
  if (blocked.length) {
    body.appendChild(_frEl('div', 'fr-set-l', 'Blocked'));
    for (const f of blocked) {
      const row = _frEl('div', 'fr-row');
      row.appendChild(_frEl('span', 'fr-row-t', friendName(f)));
      row.appendChild(_frBtn('Unblock', { sm: true, kind: 'btn-ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/unblock', { id: f.id }); await friendsLoad(true); _frRepaint(); }, 'Unblocked. They can send you a request again.') }));
      body.appendChild(row);
    }
  }
  const note = _frEl('p', 'fr-privacy');
  note.innerHTML = icon('lock', 'i-xs');
  note.appendChild(_frEl('span', null, 'Encrypted end to end: your relay can\'t read anything. Each friend sees your card and game progress, plus only what you choose for them in Settings > Privacy.'));
  body.appendChild(note);
  det.appendChild(body);
  return det;
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
function _frFriendPage(root, id) {
  const f = friendsGet(id);
  if (!f || f.status === 'removing' || f.status === 'blocked') {
    const e = _frEl('div', 'card fr-empty');
    e.innerHTML = icon('user-x', 'i-lg');
    const t = _frEl('div');
    t.append(_frEl('b', null, 'This friend is not here any more'), _frEl('span', 'muted', 'They may have been removed on one of your devices.'));
    e.appendChild(t);
    root.appendChild(e);
    return;
  }
  if (f.status !== 'friend') { root.appendChild(_frPendCard(f)); return; }
  const det = _frDetail(id);
  root.appendChild(_frFriendHero(f));
  const cols = _frEl('div', 'fr-cols');
  const left = _frEl('div', 'fr-col');
  const right = _frEl('div', 'fr-col');
  left.appendChild(_frFriendGame(f));
  left.appendChild(_frFriendProfile(f, det));
  for (const p of _fr.panels.filter(x => x.where !== 'hangout')) {
    const sec = _frSec(p.title || '', p.icon || 'sparkles');
    try { if (p.render(sec, f) !== false) left.appendChild(sec); } catch (e) { console.error('[friends] panel ' + p.id, e); }
  }
  right.appendChild(_frFeedSec(id));
  cols.append(left, right);
  root.appendChild(cols);
}
function _frFriendHero(f) {
  const el = _frEl('section', 'fr-fhero');
  const fs = f.friendship || { level: 1, title: 'New friends', into: 0, need: 30, pct: 0, streak: 0, best: 0, milestone: {} };
  const avc = _frEl('div', 'fr-fhero-av');
  avc.appendChild(_frAvatarWrap(f, 96));
  el.appendChild(avc);
  const t = _frEl('div', 'fr-fhero-t');
  t.appendChild(_frEl('h1', null, friendName(f)));
  if (f.nick && f.name && f.nick !== f.name) t.appendChild(_frEl('span', 'muted', f.name));
  const pr = _FR_PRES[f.presence] || _FR_PRES.offline;
  const pl = _frEl('span', 'fr-pres');
  pl.setAttribute('data-fr-presence', f.id);
  pl.setAttribute('data-p', f.presence || 'offline');
  pl.appendChild(_frEl('span', 'fr-pres-dot'));
  pl.appendChild(_frEl('span', null, pr[0] + (f.direct ? ' · connected directly' : '')));
  t.appendChild(pl);
  const days = fs.milestone && fs.milestone.days ? fs.milestone.days : 0;
  if (f.friendsAt) t.appendChild(_frEl('span', 'muted', `Friends since ${_frDate(f.friendsAt)}${days ? ` · ${days.toLocaleString()} day${days === 1 ? '' : 's'}` : ''}`));
  const m = fs.milestone || {};
  if (m.today) {
    const b = _frEl('div', 'fr-milestone');
    b.innerHTML = icon('party-popper', 'i-sm');
    b.appendChild(_frEl('b', null, m.today.label));
    t.appendChild(b);
    const key = f.id + '|' + m.today.label;
    if (!_frUI.burstSeen.has(key)) { _frUI.burstSeen.add(key); setTimeout(() => _frBurst(b), 400); }
  } else if (m.next && m.next.inDays <= 30) {
    t.appendChild(_frEl('span', 'fr-next muted', `${m.next.label} in ${m.next.inDays} day${m.next.inDays === 1 ? '' : 's'}`));
  }
  el.appendChild(t);
  // the friendship ring
  const ring = _frEl('div', 'fr-fring');
  const rv = _frEl('span', 'fr-ringw');
  rv.innerHTML = _frRingSvg(fs.pct);
  rv.appendChild(_frEl('b', 'num', String(fs.level)));
  ring.appendChild(rv);
  const rt = _frEl('div', 'fr-fring-t');
  rt.appendChild(_frEl('span', 'overline', 'Friendship'));
  rt.appendChild(_frEl('b', null, fs.title));
  rt.appendChild(_frEl('span', 'muted fr-small num', `${fs.into} of ${fs.need} XP to level ${fs.level + 1}`));
  const st = _frEl('span', 'fr-flame');
  st.innerHTML = icon('flame', 'i-xs');
  st.appendChild(_frEl('span', null, fs.streak ? `${fs.streak} day${fs.streak === 1 ? '' : 's'} in touch` : 'Start a streak today'));
  if (fs.best > fs.streak) st.appendChild(_frEl('span', 'muted', ` · best ${fs.best}`));
  rt.appendChild(st);
  ring.appendChild(rt);
  el.appendChild(ring);
  // actions
  const acts = _frEl('div', 'fr-fhero-a');
  acts.appendChild(_frBtn('Cheer', { icon: 'heart', kind: 'btn-primary', run: (e, b) => _frCheerMenu(b, f) }));
  acts.appendChild(_frBtn('', { icon: 'ellipsis', kind: 'btn-ghost', aria: 'More', tip: 'More', run: (e, b) => openMenu(b, [
    { label: 'Remove friend', icon: 'user-minus', run: () => _frRemove(f, false) },
    { label: 'Block', icon: 'lock', danger: true, run: () => _frRemove(f, true) },
  ]) }));
  el.appendChild(acts);
  if (typeof funFriendHero === 'function') { try { funFriendHero(el, f); } catch (e) { console.error('[friends] fun hero', e); } }   // agent 'fun': wave, high five, gift
  return el;
}
function _frFriendGame(f) {
  const sec = _frSec(`${friendName(f)}'s game`, 'gamepad-2');
  const g = f.game;
  if (!g || !g.level) { sec.appendChild(_frEl('p', 'muted', `${friendName(f)} isn't sharing game progress with you.`)); return sec; }
  const row = _frEl('div', 'fr-game');
  const lv = _frEl('div', 'fr-game-lv');
  const rw = _frEl('span', 'fr-ringw is-game');
  rw.innerHTML = _frRingSvg(1);
  rw.appendChild(_frEl('b', 'num', String(g.level)));
  lv.appendChild(rw);
  const lt = _frEl('div');
  lt.appendChild(_frEl('span', 'overline', `Level ${g.level}`));
  lt.appendChild(_frEl('b', null, g.title || 'Player'));
  lv.appendChild(lt);
  row.appendChild(lv);
  const stats = _frEl('div', 'fr-game-n');
  const add = (n, l, ic) => { const s = _frEl('div', 'fr-stat'); if (ic) { const i = _frEl('span'); i.innerHTML = icon(ic, 'i-xs'); s.appendChild(i); } s.appendChild(_frEl('b', 'num', Number(n || 0).toLocaleString())); s.appendChild(_frEl('span', 'muted', l)); stats.appendChild(s); };
  add(g.streak, 'day streak', 'flame');
  if (g.best) add(g.best, 'best streak');
  if (g.xpWeek != null) add(g.xpWeek, 'XP this week');
  if (g.quests != null) add(g.quests, 'quests done', 'target');
  if (g.focusMin) add(Math.round(g.focusMin / 60), 'hours focused', 'timer');
  row.appendChild(stats);
  sec.appendChild(row);
  return sec;
}
function _frFriendProfile(f, det) {
  const sec = _frSec('What they share with you', 'user-check');
  const p = f.profile || {};
  let any = false;
  const line = (label, value) => { if (!value) return; any = true; const r = _frEl('div', 'fr-share'); r.append(_frEl('span', 'muted', label), _frEl('span', null, value)); sec.appendChild(r); };
  if (p.bio) { any = true; sec.appendChild(_frEl('p', 'fr-bio', p.bio)); }
  line('Pronouns', p.pronouns);
  line('City', p.city);
  if (f.game && f.game.level) line('Game', `Level ${f.game.level}${f.game.streak ? `, ${f.game.streak}-day streak` : ''}`);
  const shared = det && det.shared ? det.shared : {};
  for (const [k, v] of Object.entries(shared)) {
    if (k === 'profile' || k === 'share:game' || !k.startsWith('share:')) continue;
    const b = v && v.b && typeof v.b === 'object' ? v.b : {};
    line(k.slice(6).replace(/[-_]/g, ' '), typeof b.text === 'string' && b.text ? b.text : `Updated ${_frAgo(v.at)}`);
  }
  if (!any) sec.appendChild(_frEl('p', 'muted', 'Just their name for now.'));
  return sec;
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
    title: 'Add a friend', width: 520,
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
  t.append(_frEl('b', null, 'This needs a relay'), _frEl('span', 'muted', "Connect your own (free on Cloudflare), or paste a friend's invite to join theirs."));
  e.appendChild(t);
  const a = _frEl('div', 'fr-add-acts');
  a.append(_frBtn('Connect Cloudflare', { icon: 'cloud', kind: 'btn-primary', run: () => { if (close) close(); _frOpenRelaySettings(); } }));
  pane.append(e, a);
}
function _frAddInvite(pane, d, close) {
  if (!d || !d.relay || !d.relay.home) { _frNeedRelay(pane, close); return; }
  pane.appendChild(_frEl('p', null, 'Send this link to one person (by message or email), or let them scan its QR code. It works once, and before you are connected you both check a short code.'));
  const opts = _frEl('div', 'fr-add-opts');
  const ttl = document.createElement('select');
  ttl.className = 'input input-sm';
  for (const [v, l] of [['1', 'Expires in 1 day'], ['7', 'Expires in 7 days'], ['30', 'Expires in 30 days']]) { const o = document.createElement('option'); o.value = v; o.textContent = l; if (v === '7') o.selected = true; ttl.appendChild(o); }
  opts.appendChild(ttl);
  let relayChk = null, syncChk = null;
  if (d.relay.home.role === 'owner') {
    const l1 = _frEl('label', 'fr-switch');
    relayChk = document.createElement('input'); relayChk.type = 'checkbox'; relayChk.checked = true;
    l1.append(relayChk, _frEl('span', null, 'Let them use my relay for friends (if they have none)'));
    const l2 = _frEl('label', 'fr-switch');
    syncChk = document.createElement('input'); syncChk.type = 'checkbox'; syncChk.checked = false;
    l2.append(syncChk, _frEl('span', null, 'Also sync their own devices through my relay'));
    relayChk.onchange = () => { syncChk.disabled = !relayChk.checked; if (!relayChk.checked) syncChk.checked = false; };
    opts.append(l1, l2);
  }
  pane.appendChild(opts);
  const out = _frEl('div', 'fr-add-out');
  const go = _frBtn('Make an invite link', { icon: 'link', kind: 'btn-primary', run: (e, b) => _frDo(b, async () => {
    const scopes = relayChk && relayChk.checked ? (syncChk && syncChk.checked ? ['message', 'sync'] : ['message']) : null;
    const r = await _frApi('/api/friends/invite', { ttlDays: Number(ttl.value), relayScopes: scopes });
    out.textContent = '';
    _frInviteOut(out, r, d);
    friendsLoad(true).catch(() => {});
    return r;
  }) });
  pane.appendChild(go);
  pane.appendChild(out);
  const open = (d.me && d.me.invites) || [];
  if (open.length) {
    const l = _frEl('div', 'fr-add-open');
    l.appendChild(_frEl('span', 'muted fr-small', `${open.length} open invite${open.length === 1 ? '' : 's'}`));
    for (const inv of open.slice(0, 5)) {
      const row = _frEl('div', 'fr-row');
      row.appendChild(_frEl('span', 'fr-row-t', `Made ${_frAgo(inv.at)}, expires ${_frDate(inv.exp)}`));
      row.appendChild(_frBtn('Cancel', { sm: true, kind: 'btn-ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/invite/cancel', { id: inv.id }); row.remove(); await friendsLoad(true); }, 'Invite cancelled') }));
      l.appendChild(row);
    }
    pane.appendChild(l);
  }
}
/**
 * A new invite: its QR code (short links fit the app's QR encoder, 58-settings-sync-qr.js), the link
 * with Copy, and a ready-to-send message. A long link (a relay from before short links) has no QR code.
 */
function _frInviteOut(out, r, d) {
  const link = String(r.link || r.text || '');
  const message = String(r.message || `Join me on OpenDash: ${link}`);
  const wrap = _frEl('div', 'fr-invite-out');
  wrap.style.cssText = 'display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap';
  if (r.short && typeof syncQrSvg === 'function') {
    try {
      const q = _frEl('div', 'fr-qr');
      q.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;flex:0 0 auto';
      const svg = syncQrSvg(link, 168);
      svg.setAttribute('aria-label', 'QR code of your invite link');
      svg.style.borderRadius = '8px';
      q.appendChild(svg);
      q.appendChild(_frEl('span', 'muted fr-small', 'Scan with a phone camera'));
      wrap.appendChild(q);
    } catch (e) { /* too long for a QR code here: the link and the message still work */ }
  }
  const side = _frEl('div', 'fr-invite-side');
  side.style.cssText = 'flex:1 1 240px;min-width:0;display:flex;flex-direction:column;gap:8px';
  const ta = document.createElement('textarea');
  ta.className = 'input fr-invite-text'; ta.readOnly = true; ta.rows = r.short ? 2 : 3; ta.value = link;
  ta.setAttribute('aria-label', 'Invite link');
  ta.onfocus = () => ta.select();
  side.appendChild(ta);
  const a = _frEl('div', 'fr-add-acts');
  a.appendChild(_frBtn('Copy link', { icon: 'copy', kind: 'btn-primary', run: () => _frCopy(link, 'Invite link') }));
  a.appendChild(_frBtn('Copy message', { icon: 'message-circle', run: () => _frCopy(message, 'Message') }));
  if (navigator.share) a.appendChild(_frBtn('Share', { icon: 'send', run: () => navigator.share({ title: 'Join me on OpenDash', text: message }).catch(() => {}) }));
  side.appendChild(a);
  const msg = _frEl('div', 'fr-invite-msg');
  msg.appendChild(_frEl('span', 'overline', 'Ready to send'));
  const mp = _frEl('p', 'fr-small', message);
  mp.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0 0';
  msg.appendChild(mp);
  side.appendChild(msg);
  wrap.appendChild(side);
  out.appendChild(wrap);
  if (!r.short) {
    const owner = d && d.relay && d.relay.home && d.relay.home.role === 'owner';
    out.appendChild(_frEl('p', 'muted fr-small', r.shortWhy === 'old-relay'
      ? (owner ? 'Your relay is from an older OpenDash, so this link is long and has no QR code. It works the same. For short links, update your relay: Settings > Your relay > Connect Cloudflare (it keeps the same address).'
        : 'The relay you use is from an older OpenDash, so this link is long and has no QR code. It works the same.')
      : "The short link couldn't be made just now, so this is the long one. It works the same."));
  }
  const c = _frEl('div', 'fr-add-acts');
  c.appendChild(_frBtn('Cancel this invite', { kind: 'btn-ghost', sm: true, run: (ev, bb) => _frDo(bb, async () => { await _frApi('/api/friends/invite/cancel', { id: r.id }); out.textContent = ''; await friendsLoad(true); }, 'Invite cancelled: the link no longer works') }));
  out.appendChild(c);
  out.appendChild(_frEl('p', 'muted fr-small', `Single use. Expires ${_frDate(r.exp)}.${r.relayScopes && r.relayScopes.length ? ' It also lets them use your relay.' : ''} You approve them after comparing a code, so a forwarded link alone is not enough.`));
}
function _frAddCode(pane, d, close) {
  if (!d || !d.relay || !d.relay.home) { _frNeedRelay(pane, close); return; }
  const mine = _frEl('div', 'fr-mycode');
  mine.appendChild(_frEl('span', 'overline', 'Your friend code'));
  if (d.me.code) {
    const c = _frEl('div', 'fr-mycode-c');
    c.appendChild(_frEl('b', 'num', d.me.code));
    c.appendChild(_frBtn('Copy', { icon: 'copy', sm: true, run: () => _frCopy(d.me.code, 'Your friend code') }));
    c.appendChild(_frBtn('New code', { icon: 'refresh-cw', sm: true, kind: 'btn-ghost', tip: 'Your old code stops working at once', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/code/rotate', {}); await friendsLoad(true); pane.textContent = ''; _frAddCode(pane, _fr.data, close); }, 'New code made: the old one no longer works') }));
    mine.appendChild(c);
  } else {
    mine.appendChild(_frBtn('Make my friend code', { icon: 'key-round', kind: 'btn-primary', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/code/rotate', {}); await friendsLoad(true); pane.textContent = ''; _frAddCode(pane, _fr.data, close); }) }));
  }
  mine.appendChild(_frEl('p', 'muted fr-small', `Friend codes work between people on the same relay (${d.relay.home.host}). For anyone else, send an invite link.`));
  pane.appendChild(mine);
  const theirs = _frEl('div', 'fr-theircode');
  const lab = _frEl('label', 'fr-set-l', 'Their code');
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'input fr-code-in num'; inp.placeholder = 'NAME-7K2QX9'; inp.maxLength = 20; inp.autocomplete = 'off'; inp.spellcheck = false;
  lab.appendChild(inp);
  theirs.appendChild(lab);
  const acts = _frEl('div', 'fr-add-acts');
  let ctl = null;
  const stop = _frBtn('Cancel', { sm: true, kind: 'btn-ghost', run: () => { if (ctl) ctl.abort(); } });
  stop.hidden = true;
  const add = _frBtn('Send request', { icon: 'user-plus', kind: 'btn-primary', run: (e, b) => {
    if (!inp.value.trim()) { inp.focus(); return; }
    ctl = new AbortController(); stop.hidden = false;
    _frDo(b, async () => {
      const r = await _frApi('/api/friends/add', { code: inp.value }, { signal: ctl.signal });
      close(); await friendsLoad(true); _frRepaint();
      return r;
    }, (r) => `Request sent to ${r && r.friend ? friendName(r.friend) : 'them'}. You'll both see a check code.`).finally(() => { stop.hidden = true; ctl = null; });
  } });
  inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add.click(); } };
  acts.append(add, stop);
  theirs.appendChild(acts);
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
  const stop = _frBtn('Cancel', { sm: true, kind: 'btn-ghost', run: () => { if (ctl) ctl.abort(); } });
  stop.hidden = true;
  const go = _frBtn('Use this invite', { icon: 'user-plus', kind: 'btn-primary', run: (e, b) => {
    if (!ta.value.trim()) { ta.focus(); return; }
    ctl = new AbortController(); stop.hidden = false;
    _frDo(b, async () => {
      const r = await _frApi('/api/friends/add', { invite: ta.value.trim() }, { signal: ctl.signal });
      close(); await friendsLoad(true); _frRepaint();
      return r;
    }, (r) => `Request sent to ${r && r.friend ? friendName(r.friend) : 'them'}. Tell them the check code when it shows.`).finally(() => { stop.hidden = true; ctl = null; });
  } });
  acts.append(go, stop);
  pane.appendChild(acts);
  pane.appendChild(_frEl('p', 'muted fr-small', 'Nothing is shared until they approve you, after you both see the same short code.'));
  setTimeout(() => ta.focus(), 30);
}

/* ---------- key renewals (docs/dev/FRIENDS.md section 15) ---------- */
/** Friends whose renewal needs you: two different renewals came (paused), or they ask to keep using your relay. */
function _frAttentionSec(list) {
  const sec = _frSec('Needs a look', 'triangle-alert');
  for (const f of list) {
    const el = _frEl('div', 'card fr-pend');
    el.appendChild(_frAvatarWrap(f, 44, { presence: false }));
    const body = _frEl('div', 'fr-pend-b'), acts = _frEl('div', 'fr-pend-a');
    const name = friendName(f);
    if (f.status === 'frozen') {
      body.appendChild(_frEl('b', null, `Check with ${name}: their keys were renewed twice`));
      body.appendChild(_frEl('span', 'muted fr-small', `Two different "new keys" messages came for ${name}, so one of them may not be from ${name}. This friendship is paused: nothing is sent or accepted. Ask ${name} for a fresh invite (in person or on a call), then remove this one.`));
      acts.appendChild(_frBtn('Remove', { sm: true, icon: 'user-minus', run: () => _frRemove(f, false) }));
    } else {
      body.appendChild(_frEl('b', null, `${name} renewed their keys: let them keep using your relay?`));
      body.appendChild(_frEl('span', 'muted fr-small', `${name} uses your relay. Their new keys get the same access, and their old keys are taken off it once they have moved.`));
      acts.appendChild(_frBtn('Let them keep using it', { icon: 'check', kind: 'btn-primary', sm: true, run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/relay-ask', { id: f.id }); await friendsLoad(true); _frRepaint(); }, `${name}'s new keys can use your relay`) }));
      acts.appendChild(_frBtn('Not now', { sm: true, kind: 'btn-ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/relay-ask', { id: f.id, allow: false }); await friendsLoad(true); _frRepaint(); }, `Left as it is. ${name}'s old keys keep working on your relay until you remove them in Settings > Your relay.`) }));
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
/** Your friend keys: renew them, or how a renewal is going. */
function _frKeysEl(d) {
  const box = _frEl('div', 'fr-keys');
  const r = d && d.me ? d.me.rotation : null;
  if (!d || !d.me || !d.me.id) { box.appendChild(_frEl('p', 'muted fr-small', "You haven't opened Friends yet, so there are no friend keys to renew.")); return box; }
  if (!r || (r.step === 'done' && Date.now() - (r.doneAt || 0) > 3 * 86400000)) {
    box.appendChild(_frEl('p', 'muted fr-small', 'They prove to your friends and your relay that it is really you, and every device you set up has a copy. If a device was lost, stolen or given away, renew them: it can then no longer act as you.'));
    box.appendChild(_frBtn('Renew my keys…', { sm: true, icon: 'key-round', run: () => friendsRenewKeysDialog() }));
    return box;
  }
  const n = r.friends || 0;
  const progress = n ? `${r.moved} of ${n} friend${n === 1 ? ' has' : 's have'} moved you to your new keys${r.moved < n ? '; the rest follow when their OpenDash is next online' : ''}.` : '';
  if (r.step === 'done') box.appendChild(_frLine('check', `Your keys were renewed ${_frAgo(r.doneAt || r.at)}. ${progress}`.trim()));
  else if (r.waiting === 'relay-update') { box.appendChild(_frLine('key-round', `New keys made. ${progress}`.trim())); box.appendChild(_frRelayRotateEl()); }
  else if (r.waiting === 'relay-owner') box.appendChild(_frLine('hourglass', `New keys made. ${progress} Waiting for the owner of ${r.relayHost || 'your relay'} to let your new keys in; until then your old keys still work there.`.replace(/\s+/g, ' ')));
  else if (r.waiting === 'friends') box.appendChild(_frLine('hourglass', `New keys made. ${progress}`.trim()));
  else box.appendChild(_frLine('loader-circle', 'Renewing your keys and telling your friends…'));
  if (r.error) {
    box.appendChild(_frLine('triangle-alert', `Waiting: ${r.error}`, 'fr-err'));
    box.appendChild(_frBtn('Try again', { sm: true, icon: 'refresh-cw', run: (e, b) => _frDo(b, async () => { await _frApi('/api/friends/rotate', {}); await friendsLoad(true); _frRepaint(); }) }));
  }
  if (r.failed) box.appendChild(_frEl('p', 'muted fr-small', `${r.failed} friend${r.failed === 1 ? '' : 's'} could not be told (their relay refused). They can add you again with a fresh invite.`));
  if (r.cancelled && r.step !== 'done') box.appendChild(_frEl('p', 'muted fr-small', `${r.cancelled} request${r.cancelled === 1 ? '' : 's'} still in progress stopped, and open invite links no longer work: send new ones.`));
  return box;
}
/** Your own relay after a renewal: it trusts the old keys until it is deployed again (server/routes/relay-rotate.mjs). */
const _frRot = { st: null, at: 0, t: 0 };
function _frRelayRotateEl() {
  const el = _frEl('div', 'fr-relay-rot');
  let poll = null;
  const paint = () => {
    el.textContent = '';
    const s = _frRot.st || { state: 'idle' };
    if (s.state === 'running') {
      el.appendChild(_frLine('loader-circle', 'Updating your relay on Cloudflare so it trusts only your new keys…'));
      el.appendChild(_frBtn('Cancel', { sm: true, kind: 'btn-ghost', run: (e, b) => _frDo(b, async () => { await _frApi('/api/relay/cancel', {}); await poll(); }, 'Stopped. Your relay still trusts your old keys: update it when you can.') }));
      return;
    }
    if (s.state === 'error' && s.error) el.appendChild(_frLine('triangle-alert', `${s.error.message} ${s.error.next || ''}`.trim(), 'fr-err'));
    el.appendChild(_frEl('p', 'muted fr-small', s.state === 'elsewhere'
      ? 'Your relay still trusts your old keys. It was set up from another computer: update it from there, or here (Cloudflare may ask you to sign in).'
      : 'Your relay still trusts your old keys until it is updated on Cloudflare (same address; Cloudflare may ask you to sign in).'));
    el.appendChild(_frBtn(s.state === 'error' ? 'Try again' : 'Update my relay', { sm: true, icon: s.state === 'error' ? 'refresh-cw' : 'cloud', kind: 'btn-primary', run: (e, b) => _frDo(b, async () => { _frRot.st = await _frApi('/api/relay/rotate', {}); paint(); poll(); }) }));
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
 * Renew your friend keys (FRIENDS.md section 15). o.device: the name of a device just removed from
 * sync ("Remove this device and lock it out"). Says plainly what it does and what it can't.
 */
function friendsRenewKeysDialog(o) {
  o = o || {};
  const d = _fr.data;
  if (!d || !d.me || !d.me.id) { toast("You haven't opened Friends yet, so there are no friend keys to renew.", { icon: 'key-round' }); return; }
  const home = d.relay && d.relay.home;
  const friends = (d.friends || []).filter(f => f.status === 'friend').length;
  const pending = (d.friends || []).filter(f => f.status === 'incoming' || f.status === 'requested').length + ((d.me.invites || []).length);
  openDialog({
    title: o.device ? 'Lock the removed device out' : 'Renew your friend keys', width: 540, resizeKey: 'fr-renew',
    body(el, close) {
      el.classList.add('fr-renew');
      el.appendChild(_frEl('p', null, o.device
        ? `"${o.device}" no longer gets your sync changes, but it still holds your friend keys: it could still message your friends as you and use your relay. Renewing your keys stops that.`
        : 'Your friend keys prove to your friends and your relay that it is really you, and every device you set up has a copy. Renew them if a device was lost, stolen or given away.'));
      const ul = _frEl('ul', 'fr-renew-list');
      const li = (t) => ul.appendChild(_frEl('li', null, t));
      li('New keys are made on this computer. Your other devices get them through sync; a device you removed from sync does not.');
      if (friends) li(`Each friend's OpenDash moves you to the new keys by itself (${friends} friend${friends === 1 ? '' : 's'}). Your friendships, history and what you share stay as they are.`);
      if (pending) li('Requests still in progress and open invite links stop working: send new ones afterwards.');
      if (d.me.code) li('Your friend code changes.');
      if (home && home.role === 'owner') li('Your relay is put on Cloudflare again so it trusts only the new keys (same address; Cloudflare may ask you to sign in).');
      else if (home) li(`${home.host} belongs to a friend: they get a button to let your new keys in. Until they press it, your old keys still work there.`);
      el.appendChild(ul);
      el.appendChild(_frEl('p', 'muted fr-small', "What it can't do: if someone who has your old keys renews them first, friends who hear from them first could be fooled. A friend's OpenDash pauses the friendship when two different renewals arrive; if a friend tells you that, send them a fresh invite."));
      const acts = _frEl('div', 'fr-add-acts');
      let ctl = null;
      const stop = _frBtn('Stop waiting', { sm: true, kind: 'btn-ghost', run: () => { if (ctl) ctl.abort(); } });
      stop.hidden = true;
      const go = _frBtn('Renew my keys', { icon: 'key-round', kind: 'btn-primary', run: (e, b) => {
        ctl = new AbortController(); stop.hidden = false;
        const sig = ctl.signal;
        _frDo(b, async () => {
          const r = await _frApi('/api/friends/rotate', {}, { signal: sig });
          close(); await friendsLoad(true); _frRepaint();
          return r;
        }, 'New keys made. Your friends are being told now: Friends shows how it goes.').then((r) => {
          if (r === null && sig.aborted) toast('Stopped waiting. If the renewal goes on, Friends shows it.', { icon: 'key-round' });
        }).finally(() => { stop.hidden = true; ctl = null; });
      } });
      acts.append(go, _frBtn('Not now', { kind: 'btn-ghost', run: () => close() }), stop);
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
  toast('Was it lost or stolen? It still holds your friend keys. Renew them to lock it out.', { icon: 'key-round', timeout: 15000, action: { label: 'Lock it out', run: () => friendsRenewKeysDialog({ device: deviceName || 'That device' }) } });
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
    if (r && url === '/api/sync/devices/remove') friendsLoad(true).then(() => friendsOfferLockOut(name)).catch(() => {});
    return r;
  };
})();
// Settings > Friends: your keys, and the way to the Friends tab.
registerSettingsGroup({
  id: 'friends', title: 'Friends', icon: 'users', order: 91.6,
  description: 'Your friend keys: renew them if a device was lost or stolen. Everything else lives in the Friends tab.',
  render(el) {
    const box = _frEl('div');
    const paint = () => {
      box.textContent = '';
      const d = _fr.data;
      box.appendChild(_settingsRow('Your friend keys', 'They prove to your friends and your relay that it is really you.', _frKeysEl(d)));
      box.appendChild(_settingsRow('Friends', d && d.counts ? `${d.counts.friends || 0} friend${d.counts.friends === 1 ? '' : 's'}` : 'Your hangout, invites and privacy.', _frBtn('Open Friends', { sm: true, icon: 'users', run: () => setView('friends') })));
    };
    el.appendChild(box);
    paint();
    friendsLoad(false).then(() => { if (box.isConnected) paint(); }).catch(() => { if (box.isConnected) { box.textContent = ''; box.appendChild(_frEl('p', 'muted', 'Friends could not load just now. Check that OpenDash is running, then open this page again.')); } });
  },
});
