/* ============================================================
   PERSON CARD + PEOPLE ACTIONS (owner: People).
   User request, 4 Oct: people "need their own full card similar to tasks so
   it's easy to deal with while still option of the side bar", their own cover
   and profile pictures, and the buttons for finding people in email, checking
   email and assigning people to tasks back where they can be found.

   PUBLIC API (other areas call these):
     openPerson(id, {from, mode, list, push}) -> 'card' | 'panel' | false
         The ONE way a person opens (sidebar, People page, avatars, mentions,
         attendee rows, the palette, Home). mode 'card' | 'panel' overrides;
         otherwise this session's switch, then Settings > Tasks ("Open tasks
         and events in"). Card: the centre card (61-task-card.js, entry kind
         'person'), resizable, Esc, Up/Down for the previous / next person,
         "Open in side panel". Panel: the People page's person panel
         (#view=person:<id>), which has "Open in the centre".
         Opening the person already shown does nothing.
     pcCurrentPersonId()            the person the card shows (null otherwise)
     pcToPanel(id) / pcToCard(id)   the switch buttons (this session only)
     pcOpenPictures(id, 'photo'|'cover')   profile picture (upload, emoji or symbol,
                                    Gmail/Google (none share photos: said so), Gravatar
                                    opt-in per person) and cover (upload or built-in)
     pcOpenLinkTasks(id)            tick open tasks to link to them (+ unlink linked ones)
     pcOpenAssign({people, tasks})  bulk: several people x several tasks
     pcOpenMailPeople()             "Find people in emails": senders and recipients of
                                    recent email who are not in People
     pcCheckEmail(btn)              "Check email": the inbox update job (read-only)
     pcPeopleToolbar()              the People page's action row
   Card internals: pcPersonView(inner, cur, keep) (called by _tcPaint) and
   pcCardKey(k, cur) (keys: J/K or Up/Down, E edit, N new task, L link tasks,
   P pictures, . more).
   Data changes go through the actions layer (person.update photo/cover,
   person.add_note, person.create, task.link_person, task.unlink_person) with
   Undo. Pictures are stored by POST /api/people/image (server/routes/people-images.mjs).
   Pure rules: 54-people-card-logic.js. Styles: src/styles/54-people-card.css.
   ============================================================ */
let _pcModeSession = null;
let _pcPageList = [];          // the People page's rendered order (previous / next)
let _pcShowDone = false;
let _pcAllTasks = false;

function personOpenMode(o) {
  return pcOpenMode({ mode: o && o.mode, session: _pcModeSession, setting: typeof itemOpenSetting === 'function' ? itemOpenSetting() : 'card' });
}
function pcCurrentPersonId() {
  const c = typeof _tc !== 'undefined' && _tc && !_tc.closing ? _tcCur() : null;
  return c && c.kind === 'person' ? c.id : null;
}
function pcSetPageList(ids) { _pcPageList = Array.isArray(ids) ? ids.slice() : []; }
function _pcVisible(el) { return !!el && el.isConnected && el.getClientRects().length > 0; }
function _pcRowFor(id) {
  if (!id) return null;
  // The page's rows first (#main-body), then anything else (the sidebar).
  const q = `[data-pid="${CSS.escape(id)}"]`;
  for (const n of [...document.querySelectorAll('#main-body ' + q), ...document.querySelectorAll(q)]) if (_pcVisible(n) && !(typeof _tc !== 'undefined' && _tc && _tc.root.contains(n))) return n;
  return null;
}
function _pcListFor(id, fromEl) {
  if (fromEl && fromEl.closest && fromEl.closest('.ppl-body') && _pcPageList.includes(id)) return _pcPageList.slice();
  const host = fromEl && fromEl.parentElement;
  if (host) {
    const ids = [...host.querySelectorAll(':scope > [data-pid]')].map(n => n.dataset.pid).filter(x => getPerson(x));
    if (ids.includes(id) && ids.length > 1) return [...new Set(ids)];
  }
  if (_pcPageList.includes(id)) return _pcPageList.slice();
  return [id];
}

/* ---------- opening ---------- */
function openPerson(id, o) {
  o = o || {};
  const p = getPerson(id);
  if (!p || p.self) return false;
  const mode = personOpenMode(o);
  if (mode === 'panel') {
    if (typeof _tc !== 'undefined' && _tc) tcClose({ instant: true, noFocus: true });
    if (state.view !== 'person:' + id) setView('person:' + id);
    return 'panel';
  }
  if (pcCurrentPersonId() === id && !o.push) { _tcFocusStart(); return 'card'; }
  const fromEl = o.from && o.from.isConnected && o.from.getBoundingClientRect ? o.from : _pcRowFor(id);
  const fromRect = fromEl ? fromEl.getBoundingClientRect() : null;
  const list = o.list || _pcListFor(id, fromEl);
  // One place at a time: the People page's person panel and the task side panel step aside.
  if (String(state.view).startsWith('person:')) { state.view = 'people'; saveUI(); if (typeof _syncViewHash === 'function') _syncViewHash(); render(); }
  if (typeof _tcClosePanel === 'function') _tcClosePanel();
  tcOpen({ kind: 'person', id, list }, Object.assign({}, o, { fromEl: fromEl && fromEl.isConnected ? fromEl : null, fromRect }));
  return 'card';
}
function pcToPanel(id) {
  _pcModeSession = 'panel';
  if (typeof _tc !== 'undefined' && _tc) tcClose({ instant: true, noFocus: true });
  setView('person:' + id);
}
function pcToCard(id, from) {
  _pcModeSession = 'card';
  return openPerson(id, { mode: 'card', from });
}

/* ---------- the card ---------- */
function _pcFirst(p) { return typeof _pplFirst === 'function' ? _pplFirst(p) : String((p && p.name) || '').split(/\s+/)[0]; }
function _pcBtn(ic, label, run, o) { return _tcBtn(ic, label, run, o); }
function _pcSec(title, ic, count, extra) {
  const sec = document.createElement('section'); sec.className = 'pc-sec';
  const h = document.createElement('div'); h.className = 'pc-sh';
  h.innerHTML = `${icon(ic, 'i-sm')}<span>${esc(title)}</span>${count != null && count !== '' ? `<span class="count">${esc(count)}</span>` : ''}`;
  if (extra) h.appendChild(extra);
  sec.appendChild(h);
  return sec;
}
/** The cover band's background: a built-in cover, an uploaded picture or a soft gradient in their colour. */
function pcCoverApply(el, p) {
  const look = pcCoverLook(p && p.cover);
  el.style.removeProperty('background');
  el.style.setProperty('--pc-c', pplAvatarColor(p && p.color));
  el.classList.toggle('is-preset', look.kind === 'preset');
  el.classList.toggle('is-file', look.kind === 'file');
  el.classList.toggle('is-default', look.kind === 'default');
  if (look.kind === 'preset') el.style.background = look.css;
  else if (look.kind === 'file') el.style.backgroundImage = `url("${look.url.replace(/["\\]/g, '')}")`;
  else el.style.removeProperty('background-image');
}

function pcPersonView(inner, cur, keep) {
  const p = getPerson(cur.id);
  _tc.card.setAttribute('aria-label', 'Person: ' + p.name);
  if (typeof _pplEnsureCal === 'function') _pplEnsureCal();
  const f = typeof _pplFacts === 'function' ? _pplFacts(p) : { tasks: tasksForPerson(p.id), open: tasksForPerson(p.id, { open: true }), last: 0, nextEv: null };
  const first = _pcFirst(p);
  const emails = pplPersonEmails(p);

  /* bar */
  const nav = tcNavInfo(cur.list || [p.id], p.id, (x) => !!getPerson(x));
  const left = [];
  if (_tc.stack.length > 1) left.push(_tcBackBtn());
  if (nav.n > 1) {
    left.push(_pcBtn('chevron-up', 'Previous person', () => _pcStep(-1), { kbd: 'K', disabled: !nav.prev, fk: 'pc-prev' }));
    left.push(_pcBtn('chevron-down', 'Next person', () => _pcStep(1), { kbd: 'J', disabled: !nav.next, fk: 'pc-next' }));
    const pos = document.createElement('span'); pos.className = 'tc-pos'; pos.textContent = `${nav.i + 1} of ${nav.n}`;
    left.push(pos);
  }
  const right = [
    _pcBtn(p.pinned ? 'pin-off' : 'pin', p.pinned ? 'Unpin from the sidebar' : 'Pin to the sidebar', () => _pcApply([{ op: 'person.update', id: p.id, pinned: !p.pinned }], p.pinned ? `Unpinned ${p.name}` : `Pinned ${p.name} to the sidebar`), { on: !!p.pinned, fk: 'pc-pin', cls: 'tc-opt' }),
    _pcBtn('image', 'Pictures: profile and cover', () => pcOpenPictures(p.id, 'photo'), { kbd: 'P', fk: 'pc-pics' }),
    _pcBtn('pencil', 'Edit details', () => openPersonEditor(p.id), { kbd: 'E', fk: 'pc-edit' }),
    _tcSep(),
    _pcBtn('panel-right', 'Open in side panel', () => pcToPanel(p.id), { fk: 'pc-panel' }),
    _tcMaxBtn(),
    _pcBtn('ellipsis', 'More: merge, inactive, delete…', (a) => _pcMoreMenu(a, p.id), { kbd: '.', fk: 'pc-more', cls: 'pc-morebtn' }),
  ];
  inner.appendChild(_tcBar(left, right));

  /* cover + identity */
  const top = document.createElement('div'); top.className = 'pc-top';
  const cover = document.createElement('div'); cover.className = 'pc-cover';
  pcCoverApply(cover, p);
  const cb = document.createElement('button'); cb.type = 'button'; cb.className = 'btn btn-sm pc-cover-btn'; cb.dataset.fk = 'pc-cover';
  cb.innerHTML = icon('layout-template') + '<span>Change cover</span>';
  cb.onclick = () => pcOpenPictures(p.id, 'cover');
  cover.appendChild(cb);
  if (typeof animPersonCardMoment === 'function') { const pm = animPersonCardMoment(p); if (pm) cover.insertAdjacentHTML('beforeend', pm); }   // a birthday, or a while (78-anim-moments.js)
  top.appendChild(cover);
  const idrow = document.createElement('div'); idrow.className = 'pc-id';
  const av = document.createElement('button'); av.type = 'button'; av.className = 'pc-av'; av.dataset.fk = 'pc-av';
  av.innerHTML = avatarHtml(p, 88) + `<span class="pc-av-edit" aria-hidden="true">${icon('image')}</span>`;
  av.setAttribute('aria-label', `Change ${p.name}'s picture`); av.setAttribute('data-tip', 'Change picture');
  av.onclick = () => pcOpenPictures(p.id, 'photo');
  const who = document.createElement('div'); who.className = 'pc-who';
  const h = document.createElement('h2'); h.className = 'pc-name'; h.id = 'tc-title';
  h.innerHTML = `<span data-cz-label>${esc(p.name)}</span>`;
  czMark(h, 'person', p.id);   // right-click the name: rename, colour, pictures (28-customise.js)
  if (p.inactive) h.insertAdjacentHTML('beforeend', '<span class="badge badge-soft">inactive</span>');
  if (p.stub) h.insertAdjacentHTML('beforeend', '<span class="badge badge-warning">incomplete</span>');
  const sub = document.createElement('div'); sub.className = 'pc-role';
  const bits = [p.role, p.org].filter(Boolean);
  sub.textContent = bits.length ? bits.join(' · ') : (typeof _pplKindLabel === 'function' ? _pplKindLabel(p) : 'Person');
  who.append(h, sub);
  const chips = document.createElement('div'); chips.className = 'pc-chips';
  for (const e of emails) {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'chip pc-mail';
    c.innerHTML = icon('at-sign', 'i-xs') + `<span>${esc(e)}</span>`;
    c.title = 'Copy the address';
    c.onclick = () => { try { navigator.clipboard.writeText(e).then(() => toast('Address copied', { icon: 'copy' }), () => {}); } catch (err) { /* no clipboard */ } };
    chips.appendChild(c);
  }
  const aliases = (p.aliases || []).filter(a => pplFold(a) !== pplFold(p.name));
  for (const a of aliases.slice(0, 6)) chips.insertAdjacentHTML('beforeend', `<span class="chip chip-solid pc-alias" title="Alias: tasks that say this link to ${escAttr(first)}">${esc(a)}</span>`);
  const streams = ((p.streams || []).filter(s => STREAMS[s]).length ? p.streams : (typeof _pplStreamsFromTasks === 'function' ? _pplStreamsFromTasks(f.tasks) : [])).filter(s => STREAMS[s]).slice(0, 4);
  for (const s of streams) chips.insertAdjacentHTML('beforeend', `<span class="chip pc-stream"${czAttrs('stream', s)}>${streamMarkHtml(s)}<span>${esc(STREAMS[s].label)}</span></span>`);
  if (!emails.length) {
    const add = document.createElement('button'); add.type = 'button'; add.className = 'chip chip-more';
    add.innerHTML = icon('plus', 'i-xs') + '<span>Add an email address</span>';
    add.onclick = () => openPersonEditor(p.id);
    chips.appendChild(add);
  }
  who.appendChild(chips);
  idrow.append(av, who);
  top.appendChild(idrow);

  /* quick actions */
  const acts = document.createElement('div'); acts.className = 'pc-acts';
  const qa = (ic, label, fk, run, o) => {
    o = o || {};
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + (o.primary ? 'btn-primary' : 'btn-secondary'); b.dataset.fk = fk;
    b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`;
    if (o.tip) b.setAttribute('data-tip', o.tip);
    if (o.disabled) { b.disabled = true; }
    b.onclick = (e) => run(e.currentTarget);
    acts.appendChild(b); return b;
  };
  qa('circle-plus', `New task for ${first}`, 'pc-newtask', (b) => tcOpenCreate({ people: [p.id] }, { from: b, push: true }), { primary: true, tip: 'A new task linked to them (N)' });
  qa('mail', 'Email', 'pc-email', () => pcEmail(p.id), { tip: emails.length ? 'A Gmail draft to them, never sent' : 'Add an email address first' });
  qa('calendar-plus', 'Schedule', 'pc-schedule', (b) => pcSchedule(p.id, b), { tip: emails.length ? 'A new calendar event with them invited' : 'A new calendar event' });
  qa('link', 'Link tasks…', 'pc-link', () => pcOpenLinkTasks(p.id), { tip: 'Tick open tasks to link to them (L)' });
  qa('notebook-pen', 'Note', 'pc-note-btn', () => { const ta = _tc && _tc.card.querySelector('.pc-note-in'); if (ta) { ta.closest('.pc-note-compose').hidden = false; ta.scrollIntoView({ block: 'nearest' }); ta.focus(); } });
  top.appendChild(acts);
  inner.appendChild(top);
  if (p.stub) {
    const c = document.createElement('div'); c.className = 'callout warn pc-stub';
    c.innerHTML = icon('info') + '<div class="grow">Tasks pointed at this id with no profile, so a basic one was made. Add a name and email so it links properly.</div>';
    inner.appendChild(c);
  }

  /* body */
  const scroll = document.createElement('div'); scroll.className = 'tc-scroll';
  const cols = document.createElement('div'); cols.className = 'tc-cols pc-cols';
  const main = document.createElement('div'); main.className = 'tc-main pc-main';
  const side = document.createElement('aside'); side.className = 'tc-side pc-side'; side.setAttribute('aria-label', 'About ' + p.name);

  // Open tasks: what I owe them / what they owe me (waiting on them).
  const owe = f.open.filter(i => !pplIsWaiting(i)).sort(typeof _pplByDue === 'function' ? _pplByDue : () => 0);
  const wait = f.open.filter(i => pplIsWaiting(i)).sort(typeof _pplByDue === 'function' ? _pplByDue : () => 0);
  const done = f.tasks.filter(i => statusOf(i.id) === 'done').sort((a, b) => (closedAt(b) || 0) - (closedAt(a) || 0));
  const tx = document.createElement('div'); tx.className = 'pc-sh-x';
  if (done.length) {
    const sd = document.createElement('button'); sd.type = 'button'; sd.className = 'btn btn-ghost btn-sm'; sd.dataset.fk = 'pc-showdone';
    sd.textContent = _pcShowDone ? 'Hide done' : `Done (${done.length})`;
    sd.setAttribute('aria-pressed', _pcShowDone ? 'true' : 'false');
    sd.onclick = () => { _pcShowDone = !_pcShowDone; _tcPaint(); };
    tx.appendChild(sd);
  }
  const ts = _pcSec('Open tasks', 'circle-dot', f.open.length, tx);
  const LIMIT = 6;
  const list = (title, items, empty, cls) => {
    const g = document.createElement('div'); g.className = 'pc-tgroup ' + (cls || '');
    g.innerHTML = `<div class="pc-th">${esc(title)}<span class="subtle">${items.length || ''}</span></div>`;
    if (!items.length) { const e = document.createElement('div'); e.className = 'pc-empty'; e.textContent = empty; g.appendChild(e); }
    const shown = _pcAllTasks ? items : items.slice(0, LIMIT);
    for (const i of shown) g.appendChild(_pplMiniTask(i));
    ts.appendChild(g);
    return items.length > shown.length;
  };
  const more1 = list('I owe them', owe, `Nothing you owe ${first} right now.`, 'is-owe');
  const more2 = list('Waiting on them', wait, `You are not waiting on ${first}.`, 'is-wait');
  if (more1 || more2 || _pcAllTasks) {
    const va = document.createElement('button'); va.type = 'button'; va.className = 'btn btn-ghost btn-sm pc-viewall'; va.dataset.fk = 'pc-viewall';
    va.textContent = _pcAllTasks ? 'Show fewer' : 'View all open tasks';
    va.onclick = () => { _pcAllTasks = !_pcAllTasks; _tcPaint(); };
    ts.appendChild(va);
  }
  if (_pcShowDone && done.length) list('Done', done.slice(0, 20), '', 'is-done');
  main.appendChild(ts);

  // Recent email (the inbox snapshot; 51-people-section.js _pplMailInto)
  const ms = _pcSec('Recent email', 'mail');
  const mbox = document.createElement('div'); mbox.className = 'ppl-mail pc-mailbox';
  ms.appendChild(mbox);
  main.appendChild(ms);
  if (typeof _pplMailInto === 'function') _pplMailInto(mbox, p);

  // Notes
  const notes = (Array.isArray(p.notes) ? p.notes : []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const ns = _pcSec('Notes', 'notebook-pen', notes.length || '');
  const comp = document.createElement('div'); comp.className = 'pc-note-compose';
  comp.hidden = notes.length > 0 && !(keep && keep.fk === 'pc-note');
  const ta = document.createElement('textarea'); ta.className = 'control pc-note-in'; ta.rows = 2; ta.placeholder = `Something to remember about ${first}…`; ta.dataset.fk = 'pc-note';
  ta.setAttribute('aria-label', 'New note');
  const save = document.createElement('button'); save.type = 'button'; save.className = 'btn btn-primary btn-sm'; save.textContent = 'Add note'; save.dataset.fk = 'pc-note-save';
  const submit = async () => {
    const text = ta.value.trim(); if (!text) return;
    if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) { addPersonNote(p.id, text); ta.value = ''; render(); return; }
    save.disabled = true;
    const r = await actionsApply([{ op: 'person.add_note', id: p.id, text }], { client: 'person card', done: 'Note added' });
    save.disabled = false;
    if (r) { const t2 = _tc && _tc.card.querySelector('.pc-note-in'); if (t2) t2.value = ''; }
  };
  save.onclick = submit;
  ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); submit(); } };
  comp.append(ta, save);
  ns.appendChild(comp);
  for (const n of notes.slice(0, 30)) {
    const d = document.createElement('div'); d.className = 'note pc-note';
    const when = document.createElement('span'); when.className = 'when';
    when.textContent = n.ts ? _pplFmt(new Date(n.ts), { day: 'numeric', month: 'short', year: daysUntil(fmtDate(new Date(n.ts))) < -300 ? 'numeric' : undefined }) + (typeof _pplNoteContext === 'function' ? _pplNoteContext(p, n.ts) : '') : '';
    const tx2 = document.createElement('div'); tx2.className = 'pc-note-text'; tx2.textContent = n.text;
    const del = document.createElement('button'); del.type = 'button'; del.className = 'btn-icon btn-sm pc-note-del'; del.innerHTML = icon('trash-2');
    del.setAttribute('aria-label', 'Delete note');
    del.onclick = () => { deletePersonNote(p.id, n.id); render(); toast('Note deleted', { icon: 'trash-2', action: { label: 'Undo', run: () => undo() } }); };
    d.append(del, when, tx2);
    ns.appendChild(d);
  }
  if (!notes.length && comp.hidden) { const e = document.createElement('div'); e.className = 'pc-empty'; e.textContent = 'No notes yet.'; ns.appendChild(e); }
  main.appendChild(ns);

  // Activity on their tasks
  const act = _pcActivity(p, f.tasks);
  const as = _pcSec('Activity', 'history', '');
  if (!act.length) { const e = document.createElement('div'); e.className = 'pc-empty'; e.textContent = `Nothing has happened on tasks with ${first} yet.`; as.appendChild(e); }
  for (const a of act.slice(0, 8)) {
    const r = document.createElement('button'); r.type = 'button'; r.className = 'pc-act-row';
    r.dataset.id = a.taskId;
    r.innerHTML = `${icon(a.icon, 'i-xs')}<span class="pc-act-t"><span class="pc-act-what"></span><span class="pc-act-task"></span></span><span class="pc-act-when">${esc(_pplAgo(a.ts))}</span>`;
    r.querySelector('.pc-act-what').textContent = a.text;
    r.querySelector('.pc-act-task').textContent = a.title;
    r.onclick = () => openTask(a.taskId, { from: r });
    as.appendChild(r);
  }
  main.appendChild(as);

  // Side: last contact, meetings, profile, files
  const lc = typeof personLastContact === 'function' ? personLastContact(p) : null;
  const ls = document.createElement('section'); ls.className = 'tc-side-sec pc-last';
  ls.innerHTML = `<div class="tc-side-h">${icon('history', 'i-sm')}<span>Last contact</span></div>`
    + `<div class="pc-last-v">${lc ? esc(lc.label.charAt(0).toUpperCase() + lc.label.slice(1)) : f.last ? esc(_pplAgo(f.last)) : '<span class="subtle">Not yet</span>'}</div>`;
  side.appendChild(ls);
  side.appendChild(_pcMeetings(p));
  const prof = document.createElement('section'); prof.className = 'tc-side-sec pc-prof';
  prof.innerHTML = `<div class="tc-side-h">${icon('contact', 'i-sm')}<span>Profile</span></div>`;
  const dl = document.createElement('dl'); dl.className = 'kv pc-kv';
  const row = (label, html) => dl.insertAdjacentHTML('beforeend', `<dt>${esc(label)}</dt><dd>${html}</dd>`);
  row('Kind', esc(typeof _pplKindLabel === 'function' ? _pplKindLabel(p) : 'Person'));
  if (p.group) row('Group', esc(p.group));
  if (p.phone) row('Phone', `<a href="tel:${escAttr(String(p.phone).replace(/[^\d+]/g, ''))}">${esc(p.phone)}</a>`);
  if (safeUrl(p.linkedin)) row('LinkedIn', `<a href="${escAttr(safeUrl(p.linkedin))}" target="_blank" rel="noopener noreferrer">Profile</a>`);
  row('Tasks', `${f.open.length} open · ${done.length} done`);
  prof.appendChild(dl);
  side.appendChild(prof);
  const files = document.createElement('section'); files.className = 'tc-side-sec pc-files';
  files.innerHTML = `<div class="tc-side-h">${icon('paperclip', 'i-sm')}<span>Linked files</span></div>`;
  let any = false;
  if (typeof resBlock === 'function') { files.appendChild(resBlock({ type: 'person', id: p.id }, { panelTitle: false })); any = true; }
  if (typeof autolinkPersonFiles === 'function') { const x = autolinkPersonFiles(p); if (x) { files.appendChild(x); any = true; } }
  if (!any) files.insertAdjacentHTML('beforeend', '<div class="pc-empty">No files linked yet.</div>');
  side.appendChild(files);

  cols.append(main, side);
  scroll.appendChild(cols);
  inner.appendChild(scroll);

  /* foot */
  const foot = document.createElement('div'); foot.className = 'tc-foot pc-foot';
  const fb = (ic, label, cls, fk, run, tip) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls; b.dataset.fk = fk;
    b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`;
    if (tip) b.setAttribute('data-tip', tip);
    b.onclick = (e) => run(e.currentTarget);
    foot.appendChild(b); return b;
  };
  fb('trash-2', 'Delete…', 'btn-ghost tc-f-del', 'pc-del', () => pplConfirmDelete(p.id), 'Delete this person (their tasks stay)');
  fb('git-merge', 'Merge…', 'btn-ghost', 'pc-merge', () => openPersonMerge(p.id), 'Fold a duplicate into someone else');
  const keys = document.createElement('span'); keys.className = 'tc-keys';
  keys.innerHTML = `${nav.n > 1 ? '<span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> next</span>' : ''}<span><kbd class="kbd">E</kbd> edit</span><span><kbd class="kbd">N</kbd> new task</span>`;
  foot.appendChild(keys);
  fb(p.inactive ? 'user-check' : 'user-minus', p.inactive ? 'Mark as active' : 'Mark inactive', 'btn-secondary', 'pc-inactive', () => _pcApply([{ op: 'person.update', id: p.id, inactive: !p.inactive }], p.inactive ? `${p.name} is active again` : `${p.name} marked inactive`));
  inner.appendChild(foot);
}

/** Meetings with them: the next few and the last few (the calendar snapshot). */
function _pcMeetings(p) {
  const sec = document.createElement('section'); sec.className = 'tc-side-sec pc-meet';
  const evs = typeof _pplEvents === 'function' ? _pplEvents(p) : [];
  const now = Date.now();
  const next = evs.filter(ev => calEventEnd(ev).getTime() >= now).sort((a, b) => calEventStart(a) - calEventStart(b)).slice(0, 3);
  const past = evs.filter(ev => calEventEnd(ev).getTime() < now).sort((a, b) => calEventStart(b) - calEventStart(a)).slice(0, 4);
  sec.innerHTML = `<div class="tc-side-h">${icon('video', 'i-sm')}<span>Meetings</span>${evs.length ? `<span class="count">${esc(evs.length)}</span>` : ''}</div>`;
  const meets = typeof _pplMeets === 'function' ? _pplMeets(p) : null;
  if (meets) {
    const m = document.createElement('div'); m.className = 'pc-regular'; m.innerHTML = icon('repeat', 'i-xs') + '<span></span>';
    m.querySelector('span').textContent = meets.text;
    sec.appendChild(m);
  }
  const add = (label, list) => {
    if (!list.length) return;
    sec.insertAdjacentHTML('beforeend', `<div class="pc-th">${esc(label)}</div>`);
    for (const ev of list) {
      const s = calEventStart(ev);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pc-mrow'; b.dataset.evid = ev.id;
      b.innerHTML = `<span class="pc-md"><b>${esc(_pplFmt(s, { day: 'numeric' }))}</b><span>${esc(_pplFmt(s, { month: 'short' }))}</span></span><span class="pc-mt"><span class="pc-mn"></span><span class="pc-mw">${esc(ev.allDay ? 'All day' : _pplTime(s))}</span></span>`;
      b.querySelector('.pc-mn').textContent = String(ev.summary || 'Event');
      b.onclick = () => openEvent(ev.id, { from: b, push: true });
      sec.appendChild(b);
    }
  };
  if (!evs.length) {
    const ready = typeof _pplCalReady === 'function' ? _pplCalReady() : true;
    sec.insertAdjacentHTML('beforeend', `<div class="pc-empty">${ready ? 'No meetings with them in the calendar snapshot.' : 'Loading the calendar…'}</div>`);
  }
  add('Next', next);
  add('Past', past);
  return sec;
}

/** What happened on tasks linked to them, newest first: [{ts, text, title, taskId, icon}]. */
function _pcActivity(p, tasks) {
  const out = [];
  const desc = (a) => {
    if (a.text) return String(a.text);
    if (a.type === 'date') return a.to ? `Due date set to ${a.to}` : 'Due date cleared';
    if (a.type === 'status') return a.to === 'done' ? 'Marked done' : a.to === 'doing' ? 'Started' : 'Status changed';
    if (a.type === 'created') return 'Created';
    if (a.type === 'priority') return 'Priority changed';
    return String(a.type || 'Changed').replace(/^\w/, c => c.toUpperCase());
  };
  for (const t of tasks) {
    const log = state.taskActivity && state.taskActivity[t.id];
    for (const a of Array.isArray(log) ? log : []) if (a && Number.isFinite(a.ts)) out.push({ ts: a.ts, text: desc(a), title: effTitle(t), taskId: t.id, icon: a.type === 'people' ? 'link' : a.type === 'date' ? 'calendar' : 'circle-dot' });
    const done = state.completionLog && state.completionLog[t.id];
    for (const ts of Array.isArray(done) ? done : []) if (Number.isFinite(ts)) out.push({ ts, text: 'Completed', title: effTitle(t), taskId: t.id, icon: 'circle-check' });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

function _pcStep(dir) {
  const cur = _tcCur(); if (!cur || cur.kind !== 'person') return;
  const nav = tcNavInfo(cur.list || [cur.id], cur.id, (x) => !!getPerson(x));
  const nid = dir > 0 ? nav.next : nav.prev;
  if (!nid) return;
  const ae = document.activeElement; if (ae && _tc.card.contains(ae) && _tcIsField(ae)) ae.blur();
  _tc.stack[_tc.stack.length - 1] = { kind: 'person', id: nid, list: cur.list };
  _pcAllTasks = false; _pcShowDone = false;
  const row = _pcRowFor(nid);
  if (row) { try { row.scrollIntoView({ block: 'nearest' }); } catch (e) { /* old browser */ } }
  _tcPaint({ swap: dir > 0 ? 'next' : 'prev' });
  try { _tc.card.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
/** Keys on a person's card: returns true when handled. */
function pcCardKey(k, cur) {
  const q = (sel) => _tc.card.querySelector(sel);
  switch (k) {
    case 'ArrowDown': case 'j': _pcStep(1); return true;
    case 'ArrowUp': case 'k': _pcStep(-1); return true;
    case 'e': openPersonEditor(cur.id); return true;
    case 'n': { const b = q('[data-fk="pc-newtask"]'); if (b) b.click(); return true; }
    case 'l': pcOpenLinkTasks(cur.id); return true;
    case 'p': pcOpenPictures(cur.id, 'photo'); return true;
    case '.': _pcMoreMenu(q('.pc-morebtn') || _tc.card, cur.id); return true;
    default: return false;
  }
}
function _pcMoreMenu(anchor, id) {
  const p = getPerson(id); if (!p) return;
  openMenu(anchor, [
    { label: 'Profile picture…', icon: 'image', run: () => pcOpenPictures(id, 'photo') },
    { label: 'Cover picture…', icon: 'layout-template', run: () => pcOpenPictures(id, 'cover') },
    { label: 'Colour & symbol…', icon: 'palette', run: () => czOpenCustomise('person', id, anchor) },
    'sep',
    { label: 'Link tasks…', icon: 'link', run: () => pcOpenLinkTasks(id) },
    { label: 'Open in side panel', icon: 'panel-right', run: () => pcToPanel(id) },
    { label: p.pinned ? 'Unpin from the sidebar' : 'Pin to the sidebar', icon: p.pinned ? 'pin-off' : 'pin', run: () => _pcApply([{ op: 'person.update', id, pinned: !p.pinned }], p.pinned ? `Unpinned ${p.name}` : `Pinned ${p.name}`) },
    { label: p.inactive ? 'Mark as active' : 'Mark as inactive', icon: p.inactive ? 'user-check' : 'user-minus', run: () => _pcApply([{ op: 'person.update', id, inactive: !p.inactive }], p.inactive ? `${p.name} is active again` : `${p.name} marked inactive`) },
    'sep',
    { label: 'Merge into…', icon: 'git-merge', run: () => openPersonMerge(id) },
    { label: 'Delete…', icon: 'trash-2', danger: true, run: () => pplConfirmDelete(id) },
  ], { align: 'end', width: 240 });
}
/** Ops through the actions layer, with an Undo toast; falls back to the page model offline for simple field changes. */
function _pcApply(ops, done) {
  if (typeof _serverAvailable !== 'undefined' && !_serverAvailable && ops.every(o => o.op === 'person.update')) {
    for (const o of ops) { const patch = Object.assign({}, o); delete patch.op; delete patch.id; const err = updatePersonFields(o.id, patch); if (err) { toast(err, { kind: 'err' }); return Promise.resolve(false); } }
    render(); toast(done, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
    return Promise.resolve(true);
  }
  return actionsApply(ops, { client: 'person card', done });
}

/* ---------- email / schedule ---------- */
function pcEmail(id) {
  const p = getPerson(id); if (!p) return;
  const emails = pplPersonEmails(p);
  if (!emails.length) { toast(`${p.name} has no email address yet.`, { kind: 'err', action: { label: 'Add one', run: () => openPersonEditor(id) } }); return; }
  const G = window.GmailDraft;
  const pre = G ? G.prefill('note', { person: p }) : null;
  if (G && pre && G.available()) { G.openEditor(pre, { title: `Email ${_pcFirst(p)}` }); return; }
  // No Gmail connection: the mail app, with nothing sent.
  if (G && pre) G.mailto(pre); else location.href = 'mailto:' + encodeURIComponent(emails[0]).replace(/%40/g, '@');
}
function pcSchedule(id, from) {
  const p = getPerson(id); if (!p) return;
  const emails = pplPersonEmails(p);
  if (typeof evcOpenCreate === 'function') { openEvent(null, { create: { title: `Meet ${_pcFirst(p)}`, guests: emails.slice(0, 1) }, from, push: true }); return; }
  toast('The calendar is not available here.', { kind: 'err' });
}

/* ---------- pictures ---------- */
const PC_UPLOAD_MAX = 15 * 1024 * 1024;     // the file picked (before resizing)
const PC_SIZES = { avatar: { w: 256, h: 256, max: 380 * 1024 }, cover: { w: 1200, h: 400, max: 1100 * 1024 } };
/** Resize + centre-crop a picked file in a canvas and re-encode it (drops EXIF and anything else). -> data URL */
async function pcResizeImage(file, kind) {
  if (!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Choose a PNG, JPEG, WebP or GIF picture.');
  if (file.size > PC_UPLOAD_MAX) throw new Error('That picture is over 15 MB. Choose a smaller one.');
  const S = PC_SIZES[kind];
  let bmp;
  try { bmp = await createImageBitmap(file); } catch (e) { throw new Error('That picture could not be read.'); }
  const scale = Math.max(S.w / bmp.width, S.h / bmp.height);
  const sw = S.w / scale, sh = S.h / scale;
  const cv = document.createElement('canvas'); cv.width = S.w; cv.height = S.h;
  const g = cv.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, S.w, S.h);
  if (bmp.close) bmp.close();
  for (const [type, q] of [['image/webp', 0.88], ['image/webp', 0.75], ['image/jpeg', 0.82], ['image/jpeg', 0.65]]) {
    const url = cv.toDataURL(type, q);
    if (url.startsWith('data:' + type) && Math.floor((url.length - url.indexOf(',') - 1) * 3 / 4) <= S.max) return url;
  }
  throw new Error('That picture is still too large after resizing.');
}
async function pcUploadPicture(id, kind, file) {
  const data = await pcResizeImage(file, kind);
  let r;
  try {
    r = await fetch('/api/people/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ person: id, kind, data }) });
  } catch (e) { throw new Error(netErrorMessage(e)); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.error || `The picture could not be saved (HTTP ${r.status}).`);
  return _pcApply([{ op: 'person.update', id, [kind === 'avatar' ? 'photo' : 'cover']: j.ref }], kind === 'avatar' ? 'Profile picture updated' : 'Cover updated');
}
async function _pcSha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text).trim().toLowerCase()));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function _pcConnected(id) { try { return !!(window.Connections && Connections.has(id)); } catch (e) { return false; } }

function pcOpenPictures(id, tab) {
  const p0 = getPerson(id); if (!p0) return;
  let cur = tab === 'cover' ? 'cover' : 'photo';
  let bodyEl = null, tabsEl = null, busy = false;
  const fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = 'image/png,image/jpeg,image/webp,image/gif'; fileIn.hidden = true;
  const err = (msg) => {
    const e = bodyEl && bodyEl.querySelector('.pc-pic-err'); if (!e) return;
    e.hidden = !msg; e.textContent = msg || '';
    if (msg) { try { e.scrollIntoView({ block: 'nearest' }); } catch (x) { /* old browser */ } }
  };
  const run = async (fn) => {
    if (busy) return; busy = true; err('');
    bodyEl.classList.add('is-busy');
    try { await fn(); } catch (e) { err((e && e.message) || String(e)); }
    busy = false;
    if (bodyEl && bodyEl.isConnected) { bodyEl.classList.remove('is-busy'); paint(); }
  };
  fileIn.onchange = () => { const f = fileIn.files && fileIn.files[0]; fileIn.value = ''; if (f) run(() => pcUploadPicture(id, cur === 'photo' ? 'avatar' : 'cover', f)); };
  const set = (field, value, done) => run(() => _pcApply([{ op: 'person.update', id, [field]: value }], done));
  const opt = (ic, title, text, btns, o) => {
    o = o || {};
    const r = document.createElement('div'); r.className = 'pc-src' + (o.cls ? ' ' + o.cls : '') + (o.on ? ' is-on' : '');
    r.innerHTML = `<span class="pc-src-ic">${icon(ic)}</span><div class="pc-src-t"><b></b><span class="pc-src-d"></span></div><div class="pc-src-b"></div>`;
    r.querySelector('b').textContent = title;
    r.querySelector('.pc-src-d').textContent = text;
    if (o.on) r.querySelector('b').insertAdjacentHTML('beforeend', ' <span class="badge badge-soft">in use</span>');
    for (const b of btns) if (b) r.querySelector('.pc-src-b').appendChild(b);
    return r;
  };
  const btn = (label, cls, run2, ic) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + (cls || 'btn-secondary'); b.innerHTML = (ic ? icon(ic) : '') + `<span>${esc(label)}</span>`; b.onclick = run2; return b; };
  const paint = () => {
    const p = getPerson(id); if (!p || !bodyEl) return;
    tabsEl.innerHTML = '';
    for (const [k, l] of [['photo', 'Profile picture'], ['cover', 'Cover']]) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tab' + (cur === k ? ' on' : ''); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', cur === k ? 'true' : 'false');
      b.textContent = l;
      b.onclick = () => { if (cur === k) return; cur = k; err(''); paint(); };
      tabsEl.appendChild(b);
    }
    const keepErr = bodyEl.querySelector('.pc-pic-err');
    const errText = keepErr && !keepErr.hidden ? keepErr.textContent : '';
    bodyEl.innerHTML = '';
    const pv = document.createElement('div'); pv.className = 'pc-pic-pv';
    const cov = document.createElement('div'); cov.className = 'pc-cover pc-pic-cover'; pcCoverApply(cov, p);
    pv.appendChild(cov);
    pv.insertAdjacentHTML('beforeend', `<div class="pc-pic-av">${avatarHtml(p, 72)}</div>`);
    bodyEl.appendChild(pv);
    // The error sits under the preview, so it shows without scrolling (a rejected file).
    const e = document.createElement('div'); e.className = 'pc-pic-err field-error'; e.setAttribute('role', 'alert'); e.hidden = !errText; e.textContent = errText;
    bodyEl.appendChild(e);
    const list = document.createElement('div'); list.className = 'pc-src-list';
    if (cur === 'photo') {
      const kind = pcRefKind(p.photo);
      list.appendChild(opt('upload', 'Upload a picture', 'Cropped to a square, resized to 256 px and kept in your data folder. PNG, JPEG, WebP or GIF.', [btn('Choose a picture…', 'btn-primary', () => fileIn.click(), 'image')], { on: kind === 'file' }));
      list.appendChild(opt('sparkle', 'Emoji or symbol', 'Shown instead of their initials when there is no picture.', [btn('Choose…', '', () => { close(); czOpenCustomise('person', id, null); })], { on: !kind && !!p.icon }));
      const g = _pcConnected('gmail') || _pcConnected('google') || _pcConnected('calendar');
      list.appendChild(opt('plug', 'From Gmail or Google', `Not available: the Gmail and Google Calendar connections${g ? '' : ' (when connected)'} only share names and email addresses, not contact photos, so the dashboard cannot fetch their Google picture.`, [], { cls: 'is-off' }));
      const emails = pplPersonEmails(p);
      if (!emails.length) list.appendChild(opt('globe', 'Gravatar', 'Gravatar needs an email address. Add one in Edit details first.', [], { cls: 'is-off' }));
      else if (kind === 'gravatar') list.appendChild(opt('globe', 'Gravatar', 'On for this person: the picture loads from gravatar.com. If they have none, their initials show.', [btn('Stop using Gravatar', '', () => set('photo', '', 'Gravatar off for ' + p.name))], { on: true }));
      else {
        const sel = document.createElement('select'); sel.className = 'control control-sm pc-grav-mail'; sel.setAttribute('aria-label', 'Address to look up');
        sel.innerHTML = emails.map(e => `<option value="${escAttr(e)}">${esc(e)}</option>`).join('');
        const go = btn('Use Gravatar', '', () => run(async () => _pcApply([{ op: 'person.update', id, photo: 'gravatar:' + await _pcSha256(sel.value) }], 'Gravatar on for ' + p.name)), 'globe');
        const o2 = opt('globe', 'Gravatar (opt-in, this person only)', 'Gravatar is a public picture service. Turning it on sends a fingerprint of this address (a SHA-256 hash) to gravatar.com every time the picture loads, and Gravatar sees your IP address. Nothing else is sent.', [emails.length > 1 ? sel : null, go]);
        list.appendChild(o2);
      }
      if (p.photo) list.appendChild(opt('x', 'No picture', 'Back to their initials (or symbol).', [btn('Remove picture', 'btn-ghost', () => set('photo', '', 'Picture removed'))]));
    } else {
      const kind = pcRefKind(p.cover);
      const grid = document.createElement('div'); grid.className = 'pc-covers'; grid.setAttribute('role', 'radiogroup'); grid.setAttribute('aria-label', 'Built-in covers');
      const tile = (ref, label, apply) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pc-cov-tile'; b.setAttribute('role', 'radio');
        const on = (p.cover || '') === ref;
        b.setAttribute('aria-checked', on ? 'true' : 'false'); if (on) b.setAttribute('aria-current', 'true');
        b.innerHTML = `<span class="pc-cover pc-cov-sw"></span><span class="pc-cov-l">${esc(label)}</span>`;
        apply(b.querySelector('.pc-cov-sw'));
        b.onclick = () => { if (on) return; set('cover', ref, ref ? `Cover: ${label}` : 'Cover reset'); };
        grid.appendChild(b);
      };
      tile('', 'Their colour', (el) => pcCoverApply(el, Object.assign({}, p, { cover: '' })));
      for (const c of PC_COVERS) tile('preset:' + c.id, c.label, (el) => { el.style.background = c.css; });
      const pre = document.createElement('div'); pre.className = 'pc-src pc-src-grid';
      pre.innerHTML = `<span class="pc-src-ic">${icon('palette')}</span><div class="pc-src-t"><b>Built-in covers</b><span class="pc-src-d">Generated gradients and patterns, nothing to download.</span></div>`;
      pre.appendChild(grid);
      list.appendChild(pre);
      list.appendChild(opt('upload', 'Upload a cover', 'Cropped to a wide band (3:1), resized to 1200 px and kept in your data folder.', [btn('Choose a picture…', 'btn-primary', () => fileIn.click(), 'image')], { on: kind === 'file' }));
    }
    bodyEl.append(list, fileIn);
  };
  const close = openDialog({
    title: `Pictures for ${p0.name}`, width: 600, resizeKey: 'person-pictures',
    body: (el) => {
      el.classList.add('pc-pics');
      tabsEl = document.createElement('div'); tabsEl.className = 'tabs pc-pic-tabs'; tabsEl.setAttribute('role', 'tablist');
      bodyEl = document.createElement('div'); bodyEl.className = 'pc-pic-body';
      el.append(tabsEl, bodyEl);
      paint();
    },
    actions: [{ label: 'Done' }],
  });
  return close;
}

/* ---------- link tasks to one person ---------- */
function _pcOpenTasks() {
  return getAllItems().filter(i => statusOf(i.id) !== 'done').sort((a, b) => String(effDate(a) || '9999').localeCompare(String(effDate(b) || '9999')) || String(effTitle(a)).localeCompare(String(effTitle(b))));
}
function _pcTaskRow(i, extra) {
  const r = document.createElement('div'); r.className = 'pc-trow'; r.dataset.selId = i.id;
  r.setAttribute('aria-label', effTitle(i));
  const d = effDate(i);
  const s = effStream(i);
  r.innerHTML = `${STREAMS[s] ? streamMarkHtml(s) : ''}<span class="lbl truncate"></span>${extra || ''}${d ? `<span class="due ${escAttr(_pplDue(d).cls)}">${esc(_pplShortDue(d))}</span>` : ''}`;
  r.querySelector('.lbl').textContent = effTitle(i);
  return r;
}
/** A search box + stream chips that filter a list of task rows in place. */
function _pcTaskFilter(host, onChange) {
  const st = { q: '', stream: '' };
  const bar = document.createElement('div'); bar.className = 'pc-tfilter';
  const lab = document.createElement('label'); lab.className = 'input input-sm pc-tsearch'; lab.innerHTML = icon('search');
  const inp = document.createElement('input'); inp.type = 'search'; inp.placeholder = 'Find tasks'; inp.setAttribute('aria-label', 'Find tasks');
  inp.oninput = () => { st.q = inp.value; onChange(st); };
  lab.appendChild(inp);
  bar.appendChild(lab);
  const chips = document.createElement('div'); chips.className = 'pc-tstreams';
  const used = [...new Set(_pcOpenTasks().map(effStream))].filter(s => STREAMS[s]);
  const mk = (k, label) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (st.stream === k ? ' chip-accent' : '');
    b.setAttribute('aria-pressed', st.stream === k ? 'true' : 'false');
    b.innerHTML = (k ? streamMarkHtml(k) : '') + `<span>${esc(label)}</span>`;
    b.onclick = () => { if (st.stream === k) return; st.stream = k; chips.querySelectorAll('.chip').forEach(c => { const on = c === b; c.classList.toggle('chip-accent', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); }); onChange(st); };
    chips.appendChild(b);
  };
  mk('', 'All streams');
  for (const s of used) mk(s, STREAMS[s].label);
  bar.appendChild(chips);
  host.appendChild(bar);
  return { st, input: inp };
}
function _pcMatch(i, st) {
  if (st.stream && effStream(i) !== st.stream) return false;
  const q = pplFold(st.q.trim());
  return !q || pplFold(effTitle(i)).includes(q) || (Array.isArray(i.tags) && i.tags.some(t => pplFold(t).includes(q)));
}
function pcOpenLinkTasks(id) {
  const p = getPerson(id); if (!p) return;
  const store = { on: new Set(), seen: new Set() };
  let listHost = null, linkedHost = null, filt = null;
  const paint = () => {
    const linkedIds = new Set(tasksForPerson(id, { open: true }).map(i => i.id));
    // Linked now
    linkedHost.innerHTML = '';
    const linked = _pcOpenTasks().filter(i => linkedIds.has(i.id));
    linkedHost.insertAdjacentHTML('beforeend', `<div class="pc-th">Linked now<span class="subtle">${linked.length}</span></div>`);
    if (!linked.length) linkedHost.insertAdjacentHTML('beforeend', `<div class="pc-empty">No open tasks are linked to ${esc(_pcFirst(p))} yet.</div>`);
    for (const i of linked.slice(0, 40)) {
      const r = _pcTaskRow(i);
      const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm'; x.innerHTML = icon('x');
      x.setAttribute('aria-label', 'Unlink ' + effTitle(i)); x.setAttribute('data-tip', 'Unlink (remembered: tags and suggestions will not bring it back)');
      x.onclick = async () => { x.disabled = true; await actionsApply([{ op: 'task.unlink_person', id: i.id, person: id }], { client: 'person card', done: `Unlinked ${p.name}` }); paint(); };
      r.appendChild(x);
      linkedHost.appendChild(r);
    }
    // Everything else, to tick
    listHost.innerHTML = '';
    const rest = _pcOpenTasks().filter(i => !linkedIds.has(i.id) && _pcMatch(i, filt.st));
    const sug = new Set(pplSuggest(state, { index: pplIndex(), details: true }).filter(x => x.personId === id).map(x => x.taskId));
    rest.sort((a, b) => (sug.has(b.id) - sug.has(a.id)));
    if (!rest.length) { mountEmptyState(listHost, { icon: 'search-x', title: 'No tasks match', text: 'Try another word or stream.' }); return; }
    const box = document.createElement('div'); box.className = 'pc-tlist';
    for (const i of rest.slice(0, 200)) box.appendChild(_pcTaskRow(i, sug.has(i.id) ? '<span class="badge badge-soft" title="The task names them">names them</span>' : ''));
    listHost.appendChild(box);
    selectList(box, {
      store, label: 'Tasks to link', rowClick: true, defaultOn: false,
      apply: { label: 'Link selected', icon: 'link', run: async (ids) => {
        if (!ids.length) return;
        const r = await actionsApply(ids.slice(0, 200).map(t => ({ op: 'task.link_person', id: t, person: id })), { client: 'person card', done: `Linked ${ids.length} task${ids.length === 1 ? '' : 's'} to ${p.name}`, throw: true });
        store.on.clear();
        paint();
        return r ? { done: ids } : undefined;
      } },
    });
  };
  openDialog({
    title: `Link tasks to ${p.name}`, width: 640, resizeKey: 'person-link-tasks',
    body: (el) => {
      el.classList.add('pc-linkdlg');
      linkedHost = document.createElement('div'); linkedHost.className = 'pc-linked';
      const h = document.createElement('div'); h.className = 'pc-th pc-th-pick'; h.textContent = 'Open tasks';
      filt = _pcTaskFilter(el, () => paint());
      listHost = document.createElement('div'); listHost.className = 'pc-tpick';
      el.append(linkedHost, h, filt.input.closest('.pc-tfilter'), listHost);
      paint();
      setTimeout(() => { try { filt.input.focus(); } catch (e) { /* gone */ } }, 0);
    },
    actions: [{ label: 'Close' }],
  });
}

/* ---------- bulk: assign people to tasks ---------- */
function pcOpenAssign(o) {
  o = o || {};
  const chosen = new Set((o.people || []).filter(x => getPerson(x)));
  const store = { on: new Set(o.tasks || []), seen: new Set(o.tasks || []) };
  let peopleEl = null, listHost = null, filt = null, sumEl = null, sl = null;
  const people = () => (state.people || []).filter(p => p && !p.self && !p.inactive).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const linkedOf = (tid) => effPeople(getItem(tid));
  const summary = () => {
    const pairs = pcAssignPairs(sl ? sl.selected() : [], [...chosen], linkedOf);
    if (sumEl) sumEl.textContent = !chosen.size ? 'Choose who to assign first.' : pairs.length ? `${pairs.length} new link${pairs.length === 1 ? '' : 's'}: ${chosen.size} ${chosen.size === 1 ? 'person' : 'people'} on the ticked tasks.` : 'Tick the tasks to assign them to.';
    return pairs;
  };
  const paintPeople = () => {
    peopleEl.innerHTML = '';
    for (const p of people()) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip pc-pchip' + (chosen.has(p.id) ? ' chip-accent' : '');
      b.setAttribute('aria-pressed', chosen.has(p.id) ? 'true' : 'false');
      b.innerHTML = avatarHtml(p, 16) + `<span>${esc(p.name)}</span>`;
      b.onclick = () => { if (chosen.has(p.id)) chosen.delete(p.id); else chosen.add(p.id); paintPeople(); summary(); };
      peopleEl.appendChild(b);
    }
  };
  const paintTasks = () => {
    listHost.innerHTML = '';
    const rows = _pcOpenTasks().filter(i => _pcMatch(i, filt.st));
    if (!rows.length) { mountEmptyState(listHost, { icon: 'search-x', title: 'No tasks match', text: 'Try another word or stream.' }); return; }
    const box = document.createElement('div'); box.className = 'pc-tlist';
    for (const i of rows.slice(0, 300)) {
      const ppl = effPeople(i).map(getPerson).filter(Boolean);
      box.appendChild(_pcTaskRow(i, ppl.length ? `<span class="avatars">${ppl.slice(0, 3).map(x => avatarHtml(x, 16)).join('')}</span>` : ''));
    }
    listHost.appendChild(box);
    sl = selectList(box, {
      store, label: 'Tasks', rowClick: true, defaultOn: false,
      onChange: () => summary(),
      apply: { label: 'Assign to selected', icon: 'users', run: async (ids) => {
        const pairs = pcAssignPairs(ids, [...chosen], linkedOf);
        if (!chosen.size) throw new Error('Choose who to assign first.');
        if (!pairs.length) return { done: ids };
        if (pairs.length > 200) throw new Error(`That is ${pairs.length} links: at most 200 at once. Tick fewer tasks.`);
        const n = chosen.size;
        const r = await actionsApply(pairs.map(x => ({ op: 'task.link_person', id: x.taskId, person: x.personId })), { client: 'people assign', throw: true,
          confirmTitle: `Link ${pairs.length} people to tasks?`, done: `Assigned ${n} ${n === 1 ? 'person' : 'people'} to ${ids.length} task${ids.length === 1 ? '' : 's'}` });
        if (r === false) return undefined;
        paintTasks();
        return { done: ids };
      } },
    });
    summary();
  };
  openDialog({
    title: 'Assign people to tasks', width: 720, resizeKey: 'people-assign',
    body: (el) => {
      el.classList.add('pc-assign');
      el.insertAdjacentHTML('beforeend', '<div class="pc-th">1. Who<span class="subtle">tick one or more</span></div>');
      peopleEl = document.createElement('div'); peopleEl.className = 'pc-pchips';
      el.appendChild(peopleEl);
      el.insertAdjacentHTML('beforeend', '<div class="pc-th">2. Which tasks<span class="subtle">open tasks</span></div>');
      filt = _pcTaskFilter(el, () => paintTasks());
      listHost = document.createElement('div'); listHost.className = 'pc-tpick';
      sumEl = document.createElement('div'); sumEl.className = 'pc-assign-sum subtle'; sumEl.setAttribute('aria-live', 'polite');
      el.append(listHost, sumEl);
      paintPeople(); paintTasks();
    },
    actions: [{ label: 'Close' }],
  });
}

/* ---------- people in email ---------- */
function _pcMailCands() {
  const msgs = typeof emailMessages === 'function' ? emailMessages() : [];
  const mine = [...(APP_CONFIG.myEmails || []), ...(state.people || []).filter(p => p && p.self).flatMap(p => pplPersonEmails(p))];
  return pcMailCandidates(msgs, state.people, { myEmails: mine, ignore: state.peopleIgnoredEmails || [], automated: typeof homeMailIsAutomated === 'function' ? homeMailIsAutomated : null, limit: 200 });
}
function pcOpenMailPeople() {
  const storeAdd = { on: new Set(), seen: new Set() };
  let bodyEl = null, painted = false;
  const paint = () => {
    if (!bodyEl || (painted && !bodyEl.isConnected)) return;
    painted = true;
    bodyEl.innerHTML = '';
    const loaded = typeof InboxStore !== 'undefined' && InboxStore.st && InboxStore.st.loaded;
    const head = document.createElement('div'); head.className = 'pc-mailhead';
    const age = typeof InboxStore !== 'undefined' && InboxStore.data && InboxStore.data.fetchedAt && typeof gdAgeLabel === 'function' ? gdAgeLabel(InboxStore.data.fetchedAt) : '';
    head.innerHTML = `<span class="subtle">${esc(age ? age + '. ' : '')}Senders and people copied in on recent email who are not in People yet. Only addresses and names are read; automated senders are left out.</span>`;
    const chk = document.createElement('button'); chk.type = 'button'; chk.className = 'btn btn-secondary btn-sm'; chk.innerHTML = icon('refresh-cw') + '<span>Check email</span>';
    chk.onclick = () => pcCheckEmail(chk, () => paint(), { quiet: true });
    head.appendChild(chk);
    bodyEl.appendChild(head);
    if (!loaded) {
      bodyEl.insertAdjacentHTML('beforeend', `<div class="pc-empty">${icon('loader-circle', 'i-sm')} Reading the email snapshot…</div>`);
      if (typeof InboxStore !== 'undefined') Promise.resolve(InboxStore.load()).then(paint, paint);
      return;
    }
    const all = _pcMailCands();
    const attach = all.filter(c => c.match && getPerson(c.match));
    const fresh = all.filter(c => !(c.match && getPerson(c.match)));
    if (!all.length) { mountEmptyState(bodyEl, { icon: 'user-check', title: 'Everyone is in People', text: 'Nobody in the recent email is missing. Check email again later for new people.' }); return; }
    if (attach.length) {
      bodyEl.insertAdjacentHTML('beforeend', `<div class="pc-th">New addresses for people you have<span class="subtle">${attach.length}</span></div>`);
      for (const c of attach) {
        const p = getPerson(c.match);
        const r = document.createElement('div'); r.className = 'pc-mrow2';
        r.innerHTML = `${avatarHtml(p, 24)}<span class="lbl"><b></b> <span class="subtle"></span></span>`;
        r.querySelector('b').textContent = p.name;
        r.querySelector('.subtle').textContent = `${c.email} · ${c.count} thread${c.count === 1 ? '' : 's'}`;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.textContent = 'Add address';
        b.onclick = async () => { b.disabled = true; await actionsApply([{ op: 'person.update', id: p.id, addEmails: [c.email] }], { client: 'people from email', done: `Added ${c.email} to ${p.name}` }); paint(); };
        r.appendChild(b);
        bodyEl.appendChild(r);
      }
    }
    if (!fresh.length) return;
    bodyEl.insertAdjacentHTML('beforeend', `<div class="pc-th">Not in People<span class="subtle">${fresh.length}</span></div>`);
    const list = document.createElement('div'); list.className = 'pc-tlist';
    for (const c of fresh) {
      const r = document.createElement('div'); r.className = 'pc-mrow2'; r.dataset.selId = c.email;
      r.setAttribute('aria-label', c.name || c.email);
      r.innerHTML = `<span class="avatar avatar-24" style="--c:var(--sw-slate)">${esc(avatarInitials(c.name || c.email))}</span><span class="lbl"><b></b> <span class="subtle"></span></span>`;
      r.querySelector('b').textContent = c.name || c.email.split('@')[0];
      r.querySelector('.subtle').textContent = `${c.email} · ${c.count} thread${c.count === 1 ? '' : 's'}`;
      list.appendChild(r);
    }
    bodyEl.appendChild(list);
    const nameFor = (email) => { const c = fresh.find(x => x.email === email); const n = c && c.name ? c.name : email.split('@')[0].replace(/[._-]+/g, ' ').replace(/(^|\s)\p{Ll}/gu, m => m.toUpperCase()); return n.slice(0, 100); };
    const addThese = async (emails) => {
      const ops = emails.slice(0, 100).map(e => ({ op: 'person.create', name: nameFor(e), emails: [e], allowDuplicate: true }));
      const r = await actionsApply(ops, { client: 'people from email', throw: true, done: `Added ${ops.length} ${ops.length === 1 ? 'person' : 'people'} from email` });
      if (r === false) return undefined;
      setTimeout(paint, 0);
      return { done: emails };
    };
    selectList(list, {
      store: storeAdd, label: 'People in email', rowClick: true, defaultOn: false,
      apply: { label: 'Add to People', icon: 'user-plus', run: addThese },
      dismiss: { label: 'Ignore selected', tip: 'Never suggest these addresses again', run: (emails) => {
        state.peopleIgnoredEmails = [...new Set([...(state.peopleIgnoredEmails || []), ...emails])].slice(-2000);
        saveData(); paint();
        toast(`Ignored ${emails.length} address${emails.length === 1 ? '' : 'es'}`, { action: { label: 'Undo', run: () => undo() } });
      } },
    });
  };
  openDialog({
    title: 'Find people in emails', width: 640, resizeKey: 'people-from-email',
    body: (el) => { el.classList.add('pc-maildlg'); bodyEl = el; paint(); },
    actions: [{ label: 'Close' }],
  });
}
/** A Check email button while the update runs: disabled, spinning, "Checking…". */
function _pcBusyBtn(btn, on) {
  if (!btn) return;
  btn.disabled = !!on;
  if (on) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy');
  const ic = btn.querySelector('.i'); if (ic) ic.classList.toggle('spin', !!on);
  const s = btn.querySelector('span:not(.badge)');
  if (s) { if (on && !btn.dataset.label) btn.dataset.label = s.textContent; s.textContent = on ? 'Checking…' : (btn.dataset.label || s.textContent); }
}
/** "Check email": start the read-only inbox update; then() runs when it has finished.
 *  o.quiet: no "Email checked" toast (the people-in-email dialog repaints instead). */
function pcCheckEmail(btn, then, o) {
  o = o || {};
  if (typeof InboxStore === 'undefined') { toast('Email is not available here.', { kind: 'err' }); return; }
  if (InboxStore.running()) { toast('Checking email already…', { icon: 'loader-circle' }); return; }
  _pcBusyBtn(btn, true);
  // A button shows its own spinner; from the command palette there is none, so say it started.
  if (!o.quiet && !btn) toast('Checking email (subjects and senders only)…', { icon: 'refresh-cw' });
  const free = () => { _pcBusyBtn(btn, false); if (state.view === 'people') document.querySelectorAll('.pc-toolbar [data-fk="pc-check"]').forEach(b => _pcBusyBtn(b, false)); };
  Promise.resolve(InboxStore.update({ force: true })).then((r) => {
    const wait = () => {
      if (InboxStore.running()) { setTimeout(wait, 1500); return; }
      free();
      const job = InboxStore.st && InboxStore.st.job;
      if (r && r.noSources) toast('No mailbox is connected yet.', { kind: 'err', action: { label: 'Open Connections', run: () => (window.Connections ? Connections.open('gmail') : setView('connections')) } });
      else if (job && job.state === 'error') toast(job.error || 'Email could not be checked.', { kind: 'err' });
      else if (!o.quiet) {
        let n = 0;
        try { n = _pcMailCands().length; } catch (e) { n = 0; }
        // The inbox store already says 'Email updated'; this adds only what People can act on.
        if (n) toast(`${n} ${n === 1 ? 'person' : 'people'} in your email ${n === 1 ? 'is' : 'are'} not in People yet`, { icon: 'user-search', action: { label: 'Review', run: () => pcOpenMailPeople() } });
      }
      if (then) then(r);
    };
    wait();
  }, (e) => { free(); toast(netErrorMessage(e), { kind: 'err' }); });
}

/* ---------- the People page's actions ---------- */
function pcPeopleToolbar() {
  const bar = document.createElement('div'); bar.className = 'pc-toolbar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'People actions');
  const b = (ic, label, run, o) => {
    o = o || {};
    const x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-sm ' + (o.cls || 'btn-secondary');
    x.innerHTML = icon(ic) + `<span>${esc(label)}</span>` + (o.badge ? `<span class="badge badge-soft">${esc(o.badge)}</span>` : '');
    if (o.tip) x.setAttribute('data-tip', o.tip);
    x.onclick = (e) => run(e.currentTarget);
    bar.appendChild(x); return x;
  };
  let sugN = 0;
  try { sugN = pplSuggest(state, { index: pplIndex(), details: false }).length; } catch (e) { sugN = 0; }
  let mailN = 0;
  try { if (typeof InboxStore !== 'undefined' && InboxStore.st && InboxStore.st.loaded) mailN = _pcMailCands().length; } catch (e) { mailN = 0; }
  b('user-search', 'Find people in emails', () => pcOpenMailPeople(), { badge: mailN || '', tip: 'Senders and people copied in on recent email who are not in People' });
  const age = typeof InboxStore !== 'undefined' && InboxStore.data && InboxStore.data.fetchedAt && typeof gdAgeLabel === 'function' ? gdAgeLabel(InboxStore.data.fetchedAt) : '';
  const chk = b('refresh-cw', 'Check email', (x) => pcCheckEmail(x, () => { if (state.view === 'people') renderMain(); }), { tip: age ? `${age}. Reads subjects and senders only` : 'Read recent email (subjects and senders only)' });
  chk.dataset.fk = 'pc-check';
  if (typeof InboxStore !== 'undefined' && InboxStore.running()) _pcBusyBtn(chk, true);   // a re-render while it runs
  b('link', 'Review suggested links', () => openLinkSuggestions('links'), { badge: sugN ? String(sugN) : '', tip: 'Tasks that name someone they are not linked to: tick, Select all, link' });
  b('users', 'Assign to tasks…', () => pcOpenAssign(), { tip: 'Link several people to several tasks at once' });
  return bar;
}

// A person's avatar on a task row opens them (the row itself still opens the task).
document.addEventListener('click', (e) => {
  const a = e.target && e.target.closest ? e.target.closest('.t-people .avatar[data-cz="person"]') : null;
  if (!a || !getPerson(a.dataset.czId)) return;
  e.preventDefault(); e.stopPropagation();
  openPerson(a.dataset.czId, { from: a });
}, true);

if (typeof registerCommand === 'function') {
  registerCommand({ id: 'people-find-in-email', label: 'Find people in emails', icon: 'user-search', group: 'People', keywords: 'people email senders contacts scrape add', run: () => pcOpenMailPeople() });
  registerCommand({ id: 'people-assign', label: 'Assign people to tasks…', icon: 'users', group: 'People', keywords: 'people link tasks assign bulk', run: () => pcOpenAssign() });
  registerCommand({ id: 'people-check-email', label: 'Check email', icon: 'refresh-cw', group: 'People', keywords: 'email inbox update refresh people', run: () => pcCheckEmail(null) });
}
