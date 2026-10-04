/* ============================================================
   PEOPLE PAGE (#view=people, #view=person:<id>). Owner: People.
   Mockup 04: a table (or cards) of everyone, filters by group, a callout
   for names in tasks that aren't in People, and a person panel on the right:
   role/org, emails, aliases, streams, next meeting and last contact (from
   the calendar), open tasks split into "I owe them" / "Waiting on them",
   dated notes, recent email (when Gmail is connected).
   Dialogs: add/edit person, merge, link suggestions (accept in bulk, with
   the "link people when a task is created" switch).
   Every user/external string goes through esc()/escAttr() or textContent.
   ============================================================ */
let _pplQuery = '';
let _pplShowDone = false;
let _pplCalAsked = false;
let _pplCalloutHidden = false;
let _pplAllTasksFor = null;   // person id whose panel shows every open task (else the first few)
const PPL_PANEL_TASKS = 4;

function _pplPrefs() {
  const p = state.peopleView && typeof state.peopleView === 'object' ? state.peopleView : (state.peopleView = {});
  if (!['table', 'cards'].includes(p.mode)) p.mode = 'table';
  if (!['next', 'name', 'open', 'contact'].includes(p.sort)) p.sort = 'next';
  if (typeof p.group !== 'string') p.group = 'all';
  return p;
}
function _pplVisible() { return (Array.isArray(state.people) ? state.people : []).filter(p => p && !p.self); }
function _pplFirst(p) { const w = pplNameParts(p && p.name)[0]; return w || (p && p.name) || ''; }
function _pplDayMs(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getTime(); }
function _pplAgo(ms) {
  if (!ms) return '';
  // round, not floor: across a daylight-saving change two local midnights are 23 or 25 hours apart.
  const days = Math.round((_pplDayMs(todayStr()) - _pplDayMs(fmtDate(new Date(ms)))) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) { const w = Math.round(days / 7); return w === 1 ? '1 week ago' : `${w} weeks ago`; }
  if (days < 365) { const m = Math.round(days / 30); return m === 1 ? '1 month ago' : `${m} months ago`; }
  const y = Math.round(days / 365); return y === 1 ? '1 year ago' : `${y} years ago`;
}
function _pplCalReady() { return typeof CalStore !== 'undefined' && CalStore.st && CalStore.st.loaded; }
function _pplEnsureCal() {
  if (_pplCalAsked || typeof CalStore === 'undefined' || !CalStore.load) return;
  _pplCalAsked = true;
  if (CalStore.st && CalStore.st.loaded) return;
  try { Promise.resolve(CalStore.load()).then(() => { if (state.view === 'people' || state.view.startsWith('person:')) renderMain(); }).catch(() => {}); } catch (e) {}
}
function _pplEvents(p) {
  if (!_pplCalReady() || typeof calendarEventsFor !== 'function') return [];
  try { return calendarEventsFor(p, 40) || []; } catch (e) { return []; }
}

/** Everything the table and the panel show about one person. */
function _pplFacts(p) {
  const tasks = tasksForPerson(p.id);
  const open = tasks.filter(i => statusOf(i.id) !== 'done');
  // "Next due" is the next deadline from today on (mockup 04); only when
  // everything dated is already late does it show the oldest late one.
  const today = todayStr();
  const dated = open.filter(i => effDate(i)).sort((a, b) => String(effDate(a)).localeCompare(String(effDate(b))) || String(a.dueTime || '99').localeCompare(String(b.dueTime || '99')));
  const nextTask = dated.find(i => effDate(i) >= today) || dated[0] || null;
  const now = Date.now();
  let last = 0, nextEv = null;
  for (const ev of _pplEvents(p)) {
    const s = calEventStart(ev).getTime();
    if (s <= now) { if (s > last) last = s; }
    else if (!nextEv || s < calEventStart(nextEv).getTime()) nextEv = ev;
  }
  for (const i of tasks) {
    const log = state.completionLog && state.completionLog[i.id];
    if (Array.isArray(log)) for (const ts of log) if (Number.isFinite(ts) && ts <= now && ts > last) last = ts;
  }
  const mail = _pplMail[p.id];
  if (mail && Array.isArray(mail.messages)) for (const m of mail.messages) { const t = Date.parse(m.date); if (Number.isFinite(t) && t <= now && t > last) last = t; }
  return { tasks, open, next: nextTask ? effDate(nextTask) : null, nextTime: nextTask && nextTask.dueTime && effDate(nextTask) === today ? nextTask.dueTime : '', last, nextEv };
}

function _pplGroups(list) {
  const m = new Map();
  for (const p of list) { const g = String(p.group || '').trim(); if (g) m.set(g, (m.get(g) || 0) + 1); }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));   // A-Z, as in mockup 04
}

/* ---------- section ---------- */
registerSection('people', {
  group: 'tasks',
  layout: 'bare',
  match: v => v === 'people' || (/^person:./.test(v) && !!getPerson(v.slice(7))),
  title: v => { if (v.startsWith('person:')) { const p = getPerson(v.slice(7)); return p ? p.name : 'Person'; } return 'People'; },
  crumb: v => { if (v.startsWith('person:')) { const p = getPerson(v.slice(7)); return ['People', p ? p.name : v.slice(7)]; } return ['People']; },
  mount(container, view) { renderPeoplePage(container, view.startsWith('person:') ? view.slice(7) : null); },
});

function renderPeoplePage(container, selId) {
  _pplEnsureCal();
  const pref = _pplPrefs();
  const all = _pplVisible();
  const sel = selId ? getPerson(selId) : null;
  const wrap = document.createElement('div');
  wrap.className = 'ppl-wrap' + (sel && !state.selectedTaskId ? ' has-panel' : '');
  const page = document.createElement('div'); page.className = 'ppl-page';
  wrap.appendChild(page);
  container.appendChild(wrap);

  // Header
  const ph = document.createElement('div'); ph.className = 'ph';
  ph.innerHTML = `<h1>People</h1><span class="ph-sub">${all.length} contact${all.length === 1 ? '' : 's'}</span>`;
  const acts = document.createElement('div'); acts.className = 'ph-actions';
  const filt = document.createElement('label'); filt.className = 'input input-sm ppl-filter';
  filt.innerHTML = icon('search');
  const fin = document.createElement('input'); fin.type = 'search'; fin.placeholder = 'Filter people'; fin.value = _pplQuery; fin.dataset.fk = 'ppl-filter';
  fin.setAttribute('aria-label', 'Filter people');
  fin.oninput = () => { _pplQuery = fin.value; _pplPaintBody(); };
  filt.appendChild(fin);
  const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Layout');
  for (const [k, l, ic] of [['table', 'Table', 'layout-list'], ['cards', 'Cards', 'layout-grid']]) {
    const b = document.createElement('button'); b.type = 'button'; b.innerHTML = icon(ic, 'i-sm') + `<span>${l}</span>`;
    b.setAttribute('aria-pressed', pref.mode === k ? 'true' : 'false');
    b.onclick = () => { pref.mode = k; saveUI(); renderMain(); };
    seg.appendChild(b);
  }
  const add = document.createElement('button'); add.type = 'button'; add.className = 'btn btn-primary';
  add.innerHTML = icon('user-plus', 'i-sm') + '<span>Add person</span>';
  add.onclick = () => openPersonEditor(null);
  // The "..." menu only appears once there is something to bring back (mockup 04
  // has no menu here): the callout's Review all, the sidebar's link button and
  // the suggestions dialog's switch cover the other two items.
  const more = document.createElement('button'); more.type = 'button'; more.className = 'btn-icon'; more.innerHTML = icon('ellipsis');
  more.hidden = !_pplCalloutHidden && !(state.peopleIgnoredNames || []).length;
  more.setAttribute('aria-label', 'More people actions'); more.setAttribute('data-tip', 'More');
  more.onclick = () => openMenu(more, [
    { label: 'Review link suggestions…', icon: 'link', run: () => openLinkSuggestions() },
    { label: 'Link people when a task is created', icon: 'wand-sparkles', checked: () => state.peopleAutoLink !== false,
      run: () => { state.peopleAutoLink = state.peopleAutoLink === false; saveData(); toast(state.peopleAutoLink === false ? 'New tasks will not be linked automatically' : 'New tasks link the people their title names', { icon: 'link' }); } },
    'sep',
    { label: 'Show the names callout again', icon: 'eye', hidden: () => !_pplCalloutHidden && !(state.peopleIgnoredNames || []).length,
      run: () => { _pplCalloutHidden = false; state.peopleIgnoredNames = []; saveData(); renderMain(); } },
  ], { align: 'end', width: 300 });
  acts.append(filt, seg, add, more);
  ph.appendChild(acts);
  page.appendChild(ph);

  if (!all.length) {
    mountEmptyState(page, { icon: 'users', title: 'No people yet', text: 'Add the people you work with. Tasks that mention them link automatically, and you see what you owe each of them and what you are waiting on.' });
    const sugBox = document.createElement('div'); page.appendChild(sugBox);
    _pplCallout(sugBox);
  } else {
    const cbox = document.createElement('div'); page.appendChild(cbox);
    _pplCallout(cbox);
    const body = document.createElement('div'); body.className = 'ppl-body'; page.appendChild(body);
  }
  if (sel && !state.selectedTaskId) {
    const panel = document.createElement('aside'); panel.className = 'ppl-panel'; panel.setAttribute('aria-label', 'Person');
    wrap.appendChild(panel);
    _pplPanel(panel, sel);
  } else if (selId && !sel) {
    const panel = document.createElement('aside'); panel.className = 'ppl-panel';
    mountEmptyState(panel, { icon: 'user-x', title: 'Not in People', text: 'Nobody with this id. They may have been merged or deleted.' });
    wrap.appendChild(panel);
  }
  _pplPaintBody();
}

/* ---------- names in tasks that aren't people ---------- */
function _pplCallout(box) {
  box.innerHTML = '';
  if (_pplCalloutHidden) return;
  const idx = pplIndex();
  const stop = [...Object.values(STREAMS).map(s => s.label), ...(state.people || []).flatMap(p => [p.org, p.group]), userName()].filter(Boolean);
  const unknown = pplUnknownNames(state, { index: idx, stop, ignore: state.peopleIgnoredNames || [] });
  const orphans = [...pplOrphans(state)];
  const sug = pplSuggest(state, { index: idx, details: false });
  if (!unknown.length && !orphans.length && !sug.length) return;
  const c = document.createElement('div'); c.className = 'callout ppl-callout';
  c.innerHTML = icon('sparkles');
  const g = document.createElement('div'); g.className = 'grow';
  const n = unknown.length + orphans.length;
  const head = document.createElement('div'); head.className = 'ppl-callout-h';
  head.textContent = n
    ? `${n} name${n === 1 ? '' : 's'} in your tasks ${n === 1 ? 'isn’t' : 'aren’t'} in People yet, so ${n === 1 ? 'its' : 'their'} tasks don’t link`
    : `${sug.length} task${sug.length === 1 ? ' names' : 's name'} someone ${sug.length === 1 ? 'it is' : 'they are'} not linked to`;
  g.appendChild(head);
  const chips = document.createElement('div'); chips.className = 'suggest';
  const SHOW = 4;
  const items = [
    ...orphans.map(([id, r]) => ({ label: id, count: r.total, orphan: true, id })),
    ...unknown.map(u => ({ label: u.name, count: u.count })),
  ];
  items.slice(0, SHOW).forEach((it, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
    b.innerHTML = icon(it.orphan ? 'link-2-off' : 'user-plus', 'i-xs') + `<span>${esc(it.label)}</span><span class="subtle">· ${it.count}${i === 0 ? ` task${it.count === 1 ? '' : 's'}` : ''}</span>`;
    b.title = it.orphan ? `Tasks point at “${it.label}” but there is no profile: create it` : `Add ${it.label} to People`;
    b.onclick = () => it.orphan ? openPersonEditor(null, { id: it.id, name: it.label.replace(/[-_]+/g, ' ').replace(/(^|\s)\p{Ll}/gu, m => m.toUpperCase()) }) : openPersonEditor(null, { name: it.label });
    chips.appendChild(b);
  });
  if (items.length > SHOW) {
    const m = document.createElement('button'); m.type = 'button'; m.className = 'chip chip-more';
    m.textContent = `+${items.length - SHOW} more`;
    m.onclick = () => openLinkSuggestions('names');
    chips.appendChild(m);
  }
  if (n && sug.length) {
    const s = document.createElement('button'); s.type = 'button'; s.className = 'chip chip-accent';
    s.innerHTML = icon('link', 'i-xs') + `<span>${sug.length} task${sug.length === 1 ? '' : 's'} to link</span>`;
    s.onclick = () => openLinkSuggestions('links');
    chips.appendChild(s);
  }
  if (!n) {
    const s = document.createElement('div'); s.className = 'subtle ppl-callout-sub';
    s.textContent = 'Their names are in the title or a subtask. Review and link them in one go.';
    g.appendChild(s);
  } else g.appendChild(chips);
  c.appendChild(g);
  const rev = document.createElement('button'); rev.type = 'button'; rev.className = 'btn btn-secondary btn-sm';
  rev.textContent = 'Review all';
  rev.onclick = () => openLinkSuggestions(n ? 'names' : 'links');
  const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm'; x.innerHTML = icon('x', 'i-sm');
  x.setAttribute('aria-label', 'Hide'); x.setAttribute('data-tip', 'Hide for now');
  x.onclick = () => { _pplCalloutHidden = true; renderMain(); };
  c.append(rev, x);
  box.appendChild(c);
}

/* ---------- table / cards ---------- */
function _pplPaintBody() {
  const body = document.querySelector('#main-body .ppl-body');
  if (!body) return;
  const pref = _pplPrefs();
  body.innerHTML = '';
  const all = _pplVisible();
  const q = pplFold(_pplQuery.trim());
  const match = (p) => !q || [p.name, p.role, p.org, p.group, p.id, ...pplPersonEmails(p), ...(p.aliases || [])].some(v => pplFold(v || '').includes(q));
  const groups = _pplGroups(all);
  if (pref.group !== 'all' && pref.group !== '_none' && !groups.some(([g]) => g === pref.group)) pref.group = 'all';
  const inGroup = (p) => pref.group === 'all' || (pref.group === '_none' ? !p.group : p.group === pref.group);
  const rows = all.filter(p => match(p) && inGroup(p)).map(p => ({ p, f: _pplFacts(p) }));
  const cmpName = (a, b) => String(a.p.name).localeCompare(String(b.p.name));
  const sorters = {
    next: (a, b) => (a.f.next ? 0 : 1) - (b.f.next ? 0 : 1) || String(a.f.next || '').localeCompare(String(b.f.next || '')) || b.f.open.length - a.f.open.length || cmpName(a, b),
    name: cmpName,
    open: (a, b) => b.f.open.length - a.f.open.length || cmpName(a, b),
    contact: (a, b) => (b.f.last || 0) - (a.f.last || 0) || cmpName(a, b),
  };
  rows.sort((a, b) => (!!a.p.inactive - !!b.p.inactive) || ((a.p.kind === 'mailbox') - (b.p.kind === 'mailbox')) || sorters[pref.sort](a, b));

  // Filter chips + sort
  const bar = document.createElement('div'); bar.className = 'ppl-bar';
  const chip = (label, key, n) => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'chip' + (pref.group === key ? ' chip-accent' : '');
    b.setAttribute('aria-pressed', pref.group === key ? 'true' : 'false');
    b.innerHTML = `<span>${esc(label)}</span><span class="${pref.group === key ? '' : 'subtle'}">${n}</span>`;
    b.onclick = () => { pref.group = key; saveUI(); _pplPaintBody(); };
    return b;
  };
  bar.appendChild(chip('All', 'all', all.length));
  for (const [g, n] of groups) bar.appendChild(chip(g, g, n));
  const none = all.filter(p => !p.group).length;
  if (groups.length && none) bar.appendChild(chip('No group', '_none', none));
  const SORT = { next: 'Next due', name: 'Name', open: 'Open tasks', contact: 'Last contact' };
  const sb = document.createElement('button'); sb.type = 'button'; sb.className = 'btn btn-ghost btn-sm ppl-sort';
  sb.innerHTML = icon('arrow-up-down', 'i-sm') + `<span>${esc(SORT[pref.sort])}</span>`;
  sb.onclick = () => openMenu(sb, Object.entries(SORT).map(([k, l]) => ({ label: l, checked: pref.sort === k, run: () => { pref.sort = k; saveUI(); _pplPaintBody(); } })), { align: 'end', width: 200 });
  bar.appendChild(sb);
  body.appendChild(bar);

  if (!rows.length) {
    mountEmptyState(body, { icon: 'search-x', title: 'Nobody matches', text: q ? 'Try a different name, email or organisation.' : 'No one is in this group.' });
    return;
  }
  const selId = state.view.startsWith('person:') ? state.view.slice(7) : null;
  const open = (p) => { state.selectedTaskId = null; setView('person:' + p.id); };
  if (pref.mode === 'cards') {
    const grid = document.createElement('div'); grid.className = 'ppl-cards';
    for (const { p, f } of rows) {
      const c = document.createElement('button'); c.type = 'button';
      c.className = 'card ppl-card' + (p.id === selId ? ' sel' : '') + (p.inactive ? ' inactive' : '');
      if (!p.stub) czMark(c, 'person', p.id);   // right-click: rename, colour, symbol... (28-customise.js)
      const sub = [p.role, p.org].filter(Boolean).join(' · ');
      c.innerHTML = `<div class="ppl-card-h">${avatarHtml(p, 40)}<div class="min0"><div class="pp-name truncate">${esc(p.name)}</div><div class="pp-role truncate">${esc(sub || _pplKindLabel(p))}</div></div></div>`
        + `<div class="ppl-card-f"><span>${icon('circle-dot', 'i-xs')}${f.open.length} open</span>`
        + (f.next ? (() => { const x = _pplDue(f.next, f.nextTime); return `<span class="due ${escAttr(x.cls)}">${esc(x.text)}</span>`; })() : '<span class="subtle">No due tasks</span>')
        + `<span class="subtle">${esc(f.last ? _pplAgo(f.last) : '')}</span></div>`;
      c.onclick = () => open(p);
      grid.appendChild(c);
    }
    body.appendChild(grid);
    return;
  }
  const narrow = !!document.querySelector('.ppl-wrap.has-panel');
  const t = document.createElement('table'); t.className = 'table ppl-table' + (narrow ? ' narrow' : '');
  t.innerHTML = `<thead><tr><th>Name</th><th class="c-org">Organisation</th><th class="c-streams">Streams</th><th class="num">Open</th><th>Next due</th><th class="c-last">Last contact</th></tr></thead>`;
  const tb = document.createElement('tbody');
  for (const { p, f } of rows) {
    const tr = document.createElement('tr');
    tr.className = (p.id === selId ? 'sel' : '') + (p.inactive ? ' inactive' : '');
    tr.tabIndex = 0;
    if (!p.stub) czMark(tr, 'person', p.id);
    const streams = (Array.isArray(p.streams) && p.streams.length ? p.streams : _pplStreamsFromTasks(f.tasks)).filter(s => STREAMS[s]).slice(0, 4);
    const badge = p.stub ? '<span class="badge badge-warning">incomplete</span>' : pplKind(p) !== 'person' ? `<span class="badge badge-soft">${esc(_pplKindLabel(p))}</span>` : '';
    tr.innerHTML = `<td><div class="pp-cell">${avatarHtml(p, 28)}<div class="min0"><div class="pp-name truncate">${esc(p.name)}${badge}</div><div class="pp-role truncate">${esc(p.role || '')}</div></div></div></td>`
      + `<td class="muted c-org"><span class="truncate">${p.org ? esc(p.org) : '—'}</span></td>`
      + `<td class="c-streams"><span class="ppl-dots">${streams.map(s => `<span class="hstack" title="${escAttr(STREAMS[s].label)}"${czAttrs('stream', s)}>${streamMarkHtml(s)}</span>`).join('')}</span></td>`
      + `<td class="num">${f.open.length ? f.open.length : '<span class="subtle">0</span>'}</td>`
      + `<td>${(() => { const x = _pplDue(f.next, f.nextTime); return `<span class="due ${escAttr(x.cls)}">${esc(x.text)}</span>`; })()}</td>`
      + `<td class="subtle c-last">${esc(f.last ? _pplAgo(f.last) : '—')}</td>`;
    tr.onclick = () => open(p);
    tr.onkeydown = (e) => { if (e.key === 'Enter') open(p); };
    tb.appendChild(tr);
  }
  t.appendChild(tb);
  body.appendChild(t);
}
/** Due label for People: 'Today', 'Tomorrow', '2d late', 'Mon 5 Oct', '6 Nov 2027'; class: overdue|today|soon (<=3 days). */
function _pplDue(iso, time) {
  if (!iso) return { text: '—', cls: '' };
  const d = daysUntil(iso);
  const loc = (APP_CONFIG && APP_CONFIG.locale) || undefined;
  const dt = new Date(iso + 'T00:00:00');
  let text;
  if (d === 0) text = /^\d{1,2}:\d{2}$/.test(time || '') ? time : 'Today'; else if (d === 1) text = 'Tomorrow'; else if (d < 0) text = (-d) + 'd late';
  else if (d <= 13) text = _pplFmt(dt, { weekday: 'short', day: 'numeric', month: 'short' });
  else text = _pplFmt(dt, dt.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  return { text, cls: d < 0 ? 'overdue' : d === 0 ? 'today' : d <= 3 ? 'soon' : '' };
}
/** Short due label for the person panel's task rows (mockup 04): 'Today', 'Tomorrow', 'Wed' (within a week, late or not), 'Fri 9' (next week), '14 Oct', '9d late'. */
function _pplShortDue(iso) {
  const d = daysUntil(iso);
  const dt = new Date(iso + 'T00:00:00');
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d < -6) return (-d) + 'd late';
  if (d < 7) return _pplFmt(dt, { weekday: 'short' });
  if (d <= 8) return _pplFmt(dt, { weekday: 'short', day: 'numeric' });
  return _pplFmt(dt, dt.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}
/** Locale date text; "Sept" (newer en-GB data) is shortened to "Sep" like the rest of the mockups. */
function _pplFmt(dt, opts) {
  return dt.toLocaleDateString((APP_CONFIG && APP_CONFIG.locale) || undefined, opts).replace(/\bSept\b/, 'Sep');
}
function _pplTime(dt) { return dt.toLocaleTimeString((APP_CONFIG && APP_CONFIG.locale) || undefined, { hour: '2-digit', minute: '2-digit' }); }
/**
 * A regular meeting with this person: the same weekday + start time + title
 * at least twice (or a recurring event) with one still to come.
 * -> {text: 'Fridays 11:00 · next today', title} | null
 */
function _pplMeets(p) {
  const evs = _pplEvents(p).filter(ev => !ev.allDay && ev.start && ev.start.dateTime);
  const now = Date.now();
  const groups = new Map();
  for (const ev of evs) {
    const s = calEventStart(ev);
    const k = s.getDay() + '|' + _pplTime(s) + '|' + String(ev.summary || '').trim().toLowerCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(ev);
  }
  let best = null;
  for (const list of groups.values()) {
    const next = list.filter(ev => calEventEnd(ev).getTime() >= now).sort((a, b) => calEventStart(a) - calEventStart(b))[0];
    if (!next || !(list.length >= 2 || next.recurring || next.recurringEventId)) continue;
    if (!best || calEventStart(next) < calEventStart(best.next)) best = { next, n: list.length };
  }
  if (!best) return null;
  const s = calEventStart(best.next);
  const loc = (APP_CONFIG && APP_CONFIG.locale) || '';
  const wd = _pplFmt(s, { weekday: 'long' });
  const days = Math.round((_pplDayMs(fmtDate(s)) - _pplDayMs(todayStr())) / 86400000);
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : _pplFmt(s, days < 7 ? { weekday: 'short' } : { weekday: 'short', day: 'numeric', month: 'short' });
  return { text: `${/^en\b|^en-/i.test(loc || 'en') ? wd + 's' : wd} ${_pplTime(s)} · next ${when}`, title: best.next.summary || '' };
}
function _pplKindLabel(p) { return pplKind(p) === 'org' ? 'Organisation' : p.kind === 'mailbox' ? 'Mailbox' : 'Person'; }
function _pplStreamsFromTasks(tasks) {
  const c = new Map();
  for (const i of tasks) { const s = effStream(i); c.set(s, (c.get(s) || 0) + 1); }
  return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
}

/* ---------- person panel ---------- */
function _pplPanel(el, p) {
  const f = _pplFacts(p);
  const top = document.createElement('div'); top.className = 'ppl-panel-top';
  const mk = (ic, label, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon btn-sm'; b.innerHTML = icon(ic, 'i-sm'); b.setAttribute('aria-label', label); b.setAttribute('data-tip', label); b.onclick = run; return b; };
  const doneN = f.tasks.length - f.open.length;
  const moreBtn = mk('ellipsis', 'More', () => openMenu(moreBtn, [
    { label: p.pinned ? 'Unpin from sidebar' : 'Pin to sidebar', icon: p.pinned ? 'pin-off' : 'pin', run: () => { updatePersonFields(p.id, { pinned: !p.pinned }); render(); } },
    { label: _pplShowDone ? 'Hide done tasks' : `Show done tasks (${doneN})`, icon: 'circle-check', hidden: () => !doneN, run: () => { _pplShowDone = !_pplShowDone; renderMain(); } },
    { label: p.inactive ? 'Mark as active' : 'Mark as inactive', icon: p.inactive ? 'user-check' : 'user-minus', run: () => { updatePersonFields(p.id, { inactive: !p.inactive }); render(); } },
    { label: 'Merge into…', icon: 'git-merge', run: () => openPersonMerge(p.id) },
    'sep',
    { label: 'Delete…', icon: 'trash-2', danger: true, run: () => pplConfirmDelete(p.id) },
  ], { align: 'end', width: 220 }));
  top.append(mk('pencil', 'Edit', () => openPersonEditor(p.id)), moreBtn, mk('x', 'Close', () => setView('people')));
  el.appendChild(top);

  const hero = document.createElement('div'); hero.className = 'pp-hero';
  const sub = [p.role, p.org].filter(Boolean).join(' · ');
  hero.innerHTML = `${avatarHtml(p, 56)}<div class="min0"><h2>${esc(p.name)}</h2><div class="muted pp-sub">${esc(sub || _pplKindLabel(p))}</div></div>`;
  el.appendChild(hero);
  if (p.stub) {
    const c = document.createElement('div'); c.className = 'callout warn ppl-stub';
    c.innerHTML = icon('info') + '<div class="grow">Tasks pointed at this id with no profile, so a basic one was made. Add a name and email so it links properly.</div>';
    el.appendChild(c);
  }

  const btns = document.createElement('div'); btns.className = 'ppl-actions';
  const emails = pplPersonEmails(p);
  const mail = document.createElement('a'); mail.className = 'btn btn-secondary' + (emails.length ? '' : ' is-disabled');
  mail.innerHTML = icon('mail', 'i-sm') + '<span>Email</span>';
  if (emails.length) { mail.href = 'mailto:' + encodeURIComponent(emails[0]).replace(/%40/g, '@'); } else { mail.setAttribute('aria-disabled', 'true'); mail.title = 'No email address yet'; }
  const tk = document.createElement('button'); tk.type = 'button'; tk.className = 'btn btn-secondary';
  tk.innerHTML = icon('plus', 'i-sm') + `<span>Task for ${esc(_pplFirst(p))}</span>`;
  tk.onclick = () => (typeof openQuickAddDialog === 'function' ? openQuickAddDialog('@' + p.id + ' ') : openNewTask('@' + p.id + ' '));
  const nt = document.createElement('button'); nt.type = 'button'; nt.className = 'btn btn-secondary';
  nt.innerHTML = icon('notebook-pen', 'i-sm') + '<span>Note</span>';
  // The note box stays folded away while there are notes (mockup 04); Note opens it.
  nt.onclick = () => { const comp = el.querySelector('.ppl-note-compose'); if (comp) comp.hidden = false; const ta = el.querySelector('.ppl-note-in'); if (ta) { ta.scrollIntoView({ block: 'nearest' }); ta.focus(); } };
  btns.append(mail, tk, nt);
  el.appendChild(btns);

  // Profile
  const s1 = document.createElement('section'); s1.className = 'dp-section';
  const dl = document.createElement('dl'); dl.className = 'kv';
  const row = (ic, label, html) => { dl.insertAdjacentHTML('beforeend', `<dt>${icon(ic, 'i-xs')}${esc(label)}</dt><dd>${html}</dd>`); };
  row('at-sign', emails.length > 1 ? 'Emails' : 'Email', emails.length ? emails.map(e => `<span class="truncate">${esc(e)}</span>`).join('') : '<span class="subtle">None yet</span>');
  const aliases = (p.aliases || []).filter(a => pplFold(a) !== pplFold(p.name));
  row('tag', 'Aliases', aliases.map(a => `<span class="chip chip-solid">${esc(a)}</span>`).join('') + '<button type="button" class="chip chip-more ppl-add-alias">' + icon('plus', 'i-xs') + '<span>Add</span></button>');
  // Same rule as the table: the person's own streams, else the streams of their tasks.
  const streams = ((p.streams || []).filter(s => STREAMS[s]).length ? p.streams : _pplStreamsFromTasks(f.tasks)).filter(s => STREAMS[s]).slice(0, 4);
  row('layers', 'Streams', streams.length ? streams.map(s => `<span class="stream"><span class="dot" style="--c:${escAttr(safeColor(STREAMS[s].color))}"></span>${esc(STREAMS[s].label)}</span>`).join('') : '<span class="subtle">Not set</span>');
  // Group is the People page's filter chips (and the edit dialog), so it has no row here.
  // A regular meeting reads "Meets: Fridays 11:00 · next today"; a one-off shows the next one.
  // Last contact (also a table column) fills in when nothing is coming up.
  const meets = _pplMeets(p);
  if (meets) row('calendar-clock', 'Meets', `<span class="truncate" title="${escAttr(meets.title)}">${esc(meets.text)}</span>`);
  else if (f.nextEv) {
    const s = calEventStart(f.nextEv);
    const when = _pplFmt(s, { weekday: 'short', day: 'numeric', month: 'short' }) + (f.nextEv.allDay ? '' : ', ' + _pplTime(s));
    row('calendar-clock', 'Next meeting', `<span class="truncate" title="${escAttr(f.nextEv.summary || '')}">${esc(when)} · ${esc(f.nextEv.summary || 'Event')}</span>`);
  } else row('history', 'Last contact', f.last ? esc(_pplAgo(f.last)) : '<span class="subtle">Not yet</span>');
  if (p.phone) row('phone', 'Phone', `<a href="tel:${escAttr(String(p.phone).replace(/[^\d+]/g, ''))}">${esc(p.phone)}</a>`);
  if (safeUrl(p.linkedin)) row('link', 'LinkedIn', `<a href="${escAttr(safeUrl(p.linkedin))}" target="_blank" rel="noopener noreferrer">Profile</a>`);
  s1.appendChild(dl);
  const hint = document.createElement('div'); hint.className = 'subtle ppl-hint';
  hint.textContent = 'Aliases link tasks that mention any of these names.';
  s1.appendChild(hint);
  el.appendChild(s1);
  const aa = s1.querySelector('.ppl-add-alias');
  if (aa) aa.onclick = async () => {
    const v = await promptDialog({ title: 'Add an alias', label: `Another name for ${p.name} (a nickname, surname or initials)`, placeholder: 'e.g. Sam', confirmLabel: 'Add' });
    if (!v) return;
    const err = updatePersonFields(p.id, { aliases: [...(p.aliases || []), v] });
    if (err) toast(err, { kind: 'error' }); else render();
  };

  // Open tasks: I owe them / waiting on them
  const s2 = document.createElement('section'); s2.className = 'dp-section';
  const owe = f.open.filter(i => !pplIsWaiting(i)).sort(_pplByDue);
  const wait = f.open.filter(i => pplIsWaiting(i)).sort(_pplByDue);
  const done = f.tasks.filter(i => statusOf(i.id) === 'done');
  // Mockup 04: the first few open tasks and "View all"; the "I owe them" /
  // "Waiting on them" headings only appear when there is something to wait on.
  const all = _pplAllTasksFor === p.id;
  const th = document.createElement('div'); th.className = 'dp-title';
  th.innerHTML = `<span class="ppl-sh">Open tasks <span class="subtle">${f.open.length}</span></span>`;
  if (f.open.length > PPL_PANEL_TASKS) {
    const va = document.createElement('button'); va.type = 'button'; va.className = 'btn btn-ghost btn-sm';
    va.textContent = all ? 'Show fewer' : 'View all';
    va.setAttribute('aria-expanded', all ? 'true' : 'false');
    va.onclick = () => { _pplAllTasksFor = all ? null : p.id; renderMain(); };
    th.appendChild(va);
  }
  s2.appendChild(th);
  let room = all ? Infinity : PPL_PANEL_TASKS;
  const list = (title, items, empty) => {
    if (!items.length && !empty) return;
    if (title) { const h = document.createElement('div'); h.className = 'overline ppl-sub-h'; h.textContent = title; s2.appendChild(h); }
    if (!items.length) { const e = document.createElement('div'); e.className = 'subtle ppl-empty'; e.textContent = empty; s2.appendChild(e); return; }
    const shown = items.slice(0, Math.max(1, room));
    room -= shown.length;
    for (const i of shown) s2.appendChild(_pplMiniTask(i));
  };
  if (!f.open.length) {
    const e = document.createElement('div'); e.className = 'subtle ppl-empty';
    e.textContent = `Nothing open with ${_pplFirst(p)}.`;
    s2.appendChild(e);
  } else if (!wait.length) list('', owe, '');
  else {
    list('I owe them', owe, 'Nothing you owe them right now.');
    list('Waiting on them', wait, '');
  }
  if (_pplShowDone && done.length) { room = Infinity; list('Done', done.sort((a, b) => (closedAt(b) || 0) - (closedAt(a) || 0)).slice(0, 20), ''); }
  el.appendChild(s2);

  // Notes
  const s3 = document.createElement('section'); s3.className = 'dp-section';
  const notes = (Array.isArray(p.notes) ? p.notes : []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  s3.innerHTML = '<div class="dp-title"><span class="ppl-sh">Notes</span></div>';
  const comp = document.createElement('div'); comp.className = 'ppl-note-compose';
  comp.hidden = notes.length > 0;
  const ta = document.createElement('textarea'); ta.className = 'control ppl-note-in'; ta.rows = 1; ta.placeholder = `Something to remember about ${_pplFirst(p)}…`; ta.dataset.fk = 'ppl-note';
  ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(200, ta.scrollHeight + 2) + 'px'; comp.classList.toggle('has-text', !!ta.value.trim()); };
  const save = document.createElement('button'); save.type = 'button'; save.className = 'btn btn-primary btn-sm'; save.textContent = 'Add note';
  const submit = () => { if (!ta.value.trim()) return; addPersonNote(p.id, ta.value); render(); };
  save.onclick = submit;
  ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } };
  comp.append(ta, save);
  s3.appendChild(comp);
  for (const n of notes) {
    const d = document.createElement('div'); d.className = 'note ppl-note';
    const when = document.createElement('span'); when.className = 'when';
    when.textContent = n.ts ? _pplFmt(new Date(n.ts), { day: 'numeric', month: 'short', year: daysUntil(fmtDate(new Date(n.ts))) < -300 ? 'numeric' : undefined }) + _pplNoteContext(p, n.ts) : '';
    const tx = document.createElement('div'); tx.className = 'ppl-note-text'; tx.textContent = n.text;
    const del = document.createElement('button'); del.type = 'button'; del.className = 'btn-icon btn-sm ppl-note-del'; del.innerHTML = icon('trash-2');
    del.setAttribute('aria-label', 'Delete note');
    del.onclick = () => { deletePersonNote(p.id, n.id); render(); toast('Note deleted', { icon: 'trash-2', action: { label: 'Undo', run: () => undo() } }); };
    d.append(del, when, tx);
    s3.appendChild(d);
  }
  el.appendChild(s3);

  // Recent email
  const s4 = document.createElement('section'); s4.className = 'dp-section';
  s4.innerHTML = '<div class="dp-title"><span class="ppl-sh">Recent email</span></div>';
  const box = document.createElement('div'); box.className = 'ppl-mail';
  s4.appendChild(box);
  el.appendChild(s4);
  _pplMailInto(box, p);

  // Files & links (63-resources.js), after the mockup's sections
  if (typeof resBlock === 'function') el.appendChild(resBlock({ type: 'person', id: p.id }, { panelTitle: true }));
  if (typeof autolinkPersonFiles === 'function') el.appendChild(autolinkPersonFiles(p));   // files linked to their tasks (66-autolink.js)
}
/** " · after 1:1" when the note was written within 3 hours after a meeting with this person ended (same day). */
function _pplNoteContext(p, ts) {
  if (!Number.isFinite(ts)) return '';
  let best = null;
  for (const ev of _pplEvents(p)) {
    if (!ev.start || !ev.start.dateTime) continue;
    const end = calEventEnd(ev).getTime();
    if (end > ts || ts - end > 3 * 3600 * 1000 || fmtDate(new Date(end)) !== fmtDate(new Date(ts))) continue;
    if (!best || end > calEventEnd(best).getTime()) best = ev;
  }
  if (!best) return '';
  // "1:1 with Hannah" -> "1:1": drop the person's own name from the title
  const first = _pplFirst(p);
  let t = String(best.summary || '').trim();
  if (first) t = t.replace(new RegExp('\\s*(?:with|w/|-|–|·|:)?\\s*' + first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b.*$', 'iu'), '').trim();
  return t ? ' · after ' + (t.length > 32 ? t.slice(0, 31) + '…' : t) : '';
}
const _PPL_PRIO = { p1: 1, p2: 2, p3: 3, p0: 4 };
function _pplByDue(a, b) {
  return String(effDate(a) || '9999').localeCompare(String(effDate(b) || '9999')) || (_PPL_PRIO[a.priority || 'p0'] || 4) - (_PPL_PRIO[b.priority || 'p0'] || 4);
}
function _pplMiniTask(i) {
  const r = document.createElement('button'); r.type = 'button'; r.className = 'mini-task';
  const st = statusOf(i.id);
  const pr = i.priority && i.priority !== 'p0' ? i.priority : 'p0';
  const d = effDate(i);
  r.innerHTML = `<span class="check ${escAttr(pr)}${st === 'doing' ? ' doing' : ''}${st === 'done' ? ' done' : ''}">${st === 'done' ? icon('check') : ''}</span>`
    + `<span class="lbl">${esc(effTitle(i))}</span>` + (d ? `<span class="due ${escAttr(st === 'done' ? '' : _pplDue(d).cls)}">${esc(_pplShortDue(d))}</span>` : '');
  r.dataset.id = i.id;
  r.onclick = () => openTask(i.id, { from: r });   // centre card or side panel (61-task-card.js)
  return r;
}
function _pplMailInto(box, p) {
  const emails = pplPersonEmails(p);
  const gmail = window.Connections && typeof Connections.has === 'function' ? Connections.has('gmail') : false;
  const cached = _pplMail[p.id];
  const msg = (ic, html) => { box.innerHTML = `<div class="ppl-mail-msg">${icon(ic)}<span>${html}</span></div>`; };
  if (!emails.length) { msg('mail', 'Add an email address to see recent mail with ' + esc(_pplFirst(p)) + '.'); return; }
  if (cached && cached.messages.length) {
    box.innerHTML = '';
    for (const m of cached.messages.slice(0, 5)) {
      const a = document.createElement(safeUrl(m.link) ? 'a' : 'div'); a.className = 'ppl-mail-row';
      if (safeUrl(m.link)) { a.href = safeUrl(m.link); a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      const dt = m.date ? new Date(m.date) : null;
      a.innerHTML = `<span class="s truncate">${esc(m.subject || '(no subject)')}</span><span class="d">${esc(dt && !isNaN(dt) ? dt.toLocaleDateString((APP_CONFIG && APP_CONFIG.locale) || undefined, { day: 'numeric', month: 'short' }) : '')}</span>`
        + (m.snippet ? `<span class="sn truncate">${esc(m.snippet)}</span>` : '');
      box.appendChild(a);
    }
    return;
  }
  const gst = window.Connections && typeof Connections.status === 'function' ? Connections.status('gmail') : null;
  // The connection states may arrive after the panel: repaint once when they do.
  if (cached && !gmail && !box.dataset.connWait && window.Connections && typeof Connections.onChange === 'function') {
    box.dataset.connWait = '1';
    let off = null, done = false;
    off = Connections.onChange(() => { if (done) return; done = true; if (typeof off === 'function') off(); if (box.isConnected) _pplMailInto(box, p); });
  }
  if (cached && !gmail && gst && (gst.state === 'auth' || gst.status === 'auth')) { msg('circle-alert', 'Gmail sign-in expired. <button type="button" class="link ppl-conn">Reconnect</button>'); }
  else if (cached && cached.err && !gmail) { msg('mail-x', 'Gmail is not connected. <button type="button" class="link ppl-conn">Connect</button>'); }
  else if (cached) { msg('inbox', gmail ? 'No recent email with ' + esc(_pplFirst(p)) + '.' : 'Nothing in the email snapshot. <button type="button" class="link ppl-conn">Connect Gmail</button>'); }
  else {
    msg('loader-circle', 'Looking for recent email…');
    // Only repaint once there is an answer in the cache: fetchPersonEmails
    // returns without caching when the server is not reachable, and calling
    // back into ourselves then would spin forever (the person view hung).
    fetchPersonEmails(p.id).then(() => {
      if (!box.isConnected) return;
      if (_pplMail[p.id]) _pplMailInto(box, p);
      else msg('mail', 'Recent email shows here once the OpenDash server is running.');
    }, () => {});
    return;
  }
  const c = box.querySelector('.ppl-conn');
  if (c) c.onclick = () => (window.Connections && Connections.open ? Connections.open('gmail') : setView('connections'));
}

/* ---------- add / edit person ---------- */
function openPersonEditor(id, prefill) {
  const p = id ? getPerson(id) : null;
  const v = Object.assign({ kind: 'person' }, p ? JSON.parse(JSON.stringify(p)) : {}, prefill || {});
  const F = {};
  const groups = [...new Set((state.people || []).map(x => x && x.group).filter(Boolean))].sort();
  openDialog({
    title: p ? `Edit ${p.name}` : 'Add person', width: 560,
    body: (el) => {
      el.classList.add('ppl-form');
      const field = (label, input, hint) => {
        const f = document.createElement('label'); f.className = 'field';
        const l = document.createElement('span'); l.className = 'field-label'; l.textContent = label;
        f.append(l, input);
        if (hint) { const h = document.createElement('span'); h.className = 'field-hint'; h.textContent = hint; f.appendChild(h); }
        return f;
      };
      const inp = (key, ph, val) => { const i = document.createElement('input'); i.className = 'control'; i.placeholder = ph || ''; i.value = val == null ? '' : val; F[key] = i; return i; };
      const name = inp('name', 'Full name', v.name); name.setAttribute('autofocus', '');
      el.appendChild(field('Name', name));
      const kind = document.createElement('div'); kind.className = 'seg seg-block'; kind.setAttribute('role', 'radiogroup');
      F.kind = { value: v.kind || 'person' };
      for (const [k, l] of [['person', 'Person'], ['org', 'Organisation'], ['mailbox', 'Shared mailbox']]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = l;
        b.setAttribute('aria-pressed', F.kind.value === k ? 'true' : 'false');
        b.onclick = () => { F.kind.value = k; kind.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); };
        kind.appendChild(b);
      }
      el.appendChild(field('Kind', kind));
      const two = document.createElement('div'); two.className = 'ppl-form-2';
      two.append(field('Role', inp('role', 'e.g. Co-author, client lead', v.role)), field('Organisation', inp('org', 'e.g. University of Northfield', v.org)));
      el.appendChild(two);
      const g = inp('group', 'e.g. Lab, Clients, Academic', v.group);
      const dl = document.createElement('datalist'); dl.id = 'ppl-groups-' + Date.now();
      for (const x of groups) { const o = document.createElement('option'); o.value = x; dl.appendChild(o); }
      g.setAttribute('list', dl.id);
      const gf = field('Group', g, 'Used for the filters on the People page.'); gf.appendChild(dl);
      el.appendChild(gf);
      el.appendChild(field('Email addresses', inp('emails', 'name@example.com, other@example.org', pplPersonEmails(v).join(', ')), 'Every address they use, separated by commas. Calendar invites and email from any of them match.'));
      el.appendChild(field('Aliases', inp('aliases', 'Nicknames, surname, initials', (v.aliases || []).join(', ')), 'Tasks that mention any of these names link to this person (3+ letters).'));
      const sw = document.createElement('div'); sw.className = 'ppl-stream-pick';
      F.streams = new Set(Array.isArray(v.streams) ? v.streams : []);
      for (const [k, s] of Object.entries(STREAMS).filter(([, s]) => !s.archived)) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (F.streams.has(k) ? ' chip-accent' : '');
        b.setAttribute('aria-pressed', F.streams.has(k) ? 'true' : 'false');
        b.innerHTML = `<span class="dot" style="--c:${escAttr(safeColor(s.color))}"></span><span>${esc(s.label)}</span>`;
        b.onclick = () => { if (F.streams.has(k)) F.streams.delete(k); else F.streams.add(k); b.classList.toggle('chip-accent'); b.setAttribute('aria-pressed', F.streams.has(k) ? 'true' : 'false'); };
        sw.appendChild(b);
      }
      el.appendChild(field('Streams', sw));
      const two2 = document.createElement('div'); two2.className = 'ppl-form-2';
      two2.append(field('Phone', inp('phone', '+44 …', v.phone)), field('LinkedIn', inp('linkedin', 'https://linkedin.com/in/…', v.linkedin)));
      el.appendChild(two2);
      const err = document.createElement('div'); err.className = 'field-error'; err.hidden = true; F._err = err;
      el.appendChild(err);
    },
    actions: [
      { label: 'Cancel' },
      { label: p ? 'Save' : 'Add person', primary: true, run: () => {
        const fields = {
          name: F.name.value, kind: F.kind.value, role: F.role.value, org: F.org.value, group: F.group.value,
          emails: F.emails.value, aliases: F.aliases.value, streams: [...F.streams], phone: F.phone.value, linkedin: F.linkedin.value,
        };
        const dup = !p && (state.people || []).find(x => pplFold(x.name) === pplFold(fields.name.trim()));
        if (dup && !F._dupOk) { F._dupOk = true; F._err.hidden = false; F._err.textContent = `${dup.name} is already in People. Click again to add another person with the same name.`; return false; }
        let res;
        if (p) { const e = updatePersonFields(p.id, fields); res = e ? { error: e } : { id: p.id }; }
        else res = createPerson(Object.assign({ id: v.id }, fields));
        if (res.error) { F._err.hidden = false; F._err.textContent = res.error; return false; }
        const nowSug = pplSuggest(state, { index: pplIndex(), details: false }).filter(x => x.personId === res.id);
        render();
        if (!p) setView('person:' + res.id);
        if (nowSug.length) {
          toast(`${nowSug.length} task${nowSug.length === 1 ? ' names' : 's name'} ${_pplFirst(getPerson(res.id))}`, { icon: 'link', action: { label: 'Link', run: () => { const n = linkSuggestedPeople(nowSug); render(); toast(`Linked ${n} task${n === 1 ? '' : 's'}`, { kind: 'ok' }); } } });
        } else toast(p ? 'Saved' : `Added ${fields.name.trim()}`, { kind: 'ok', icon: 'user-check' });
        return true;
      } },
    ],
  });
}

/* ---------- merge / delete ---------- */
function openPersonMerge(fromId) {
  const a = getPerson(fromId); if (!a) return;
  const others = _pplVisible().filter(p => p.id !== a.id).sort((x, y) => String(x.name).localeCompare(String(y.name)));
  let sel = null, info = null;
  openDialog({
    title: `Merge ${a.name} into…`, width: 480,
    body: (el) => {
      const p = document.createElement('p'); p.className = 'muted';
      p.textContent = `Use this for duplicates. ${a.name}'s task links, emails, aliases and notes move to the person you pick; ${a.name}'s name becomes an alias.`;
      sel = document.createElement('select'); sel.className = 'control';
      sel.innerHTML = '<option value="">Choose a person…</option>' + others.map(o => `<option value="${escAttr(o.id)}">${esc(o.name)}${o.org ? ' · ' + esc(o.org) : ''}</option>`).join('');
      info = document.createElement('div'); info.className = 'field-hint';
      const n = tasksForPerson(a.id).length;
      info.textContent = `${n} task${n === 1 ? '' : 's'} will be relinked.`;
      el.append(p, sel, info);
    },
    actions: [{ label: 'Cancel' }, { label: 'Merge', danger: true, run: () => {
      if (!sel.value) { sel.focus(); return false; }
      const into = getPerson(sel.value);
      const n = mergePeople(a.id, sel.value);
      setView('person:' + sel.value);
      toast(`Merged into ${into ? into.name : sel.value} (${n} task${n === 1 ? '' : 's'} relinked)`, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
      return true;
    } }],
  });
}
async function pplConfirmDelete(id) {
  const p = getPerson(id); if (!p || p.self) return;
  const n = tasksForPerson(id).length;
  const ok = await confirmDialog({ title: `Delete ${p.name}?`, text: `${n ? `They are unlinked from ${n} task${n === 1 ? '' : 's'} (the tasks stay). ` : ''}If you just don't work with them any more, "Mark as inactive" keeps their history.`, confirmLabel: 'Delete', danger: true });
  if (!ok) return;
  deletePersonById(id);
  setView('people');
  toast(`Deleted ${p.name}`, { icon: 'trash-2', action: { label: 'Undo', run: () => undo() } });
}

/* ---------- link suggestions + new names ---------- */
function openLinkSuggestions(tab) {
  let cur = tab === 'names' ? 'names' : 'links';
  let includeDetails = false;
  const chosen = { on: new Set(), seen: new Set() };   // the ticks (the select list's store): kept while the dialog repaints
  const chosenNames = { on: new Set(), seen: new Set() };
  let bodyEl = null, tabsEl = null;
  const data = () => {
    const idx = pplIndex();
    const sug = pplSuggest(state, { index: idx, details: includeDetails });
    const stop = [...Object.values(STREAMS).map(s => s.label), ...(state.people || []).flatMap(p => [p.org, p.group]), userName()].filter(Boolean);
    const names = pplUnknownNames(state, { index: idx, stop, ignore: state.peopleIgnoredNames || [] });
    const orphans = [...pplOrphans(state)];
    return { idx, sug, names, orphans };
  };
  const paint = () => {
    const d = data();
    tabsEl.innerHTML = '';
    for (const [k, l, n] of [['links', 'Tasks to link', d.sug.length], ['names', 'New names', d.names.length + d.orphans.length]]) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tab' + (cur === k ? ' on' : ''); b.setAttribute('aria-selected', cur === k ? 'true' : 'false');
      b.innerHTML = `<span>${esc(l)}</span><span class="badge badge-soft">${n}</span>`;
      b.onclick = () => { cur = k; paint(); };
      tabsEl.appendChild(b);
    }
    bodyEl.innerHTML = '';
    if (cur === 'links') {
      const opt = document.createElement('div'); opt.className = 'ppl-sug-opts';
      const tg = (label, on, run) => { const l = document.createElement('label'); l.className = 'switch-row'; l.innerHTML = `<span class="switch${on ? ' on' : ''}" role="switch" aria-checked="${on}"></span><span>${esc(label)}</span>`; l.onclick = (e) => { e.preventDefault(); run(); }; return l; };
      opt.append(
        tg('Also look in descriptions (weaker)', includeDetails, () => { includeDetails = !includeDetails; chosen.on.clear(); chosen.seen.clear(); paint(); }),
        tg('Link people when a task is created', state.peopleAutoLink !== false, () => { state.peopleAutoLink = state.peopleAutoLink === false; saveData(); paint(); }),
      );
      bodyEl.appendChild(opt);
      if (!d.sug.length) { mountEmptyState(bodyEl, { icon: 'link', title: 'Nothing to link', text: 'Every open task that names someone is linked to them.' }); return; }
      const key = (x) => x.taskId + '\u0001' + x.personId;
      const head = document.createElement('div'); head.className = 'ppl-sug-head';
      head.innerHTML = `<span class="subtle">Matched on whole names in the title or a subtask${includeDetails ? ' (or the description)' : ''}. Unticked ones are left alone.</span>`;
      bodyEl.appendChild(head);
      const list = document.createElement('div'); list.className = 'ppl-sug-list';
      const byPerson = new Map();
      for (const x of d.sug) { if (!byPerson.has(x.personId)) byPerson.set(x.personId, []); byPerson.get(x.personId).push(x); }
      for (const [pid, xs] of byPerson) {
        const p = getPerson(pid); if (!p) continue;
        const g = document.createElement('div'); g.className = 'ppl-sug-group';
        g.innerHTML = `<div class="ppl-sug-person">${avatarHtml(p, 24)}<span class="pp-name">${esc(p.name)}</span><span class="subtle">${xs.length}</span></div>`;
        for (const x of xs) {
          const t = getItem(x.taskId); if (!t) continue;
          const r = document.createElement('div'); r.className = 'ppl-sug-row';
          r.dataset.selId = key(x);
          r.setAttribute('aria-label', `${p.name}: ${effTitle(t)}`);
          r.innerHTML = `<span class="lbl truncate">${esc(effTitle(t))}</span><span class="badge ${x.strength === 'strong' ? 'badge-soft' : 'badge-warning'}">${esc(x.where)}</span>`;
          g.appendChild(r);
        }
        list.appendChild(g);
      }
      bodyEl.appendChild(list);
      // Tick which to link (strong matches start ticked): the shared select list (11-ui-select.js).
      const pick = (ids) => { const want = new Set(ids); return d.sug.filter(x => want.has(key(x))); };
      const linkThese = (ids) => {
        const n = linkSuggestedPeople(pick(ids));
        render(); paint();
        toast(`Linked ${n} task${n === 1 ? '' : 's'} to people`, { kind: 'ok', icon: 'link', action: { label: 'Undo', run: () => undo() } });
      };
      selectList(list, {
        store: chosen, label: 'Tasks to link', rowClick: true,
        defaultOn: (id) => { const x = d.sug.find(s => key(s) === id); return !!x && x.strength === 'strong'; },
        apply: { label: 'Link selected', icon: 'link', run: linkThese },
        applyAll: { label: 'Link all', run: linkThese },
        // Not this person on these tasks: remembered (task.peopleExcluded), so it is not suggested again.
        dismiss: { label: 'Don’t link', tip: 'Not them: never suggest it again for those tasks', run: (ids) => {
          const xs = pick(ids);
          for (const x of xs) { const t = getItem(x.taskId); if (!t) continue; const ex = Array.isArray(t.peopleExcluded) ? t.peopleExcluded : []; if (!ex.includes(x.personId)) t.peopleExcluded = [...ex, x.personId]; }
          saveData(); render(); paint();
          toast(`${xs.length} suggestion${xs.length === 1 ? '' : 's'} dismissed`, { action: { label: 'Undo', run: () => undo() } });
        } },
      });
    } else {
      if (!d.names.length && !d.orphans.length) { mountEmptyState(bodyEl, { icon: 'user-check', title: 'No new names', text: 'Every name in your open tasks belongs to someone in People.' }); return; }
      const hint = document.createElement('div'); hint.className = 'subtle ppl-sug-head';
      hint.textContent = 'Capitalised names in your open tasks that match nobody, and ids tasks point at with no profile. Add the people; ignore the rest (places, companies, books).';
      bodyEl.appendChild(hint);
      for (const [oid, r] of d.orphans) {
        const row = document.createElement('div'); row.className = 'ppl-name-row';
        row.innerHTML = `<span class="avatar avatar-24 unknown">${icon('link-2-off')}</span><span class="lbl"><b>${esc(oid)}</b> <span class="subtle">linked on ${r.total} task${r.total === 1 ? '' : 's'}, no profile</span></span>`;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.textContent = 'Create';
        b.onclick = () => openPersonEditor(null, { id: oid, name: oid.replace(/[-_]+/g, ' ').replace(/(^|\s)\p{Ll}/gu, m => m.toUpperCase()) });
        row.appendChild(b); bodyEl.appendChild(row);
      }
      const nameList = document.createElement('div'); nameList.className = 'ppl-name-list';
      for (const u of d.names) {
        const row = document.createElement('div'); row.className = 'ppl-name-row';
        row.dataset.selId = u.name;
        row.setAttribute('aria-label', u.name);
        row.innerHTML = `<span class="avatar avatar-24" style="--c:var(--sw-slate)">${esc(avatarInitials(u.name))}</span><span class="lbl"><b>${esc(u.name)}</b> <span class="subtle">in ${u.count} task${u.count === 1 ? '' : 's'}</span></span>`;
        const ign = document.createElement('button'); ign.type = 'button'; ign.className = 'btn btn-ghost btn-sm'; ign.textContent = 'Ignore';
        ign.onclick = () => { state.peopleIgnoredNames = [...new Set([...(state.peopleIgnoredNames || []), u.name])]; saveData(); paint(); renderMain(); };
        const add = document.createElement('button'); add.type = 'button'; add.className = 'btn btn-secondary btn-sm'; add.textContent = 'Add person';
        add.onclick = () => openPersonEditor(null, { name: u.name });
        row.append(ign, add); nameList.appendChild(row);
      }
      bodyEl.appendChild(nameList);
      // Several names: tick them, then add them all as people or ignore them all (one undo step each).
      if (d.names.length > 1) {
        const addThese = (names) => {
          let n = 0;
          selUndoGroup(() => { for (const nm of names) if (!createPerson({ name: nm }).error) n++; });
          render(); paint();
          toast(`Added ${n} ${n === 1 ? 'person' : 'people'}`, { kind: 'ok', icon: 'user-plus', action: { label: 'Undo', run: () => undo() } });
        };
        selectList(nameList, {
          store: chosenNames, label: 'New names', defaultOn: false, rowClick: true,
          apply: { label: 'Add as people', icon: 'user-plus', run: addThese },
          applyAll: { label: 'Add all', run: addThese },
          dismiss: { label: 'Ignore selected', tip: 'Not people (places, companies, books): never flag them again', run: (names) => {
            state.peopleIgnoredNames = [...new Set([...(state.peopleIgnoredNames || []), ...names])];
            saveData(); paint(); renderMain();
            toast(`Ignored ${names.length} name${names.length === 1 ? '' : 's'}`, { action: { label: 'Undo', run: () => undo() } });
          } },
        });
      }
    }
  };
  openDialog({
    title: 'People in your tasks', width: 640,
    body: (el) => {
      el.closest('.modal').classList.add('ppl-sug-modal');
      tabsEl = document.createElement('div'); tabsEl.className = 'tabs ppl-sug-tabs';
      bodyEl = document.createElement('div'); bodyEl.className = 'ppl-sug-body';
      el.append(tabsEl, bodyEl);
      setTimeout(paint, 0);
    },
    // Link selected / Link all / Don't link are in the select bar above the list.
    actions: [{ label: 'Close' }],
  });
}

/* ---------- sidebar: People (badge for new names; people as shortcuts) ---------- */
// Names in open tasks that match nobody (the People callout's rule), cached per save.
let _pplSbNewKey = null, _pplSbNewN = 0;
function _pplSidebarNewNames() {
  const key = [state._lastSave || 0, (state.custom || []).length, (state.people || []).length, (state.peopleIgnoredNames || []).length].join('|');
  if (key === _pplSbNewKey) return _pplSbNewN;
  _pplSbNewKey = key;
  try {
    const stop = [...Object.values(STREAMS).map(s => s.label), ...(state.people || []).flatMap(p => [p.org, p.group]), userName()].filter(Boolean);
    _pplSbNewN = pplUnknownNames(state, { index: pplIndex(), stop, ignore: state.peopleIgnoredNames || [] }).length + [...pplOrphans(state)].length;
  } catch (err) { _pplSbNewN = 0; }
  return _pplSbNewN;
}
registerSidebarBlock('tasks', {
  id: 'people', order: 40,
  render(el, ctx) {
    const people = _pplVisible();
    const sugN = (() => { try { return pplSuggest(state, { index: pplIndex(), details: false }).length; } catch (e) { return 0; } })();
    el.appendChild(sbSection({
      title: 'People', collapsible: 'people',
      actions: [
        { icon: 'link', label: sugN ? `${sugN} tasks name someone: review` : 'Review link suggestions', run: () => openLinkSuggestions('links') },
        { icon: 'user-plus', label: 'Add person', run: () => openPersonEditor(null) },
      ],
    }));
    czSectionHint(el, 'people');
    if (sbIsCollapsed('people')) return;
    // As in the mockup: a red 'N new' badge when names in tasks match nobody yet (else the head count).
    const newN = _pplSidebarNewNames();
    el.appendChild(sbNavItem({ label: 'All people', icon: 'users', view: 'people', active: state.view === 'people',
      badge: newN ? `${newN} new` : '', count: newN ? '' : (people.filter(p => !p.inactive).length || ''),
      title: newN ? `${newN} name${newN === 1 ? '' : 's'} in your tasks with no contact yet` : '' }));
    const scored = people.filter(p => !p.inactive || p.pinned).map(p => ({ p, n: openTaskCountFor(p.id) }));
    const pick = scored.filter(x => x.p.pinned).concat(scored.filter(x => !x.p.pinned && x.n > 0).sort((a, b) => b.n - a.n)).slice(0, ctx.group === 'home' ? 3 : 5);
    const cur = state.view.startsWith('person:') ? state.view.slice(7) : null;
    if (cur && !pick.some(x => x.p.id === cur)) { const p = getPerson(cur); if (p && !p.self) pick.push({ p, n: openTaskCountFor(p.id) }); }
    for (const { p, n } of pick) el.appendChild(czMark(sbNavItem({ label: p.name, avatarHtml: `<span class="ic">${avatarHtml(p, 16)}</span>`, view: 'person:' + p.id, title: `${n} open task${n === 1 ? '' : 's'}` }), 'person', p.id));
  },
});
