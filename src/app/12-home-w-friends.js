/* ============================================================
   HOME WIDGET: Friends around (2.18, docs/dev/NAVIGATION_PLAN.md 2.3). One of
   Home's small cards that link into Life (with Your garden and Quests and
   streaks). Status first: friend requests waiting, else who is around now.
   One action. Hidden while you have no friends and no requests; starts hidden
   on every board (Add widget, or What's new › Add the Life cards to Home).
   Its title opens Life › Friends (page: 'friends'). Names from friends are set
   as text only (never markup).
   ============================================================ */
const _hwfrState = { loading: false };
registerHomeWidget({
  id: 'friends', title: 'Friends around', icon: 'users', group: 'people', sizes: ['s', 'm'], defaultSize: 's',
  order: 272, defaultHidden: true, page: 'friends',
  description: 'Who is around now, and friend requests waiting',
  aliases: ['friends', 'friends around', 'who is around', 'online', 'requests'],
  emptyHint: 'shows once you have a friend',
  available() { return typeof friendsLoad === 'function'; },
  render(el, ctx) { return _hwfrRender(el, ctx || {}); },
  refreshKey() { const s = _hwfrNow(); return s ? [s.requests, s.around.map(f => f.id + ':' + f.presence).join(','), s.friends].join('|') : ''; },
});
function _hwfrNow() {
  const d = typeof _fr !== 'undefined' && _fr ? _fr.data : null;
  if (!d) return null;
  const all = Array.isArray(d.friends) ? d.friends : [];
  const friends = all.filter(f => f && f.status === 'friend');
  const rank = (f) => (typeof _frPresRank === 'function' ? _frPresRank(f) : 0);
  const around = friends.filter(f => f.presence && f.presence !== 'offline').sort((a, b) => rank(a) - rank(b));
  return { friends: friends.length, requests: all.filter(f => f && f.status === 'incoming').length, around };
}
function _hwfrRender(el, ctx) {
  const card = document.createElement('div'); card.className = 'card home-card hwfr';
  const head = document.createElement('div'); head.className = 'card-h';
  head.innerHTML = icon('users');
  const h3 = document.createElement('h3'); h3.textContent = 'Friends around'; head.appendChild(h3);
  card.appendChild(head);
  const body = document.createElement('div'); body.className = 'card-b hwfr-b';
  card.appendChild(body);
  if (ctx.preview) {   // the Add widget gallery: a sample, nothing fetched
    const row = document.createElement('div'); row.className = 'hwfr-avs';
    for (let i = 0; i < 3; i++) { const a = document.createElement('span'); a.className = 'hwfr-av-sample'; row.appendChild(a); }
    body.append(Object.assign(document.createElement('b'), { className: 'hwfr-n', textContent: '3 around now' }), row);
    el.appendChild(card); return true;
  }
  const s = _hwfrNow();
  if (!s) {
    if (!_hwfrState.loading && typeof friendsLoad === 'function') {
      _hwfrState.loading = true;
      friendsLoad(false).catch(() => null).then(() => { _hwfrState.loading = false; if (state.view === 'home' && typeof homeRerenderWidget === 'function' && _hwfrNow()) homeRerenderWidget(ctx.id || 'friends'); });
    }
    return false;   // nothing to say yet: the card stays out of the way
  }
  if (!s.friends && !s.requests) return false;
  const big = document.createElement('b'); big.className = 'hwfr-n';
  const line = document.createElement('span'); line.className = 'muted hwfr-s';
  if (s.requests) {
    big.textContent = s.requests === 1 ? 'A friend request' : `${s.requests} friend requests`;
    line.textContent = 'Waiting for you to say yes.';
  } else if (s.around.length) {
    big.textContent = `${s.around.length} around now`;
    line.textContent = s.around.slice(0, 2).map(f => (typeof friendName === 'function' ? friendName(f) : 'A friend')).join(' and ') + (s.around.length > 2 ? ` and ${s.around.length - 2} more` : '');
  } else {
    big.textContent = 'No one around';
    line.textContent = `${s.friends} friend${s.friends === 1 ? '' : 's'}, all quiet for now.`;
  }
  body.append(big, line);
  if (s.around.length && !s.requests) {
    const row = document.createElement('div'); row.className = 'hwfr-avs';
    for (const f of s.around.slice(0, ctx.size === 'm' ? 7 : 4)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'hwfr-av';
      const name = typeof friendName === 'function' ? friendName(f) : 'Your friend';
      b.setAttribute('aria-label', `${name}: open their page`); b.setAttribute('data-tip', name);
      b.appendChild(typeof _frAvatarWrap === 'function' ? _frAvatarWrap(f, 28) : document.createTextNode(name.slice(0, 1)));
      b.onclick = () => setView('friends:' + f.id);
      row.appendChild(b);
    }
    body.appendChild(row);
  }
  const act = document.createElement('button'); act.type = 'button'; act.className = 'btn btn-secondary btn-sm hwfr-act';
  act.innerHTML = icon(s.requests ? 'user-check' : 'users', 'i-sm') + `<span>${s.requests ? 'See requests' : 'Say hello'}</span>`;
  act.onclick = () => setView('friends');
  body.appendChild(act);
  el.appendChild(card);
  return true;
}
