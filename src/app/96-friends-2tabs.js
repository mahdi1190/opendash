/* ============================================================
   FRIENDS 2.19: the page as five tabs (lean UI; owner: Friends).
   The hangout used to be one long stack (a big header, everyone's bubbles, the relay, requests, a grid of
   cards, panels from other modules, the feed and the settings) and a friend's page another one. Now:

     Friends   #view=friends | friends:<id>   a list of friends (masterDetail) and the one you picked:
                                              who they are, what you can do, activity, their game, what they share
     Feed      #view=friends:feed             what everyone is up to (paged), with the week's recap and gifts beside it
     Requests  #view=friends:requests         people waiting for you, requests you sent, things that need a look
     Shared    #view=friends:shared           shared spaces (Together), friends' gardens and pets
     Settings  #view=friends:settings         your card, name, online status, relay, who you blocked

   2.19.3 adds Shared with me (#view=friends:data[:<id>], 96-friends-3data.js): browse what friends share with you, read-only.
   The tabs are the page header's pills (subTabs / headerSubTabs, 11-ui-kit.js). Other modules put their
   panels where they belong with Friends.registerPanel({..., tab, zone}) (96-friends-0core.js).
   Friend strings are set with textContent only (the owner's rule).
   ============================================================ */
const _FR_TABS = Object.freeze([['friends', 'Friends', 'users'], ['groups', 'Groups', 'building-2'], ['data', 'Shared with me', 'folder-open'], ['feed', 'Feed', 'newspaper'], ['requests', 'Requests', 'user-check'], ['shared', 'Shared', 'handshake'], ['settings', 'Settings', 'settings']]);
const _FR_FEED_PAGE = 10, _FR_FEED_FETCH = 40;
_frUI.sel = ''; _frUI.listTop = 0; _frUI.feedC = new Map(); _frUI.folds = new Set(); _frUI.tab = '';
function _frTabOf(view) { if (/^friends:groups(:|$)/.test(String(view || ''))) return 'groups'; const m = /^friends:(feed|requests|shared|settings|data)(?::[0-9a-f]{16})?$/.exec(String(view || '')); return m ? m[1] : 'friends'; }
function _frViewOfTab(tab) { return tab === 'friends' ? 'friends' : 'friends:' + tab; }
/** Requests that wait for you, and friends that need a look (the Requests tab's badge and the Friends tab's one line). */
function _frNeedsYou(d) {
  return ((d && d.friends) || []).filter(f => f.status === 'incoming' || (f.status === 'requested' && f.step === 'check') || f.status === 'frozen' || f.relayAsk);
}
function _frSubTabs(tab, d) {
  const inv = typeof tgOn === 'function' && tgOn() && typeof tgInvites === 'function' ? tgInvites().length : 0;
  const need = _frNeedsYou(d).length;
  return subTabs({
    label: 'Friends', active: tab, onChange: (id) => setView(_frViewOfTab(id)),
    tabs: _FR_TABS.map(([id, label, ic]) => ({ id, label, icon: ic, badge: id === 'requests' ? need : id === 'shared' ? inv : id === 'groups' && typeof grWaiting === 'function' ? grWaiting() : 0 })),
  });
}
/** Paint the open tab (called by _frRender, 96-friends-1ui.js). */
function _frRenderTabs(root, view) {
  const d = _fr.data;
  const tab = _frTabOf(view);
  _frUI.tab = tab;
  headerSubTabs(_frSubTabs(tab, d), /^friends(:|$)/);
  const sub = document.getElementById('view-subtitle');
  if (sub) sub.textContent = '';
  ({ friends: _frTabFriends, groups: _frTabGroups, data: _frTabData, feed: _frTabFeed, requests: _frTabRequests, shared: _frTabShared, settings: _frTabSettings })[tab](root, view, d);
}

/* ---------- panels other modules registered ---------- */
/** One panel as a section, or null when it has nothing to show. */
function _frPanelSec(p, arg) {
  const sec = _frSec(p.title || '', p.icon || 'sparkles');
  try { return p.render(sec, arg) !== false ? sec : null; } catch (e) { console.error('[friends] panel ' + p.id, e); return null; }
}
/** where 'hangout': key = the tab (default 'feed'); where 'friend': key = the zone ('main' | 'side' | 'fold', default 'side'). */
function _frPanelsFor(host, where, key, arg) {
  for (const p of _fr.panels) {
    if (p.where !== where) continue;
    const at = where === 'hangout' ? (p.tab || 'feed') : (p.zone || 'side');
    if (at !== key) continue;
    const sec = _frPanelSec(p, arg);
    if (!sec) continue;
    if (key === 'fold') {
      // a quiet panel under a fold (its title is the summary), open again after a repaint if it was open
      const det = _frEl('details', 'fr-fold');
      const open = _frUI.folds.has(p.id + '|' + (arg && arg.id || ''));
      det.open = open;
      det.ontoggle = () => { const k = p.id + '|' + (arg && arg.id || ''); if (det.open) _frUI.folds.add(k); else _frUI.folds.delete(k); };
      const sum = _frEl('summary', 'fr-fold-h');
      sum.innerHTML = icon(p.icon || 'sparkles', 'i-sm');
      sum.appendChild(_frEl('span', null, p.title || ''));
      const h = sec.querySelector(':scope > .sec-h'); if (h) h.remove();
      det.append(sum, sec);
      host.appendChild(det);
    } else host.appendChild(sec);
  }
}

/* ---------- Friends: a list and the one you picked ---------- */
function _frNeedsLine(list) {
  const el = _frEl('div', 'fr-need');
  el.innerHTML = icon('bell', 'i-sm');
  const f = list[0], n = friendName(f);
  const t = list.length > 1 ? `${list.length} things are waiting for you` : f.status === 'incoming' ? `${n} wants to connect` : f.status === 'requested' ? `Check the code with ${n}` : `${n} needs a look`;
  el.appendChild(_frEl('span', null, t));
  el.appendChild(uiButton({ label: 'Review', kind: 'link', run: () => setView('friends:requests') }));
  return el;
}
function _frRowSub(f) {
  const pr = _FR_PRES[f.presence] || _FR_PRES.offline;
  const lv = f.game && f.game.level ? ` · Level ${f.game.level}` : '';
  return pr[0] + lv;
}
function _frTabFriends(root, view, d) {
  const all = d.friends || [];
  const friends = all.filter(f => f.status === 'friend').sort((a, b) => _frPresRank(a) - _frPresRank(b) || (b.lastAt || 0) - (a.lastAt || 0) || friendName(a).localeCompare(friendName(b)));
  const need = _frNeedsYou(d);
  if (need.length) root.appendChild(_frNeedsLine(need));
  _frPanelsFor(root, 'hangout', 'friends', d);
  const id = _frIdOf(view);
  if (id) {
    // a link to a friend that is not a friend (yet, or any more)
    const g = friendsGet(id);
    if (!g || g.status === 'removing' || g.status === 'blocked') {
      mountEmptyState(root, { icon: 'user-x', title: "This friend isn't here any more", text: 'They may have been removed on one of your computers.',
        actions: [{ label: 'All friends', icon: 'arrow-left', run: () => setView('friends') }] });
      return;
    }
    if (g.status !== 'friend') { root.appendChild(_frPendCard(g)); return; }
  }
  if (!friends.length) {
    if (!d.relay || !d.relay.home) { root.appendChild(_frNoRelay(d)); return; }
    mountEmptyState(root, { icon: 'users', compact: true, title: 'Bring your people', text: 'Send someone an invite link, or show them your 4-letter friend code. You can cheer each other on and do quests together.',
      actions: [{ label: 'Add a friend', icon: 'user-plus', primary: true, run: () => friendsAddDialog() }] });
    return;
  }
  const f = friends.find(x => x.id === id) || friends.find(x => x.id === _frUI.sel) || friends[0];
  _frUI.sel = f.id;
  const md = masterDetail({
    label: 'Your friends', listWidth: 256,
    list: (host) => {
      for (const x of friends) {
        const fx = typeof funFor === 'function' && typeof funOn === 'function' && funOn() ? funFor(x.id) : null;
        const costume = typeof funFriendInCostume === 'function' && fx && funFriendInCostume(x) ? ' 🧙' : '';
        const row = mdRow({ pickable: true, avatar: _frAvatarWrap(x, 30), title: friendName(x) + costume, sub: _frRowSub(x), badge: fx && fx.gifts ? '🎁' + (fx.gifts > 1 ? fx.gifts : '') : '', active: x.id === f.id, tip: `${friendName(x)}'s page`, run: () => { if (x.id !== f.id) setView('friends:' + x.id); } });
        row.dataset.pickId = x.id;
        host.appendChild(row);
      }
    },
    detail: () => _frFriendDetail(f),
  });
  root.appendChild(md);
  // Several at once: a cheer each. It goes out at once, so there is nothing to undo (11-ui-pick.js).
  if (friends.length > 1) {
    const tools = document.createElement('div'); tools.className = 'pk-list-tools';
    const pick = multiPick(md.mdList, { key: 'friends', rows: '.md-row', noun: ['friend', 'friends'],
      nameOf: (r) => (r.querySelector('.md-row-n') || {}).textContent || '',
      exists: (id) => friends.some(x => x.id === id),
      actions: () => [{ label: 'Send a cheer', icon: 'heart', run: async (ids) => {
        let ok = 0, err = null;
        for (const id of ids) { try { await friendsCheer(id); ok++; } catch (e) { err = e; } }
        if (ok) toast(`Cheered ${ok} friend${ok === 1 ? '' : 's'}`, { kind: 'ok', icon: 'heart' });
        if (err) { toastError(ok ? 'cheer everyone' : 'send the cheers', err); return false; }
      } }] });
    tools.appendChild(pick.button());
    md.mdList.insertBefore(tools, md.mdList.firstChild);
  }
  md.mdList.scrollTop = _frUI.listTop || 0;
  md.mdList.addEventListener('scroll', () => { _frUI.listTop = md.mdList.scrollTop; }, { passive: true });
  const on = md.mdList.querySelector('.md-row.on');
  if (on && on.offsetTop + on.offsetHeight > md.mdList.clientHeight + md.mdList.scrollTop) md.mdList.scrollTop = Math.max(0, on.offsetTop - 60);
}
/** The picked friend: who they are and what you can do at the top, then activity beside what they share. */
function _frFriendDetail(f) {
  const wrap = _frEl('div', 'fr-detail');
  wrap.appendChild(_frFriendHero(f));
  const det = _frDetail(f.id);
  const main = _frEl('div', 'fr-stack'), side = _frEl('div', 'fr-stack');
  _frPanelsFor(main, 'friend', 'main', f);
  main.appendChild(_frFeedSec(f.id));
  _frPanelsFor(main, 'friend', 'fold', f);
  const about = _frFriendAbout(f, det);   // their game and what they share, ONE block (and none when there is nothing to say)
  if (about) side.appendChild(about);
  _frPanelsFor(side, 'friend', 'side', f);
  wrap.appendChild(pageLayout({ main, side: side.childNodes.length ? side : null, sideWidth: 280, cls: 'fr-dlayout' }));
  return wrap;
}
function _frFriendMore(f) {
  const items = [];
  if (typeof tgPickTaskToShare === 'function') items.push({ label: `Share a task with ${friendName(f)}`, icon: 'user-plus', run: () => tgPickTaskToShare(f.id) });
  if (typeof tgNewSpaceDialog === 'function') items.push({ label: `Start a shared list with ${friendName(f)}`, icon: 'list-plus', run: () => tgNewSpaceDialog({ kind: 'list', members: [f.id] }) });
  if (items.length) items.push('sep');
  items.push({ label: 'Remove friend', icon: 'user-minus', run: () => _frRemove(f, false) }, { label: 'Block', icon: 'lock', danger: true, run: () => _frRemove(f, true) });
  return items;
}
function _frFriendHero(f) {
  const el = _frEl('section', 'fr-fhero');
  const fs = f.friendship || { level: 1, title: 'New friends', into: 0, need: 30, pct: 0, streak: 0, best: 0, milestone: {} };
  const avc = _frEl('div', 'fr-fhero-av');
  avc.appendChild(_frAvatarWrap(f, 64));
  { const fg = typeof friendsSceneFigureEl === 'function' ? friendsSceneFigureEl(f, 72) : null; if (fg) avc.appendChild(fg); }   // their full figure, when they share an avatar
  el.appendChild(avc);
  const t = _frEl('div', 'fr-fhero-t');
  t.appendChild(_frEl('h2', null, friendName(f)));
  const pr = _FR_PRES[f.presence] || _FR_PRES.offline;
  const line = _frEl('div', 'fr-fhero-l');
  const pl = _frEl('span', 'fr-pres');
  pl.setAttribute('data-fr-presence', f.id);
  pl.setAttribute('data-p', f.presence || 'offline');
  pl.appendChild(_frEl('span', 'fr-pres-dot'));
  pl.appendChild(_frEl('span', null, pr[0]));
  line.appendChild(pl);
  const days = fs.milestone && fs.milestone.days ? fs.milestone.days : 0;
  if (f.nick && f.name && f.nick !== f.name) line.appendChild(_frEl('span', 'muted', f.name));
  if (f.friendsAt) line.appendChild(_frEl('span', 'muted', `Friends since ${_frDate(f.friendsAt)}${days ? ` · ${days.toLocaleString()} day${days === 1 ? '' : 's'}` : ''}`));
  t.appendChild(line);
  const m = fs.milestone || {};
  if (m.today) {
    const b = _frEl('div', 'fr-milestone');
    b.innerHTML = icon('party-popper', 'i-sm');
    b.appendChild(_frEl('b', null, m.today.label));
    t.appendChild(b);
    const key = f.id + '|' + m.today.label;
    if (!_frUI.burstSeen.has(key)) { _frUI.burstSeen.add(key); setTimeout(() => _frBurst(b), 400); }
  } else if (m.next && m.next.inDays <= 7) {
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
  rt.appendChild(_frEl('b', null, fs.title));
  rt.appendChild(_frEl('span', 'muted fr-small num', `${fs.into} of ${fs.need} XP to level ${fs.level + 1}`));
  if (fs.streak) {   // a streak line only once there is one (nothing to say about an empty streak)
    const st = _frEl('span', 'fr-flame');
    st.innerHTML = icon('flame', 'i-xs');
    st.appendChild(_frEl('span', null, `${fs.streak} day${fs.streak === 1 ? '' : 's'} in touch`));
    rt.appendChild(st);
  }
  ring.appendChild(rt);
  el.appendChild(ring);
  // actions: Cheer first, the fun module adds Wave / High five / Gift before More (funFriendHero), More last
  const acts = _frEl('div', 'fr-fhero-a');
  if (typeof fdOpen === 'function') acts.appendChild(uiButton({ label: 'View their data', icon: 'eye', kind: 'ghost', size: 'sm', tip: `What ${friendName(f)} shares with you: tasks, calendar, money, places, memories`, run: () => fdOpen(f.id) }));
  acts.appendChild(uiButton({ label: 'Cheer', icon: 'heart', size: 'sm', run: (e, b) => _frCheerMenu(b, f) }));
  if (typeof musicFriendAction === 'function') { try { const mb = musicFriendAction(f); if (mb) acts.appendChild(mb); } catch (e) { console.error('[friends] music action', e); } }   // 2.26: Send a song
  acts.appendChild(uiButton({ icon: 'ellipsis', kind: 'ghost', size: 'sm', aria: 'More', tip: 'More', run: (e, b) => openMenu(b, _frFriendMore(f), { align: 'end' }) }));
  el.appendChild(acts);
  if (typeof funFriendHero === 'function') { try { funFriendHero(el, f); } catch (e) { console.error('[friends] fun hero', e); } }   // agent 'fun': wave, high five, gift
  return el;
}

/* ---------- the activity feed (paged) ---------- */
/** One line of the feed. */
function _frFeedLine(e) {
  const f = e.f ? friendsGet(e.f) : (Array.isArray(e.to) && e.to.length ? friendsGet(e.to[0]) : null);
  const dsc = _frDescribe(e, f);
  const li = _frEl('li', 'fr-feed-i' + (dsc.tone ? ' is-' + dsc.tone : '') + (e.dir === 'in' ? ' is-in' : ' is-mine'));
  const av = f ? _frAvatarWrap(f, 28, { presence: false }) : _frEl('span', 'fr-feed-ic');
  if (!f) av.innerHTML = icon(dsc.icon || 'sparkles', 'i-sm');
  li.appendChild(av);
  const tx = _frEl('div', 'fr-feed-t');
  const ln = _frEl('span', 'fr-feed-l');
  const ic = _frEl('span', 'fr-feed-k');
  ic.innerHTML = icon(/^[a-z0-9-]{1,40}$/.test(dsc.icon || '') ? dsc.icon : 'sparkles', 'i-xs');
  ln.append(ic, _frEl('span', null, dsc.text));
  tx.appendChild(ln);
  tx.appendChild(_frEl('span', 'muted fr-small', _frAgo(e.at)));
  if (dsc.el && dsc.el.nodeType === 1) tx.appendChild(dsc.el);   // a describer's card (a postcard: 99s-friends-scenes-2postcards.js)
  li.appendChild(tx);
  if (f && e.dir === 'in' && (e.k === 'game:level' || e.k === 'game:streak' || (e.k === 'quest' && e.b && e.b.state === 'done') || (e.k === 'challenge' && e.b && e.b.state === 'win'))) {
    li.appendChild(uiButton({ icon: 'heart', size: 'sm', kind: 'ghost', cls: 'fr-cheer', tip: `Cheer ${friendName(f)}`, aria: `Cheer ${friendName(f)}`, run: (ev, b) => _frCheerMenu(b, f) }));
  }
  if (typeof funFeedItem === 'function') { try { funFeedItem(li, e, f); } catch (x) { console.error('[friends] fun feed', x); } }   // agent 'fun': reactions, Unwrap, Answer
  return li;
}
/** The feed of everyone (friendId null) or of one friend: ten lines, Show more, then older ones from the server. */
function _frFeedSec(friendId) {
  const sec = _frSec(friendId ? 'Activity' : "What's happening", 'sparkles');   // checking for news is in the header's More
  if (!friendId) { const h = sec.querySelector(':scope > .sec-h'); if (h) h.remove(); }   // the Feed tab already says Feed
  const key = friendId || '*';
  let c = _frUI.feedC.get(key);
  if (!c) { c = { entries: null, at: 0, shown: 0, busy: false }; _frUI.feedC.set(key, c); }
  let loaded = !!c.entries;
  const f = friendId ? friendsGet(friendId) : null;
  const pl = pagedList({
    tag: 'ul', cls: 'fr-feed-wrap', pageSize: _FR_FEED_PAGE, start: c.shown, onShown: (n) => { c.shown = n; },
    render: _frFeedLine,
    empty: (host) => {
      if (!loaded) { host.appendChild(emptyLine('Loading…')); return; }
      host.appendChild(f ? emptyLine('Nothing between you yet.')
        : emptyLine('Nothing yet. Cheers, level-ups, streaks and finished quests show up here.'));
    },
    loadMore: async () => {
      const last = c.entries && c.entries[c.entries.length - 1];
      const older = await Friends.feed({ friend: friendId || undefined, limit: 30, before: last ? last.lc : undefined });
      if (c.entries) c.entries = c.entries.concat(older);
      return older;
    },
    items: c.entries || [], hasMore: !c.entries || c.entries.length >= _FR_FEED_FETCH,
  });
  sec.appendChild(pl);
  const stale = !c.entries || Date.now() - c.at > 4000 || _fr.at > c.at;
  if (stale && !c.busy) {
    c.busy = true; c.at = Date.now();
    Friends.feed({ friend: friendId || undefined, limit: _FR_FEED_FETCH }).then((entries) => {
      const same = c.entries && c.entries.length >= entries.length && entries.every((x, i) => c.entries[i] && c.entries[i].id === x.id);
      loaded = true;
      if (!same) { c.entries = entries; if (pl.isConnected) pl.setItems(entries, { keep: true, hasMore: entries.length >= _FR_FEED_FETCH }); }
      else if (pl.isConnected && !pl.shown()) pl.setItems(c.entries, { keep: true });
    }).catch(() => {
      if (pl.isConnected && !c.entries) { loaded = true; pl.setItems([]); }
    }).finally(() => { c.busy = false; });
  }
  return sec;
}

/* ---------- Feed ---------- */
function _frTabFeed(root, view, d) {
  const side = _frEl('div', 'fr-stack');
  _frPanelsFor(side, 'hangout', 'feed', d);
  root.appendChild(pageLayout({ main: _frFeedSec(null), side: side.childNodes.length ? side : null, sideWidth: 320 }));
}

/* ---------- Requests ---------- */
function _frTabRequests(root, view, d) {
  const all = d.friends || [];
  root.appendChild(pageLayout({
    main: (host) => {
      const stack = _frEl('div', 'fr-stack');
      host.appendChild(stack);
      const attn = all.filter(f => f.status === 'frozen' || f.relayAsk);
      if (attn.length) stack.appendChild(_frAttentionSec(attn));
      const pend = all.filter(f => f.status === 'incoming' || f.status === 'requested').sort((a, b) => (a.status === 'incoming' ? 0 : 1) - (b.status === 'incoming' ? 0 : 1) || (b.addedAt - a.addedAt));
      if (pend.length) stack.appendChild(_frPendingSec(pend));
      const declined = all.filter(f => f.status === 'declined');
      if (declined.length) stack.appendChild(_frDeclinedSec(declined));
      if (!attn.length && !pend.length && !declined.length) {
        mountEmptyState(stack, { icon: 'user-check', compact: true, title: 'Nobody is waiting', text: 'Requests you send and requests from friends show here, with the pictures to compare.',
          actions: [{ label: 'Add a friend', icon: 'user-plus', primary: true, run: () => friendsAddDialog() }] });
      }
    },
  }));
}

/* ---------- Shared: spaces, gardens, pets ---------- */
function _frTabShared(root, view, d) {
  if (typeof tgSpacesPane === 'function' && typeof tgOn === 'function' && tgOn()) root.appendChild(tgSpacesPane({ embedded: true }));
  else root.appendChild(emptyLine('Shared lists and boards are not on this computer yet. Update Freeflo to use them.'));
  const rest = _frEl('div', 'fr-stack fr-shared-rest');
  _frPanelsFor(rest, 'hangout', 'shared', d);
  if (rest.childNodes.length) root.appendChild(rest);
}

/* ---------- Settings ---------- */
function _frTabSettings(root, view, d) {
  const stack = _frEl('div', 'fr-stack');
  const rot = d.me && d.me.rotation;
  if (rot && (rot.step !== 'done' || Date.now() - (rot.doneAt || 0) < 3 * 86400000)) { const s = _frSec('Locking out a lost computer', 'key-round'); s.appendChild(_frKeysEl(d)); stack.appendChild(s); }
  _frPanelsFor(stack, 'hangout', 'settings', d);
  stack.appendChild(_frSettingsSec(d, { open: true }));
  root.appendChild(pageLayout({ main: stack }));
}
