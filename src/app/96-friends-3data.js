/* ============================================================
   FRIENDS 2.19.3: browse what friends share with you, read-only (owner: Friends).
   The user: "it's so difficult to see all my friends' data ... browse their data as easily as I see my own,
   through the Friends tab, or by clicking some button within Money, Calendar, Tasks".

   Only what each friend CHOSE to share arrives here (their per-friend levels, 98-perms-*.js; the copy is
   friends/received/<id>.json). Nothing is asked of a friend and nothing is written: it is read with
   friendsDataLoad (98-perms-1core.js), shown with the same look as your own pages, and the friend's
   text goes in with textContent only (it is untrusted: never a prompt, an AI call or an action).

     Friends > Shared with me   #view=friends:data | friends:data:<id>   a list of the friends who share
                                something, then their areas as pills: Tasks / Calendar / Money / Places / Memories
     "Whose" in the page header Tasks (Today, Tomorrow, Week, All, No date), Calendar and Money: Mine (default)
                                or a friend who shares that area; a banner says whose it is, Back to mine
     overlays                   "Show friends' tasks" (Tasks), "Show friends' events" (Calendar): the existing
                                Together layer prefs (99-together-2layers.js); "Show friends' money summary"
                                (Money; only while someone shares money)
     a friend's page            "View their data" opens their areas here

   API: fdOpen(friendId, area?), fdWhoseFriend(page), fdSetWhose(page, friendId), fdSharers(scope), fdWhosePaint().
   ============================================================ */
const _FD_AREAS = Object.freeze([['tasks', 'Tasks', 'square-check'], ['calendar', 'Calendar', 'calendar'], ['money', 'Money', 'wallet'], ['locations', 'Places', 'map-pin'], ['memories', 'Memories', 'book-open']]);
const _FD_TASK_VIEWS = Object.freeze(['today', 'tomorrow', 'week', 'all', 'no-date']);
const _FD_WHO_LABEL = Object.freeze({ tasks: 'tasks', calendar: 'events', money: 'money summary' });
const _fd = { docs: new Map(), sig: '', sel: '', area: '', whose: { tasks: '', calendar: '', money: '' }, calFrom: '', inited: false, timer: 0 };
function _fdEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function _fdAreaDef(scope) { return _FD_AREAS.find(a => a[0] === scope) || [scope, scope, 'eye']; }

/* ---------- what friends share (each friend's received copy, loaded once and kept five minutes) ---------- */
/** Once, at the first use (the perms module is evaluated after this one): hear about new shares. */
function fdInit() {
  if (_fd.inited) return;
  _fd.inited = true;
  try { onFriendsData((fid) => { if (fid) _fd.docs.delete(fid); fdRepaintSoon(); }); } catch (e) { console.error('[friends data] subscribe', e); }
  try { liveRefresh(/^friends\/received\//, (rels) => { for (const r of rels) { const id = String(r).slice(17).replace(/\.json$/, ''); _fd.docs.delete(id); } fdRepaintSoon(); }); } catch (e) { /* no live files */ }
}
function fdFriends() { return typeof Friends !== 'undefined' && Friends && typeof Friends.list === 'function' ? Friends.list() : []; }
/** {scope: {mode, at, got, until?, data}} of one friend, or null until the first answer is in. */
function fdDoc(fid) {
  let c = _fd.docs.get(fid);
  if (!c) { c = { scopes: null, tried: 0, busy: false }; _fd.docs.set(fid, c); }
  if (!c.busy && Date.now() - c.tried > (c.scopes ? 300000 : 20000)) {
    c.busy = true; c.tried = Date.now();
    friendsDataLoad(fid).then((doc) => { c.scopes = doc && doc.scopes && typeof doc.scopes === 'object' ? doc.scopes : {}; }).catch(() => { if (!c.scopes) c.scopes = {}; })
      .finally(() => { c.busy = false; fdRepaintSoon(); });
  }
  return c.scopes;
}
/** One friend's share in one scope ({mode, at, got, until?, data}), or null. */
function fdShare(fid, scope) {
  const s = fdDoc(fid), r = s && s[scope];
  return r && r.data && typeof r.data === 'object' && (!r.until || r.until > Date.now()) ? r : null;
}
function fdAreasOf(fid) { return _FD_AREAS.filter(a => fdShare(fid, a[0])); }
/** The friends who share this scope with you right now. */
function fdSharers(scope) { return fdFriends().filter(f => fdShare(f.id, scope)); }
function fdLoading() { return fdFriends().some(f => fdDoc(f.id) === null); }
function fdName(fid) { return typeof permsFriendName === 'function' ? permsFriendName(fid) : 'Your friend'; }
function _fdSig() {
  const out = [];
  for (const f of fdFriends()) { const s = fdDoc(f.id); out.push(f.id + ':' + (s ? Object.keys(s).map(k => k + (s[k].mode || '') + (s[k].got || '')).join(',') : '?')); }
  return out.join('|');
}
/** A load finished or a share arrived: repaint what shows friends' data, only when something changed. */
function fdRepaintSoon() {
  clearTimeout(_fd.timer);
  _fd.timer = setTimeout(() => {
    const sig = _fdSig();
    if (sig === _fd.sig) return;
    _fd.sig = sig;
    const v = String(state.view || '');
    try {
      if (/^friends:data(:|$)/.test(v) && typeof _frRepaint === 'function') _frRepaint();
      else if (typeof render === 'function' && (v === 'finance' || v === 'calendar' || String(v).startsWith('calendar:') || _FD_TASK_VIEWS.includes(v))) render();
    } catch (e) { console.error('[friends data] repaint', e); }
  }, 150);
}
/** Open a friend's shared data in Friends. */
function fdOpen(fid, area) {
  if (fid) _fd.sel = fid;
  if (area) _fd.area = area;
  const to = fid ? 'friends:data:' + fid : 'friends:data';
  if (state.view === to && typeof _frRepaint === 'function') _frRepaint(); else setView(to);
}

/* ---------- the pieces: a banner, an empty state, one renderer per area ---------- */
function _fdLevel(scope, r) { return typeof _pmModeLabel === 'function' ? _pmModeLabel(scope, r.mode) : r.mode; }
/** "Sam's shared tasks · read-only", what they share, how fresh; Back to mine when it sits on a page of yours. */
function fdBanner(fid, scope, r, o) {
  o = o || {};
  const def = _fdAreaDef(scope), name = fdName(fid);
  const b = _fdEl('div', 'fd-banner'); b.setAttribute('role', 'note');
  const ic = _fdEl('span', 'fd-banner-ic'); ic.innerHTML = icon('eye', 'i-sm'); b.appendChild(ic);
  const t = _fdEl('div', 'fd-banner-t');
  t.appendChild(_fdEl('b', null, `${name}'s shared ${def[1].toLowerCase()} · read-only`));
  if (r) {
    const win = r.until ? 'until ' + _pmDay(new Date(r.until).toISOString().slice(0, 10)) : '';
    t.appendChild(_fdEl('span', 'muted', ['They share: ' + _fdLevel(scope, r), r.got || r.at ? 'updated ' + _pmAgo(r.got || r.at) : '', win].filter(Boolean).join(' · ')));
  }
  b.appendChild(t);
  if (o.back) b.appendChild(uiButton({ label: 'Back to mine', icon: 'arrow-left', size: 'sm', run: o.back }));
  return b;
}
/** Nothing from this friend in this area: say whose choice it is and where yours is. */
function fdEmptyEl(fid, scope, o) {
  const def = _fdAreaDef(scope), name = fdName(fid);
  const el = _fdEl('div');
  mountEmptyState(el, { icon: def[2], compact: true, title: `${name} hasn't shared ${def[1].toLowerCase()} with you`,
    text: `What ${name} shares is their choice, in their own Privacy settings; it appears here by itself, read-only. What you share with ${name} is the Privacy panel on their page.`,
    actions: [{ label: `${name}'s page`, icon: 'users', run: () => setView('friends:' + fid) }].concat(o && o.back ? [{ label: 'Back to mine', icon: 'arrow-left', run: o.back }] : []) });
  return el;
}
function _fdM(meta, cls, ic, text, title) {
  const s = _fdEl('span', 'm ' + cls);
  s.innerHTML = icon(ic);
  if (text !== '' && text != null) s.appendChild(_fdEl('span', null, text));
  if (title) s.title = title;
  meta.appendChild(s);
  return s;
}
/** One shared task, in the look of your own rows (30-task-row.js), without anything to click. */
function fdTaskRow(t) {
  const done = t.status === 'done', doing = t.status === 'doing';
  const el = _fdEl('div', 'task fd-ro' + (done ? ' done' : '') + (doing ? ' doing' : '')); el.setAttribute('role', 'listitem');
  const cb = _fdEl('span', 'checkbox ' + (t.priority || 'p0') + (doing ? ' doing' : '') + (done ? ' done' : '')); cb.setAttribute('aria-hidden', 'true');
  if (done) cb.innerHTML = icon('check', 'i-xs');
  el.appendChild(cb);
  const body = _fdEl('div', 't-body'), tr = _fdEl('div', 't-title-row');
  tr.appendChild(_fdEl('span', 't-title', t.title || '(no title)'));
  body.appendChild(tr);
  const meta = _fdEl('div', 't-meta');
  if (t.stream) {
    const sm = _fdEl('span', 'stream fd-stream'); sm.style.setProperty('--c', safeColor(t.color, '#868a94'));
    sm.append(_fdEl('i', 'fd-dot'), _fdEl('span', null, t.stream));
    meta.appendChild(sm);
  }
  if (t.subTotal) _fdM(meta, 'sub-count' + (t.subDone === t.subTotal ? ' all-done' : ''), 'list-checks', `${t.subDone || 0}/${t.subTotal}`, `${t.subDone || 0} of ${t.subTotal} subtasks done`);
  if (doing) _fdM(meta, 't-planned', 'circle-dot', 'In progress');
  if (done && t.doneOn) _fdM(meta, 't-closed', 'check', 'Done ' + _pmDay(t.doneOn));
  body.appendChild(meta);
  el.appendChild(body);
  const right = _fdEl('div', 't-right');
  if (Array.isArray(t.tags) && t.tags.length) {
    const chips = _fdEl('span', 'chips t-tags');
    for (const g of t.tags.slice(0, 2)) chips.appendChild(_fdEl('span', 'chip t-tag', g));
    if (t.tags.length > 2) chips.appendChild(_fdEl('span', 'chip chip-more', '+' + (t.tags.length - 2)));
    right.appendChild(chips);
  }
  const d = t.due ? daysUntil(t.due) : null;
  const ds = _fdEl('span', 'due-stamp ' + (done || d === null ? 'none' : d < 0 ? 'overdue' : d === 0 ? 'today' : d <= 3 ? 'soon' : ''), done || !t.due ? '' : dueLabel(t.due) + (t.time && d !== 0 ? ' ' + t.time : d === 0 && t.time ? ' ' + t.time : ''));
  right.appendChild(ds);
  el.appendChild(right);
  return el;
}
function _fdInView(t, view, today) {
  if (!view || typeof _tgInDay !== 'function') return true;
  return _tgInDay({ due: t.due || null, status: t.status }, view, today);
}
/** Their shared tasks in groups as your own lists have them (late, today, coming up, no date, done). view: a Tasks view to match (Today, Week...). */
function fdTasksEl(fid, r, view) {
  const today = todayStr();
  const items = Array.isArray(r.data.items) ? r.data.items : [];
  let open = items.filter(t => t.status !== 'done'), done = items.filter(t => t.status === 'done');
  if (view) { open = open.filter(t => _fdInView(t, view, today)); if (view !== 'all') done = []; }
  const byDue = (a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999')) || String(a.time || '').localeCompare(String(b.time || '')) || String(a.title || '').localeCompare(String(b.title || ''));
  const groups = [
    ['late', 'Late', open.filter(t => t.due && t.due < today).sort(byDue), true],
    ['today', 'Today', open.filter(t => t.due === today || (!t.due && t.status === 'doing')).sort(byDue), false],
    ['soon', 'Coming up', open.filter(t => t.due && t.due > today).sort(byDue), false],
    ['nodate', 'No date', open.filter(t => !t.due && t.status !== 'doing').sort(byDue), false],
    ['done', 'Done recently', done.sort((a, b) => String(b.doneOn || '').localeCompare(String(a.doneOn || ''))), false],
  ].filter(g => g[2].length);
  const wrap = _fdEl('div', 'task-view fd-tasks');
  if (!groups.length) { wrap.appendChild(emptyLine(items.length ? `Nothing from ${fdName(fid)} for this view.` : `${fdName(fid)} has no tasks to show you right now.`)); return wrap; }
  for (const [key, label, list, danger] of groups) {
    const g = _fdEl('section', 'task-group' + (danger ? ' danger' : '')); g.dataset.group = key;
    const h = _fdEl('div', 'tg-h'); h.append(_fdEl('span', 'tg-t', label), _fdEl('span', 'count', String(list.length)));
    g.appendChild(h);
    const pl = pagedList({ items: list, pageSize: 12, cls: 'tg-b', render: fdTaskRow });
    pl.querySelector('.pg-list-b').setAttribute('role', 'list');
    g.appendChild(pl);
    wrap.appendChild(g);
  }
  return wrap;
}
/** Their shared calendar as the agenda (28-day style rows of your own calendar), on YOUR clock. */
function fdCalendarEl(fid, r, o) {
  o = o || {};
  const data = r.data, today = todayStr();
  const tz = typeof data.tz === 'string' && typeof Clock !== 'undefined' && Clock.valid(data.tz) ? data.tz : '';
  const from = o.from || today, days = o.days || 14;
  const rows = (Array.isArray(data.items) ? data.items : []).map(e => _pmCalRow(e, tz));
  const loc = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
  const wrap = _fdEl('div', 'agd fd-agd');
  let shown = 0;
  for (let i = 0; i < days; i++) {
    const iso = Clock.addDays(from, i);
    const list = rows.filter(x => x.date === iso).sort((a, b) => (a.e.allDay ? '' : a.key).localeCompare(b.e.allDay ? '' : b.key));
    if (!list.length && iso !== today) continue;
    shown++;
    const d = new Date(iso + 'T12:00:00Z');
    const sec = _fdEl('section', 'agd-day' + (iso === today ? ' today' : '') + (iso < today ? ' past' : ''));
    const h = _fdEl('div', 'agd-h');
    const w = _fdEl('span', 'agd-w');
    w.append(_fdEl('b', null, iso === today ? 'Today' : iso === Clock.addDays(today, 1) ? 'Tomorrow' : d.toLocaleDateString(loc, { weekday: 'long', timeZone: 'UTC' })),
      _fdEl('span', null, d.toLocaleDateString(loc, { month: 'long', timeZone: 'UTC' })));
    h.append(_fdEl('span', 'agd-n', String(Number(iso.slice(8, 10)))), w);
    sec.appendChild(h);
    const l = _fdEl('div', 'agd-l');
    if (!list.length) l.appendChild(_fdEl('div', 'agd-empty', 'Nothing scheduled'));
    for (const x of list) {
      const e = x.e;
      const row = _fdEl('div', 'agd-row fd-ev' + (e.title ? '' : ' fd-busy') + (e.allDay ? ' is-allday' : ''));
      row.appendChild(_fdEl('time', null, e.allDay ? 'All day' : x.start));
      row.appendChild(_fdEl('span', 'bar'));
      const b = _fdEl('div', 'agd-b'), t = _fdEl('div', 't');
      t.appendChild(_fdEl('span', null, e.title || 'Busy'));
      b.appendChild(t);
      const meta = [!e.allDay && x.end ? 'until ' + x.end : '', x.their, x.until && x.until !== x.date ? 'until ' + _pmDay(x.until) : '', e.location || '', e.calendar || '', e.people ? e.people + (e.people === 1 ? ' person' : ' people') : '', e.repeating ? 'repeats' : ''].filter(Boolean);
      if (meta.length) { const s = _fdEl('div', 's'); s.appendChild(_fdEl('span', null, meta.join(' · '))); b.appendChild(s); }
      row.appendChild(b);
      l.appendChild(row);
    }
    sec.appendChild(l);
    wrap.appendChild(sec);
  }
  if (!shown) wrap.appendChild(emptyLine(`${fdName(fid)} has nothing in the calendar for these two weeks.`));
  return wrap;
}
/** Their money: a summary in words (a meter for the budget), or the full totals with categories. */
function fdMoneyEl(fid, r) {
  const d = r.data, cur = d.currency;
  const wrap = _fdEl('div', 'fd-money');
  if (r.mode === 'summary') {
    const c = _fdEl('section', 'card fd-sum is-' + (d.status || 'none'));
    c.appendChild(_fdEl('div', 'fd-sum-word', d.word || 'Nothing to say yet'));
    if (typeof d.pct === 'number') {
      const m = _fdEl('div', 'fd-meter'); m.setAttribute('role', 'img'); m.setAttribute('aria-label', `${Math.round(d.pct)}% of the month's budget used so far`);
      const f = _fdEl('i'); f.style.width = Math.max(2, Math.min(100, d.pct)) + '%'; m.appendChild(f);
      c.appendChild(m);
    }
    const sub = [d.month || '', typeof d.pct === 'number' ? `${Math.round(d.pct)}% of the month's budget used so far` : ''].filter(Boolean).join(' · ');
    if (sub) c.appendChild(_fdEl('p', 'muted', sub));
    wrap.appendChild(c);
    return wrap;
  }
  const tiles = [['Spent so far', _pmMoney(d.spent, cur), d.lastMonthSameDay != null ? 'last month by now ' + _pmMoney(d.lastMonthSameDay, cur) : ''], ['Income this month', _pmMoney(d.income, cur), ''],
    ['In the accounts', _pmMoney(d.balance, cur), ''], ['Regular payments', _pmMoney(d.recurring, cur), 'a month'],
    ['This week', d.week ? _pmMoney(d.week.total, cur) : '', d.week && typeof d.week.usual === 'number' ? 'usually ' + _pmMoney(d.week.usual, cur) : '']].filter(x => x[1]);
  const grid = _fdEl('div', 'fd-kpis');
  for (const [k, v, s] of tiles) { const t = _fdEl('div', 'card fd-kpi'); t.append(_fdEl('span', 'fd-kpi-k', k), _fdEl('b', 'num fd-kpi-v', v)); if (s) t.appendChild(_fdEl('span', 'muted fd-kpi-s', s)); grid.appendChild(t); }
  if (tiles.length) wrap.appendChild(grid);
  const cats = Array.isArray(d.categories) ? d.categories : [];
  if (cats.length) {
    const sec = _fdEl('section', 'card fd-cats');
    sec.appendChild(secHead({ title: d.month ? 'By category · ' + d.month : 'By category' }));
    const max = Math.max(1, ...cats.map(c => Math.max(c.spent || 0, c.budget || 0)));
    for (const c of cats) {
      const row = _fdEl('div', 'fd-cat'), top = _fdEl('div', 'fd-cat-t');
      top.append(_fdEl('span', null, c.category || ''), _fdEl('span', 'num muted', _pmMoney(c.spent, cur) + (typeof c.budget === 'number' ? ' of ' + _pmMoney(c.budget, cur) : '')));
      const m = _fdEl('div', 'fd-meter'), f = _fdEl('i'); f.style.width = Math.max(2, Math.min(100, ((c.spent || 0) / max) * 100)) + '%';
      if (typeof c.budget === 'number' && c.budget > 0 && (c.spent || 0) > c.budget) m.classList.add('is-over');
      m.appendChild(f);
      row.append(top, m);
      sec.appendChild(row);
    }
    wrap.appendChild(sec);
  }
  if (!wrap.childNodes.length) wrap.appendChild(emptyLine(`${fdName(fid)} has no money numbers to show you yet.`));
  return wrap;
}
/** Places and memories keep the perms panel's list (98-perms-2ui.js permsRenderData), in a card. */
function fdListEl(scope, r) {
  const c = _fdEl('section', 'card fd-card');
  c.appendChild(permsRenderData(scope, r.mode, r.data));
  return c;
}
/** One area of one friend: the banner, then the data (or why there is none). o: {view, back, from}. */
function fdAreaEl(fid, scope, o) {
  o = o || {};
  const r = fdShare(fid, scope);
  const wrap = _fdEl('div', 'fd-area fd-area-' + scope);
  if (!r) {
    if (fdDoc(fid) === null) wrap.appendChild(emptyLine('Looking for what ' + fdName(fid) + ' shares…'));
    else wrap.appendChild(fdEmptyEl(fid, scope, o));
    return wrap;
  }
  wrap.appendChild(fdBanner(fid, scope, r, o));
  wrap.appendChild(scope === 'tasks' ? fdTasksEl(fid, r, o.view) : scope === 'calendar' ? fdCalendarEl(fid, r, o) : scope === 'money' ? fdMoneyEl(fid, r) : fdListEl(scope, r));
  return wrap;
}

/* ---------- Friends > Shared with me ---------- */
function _frTabData(root, view, d) {
  fdInit();
  const m = /^friends:data:([0-9a-f]{16})$/.exec(String(view || ''));
  if (m) { if (m[1] !== _fd.sel) _fd.area = ''; _fd.sel = m[1]; }
  const friends = fdFriends();
  if (!friends.length) {
    mountEmptyState(root, { icon: 'users', compact: true, title: 'No friends yet', text: 'When a friend shares their tasks, calendar, money, places or memories with you, you can browse them here, read-only.',
      actions: [{ label: 'Add a friend', icon: 'user-plus', primary: true, run: () => friendsAddDialog() }] });
    return;
  }
  const sharers = friends.filter(f => fdAreasOf(f.id).length);
  if (!sharers.length) {
    if (fdLoading()) { root.appendChild(emptyLine('Looking for what your friends share…')); return; }
    mountEmptyState(root, { icon: 'eye', compact: true, title: 'Nobody has shared anything with you yet',
      text: 'Each friend chooses what you can see: tasks, calendar, money, places or memories. When they do it shows up here by itself, read-only. You choose what you share with them in the Privacy panel on their page.',
      actions: [{ label: 'What friends can see of mine', icon: 'shield-check', run: () => setView('settings:privacy') }] });
    return;
  }
  const cur = sharers.find(f => f.id === _fd.sel) || sharers[0];
  _fd.sel = cur.id;
  const areas = fdAreasOf(cur.id);
  const area = areas.some(a => a[0] === _fd.area) ? _fd.area : areas[0][0];
  _fd.area = area;
  root.appendChild(masterDetail({
    label: 'Friends who share with you', listWidth: 256,
    list: (host) => {
      host.appendChild(secHead({ title: 'Shared with me' }));
      for (const x of sharers) {
        const as = fdAreasOf(x.id);
        host.appendChild(mdRow({ avatar: _frAvatarWrap(x, 30), title: friendName(x), sub: as.map(a => a[1]).join(' · '), badge: as.length, active: x.id === cur.id, tip: `${friendName(x)}'s shared data`,
          run: () => { if (x.id !== cur.id) { _fd.sel = x.id; _fd.area = ''; setView('friends:data:' + x.id); } } }));
      }
    },
    detail: () => fdFriendPane(cur, areas, area),
  }));
}
function fdFriendPane(f, areas, area) {
  const wrap = _fdEl('div', 'fd-pane');
  const head = _fdEl('div', 'fd-head');
  head.appendChild(_fdEl('h2', null, friendName(f)));
  head.appendChild(subTabs({ label: `${friendName(f)}'s shared areas`, active: area, tabs: areas.map(([id, label, ic]) => ({ id, label, icon: ic })),
    onChange: (id) => { _fd.area = id; _frRepaint(); } }));
  head.appendChild(_fdEl('span', 'spacer'));
  head.appendChild(uiButton({ label: `${friendName(f)}'s page`, icon: 'users', kind: 'ghost', size: 'sm', run: () => setView('friends:' + f.id) }));
  wrap.appendChild(head);
  wrap.appendChild(fdAreaEl(f.id, area, {}));
  return wrap;
}

/* ---------- "Whose": Mine or a friend, on Tasks, Calendar and Money ---------- */
/** The friend whose data this page shows now ('' = mine). A friend who is gone puts the page back to yours. */
function fdWhoseFriend(page) {
  const id = _fd.whose[page] || '';
  if (!id) return '';
  if (!fdFriends().some(f => f.id === id)) { _fd.whose[page] = ''; return ''; }
  return id;
}
function fdSetWhose(page, fid) {
  _fd.whose[page] = fid || '';
  if (typeof render === 'function') render();
}
function fdWhoseMenu(page, btn) {
  const scope = page, cur = fdWhoseFriend(page);
  const items = [{ label: 'Mine', icon: 'user', checked: !cur, run: () => fdSetWhose(page, '') }];
  const who = fdSharers(scope);
  if (who.length) items.push({ heading: `Friends who share ${_FD_WHO_LABEL[page]}` });
  for (const f of who) { const r = fdShare(f.id, scope); items.push({ label: friendName(f), icon: 'eye', hint: r ? _fdLevel(scope, r) : '', checked: cur === f.id, run: () => fdSetWhose(page, f.id) }); }
  if (!who.length) items.push({ label: `No friend shares ${_FD_WHO_LABEL[page]} with you yet`, disabled: true });
  items.push('sep', { label: 'Browse in Friends', icon: 'folder-open', run: () => fdOpen(cur || (who[0] && who[0].id) || '', scope) });
  openMenu(btn, items, { align: 'start' });
}
/** The small switch: "Mine" (or the friend's name) with a menu. */
function fdWhoseBtn(page) {
  const cur = fdWhoseFriend(page);
  const b = uiButton({ label: cur ? fdName(cur) : 'Mine', icon: cur ? 'eye' : 'user', kind: cur ? 'secondary' : 'ghost', size: 'sm', cls: 'fd-whose-btn' + (cur ? ' is-friend' : ''),
    tip: 'Whose ' + (page === 'tasks' ? 'tasks' : page === 'calendar' ? 'calendar' : 'money') + ' to show', aria: 'Whose data: ' + (cur ? fdName(cur) : 'mine'), run: (e, btn) => fdWhoseMenu(page, btn) });
  b.setAttribute('aria-haspopup', 'menu');
  const chev = document.createElement('span'); chev.innerHTML = icon('chevron-down', 'i-xs'); b.appendChild(chev.firstChild);
  return b;
}
function _fdCheck(label, on, set) {
  const l = _fdEl('label', 'fd-check');
  const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!on;
  i.onchange = () => set(i.checked);
  l.append(i, _fdEl('span', null, label));
  return l;
}
function _fdPref(k) { return typeof tgPref === 'function' ? !!tgPref(k) : false; }
function _fdSetPref(k, v) { if (typeof tgSetPref === 'function') tgSetPref(k, v); }
/** Calendar: the switch and "Show friends' events" at the start of the calendar's own header (41-calendar-section.js). */
function fdCalHeaderExtras(right) {
  fdInit();
  const cur = fdWhoseFriend('calendar'), who = fdSharers('calendar');
  if (!cur && !who.length) return;
  const box = _fdEl('div', 'fd-whose');
  box.appendChild(fdWhoseBtn('calendar'));
  if (!cur) box.appendChild(_fdCheck("Show friends' events", _fdPref('calendar'), (v) => _fdSetPref('calendar', v)));
  right.insertBefore(box, right.firstChild);
}
/** The shared header: the switch after the title on Tasks and Money (14-shell.js renderPageHeaderControls). */
function fdWhosePaint() {
  const head = document.getElementById('view-header');
  if (!head) return;
  const v = String(state.view || '');
  const page = _FD_TASK_VIEWS.includes(v) ? 'tasks' : v === 'finance' ? 'money' : '';
  let host = document.getElementById('view-whose'), box = document.getElementById('view-whose-box');
  if (!page) { if (host) host.remove(); if (box) box.remove(); return; }
  fdInit();
  const cur = fdWhoseFriend(page), who = fdSharers(page);
  if (!cur && !who.length) { if (host) host.remove(); if (box) box.remove(); return; }
  const showBox = page === 'money' && !cur && _fdPref('moneyBox');
  const key = JSON.stringify([page, cur, who.map(f => f.id + friendName(f)), cur ? fdName(cur) : '', page === 'tasks' ? _fdPref('layers') : _fdPref('moneyBox')]);
  if (!host) { host = _fdEl('div', 'fd-whose'); host.id = 'view-whose'; const t = document.getElementById('view-title'); if (t) t.insertAdjacentElement('afterend', host); else head.appendChild(host); }
  if (host.dataset.k !== key) {
    host.dataset.k = key;
    host.replaceChildren(fdWhoseBtn(page));
    if (!cur && page === 'tasks') host.appendChild(_fdCheck("Show friends' tasks", _fdPref('layers'), (v2) => _fdSetPref('layers', v2)));
    if (!cur && page === 'money') host.appendChild(_fdCheck("Show friends' money summary", _fdPref('moneyBox'), (v2) => _fdSetPref('moneyBox', v2)));
  }
  if (!showBox) { if (box) box.remove(); return; }
  if (!box) { box = _fdEl('div', 'fd-money-box'); box.id = 'view-whose-box'; head.appendChild(box); }
  box.replaceChildren();
  const label = _fdEl('span', 'fd-mb-h'); label.innerHTML = icon('wallet', 'i-sm'); label.appendChild(_fdEl('b', null, "Friends' money"));
  box.appendChild(label);
  for (const f of who) {
    const r = fdShare(f.id, 'money'); if (!r) continue;
    const d = r.data;
    const line = _fdEl('button', 'fd-mb-row'); line.type = 'button'; line.title = `Open ${friendName(f)}'s money`;
    line.append(_fdEl('b', null, friendName(f)), _fdEl('span', null, d.word || (r.mode === 'full' ? 'Spent ' + _pmMoney(d.spent, d.currency) + ' so far' : '')), ...(typeof d.pct === 'number' ? [_fdEl('span', 'muted', Math.round(d.pct) + '% of budget')] : []));
    line.onclick = () => fdSetWhose('money', f.id);
    box.appendChild(line);
  }
}

/* ---------- the pages in friend mode ---------- */
/** Tasks (renderTaskView, 31-task-views.js): the friend's shared tasks for this view, in place of yours. */
function fdTasksPage(main) {
  const fid = fdWhoseFriend('tasks');
  const vc = document.querySelector('.view-controls'); if (vc) vc.style.display = 'none';   // List / Board / Display are about your own tasks
  const page = _fdEl('div', 'fd-page'); main.appendChild(page);
  page.appendChild(fdAreaEl(fid, 'tasks', { view: state.view, back: () => fdSetWhose('tasks', '') }));
}
/** Calendar (_calBuild, 41-calendar-section.js): the friend's shared calendar as an agenda, with its own small header. null = yours. */
function fdCalendarPage() {
  const fid = fdWhoseFriend('calendar');
  if (!fid) return null;
  fdInit();
  const today = todayStr(), from = _fd.calFrom || today;
  const loc = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
  const lab = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const main = _fdEl('div', 'cal-main fd-calpage');
  const h = _fdEl('div', 'cal-h');
  const go = (iso) => { _fd.calFrom = iso === today ? '' : iso; render(); };
  h.appendChild(uiButton({ label: 'Today', kind: 'secondary', size: 'sm', run: () => go(today) }));
  h.appendChild(uiButton({ icon: 'chevron-left', kind: 'ghost', size: 'sm', aria: 'Previous two weeks', tip: 'Previous', run: () => go(Clock.addDays(from, -14)) }));
  h.appendChild(uiButton({ icon: 'chevron-right', kind: 'ghost', size: 'sm', aria: 'Next two weeks', tip: 'Next', run: () => go(Clock.addDays(from, 14)) }));
  const t = _fdEl('h1'); t.append(`${lab(from)} – ${lab(Clock.addDays(from, 13))} `, _fdEl('span', null, `${fdName(fid)}'s calendar`));
  h.appendChild(t);
  const r = _fdEl('div', 'cal-h-r'); r.appendChild(fdWhoseBtn('calendar')); h.appendChild(r);
  main.appendChild(h);
  const body = _fdEl('div', 'cal-body fd-calbody');
  body.appendChild(fdAreaEl(fid, 'calendar', { from, days: 14, back: () => { _fd.calFrom = ''; fdSetWhose('calendar', ''); } }));
  main.appendChild(body);
  return main;
}
/** Money (the finance section's mount, 65-finance-view.js): the friend's shared money in place of the Money tabs. */
function fdMoneyPage(container) {
  const fid = fdWhoseFriend('money');
  headerSubTabs(null);
  try { if (window.FinanceView && FinanceView.unmount) FinanceView.unmount(); } catch (e) { /* not mounted */ }
  const page = _fdEl('div', 'fd-page'); container.appendChild(page);
  page.appendChild(fdAreaEl(fid, 'money', { back: () => fdSetWhose('money', '') }));
}
