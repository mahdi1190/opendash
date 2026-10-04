/* ============================================================
   HOME widget "inbox": Needs reply (WIDGETS_CATALOGUE.md 3.7).
   OWNER: the "inbox" widget builder. Styles: 13-home-w-inbox.css. The pure
   parts (sizes, the summary, the prefills, the undo fold): 12-home-inbox-logic.js.
   The inbox cut down to what needs the user (homeNeedsReply through
   emailNeedsReply, 55-email-actions.js: not handled, not answered by the user
   last, no newsletters or noreply, newer than maxDays; people you know first).

   The user's rule (3 Oct): a main button opens the NORMAL editor, already
   filled in, and nothing is written before Save; the small ✓ beside it does
   the same thing as it is, at once, with Undo. On each row:
     Task       the new-task card, prefilled with exactly what ✓ adds ("Reply to
                Sam: <subject>", due today, the sender linked when in People, #email,
                the thread in the detail). Save adds it, relates the thread and marks
                it handled: ONE undo step. Pressing Task again while that card is
                open does nothing (the edits stay).
     Task ✓     emailQuickTask: the same task at once; the toast offers Undo and Open.
     Reply      the Gmail draft editor, prefilled (GmailDraft.openEditor: a DRAFT in the
                thread, never sent); without Gmail drafts, the mail app (mailto) and a
                "Mark as handled" toast.
     Reply ✓    GmailDraft.quick: the reply template saved as a draft at once; the
                receipt's Undo deletes it. The row then says "Draft in Gmail".
     Done       "Nothing to do" (emailMarkHandled 'dismiss'), Undo.
     Gmail      the thread in Gmail (also a click on the sender or subject).
   Handled rows glide out first; new threads (a new newest message) rise in once.
   Keys on a row: Enter = open in Gmail, T = the task card, X = nothing to do.

   Sizes: S the count, how many from people you know and the oldest of those;
   M six rows; L the same plus Claude's pending suggestions (selectList: Add
   selected / Dismiss selected; each one also opens prefilled or ✓; Suggest
   tasks is the existing run, only on a click); full: side by side, eight rows.
   No mailbox: the greyed Connect state. Nothing left: one calm line (the widget
   stays: that is good news). Update shows when the inbox is over 6 hours old.
   Settings (state.home.widgetPrefs.inbox): knownOnly, maxDays 7 | 14 | 30.
   ============================================================ */
const _hin = { drafted: new Map(), watch: 0, open: null, sugLeft: new Set() };   // drafts saved this session; the job watcher; the row whose editor is open; suggestions acted on one by one

registerHomeWidget({
  id: 'inbox', title: 'Needs reply', icon: 'inbox', order: 160, group: 'people', gate: 'email',
  description: 'The emails that need a reply from you, triaged in one click',
  sizes: ['s', 'm', 'l', 'full'], defaultSize: 'm', defaultHidden: true, fresh: true,
  aliases: ['email', 'emails', 'mail', 'needs reply', 'replies', 'to reply'],
  defaults: { knownOnly: false, maxDays: 14 },
  available: () => true,
  sample: (kit) => _hinSample(kit),
  render(el, ctx) { return _hinRender(el, ctx || {}); },
  settings(anchor, ctx) {
    homeSettingsMenu(anchor, ctx, [
      { key: 'knownOnly', label: 'Only people you know', type: 'toggle', hint: 'Leave out senders who are not in People' },
      { key: 'maxDays', label: 'Age limit', hint: 'Leave out older threads', type: 'choice', choices: [[7, '7 days'], [14, '14 days'], [30, '30 days']] },
    ], { foot: 'Replies are saved as Gmail drafts. Nothing is ever sent from here.' });
  },
  unmount() { _hinStopWatch(); },
});

/* ---------- data ---------- */
/** The inbox store, loaded through homeData (one request; this widget repaints when it changes). */
function _hinLoad() {
  if (typeof InboxStore === 'undefined' || !InboxStore) return Promise.resolve(null);
  return InboxStore.load(!!InboxStore.st.loaded).then((d) => {
    const msgs = d && Array.isArray(d.messages) ? d.messages : [];
    if (!d) return InboxStore.st.error ? { error: String(InboxStore.st.error).slice(0, 200) } : null;
    return { fetchedAt: d.fetchedAt || null, n: msgs.length, top: msgs[0] ? `${msgs[0].id}|${msgs[0].date}` : '' };
  });
}
function _hinPrefs(ctx) {
  const p = Object.assign({ knownOnly: false, maxDays: 14 }, (ctx && ctx.prefs) || {});
  return { knownOnly: !!p.knownOnly, maxDays: [7, 14, 30].includes(Number(p.maxDays)) ? Number(p.maxDays) : 14 };
}
function _hinDraftsOk() {
  const G = window.GmailDraft;
  try { return !!(G && typeof G.available === 'function' && G.available()); } catch (e) { return false; }
}
function _hinSample(kit) {
  const rows = homeInboxSampleRows(kit && kit.emails, { now: Date.now(), known: 2 });
  const today = (kit && kit.today) || todayStr();
  return {
    rows,
    sugs: rows.length ? [
      { id: 'sample-sug-1', emailId: rows[0].id, title: 'Send the revised contract terms', detail: 'They asked for the terms by Friday.', stream: null, priority: 'p2', peopleIds: [], tags: [], dueHint: 2, status: 'pending', at: Date.now() },
      { id: 'sample-sug-2', emailId: (rows[1] || rows[0]).id, title: 'Share the slides before Monday', detail: '', stream: null, priority: 'p3', peopleIds: [], tags: [], dueHint: null, status: 'pending', at: Date.now() - 1 },
    ] : [],
    today,
  };
}

/* ---------- render ---------- */
function _hinRender(el, ctx) {
  const size = ['s', 'm', 'l', 'full'].includes(ctx.size) ? ctx.size : 'm';
  const prefs = _hinPrefs(ctx);
  const card = document.createElement('section');
  card.className = `card home-card hin hin--${size}`;
  const body = document.createElement('div'); body.className = 'card-b hin-b';
  let rows, sugs = [], fetchedAt = null, running = false, draftsOk = true;
  if (ctx.preview) {
    const s = homeSample('inbox') || {};
    rows = Array.isArray(s.rows) ? s.rows : [];
    sugs = size === 'l' || size === 'full' ? (s.sugs || []) : [];
    fetchedAt = new Date().toISOString();   // clock-ok: an instant (UTC timestamp)
  } else {
    // sig: ask again once the server answers (the first Home paint runs before the health check).
    const up = typeof _serverAvailable !== 'undefined' && _serverAvailable ? 'up' : 'down';
    const ds = homeData('hin:inbox', _hinLoad, { ctx, maxAge: 5 * 60000, sig: up });
    if (window.GmailDraft && typeof GmailDraft.info === 'function') homeData('hin:drafts', () => GmailDraft.info(), { ctx, maxAge: 10 * 60000, sig: up });
    const store = typeof InboxStore !== 'undefined' ? InboxStore : null;
    const msgs = typeof emailMessages === 'function' ? emailMessages() : [];
    running = !!(store && store.running());
    if (running) _hinWatch();
    fetchedAt = store && store.data ? store.data.fetchedAt || null : null;
    draftsOk = _hinDraftsOk();
    if (!msgs.length) {
      card.appendChild(_hinHead(ctx, size, { n: '', fetchedAt, running, quiet: true }));
      card.appendChild(body);
      el.appendChild(card);
      if (!store || (!store.st.loaded && (store.st.loading || ds.status === 'loading'))) { body.appendChild(_hinSkeleton(size)); return true; }
      if (store.access() === 'no') {
        const off = ctx.off({ icon: 'inbox', title: 'Connect a mailbox',
          text: 'Needs reply shows the threads waiting on you. It reads subjects and senders, never whole emails, and never sends anything.',
          action: { label: 'Connect', icon: 'plug', run: () => (window.Connections && Connections.open ? Connections.open('gmail') : setView('connections')) } });
        off.classList.add('hin-off');
        body.appendChild(off);
        const upd = card.querySelector('.hin-upd');          // Connect comes first; Update means nothing yet
        if (upd) upd.remove();
        return true;
      }
      body.appendChild(_hinNoMail(running));
      return true;
    }
    rows = homeMemo(ctx, homeMemoSig({ extra: [fetchedAt, msgs.length, msgs[0] && msgs[0].id, prefs.knownOnly, prefs.maxDays] }),
      () => (typeof emailNeedsReply === 'function' ? emailNeedsReply({ maxDays: prefs.maxDays, knownOnly: prefs.knownOnly }) : []));
    if ((size === 'l' || size === 'full') && _hinAiOn()) sugs = homeInboxPending(state.emailTriage, { limit: 8 });
  }
  const model = homeInboxModel(rows, { size });
  if (!ctx.preview && typeof delightInboxSeen === 'function') delightInboxSeen(model.count || 0);   // inbox zero (78-delight-hooks.js)
  card.appendChild(_hinHead(ctx, size, { n: model.count ? String(model.count) : '', fetchedAt, running }));
  card.appendChild(body);
  el.appendChild(card);
  const wide = (size === 'l' || size === 'full') && _hinAiOn();
  card.classList.toggle('hin--split', wide);
  card.classList.toggle('hin--calm', !model.count);

  // The list (or the summary, or the calm line).
  const main = document.createElement('div'); main.className = 'hin-main';
  body.appendChild(main);
  let list = null;
  if (!model.count) main.appendChild(_hinCalm(ctx, prefs, fetchedAt));
  else if (size === 's') main.appendChild(_hinSummary(ctx, model));
  else {
    list = document.createElement('ul'); list.className = 'hin-list'; list.setAttribute('aria-label', 'Threads that need a reply');
    for (const r of model.shown) list.appendChild(_hinRow(r, ctx, draftsOk));
    main.appendChild(list);
  }
  if (size !== 's' && model.count) main.appendChild(_hinFoot(ctx, model, fetchedAt, draftsOk));
  if (wide) body.appendChild(_hinSugs(ctx, sugs));
  if (list && !ctx.preview) {
    homeRowKeys(list, {
      open: (id, row) => { const a = row.querySelector('.hin-txt'); if (a && a.href && /^https:/.test(a.href)) window.open(a.href, '_blank', 'noopener'); },
      today: (id, row) => { const b = row.querySelector('.hin-task'); if (b) b.click(); },
      done: (id, row) => { const b = row.querySelector('.hin-done'); if (b) b.click(); },
    });
    if (ctx.enterNew) ctx.enterNew(list.children, (li) => li.dataset.enter);
  }
  if (!ctx.preview && size !== 's') homeSuggestSlot(body, ctx, { threads: model.shown.map(r => r.id) });
  return true;
}
function _hinAiOn() { return !(APP_CONFIG.features && APP_CONFIG.features.ai === false); }

function _hinHead(ctx, size, o) {
  const h = hglHead({ icon: 'inbox', title: 'Needs reply', n: o.n,
    link: ctx.preview ? null : { label: 'Triage', title: 'Open Email triage', run: () => _hinTriage() } });
  const link = h.querySelector('.hgl-link');
  const put = (b) => (link ? h.insertBefore(b, link) : h.appendChild(b));
  if (!ctx.preview && (o.running || homeInboxStale(o.fetchedAt))) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm hin-upd';
    b.setAttribute('data-requires', 'gmail');
    b.innerHTML = icon(o.running ? 'loader-circle' : 'refresh-cw', _hinSpin(o.running)) + `<span>${o.running ? 'Updating…' : 'Update'}</span>`;
    b.disabled = !!o.running;
    if (o.running) b.setAttribute('aria-busy', 'true');
    b.title = o.fetchedAt ? `${gdAgeLabel(o.fetchedAt)}: read the inbox again` : 'Read your recent email (subjects and senders only)';
    b.onclick = () => _hinUpdate(ctx);
    put(b);
  }
  if (!ctx.preview && !ctx.editing && size !== 's' && typeof homeSettingsButton === 'function') put(homeSettingsButton(ctx));
  return h;
}
function _hinTriage() { if (state.view !== 'triage') setView('triage'); }
/** The busy icon's class (a CSS class, not an icon name). */
function _hinSpin(on) { return on ? 'spin' : ''; }

function _hinSkeleton(size) {
  const box = document.createElement('div'); box.className = 'hin-skel'; box.setAttribute('aria-busy', 'true'); box.setAttribute('aria-label', 'Loading your inbox');
  const n = size === 's' ? 2 : 4;
  box.innerHTML = Array.from({ length: n }, (_, i) => `<div class="hin-sk-row"><span class="skeleton hin-sk-av"></span><span class="hin-sk-tx"><span class="skeleton skeleton-text" style="width:${38 + (i % 3) * 12}%"></span><span class="skeleton skeleton-text" style="width:${62 + (i % 2) * 18}%"></span></span></div>`).join('');
  return box;
}
function _hinNoMail(running) {
  const box = hglEmpty({ icon: 'inbox', title: 'No email yet', text: 'Update the inbox to see which threads need a reply. It reads subjects and senders only.',
    actions: [{ label: running ? 'Updating…' : 'Update inbox', icon: 'refresh-cw', primary: true, run: () => _hinUpdate(null) }] });
  box.classList.add('hin-nomail');
  const b = box.querySelector('.btn');
  if (b) { b.setAttribute('data-requires', 'gmail'); b.disabled = !!running; }
  return box;
}
/** Nothing needs the user: one calm line (the "all caught up" moment, its scene plays once). */
function _hinCalm(ctx, prefs, fetchedAt) {
  const box = document.createElement('div'); box.className = 'hin-calm';
  const art = hglScene('email', { size: 'sm', once: true });
  const sub = [fetchedAt ? gdAgeLabel(fetchedAt, 'Checked') : '', `last ${prefs.maxDays} days`].filter(Boolean).join(' · ');
  // Data over a day old only says what it knew then (Update is in the header).
  const old = !!fetchedAt && !ctx.preview && Date.now() - (Date.parse(fetchedAt) || Date.now()) > 86400000;
  const head = prefs.knownOnly ? (old ? 'Nobody you know was waiting for a reply' : 'Nobody you know is waiting for a reply') : (old ? 'Nothing needed a reply' : 'Nothing needs a reply');
  box.innerHTML = `${art || `<span class="hin-calm-ic">${icon('check-check')}</span>`}<div><b>${head}</b><span>${esc(sub)}</span></div>`;
  if (ctx.firstPaint && !ctx.preview) hglAnim(box, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 180 });
  return box;
}

/* S: how many, how many from people you know, the oldest of those. */
function _hinSummary(ctx, model) {
  const s = homeInboxSummary(model);
  const box = document.createElement('div'); box.className = 'hin-sum';
  box.innerHTML = `<div class="hin-big-l"><span class="hin-big num">${esc(s.big)}</span><span class="hin-unit">${esc(s.unit)}</span></div>`
    + (s.known ? `<div class="hin-known">${esc(s.known)}</div>` : '');
  const o = model.oldestKnown;
  if (o) {
    const a = document.createElement('a'); a.className = 'hin-oldest';
    const link = ctx.preview ? '' : _hinLink(o);
    if (link) { a.href = safeUrl(link); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.title = 'Open in Gmail'; }
    a.innerHTML = `${_hinAvatar(o, 20)}<span class="hin-oldest-t"><span>Oldest: </span><b></b></span>`;
    a.querySelector('b').textContent = s.oldest;
    box.appendChild(a);
  }
  if (ctx.firstPaint && !ctx.preview) hglAnim(box.querySelector('.hin-big'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 160 });
  return box;
}

function _hinFoot(ctx, model, fetchedAt, draftsOk) {
  const f = document.createElement('div'); f.className = 'hgl-foot hin-foot';
  const age = fetchedAt ? gdAgeLabel(fetchedAt, 'Checked') : '';
  f.innerHTML = `${icon(draftsOk ? 'shield-check' : 'info')}<span class="hin-foot-t">${esc([age, draftsOk ? 'replies are drafts, never sent' : ''].filter(Boolean).join(' · ') || 'Nothing is sent from here')}</span>`;
  if (model.more > 0) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm hin-more';
    b.innerHTML = `<span>+${model.more} more</span>${icon('arrow-right')}`;
    b.title = 'The rest in Email triage';
    if (!ctx.preview) b.onclick = () => _hinTriage();
    f.appendChild(b);
  }
  return f;
}

/* ---------- a row ---------- */
function _hinLink(r) {
  const m = (r && r.m) || {};
  return typeof _emLink === 'function' ? _emLink(m) : (/^https:\/\//.test(m.link || '') ? m.link : '');
}
function _hinPerson(r) { try { return r && r.personId && typeof getPerson === 'function' ? getPerson(r.personId) : null; } catch (e) { return null; } }
function _hinAvatar(r, size) {
  const p = _hinPerson(r);
  if (p) return homeAvatar(p, size);
  return `<span class="avatar hin-av-x" style="--size:${size}px;--c:var(--sw-slate)" aria-hidden="true">${esc(avatarInitials(r.name || r.email || '?'))}</span>`;
}
function _hinBtn(cls, html, aria, tip) {
  const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html;
  if (aria) b.setAttribute('aria-label', aria);
  if (tip) b.setAttribute('data-tip', tip);
  return b;
}
function _hinRow(r, ctx, draftsOk) {
  const m = r.m || {};
  const subject = String(m.subject || '(no subject)');
  const age = homeInboxAgeText(r.ageDays);
  const li = document.createElement('li');
  li.className = 'hin-row hgl-row' + (r.unread ? ' is-unread' : '') + (r.known ? ' is-known' : '');
  li.dataset.flip = 'in:' + r.id; li.dataset.id = r.id; li.dataset.enter = homeInboxRowKey(r);
  li.dataset.row = r.id; li.tabIndex = 0;
  li.setAttribute('aria-label', `${r.name}: ${subject}, ${age === 'today' ? 'today' : age + ' old'}${r.count > 1 ? `, ${r.count} messages` : ''}`);
  const drafted = _hin.drafted.get(r.id) || null;
  const link = ctx.preview ? '' : _hinLink(r);
  const txt = document.createElement('a'); txt.className = 'hin-txt'; txt.tabIndex = -1;
  if (link) { txt.href = safeUrl(link); txt.target = '_blank'; txt.rel = 'noopener noreferrer'; txt.title = 'Open in Gmail'; }
  txt.innerHTML = `<span class="hin-l1"><b class="hin-from"></b>${r.count > 1 ? `<span class="hin-cnt" title="${r.count} messages">${r.count}</span>` : ''}`
    + `${r.important ? `<span class="hin-imp" title="Marked important">${icon('flag')}<span class="sr-only">important</span></span>` : ''}<span class="hin-age">${esc(age)}</span></span>`
    + '<span class="hin-subj"></span>';
  txt.querySelector('.hin-from').textContent = r.name || r.email || 'Someone';
  txt.querySelector('.hin-subj').textContent = subject;
  if (drafted) {
    const d = document.createElement(drafted.url ? 'a' : 'span'); d.className = 'hin-drafted';
    if (drafted.url) { d.href = safeUrl(drafted.url); d.target = '_blank'; d.rel = 'noopener noreferrer'; d.tabIndex = -1; d.title = 'Open the draft in Gmail'; }
    d.innerHTML = icon('mail-check') + '<span>Draft in Gmail</span>';
    txt.appendChild(d);
  }
  li.insertAdjacentHTML('afterbegin', `<span class="hin-av">${_hinAvatar(r, 28)}</span>`);
  li.appendChild(txt);

  const acts = document.createElement('div'); acts.className = 'hin-acts';
  const sec = document.createElement('div'); sec.className = 'hin-sec';
  const first = r.first || 'them';
  const reply = _hinBtn('btn btn-ghost btn-sm btn-icon hin-reply', icon('pencil'), drafted ? `Reply to ${first}: drafted in Gmail` : `Draft a reply to ${first}`,
    drafted ? 'Drafted in Gmail' : (draftsOk ? 'Draft a reply (saved in Gmail, not sent)' : 'Reply in your mail app'));
  if (drafted) { reply.setAttribute('aria-pressed', 'true'); reply.classList.add('is-done'); }
  reply.onclick = () => _hinReply(r, reply, li);
  // Reply and its ✓ sit together (the ✓ belongs to Reply, not to the row).
  const pair = document.createElement('span'); pair.className = 'hin-pair';
  pair.appendChild(reply);
  if (draftsOk && !drafted) {
    const rq = _hinBtn('btn btn-ghost btn-sm btn-icon hin-ok hin-reply-ok', icon('check'), `Save a reply draft to ${first} now`, 'Reply draft now · Undo');
    rq.onclick = () => _hinReplyNow(r, rq);
    pair.appendChild(rq);
    pair.classList.add('has-ok');
  }
  sec.appendChild(pair);
  const done = _hinBtn('btn btn-ghost btn-sm hin-done' + (drafted ? '' : ' btn-icon'), icon('archive') + (drafted ? '<span>Mark handled</span>' : ''),
    drafted ? `Mark ${subject} as handled` : `Nothing to do: ${subject}`, drafted ? 'Mark as handled · X' : 'Nothing to do · X');
  done.onclick = () => _hinDone(r, done, li);
  sec.appendChild(done);
  if (link) {
    const g = document.createElement('a'); g.className = 'btn btn-ghost btn-sm btn-icon hin-gmail'; g.href = safeUrl(link); g.target = '_blank'; g.rel = 'noopener noreferrer';
    g.setAttribute('aria-label', 'Open in Gmail'); g.setAttribute('data-tip', 'Open in Gmail · Enter'); g.innerHTML = icon('external-link');
    sec.appendChild(g);
  }
  const pri = document.createElement('div'); pri.className = 'hin-pri';
  const task = _hinBtn('btn btn-secondary btn-sm hin-task', icon('circle-plus') + '<span>Task</span>', `Make a task: reply to ${first} about ${subject}`, 'Opens the new task, filled in · T');
  task.onclick = () => _hinTaskOpen(r, task, li);
  const tq = _hinBtn('btn btn-secondary btn-sm btn-icon hin-ok hin-task-ok', icon('check'), `Add the task "Reply to ${first}" now`, 'Add it now · Undo');
  tq.onclick = () => _hinTaskNow(r, tq, li);
  pri.append(task, tq);
  acts.append(sec, pri);
  li.appendChild(acts);
  if (!ctx.preview) {
    if (_hinIsOpen(r.id)) li.setAttribute('aria-current', 'true');
    li.addEventListener('focusin', () => { if (!_hinIsOpen(r.id)) li.removeAttribute('aria-current'); });
  }
  return li;
}

/* ---------- which row's editor is open (the current item) ---------- */
function _hinCardOpenFor(key) {
  try {
    if (typeof _tc === 'undefined' || !_tc || _tc.closing || typeof _tcCur !== 'function') return false;
    const cur = _tcCur();
    return !!(cur && cur.kind === 'create' && cur.draft && cur.draft.onCreated && cur.draft.onCreated._hinKey === key);
  } catch (e) { return false; }
}
function _hinIsOpen(id) {
  const o = _hin.open;
  if (!o || o.id !== id) return false;
  if (o.kind === 'task') return _hinCardOpenFor(o.key);
  return !!document.querySelector('.modal .gmd, .gmd');
}
function _hinMarkCurrent(li, o) {
  _hin.open = o;
  for (const x of document.querySelectorAll('.hin-row[aria-current="true"], .hin-sug[aria-current="true"]')) if (x !== li) x.removeAttribute('aria-current');
  if (li) li.setAttribute('aria-current', 'true');
}
function _hinFocusCard() {
  try { if (typeof _tcFocusStart === 'function') _tcFocusStart(); } catch (e) { /* the card moved on */ }
}

/* ---------- actions ---------- */
function _hinQuiet() { return typeof _hglQuiet === 'function' ? _hglQuiet() : true; }
/** The row glides out (then the write repaints Home without it). Instant under reduced motion. */
function _hinLeave(li) {
  if (!li || !li.isConnected || typeof li.animate !== 'function' || _hinQuiet()) return Promise.resolve();
  const h = li.offsetHeight;
  const a = li.animate([
    { opacity: 1, transform: 'none', height: h + 'px' },
    { opacity: 0, transform: 'translateX(14px)', height: h + 'px', offset: 0.55 },
    { opacity: 0, transform: 'translateX(14px)', height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px' },
  ], { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
  return a.finished.then(() => {}, () => {});
}
function _hinUnleave(li) { try { if (li && li.getAnimations) for (const a of li.getAnimations()) a.cancel(); } catch (e) { /* gone */ } }
/** A toast with Undo, plus Open for a new task. */
function _hinToast(msg, taskId) {
  toast(msg, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
  const host = document.getElementById('toast-host');
  const t = host && host.lastElementChild;
  if (!t || !taskId || typeof openTask !== 'function') return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = 'Open';
  b.onclick = () => { t.classList.add('out'); setTimeout(() => t.remove(), 160); if (getItem(taskId)) openTask(taskId); };
  t.appendChild(b);
}
/** The card's Save: what fn() saves folds into the task's own undo step (one Undo takes it all back). */
function _hinCreated(fn) {
  const stack = typeof _undoStack !== 'undefined' && Array.isArray(_undoStack) ? _undoStack : null;
  const mark = stack && stack.length ? stack[stack.length - 1] : null;      // the state before the card added the task
  try { fn(); } finally { if (stack) homeInboxFoldUndo(stack, mark); }
}
/** The thread on the task's Related list (what emailQuickTask does). */
function _hinRelate(taskId, m) {
  const t = getItem(taskId);
  if (!t || !m || !m.id) return;
  if (Array.isArray(t.related) && t.related.some(x => x && x.type === 'email' && x.id === m.id)) return;
  const link = _hinLink({ m });
  t.related = [...(Array.isArray(t.related) ? t.related : []), Object.assign({ type: 'email', id: m.id, label: String(m.subject || '(no subject)').slice(0, 200), at: Date.now() },
    /^https:\/\//.test(link) ? { link } : {}, m.from && m.from.email ? { from: String(m.sender || m.from.email).slice(0, 120) } : {}, m.date ? { date: String(m.date).slice(0, 25) } : {})];
}
/** Open a create card prefilled; the parser leaves the prefilled title's words alone. */
function _hinOpenCard(pre, key, from, onSaved) {
  pre.ignore = typeof parseQuickAdd === 'function' ? homeInboxIgnore(parseQuickAdd(pre.title)) : [];
  const onCreated = (id) => _hinCreated(() => onSaved(id));
  onCreated._hinKey = key;
  pre.onCreated = onCreated;
  if (typeof tcOpenCreate === 'function') tcOpenCreate(pre, { from });
  else if (typeof openNewTask === 'function') openNewTask(pre.title, { from });
}

/* Task: the new-task card, prefilled (nothing is saved before Save). */
function _hinTaskOpen(r, btn, li) {
  const key = 'thread:' + r.id;
  if (_hinCardOpenFor(key)) { _hinFocusCard(); return; }          // already open: the edits stay
  const m = r.m || {};
  const pre = homeInboxTaskPrefill(r, { today: todayStr(), link: _hinLink(r), sender: m.sender || (typeof _emSenderName === 'function' ? _emSenderName(m) : r.name) });
  _hinMarkCurrent(li, { kind: 'task', id: r.id, key });
  _hinOpenCard(pre, key, btn, (id) => {
    _hinRelate(id, m);
    emailMarkHandled(m.id, 'task', id);
    if (typeof homeAnnounce === 'function') homeAnnounce('Task added: ' + (m.subject || 'reply'));
  });
}
/* Task ✓: the same task at once. */
function _hinTaskNow(r, btn, li) {
  const m = r.m || {};
  homeAction(btn, () => _hinLeave(li).then(() => {
    const id = emailQuickTask(m);
    if (!id) { _hinUnleave(li); return false; }
    _hinToast('Task added: ' + (m.subject || '(no subject)'), id);
    return id;
  }), { say: 'Task added: ' + (m.subject || 'reply') }).then((x) => { if (!x) _hinUnleave(li); });
}
/* Done: nothing to do. */
function _hinDone(r, btn, li) {
  homeAction(btn, () => _hinLeave(li).then(() => { emailMarkHandled(r.id, 'dismiss'); return true; }),
    { toast: _hin.drafted.has(r.id) ? 'Marked as handled' : 'Marked as nothing to do', undo: true, say: 'Nothing to do: ' + ((r.m && r.m.subject) || 'thread') })
    .then((x) => { if (!x) _hinUnleave(li); });
}
function _hinSetDrafted(id, res) {
  _hin.drafted.set(id, { at: Date.now(), url: res && /^https:\/\//.test(String(res.viewUrl || '')) ? res.viewUrl : '' });
  _hinRepaint();
}
function _hinUndrafted(id) { if (_hin.drafted.delete(id)) _hinRepaint(); }
/* Reply: the draft editor, prefilled (a Gmail draft, never sent); the mail app without drafts. */
async function _hinReply(r, btn, li) {
  if (_hin.drafted.has(r.id) || btn.getAttribute('aria-busy') === 'true') return;   // drafted already: done
  const G = window.GmailDraft;
  if (!G) return;
  if (document.querySelector('.gmd')) return;                                     // an editor is open
  btn.setAttribute('aria-busy', 'true');
  try { if (typeof G.info === 'function') await G.info(); } catch (e) { /* the editor says why */ }
  btn.removeAttribute('aria-busy');
  const pre = G.prefill('reply', { message: r.m });
  if (!pre) { toast('There is no address to reply to.', { kind: 'err' }); return; }
  if (G.available()) {
    _hinMarkCurrent(li, { kind: 'reply', id: r.id });
    G.openEditor(pre, { title: `Reply to ${r.first || 'them'}`,
      onSaved: (res) => { _hin.open = null; _hinSetDrafted(r.id, res); },
      onCancel: () => { _hin.open = null; li.removeAttribute('aria-current'); },
      onUndone: () => _hinUndrafted(r.id) });
    return;
  }
  G.mailto(pre);
  toast('Reply opened in your mail app. Nothing is sent from here.', { icon: 'mail', timeout: 8000, action: { label: 'Mark as handled', run: () => { emailMarkHandled(r.id, 'dismiss'); toast('Marked as handled', { action: { label: 'Undo', run: () => undo() } }); } } });
}
/* Reply ✓: the reply template saved as a Gmail draft at once (the receipt's Undo deletes it). */
function _hinReplyNow(r, btn) {
  const G = window.GmailDraft;
  if (!G || _hin.drafted.has(r.id)) return;
  homeAction(btn, async () => {
    const pre = G.prefill('reply', { message: r.m });
    if (!pre) { toast('There is no address to reply to.', { kind: 'err' }); return false; }
    const res = await G.quick(pre, { onSaved: (x) => _hinSetDrafted(r.id, x), onUndone: () => _hinUndrafted(r.id) });
    return res && res.ok ? res : false;
  }, { say: 'Reply draft saved in Gmail' });
}
/* Update: read the inbox again (a 409 = already running: nothing happens). */
function _hinUpdate(ctx) {
  if (typeof InboxStore === 'undefined' || InboxStore.running()) return;
  const days = Math.max(14, ctx ? _hinPrefs(ctx).maxDays : 14);
  InboxStore.update({ force: true, body: { days } }).then(() => { if (InboxStore.running()) _hinWatch(); _hinRepaint(); });
}
function _hinWatch() {
  if (_hin.watch || typeof setInterval !== 'function') return;
  _hin.watch = setInterval(() => {
    if (typeof state === 'undefined' || state.view !== 'home') { _hinStopWatch(); return; }
    if (InboxStore.running()) return;
    _hinStopWatch();
    homeDataRefresh('hin:inbox');
    _hinRepaint();
  }, 1500);
}
function _hinStopWatch() { if (_hin.watch) { clearInterval(_hin.watch); _hin.watch = 0; } }
function _hinRepaint() {
  if (typeof state === 'undefined' || state.view !== 'home') return;
  for (const id of homeInstancesShown('inbox')) if (document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(id)}"]`)) homeRerenderWidget(id);
}

/* ---------- L / full: Claude's pending suggestions ---------- */
function _hinSugs(ctx, sugs) {
  const sec = document.createElement('section'); sec.className = 'hin-sugs'; sec.setAttribute('aria-label', 'Tasks Claude suggests from your email');
  const busy = !ctx.preview && typeof _emSuggesting !== 'undefined' && !!_emSuggesting;
  sec.innerHTML = `<div class="hin-sugs-h"><span class="hgl-ovl">${icon('sparkles')}<span>Suggested tasks</span></span>${sugs.length ? `<span class="hin-sugs-n">${sugs.length}</span>` : ''}<span class="spacer"></span></div>`;
  const run = _hinBtn('btn btn-ghost btn-sm hin-suggest ai-only', icon(busy ? 'loader-circle' : 'sparkles', _hinSpin(busy)) + `<span>${busy ? 'Reading…' : 'Suggest tasks'}</span>`, null,
    'Claude reads recent subjects and previews; nothing is added until you choose');
  run.setAttribute('data-requires', 'claude');
  run.disabled = busy;
  if (!ctx.preview) run.onclick = () => { if (typeof aiSuggestTasksFromEmails === 'function' && !(typeof _emSuggesting !== 'undefined' && _emSuggesting)) aiSuggestTasksFromEmails(); };
  sec.querySelector('.hin-sugs-h').appendChild(run);
  if (!sugs.length) {
    const p = document.createElement('p'); p.className = 'hin-sugs-none';
    p.textContent = busy ? 'Reading your recent email…' : 'No suggestions waiting. Suggest tasks asks Claude which recent emails need you to do something.';
    sec.appendChild(p);
    return sec;
  }
  const list = document.createElement('div'); list.className = 'hin-sug-list';
  sec.appendChild(list);
  for (const s of sugs) list.appendChild(_hinSugRow(s, ctx));
  // A suggestion added or dismissed on its own row and brought back by Undo is ticked
  // again, as it was before (selectList would otherwise remember it as seen, unticked).
  if (!ctx.preview && _hin.sugLeft.size && typeof selStore === 'function') {
    const st = selStore('hin-sugs');
    for (const s of sugs) if (_hin.sugLeft.delete(s.id)) st.seen.delete(s.id);
  }
  if (sugs.length > 1 && !ctx.preview && typeof selectList === 'function') {
    selectList(list, { key: 'hin-sugs', rows: '.hin-sug', label: 'Suggested tasks', compact: true,
      apply: { label: 'Add selected', icon: 'plus', run: (ids) => acceptSuggestions(ids) },
      dismiss: { label: 'Dismiss selected', run: (ids) => dismissSuggestions(ids) } });
  }
  if (ctx.enterNew && !ctx.preview) ctx.enterNew(list.querySelectorAll('.hin-sug'), (row) => row.dataset.flip);
  return sec;
}
function _hinSugRow(s, ctx) {
  const email = !ctx.preview && typeof emailById === 'function' ? emailById(s.emailId) : null;
  const row = document.createElement('div'); row.className = 'hin-sug';
  row.dataset.selId = s.id; row.dataset.flip = 'sug:' + s.id;
  row.setAttribute('aria-label', s.title || 'Suggested task');
  const who = email ? (typeof _emSenderName === 'function' ? _emSenderName(email) : '') : '';
  const due = s.dueHint == null ? '' : s.dueHint === 0 ? 'today' : s.dueHint === 1 ? 'tomorrow' : `in ${s.dueHint} days`;
  const meta = [who, due ? 'due ' + due : ''].filter(Boolean).join(' · ');
  row.innerHTML = `<div class="hin-sug-b"><div class="hin-sug-t"><span class="hw-p ${escAttr(/^p[0-3]$/.test(s.priority || '') ? s.priority : 'p0')}"></span><span class="hin-sug-tt"></span></div>`
    + `<div class="hin-sug-s">${s.stream && typeof streamMarkHtml === 'function' && typeof STREAMS !== 'undefined' && STREAMS[s.stream] ? streamMarkHtml(s.stream) : ''}<span class="hin-sug-m"></span></div></div><div class="hin-sug-a"></div>`;
  row.querySelector('.hin-sug-tt').textContent = s.title || '(untitled)';
  row.querySelector('.hin-sug-m').textContent = meta || (s.detail || '');
  const a = row.querySelector('.hin-sug-a');
  const add = _hinBtn('btn btn-secondary btn-sm hin-sug-add', icon('circle-plus') + '<span>Add</span>', `Add "${s.title}": opens the new task, filled in`, 'Opens the new task, filled in');
  const ok = _hinBtn('btn btn-secondary btn-sm btn-icon hin-ok hin-sug-ok', icon('check'), `Add "${s.title}" now`, 'Add it now · Undo');
  const no = _hinBtn('btn btn-ghost btn-sm btn-icon hin-sug-x', icon('x'), `Dismiss "${s.title}"`, 'Dismiss');
  if (!ctx.preview) {
    add.onclick = () => _hinSugOpen(s, add, row, email);
    ok.onclick = () => homeAction(ok, () => _hinLeave(row).then(() => {
      const id = selUndoGroup(() => acceptSuggestion(s.id, true));
      if (!id) { _hinUnleave(row); return false; }
      _hin.sugLeft.add(s.id);
      _hinToast('Task added: ' + (s.title || ''), id);
      return id;
    }), { say: 'Task added: ' + (s.title || '') }).then((x) => { if (!x) _hinUnleave(row); });
    no.onclick = () => homeAction(no, () => _hinLeave(row).then(() => { _hin.sugLeft.add(s.id); dismissSuggestion(s.id); return true; })).then((x) => { if (!x) _hinUnleave(row); });
    if (_hinIsOpen('sug:' + s.id)) row.setAttribute('aria-current', 'true');
  }
  a.append(add, ok, no);
  return row;
}
/* A suggestion's Add: the new-task card, prefilled with what acceptSuggestion adds. */
function _hinSugOpen(s, btn, row, email) {
  const key = 'sug:' + s.id;
  if (_hinCardOpenFor(key)) { _hinFocusCard(); return; }
  const pre = homeInboxSuggestionPrefill(s, { today: todayStr(), email, link: email ? _hinLink({ m: email }) : '', sender: email ? (email.sender || (typeof _emSenderName === 'function' ? _emSenderName(email) : '')) : '',
    streams: typeof STREAMS !== 'undefined' ? STREAMS : null });
  _hinMarkCurrent(row, { kind: 'task', id: key, key });
  _hinOpenCard(pre, key, btn, (id) => {
    const t = typeof _emTriage === 'function' ? _emTriage() : state.emailTriage;
    const sug = t && Array.isArray(t.suggestions) ? t.suggestions.find(x => x.id === s.id) : null;
    if (sug && sug.status === 'pending') { sug.status = 'accepted'; sug.taskId = id; _hin.sugLeft.add(s.id); }
    if (s.emailId) emailMarkHandled(s.emailId, 'task', id);
    else { saveData(); render(); }
    if (typeof homeAnnounce === 'function') homeAnnounce('Task added: ' + (s.title || ''));
  });
}
