/* ============================================================
   FRIENDS > Groups (docs/dev/GROUPS.md). #view=friends:groups and #view=friends:groups:<id>.

     Start a group     Step 1 of 2: a name. Step 2 of 2: the link is ready, with a QR code, a message and a poster.
     Join a group      Step 1 of 2: paste a link or type a code. Step 2 of 2: its name and who runs it, then Join.
     A group's page    who is waiting, the noticeboard, everyone by name and picture, and what you can do with each.

   Words: group, link, code, people, run the group. Never relay, keys, members-of-space (the owner's rule, and
   docs/dev/UX_BLUEPRINT.md). Every string from another person is set with textContent only, never as markup,
   and no picture or address they send is ever loaded (FRIENDS.md rule 3).
   ============================================================ */
const _gr = { data: null, at: 0, loading: null, one: new Map(), oneAt: new Map(), search: new Map(), draft: new Map(), reloadT: 0, boot: '' };
const _GR_LOGOS = ['📚', '🏠', '🌱', '⚽', '🎵', '🎲', '🏢', '💼', '🔬', '🍳', '🚲', '⭐'];
const _GR_COLORS = ['#2f5d50', '#1c7ed6', '#ae3ec9', '#e8590c', '#d6336c', '#0c8599', '#5f3dc4', '#868e96'];
const _GR_ROLE = Object.freeze({ owner: ['Owner', 'crown'], admin: ['Helps run it', 'shield-check'], member: ['', ''] });

function grApi(path, body, opts) { return _frApi('/api/groups' + path, body, opts); }
function grLoad(force) {
  if (_gr.loading) return _gr.loading;
  if (!force && _gr.data && Date.now() - _gr.at < 15000) return Promise.resolve(_gr.data);
  _gr.loading = grApi('').then((d) => { _gr.data = d; _gr.at = Date.now(); return d; }).finally(() => { _gr.loading = null; });
  return _gr.loading;
}
function grOne(id, force) {
  if (!force && _gr.one.has(id) && Date.now() - (_gr.oneAt.get(id) || 0) < 3000) return Promise.resolve(_gr.one.get(id));
  return grApi('/one?id=' + encodeURIComponent(id)).then((d) => { _gr.one.set(id, d); _gr.oneAt.set(id, Date.now()); return d; });
}
/** How many people are waiting across my groups (the tab's badge). */
function grWaiting() { return ((_gr.data && _gr.data.groups) || []).reduce((n, g) => n + (g.waiting || 0), 0); }
function _grRepaint() {
  // Someone is typing in the group: news can wait a moment, what they typed can't be thrown away.
  const act = document.activeElement;
  if (act && act.matches && act.matches('.gr-detail textarea, .gr-detail input[type=text]') && act.value) { clearTimeout(_gr.reloadT); _gr.reloadT = setTimeout(_grRepaint, 4000); return; }
  _gr.oneAt.clear();
  if (/^friends:groups(:|$)/.test(String(state.view || '')) && typeof friendsPageRefresh === 'function') friendsPageRefresh();
  else if (/^friends(:|$)/.test(String(state.view || '')) && typeof headerSubTabs === 'function' && typeof _frSubTabs === 'function') { try { headerSubTabs(_frSubTabs(_frTabOf(state.view), _fr.data), /^friends(:|$)/); } catch (e) { /* the page repaints soon */ } }
}
/** The server says something changed. */
function grOnEvent(d) {
  if (d && d.note === 'in' && typeof d.name === 'string') toast(`You're in ${d.name}`, { dismiss: true, kind: 'ok', icon: 'users' });
  clearTimeout(_gr.reloadT);
  _gr.reloadT = setTimeout(() => { Promise.all([grLoad(true), _frGroupId(state.view) ? grOne(_frGroupId(state.view), true).catch(() => {}) : null]).then(_grRepaint).catch(() => {}); }, 300);
}
function _frGroupId(view) { const m = /^friends:groups:([A-Za-z0-9_-]{22})$/.exec(String(view || '')); return m ? m[1] : null; }

/* ---------- small pieces ---------- */
function _grLogoEl(g, size) {
  const el = _frEl('span', 'gr-logo');
  const sz = Number(size) || 40;
  el.style.setProperty('--size', sz + 'px');
  const logo = (g && g.logo) || {};
  el.style.setProperty('--c', /^#[0-9a-f]{6}$/i.test(logo.c || '') ? logo.c : '#2f5d50');
  el.textContent = logo.e || avatarInitials(String((g && g.name) || 'G'));
  el.setAttribute('aria-hidden', 'true');
  return el;
}
const _grPerson = (m) => ({ id: m.iid, name: m.name, profile: { name: m.name, ...(m.avatar ? { avatar: m.avatar } : {}), ...(m.emoji ? { emoji: m.emoji } : {}), ...(m.color ? { color: m.color } : {}) } });
/** Someone's check pictures: the same on every screen, from their own keys. */
function _grPicturesEl(fp, label) {
  const row = _frEl('div', 'fr-check-pics gr-pics');
  const words = [];
  for (const i of Array.isArray(fp) ? fp : []) {
    const p = (typeof FR_PICTURES !== 'undefined' && FR_PICTURES[i]) || null;
    if (!p) continue;
    words.push(p[1]);
    const c = _frEl('span', 'fr-check-pic');
    const e = _frEl('span', 'fr-check-e', p[0]); e.setAttribute('aria-hidden', 'true');
    c.append(e, _frEl('span', 'fr-check-w', p[1]));
    row.appendChild(c);
  }
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', (label || 'Check pictures') + ': ' + words.join(', '));
  return row;
}
function _grField(label, input, hint, tag) {
  const l = _frEl(tag || 'label', 'fr-set-l gr-field');
  l.appendChild(_frEl('span', null, label));
  l.appendChild(input);
  if (hint) l.appendChild(_frEl('span', 'muted fr-small', hint));
  return l;
}
function _grInput(value, o) { const i = document.createElement('input'); i.type = 'text'; i.className = 'input'; i.value = value || ''; i.maxLength = (o && o.max) || 60; i.autocomplete = 'off'; if (o && o.placeholder) i.placeholder = o.placeholder; return i; }
function _grTextarea(value, o) { const t = document.createElement('textarea'); t.className = 'input'; t.rows = (o && o.rows) || 3; t.value = value || ''; t.maxLength = (o && o.max) || 500; if (o && o.placeholder) t.placeholder = o.placeholder; return t; }
function _grRadio(name, value, label, hint, checked) {
  const l = _frEl('label', 'gr-radio');
  const r = document.createElement('input'); r.type = 'radio'; r.name = name; r.value = value; r.checked = !!checked;
  const t = _frEl('span');
  t.append(_frEl('b', null, label), _frEl('span', 'muted fr-small', hint));
  l.append(r, t);
  return { el: l, input: r };
}
function _grStep(n, of, text) { const s = _frEl('div', 'gr-step'); s.appendChild(_frEl('span', 'overline', `Step ${n} of ${of}`)); if (text) s.appendChild(_frEl('b', null, text)); return s; }
function _grDays(ms) { const d = Math.ceil((Number(ms) - Date.now()) / 86400000); return d <= 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`; }

/* ---------- the tab ---------- */
function _frTabGroups(root, view) {
  const data = _gr.data;
  if (!data) {
    root.appendChild(_frLoading());
    grLoad(true).then(() => friendsPageRefresh()).catch((e) => { if (!root.isConnected) return; root.textContent = ''; root.appendChild(_frErrorCard(e)); });
    return;
  }
  const groups = data.groups || [];
  _grTop(root, data);
  if (!groups.length) {
    mountEmptyState(root, { icon: 'users', title: 'Bring a whole group together', text: 'One link connects everyone: your family, your club or your workplace. People see each other by name and picture. Nothing else is shared unless someone chooses to.',
      actions: [{ label: 'Start a group', icon: 'sparkles', primary: true, run: () => grStartDialog() }, { label: 'Join a group', icon: 'log-in', run: () => grJoinDialog() }] });
    return;
  }
  const id = _frGroupId(view);
  const cur = groups.find(g => g.id === id) || groups[0];
  const md = masterDetail({
    label: 'Your groups', listWidth: 256, cls: 'gr-md',
    list: (host) => {
      for (const g of groups) {
        const sub = g.status === 'asking' ? 'Waiting to be let in' : g.status === 'member' ? `${g.count} ${g.count === 1 ? 'person' : 'people'}` : g.status === 'declined' ? 'Not let in' : 'You are no longer in it';
        host.appendChild(mdRow({ avatar: _grLogoEl(g, 30), title: g.name, sub, badge: g.waiting || '', active: g.id === cur.id, tip: g.name, run: () => { if (g.id !== cur.id) setView('friends:groups:' + g.id); } }));
      }
    },
    detail: (host) => _grDetail(host, cur),
  });
  root.appendChild(md);
}
/** Start and Join, and what stands in the way of starting one, said plainly. */
function _grTop(root, data) {
  if ((data.groups || []).length) {   // with none yet, the empty page has these two buttons itself
    const bar = _frEl('div', 'gr-top');
    bar.appendChild(uiButton({ label: 'Start a group', icon: 'sparkles', kind: 'primary', size: 'sm', run: () => grStartDialog() }));
    bar.appendChild(uiButton({ label: 'Join a group', icon: 'log-in', size: 'sm', run: () => grJoinDialog() }));
    root.appendChild(bar);
  }
  const c = data.caps;
  if (c && c.hasHome && c.known && !c.groups) {
    const n = _frEl('div', 'card gr-note');
    n.innerHTML = icon('info', 'i-sm');
    const t = _frEl('div');
    t.append(_frEl('b', null, 'Groups need a quick update first'), _frEl('span', 'muted fr-small', c.role === 'owner' ? 'It takes about a minute. Nothing is lost.' : 'Ask the person who set up your connection to press Update in Settings > Your connection to friends. You can still join other people\'s groups with their link.'));
    n.appendChild(t);
    if (c.role === 'owner' && typeof _frRelayBtn === 'function') n.appendChild(_frRelayBtn(_fr.data, { size: 'sm' }));
    root.appendChild(n);
  }
}

/* ---------- one group ---------- */
function _grDetail(host, g) {
  const cached = _gr.one.get(g.id);
  if (cached) _grPaint(host, g, cached);
  else { const w = _frEl('div', 'fr-loading'); w.innerHTML = icon('loader-circle', 'i-lg fr-spin'); w.appendChild(_frEl('span', null, 'Opening the group…')); host.appendChild(w); }
  if (!cached || Date.now() - (_gr.oneAt.get(g.id) || 0) > 3000) {
    grOne(g.id, true).then((d) => { if (!host.isConnected) return; host.replaceChildren(); _grPaint(host, g, d); })
      .catch((e) => { if (!host.isConnected) return; host.replaceChildren(); host.appendChild(_frErrorCard(e)); });
  }
}
function _grPaint(host, g0, d) {
  const g = d.group || g0;
  const wrap = _frEl('div', 'fr-stack gr-detail');
  wrap.appendChild(_grHero(g, d));
  if (g.status === 'asking') { wrap.appendChild(_grAsking(g)); host.appendChild(wrap); return; }
  if (g.status !== 'member') { wrap.appendChild(_grGone(g)); host.appendChild(wrap); return; }
  const runs = g.role !== 'member';
  if (g.welcome && !_grSeenWelcome(g.id)) {
    const w = _frEl('div', 'card gr-welcome');
    w.appendChild(_frEl('b', null, `Welcome to ${g.name}`));
    w.appendChild(_frEl('p', 'gr-pre', g.welcome));
    w.appendChild(uiButton({ label: 'Got it', size: 'sm', run: () => { _grSeenWelcome(g.id, true); w.remove(); } }));
    wrap.appendChild(w);
  }
  if (g.warn) {
    const w = _frEl('div', 'card gr-note');
    w.innerHTML = icon('info', 'i-sm');
    const t = _frEl('div');
    t.append(_frEl('b', null, `${g.count} people: your free connection may rest some evenings`), _frEl('span', 'muted fr-small', "A group this size can use up Cloudflare's free daily allowance. It rests until midnight UTC and nothing is lost. Cloudflare's paid plan (US$5 a month) lifts this. That is between you and Cloudflare, and nothing changes by itself."));
    w.appendChild(t);
    wrap.appendChild(w);
  }
  if (g.auto && !g.autoOk && !g.autoAsked) wrap.appendChild(_grAutoAsk(g));
  if (runs && g.linkNote) wrap.appendChild(_grLinkNote(g));
  if (runs && d.requests && d.requests.length) wrap.appendChild(_grRequests(g, d.requests));
  wrap.appendChild(pageLayout({ main: _grBoard(g, d), side: _grPeople(g, d), sideWidth: 320, cls: 'gr-layout' }));
  wrap.appendChild(_grSettings(g, d));
  host.appendChild(wrap);
}
/* Automatic friends turned on after this person joined: nothing crosses until they say yes themselves. */
function _grAutoAsk(g) {
  const el = _frEl('div', 'card gr-note');
  el.innerHTML = icon('users', 'i-sm');
  const t = _frEl('div');
  t.append(_frEl('b', null, `${g.name} would like everyone in it to be friends automatically`), _frEl('span', 'muted fr-small', 'If you say yes, a friend request from someone here is accepted by itself. They see only the name you use in this group, and nothing else until you choose. If you say no, you are asked each time, as before.'));
  el.appendChild(t);
  const a = _frEl('div', 'fr-add-acts');
  const answer = (yes) => (e, b) => _frDo(b, async () => { await grApi('/profile', { id: g.id, autoOk: yes }); await grOne(g.id, true); _grRepaint(); }, yes ? 'Requests from people here are accepted by themselves' : 'You will be asked each time', 'save that');
  a.append(uiButton({ label: 'Yes, accept by themselves', size: 'sm', kind: 'primary', run: answer(true) }), uiButton({ label: 'No, ask me each time', size: 'sm', run: answer(false) }));
  el.appendChild(a);
  return el;
}
/* Someone who is gone still knows the link: say so, and offer the fix. */
function _grLinkNote(g) {
  const el = _frEl('div', 'card gr-note');
  el.innerHTML = icon('link', 'i-sm');
  const t = _frEl('div');
  const words = { left: 'Someone who helped run this group has left, and they still know the link.', demoted: 'Someone who helped run this group no longer does, and they still know the link.', removed: 'Someone you removed still has the link, so they could come back under a new name.' }[g.linkNote] || 'Someone who is gone still knows the link.';
  t.append(_frEl('b', null, words), _frEl('span', 'muted fr-small', 'A new link stops the old one straight away. People already in the group stay.'));
  el.appendChild(t);
  const a = _frEl('div', 'fr-add-acts');
  a.append(uiButton({ label: 'Make a new link', icon: 'rotate-ccw', size: 'sm', kind: 'primary', run: () => _grNewLink(g) }), uiButton({ label: 'Keep this link', size: 'sm', run: (e, b) => _frDo(b, async () => { await grApi('/keep-link', { id: g.id }); await grOne(g.id, true); _grRepaint(); }, null, 'save that') }));
  el.appendChild(a);
  return el;
}
async function _grNewLink(g) {
  const yes = await confirmDialog({ title: 'Make a new link?', text: 'The old link and any code stop working straight away, and anyone still waiting needs the new link. People already in the group stay.', confirmLabel: 'Make a new link', danger: true });
  if (yes) _frDo(null, async () => { const r = await grApi('/reset', { id: g.id }); await grOne(g.id, true); _grRepaint(); grShareDialog(g.id, r); }, 'New link ready. The old one no longer works.', 'make a new link');
}
const _grSeen = new Set();
function _grSeenWelcome(id, set) {
  const k = 'opendash-group-welcome-' + id;
  if (set) { _grSeen.add(k); try { localStorage.setItem(k, '1'); } catch (e) { /* this page only */ } return true; }
  if (_grSeen.has(k)) return true;
  try { return localStorage.getItem(k) === '1'; } catch (e) { return false; }
}
function _grHero(g, d) {
  const el = _frEl('section', 'gr-hero');
  el.appendChild(_grLogoEl(g, 56));
  const t = _frEl('div', 'gr-hero-t');
  t.appendChild(_frEl('h2', null, g.name));
  const line = _frEl('div', 'muted fr-small');
  line.textContent = [g.status === 'member' ? `${g.count} ${g.count === 1 ? 'person' : 'people'}` : '', g.ownerName ? `Run by ${g.ownerName}` : '', g.role === 'owner' ? 'You own it' : g.role === 'admin' ? 'You help run it' : ''].filter(Boolean).join(' · ');
  t.appendChild(line);
  if (g.about) t.appendChild(_frEl('p', 'gr-pre fr-small', g.about));
  el.appendChild(t);
  const a = _frEl('div', 'gr-hero-a');
  if (g.status === 'member' && g.role !== 'member') a.appendChild(uiButton({ label: 'Share the link', icon: 'link', kind: 'primary', size: 'sm', run: () => grShareDialog(g.id) }));
  if (g.status === 'member') a.appendChild(uiButton({ icon: 'refresh-cw', size: 'sm', kind: 'ghost', aria: 'Check for news now', tip: 'Check for news now', run: (e, b) => _frDo(b, async () => { await grApi('/check', { id: g.id }); await grLoad(true); await grOne(g.id, true); _grRepaint(); }, 'Up to date', 'check for news') }));
  el.appendChild(a);
  return el;
}
function _grAsking(g) {
  const el = _frEl('div', 'card gr-note');
  el.innerHTML = icon('loader-circle', 'i-sm fr-spin');
  const t = _frEl('div');
  t.append(_frEl('b', null, `Waiting for ${g.ownerName || 'them'} to let you in`), _frEl('span', 'muted fr-small', 'You can close this. Freeflo keeps asking while it is open, and tells you when you are in. They only see the name you gave, your picture and your check pictures.'));
  el.appendChild(t);
  el.appendChild(uiButton({ label: 'Take back my request', size: 'sm', kind: 'ghost', run: (e, b) => _frDo(b, async () => { await grApi('/cancel', { id: g.id }); _gr.one.delete(g.id); await grLoad(true); setView('friends:groups'); _grRepaint(); }, 'Request taken back', 'take back your request') }));
  return el;
}
function _grGone(g) {
  const el = _frEl('div', 'card gr-note');
  el.innerHTML = icon('info', 'i-sm');
  const t = _frEl('div');
  const words = { declined: ['You were not let in', 'They decide who joins. If you think this is a mistake, ask them for a new link.'], removed: ['You are no longer in this group', 'Someone who runs it removed you. Your own tasks, calendar and money were never part of it. If this is a mistake it comes back by itself: Freeflo keeps looking for 30 days.'], gone: ['This group has ended', 'Its owner deleted it, or it was removed. If this is a mistake it comes back by itself: Freeflo keeps looking for 30 days.'], left: ['You left this group', ''] }[g.status] || ['This group is not available', ''];
  t.append(_frEl('b', null, words[0]), _frEl('span', 'muted fr-small', words[1]));
  el.appendChild(t);
  el.appendChild(uiButton({ label: 'Remove from my list', size: 'sm', run: (e, b) => _frDo(b, async () => { await grApi('/forget', { id: g.id }); _gr.one.delete(g.id); await grLoad(true); setView('friends:groups'); _grRepaint(); }, null, 'remove it') }));
  return el;
}
/* who is waiting */
function _grRequests(g, list) {
  const sec = _frSec('Waiting to join', 'user-plus');
  for (const q of list) {
    const c = _frEl('div', 'card fr-pend');
    c.appendChild(_frAvatarWrap(_grPerson({ iid: q.iid, name: q.name, avatar: q.avatar }), 44, { presence: false }));
    const b = _frEl('div', 'fr-pend-b');
    b.appendChild(_frEl('b', null, q.ok ? `${q.name} asks to join` : 'Someone asks to join'));
    b.appendChild(_frEl('span', 'muted fr-small', `${q.via === 'code' ? 'They typed the code' : 'They used the link'}, ${_frAgo(q.at)}.${q.status ? ` "${q.status}"` : ''}`));
    if (q.ok) { b.appendChild(_frEl('span', 'fr-small', 'Not sure who it is? Ask them what their screen shows:')); b.appendChild(_grPicturesEl(q.fp, 'Their check pictures')); }
    else b.appendChild(_frEl('span', 'fr-small', "Their details couldn't be checked, so they can't be let in. Decline, and ask them to send the request again."));
    const a = _frEl('div', 'fr-pend-a');
    if (q.ok) a.appendChild(uiButton({ label: 'Let in', icon: 'check', kind: 'primary', run: (e, bb) => _frDo(bb, async () => { await grApi('/approve', { id: g.id, iid: q.iid }); await grLoad(true); await grOne(g.id, true); _grRepaint(); }, `${q.name} is in`, 'let them in') }));
    a.appendChild(uiButton({ label: 'Decline', size: 'sm', kind: 'ghost', run: (e, bb) => _frDo(bb, async () => { await grApi('/decline', { id: g.id, iid: q.iid }); await grLoad(true); await grOne(g.id, true); _grRepaint(); }, 'Declined. They are not told why.', 'decline') }));
    a.appendChild(uiButton({ icon: 'lock', size: 'sm', kind: 'ghost', aria: 'Block', tip: 'Block: they cannot ask again', run: (e, bb) => _frDo(bb, async () => { await grApi('/decline', { id: g.id, iid: q.iid, block: true }); await grLoad(true); await grOne(g.id, true); _grRepaint(); }, 'Blocked. They cannot ask again.', 'block') }));
    c.append(b, a);
    sec.appendChild(c);
  }
  return sec;
}
/* the noticeboard */
function _grBoard(g, d) {
  const sec = _frSec('Noticeboard', 'megaphone');
  const runs = g.role !== 'member';
  if (runs || g.posting === 'all') {
    const ta = _grTextarea(_gr.draft.get(g.id) || '', { rows: 2, max: 2000, placeholder: runs ? 'Write something for everyone in the group' : 'Write a note for the group' });
    ta.setAttribute('aria-label', 'Write a note');
    ta.id = 'gr-note-' + g.id;
    ta.oninput = () => { _gr.draft.set(g.id, ta.value); };
    let ann = null;
    const acts = _frEl('div', 'fr-add-acts');
    if (runs) { const l = _frEl('label', 'fr-switch'); ann = document.createElement('input'); ann.type = 'checkbox'; l.append(ann, _frEl('span', null, 'Make it an announcement')); acts.appendChild(l); }
    const send = uiButton({ label: 'Post', icon: 'send', size: 'sm', kind: 'primary', run: (e, b) => {
      if (!ta.value.trim()) { ta.focus(); return; }
      _frDo(b, async () => { await grApi('/post', { id: g.id, ch: ann && ann.checked ? 'a' : 'm', text: ta.value }); ta.value = ''; _gr.draft.delete(g.id); await grOne(g.id, true); _grRepaint(); }, null, 'post that');
    } });
    acts.appendChild(send);
    sec.append(ta, acts);
  } else sec.appendChild(_frEl('p', 'muted fr-small', 'Only the people who run this group post here.'));
  const list = _frEl('div', 'gr-posts');
  if (!d.posts.length) list.appendChild(emptyLine(runs ? 'Nothing here yet. Say hello to everyone.' : 'Nothing here yet.'));
  for (const p of d.posts) {
    const row = _frEl('article', 'gr-post' + (p.ch === 'a' ? ' is-ann' : ''));
    const h = _frEl('div', 'gr-post-h');
    if (p.ch === 'a') { const ic = _frEl('span', 'gr-post-k'); ic.innerHTML = icon('megaphone', 'i-xs'); ic.appendChild(_frEl('span', null, 'Announcement')); h.appendChild(ic); }
    h.append(_frEl('b', null, p.mine ? 'You' : p.from), _frEl('span', 'muted fr-small', _frAgo(p.at)));
    row.append(h, _frEl('p', 'gr-pre', p.text));
    list.appendChild(row);
  }
  sec.appendChild(list);
  sec.appendChild(_frEl('p', 'muted fr-small', 'Everything here goes after 30 days. This is not a compliance or records system: nothing is kept for you, and people keep what they already read.'));
  return sec;
}
/* who's in */
function _grPeople(g, d) {
  const sec = _frSec(`People (${d.members.length})`, 'users');
  const q = _grInput(_gr.search.get(g.id) || '', { placeholder: 'Find someone', max: 40 });
  q.setAttribute('aria-label', 'Find someone in this group');
  const list = _frEl('div', 'gr-people');
  const paint = () => {
    _gr.search.set(g.id, q.value);
    list.textContent = '';
    const t = q.value.trim().toLowerCase();
    const shown = d.members.filter(m => !t || m.name.toLowerCase().includes(t) || (m.status || '').toLowerCase().includes(t));
    if (!shown.length) { list.appendChild(emptyLine('Nobody by that name.')); return; }
    for (const m of shown.slice(0, 200)) {
      const row = mdRow({ avatar: _frAvatarWrap(_grPerson(m), 30, { presence: false }), title: m.name + (m.me ? ' (you)' : ''), sub: [_GR_ROLE[m.role][0], m.status, m.friend === 'friend' ? 'Your friend' : ''].filter(Boolean).join(' · '), tip: `About ${m.name}`, run: () => _grPersonDialog(g, m) });
      list.appendChild(row);
    }
    if (shown.length > 200) list.appendChild(emptyLine(`And ${shown.length - 200} more. Type a name to find them.`));
  };
  q.oninput = paint;
  if (d.members.length > 6) sec.appendChild(q);
  sec.appendChild(list);
  paint();
  return sec;
}
function _grPersonDialog(g, m) {
  const runs = g.role !== 'member', owner = g.role === 'owner';
  openDialog({
    title: m.name, size: 'sm',
    body(el, close) {
      const top = _frEl('div', 'gr-person');
      top.appendChild(_frAvatarWrap(_grPerson(m), 56, { presence: false }));
      const t = _frEl('div');
      t.appendChild(_frEl('b', null, m.name + (m.me ? ' (you)' : '')));
      if (_GR_ROLE[m.role][0]) t.appendChild(_frEl('span', 'muted fr-small', _GR_ROLE[m.role][0]));
      if (m.status) t.appendChild(_frEl('span', 'fr-small', m.status));
      top.appendChild(t);
      el.appendChild(top);
      el.appendChild(_frEl('p', 'fr-small', m.me ? 'Your check pictures in this group. Someone can compare them with their screen to be sure it is you.' : `Meeting ${m.name}? Their screen shows these same pictures for themselves, so you can be sure it is them.`));
      el.appendChild(_grPicturesEl(m.fp, 'Check pictures'));
      const acts = _frEl('div', 'fr-add-acts gr-person-a');
      if (!m.me) {
        if (m.friend === 'friend') acts.appendChild(uiButton({ label: 'See their friend page', icon: 'users', run: () => { close(); setView('friends:' + m.friendId); } }));
        else if (m.friend === 'requested') acts.appendChild(_frEl('span', 'muted fr-small', 'You asked. They still have to accept.'));
        else if (m.friend === 'incoming') acts.appendChild(uiButton({ label: 'They asked you: review', icon: 'user-plus', kind: 'primary', run: () => { close(); setView('friends:requests'); } }));
        else if (m.friend !== 'blocked') acts.appendChild(uiButton({ label: 'Add as friend', icon: 'user-plus', kind: 'primary', tip: m.canAdd ? 'They still have to accept' : "They haven't opened Freeflo since joining", disabled: !m.canAdd, run: (e, b) => _frDo(b, async () => { await grApi('/friend', { id: g.id, iid: m.iid }); close(); await friendsLoad(true); await grOne(g.id, true); _grRepaint(); }, `Asked ${m.name}. They still have to accept. Being friends shares nothing new until you each choose to.`, { what: 'ask them', retry: false }) }));
        if (runs && m.role !== 'owner' && (owner || m.role === 'member')) {
          acts.appendChild(uiButton({ label: 'Remove from group', icon: 'user-minus', run: () => { close(); _grRemove(g, m, false); } }));
          acts.appendChild(uiButton({ label: 'Block', icon: 'lock', kind: 'ghost', tip: 'Removes them, and they cannot ask again', run: () => { close(); _grRemove(g, m, true); } }));
        }
        if (owner) {
          if (m.role === 'admin') acts.appendChild(uiButton({ label: 'Stop them helping run it', kind: 'ghost', run: (e, b) => _frDo(b, async () => { await grApi('/role', { id: g.id, iid: m.iid, role: 'member' }); close(); await grOne(g.id, true); _grRepaint(); }, `${m.name} no longer helps run it`, 'change that') }));
          else acts.appendChild(uiButton({ label: 'Let them help run it', icon: 'shield-check', kind: 'ghost', tip: 'They can let people in, remove people, make announcements and see the link', run: (e, b) => _frDo(b, async () => { await grApi('/role', { id: g.id, iid: m.iid, role: 'admin' }); close(); await grOne(g.id, true); _grRepaint(); }, `${m.name} helps run it now`, 'change that') }));
          acts.appendChild(uiButton({ label: 'Hand the group to them', icon: 'crown', kind: 'ghost', run: async () => {
            const yes = await confirmDialog({ title: `Hand ${g.name} to ${m.name}?`, text: `${m.name} becomes the owner straight away. You stay on as someone who helps run it, and only they could hand it back.`, confirmLabel: 'Hand it over' });
            if (yes) _frDo(null, async () => { await grApi('/transfer', { id: g.id, iid: m.iid }); await grLoad(true); await grOne(g.id, true); _grRepaint(); }, `${m.name} owns it now`, 'hand it over');
          } }));
        }
      }
      el.appendChild(acts);
    },
    actions: [{ label: 'Close' }],
  });
}
function _grRemove(g, m, block) {
  _frDo(null, async () => {
    const r = await grApi('/remove', { id: g.id, iid: m.iid, block: !!block });
    await grOne(g.id, true); _grRepaint();
    const ms = Math.max(3000, (r.undoUntil || Date.now() + 10000) - Date.now() - 500);
    const open = g.mode === 'open', ran = m.role === 'admin';
    toast(`${block ? 'Blocked' : 'Removed'} ${m.name}.${ran ? ' They knew the link, so a new one replaces it: share that with anyone still to join.' : open ? ' They still have the link: this page offers you a new one.' : ''} They keep what they already read.`,
      { icon: block ? 'lock' : 'user-minus', timeout: ms, action: { label: 'Undo', run: () => _frDo(null, async () => { await grApi('/remove/undo', { id: g.id, iid: m.iid }); await grOne(g.id, true); _grRepaint(); }, `${m.name} stays`, 'bring them back') } });
    setTimeout(() => { Promise.all([grLoad(true), grOne(g.id, true)]).then(_grRepaint).catch(() => {}); }, ms + 1500);
  }, null, 'remove them');
}
/* settings */
function _grSettings(g, d) {
  const det = _frEl('details', 'fr-fold gr-settings');
  const sum = _frEl('summary', 'fr-fold-h');
  sum.innerHTML = icon('settings', 'i-sm');
  sum.appendChild(_frEl('span', null, 'Settings for this group'));
  det.appendChild(sum);
  det.open = _gr.search.get('open|' + g.id) === '1';
  det.ontoggle = () => { _gr.search.set('open|' + g.id, det.open ? '1' : '0'); };
  const body = _frEl('div', 'fr-stack gr-set-b');
  const runs = g.role !== 'member', owner = g.role === 'owner';
  // what I show here
  const you = _frSec('What people here see of you', 'eye');
  you.appendChild(_frEl('p', 'muted fr-small', 'Only your name, picture and status. Nothing else. This name is for this group: another group can know you by another one.'));
  const nameIn = _grInput((g.me && g.me.name) || '', { max: 40 }), statIn = _grInput((g.me && g.me.status) || '', { max: 80, placeholder: 'A few words, if you like' });
  you.append(_grField('Your name here', nameIn), _grField('Your status', statIn));
  const youAct = _frEl('div', 'fr-add-acts');
  youAct.appendChild(uiButton({ label: 'Save', size: 'sm', run: (e, b) => _frDo(b, async () => { await grApi('/profile', { id: g.id, name: nameIn.value, status: statIn.value }); await grLoad(true); await grOne(g.id, true); _grRepaint(); }, 'Saved', 'save that') }));
  you.appendChild(youAct);
  if (g.auto) {
    const l = _frEl('label', 'fr-switch');
    const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!g.autoOk;
    c.onchange = () => _frDo(null, async () => { await grApi('/profile', { id: g.id, autoOk: c.checked }); await grOne(g.id, true); }, null, 'change that');
    l.append(c, _frEl('span', null, 'Accept friend requests from people here by themselves'));
    you.appendChild(l);
    you.appendChild(_frEl('p', 'muted fr-small', 'They would see only the name you use here, and nothing else until you choose.'));
  }
  body.appendChild(you);
  if (runs) body.appendChild(_grSetJoin(g));
  if (runs) body.appendChild(_grSetCard(g));
  if (runs && d.blocks && d.blocks.length) {
    const b = _frSec('Blocked', 'lock');
    b.appendChild(_frEl('p', 'muted fr-small', 'These people cannot ask to join. A name is not kept once someone is blocked.'));
    for (const x of d.blocks) {
      const row = _frEl('div', 'fr-row');
      row.appendChild(_frEl('span', 'fr-row-t', `Blocked ${_frAgo(x.at)}`));
      row.appendChild(uiButton({ label: 'Unblock', size: 'sm', kind: 'ghost', run: (e, bb) => _frDo(bb, async () => { await grApi('/unblock', { id: g.id, iid: x.iid }); await grOne(g.id, true); _grRepaint(); }, 'Unblocked', 'unblock') }));
      b.appendChild(row);
    }
    body.appendChild(b);
  }
  const end = _frSec('Leaving', 'log-out');
  if (owner && g.count > 1) end.appendChild(_frEl('p', 'muted fr-small', 'To leave, first hand the group to someone: press their name in People.'));
  else end.appendChild(uiButton({ label: owner ? 'Leave and delete this group' : 'Leave this group', icon: 'log-out', size: 'sm', run: async () => {
    const yes = await confirmDialog({ title: owner ? `Delete ${g.name}?` : `Leave ${g.name}?`, text: owner ? 'Nobody else is in it. It is gone for good, and the link stops working.' : 'You stop seeing it straight away. Friends you made here stay your friends. People keep what they already read.', confirmLabel: owner ? 'Delete it' : 'Leave', danger: true });
    if (yes) _frDo(null, async () => { await grApi('/leave', { id: g.id }); _gr.one.delete(g.id); await grLoad(true); setView('friends:groups'); _grRepaint(); }, owner ? 'Deleted' : 'You left', 'leave');
  } }));
  if (owner && g.count > 1) end.appendChild(uiButton({ label: 'Delete this group for everyone', icon: 'trash-2', size: 'sm', kind: 'ghost', run: async () => {
    const yes = await confirmDialog({ title: `Delete ${g.name} for everyone?`, text: `${g.count} people lose it at once, and the link stops working. There is no way back.`, confirmLabel: 'Delete it', danger: true });
    if (yes) _frDo(null, async () => { await grApi('/delete', { id: g.id }); _gr.one.delete(g.id); await grLoad(true); setView('friends:groups'); _grRepaint(); }, 'Deleted', 'delete it');
  } }));
  body.appendChild(end);
  det.appendChild(body);
  return det;
}
function _grSetJoin(g) {
  const sec = _frSec('How people get in', 'link');
  const name = 'gr-mode-' + g.id;
  const a = _grRadio(name, 'approve', 'I approve each person', 'Anyone can ask with the link. You see who it is before they get anything.', g.mode !== 'open');
  const o = _grRadio(name, 'open', 'Anyone with the link', 'They are in straight away. So keep the link among people you mean it for: whoever has it can read the group.', g.mode === 'open');
  const days = document.createElement('select'); days.className = 'input input-sm';
  // What is set now stays set unless someone changes it.
  const hasExp = !!(g.link && g.link.exp), hasMax = !!(g.link && g.link.maxUses), ranOut = hasExp && g.link.exp <= Date.now();
  for (const [v, l] of [...(hasExp ? [['keep', ranOut ? 'Has run out, so nobody can use it' : `Runs out ${_grDays(g.link.exp)}`]] : []), ['', 'Never runs out'], ['1', 'Runs out in a day'], ['7', 'Runs out in a week'], ['30', 'Runs out in a month'], ['365', 'Runs out in a year']]) { const x = document.createElement('option'); x.value = v; x.textContent = l; days.appendChild(x); }
  const uses = document.createElement('select'); uses.className = 'input input-sm';
  for (const [v, l] of [...(hasMax ? [['keep', `Up to ${g.link.maxUses} people`]] : []), ['', 'Any number of people'], ['10', 'Up to 10 people'], ['50', 'Up to 50 people'], ['100', 'Up to 100 people']]) { const x = document.createElement('option'); x.value = v; x.textContent = l; uses.appendChild(x); }
  const extra = _frEl('div', 'gr-open-opts');
  extra.append(days, uses);
  if (g.link && g.mode === 'open') {
    const l = [];
    if (g.link.exp) l.push(ranOut ? 'This link has run out. Choose a new date to open it again, or make a new link.' : `Runs out ${_grDays(g.link.exp)}`);
    if (g.link.maxUses) l.push(`${g.link.uses} of ${g.link.maxUses} places used`);
    if (l.length) extra.appendChild(_frEl('span', 'muted fr-small', l.join(' · ')));
  }
  const sync = () => { extra.hidden = !o.input.checked; };
  a.input.onchange = sync; o.input.onchange = sync; sync();
  sec.append(a.el, o.el, extra);
  const row = _frEl('div', 'fr-add-acts');
  row.appendChild(uiButton({ label: 'Save', size: 'sm', run: (e, b) => _frDo(b, async () => {
    const open = o.input.checked;
    const exp = !open || !days.value ? null : days.value === 'keep' ? g.link.exp : Date.now() + Number(days.value) * 86400000;
    const maxUses = !open || !uses.value ? null : uses.value === 'keep' ? g.link.maxUses : Number(uses.value);
    await grApi('/joining', { id: g.id, mode: open ? 'open' : 'approve', exp, maxUses });
    await grOne(g.id, true); _grRepaint();
  }, 'Saved', 'save that') }));
  row.appendChild(uiButton({ label: 'Reset the link', icon: 'rotate-ccw', size: 'sm', kind: 'ghost', tip: 'The old link stops working at once', run: () => _grNewLink(g) }));
  sec.appendChild(row);
  return sec;
}
function _grSetCard(g) {
  const sec = _frSec('About this group', 'info');
  const n = _grInput(g.name, { max: 60 }), ab = _grTextarea(g.about, { max: 500 }), we = _grTextarea(g.welcome, { max: 500, placeholder: 'What new people see first' });
  sec.append(_grField('Name', n), _grField('Description', ab, 'People see this before they join.'), _grField('Welcome message', we));
  const pick = _frEl('div', 'gr-logos');
  let logoE = (g.logo && g.logo.e) || '', logoC = (g.logo && g.logo.c) || '';
  const paint = () => {
    pick.textContent = '';
    for (const e of _GR_LOGOS) {
      const b = uiButton({ label: e, size: 'sm', kind: 'ghost', cls: 'gr-logo-b' + (e === logoE ? ' on' : ''), aria: `Use ${e} as the logo`, run: () => { logoE = e === logoE ? '' : e; paint(); } });
      pick.appendChild(b);
    }
    const cs = _frEl('div', 'gr-colors');
    for (const c of _GR_COLORS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'gr-color' + (c === logoC ? ' on' : ''); b.style.setProperty('--c', c); b.setAttribute('aria-label', 'Colour ' + c);
      b.onclick = () => { logoC = c; paint(); };
      cs.appendChild(b);
    }
    pick.appendChild(cs);
  };
  paint();
  sec.appendChild(_grField('Logo', pick, 'A picture and a colour. Uploaded images are not used, so nobody has to load something from someone else.', 'div'));
  const posts = document.createElement('select'); posts.className = 'input input-sm';
  for (const [v, l] of [['all', 'Everyone can post on the noticeboard'], ['admins', 'Only the people who run it can post']]) { const x = document.createElement('option'); x.value = v; x.textContent = l; if (g.posting === v) x.selected = true; posts.appendChild(x); }
  sec.appendChild(posts);
  const l = _frEl('label', 'fr-switch');
  const auto = document.createElement('input'); auto.type = 'checkbox'; auto.checked = !!g.auto;
  l.append(auto, _frEl('span', null, 'Everyone here is friends automatically'));
  sec.appendChild(l);
  sec.appendChild(_frEl('p', 'muted fr-small', 'Off by default. When on, each person here is asked once. For those who say yes, a friend request from someone in the group is accepted by itself, and all it shares is the name they use here.'));
  const cardAct = _frEl('div', 'fr-add-acts');
  sec.appendChild(cardAct);
  cardAct.appendChild(uiButton({ label: 'Save', size: 'sm', run: (e, b) => _frDo(b, async () => {
    await grApi('/card', { id: g.id, name: n.value, about: ab.value, welcome: we.value, logo: { e: logoE, c: logoC }, posts: posts.value, auto: auto.checked });
    await grLoad(true); await grOne(g.id, true); _grRepaint();
  }, 'Saved', 'save that') }));
  return sec;
}

/* ---------- start a group ---------- */
function grStartDialog() {
  const d = _gr.data, caps = d && d.caps;
  openDialog({
    title: 'Start a group', size: 'md', fixed: true, resizeKey: 'w560',
    body(el, close) {
      el.classList.add('gr-dialog');
      if (caps && !caps.hasHome) { _frNeedRelay(el, close); return; }
      if (caps && caps.known && !caps.groups) {
        el.appendChild(_frEl('p', null, caps.role === 'owner' ? 'Your connection needs a quick update first. It takes about a minute, and nothing is lost.' : 'The connection you use needs a quick update first. Ask the person who set it up to press Update in Settings > Your connection to friends.'));
        if (caps.role === 'owner' && typeof _frRelayBtn === 'function') el.appendChild(_frRelayBtn(_fr.data, { close }));
        return;
      }
      if (caps && caps.known && !caps.canStart) { el.appendChild(_frEl('p', null, 'Only people the owner of this connection let in themselves can start a group here. Ask them to start it, or set up your own in Settings > Your connection to friends.')); return; }
      el.appendChild(_grStep(1, 2, 'What is it called?'));
      const name = _grInput('', { max: 60, placeholder: 'Sunday book club, or Acme Ltd' });
      name.setAttribute('autofocus', '');
      el.appendChild(_grField('Name of the group', name));
      const about = _grTextarea('', { rows: 2, max: 500 }), welcome = _grTextarea('', { rows: 2, max: 500 });
      const grp = 'gr-new-mode';
      const a = _grRadio(grp, 'approve', 'I approve each person', 'Recommended. Share the link anywhere: nobody gets in until you say so.', true);
      const o = _grRadio(grp, 'open', 'Anyone with the link', 'Straight in. Whoever has the link can read the group.', false);
      el.appendChild(a.el); el.appendChild(o.el);
      setFold(el, 'gr-new-more', 'More', ({ body }) => { body.append(_grField('Description', about, 'People see this before they join.'), _grField('Welcome message', welcome, 'What new people see first.')); });
      const acts = _frEl('div', 'fr-add-acts');
      let ctl = null;
      const stop = uiButton({ label: 'Cancel', kind: 'ghost', run: () => { if (ctl) ctl.abort(); else close(); } });
      const go = uiButton({ label: 'Make the link', icon: 'link', kind: 'primary', run: (e, b) => {
        if (!name.value.trim()) { name.focus(); return; }
        ctl = new AbortController();
        _frDo(b, async () => {
          const r = await grApi('/create', { name: name.value, about: about.value, welcome: welcome.value, mode: o.input.checked ? 'open' : 'approve' }, { signal: ctl.signal });
          await grLoad(true);
          el.textContent = '';
          el.appendChild(_grStep(2, 2, `${r.name} is ready. Share this link.`));
          _grShareBody(el, r, r.id);
          const done = _frEl('div', 'fr-add-acts');
          done.appendChild(uiButton({ label: 'Done', kind: 'primary', run: () => { close(); setView('friends:groups:' + r.id); } }));
          el.appendChild(done);
          return r;
        }, null, { what: 'start the group', retry: false }).finally(() => { ctl = null; });
      } });
      acts.append(go, stop);
      el.appendChild(acts);
      name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go.click(); } };
    },
  });
}
/* ---------- sharing ---------- */
function _grShareBody(el, r, gid) {
  const link = String(r.link || ''), message = String(r.message || `Join on Freeflo: ${link}`);
  const out = _frEl('div', 'fr-invite-out');
  if (typeof syncQrSvg === 'function') {
    try {
      const q = _frEl('div', 'fr-qr');
      const svg = syncQrSvg(link, 168);
      svg.setAttribute('aria-label', 'QR code of the group link');
      q.appendChild(svg);
      q.appendChild(_frEl('span', 'muted fr-small', 'Scan with a phone camera'));
      out.appendChild(q);
    } catch (e) { /* too long for a QR code here: the link and the message still work */ }
  }
  const side = _frEl('div', 'fr-invite-side');
  const ta = document.createElement('textarea');
  ta.className = 'input fr-invite-text'; ta.readOnly = true; ta.rows = 3; ta.value = link;
  ta.setAttribute('aria-label', 'Group link'); ta.onfocus = () => ta.select();
  side.appendChild(ta);
  const a = _frEl('div', 'fr-add-acts');
  a.appendChild(uiButton({ label: 'Copy link', icon: 'copy', kind: 'primary', run: () => copyText(link, 'group link') }));
  a.appendChild(uiButton({ label: 'Copy message', icon: 'message-circle', run: () => copyText(message, 'message') }));
  if (navigator.share) a.appendChild(uiButton({ label: 'Share', icon: 'send', run: () => navigator.share({ title: r.name || 'Group', text: message }).catch(() => {}) }));
  a.appendChild(uiButton({ label: 'Print a poster', icon: 'printer', run: () => _grPoster(r) }));
  side.appendChild(a);
  side.appendChild(_frEl('p', 'muted fr-small', r.mode === 'open'
    ? `Anyone with this link joins straight away, and can read the group.${r.exp ? (r.exp <= Date.now() ? ' It has run out: choose a new date in the settings.' : ` It runs out ${_grDays(r.exp)}.`) : ''}${r.maxUses ? ` ${r.uses || 0} of ${r.maxUses} places used.` : ''}`
    : 'Share it as widely as you like. Nobody gets in until you let them in. People without Freeflo see how to get it first.'));
  out.appendChild(side);
  el.appendChild(out);
  if (gid) {
    const c = _frEl('div', 'gr-code');
    const paint = (code) => {
      c.textContent = '';
      if (code) {
        const v = _frEl('div', 'fr-live-code', code.slice(0, 2) + ' ' + code.slice(2));
        v.setAttribute('aria-label', 'Group code: ' + code.split('').join(' '));
        c.appendChild(v);
        c.appendChild(_frEl('p', 'muted fr-small', 'People already connected through the same place can type these 4 letters in Join a group. It never lets anyone straight in: you always approve them.'));
        c.appendChild(uiButton({ label: 'Stop the code', size: 'sm', kind: 'ghost', run: (e, b) => _frDo(b, async () => { await grApi('/code', { id: gid, on: false }); paint(null); }, 'Code stopped', 'stop the code') }));
      } else {
        const l = _frEl('p', 'muted fr-small', 'For people already connected through the same place: a 4-letter code to type instead of a link. It only lets them ask, and you always approve them.');
        c.appendChild(l);
        c.appendChild(uiButton({ label: 'Make a short code', icon: 'key-round', size: 'sm', kind: 'ghost', run: (e, b) => _frDo(b, async () => { const k = await grApi('/code', { id: gid, on: true }); paint(k.code); }, null, 'make a code') }));
      }
    };
    paint(r.code || null);
    el.appendChild(c);
  }
}
function grShareDialog(id, ready) {
  openDialog({
    title: 'Share the link', size: 'md', fixed: true, resizeKey: 'w560',
    body(el, close) {
      el.classList.add('gr-dialog');
      const fill = (r) => { el.textContent = ''; _grShareBody(el, r, id); };
      if (ready) { fill(ready); return; }
      const w = _frEl('div', 'fr-loading'); w.innerHTML = icon('loader-circle', 'i-lg fr-spin'); w.appendChild(_frEl('span', null, 'Getting the link…'));
      el.appendChild(w);
      grApi('/share', { id }).then(fill).catch((e) => { el.textContent = ''; el.appendChild(_frEl('p', null, netErrorMessage(e))); el.appendChild(uiButton({ label: 'Close', run: close })); });
    },
    actions: [{ label: 'Done' }],
  });
}
/** A sheet to pin up: the group's name, the QR code, what to do. */
function _grPoster(r) {
  const sheet = _frEl('div', 'gr-print-sheet');
  sheet.appendChild(_frEl('h1', null, r.name || 'Join our group'));
  sheet.appendChild(_frEl('p', 'gr-print-lead', 'Join us on Freeflo'));
  try { const svg = syncQrSvg(String(r.link), 320); sheet.appendChild(svg); } catch (e) { /* the link below still works */ }
  sheet.appendChild(_frEl('p', null, 'Point your phone camera at this square, or type the address below into a browser, and follow the steps.'));
  sheet.appendChild(_frEl('p', 'gr-print-link', String(r.link)));
  sheet.appendChild(_frEl('p', null, r.mode === 'open' ? 'In the group, people see only your name, picture and status.' : 'Someone will let you in. In the group, people see only your name, picture and status.'));
  document.body.appendChild(sheet); document.body.classList.add('gr-printing');
  const done = () => { document.body.classList.remove('gr-printing'); sheet.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 60000);
}

/* ---------- join a group ---------- */
function grJoinDialog(prefill) {
  _fr.opened = true;
  openDialog({
    title: 'Join a group', size: 'md', fixed: true, resizeKey: 'w560',
    body(el, close) {
      el.classList.add('gr-dialog');
      const step1 = (value) => {
        el.textContent = '';
        el.appendChild(_grStep(1, 2, 'Paste the link'));
        const ta = _grTextarea(value || '', { rows: 3, max: 2000, placeholder: 'https://…/g#ODG1.…' });
        ta.classList.add('fr-invite-text'); ta.spellcheck = false; ta.setAttribute('autofocus', ''); ta.setAttribute('aria-label', 'Group link or code');
        el.appendChild(ta);
        el.appendChild(_frEl('p', 'muted fr-small', 'Got a 4-letter code instead? Type it here. Codes work for people already connected through the same place; a link works for everyone.'));
        const acts = _frEl('div', 'fr-add-acts');
        let ctl = null;
        const stop = uiButton({ label: 'Cancel', kind: 'ghost', run: () => { if (ctl) ctl.abort(); else close(); } });
        const go = uiButton({ label: 'Next', icon: 'arrow-right', kind: 'primary', run: (e, b) => {
          const text = ta.value.trim();
          if (!text) { ta.focus(); return; }
          ctl = new AbortController();
          _frDo(b, async () => { const p = await grApi('/preview', { text }, { signal: ctl.signal }); step2(text, p); }, null, { what: 'read that link', retry: false }).finally(() => { ctl = null; });
        } });
        acts.append(go, stop);
        el.appendChild(acts);
        // A link that arrives by itself (the relay's page, a paste elsewhere) waits for Next: nothing is asked of anyone until then.
      };
      const step2 = (text, p) => {
        el.textContent = '';
        el.appendChild(_grStep(2, 2, 'Is this the group you meant?'));
        const card = _frEl('div', 'card gr-preview');
        card.appendChild(_grLogoEl(p, 56));
        const t = _frEl('div', 'gr-hero-t');
        t.appendChild(_frEl('h3', null, p.name));
        t.appendChild(_frEl('span', 'muted fr-small', `Run by ${p.ownerName || 'someone'}${p.count ? ` · ${p.count} ${p.count === 1 ? 'person' : 'people'}` : ''}`));
        t.appendChild(_frEl('span', 'muted fr-small', `Kept on ${p.host}`));
        if (p.about) t.appendChild(_frEl('p', 'gr-pre fr-small', p.about));
        card.appendChild(t);
        el.appendChild(card);
        if (p.already) {
          el.appendChild(_frEl('p', null, p.already === 'member' ? "You're already in this group." : 'You already asked to join this group.'));
          const a = _frEl('div', 'fr-add-acts');
          a.appendChild(uiButton({ label: 'Open it', kind: 'primary', run: () => { close(); setView('friends:groups:' + p.gid); } }));
          el.appendChild(a);
          return;
        }
        if (p.via === 'code') el.appendChild(_frEl('p', 'fr-small', `A code can't prove this is the right group. Ask ${p.ownerName || 'the person who gave it to you'} to read you their check pictures, or ask for the link instead.`));
        el.appendChild(_frEl('p', 'fr-small', `${p.ownerName || 'They'}'s check pictures, if you want to be sure it's them:`));
        el.appendChild(_grPicturesEl(p.ownerFp, 'Their check pictures'));
        const nameIn = _grInput(p.suggested || '', { max: 40 });
        el.appendChild(_grField('Your name in this group', nameIn, 'Only this name, your picture and your status are shown. Nothing else is shared.'));
        const facts = [];
        facts.push(p.mode === 'open' ? 'You join straight away.' : `${p.ownerName || 'They'} will see your name and decide. You get nothing from the group until then, and they get nothing else from you.`);
        el.appendChild(_frEl('p', 'muted fr-small', facts.join(' ')));
        // Two yeses that are this person's own: visible, and each can be turned off here and now.
        const check = (label, hint, on) => { const l = _frEl('label', 'fr-switch'); const c = document.createElement('input'); c.type = 'checkbox'; c.checked = on; l.append(c, _frEl('span', null, label)); el.appendChild(l); if (hint) el.appendChild(_frEl('p', 'muted fr-small', hint)); return c; };
        const autoBox = p.auto ? check('Accept friend requests from people here by themselves', 'This group makes people friends automatically. They would see only the name you use here, and nothing else until you choose.', true) : null;
        const homeBox = p.firstConnection ? check(`Also use ${p.host} for friend requests`, 'You have no connection of your own yet. Without this you can still be in the group, but not make friends from it. It only carries sealed messages.', true) : null;
        const acts = _frEl('div', 'fr-add-acts');
        let ctl = null;
        const stop = uiButton({ label: 'Cancel', kind: 'ghost', run: () => { if (ctl) ctl.abort(); else close(); } });
        const back = uiButton({ label: 'Back', icon: 'arrow-left', kind: 'ghost', run: () => step1('') });
        const go = uiButton({ label: p.mode === 'open' ? 'Join' : 'Ask to join', icon: 'log-in', kind: 'primary', disabled: !!p.full, run: (e, b) => {
          ctl = new AbortController();
          _frDo(b, async () => {
            const r = await grApi('/join', { text, name: nameIn.value, home: !!(homeBox && homeBox.checked), auto: !!(autoBox && autoBox.checked) }, { signal: ctl.signal });
            close();
            await grLoad(true);
            await friendsLoad(true).catch(() => {});
            setView('friends:groups:' + r.id);
            _grRepaint();
            return r;
          }, (r) => (r.status === 'member' ? `You're in ${r.name}` : `Asked. You'll see ${r.name} here once you're let in.`), { what: 'join', retry: false }).finally(() => { ctl = null; });
        } });
        acts.append(go, back, stop);
        el.appendChild(acts);
        if (p.full) el.appendChild(_frEl('p', 'fr-small', 'This group is full, or its link has been used as many times as allowed. Ask the person who sent it.'));
      };
      step1(prefill || '');
    },
  });
}
/* A link that came through the relay's page (#group-join=...): opens Join, and asks before anything happens. */
function _grFromHash() {
  const m = /^#group-join=(.+)$/.exec(location.hash || '');
  if (!m) return null;
  try { return decodeURIComponent(m[1]).slice(0, 2000); } catch (e) { return null; }
}
const _GR_BOOT_LINK = _grFromHash();   // read now: the first paint puts the view in the hash
function _grOpenLink(text) {
  if (!text || !/ODG1\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{6}/.test(text)) return;
  try { history.replaceState(history.state, '', '#view=friends:groups'); } catch (e) { /* the hash stays until the next view */ }
  try { setView('friends:groups'); grJoinDialog(text); } catch (e) { console.error('[groups] join link', e); }
}
window.addEventListener('hashchange', () => _grOpenLink(_grFromHash()));
if (_GR_BOOT_LINK) setTimeout(() => _grOpenLink(_GR_BOOT_LINK), 2500);
registerCommand({ id: 'groups-start', label: 'Start a group', icon: 'sparkles', keywords: 'group organisation company club link connect everyone', run: () => { setView('friends:groups'); grLoad(true).then(() => grStartDialog()).catch((e) => toastError('open Groups', e)); } });
registerCommand({ id: 'groups-join', label: 'Join a group', icon: 'log-in', keywords: 'group join link code organisation company club', run: () => { setView('friends:groups'); grJoinDialog(); } });
/* Back from another window or tab: whatever came meanwhile. */
document.addEventListener('visibilitychange', () => { if (!document.hidden) grOnEvent(null); });
/* Keep the tab's badge in step without opening it. */
setTimeout(function _grBoot() {
  if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) { setTimeout(_grBoot, 30000); return; }
  grLoad(true).then(_grRepaint).catch(() => {});
  // The server tells open pages when something changes. In case that line is down, the open tab also looks now and then (it only asks this computer).
  let last = '';
  setInterval(() => {
    if (document.hidden) return;
    const open = /^friends:groups(:|$)/.test(String(state.view || ''));
    const id = _frGroupId(state.view);
    Promise.all([grLoad(true), open && id ? grOne(id, true) : null]).then(([list, one]) => {
      const sig = JSON.stringify([list && list.groups, one]);
      if (sig !== last) { last = sig; _grRepaint(); }
    }).catch(() => {});
  }, 20000);
}, 5000);
