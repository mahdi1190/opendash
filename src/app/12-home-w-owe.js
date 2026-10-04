/* ============================================================
   HOME widget "owe": I owe (WIDGETS_CATALOGUE.md 3.8), the mirror of Waiting on.
   OWNER: the "owe" widget builder (Phase 1, wave 1). Styles: 13-home-w-owe.css.
   The rules are pure, in 12-home-owe-logic.js (homeOweList, homeOweGroups,
   homeOweEmailRows, homeOweWhenText, homeOweDraft), tested in a VM.

   What it shows: open tasks linked to someone who is not the user, that are not
   waiting on them (homeIsWaiting or pplIsWaiting), already started and not
   snoozed on Home. Order: late, then the soonest due, then the oldest.
     S     the count (and how many are late), and the most pressing promise
     M     5 rows; with a mailbox: up to 2 emails from people the user knows that
           have waited more than 2 days (homeNeedsReply, known only; prefs.emailRows)
     L     grouped by person (prefs.groupByPerson): "Write to <name>" drafts one
           email listing that person's items
   Row: the round check = Done (homeCompleteTask), Today (setPlanned; pressed once
   planned, a re-click does nothing), Write, and a menu (Open, Snooze 2 days, the
   person). Keys on a row: Enter open, X done, T today, W write.

   Write follows the user's rule (3 Oct): the main click opens the NORMAL draft
   editor PREFILLED (GmailDraft.openEditor: the user edits, then Save draft); the
   small check beside it saves the same draft as it is, at once, with Undo
   (GmailDraft.quick). Nothing is ever sent. Without Gmail drafts it opens the
   mail app (mailto, never sends) and there is no check. After a draft is saved
   the button reads "Drafted" until its Undo.
   Hidden when there is nothing to show (emptyHint). No gate.
   ============================================================ */
let _howAll = false;                   // "+N more" opened (until Home is left)
const _howDrafted = new Map();         // 'task:<id>' | 'person:<id>' | 'mail:<id>' -> draftId saved this session

registerHomeWidget({
  id: 'owe', title: 'I owe', icon: 'handshake', order: 170, group: 'people',
  description: 'Things you promised other people, oldest first',
  emptyHint: 'Appears when you owe someone something (a task linked to a person)',
  sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, fresh: true,
  aliases: ['i owe', 'promises', 'what i owe', 'commitments', 'owed'],
  defaults: { emailRows: true, groupByPerson: true },
  available: () => true,
  sample: (kit) => kit,
  render(el, ctx) { return _howRender(el, ctx || {}); },
  settings(anchor, ctx) {
    homeSettingsMenu(anchor, ctx, [
      { key: 'emailRows', label: 'Emails waiting on you', type: 'toggle', hint: 'From people you know, unanswered for more than 2 days (Medium and Large)' },
      { key: 'groupByPerson', label: 'Group by person', type: 'toggle', hint: 'Large: one block per person, with "Write to…"' },
    ]);
  },
  unmount() { _howAll = false; },
});

/* ---------- the model ---------- */
function _howPlus(n) { return _howPlusFrom(todayStr(), n); }   // today on the user's clock (Clock via todayStr)
function _howDay(iso) { return typeof dueLabel === 'function' ? dueLabel(iso) : iso; }
function _howSelfIds(people) { return (people || []).filter(p => p && (p.self || p.isSelf)).map(p => p.id); }
function _howUsable(p) { return !!(p && !p.self && !p.isSelf && p.kind !== 'mailbox'); }
function _howEmailOf(p) {
  if (!p) return '';
  const list = typeof pplPersonEmails === 'function' ? pplPersonEmails(p) : [p.email, ...(Array.isArray(p.emails) ? p.emails : [])];
  return (list || []).map(x => String(x || '').trim().toLowerCase()).find(x => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(x)) || '';
}
/** Can drafts be saved in Gmail right now? (the fake counts; warmed by homeData below) */
function _howDraftsOn() {
  try { return !!(window.GmailDraft && GmailDraft.available()); } catch (e) { return false; }
}
function _howMailOn() {
  try { return !!((window.Connections && Connections.has('gmail')) || _howDraftsOn()); } catch (e) { return false; }
}

/** The live model: {rows, emails, person(id), today}. Memoised per data version and inbox snapshot. */
function _howModel(ctx, prefs) {
  const inbox = typeof InboxStore !== 'undefined' && InboxStore && InboxStore.data ? (InboxStore.data.fetchedAt || 'i') : '';
  const wantMail = !!prefs.emailRows && _howMailOn();
  return homeMemo(ctx.id + ':model', homeMemoSig({ extra: [inbox, wantMail ? 1 : 0] }), () => {
    const today = todayStr();
    const people = Array.isArray(state.people) ? state.people : [];
    const byId = new Map(people.filter(p => p && p.id).map(p => [p.id, p]));
    const selfIds = _howSelfIds(people);
    const rows = homeOweList(getAllItems(), {
      today, selfIds, snoozed: homeState().snoozed || {},
      isWaiting: (i) => homeIsWaiting(i) || (typeof pplIsWaiting === 'function' && pplIsWaiting({ tags: effTags(i), title: effTitle(i) })),
      statusOf: (i) => statusOf(i.id), dueOf: (i) => effDate(i), titleOf: (i) => effTitle(i),
      peopleOf: (i) => (typeof effPeople === 'function' ? effPeople(i) : i.people || []).filter(id => _howUsable(byId.get(id))),
    });
    let emails = [];
    if (wantMail && typeof emailNeedsReply === 'function') {
      try { emails = homeOweEmailRows(emailNeedsReply({ knownOnly: true }), { minDays: 2, limit: 2, selfIds }).filter(r => _howUsable(byId.get(r.personId))); }
      catch (e) { console.warn('[home] owe: emails', e); emails = []; }
    }
    return { rows, emails, today, person: (id) => byId.get(id) || null, preview: false };
  });
}
/** The gallery's preview: the sample kit (synthetic people and tasks), never state. */
function _howPreviewModel(kit) {
  kit = kit || homeSample('owe') || {};
  const byId = new Map((kit.people || []).map(p => [p.id, p]));
  const today = kit.today || todayStr();
  const tasks = (kit.tasks || []).map((t, n) => Object.assign({}, t, { due: t.dueDate || null, createdAt: _howPlusFrom(today, -(3 + n * 2)) }));
  const rows = homeOweList(tasks, { today, peopleOf: (i) => (i.people || []).filter(id => byId.has(id)) });
  const m = (kit.emails || [])[1] || (kit.emails || [])[0];
  const who = m ? (kit.people || []).find(p => String(m.from || '').includes(p.email)) : null;
  const emails = m && who ? [{ id: m.id, m: { id: m.id, subject: m.subject }, name: who.name, first: hglFirst(who), personId: who.id, known: true, ageDays: 3, count: m.threadCount || 1 }] : [];
  return { rows, emails, today, person: (id) => byId.get(id) || null, preview: true };
}
function _howPlusFrom(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return fmtDate(d); }   // clock-ok: pure wall-date arithmetic on an ISO day

/* ---------- render ---------- */
function _howRender(el, ctx) {
  const size = ctx.size || 's';
  const prefs = ctx.prefs || homePrefs(ctx);
  if (!ctx.preview) {
    // Warm what the rows depend on (never awaited; the widget repaints when the answer changes).
    if (window.GmailDraft && typeof GmailDraft.info === 'function') homeData('owe:gmail-drafts', () => GmailDraft.info().then(j => (j ? { fake: !!j.fake } : null)), { ctx, maxAge: 10 * 60000, sig: String(!!_serverAvailable) });
    if (prefs.emailRows && size !== 's' && _howMailOn() && typeof InboxStore !== 'undefined' && InboxStore && InboxStore.st && !InboxStore.st.loaded) {
      homeData('owe:inbox', () => InboxStore.load().then(d => (d && d.fetchedAt) || null), { ctx, maxAge: 10 * 60000 });
    }
  }
  const model = ctx.preview ? _howPreviewModel() : _howModel(ctx, prefs);
  const emails = size === 's' || !prefs.emailRows ? [] : model.emails;
  if (!model.rows.length && !emails.length) return false;
  if (ctx.firstPaint) _howAll = false;

  const rows = model.rows;
  const late = rows.filter(r => r.late > 0).length;
  const card = document.createElement('section');
  card.className = `card home-card how how--${size}`;
  const total = rows.length + emails.length;
  card.appendChild(hglHead({ icon: 'handshake', title: 'I owe', n: total ? String(total) : '' }));
  const body = document.createElement('div'); body.className = 'card-b how-b';
  card.appendChild(body);
  el.appendChild(card);

  if (size === 's') {
    const who = new Set(rows.map(r => r.people[0]));
    const sum = document.createElement('div'); sum.className = 'how-sum';
    sum.innerHTML = `<b class="how-big num" data-n="${rows.length}">${rows.length}</b><span class="how-sum-t"><span>${rows.length === 1 ? 'promise' : 'promises'} to ${who.size === 1 ? esc(hglFirst(model.person([...who][0]))) : `${who.size} people`}</span>`
      + (late ? `<span class="how-late">${late} late</span>` : '') + '</span>';
    body.appendChild(sum);
    const list = document.createElement('ul'); list.className = 'how-list';
    list.appendChild(_howRow(rows[0], ctx, model, { showWho: true, hero: true }));
    body.appendChild(list);
    if (rows.length > 1) {
      const more = document.createElement('div'); more.className = 'hgl-foot how-foot';
      more.innerHTML = `<span class="how-more-t">+${rows.length - 1} more · oldest first</span>`;
      body.appendChild(more);
    }
    _howEnter(ctx, body, sum);
    _howKeys(body, ctx, model);
    return true;
  }

  const cap = size === 'l' ? 10 : 5;
  const shown = _howAll ? rows : rows.slice(0, cap);
  const group = size === 'l' && prefs.groupByPerson;
  let hidden = rows.length - shown.length;
  if (shown.length) {
    if (group) {
      // Whole people (their counts and "Write to" cover everything owed to them); the rows
      // shown stop at the cap, so a long list folds under its person.
      let budget = _howAll ? Infinity : cap;
      hidden = 0;
      for (const g of homeOweGroups(rows)) {
        if (budget <= 0) { hidden += g.rows.length; continue; }
        // At most 3 rows each, so several people show; "+N more for <name>" opens the rest.
        const take = Math.min(g.rows.length, Math.max(1, budget), _howAll ? Infinity : 3);
        budget -= take;
        hidden += g.rows.length - take;
        body.appendChild(_howGroup(g, ctx, model, take));
      }
    } else {
      const list = document.createElement('ul'); list.className = 'how-list';
      for (const r of shown) list.appendChild(_howRow(r, ctx, model, { showWho: true }));
      body.appendChild(list);
    }
  }
  if (emails.length) {
    const sec = document.createElement('div'); sec.className = 'how-mail'; sec.dataset.flip = 'ow-mail';
    sec.innerHTML = `<div class="hgl-ovl how-ovl">${icon('mail')}<span>Emails waiting on you</span></div>`;
    const list = document.createElement('ul'); list.className = 'how-list';
    for (const r of emails) list.appendChild(_howMailRow(r, ctx, model));
    sec.appendChild(list);
    body.appendChild(sec);
  }
  const foot = document.createElement('div'); foot.className = 'hgl-foot how-foot';
  foot.innerHTML = `${icon('info')}<span class="how-info">Oldest first · Write saves a Gmail draft, never sends</span>`;
  if (!_howDraftsOn() && !model.preview) foot.querySelector('span').textContent = 'Oldest first · Write opens your mail app, never sends';
  if (_howAll ? (rows.length > cap || group) : hidden > 0) {
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost btn-sm how-more';
    more.innerHTML = `<span>${_howAll ? 'Show less' : `+${hidden} more`}</span>${icon(_howAll ? 'chevron-up' : 'chevron-down')}`;
    more.setAttribute('aria-expanded', _howAll ? 'true' : 'false');
    more.onclick = () => { _howAll = !_howAll; if (ctx.rerender) ctx.rerender(); };
    foot.appendChild(more);
  }
  body.appendChild(foot);
  if (!ctx.preview) homeSuggestSlot(body, ctx, { promises: rows.slice(0, 5).map(r => r.id) });
  _howEnter(ctx, body, null);
  _howKeys(body, ctx, model);
  return true;
}

/** Once per entry: the count counts up and the rows rise in turn; later, only new rows rise. */
function _howEnter(ctx, body, sum) {
  const rows = [...body.querySelectorAll('.how-row, .how-gh')];
  if (ctx.preview) return;
  if (ctx.firstPaint) {
    for (const r of rows) ctx.isNew(r.dataset.flip);      // remember them: no second entrance on the next save
    const quiet = !window.Motion || Motion.prefersReduced();
    if (quiet) return;
    const big = sum && sum.querySelector('.how-big');
    if (big && typeof Motion.countUp === 'function') Motion.countUp(big, Number(big.dataset.n) || 0, { from: 0, duration: 700 });
    rows.slice(0, 8).forEach((r, i) => hglAnim(r, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 160 + i * 45 }));
    const chips = [...body.querySelectorAll('.how-when.is-late')].slice(0, 4);
    chips.forEach((c, i) => hglAnim(c, [{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, delay: 380 + i * 60 }));
    return;
  }
  ctx.enterNew(rows, (r) => r.dataset.flip);
}

/* ---------- a promise ---------- */
function _howWhoText(r, model) {
  const names = r.people.map(id => model.person(id)).filter(Boolean).map(p => (p.kind === 'org' ? (p.name || p.id) : hglFirst(p)));
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(' and ');
}
function _howAvatar(p, size) {
  if (!p) return `<span class="how-org">${icon('user')}</span>`;
  // The People avatar: the user's chosen colour or symbol, an org's building.
  return typeof avatarHtml === 'function' ? avatarHtml(p, size || 28) : homeAvatar(p, size || 28);
}
function _howRow(r, ctx, model, o) {
  o = o || {};
  const item = r.item;
  const p = model.person(r.people[0]);
  const who = _howWhoText(r, model);
  const kind = homeOweWhen(r);
  const when = homeOweWhenText(r, { dueLabel: _howDay });
  const today = model.today;
  const li = document.createElement('li');
  li.className = 'how-row hgl-row' + (kind === 'late' ? ' is-late' : '') + (o.hero ? ' is-hero' : '');
  li.dataset.flip = 'ow:' + r.id; li.dataset.id = r.id; li.dataset.row = r.id; li.tabIndex = 0;
  li.setAttribute('aria-label', `${r.title}, for ${who}${when ? ', ' + when : ''}`);
  const stream = !model.preview && item && effStream(item) ? streamMarkHtml(effStream(item), { cls: 'how-mk' }) : '';
  const sub = [o.showWho ? `<span class="how-who">${esc(who)}</span>` : '', when ? `<span class="how-when${kind === 'late' ? ' is-late' : kind === 'today' ? ' is-today' : ''}">${esc(when)}</span>` : ''].filter(Boolean).join('<span class="how-dot" aria-hidden="true"> · </span>');
  const prio = model.preview ? (item.priority || 'p0') : (typeof effPriority === 'function' ? effPriority(item) : 'p0');
  li.innerHTML = `<button type="button" class="check ${escAttr(prio)} how-check" role="checkbox" aria-checked="false" aria-label="Done: ${escAttr(r.title)}" data-tip="Done">${icon('check')}</button>`
    + (o.showWho ? `<span class="how-av">${_howAvatar(p, 28)}</span>` : '')
    + `<span class="how-body"><span class="how-t">${stream}<span>${esc(r.title)}</span></span><span class="how-s">${sub}</span></span>`;
  const acts = document.createElement('span'); acts.className = 'how-acts';
  // Today: pressed once it is planned for today (a re-click does nothing).
  const planned = !model.preview && item && item.plannedFor === today;
  const t = document.createElement('button'); t.type = 'button'; t.className = 'hgl-mini how-today' + (planned ? ' is-on' : '');
  t.innerHTML = icon('sun') + '<span>Today</span>';
  t.setAttribute('aria-pressed', planned ? 'true' : 'false');
  t.setAttribute('aria-label', planned ? `Planned for today: ${r.title}` : `Do today: ${r.title}`);
  t.setAttribute('data-tip', planned ? 'Planned for today' : 'Do today (T)');
  t.onclick = (e) => { e.stopPropagation(); _howToday(r.id, t); };
  acts.appendChild(t);
  if (o.write !== false && p) { const w = _howWriteBtns({ key: 'task:' + r.id, person: p, rows: [r], label: 'Write', aria: `Write to ${hglFirst(p)} about ${r.title}` }, model); if (w) acts.appendChild(w); }
  const more = document.createElement('button'); more.type = 'button'; more.className = 'btn-icon btn-sm how-menu';
  more.innerHTML = icon('ellipsis'); more.setAttribute('aria-label', `More for ${r.title}`); more.setAttribute('aria-haspopup', 'menu');
  more.onclick = (e) => { e.stopPropagation(); _howMenu(more, r, ctx, model, li); };
  acts.appendChild(more);
  li.appendChild(acts);
  if (model.preview) return li;
  li.querySelector('.how-check').onclick = (e) => { e.stopPropagation(); _howDone(r.id, li); };
  hglTrackCurrent(li, r.id, li);
  li.onclick = (e) => { if (e.target.closest('button, a')) return; hglOpenTask(ctx, r.id, li, li); };
  return li;
}

/** Write (the prefilled editor) + the small check (the same draft, saved as it is, with Undo). */
function _howWriteBtns(o, model) {
  const p = o.person;
  const email = _howEmailOf(p);
  if (!email) return null;
  const wrap = document.createElement('span'); wrap.className = 'how-write';
  const drafted = _howDrafted.has(o.key);
  const drafts = model.preview || _howDraftsOn();
  const w = document.createElement('button'); w.type = 'button'; w.className = 'hgl-mini how-w' + (drafted ? ' is-on' : '');
  w.innerHTML = icon(drafted ? 'mail-check' : 'mail') + `<span>${esc(drafted ? 'Drafted' : o.label)}</span>`;
  w.setAttribute('aria-label', drafted ? `Draft saved in Gmail: ${o.aria}` : o.aria + (drafts ? ' (opens the draft)' : ' (opens your mail app)'));
  w.setAttribute('data-tip', drafted ? 'Saved in Gmail as a draft' : drafts ? 'Opens the draft, filled in: edit, then Save' : 'Opens your mail app (never sends)');
  if (drafted) { w.setAttribute('aria-pressed', 'true'); w.dataset.done = '1'; }
  wrap.appendChild(w);
  if (model.preview) {
    wrap.insertAdjacentHTML('beforeend', `<button type="button" class="hgl-mini how-ok" aria-label="Save the draft as it is">${icon('check')}</button>`);
    return wrap;
  }
  w.onclick = (e) => { e.stopPropagation(); if (w.dataset.done === '1') return; _howWrite(o, w); };
  if (drafts && !drafted) {
    const q = document.createElement('button'); q.type = 'button'; q.className = 'hgl-mini how-ok';
    q.innerHTML = icon('check');
    q.setAttribute('aria-label', `Save the draft to ${hglFirst(p)} as it is (Undo deletes it)`);
    q.setAttribute('data-tip', 'Save the draft as it is · Undo');
    q.onclick = (e) => { e.stopPropagation(); _howWriteQuick(o, q); };
    wrap.appendChild(q);
  }
  return wrap;
}
function _howMe() { return String((typeof userName === 'function' && userName()) || '').split(/\s+/)[0] || ''; }
/** The draft for one promise or a person's list: {to, cc, subject, body, purpose, taskId?, threadId?}. */
function _howPrefill(o) {
  const p = o.person;
  const email = _howEmailOf(p);
  if (!email) return null;
  const d = homeOweDraft({ first: p.kind === 'org' ? '' : hglFirst(p), me: _howMe(), items: o.rows.map(r => ({ title: r.title, due: r.due })), today: todayStr(), dueLabel: (iso) => (typeof _tbShortDate === 'function' ? _tbShortDate(iso, true) : iso) });
  const one = o.rows.length === 1 ? o.rows[0] : null;
  // One promise that came from an email still in the inbox: answer in that thread.
  let base = null;
  try { base = one && window.GmailDraft ? GmailDraft.prefill('nudge', { task: one.id, person: p }) : null; } catch (e) { base = null; }
  const thread = base && base.threadId && base.to && base.to[0] === email ? base : null;
  return Object.assign({ to: [email], cc: [], subject: thread ? thread.subject : d.subject, body: d.body, purpose: thread ? 'reply' : 'note' },
    thread ? { threadId: thread.threadId } : {}, one ? { taskId: one.id } : {});
}
function _howDraftSaved(key, res) {
  if (res && res.draftId) _howDrafted.set(key, res.draftId);
  if (state.view === 'home') homeRerenderWidget('owe');
}
function _howDraftUndone(key) {
  _howDrafted.delete(key);
  if (state.view === 'home') homeRerenderWidget('owe');
}
function _howWrite(o, btn) {
  const prefill = _howPrefill(o);
  if (!prefill) { toast(`There is no email address for ${hglFirst(o.person)}.`, { kind: 'err' }); return; }
  if (!_howDraftsOn()) {
    // No Gmail drafts: the mail app, with the same text (it never sends by itself).
    const url = hglMailto({ email: prefill.to[0] }, prefill.subject, prefill.body);
    if (url) hglOpenMail(url);
    return;
  }
  if (_howWrite.open) return;                           // its editor is open: a second press does nothing
  _howWrite.open = o.key;
  const done = () => { _howWrite.open = null; };
  GmailDraft.openEditor(prefill, {
    title: `Write to ${o.person.kind === 'org' ? (o.person.name || 'them') : hglFirst(o.person)}`,
    onSaved: (res) => { done(); _howDraftSaved(o.key, res); homeAnnounce(`Draft saved in Gmail for ${hglFirst(o.person)}`); },
    onCancel: done,
    onUndone: () => _howDraftUndone(o.key),
  });
  // The dialog closes some other way (Esc, the scrim): forget it then too.
  setTimeout(function watch() { if (!_howWrite.open) return; if (!document.querySelector('.modal .gmd')) { done(); return; } setTimeout(watch, 600); }, 600);
}
function _howWriteQuick(o, btn) {
  const prefill = _howPrefill(o);
  if (!prefill) { toast(`There is no email address for ${hglFirst(o.person)}.`, { kind: 'err' }); return; }
  homeAction(btn, async () => {
    const r = await GmailDraft.quick(prefill, { onUndone: () => _howDraftUndone(o.key), quiet: true });
    if (!r || !r.ok) throw new Error((r && r.message) || 'The draft could not be saved.');
    _howDraftSaved(o.key, r);
    return r;
  }, { say: `Draft saved in Gmail for ${hglFirst(o.person)}` });
}

/* ---------- the row actions ---------- */
function _howDone(id, li) {
  if (!getItem(id) || statusOf(id) === 'done') return;
  const t = effTitle(getItem(id));
  homeCompleteTask(id, li);
  homeAnnounce(`Done: ${t}`);
}
function _howToday(id, btn) {
  const it = getItem(id);
  if (!it || it.plannedFor === todayStr()) return;      // already planned for today: nothing to do
  const t = effTitle(it);
  homeAction(btn, () => { setPlanned(id, todayStr()); return true; }, { toast: 'Planned for today', undo: true, say: `Planned for today: ${t}` });
}
/** Hidden on Home for 2 days (home.snoozed: the same rule as Focus and every Home task widget). */
function _howSnooze(id, li) {
  const it = getItem(id); if (!it) return;
  const back = _howPlus(2), last = _howPlus(1);
  const s = Object.assign({}, homeState().snoozed || {});
  if (s[id] && s[id] >= last) return;
  s[id] = last;
  const t = effTitle(it);
  const go = () => {
    if (typeof _homeRememberNow === 'function') _homeRememberNow();
    homeUpdate({ snoozed: s }, `Snoozed on Home until ${typeof _tbShortDate === 'function' ? _tbShortDate(back, true) : back}`);
    homeAnnounce(`Snoozed for 2 days: ${t}`);
  };
  if (li && li.isConnected && window.Motion && !Motion.prefersReduced()) Motion.collapse(li, go); else go();
}
function _howMenu(anchor, r, ctx, model, li) {
  const p = model.person(r.people[0]);
  const items = [
    { label: 'Open the task', icon: 'maximize-2', kbd: '↵', run: () => hglOpenTask(ctx, r.id, li, li) },
    { label: 'Mark done', icon: 'circle-check', kbd: 'X', run: () => _howDone(r.id, li) },
    { label: 'Snooze for 2 days', icon: 'alarm-clock', hint: typeof _tbShortDate === 'function' ? 'back ' + _tbShortDate(_howPlus(2), true) : '', run: () => _howSnooze(r.id, li) },
  ];
  if (p) items.push('sep', { label: `Open ${p.kind === 'org' ? (p.name || 'their page') : hglFirst(p) + "'s page"}`, icon: 'user', run: () => hglOpenPerson(p.id) });
  openMenu(anchor, items, { align: 'end' });
}

/* ---------- Large: one block per person ---------- */
function _howGroup(g, ctx, model, take) {
  const p = model.person(g.personId);
  const box = document.createElement('div'); box.className = 'how-grp';
  const name = p ? (p.kind === 'org' ? (p.name || p.id) : (p.name || p.id)) : 'Someone';
  const n = g.rows.length;
  const old = g.oldest && g.oldest.age != null ? ` · oldest ${hglAge(g.oldest.age)}` : '';
  const lateN = g.rows.filter(r => r.late > 0).length;
  const head = document.createElement('div'); head.className = 'how-gh'; head.dataset.flip = 'owg:' + g.personId;
  head.innerHTML = `<button type="button" class="how-gp">${_howAvatar(p, 30)}<span class="how-gb"><b>${esc(name)}</b><span>${n} ${n === 1 ? 'thing' : 'things'}${esc(old)}${lateN ? ` · <span class="how-late">${lateN} late</span>` : ''}</span></span></button>`;
  if (p && !model.preview) head.querySelector('.how-gp').onclick = () => hglOpenPerson(p.id);
  if (p) {
    const first = p.kind === 'org' ? (p.name || 'them') : hglFirst(p);
    const w = _howWriteBtns({ key: 'person:' + p.id, person: p, rows: g.rows, label: `Write to ${first}`, aria: n === 1 ? `Write to ${first} about ${g.rows[0].title}` : `Write to ${first} about these ${n} things` }, model);
    if (w) head.appendChild(w);
  }
  box.appendChild(head);
  const list = document.createElement('ul'); list.className = 'how-list';
  for (const r of g.rows.slice(0, take || g.rows.length)) list.appendChild(_howRow(r, ctx, model, { showWho: false, write: false }));
  const rest = g.rows.length - (take || g.rows.length);
  if (rest > 0) {
    // The cap cut this person short: say so where it happened (opens the whole list).
    const li = document.createElement('li'); li.className = 'how-gmore';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
    b.innerHTML = `<span>+${rest} more for ${esc(p && p.kind !== 'org' ? hglFirst(p) : name)}</span>${icon('chevron-down')}`;
    b.setAttribute('aria-expanded', 'false');
    if (!model.preview) b.onclick = () => { _howAll = true; if (ctx.rerender) ctx.rerender(); };
    li.appendChild(b); list.appendChild(li);
  }
  box.appendChild(list);
  return box;
}

/* ---------- an email from someone the user knows ---------- */
function _howMailRow(r, ctx, model) {
  const p = model.person(r.personId);
  const li = document.createElement('li');
  li.className = 'how-row how-mrow hgl-row';
  li.dataset.flip = 'owm:' + r.id; li.dataset.row = 'mail:' + r.id; li.tabIndex = 0;
  const subj = String((r.m && r.m.subject) || '(no subject)');
  const who = p ? hglFirst(p) : (r.first || r.name || 'Someone');
  li.setAttribute('aria-label', `Email from ${who}: ${subj}, ${hglAge(r.ageDays)}`);
  li.innerHTML = `<span class="how-av">${_howAvatar(p, 28)}</span>`
    + `<span class="how-body"><span class="how-t"><span>${esc(subj)}</span></span><span class="how-s"><span class="how-badge">Email</span><span class="how-who">${esc(who)}</span><span class="how-dot" aria-hidden="true"> · </span><span class="how-when${r.ageDays >= 5 ? ' is-late' : ''}">${esc(hglAge(r.ageDays))}</span>${r.count > 1 ? `<span class="how-dot" aria-hidden="true"> · </span><span>${r.count} messages</span>` : ''}</span></span>`;
  const acts = document.createElement('span'); acts.className = 'how-acts';
  const key = 'mail:' + r.id;
  const drafted = _howDrafted.has(key);
  const drafts = model.preview || _howDraftsOn();
  const wrap = document.createElement('span'); wrap.className = 'how-write';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'hgl-mini how-w' + (drafted ? ' is-on' : '');
  b.innerHTML = icon(drafted ? 'mail-check' : 'corner-down-left') + `<span>${drafted ? 'Drafted' : 'Reply'}</span>`;
  b.setAttribute('aria-label', drafted ? `Reply saved as a draft: ${subj}` : `Reply to ${who}: ${subj}`);
  b.setAttribute('data-tip', drafted ? 'Saved in Gmail as a draft' : drafts ? 'Opens the reply, filled in: edit, then Save' : 'Opens your mail app (never sends)');
  if (drafted) { b.setAttribute('aria-pressed', 'true'); b.dataset.done = '1'; }
  wrap.appendChild(b);
  if (drafts && !drafted) {
    const q = document.createElement('button'); q.type = 'button'; q.className = 'hgl-mini how-ok';
    q.innerHTML = icon('check'); q.setAttribute('aria-label', `Save the reply to ${who} as it is (Undo deletes it)`); q.setAttribute('data-tip', 'Save the draft as it is · Undo');
    if (!model.preview) q.onclick = (e) => { e.stopPropagation(); _howReplyQuick(r, key, q); };
    wrap.appendChild(q);
  }
  acts.appendChild(wrap);
  const h = document.createElement('button'); h.type = 'button'; h.className = 'hgl-mini how-handled';
  h.innerHTML = icon('check-check') + '<span>Handled</span>';
  h.setAttribute('aria-label', `Nothing to do: mark the email from ${who} handled`); h.setAttribute('data-tip', 'Nothing to do (X)');
  if (!model.preview) h.onclick = (e) => { e.stopPropagation(); _howHandled(r, li); };
  acts.appendChild(h);
  li.appendChild(acts);
  if (model.preview) return li;
  b.onclick = (e) => { e.stopPropagation(); if (b.dataset.done === '1') return; _howReply(r, key); };
  li.onclick = (e) => { if (e.target.closest('button, a')) return; _howOpenMail(r); };
  return li;
}
function _howReplyPrefill(r) {
  try { return window.GmailDraft ? GmailDraft.prefill('reply', { message: r.m }) : null; } catch (e) { return null; }
}
function _howReply(r, key) {
  const prefill = _howReplyPrefill(r);
  if (!prefill) { toast('There is no address to reply to.', { kind: 'err' }); return; }
  if (!_howDraftsOn()) { const url = hglMailto({ email: prefill.to[0] }, prefill.subject, prefill.body); if (url) hglOpenMail(url); return; }
  if (_howWrite.open) return;
  _howWrite.open = key;
  const done = () => { _howWrite.open = null; };
  GmailDraft.openEditor(prefill, { onSaved: (res) => { done(); _howDraftSaved(key, res); homeAnnounce('Reply saved as a draft in Gmail'); }, onCancel: done, onUndone: () => _howDraftUndone(key) });
  setTimeout(function watch() { if (!_howWrite.open) return; if (!document.querySelector('.modal .gmd')) { done(); return; } setTimeout(watch, 600); }, 600);
}
function _howReplyQuick(r, key, btn) {
  const prefill = _howReplyPrefill(r);
  if (!prefill) { toast('There is no address to reply to.', { kind: 'err' }); return; }
  homeAction(btn, async () => {
    const res = await GmailDraft.quick(prefill, { onUndone: () => _howDraftUndone(key), quiet: true });
    if (!res || !res.ok) throw new Error((res && res.message) || 'The draft could not be saved.');
    _howDraftSaved(key, res);
    return res;
  }, { say: 'Reply saved as a draft in Gmail' });
}
function _howHandled(r, li) {
  const t = state.emailTriage && state.emailTriage.handled;
  if (t && t[r.id]) return;
  const go = () => {
    if (typeof _homeRememberNow === 'function') _homeRememberNow();
    emailMarkHandled(r.id, 'dismiss');
    toast('Marked as handled', { kind: 'ok', icon: 'check-check', action: { label: 'Undo', run: () => undo() } });
    homeAnnounce('Email marked as handled');
  };
  if (li && li.isConnected && window.Motion && !Motion.prefersReduced()) Motion.collapse(li, go); else go();
}
function _howOpenMail(r) {
  const link = r.m && (typeof _emLink === 'function' ? _emLink(r.m) : r.m.link);
  const url = typeof safeUrl === 'function' ? safeUrl(link) : null;
  if (url && /^https:\/\//.test(url)) window.open(url, '_blank', 'noopener');
  else _howReply(r, 'mail:' + r.id);
}

/* ---------- the row keys: Enter open, X done, T today, W write ---------- */
function _howKeys(body, ctx, model) {
  if (ctx.preview) return;
  const mail = (id) => (String(id).startsWith('mail:') ? model.emails.find(r => 'mail:' + r.id === id) : null);
  homeRowKeys(body, {
    open: (id, row) => { const m = mail(id); if (m) _howOpenMail(m); else hglOpenTask(ctx, id, row, row); },
    done: (id, row) => { const m = mail(id); if (m) _howHandled(m, row); else _howDone(id, row); },
    today: (id, row) => { if (mail(id)) return; const b = row.querySelector('.how-today'); if (b) _howToday(id, b); },
    keys: { w: (id, row) => { const b = (row.querySelector('.how-w') || (row.closest('.how-grp') && row.closest('.how-grp').querySelector('.how-gh .how-w'))); if (b) b.click(); } },
  });
}
