/* ============================================================
   TOGETHER: the hub (#view=together), a space's pages
   (#view=together:<id>[:tasks|board|plan|money|quests|dates|people|feed|garden]),
   a shared task's drawer, new spaces and invitations, and sharing one of
   your own tasks with a friend (task menu "Share with a friend…": it goes
   to their Inbox as "From <you>" to Accept or Decline, and waits in your
   Waiting list on them). Friend text: textContent only (tgEl).
   ============================================================ */
const TG_TABS = [
  ['tasks', 'Tasks', 'list-checks'], ['board', 'Board', 'columns-3'], ['plan', 'Plan together', 'notebook-pen'],
  ['money', 'Split costs', 'receipt'], ['quests', 'Quests', 'target'], ['dates', 'Dates', 'calendar-heart'],
  ['people', 'People', 'users'], ['feed', 'Feed', 'newspaper'],
  ['garden', 'Shared bed', 'sprout'],   // ── garden-social ── (2.18) the co-op bed: 94-garden-social-3bed.js (shown when it is there)
];


/** The shared page header's actions (14-shell.js headerActions): the hub's, or the open space's. */
function tgHeaderActions(view) {
  const parts = String(view || '').split(':');
  if (parts.length < 2) {
    const off = !tgChannel();
    const anchor = () => document.querySelector('#view-actions .view-act-more') || document.getElementById('view-actions');
    return {
      primary: { label: 'New space', icon: 'plus', disabled: off, run: () => tgNewSpaceDialog() },
      icons: [
        { icon: 'refresh-cw', label: 'Check with friends now', run: async () => { const r = await tgPost('/api/together/hello', {}); if (r) toast(r.asked ? `Asked ${r.asked} time${r.asked === 1 ? '' : 's'}: anything missing arrives in a moment` : 'Nothing to check yet', { icon: 'refresh-cw' }); tgLoadSoon(1500); } },
        { icon: 'settings', label: 'Together settings', run: (e, b) => tgSettingsMenu(b) },
      ],
      more: [
        { label: 'Find a time', icon: 'calendar-clock', disabled: off, run: () => tgFindTimeDialog({}) },
        { label: 'Focus together', icon: 'timer', disabled: off, run: () => tgFocusTogetherMenu(anchor()) },
      ],
    };
  }
  const sp = tgSpace(parts[1]);
  if (!sp || sp.status === 'invited' || !sp.value) return null;
  const owner = sp.value.meta && sp.value.meta.owner === tgMe() && sp.status === 'joined';
  return {
    primary: owner ? { label: 'Invite', icon: 'user-plus', run: () => tgInviteDialog(sp.id) } : null,
    icons: [{ icon: 'ellipsis', label: 'Space menu', run: (e, b) => tgSpaceMenu(b, sp) }],
    more: [{ label: 'Find a time', icon: 'calendar-clock', run: () => tgFindTimeDialog({ space: sp.id }) }],
  };
}

/* ---------- the hub ---------- */
function tgRenderHub(root) {
  const sub = document.getElementById('view-subtitle');
  if (sub) sub.textContent = tgChannel() ? `${tgSpaces().length} shared space${tgSpaces().length === 1 ? '' : 's'}` : '';
  // New space, Find a time, Focus together, the refresh and the settings live in the shared page header (tgHeaderActions below).
  root.appendChild(tgSpacesPane({}));
}
/**
 * Your shared spaces as a list and the one you picked beside it (2.19, lean UI): who is waiting for you first, then
 * the spaces (masterDetail), then what spans them (coming up, challenges, the ones you left). The hub
 * (#view=together) shows it and so does Friends > Shared (o.embedded). Picking a space swaps the right side only.
 */
function tgSpacesPane(o) {
  o = o || {};
  const pane = tgEl('div', 'tg-pane');
  if (!tgHas() || _tg.data.failed) { pane.appendChild(tgWaitEl('your spaces')); return pane; }
  if (!tgChannel()) {
    const box = tgEl('div', 'tg-card tg-intro');
    box.innerHTML = `<div class="tg-intro-ic">${icon('users')}</div>`;
    const t = tgEl('div', 'tg-intro-t');
    t.append(tgEl('h3', '', 'Do things together with friends'),
      tgEl('p', 'muted', 'Shared lists and boards, tasks you hand to each other, trips, split costs, quests and challenges. First add a friend: everything between you is end-to-end encrypted, and nothing a friend sends ever changes your own tasks without your say-so.'));
    const go = tgBtn(o.embedded ? 'Add a friend' : 'Open Friends', { primary: true, icon: 'user-plus', run: () => {
      if (o.embedded && typeof friendsAddDialog === 'function') friendsAddDialog();
      else if (typeof sectionFor === 'function' && sectionFor('friends')) setView('friends');
      else toast('Friends is not on this computer yet: update OpenDash (Settings > Updates).', { kind: 'warn' });
    } });
    t.appendChild(go);
    box.appendChild(t);
    pane.appendChild(box);
  }
  // Invitations and requests first: they wait for you.
  const inv = tgInvites(), req = tgRequests();
  if (inv.length || req.length) {
    const sec = tgSection(pane, 'Waiting for you', 'inbox', inv.length + req.length);
    for (const s of inv) sec.appendChild(tgInviteCard(s));
    for (const r of req) sec.appendChild(tgRequestRow(r.sp, r.it));
  }
  if (typeof tgFocusStrip === 'function') { const f = tgFocusStrip(); if (f) pane.appendChild(f); }
  const sps = tgSpaces();
  if (!sps.length) {
    const sec = tgSection(pane, 'Your spaces', 'layout-grid', 0);
    sec.appendChild(tgEl('p', 'muted tg-pad', tgChannel() ? 'No shared spaces yet. Make one: a shopping list with your housemates, a board for a project, a party with quests, a trip.' : 'Your shared spaces will show here.'));
    if (tgChannel()) {
      const ideas = tgEl('div', 'tg-ideas');
      for (const [kind, name] of [['list', 'Groceries'], ['board', 'House jobs'], ['trip', 'Weekend away'], ['party', 'Study buddies'], ['house', 'Our flat']]) {
        ideas.appendChild(tgBtn(name, { icon: TG_KIND_ICON[kind], run: () => tgNewSpaceDialog({ kind, name }) }));
      }
      sec.appendChild(ideas);
    }
  } else {
    let cur = sps.find(x => x.id === _tg.sel) || sps[0];
    _tg.sel = cur.id;
    const rows = new Map();
    const pick = (id) => {
      const sp = sps.find(x => x.id === id);
      if (!sp || sp.id === cur.id) return;
      cur = sp; _tg.sel = id;
      for (const [rid, b] of rows) { b.classList.toggle('on', rid === id); if (rid === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }
      md.mdSet(tgSpaceSummary(sp));
    };
    const md = masterDetail({
      label: 'Shared spaces', listWidth: 256,
      list: (host) => {
        for (const sp of sps) {
          const open = tgOpenCount(sp);
          const b = mdRow({ icon: _tgIconOf(sp), title: tgSpaceName(sp), sub: TG_KIND_LABEL[tgKindOf(sp)] + ' · ' + tgMembers(sp.value).length + ' people', badge: open || '', active: sp.id === cur.id, run: () => pick(sp.id) });
          rows.set(sp.id, b);
          host.appendChild(b);
        }
        host.appendChild(mdRow({ icon: 'plus', title: 'New shared space', cls: 'tg-md-new', run: () => tgNewSpaceDialog() }));
      },
      detail: () => tgSpaceSummary(cur),
    });
    pane.appendChild(md);
  }
  if (typeof tgHubLife === 'function') tgHubLife(pane);     // coming up: countdowns, trips, birthdays (4life)
  if (typeof tgHubGame === 'function') tgHubGame(pane);     // challenges, trophies, leaderboard (3game)
  const left = tgAllSpaces().filter(s => s.status === 'left' || s.status === 'declined' || s.status === 'removed');
  if (left.length) {
    const ls = tgSection(pane, 'Left or declined', 'archive', left.length, true);
    for (const s of left) {
      const row = tgEl('div', 'tg-row tg-row-flat');
      row.append(tgEl('span', 'tg-row-t', tgSpaceName(s)), tgEl('span', 'muted tg-sm', s.status === 'removed' ? 'Removed by its owner' : s.status === 'declined' ? 'Declined' : 'Left'));
      row.appendChild(tgBtn('Forget it here', { ghost: true, icon: 'trash-2', run: () => tgForget(s.id) }));
      ls.appendChild(row);
    }
  }
  return pane;
}
/** The picked space at a glance: who, what is open (tick it off here), one line to add to it, and Open for the whole space. */
function tgSpaceSummary(sp) {
  const v = sp.value, kind = tgKindOf(sp), id = sp.id;
  const box = tgEl('div', 'tg-sum');
  const head = tgEl('div', 'tg-sum-h');
  head.insertAdjacentHTML('beforeend', `<span class="tg-sc-ic">${icon(_tgIconOf(sp))}</span>`);
  const nm = tgEl('div', 'tg-sum-t');
  nm.append(tgEl('h2', '', tgSpaceName(sp)), tgEl('span', 'muted tg-sm', TG_KIND_LABEL[kind]));
  head.appendChild(nm);
  head.appendChild(tgAvatarStack(tgMembers(v).filter(x => x !== tgMe()), v, 5));
  const acts = tgEl('div', 'tg-acts');
  acts.append(tgBtn('Open', { primary: true, icon: 'arrow-right', run: () => setView('together:' + id) }),
    tgIconBtn('ellipsis', 'Space menu', (e, b) => tgSpaceMenu(b, sp)));
  head.appendChild(acts);
  box.appendChild(head);
  const streak = typeof tgPartyStreak === 'function' ? tgPartyStreak(v) : 0;
  const next = typeof tgNextDate === 'function' ? tgNextDate(v) : null;
  if (streak > 1 || next) {
    const f = tgEl('div', 'tg-sc-foot');
    if (streak > 1) { const st = tgEl('span', 'tg-chip tg-chip-fire'); st.insertAdjacentHTML('beforeend', icon('flame', 'i-xs')); st.appendChild(tgEl('span', '', `${streak}-day party streak`)); f.appendChild(st); }
    if (next) { const n = tgEl('span', 'tg-chip'); n.insertAdjacentHTML('beforeend', icon('calendar', 'i-xs')); n.appendChild(tgEl('span', '', next)); f.appendChild(n); }
    box.appendChild(f);
  }
  const add = tgEl('div', 'tg-add');
  add.insertAdjacentHTML('beforeend', icon('plus'));
  add.appendChild(tgInput('add:' + id, { placeholder: 'Add to the list for everyone… (Enter)', max: 300, aria: 'New shared task', onEnter: (val, el) => { const t = String(val || '').trim(); if (!t) return; tgClearDraft('add:' + id); el.value = ''; tgAddItem(id, { title: t }); } }));
  box.appendChild(add);
  const open = tgItemsOf(v).filter(it => it.status !== 'done');
  const list = tgEl('div', 'tg-list'); list.setAttribute('role', 'list');
  if (!open.length) list.appendChild(tgEl('p', 'muted tg-pad', (v.items || []).length ? 'All done here.' : 'Nothing here yet. Add the first thing above.'));
  for (const it of open.slice(0, 6)) list.appendChild(tgItemRow(sp, it, false));
  box.appendChild(list);
  if (open.length > 6) box.appendChild(tgBtn(`${open.length - 6} more in ${tgSpaceName(sp)}`, { ghost: true, icon: 'arrow-right', run: () => setView('together:' + id) }));
  return box;
}
function tgSection(root, title, ic, count, folded) {
  const box = tgEl('section', 'tg-sec' + (folded ? ' is-folded' : ''));
  const h = tgEl('h3', 'tg-sec-h');
  h.insertAdjacentHTML('beforeend', icon(ic || 'circle-dot'));
  h.appendChild(tgEl('span', '', title));
  if (count) h.appendChild(tgEl('span', 'count', String(count)));
  if (folded) { h.setAttribute('role', 'button'); h.tabIndex = 0; h.onclick = () => box.classList.toggle('is-folded'); }
  box.appendChild(h);
  const body = tgEl('div', 'tg-sec-b');
  box.appendChild(body);
  root.appendChild(box);
  return body;
}
function tgInviteCard(s) {
  const v = s.value, by = s.invitedBy || (v.meta && v.meta.owner);
  const card = tgEl('div', 'tg-card tg-invite');
  card.appendChild(tgAvatarEl(by, 'lg', v));
  const t = tgEl('div', 'tg-invite-t');
  const line = tgEl('div');
  line.append(tgEl('b', '', tgName(by, v)), document.createTextNode(' invited you to '), tgEl('b', '', tgSpaceName(s)));
  t.appendChild(line);
  const others = tgMembers(v).filter(f => f !== tgMe() && f !== by);
  const asks = (v.items || []).filter(it => it.assignee === tgMe() && it.status !== 'done');
  t.appendChild(tgEl('div', 'muted tg-sm', `${TG_KIND_LABEL[tgKindOf(s)]}${others.length ? ' · with ' + others.map(f => tgFirst(f, v)).join(', ') : ''}${asks.length ? ` · asks you to do ${asks.length === 1 ? '1 thing' : asks.length + ' things'}` : ''}`));
  for (const it of asks.slice(0, 3)) { const q = tgEl('div', 'tg-quote', it.title || '(no title)'); t.appendChild(q); }
  card.appendChild(t);
  const acts = tgEl('div', 'tg-acts');
  acts.append(
    tgBtn('Join', { primary: true, icon: 'check', run: () => tgJoin(s.id) }),
    tgBtn('Decline', { ghost: true, run: () => tgDecline(s.id) }),
  );
  card.appendChild(acts);
  return card;
}
async function tgJoin(id) {
  const r = await tgPost('/api/together/status', { space: id, status: 'joined' });
  if (!r) return;
  await tgLoad();
  const sp = tgSpace(id);
  if (sp) { tgEdit(id, tgFeedOps(id, 'join', 'joined'), { undo: false }); toast(`You joined ${tgSpaceName(sp)}`, { kind: 'ok', action: { label: 'Open', run: () => setView('together:' + id) } }); }
}
async function tgDecline(id) {
  const sp = tgSpace(id);
  const r = await tgPost('/api/together/status', { space: id, status: 'declined' });
  if (r) { toast(`Declined${sp ? ' ' + tgSpaceName(sp) : ''}. They see that you said no.`, { icon: 'x', action: { label: 'Join after all', run: () => tgJoin(id) } }); tgLoad(); }
}
/** "From Sam": a task a friend asked you to do. Accept puts it in your Today / Inbox (as a shared row, never in your own tasks). */
function tgRequestRow(sp, it) {
  const v = sp.value;
  const row = tgEl('div', 'tg-row tg-req');
  row.appendChild(tgAvatarEl(it.by, 'sm', v));
  const t = tgEl('button', 'tg-row-t'); t.type = 'button';
  t.appendChild(tgEl('span', 'tg-from', 'From ' + tgFirst(it.by, v)));
  t.appendChild(tgEl('span', '', it.title || '(no title)'));
  t.onclick = () => tgOpenItem(sp.id, it.id);
  row.appendChild(t);
  if (it.due) row.appendChild(tgDueChip(it.due));
  row.appendChild(tgEl('span', 'muted tg-sm', tgSpaceName(sp)));
  const acts = tgEl('div', 'tg-acts');
  acts.append(tgBtn('Accept', { primary: true, icon: 'check', run: () => tgAck(sp.id, it.id, 'accepted') }), tgBtn('Decline', { ghost: true, run: () => tgAck(sp.id, it.id, 'declined') }));
  row.appendChild(acts);
  return row;
}
function tgAck(spaceId, itemId, ans) {
  const me = tgMe(), v = tgVal(spaceId); if (!v) return;
  const it = (v.items || []).find(x => x.id === itemId); if (!it) return;
  const ops = [{ op: 'set', path: ['items', itemId, 'ack', me], value: ans }];
  if (ans === 'accepted') ops.push(...tgFeedOps(spaceId, 'note', 'took on: ' + String(it.title || '').slice(0, 150), itemId));
  tgEdit(spaceId, ops, { toast: ans === 'accepted' ? `Accepted: it's on your list` : `Declined: ${tgFirst(it.by, v)} sees that`, icon: ans === 'accepted' ? 'check' : 'x' });
}
function tgDueChip(due) {
  const c = tgEl('span', 'tg-chip tg-due' + (due < todayStr() ? ' is-late' : due === todayStr() ? ' is-today' : ''));
  c.insertAdjacentHTML('beforeend', icon('calendar', 'i-xs'));
  c.appendChild(tgEl('span', '', typeof dueLabel === 'function' ? dueLabel(due) : due));
  return c;
}
function tgSettingsMenu(anchor) {
  const t = (k, label, hint) => ({ label, hint, checked: !!tgPref(k), run: () => tgSetPref(k, !tgPref(k)) });
  openMenu(anchor, [
    { heading: 'Show friends' },
    t('layers', "Friends' shared tasks in my lists and timeline", 'faint, never mixed with yours'),
    t('calendar', "Friends' busy times in my calendar", 'only what they share with you'),
    { heading: 'Game' },
    t('leaderboard', 'Weekly leaderboard among friends', 'only friends who share their game'),
    t('cheers', 'Cheers and high-fives'),
    t('focusTell', "Tell friends in my spaces when I'm focusing"),
  ], { align: 'end', width: 320 });
}

/* ---------- a space ---------- */
function tgRenderSpace(root, id, tab) {
  const sp = tgSpace(id);
  if (!sp) {
    if (!tgHas() || _tg.loading || (_tg.data && _tg.data.failed)) { root.appendChild(tgWaitEl('this space')); return; }
    mountEmptyState(root, { icon: 'users', title: 'This space is not here', text: 'It may have been forgotten on this computer, or you have not joined it yet.', actions: [{ label: 'All spaces', icon: 'arrow-left', run: () => setView('together') }] });
    return;
  }
  if (sp.status === 'invited') { root.appendChild(tgInviteCard(sp)); return; }
  const v = sp.value;
  const kind = tgKindOf(sp);
  if (!tab) tab = kind === 'board' ? 'board' : kind === 'party' ? 'quests' : 'tasks';
  const sub = document.getElementById('view-subtitle');
  if (sub) sub.textContent = `${TG_KIND_LABEL[kind]} · ${tgMembers(v).length} people`;
  // Header: members, invite, the space menu.
  const head = tgEl('div', 'tg-bar tg-space-head');
  const people = tgEl('button', 'tg-people'); people.type = 'button';
  people.appendChild(tgAvatarStack(tgMembers(v), v, 7));
  people.onclick = () => setView(`together:${id}:people`);
  people.title = tgMembers(v).map(f => tgName(f, v)).join(', ');
  head.appendChild(people);
  if (sp.status !== 'joined') head.appendChild(tgEl('span', 'tg-chip', sp.status === 'removed' ? 'You were removed' : 'You left'));
  // Invite, Find a time and the space menu live in the shared page header (tgHeaderActions).
  root.appendChild(head);
  // Tabs.
  const tabs = tgEl('div', 'seg tg-tabs'); tabs.setAttribute('role', 'tablist');
  for (const [k, label, ic] of TG_TABS) {
    if (k === 'garden' && typeof gardenSocialSpaceBed !== 'function') continue;
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab');
    b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`;
    const on = k === tab;
    b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
    if (on) b.style.cursor = 'default';
    b.onclick = () => { if (!on) setView(`together:${id}:${k}`); };
    tabs.appendChild(b);
  }
  root.appendChild(tabs);
  const body = tgEl('div', 'tg-body');
  root.appendChild(body);
  if (tab !== 'plan' && typeof tgPlanLeave === 'function') tgPlanLeave();   // left the Plan together board for another tab
  const ro = sp.status !== 'joined';
  if (tab === 'tasks') tgRenderTasks(body, sp, ro);
  else if (tab === 'board') tgRenderBoard(body, sp, ro);
  else if (tab === 'plan' && typeof tgRenderPlan === 'function') tgRenderPlan(body, sp, ro);
  else if (tab === 'money' && typeof tgRenderMoney === 'function') tgRenderMoney(body, sp, ro);
  else if (tab === 'quests' && typeof tgRenderQuests === 'function') tgRenderQuests(body, sp, ro);
  else if (tab === 'dates' && typeof tgRenderDates === 'function') tgRenderDates(body, sp, ro);
  else if (tab === 'people' && typeof tgRenderPeople === 'function') tgRenderPeople(body, sp, ro);
  else if (tab === 'feed' && typeof tgRenderFeed === 'function') tgRenderFeed(body, sp, ro);
  else if (tab === 'garden' && typeof gardenSocialSpaceBed === 'function') gardenSocialSpaceBed(body, sp, ro);   // ── garden-social ──
  else tgRenderTasks(body, sp, ro);
  if (typeof funSpaceDecor === 'function') { try { funSpaceDecor(root, sp); } catch (e) { console.error('[together] fun theme', e); } }   // agent 'fun': the space theme (friendship level rewards)
}
function tgSpaceMenu(anchor, sp) {
  const id = sp.id, v = sp.value, owner = v.meta.owner === tgMe();
  const hidden = !!tgSpacePref(id, 'hidden');
  openMenu(anchor, [
    sp.status === 'joined' ? { label: 'Rename…', icon: 'pencil', run: async () => { const n = await promptDialog({ title: 'Rename the space', label: 'Name', value: tgSpaceName(sp), confirmLabel: 'Rename' }); if (n && n.trim()) tgEdit(id, [{ op: 'set', path: ['meta', 'name'], value: n.trim().slice(0, 80) }], { toast: 'Renamed for everyone', icon: 'pencil' }); } } : null,
    sp.status === 'joined' ? { label: 'Icon…', icon: 'palette', run: () => tgIconPicker(anchor, (ic) => tgEdit(id, [{ op: 'set', path: ['meta', 'icon'], value: ic }], { toast: 'Icon changed', icon: ic })) } : null,
    { label: hidden ? 'Show in the sidebar' : 'Hide from the sidebar', icon: hidden ? 'eye' : 'eye-off', run: () => { tgSetSpacePref(id, 'hidden', !hidden); render(); } },
    { label: 'Copy link', icon: 'link', run: () => { const u = location.origin + location.pathname + '#view=together:' + id; try { navigator.clipboard.writeText(u).then(() => toast('Link copied (it opens on your own computers)', { kind: 'ok' })); } catch (e) { toast(u); } } },
    'sep',
    sp.status === 'joined' ? { label: owner ? 'Leave (it stays with the others)' : 'Leave the space', icon: 'log-out', danger: true, run: () => tgLeave(id) } : { label: 'Forget it on this computer', icon: 'trash-2', danger: true, run: () => tgForget(id) },
  ].filter(Boolean), { align: 'end', width: 260 });
}
/** Leave a space: Undo for a few seconds instead of a question (nothing is sent until then). */
function tgLeave(id) {
  const sp = tgSpace(id);
  const name = sp ? tgSpaceName(sp) : 'the space';
  tgAfterUndo(`Leaving ${name}: you stop getting its changes and the others see that you left. Your copy stays here until you forget it.`, 'log-out', async () => {
    const r = await tgPost('/api/together/status', { space: id, status: 'left' });
    if (!r) return;
    toast(`You left ${name}`, { icon: 'log-out', action: { label: 'Rejoin', run: () => tgJoin(id) } });
    if (String(state.view).startsWith('together:' + id)) setView('together');
    tgLoad();
  });
}
/** Forget a space you left or declined, on this computer: Undo for a few seconds first. */
function tgForget(id) {
  const sp = tgSpace(id);
  const name = sp ? tgSpaceName(sp) : 'the space';
  tgAfterUndo(`Forgetting ${name} on this computer (the others keep theirs).`, 'trash-2', async () => {
    const r = await tgPost('/api/together/forget', { space: id });
    if (!r) return;
    toast(`${name} is forgotten on this computer`, { icon: 'trash-2' });
    if (String(state.view).startsWith('together:' + id)) setView('together');
    tgLoad();
  }, 6000);
}
function tgIconPicker(anchor, pick) {
  const icons = ['list-checks', 'shopping-cart', 'house', 'plane', 'party-popper', 'book-open', 'dumbbell', 'briefcase', 'heart', 'star', 'gift', 'utensils', 'music', 'tent', 'car', 'baby', 'graduation-cap', 'paw-print', 'sprout', 'trophy'];
  openPopover(anchor, (el, close) => {
    el.classList.add('tg-icons');
    for (const ic of icons) { const b = tgIconBtn(ic, ic.replace(/-/g, ' '), () => { close(); pick(ic); }); el.appendChild(b); }
  }, { align: 'end', width: 236 });
}

/* ---------- tasks (list) ---------- */
function tgItemsOf(v, filter) {
  const me = tgMe();
  const items = (v.items || []).slice();
  if (filter === 'mine') return items.filter(it => tgIsMine(it) || (it.assignee === me));
  if (filter === 'others') return items.filter(it => it.assignee && it.assignee !== me);
  return items;
}
function tgRenderTasks(body, sp, ro) {
  const id = sp.id, v = sp.value;
  if (!ro) {
    const add = tgEl('div', 'tg-add');
    add.insertAdjacentHTML('beforeend', icon('plus'));
    const inp = tgInput('add:' + id, { placeholder: 'Add to the list for everyone… (Enter)', max: 300, aria: 'New shared task', onEnter: (val, el) => { const t = String(val || '').trim(); if (!t) return; tgClearDraft('add:' + id); el.value = ''; tgAddItem(id, { title: t }); } });
    add.appendChild(inp);
    add.appendChild(tgEl('span', 'tg-hint muted tg-sm', 'Shared with everyone in the space'));
    body.appendChild(add);
  }
  const filter = tgSpacePref(id, 'filter') || 'all';
  const seg = tgEl('div', 'seg tg-filter');
  for (const [k, label] of [['all', 'Everything'], ['mine', 'Mine'], ['others', "Others'"]]) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.classList.toggle('on', filter === k); b.setAttribute('aria-pressed', filter === k ? 'true' : 'false');
    b.onclick = () => { if (filter !== k) { tgSetSpacePref(id, 'filter', k); render(); } };
    seg.appendChild(b);
  }
  body.appendChild(seg);
  const items = tgItemsOf(v, filter);
  const open = items.filter(it => it.status !== 'done'), done = items.filter(it => it.status === 'done');
  const list = tgEl('div', 'tg-list'); list.setAttribute('role', 'list');
  if (!open.length) list.appendChild(tgEl('p', 'muted tg-pad', items.length ? 'All done here.' : 'Nothing here yet. Add the first thing above.'));
  for (const it of open) list.appendChild(tgItemRow(sp, it, ro));
  body.appendChild(list);
  if (done.length) {
    const d = tgEl('details', 'tg-done');
    const s = tgEl('summary', '', `Done (${done.length})`);
    d.appendChild(s);
    for (const it of done.slice().sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 100)) d.appendChild(tgItemRow(sp, it, ro));
    body.appendChild(d);
  }
}
function tgAddItem(spaceId, fields, o) {
  const id = tgNewId('t');
  const v = tgVal(spaceId);
  const val = Object.assign({ title: '', by: tgMe(), at: Date.now(), status: 'todo' }, fields || {});
  if (val.title) val.title = String(val.title).slice(0, 300);
  if (v && Array.isArray(v.columns) && v.columns.length && !val.column) val.column = v.columns[0].id;
  tgEdit(spaceId, [{ op: 'set', path: ['items', id], value: val }], { toast: (o && o.toast) || 'Added for everyone', icon: 'plus' });
  return id;
}
/** One shared task. o.where: outside its space (Today, the day lists): say which space (a click opens it) and who asked, not your own face. */
function tgItemRow(sp, it, ro, o) {
  o = o || {};
  const v = sp.value, me = tgMe();
  const row = tgEl('div', 'tg-row tg-item' + (it.status === 'done' ? ' is-done' : '') + (it.assignee && it.assignee !== me ? ' is-theirs' : ''));
  row.setAttribute('role', 'listitem'); row.dataset.id = it.id;
  const ck = document.createElement('button'); ck.type = 'button';
  ck.className = 'tg-check' + (it.status === 'done' ? ' on' : it.status === 'doing' ? ' doing' : '');
  ck.setAttribute('aria-label', it.status === 'done' ? 'Mark as not done' : 'Mark as done');
  ck.innerHTML = icon(it.status === 'done' ? 'circle-check' : 'circle');
  ck.disabled = !!ro;
  ck.onclick = (e) => { e.stopPropagation(); tgToggleDone(sp.id, it.id); };
  row.appendChild(ck);
  const t = tgEl('button', 'tg-row-t'); t.type = 'button';
  t.appendChild(tgEl('span', 'tg-title', it.title || '(no title)'));
  t.onclick = () => tgOpenItem(sp.id, it.id);
  row.appendChild(t);
  const meta = tgEl('span', 'tg-meta');
  if (it.coop) { const c = tgEl('span', 'tg-chip tg-chip-coop', 'Co-op'); c.title = 'Done together: everyone in the space gets the XP'; meta.appendChild(c); }
  if (it.due) meta.appendChild(tgDueChip(it.due));
  if (it.priority && it.priority !== 'p0') meta.appendChild(tgEl('span', 'tg-prio ' + it.priority, it.priority.toUpperCase()));
  const nc = (it.comments || []).length;
  if (nc) { const c = tgEl('span', 'tg-chip'); c.insertAdjacentHTML('beforeend', icon('message-circle', 'i-xs')); c.appendChild(tgEl('span', '', String(nc))); meta.appendChild(c); }
  const ch = Object.keys(it.cheers || {}).length;
  if (ch) { const c = tgEl('span', 'tg-chip tg-chip-cheer', '🙌 ' + ch); c.title = Object.keys(it.cheers).map(f => tgName(f, v)).join(', '); meta.appendChild(c); }
  if (o.where) {
    if (it.by && it.by !== me) { const f = tgEl('span', 'tg-chip tg-chip-from'); f.appendChild(tgAvatarEl(it.by, 'sm', v)); f.appendChild(tgEl('span', '', 'from ' + tgFirst(it.by, v))); meta.appendChild(f); }
    const w = tgEl('button', 'tg-chip tg-where'); w.type = 'button';
    w.insertAdjacentHTML('beforeend', icon(_tgIconOf(sp), 'i-xs'));
    w.appendChild(tgEl('span', '', tgSpaceName(sp)));
    w.title = 'Open ' + tgSpaceName(sp);
    w.onclick = (e) => { e.stopPropagation(); setView('together:' + sp.id); };
    meta.appendChild(w);
  } else if (it.assignee) {
    const ack = it.ack && it.ack[it.assignee];
    if (it.assignee !== it.by && !ack && it.status !== 'done') meta.appendChild(tgEl('span', 'tg-chip tg-chip-wait', it.assignee === me ? 'Asked of you' : `Waiting for ${tgFirst(it.assignee, v)}`));
    if (ack === 'declined') meta.appendChild(tgEl('span', 'tg-chip tg-chip-no', `${tgFirst(it.assignee, v)} declined`));
    meta.appendChild(tgAvatarEl(it.assignee, 'sm', v));
  }
  if (it.status === 'done' && it.doneBy && it.doneBy !== me && tgPref('cheers') && !ro && !(it.cheers && it.cheers[me])) {
    meta.appendChild(tgBtn('', { cls: 'btn-icon btn-sm tg-hi5', icon: 'handshake', aria: `High-five ${tgFirst(it.doneBy, v)}`, tip: `High-five ${tgFirst(it.doneBy, v)}`, run: () => { if (typeof tgCheer === 'function') tgCheer(sp.id, it); } }));
  }
  row.appendChild(meta);
  if (it.assignee === me && it.by !== me && !(it.ack && it.ack[me]) && it.status !== 'done' && !ro) {
    const acts = tgEl('div', 'tg-acts');
    acts.append(tgBtn('Accept', { primary: true, run: () => tgAck(sp.id, it.id, 'accepted') }), tgBtn('Decline', { ghost: true, run: () => tgAck(sp.id, it.id, 'declined') }));
    row.appendChild(acts);
  }
  row.oncontextmenu = (e) => { if (ro) return; e.preventDefault(); tgItemMenu({ x: e.clientX, y: e.clientY }, sp.id, it.id); };
  return row;
}
function tgToggleDone(spaceId, itemId) {
  const v = tgVal(spaceId); if (!v) return;
  const it = (v.items || []).find(x => x.id === itemId); if (!it) return;
  const closing = it.status !== 'done';
  const ops = closing
    ? [{ op: 'set', path: ['items', itemId, 'status'], value: 'done' }, { op: 'set', path: ['items', itemId, 'doneBy'], value: tgMe() }, { op: 'set', path: ['items', itemId, 'doneAt'], value: Date.now() }]
    : [{ op: 'set', path: ['items', itemId, 'status'], value: 'todo' }, { op: 'set', path: ['items', itemId, 'doneBy'], value: null }, { op: 'set', path: ['items', itemId, 'doneAt'], value: null }];
  // The board's Done column follows.
  const cols = v.columns || [];
  if (cols.length) {
    const doneCol = cols.find(c => /done|finished|complete/i.test(c.label || '')) || cols[cols.length - 1];
    if (closing && doneCol) ops.push({ op: 'set', path: ['items', itemId, 'column'], value: doneCol.id });
    else if (!closing && it.column === (doneCol && doneCol.id)) ops.push({ op: 'set', path: ['items', itemId, 'column'], value: cols[0].id });
  }
  if (closing) ops.push(...tgFeedOps(spaceId, 'done', String(it.title || '').slice(0, 180), itemId));
  tgEdit(spaceId, ops, { toast: closing ? (it.coop ? 'Done together!' : 'Done. Everyone sees it') : 'Back on the list', icon: closing ? 'circle-check' : 'rotate-ccw' });
  if (closing && typeof tgOnItemDone === 'function') tgOnItemDone(spaceId, it, true);
}
function tgItemMenu(at, spaceId, itemId) {
  const v = tgVal(spaceId); const it = v && (v.items || []).find(x => x.id === itemId); if (!it) return;
  let anchor = at;
  if (!(at instanceof Element)) { anchor = document.createElement('span'); anchor.className = 'menu-point'; anchor.style.cssText = `position:fixed;left:${Math.round(at.x)}px;top:${Math.round(at.y)}px;width:1px;height:1px;pointer-events:none`; document.body.appendChild(anchor); }
  const me = tgMe();
  openMenu(anchor, [
    { label: 'Open', icon: 'maximize-2', run: () => tgOpenItem(spaceId, itemId) },
    { label: it.status === 'done' ? 'Mark as not done' : 'Mark as done', icon: 'circle-check', run: () => tgToggleDone(spaceId, itemId) },
    { label: it.status === 'doing' ? 'Stop progress' : 'Start (in progress)', icon: 'circle-dot', run: () => tgEdit(spaceId, [{ op: 'set', path: ['items', itemId, 'status'], value: it.status === 'doing' ? 'todo' : 'doing' }]) },
    { label: it.assignee === me ? 'Unassign me' : 'I’ll do it', icon: 'handshake', run: () => tgEdit(spaceId, it.assignee === me ? [{ op: 'set', path: ['items', itemId, 'assignee'], value: null }] : [{ op: 'set', path: ['items', itemId, 'assignee'], value: me }, { op: 'set', path: ['items', itemId, 'ack', me], value: 'accepted' }], { toast: it.assignee === me ? 'Unassigned' : 'It’s yours now', icon: 'handshake' }) },
    { label: it.coop ? 'Not a co-op task' : 'Make it co-op (shared XP)', icon: 'users', run: () => tgEdit(spaceId, [{ op: 'set', path: ['items', itemId, 'coop'], value: !it.coop }]) },
    'sep',
    { label: 'Delete for everyone', icon: 'trash-2', danger: true, run: () => tgEdit(spaceId, [{ op: 'del', path: ['items', itemId] }], { toast: 'Deleted for everyone', icon: 'trash-2' }) },
  ], { align: 'start', width: 240, onClose: () => { if (anchor !== at) anchor.remove(); } });
}

/* ---------- board ---------- */
function tgColumnsOf(v) {
  if (Array.isArray(v.columns) && v.columns.length) return v.columns.map(c => ({ id: c.id, label: c.label || 'Column', custom: true }));
  return [{ id: 's:todo', label: 'To do' }, { id: 's:doing', label: 'Doing' }, { id: 's:done', label: 'Done' }];
}
function tgColOf(v, it, cols) {
  if (cols[0] && cols[0].custom) return cols.find(c => c.id === it.column) ? it.column : (it.status === 'done' ? cols[cols.length - 1].id : cols[0].id);
  return 's:' + (it.status === 'doing' ? 'doing' : it.status === 'done' ? 'done' : 'todo');
}
function tgRenderBoard(body, sp, ro) {
  const v = sp.value, id = sp.id;
  const cols = tgColumnsOf(v);
  const board = tgEl('div', 'tg-board');
  for (const c of cols) {
    const col = tgEl('div', 'tg-col'); col.dataset.col = c.id;
    const h = tgEl('div', 'tg-col-h');
    h.appendChild(tgEl('b', '', c.label));
    const items = (v.items || []).filter(it => tgColOf(v, it, cols) === c.id);
    h.appendChild(tgEl('span', 'count', String(items.length)));
    if (c.custom && !ro) h.appendChild(tgIconBtn('ellipsis', 'Column menu', (e, b) => openMenu(b, [
      { label: 'Rename…', icon: 'pencil', run: async () => { const n = await promptDialog({ title: 'Rename the column', value: c.label, confirmLabel: 'Rename' }); if (n && n.trim()) tgEdit(id, [{ op: 'set', path: ['columns', c.id, 'label'], value: n.trim().slice(0, 40) }]); } },
      { label: 'Delete column', icon: 'trash-2', danger: true, disabled: cols.length <= 1, run: () => tgEdit(id, [{ op: 'del', path: ['columns', c.id] }], { toast: 'Column deleted (its cards moved to the first one)', icon: 'trash-2' }) },
    ], { align: 'end' })));
    col.appendChild(h);
    const list = tgEl('div', 'tg-col-b');
    for (const it of items.slice(0, 200)) {
      const card = tgEl('div', 'tg-bcard' + (it.status === 'done' ? ' is-done' : '') + (it.assignee && it.assignee !== tgMe() ? ' is-theirs' : ''));
      card.tabIndex = 0; card.dataset.id = it.id;
      card.draggable = !ro;
      card.appendChild(tgEl('div', 'tg-bcard-t', it.title || '(no title)'));
      const m = tgEl('div', 'tg-meta');
      if (it.coop) m.appendChild(tgEl('span', 'tg-chip tg-chip-coop', 'Co-op'));
      if (it.due) m.appendChild(tgDueChip(it.due));
      if ((it.comments || []).length) { const cc = tgEl('span', 'tg-chip'); cc.insertAdjacentHTML('beforeend', icon('message-circle', 'i-xs')); cc.appendChild(tgEl('span', '', String(it.comments.length))); m.appendChild(cc); }
      if (it.assignee) m.appendChild(tgAvatarEl(it.assignee, 'sm', v));
      card.appendChild(m);
      card.onclick = () => tgOpenItem(id, it.id);
      card.onkeydown = (e) => { if (e.key === 'Enter') tgOpenItem(id, it.id); };
      card.ondragstart = (e) => { e.dataTransfer.setData('text/x-tg-item', it.id); e.dataTransfer.effectAllowed = 'move'; card.classList.add('is-drag'); };
      card.ondragend = () => card.classList.remove('is-drag');
      card.oncontextmenu = (e) => { if (ro) return; e.preventDefault(); tgItemMenu({ x: e.clientX, y: e.clientY }, id, it.id); };
      list.appendChild(card);
    }
    if (!ro) {
      col.ondragover = (e) => { if ([...e.dataTransfer.types].includes('text/x-tg-item')) { e.preventDefault(); col.classList.add('drag-over'); } };
      col.ondragleave = (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over'); };
      col.ondrop = (e) => {
        col.classList.remove('drag-over');
        const iid = e.dataTransfer.getData('text/x-tg-item'); if (!iid) return;
        e.preventDefault();
        tgMoveToColumn(id, iid, c.id, cols);
      };
      const add = tgInput(`badd:${id}:${c.id}`, { placeholder: '+ Add a card', max: 300, cls: 'tg-col-add', aria: 'New card in ' + c.label, onEnter: (val, el) => { const t = String(val || '').trim(); if (!t) return; tgClearDraft(`badd:${id}:${c.id}`); el.value = ''; const f = { title: t }; if (c.custom) f.column = c.id; else if (c.id === 's:doing') f.status = 'doing'; tgAddItem(id, f); } });
      list.appendChild(add);
    }
    col.appendChild(list);
    board.appendChild(col);
  }
  if (!ro) {
    const addCol = tgBtn('Column', { ghost: true, icon: 'plus', run: async () => {
      const n = await promptDialog({ title: 'New column', label: 'Name', placeholder: 'Waiting, Ideas, This week…', confirmLabel: 'Add' });
      if (!n || !n.trim()) return;
      const ops = [];
      // The first custom column turns the three status columns into real ones, with the cards where they were.
      if (!(v.columns || []).length) {
        const base = [['c-todo', 'To do'], ['c-doing', 'Doing'], ['c-done', 'Done']];
        for (const [cid, label] of base) ops.push({ op: 'set', path: ['columns', cid], value: { label, by: tgMe(), at: Date.now() } });
        for (const it of v.items || []) ops.push({ op: 'set', path: ['items', it.id, 'column'], value: it.status === 'done' ? 'c-done' : it.status === 'doing' ? 'c-doing' : 'c-todo' });
      }
      if ((v.columns || []).length >= 12) { toast('A board has at most 12 columns.', { kind: 'err' }); return; }
      ops.push({ op: 'set', path: ['columns', tgNewId('c')], value: { label: n.trim().slice(0, 40), by: tgMe(), at: Date.now() } });
      tgEdit(id, ops, { toast: 'Column added for everyone', icon: 'columns-3' });
    } });
    addCol.classList.add('tg-col-new');
    board.appendChild(addCol);
  }
  body.appendChild(board);
}
function tgMoveToColumn(spaceId, itemId, colId, cols) {
  const v = tgVal(spaceId); const it = v && (v.items || []).find(x => x.id === itemId); if (!it) return;
  if (tgColOf(v, it, cols) === colId) return;
  const ops = [];
  const last = cols[cols.length - 1];
  if (colId.startsWith('s:')) {
    const st = colId.slice(2);
    if (st === 'done' && it.status !== 'done') { tgToggleDone(spaceId, itemId); return; }
    ops.push({ op: 'set', path: ['items', itemId, 'status'], value: st });
    if (it.status === 'done') ops.push({ op: 'set', path: ['items', itemId, 'doneBy'], value: null }, { op: 'set', path: ['items', itemId, 'doneAt'], value: null });
  } else {
    ops.push({ op: 'set', path: ['items', itemId, 'column'], value: colId });
    if (colId === last.id && /done|finished|complete/i.test(last.label) && it.status !== 'done') ops.push({ op: 'set', path: ['items', itemId, 'status'], value: 'done' }, { op: 'set', path: ['items', itemId, 'doneBy'], value: tgMe() }, { op: 'set', path: ['items', itemId, 'doneAt'], value: Date.now() });
    else if (it.status === 'done') ops.push({ op: 'set', path: ['items', itemId, 'status'], value: 'todo' });
  }
  tgEdit(spaceId, ops, { toast: 'Moved for everyone', icon: 'columns-3' });
}

/* ---------- a shared task's drawer ---------- */
let _tgDrawer = null;   // {space, item, close}
function tgOpenItem(spaceId, itemId) {
  const sp = tgSpace(spaceId); if (!sp) return;
  if (_tgDrawer && _tgDrawer.close) { try { _tgDrawer.close(); } catch (e) { /* gone */ } }
  const ro = sp.status !== 'joined';
  _tgDrawer = { space: spaceId, item: itemId, close: null };
  _tgDrawer.close = openDrawer({
    title: tgSpaceName(sp), size: 'sm',
    body: (el) => { _tgDrawer.el = el; const it = (sp.value.items || []).find(x => x.id === itemId); _tgDrawer.sig = JSON.stringify(it || null) + '|' + sp.status; tgPaintItem(el, spaceId, itemId, ro); },
    onClose: () => { _tgDrawer = null; },
  });
}
/** Repaint an open drawer after a change (from you or a friend). */
function tgRepaintDrawer() {
  if (!_tgDrawer || !_tgDrawer.el || !_tgDrawer.el.isConnected) return;
  const sp = tgSpace(_tgDrawer.space);
  const it = sp && (sp.value.items || []).find(x => x.id === _tgDrawer.item);
  const sig = JSON.stringify(it || null) + '|' + (sp ? sp.status : '');
  if (sig === _tgDrawer.sig) return;
  const typing = document.activeElement && _tgDrawer.el.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if (typing) return;   // never pull the text from under the cursor; the next repaint brings it
  _tgDrawer.sig = sig;
  _tgDrawer.el.innerHTML = '';
  tgPaintItem(_tgDrawer.el, _tgDrawer.space, _tgDrawer.item, !sp || sp.status !== 'joined');
}
function tgPaintItem(el, spaceId, itemId, ro) {
  const v = tgVal(spaceId); const it = v && (v.items || []).find(x => x.id === itemId);
  const me = tgMe();
  if (!it) { el.appendChild(tgEl('p', 'muted', 'This task is no longer in the space: someone deleted it.')); return; }
  const set = (field, value, msg) => tgEdit(spaceId, [{ op: 'set', path: ['items', itemId, field], value }], msg ? { toast: msg } : { undo: false });
  // Title
  const title = tgEl('textarea', 'control tg-dtitle'); title.value = it.title || ''; title.rows = 1; title.maxLength = 300; title.disabled = ro;
  title.setAttribute('aria-label', 'Title');
  title.onchange = () => { const t = title.value.trim(); if (t && t !== it.title) set('title', t.slice(0, 300), 'Renamed for everyone'); };
  title.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } };
  el.appendChild(title);
  const who = tgEl('div', 'muted tg-sm tg-dwho');
  who.textContent = `Added by ${tgName(it.by, v)} ${tgAgo(it.at || Date.now())}${it.status === 'done' && it.doneBy ? ` · done by ${tgName(it.doneBy, v)}` : ''}`;
  el.appendChild(who);
  if (it.assignee === me && it.by !== me && !(it.ack && it.ack[me]) && it.status !== 'done' && !ro) {
    const ask = tgEl('div', 'tg-ask');
    ask.appendChild(tgEl('span', '', `${tgFirst(it.by, v)} asked you to do this.`));
    ask.append(tgBtn('Accept', { primary: true, run: () => tgAck(spaceId, itemId, 'accepted') }), tgBtn('Decline', { ghost: true, run: () => tgAck(spaceId, itemId, 'declined') }));
    el.appendChild(ask);
  }
  // Fields
  const grid = tgEl('div', 'tg-dgrid');
  const field = (label, control) => { const f = tgEl('label', 'field'); f.appendChild(tgEl('span', 'field-label', label)); f.appendChild(control); grid.appendChild(f); };
  const st = document.createElement('select'); st.className = 'control control-sm'; st.disabled = ro;
  for (const [k, l] of [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']]) { const o = new Option(l, k); o.selected = (it.status || 'todo') === k; st.appendChild(o); }
  st.onchange = () => { if (st.value === 'done' || it.status === 'done') tgToggleDone(spaceId, itemId); else set('status', st.value); };
  field('Status', st);
  const due = document.createElement('input'); due.type = 'date'; due.className = 'control control-sm'; due.value = it.due || ''; due.disabled = ro;
  due.onchange = () => set('due', due.value || null, due.value ? 'Due date set for everyone' : 'Due date cleared');
  field('Due', due);
  const as = document.createElement('select'); as.className = 'control control-sm'; as.disabled = ro;
  as.appendChild(new Option('No one', ''));
  for (const f of tgMembers(v)) { const o = new Option(f === me ? 'Me' : tgName(f, v), f); o.selected = it.assignee === f; as.appendChild(o); }
  as.onchange = () => {
    const to = as.value || null;
    const ops = [{ op: 'set', path: ['items', itemId, 'assignee'], value: to }];
    if (to === me) ops.push({ op: 'set', path: ['items', itemId, 'ack', me], value: 'accepted' });
    tgEdit(spaceId, ops, { toast: to ? (to === me ? 'It’s yours now' : `Asked ${tgFirst(to, v)}: it waits for them to accept`) : 'Unassigned', icon: 'user' });
  };
  field('Who does it', as);
  const pr = document.createElement('select'); pr.className = 'control control-sm'; pr.disabled = ro;
  for (const [k, l] of [['p0', 'None'], ['p1', 'High'], ['p2', 'Medium'], ['p3', 'Low']]) { const o = new Option(l, k); o.selected = (it.priority || 'p0') === k; pr.appendChild(o); }
  pr.onchange = () => set('priority', pr.value);
  field('Priority', pr);
  el.appendChild(grid);
  const coop = tgEl('label', 'tg-toggle');
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!it.coop; cb.disabled = ro;
  cb.onchange = () => set('coop', cb.checked, cb.checked ? 'Co-op: everyone gets the XP when it’s done' : 'No longer co-op');
  coop.append(cb, tgEl('span', '', 'Co-op task: done together, shared XP and a joint celebration'));
  el.appendChild(coop);
  // Notes
  const notes = tgEl('textarea', 'control tg-dnotes'); notes.value = it.notes || ''; notes.rows = 3; notes.maxLength = 4000; notes.disabled = ro;
  notes.placeholder = 'Notes for everyone (plain text)'; notes.setAttribute('aria-label', 'Notes');
  notes.onchange = () => { if (notes.value !== (it.notes || '')) set('notes', notes.value.slice(0, 4000), 'Notes saved'); };
  el.appendChild(notes);
  // Subtasks
  const subs = it.subtasks || [];
  const sh = tgEl('h4', 'tg-dh', `Steps${subs.length ? ` (${subs.filter(s => s.done).length}/${subs.length})` : ''}`);
  el.appendChild(sh);
  for (const s of subs) {
    const r = tgEl('div', 'tg-sub' + (s.done ? ' is-done' : ''));
    const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!s.done; c.disabled = ro;
    c.onchange = () => tgEdit(spaceId, [{ op: 'set', path: ['items', itemId, 'subtasks', s.id, 'done'], value: c.checked }], { undo: false });
    r.append(c, tgEl('span', '', s.title || ''));
    if (!ro) r.appendChild(tgIconBtn('x', 'Delete step', () => tgEdit(spaceId, [{ op: 'del', path: ['items', itemId, 'subtasks', s.id] }], { toast: 'Step deleted', icon: 'trash-2' })));
    el.appendChild(r);
  }
  if (!ro && subs.length < 100) el.appendChild(tgInput(`sub:${itemId}`, { placeholder: '+ Add a step', max: 200, cls: 'control-sm', aria: 'New step', onEnter: (val, inp) => { const t = String(val || '').trim(); if (!t) return; tgClearDraft(`sub:${itemId}`); inp.value = ''; tgEdit(spaceId, [{ op: 'set', path: ['items', itemId, 'subtasks', tgNewId('s')], value: { title: t.slice(0, 200), done: false } }], { undo: false }); } }));
  // Cheers
  if (it.status === 'done' && it.doneBy && it.doneBy !== me && !ro && tgPref('cheers')) {
    const had = !!(it.cheers && it.cheers[me]);
    el.appendChild(tgBtn(had ? 'You high-fived' : `High-five ${tgFirst(it.doneBy, v)}`, { icon: 'handshake', disabled: had, run: () => { if (typeof tgCheer === 'function') tgCheer(spaceId, it); } }));
  }
  // Comments
  el.appendChild(tgCommentsEl(spaceId, it, ro));
  if (!ro) {
    const foot = tgEl('div', 'tg-dfoot');
    foot.appendChild(tgBtn('Delete for everyone', { ghost: true, icon: 'trash-2', run: () => { if (_tgDrawer && _tgDrawer.close) _tgDrawer.close(); tgEdit(spaceId, [{ op: 'del', path: ['items', itemId] }], { toast: 'Deleted for everyone', icon: 'trash-2' }); } }));
    el.appendChild(foot);
  }
}
function tgCommentsEl(spaceId, it, ro) {
  const v = tgVal(spaceId), me = tgMe();
  const box = tgEl('div', 'tg-comments');
  const list = it.comments || [];
  box.appendChild(tgEl('h4', 'tg-dh', `Comments${list.length ? ` (${list.length})` : ''}`));
  for (const c of list.slice(-100)) {
    const r = tgEl('div', 'tg-comment');
    r.appendChild(tgAvatarEl(c.by, 'sm', v));
    const b = tgEl('div', 'tg-comment-b');
    const h = tgEl('div', 'tg-comment-h');
    h.append(tgEl('b', '', tgName(c.by, v)), tgEl('span', 'muted tg-sm', tgAgo(c.at || 0)));
    if (c.by === me && !ro) h.appendChild(tgIconBtn('trash-2', 'Delete comment', () => tgEdit(spaceId, [{ op: 'del', path: ['items', it.id, 'comments', c.id] }], { toast: 'Comment deleted', icon: 'trash-2' })));
    b.append(h, tgEl('div', 'tg-comment-t', c.text || ''));
    r.appendChild(b);
    box.appendChild(r);
  }
  if (!ro && list.length < 300) {
    const key = `cm:${it.id}`;
    const inp = tgInput(key, { multi: true, rows: 2, placeholder: 'Write a comment… (Ctrl+Enter to send)', max: 1000, aria: 'New comment', onEnter: (val, el) => send(val, el) });
    const send = (val, el) => { const t = String(val || '').trim(); if (!t) return; tgClearDraft(key); el.value = ''; tgEdit(spaceId, [{ op: 'set', path: ['items', it.id, 'comments', tgNewId('m')], value: { by: me, at: Date.now(), text: t.slice(0, 1000) } }], { undo: false }); };
    box.appendChild(inp);
    box.appendChild(tgBtn('Send', { icon: 'send', run: () => send(inp.value, inp) }));
  }
  return box;
}

/* ---------- new space, invite ---------- */
function tgFriendPicker(el, chosen, opts) {
  opts = opts || {};
  const wrap = tgEl('div', 'tg-pick');
  const fr = tgFriends().filter(f => !(opts.exclude || []).includes(f.id));
  if (!fr.length) { wrap.appendChild(emptyLine('No friends to pick yet.', { label: 'Add a friend', icon: 'user-plus', run: () => { if (typeof friendsAddDialog === 'function') friendsAddDialog(); else setView('friends'); } })); el.appendChild(wrap); return; }
  for (const f of fr) {
    const l = tgEl('label', 'tg-pick-row');
    const c = document.createElement('input'); c.type = opts.single ? 'radio' : 'checkbox'; c.name = 'tg-pick'; c.checked = chosen.has(f.id);
    c.onchange = () => { if (opts.single) chosen.clear(); if (c.checked) chosen.add(f.id); else chosen.delete(f.id); if (opts.onChange) opts.onChange(); };
    l.append(c, tgAvatarEl(f.id, 'sm'), tgEl('span', '', f.name || 'A friend'));
    const pr = tgPresence(f.id);
    if (pr && pr !== 'offline') l.appendChild(tgEl('span', 'muted tg-sm', pr));
    wrap.appendChild(l);
  }
  el.appendChild(wrap);
}
function tgNewSpaceDialog(preset) {
  preset = preset || {};
  if (!tgChannel()) { toast('Add a friend in Friends first: spaces are shared with friends.', { icon: 'users' }); return; }
  const chosen = new Set(preset.members || []);
  let kind = preset.kind || 'list', name = null, startIn = null, endIn = null, placeIn = null;
  openDialog({
    title: 'New shared space', size: 'md',
    body: (el) => {
      const kinds = tgEl('div', 'tg-kinds');
      for (const k of ['list', 'board', 'party', 'trip', 'house']) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tg-kind' + (k === kind ? ' on' : '');
        b.innerHTML = icon(TG_KIND_ICON[k]) + `<span>${esc(TG_KIND_LABEL[k])}</span>`;
        b.setAttribute('aria-pressed', k === kind ? 'true' : 'false');
        b.onclick = () => { kind = k; for (const x of kinds.children) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); } tripBox.hidden = k !== 'trip'; };
        kinds.appendChild(b);
      }
      el.appendChild(kinds);
      const f = tgEl('label', 'field'); f.appendChild(tgEl('span', 'field-label', 'Name'));
      name = document.createElement('input'); name.className = 'control'; name.maxLength = 80; name.value = preset.name || ''; name.placeholder = 'Groceries, House jobs, Lisbon in May…'; name.setAttribute('autofocus', '');
      f.appendChild(name); el.appendChild(f);
      const tripBox = tgEl('div', 'tg-dgrid'); tripBox.hidden = kind !== 'trip';
      const tf = (label, inp) => { const l = tgEl('label', 'field'); l.append(tgEl('span', 'field-label', label), inp); tripBox.appendChild(l); };
      startIn = document.createElement('input'); startIn.type = 'date'; startIn.className = 'control control-sm'; tf('From', startIn);
      endIn = document.createElement('input'); endIn.type = 'date'; endIn.className = 'control control-sm'; tf('To', endIn);
      placeIn = document.createElement('input'); placeIn.className = 'control control-sm'; placeIn.maxLength = 120; placeIn.placeholder = 'Where'; tf('Where', placeIn);
      el.appendChild(tripBox);
      el.appendChild(tgEl('div', 'field-label', 'Who'));
      tgFriendPicker(el, chosen);
      el.appendChild(tgEl('p', 'muted tg-sm', 'They get an invitation to Join. Everything in the space is end-to-end encrypted between you, and nothing in it changes anyone’s own tasks.'));
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Make it', primary: true, run: (close) => {
        const n = (name && name.value.trim()) || '';
        if (!n) { toast('Give the space a name.', { kind: 'err' }); return false; }
        if (!chosen.size) { toast('Pick at least one friend.', { kind: 'err' }); return false; }
        const extra = {};
        if (kind === 'trip') { if (startIn.value) extra.start = startIn.value; if (endIn.value) extra.end = endIn.value; if (placeIn.value.trim()) extra.place = placeIn.value.trim().slice(0, 120); }
        if (typeof APP_CONFIG !== 'undefined' && /^[A-Z]{3}$/.test(String(APP_CONFIG.currency || ''))) extra.currency = APP_CONFIG.currency;
        tgCreateSpace({ name: n, kind, members: [...chosen], extra }).then((id) => { if (id) setView('together:' + id); });
        close();
      } },
    ],
  });
}
async function tgCreateSpace(o) {
  const id = tgNewId('s');
  const busy = toast('Making the space…', { busy: true, icon: 'loader-circle' });
  try {
    await _tgFetch('/api/together/space', { id, name: o.name, kind: o.kind || 'list', icon: o.icon || null, members: o.members || [], extra: o.extra || null });
    await tgLoad();
    if (typeof busy === 'function') busy();
    toast(`${o.name}: invitations sent`, { kind: 'ok' });
    return id;
  } catch (e) {
    if (typeof busy === 'function') busy();
    toast(String(e.message || e), { kind: 'err', retry: () => tgCreateSpace(o) });
    return null;
  }
}
function tgInviteDialog(spaceId) {
  const v = tgVal(spaceId); if (!v) return;
  const chosen = new Set();
  openDialog({
    title: 'Invite friends', size: 'sm',
    body: (el) => { tgFriendPicker(el, chosen, { exclude: Object.keys(v.members || {}).filter(f => tgIsMember(v, f)) }); },
    actions: [
      { label: 'Cancel' },
      { label: 'Invite', primary: true, run: () => {
        if (!chosen.size) return false;
        const ops = [];
        for (const f of chosen) { const fr = tgFriends().find(x => x.id === f); ops.push({ op: 'set', path: ['members', f], value: { name: (fr && fr.name) || '', role: 'member', at: Date.now(), left: false, removed: false } }); }
        tgEdit(spaceId, ops, { toast: `Invited ${chosen.size === 1 ? tgName([...chosen][0]) : chosen.size + ' friends'}`, icon: 'user-plus' });
      } },
    ],
  });
}

/* ---------- your own task, shared with a friend ---------- */
/** Task menu items (32-tasks-ui.js). */
function togetherTaskMenuItems(id) {
  if (!tgOn()) return [];
  const t = getItem(id); if (!t) return [];
  // No friend yet: offer the way to get one instead of hiding the entry.
  if (!tgChannel() || !tgFriends().length) return [{ label: 'Share with a friend: add a friend…', icon: 'user-plus', run: () => { if (typeof friendsAddDialog === 'function') friendsAddDialog(); else setView('friends'); } }];
  if (t.shared && t.shared.space) return [{ label: 'Open shared copy', icon: 'users', run: () => { setView('together:' + t.shared.space); setTimeout(() => tgOpenItem(t.shared.space, t.shared.item), 50); } }];
  return [{ label: 'Share with a friend…', icon: 'user-plus', run: () => tgShareTaskDialog(id) }];
}
/** A pair space with this friend ("You & Sam"), or null. */
function tgPairWith(fid) {
  return tgSpaces().find(s => tgKindOf(s) === 'pair' && tgIsMember(s.value, fid) && tgMembers(s.value).length === 2) || null;
}
/** Pick one of your open tasks, then the share dialog with this friend chosen (friend pages and cards). */
function tgPickTaskToShare(fid) {
  if (!tgChannel() || !tgFriends().length) { if (typeof friendsAddDialog === 'function') friendsAddDialog(); else setView('friends'); return; }
  let q = null, list = null;
  const paint = () => {
    list.innerHTML = '';
    const needle = (q.value || '').trim().toLowerCase();
    const rows = getAllItems().filter(t => statusOf(t.id) !== 'done' && !(t.shared && t.shared.space) && (!needle || String(effTitle(t)).toLowerCase().includes(needle)))
      .sort((a, b) => String(effDate(a) || '9999').localeCompare(String(effDate(b) || '9999'))).slice(0, 40);
    if (!rows.length) { list.appendChild(tgEl('p', 'muted tg-sm', needle ? 'No open task matches.' : 'You have no open tasks to share.')); return; }
    for (const t of rows) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tg-fr-space';
      const n = document.createElement('span'); n.className = 'tg-fr-space-n'; n.textContent = effTitle(t);
      const d = document.createElement('span'); d.className = 'muted num'; d.textContent = effDate(t) || '';
      b.append(n, d);
      b.onclick = () => { tgShareTaskDialog(t.id, fid); };
      list.appendChild(b);
    }
  };
  openDialog({
    title: fid ? `Share a task with ${tgFirst(fid)}` : 'Share a task', size: 'sm',
    body: (el) => {
      q = document.createElement('input'); q.className = 'control'; q.placeholder = 'Search your tasks…'; q.setAttribute('autofocus', '');
      q.oninput = paint;
      list = tgEl('div', 'tg-fr-spaces');
      el.append(q, list);
      paint();
    },
    actions: [{ label: 'Cancel' }],
  });
}
function tgShareTaskDialog(taskId, presetFriend) {
  const t = getItem(taskId); if (!t) return;
  const chosen = new Set(presetFriend ? [presetFriend] : []);
  let spaceSel = null, askBox = null, notesBox = null;
  const fill = () => {
    if (!spaceSel) return;
    const f = [...chosen][0];
    spaceSel.innerHTML = '';
    if (!f) { spaceSel.appendChild(new Option('Pick a friend first', '')); spaceSel.disabled = true; return; }
    spaceSel.disabled = false;
    const pair = tgPairWith(f);
    spaceSel.appendChild(new Option(pair ? tgSpaceName(pair) : `New: just you and ${tgFirst(f)}`, pair ? pair.id : '__pair'));
    for (const s of tgSpaces()) if (s !== pair && tgIsMember(s.value, f)) spaceSel.appendChild(new Option(tgSpaceName(s), s.id));
  };
  openDialog({
    title: 'Share with a friend', size: 'sm',
    body: (el) => {
      el.appendChild(tgEl('div', 'tg-quote', effTitle(t)));
      el.appendChild(tgEl('div', 'field-label', 'With'));
      tgFriendPicker(el, chosen, { single: true, onChange: fill });
      const f = tgEl('label', 'field'); f.appendChild(tgEl('span', 'field-label', 'In'));
      spaceSel = document.createElement('select'); spaceSel.className = 'control control-sm'; f.appendChild(spaceSel); el.appendChild(f);
      const a = tgEl('label', 'tg-toggle'); askBox = document.createElement('input'); askBox.type = 'checkbox'; askBox.checked = true;
      a.append(askBox, tgEl('span', '', 'Ask them to do it (it waits in your Waiting list until they finish)'));
      el.appendChild(a);
      const n = tgEl('label', 'tg-toggle'); notesBox = document.createElement('input'); notesBox.type = 'checkbox'; notesBox.checked = false;
      n.append(notesBox, tgEl('span', '', 'Share its description too'));
      el.appendChild(n);
      el.appendChild(tgEl('p', 'muted tg-sm', 'Only the title, due date and priority are shared (and the description if you tick it). They see it as “From you” and choose Accept or Decline.'));
      fill();
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Share', primary: true, run: () => {
        const f = [...chosen][0];
        if (!f) { toast('Pick a friend.', { kind: 'err' }); return false; }
        tgShareTask(taskId, f, spaceSel.value, { ask: askBox.checked, notes: notesBox.checked });
      } },
    ],
  });
}
async function tgShareTask(taskId, fid, spaceChoice, o) {
  const t = getItem(taskId); if (!t) return;
  let spaceId = spaceChoice;
  if (!spaceId || spaceId === '__pair') {
    const meName = userName() || 'Me';
    spaceId = await tgCreateSpace({ name: `${String(meName).split(/\s+/)[0]} & ${tgFirst(fid)}`, kind: 'pair', members: [fid] });
    if (!spaceId) return;
  }
  const itemId = tgNewId('t');
  const val = { title: String(effTitle(t)).slice(0, 300), by: tgMe(), at: Date.now(), status: 'todo', priority: effPriority(t) || 'p0', due: effDate(t) || null };
  if (o.ask) val.assignee = fid;
  if (o.notes && effDetail(t)) val.notes = String(effDetail(t)).slice(0, 4000);
  const ok = await tgEdit(spaceId, [{ op: 'set', path: ['items', itemId], value: val }], { undo: false });
  if (!ok) return;
  // Your task: linked, and waiting on them (the existing Waiting list, 34-waiting.js).
  t.shared = { space: spaceId, item: itemId, to: fid };
  if (o.ask && typeof RF_DO !== 'undefined' && RF_DO.wait) RF_DO.wait(t, { person: tgPersonFor(fid) });
  saveData(); render();
  const mark = typeof undoMark === 'function' ? undoMark() : null;
  toast(o.ask ? `Asked ${tgFirst(fid)}: it waits in your Waiting list` : `Shared with ${tgFirst(fid)}`, { icon: 'user-plus',
    action: { label: 'Undo', run: () => { if (mark && typeof undoMarked === 'function') undoMarked(mark); tgEdit(spaceId, [{ op: 'del', path: ['items', itemId] }], { undo: false }); } },
    action2: { label: 'Open it', run: () => { setView('together:' + spaceId); setTimeout(() => tgOpenItem(spaceId, itemId), 50); } } });
}
/**
 * Your People record for a friend, when you already have one (linked by friendId, or the same name).
 * Never made from the friend's own name: that is friend text, and People reach Claude and the MCP.
 * Without one, the task simply waits ("waiting on someone"); its panel says who.
 */
function tgPersonFor(fid) {
  const list = Array.isArray(state.people) ? state.people : [];
  let p = list.find(x => x && x.friendId === fid);
  if (p) return p.id;
  const name = tgName(fid);
  if (!name || name === 'A friend') return null;
  const lower = name.toLowerCase();
  p = list.find(x => x && !x.self && String(x.name || '').toLowerCase() === lower);
  if (p) p.friendId = fid;   // an id only: your own record, your own text
  return p ? p.id : null;
}
/** The shared copy of one of your tasks, in its panel (60-task-detail.js tdRelatedSection). */
function togetherTaskSection(taskId) {
  if (!tgOn()) return null;
  const t = getItem(taskId);
  if (!t || !t.shared || !t.shared.space) return null;
  const sp = tgSpace(t.shared.space);
  const sec = tgEl('section', 'dp-section tg-tsec');
  const h = tgEl('div', 'dp-sh'); h.appendChild(tgEl('h4', '', 'Shared'));
  sec.appendChild(h);
  const it = sp && (sp.value.items || []).find(x => x.id === t.shared.item);
  if (!sp || !it) {
    sec.appendChild(tgEl('p', 'muted tg-sm', tgHas() ? 'The shared copy is gone (deleted in the space, or the space was left).' : 'Loading the shared copy…'));
    if (tgHas()) sec.appendChild(tgBtn('Stop sharing', { ghost: true, run: () => { delete t.shared; saveData(); render(); } }));
    return sec;
  }
  const v = sp.value, to = it.assignee;
  const line = tgEl('div', 'tg-tsec-line');
  if (to) line.appendChild(tgAvatarEl(to, 'sm', v));
  const ack = to && it.ack && it.ack[to];
  let txt = `In ${tgSpaceName(sp)}`;
  if (to && to !== tgMe()) txt = it.status === 'done' ? `${tgFirst(to, v)} finished it` : ack === 'accepted' ? `${tgFirst(to, v)} is on it` : ack === 'declined' ? `${tgFirst(to, v)} declined` : `Waiting for ${tgFirst(to, v)} to accept`;
  line.appendChild(tgEl('span', '', txt));
  sec.appendChild(line);
  const acts = tgEl('div', 'tg-acts');
  if (it.status === 'done' && statusOf(taskId) !== 'done') acts.appendChild(tgBtn('Mark mine done', { primary: true, icon: 'circle-check', run: () => toggleDone(taskId) }));
  if (ack === 'declined' && typeof rfIsWaiting === 'function' && rfIsWaiting(t)) acts.appendChild(tgBtn('Back on my list', { icon: 'rotate-ccw', run: () => { if (typeof rfDo === 'function') rfDo('unwait', taskId); } }));
  acts.appendChild(tgBtn('Open in the space', { ghost: true, icon: 'users', run: () => { setView('together:' + sp.id); setTimeout(() => tgOpenItem(sp.id, it.id), 50); } }));
  sec.appendChild(acts);
  sec.appendChild(tgCommentsEl(sp.id, it, sp.status !== 'joined'));
  return sec;
}
