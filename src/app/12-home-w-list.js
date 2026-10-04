/* ============================================================
   HOME widget "list": Smart list (WIDGETS_CATALOGUE.md 3.11).
   Any task search as a list on Home ("#onboarding", "@sam", "stream:work
   due:week"). Can be on Home up to 6 times (multi: 6): copies 'list',
   'list~2'..., each with its own settings (ctx.instance; homePrefs(ctx) /
   homeSetPrefs).
   OWNER: the "list" widget builder (Phase 1, wave 1). The pure rules:
   12-home-list-logic.js. CSS: 13-home-w-list.css. Tests: tests/home-w-list.test.mjs.

   THE QUERY  parseTaskSearch's operators (#tag @person p1 is:doing due:week
              stream:x -word), open tasks unless it says is:done. Parsed ONCE per
              render into a fresh object (homeListParse) and that object is passed
              to matchesSearch, so copies never re-parse each other's queries.
   SIZES      S  the title, the count, the top 3 with ticks
              M  `limit` rows (tick, stream, people, due) + "+N more", the Add field,
                 what was ticked today (struck through, a tick reopens it)
              L  grouped by due (Overdue / Today / This week / Later / No date),
                 stream or person; a group folds (UI key homeUI.listFold[copy])
              Full  a board: To do / In progress / Done today. Drag a card to
                 another column (makeSortable) or Alt+Left/Right sets its status.
   ACTIONS    tick = homeCompleteTask (the row glides out; the toast has Undo)
              row: Enter / click opens the task (it stays the current row);
                 X done, T plan for today, ] plan for tomorrow (setPlanned, never
                 the deadline)
              Add: Enter or the small check adds it as typed, with the list's
                 defaults (homeQueryDefaults: #tag, @person, stream:, p1,
                 due:today|tomorrow); "Add…" (Alt+Enter) opens the task card
                 PREFILLED with the same, to adjust and Save (the user's rule,
                 3 Oct). A task that does not match the list: the toast says so
                 and offers Open.
   SETTING UP The list starts as a preset card. The user's rule (3 Oct): a preset's
              main click opens the list editor PREFILLED (adjust, then "Show this
              list"); its small check applies it as it is, with Undo. The same
              editor is the widget's settings (Customise, the header's sliders,
              "Edit" on an empty list): one homeSetPrefs = one undo step.
   MOTION     new rows rise once (ctx.enterNew), ticked rows glide out, board
              drops settle (FLIP on data-flip); nothing replays on saves or sync.
   ============================================================ */
const _hlsMore = new Set();          // copies whose "+N more" is open (until Home is left)
const _hlsDraft = new Map();         // copy id -> what is typed in its Add field (survives repaints)
const _hlsBusy = new Set();          // task ids being ticked: a second tick does nothing
let _hlsCreateFor = null;            // the copy whose "Add…" opened the task card

registerHomeWidget({
  id: 'list', title: 'Smart list', icon: 'list-filter', order: 200, group: 'tasks', multi: 6,
  description: 'Any search as a list on Home (#tag, @person, due:week…)',
  sizes: ['s', 'm', 'l', 'full'], defaultSize: 'm', defaultHidden: true, fresh: true,
  aliases: ['smart list', 'saved search', 'search list', 'filter', 'custom list'],
  defaults: { title: '', query: '', group: 'none', limit: 8, showDoneToday: true },
  available: () => true,
  render(el, ctx) { return _hlsRender(el, ctx || {}); },
  settings(anchor, ctx) { _hlsEditor(anchor, ctx); },
  sample(kit) { return _hlsSample(kit); },
  unmount() { _hlsMore.clear(); _hlsBusy.clear(); _hlsDraft.clear(); },
});

/* ---------- the model (one per copy, memoised) ---------- */
function _hlsTomorrow() { return typeof tomorrowStr === 'function' ? tomorrowStr() : _isoPlus(1); }
/** What the defaults and titles resolve against (only the parts the query uses). */
function _hlsKnown(parsed) {
  const p = parsed || {};
  const k = { today: todayStr(), tomorrow: _hlsTomorrow() };
  if ((p.tags || []).length) k.tags = [...new Set(getAllItems().flatMap(i => effTags(i)))];
  if ((p.people || []).length) k.people = (state.people || []).map(x => ({ id: x.id, name: x.name, aliases: x.aliases || [], self: !!x.self }));
  if (p.stream) k.streams = Object.entries(STREAMS).map(([id, s]) => ({ id, label: s.label || id, order: s.order }));
  return k;
}
function _hlsPersonName(q) {
  const id = _hlsPerson(String(q || '').toLowerCase(), (state.people || []).map(x => ({ id: x.id, name: x.name, aliases: x.aliases || [], self: !!x.self })));
  const p = id ? getPerson(id) : null;
  return p ? p.name || p.id : '';
}
function _hlsStreamLabel(q) {
  const id = _hlsStream(String(q || '').toLowerCase(), Object.entries(STREAMS).map(([sid, s]) => ({ id: sid, label: s.label || sid, order: s.order })));
  return id && STREAMS[id] ? STREAMS[id].label : '';
}
function _hlsTitle(prefs, parsed) {
  const t = String((prefs && prefs.title) || '').trim();
  return t || homeListAutoTitle(parsed, { personName: _hlsPersonName, streamLabel: _hlsStreamLabel });
}
function _hlsClosedToday(i, today) { const ts = closedAt(i); return !!ts && fmtDate(new Date(ts)) === today; }
/**
 * A copy's tasks: {parsed, open: [item] (due date order), done: [item] (ticked today, oldest
 * first; only when showDoneToday and the query lists open tasks)}. Memoised per copy on the
 * data version, today and its own settings, so copies never share an answer.
 */
function homeListModel(instanceId, prefs) {
  prefs = prefs || {};
  const q = String(prefs.query || '').trim();
  const showDone = prefs.showDoneToday !== false;
  return homeMemo('hls:' + instanceId, homeMemoSig({ extra: [q, showDone] }), () => {
    const parsed = homeListParse(q, parseTaskSearch);
    if (!q) return { parsed, open: [], done: [] };
    const all = getAllItems();
    const open = sortItems(all.filter(i => matchesSearch(i, parsed)), 'date');
    let done = [];
    if (showDone && parsed.implied) {
      const dq = homeListDoneQuery(parsed), today = todayStr();
      done = all.filter(i => statusOf(i.id) === 'done' && !isWontDo(i) && _hlsClosedToday(i, today) && matchesSearch(i, dq))
        .sort((a, b) => closedAt(a) - closedAt(b));
    }
    return { parsed, open, done };
  });
}
/** A row's view model (real tasks and the gallery's samples draw the same way). */
function _hlsVM(i) {
  const status = statusOf(i.id);
  const ppl = (typeof effPeople === 'function' ? effPeople(i) : []).map(getPerson).filter(p => p && !p.self);
  return { id: i.id, title: effTitle(i), prio: effPriority(i), dueDate: effDate(i), dueTime: i.dueTime || null, stream: effStream(i), people: ppl, status, done: status === 'done', at: status === 'done' ? closedAt(i) : 0 };
}

/* ---------- render ---------- */
function _hlsRender(el, ctx) {
  const size = ctx.size || 'm';
  const inst = ctx.instance || ctx.id || 'list';
  const card = document.createElement('section');
  card.className = `card home-card hls hls--${size}`;
  el.appendChild(card);
  if (ctx.preview) return _hlsPreview(card, ctx, size);
  const prefs = ctx.prefs || homePrefs(inst);
  const m = homeListModel(inst, prefs);
  const raw = m.parsed.raw;
  const title = raw ? _hlsTitle(prefs, m.parsed) : 'Smart list';
  card.appendChild(_hlsHead(ctx, title, raw ? m.open.length : null, size, raw));
  const body = document.createElement('div'); body.className = 'card-b hls-b';
  card.appendChild(body);
  if (!raw) { _hlsSetupCard(body, ctx); return true; }
  const view = { inst, size, title, raw, prefs, m };
  if (size === 'full') _hlsBoard(body, ctx, view);
  else {
    if (!m.open.length) _hlsEmpty(body, ctx, view);
    else if (size === 'l' && m.open.length > 1) _hlsGrouped(body, ctx, view);
    else _hlsFlat(body, ctx, view);
    if (size !== 's' && m.done.length && m.open.length) _hlsDoneList(body, view);
    if (size !== 's') _hlsAddRow(body, ctx, view);
  }
  _hlsWire(body, ctx, view);
  if (size !== 's') homeSuggestSlot(body, ctx, { query: raw });
  ctx.enterNew(body.querySelectorAll('.hls-row'), (r) => r.dataset.flip);
  return true;
}

function _hlsHead(ctx, title, n, size, raw) {
  const h = hglHead({ icon: 'list-filter', title, n: n == null ? '' : String(n),
    link: raw && size !== 's' ? { label: 'Open', title: 'Show this search in Tasks', run: () => _hlsOpenInTasks(raw) } : null });
  h.classList.add('hls-h');
  const h3 = h.querySelector('h3');
  if (h3 && n != null) h3.insertAdjacentHTML('beforeend', `<span class="sr-only">, ${esc(n === 1 ? '1 task' : n + ' tasks')}</span>`);
  const cnt = h.querySelector('.hgl-n'); if (cnt) cnt.setAttribute('aria-hidden', 'true');
  if (!ctx.preview && !ctx.editing) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon btn-sm hls-edit'; b.dataset.act = 'edit';
    b.innerHTML = icon('sliders-horizontal');
    b.setAttribute('aria-label', `Edit ${title}`); b.setAttribute('data-tip', 'Edit list'); b.setAttribute('aria-haspopup', 'dialog');
    b.onclick = (e) => { e.stopPropagation(); _hlsEditor(b, ctx); };
    h.appendChild(b);
  }
  return h;
}

/* ---------- rows ---------- */
function _hlsRowEl(vm, o) {
  o = o || {};
  const li = document.createElement('li');
  li.className = 'hls-row hgl-row' + (vm.done ? ' is-done' : '') + (vm.status === 'doing' ? ' is-doing' : '');
  li.dataset.id = vm.id; li.dataset.flip = 'hls:' + vm.id;
  li.setAttribute('data-row', vm.id); li.tabIndex = 0;
  const s = STREAMS[vm.stream];
  const sLabel = (s && s.label) || (vm.stream ? String(vm.stream).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '');
  let dueTxt = '';
  if (vm.done) {
    const t = vm.at ? Clock.parts(new Date(vm.at).getTime()) : null;   // the time on the page's clock (travel spec 2.7)
    dueTxt = t ? `<small class="hls-at" title="Done at this time">${esc(String(t.h).padStart(2, '0') + ':' + String(t.mi).padStart(2, '0'))}</small>` : '';
  } else dueTxt = _homeDueChip({ dueDate: vm.dueDate, dueTime: vm.dueTime });
  const label = [vm.title, vm.done ? 'done today' : (vm.dueDate ? 'due ' + dueLabel(vm.dueDate) : ''), vm.status === 'doing' ? 'in progress' : '', o.compact ? '' : sLabel].filter(Boolean).join(', ');
  li.setAttribute('aria-label', label);
  li.setAttribute('aria-keyshortcuts', 'Enter X T ]');
  if (hglIsCurrentTask(vm.id)) li.setAttribute('aria-current', 'true');
  const ck = `<button type="button" class="check ${escAttr(vm.prio || 'p0')}${vm.status === 'doing' ? ' doing' : ''}${vm.done ? ' done' : ''}" data-act="tick" role="checkbox" aria-checked="${vm.done ? 'true' : 'false'}" tabindex="-1" aria-label="${escAttr((vm.done ? 'Reopen: ' : 'Complete: ') + vm.title)}" data-tip="${vm.done ? 'Reopen' : 'Done'}" data-kbd="X">${vm.done ? icon('check') : ''}</button>`;
  const avs = !o.compact && vm.people && vm.people.length ? `<span class="hls-avs">${vm.people.slice(0, 3).map(p => homeAvatar(p, 20)).join('')}</span>` : '';
  const meta = o.compact ? '' : `<span class="hls-meta">${vm.stream && !o.noStream ? `<span class="hls-st">${streamMarkHtml(vm.stream)}<span>${esc(sLabel)}</span></span>` : ''}${vm.status === 'doing' && !o.board ? '<span class="hls-doing">In progress</span>' : ''}</span>`;
  li.innerHTML = `${ck}<span class="hls-main"><span class="hls-t">${esc(vm.title)}</span>${meta}</span><span class="hls-r">${avs}${dueTxt}</span>`;
  return li;
}
function _hlsList(vms, o) {
  const ul = document.createElement('ul'); ul.className = 'hls-list';
  for (const vm of vms) ul.appendChild(_hlsRowEl(vm, o));
  return ul;
}
/** Rows shown: the saved "Rows" setting when there is one (it used to be ignored at S and
 *  below 12 at L), else the size's own default (S 3, M 8, L 12). */
function _hlsCap(view) {
  const all = homeState().widgetPrefs;
  const saved = all && all[view.inst] && typeof all[view.inst] === 'object' ? all[view.inst].limit : undefined;
  if (Number(saved) > 0) return Math.max(1, Math.min(50, Math.round(Number(saved))));
  return view.size === 's' ? 3 : view.size === 'l' ? 12 : 8;
}
function _hlsFlat(body, ctx, view) {
  const all = view.m.open, cap = _hlsCap(view);
  const more = view.size !== 's' && _hlsMore.has(view.inst);
  const shown = more ? all.slice(0, 200) : all.slice(0, cap);
  body.appendChild(_hlsList(shown.map(_hlsVM), { compact: view.size === 's' }));
  _hlsMoreFoot(body, ctx, view, all.length, cap, more);
}
function _hlsMoreFoot(body, ctx, view, n, cap, more) {
  if (n <= cap) return;
  const foot = document.createElement('div'); foot.className = 'hls-foot';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm hls-more';
  if (view.size === 's') {
    b.innerHTML = `<span>+${n - cap} more</span>${icon('arrow-right')}`;
    b.title = 'Show this search in Tasks';
    b.onclick = () => _hlsOpenInTasks(view.raw);
  } else {
    b.innerHTML = `<span>${more ? 'Show less' : `+${n - cap} more`}</span>${icon(more ? 'chevron-up' : 'chevron-down')}`;
    b.setAttribute('aria-expanded', more ? 'true' : 'false');
    b.dataset.fk = 'hls-more:' + view.inst;
    b.onclick = () => { if (more) _hlsMore.delete(view.inst); else _hlsMore.add(view.inst); ctx.rerender(); };
  }
  foot.appendChild(b);
  body.appendChild(foot);
}

/* ---------- large: groups (due, stream or person) ---------- */
function _hlsGroupBy(prefs) { const g = prefs && prefs.group; return g === 'stream' || g === 'person' ? g : 'due'; }
function _hlsFolded(inst) {
  const f = state.homeUI && typeof state.homeUI === 'object' && state.homeUI.listFold && typeof state.homeUI.listFold === 'object' ? state.homeUI.listFold[inst] : null;
  return new Set(Array.isArray(f) ? f.filter(x => typeof x === 'string') : []);
}
function _hlsSetFolded(inst, key, on) {
  const ui = Object.assign({}, state.homeUI && typeof state.homeUI === 'object' ? state.homeUI : {});
  const all = Object.assign({}, ui.listFold && typeof ui.listFold === 'object' ? ui.listFold : {});
  const cur = new Set(Array.isArray(all[inst]) ? all[inst] : []);
  if (on) cur.add(key); else cur.delete(key);
  if (cur.size) all[inst] = [...cur].slice(-20); else delete all[inst];
  if (Object.keys(all).length) ui.listFold = all; else delete ui.listFold;
  state.homeUI = ui;
  saveUI();
}
function _hlsGrouped(body, ctx, view) {
  const by = _hlsGroupBy(view.prefs);
  const cap = _hlsCap(view), more = _hlsMore.has(view.inst);
  // Groups (and their counts) are of every open row; the first `cap` rows in display order show.
  const vms = view.m.open.slice(0, 200).map(_hlsVM);
  const byId = new Map(vms.map(v => [v.id, v]));
  const self = (state.people || []).filter(p => p && p.self).map(p => p.id);
  const groups = homeListGroups(vms.map(v => ({ id: v.id, due: v.dueDate, stream: v.stream, people: v.people.map(p => p.id) })), by, {
    today: todayStr(), selfIds: self,
    streamLabel: (id) => (STREAMS[id] && STREAMS[id].label) || id,
    streamOrder: (id) => (STREAMS[id] ? STREAMS[id].order : 999),
    personName: (id) => { const p = getPerson(id); return p ? p.name || id : id; },
  });
  const folded = _hlsFolded(view.inst);
  const wrap = document.createElement('div'); wrap.className = 'hls-groups';
  let room = more ? Infinity : cap;
  groups.forEach((g, gi) => {
    const ids = g.ids.slice(0, Math.max(0, room));
    room -= ids.length;
    const sec = document.createElement('section'); sec.className = 'hls-grp'; sec.dataset.g = g.key; sec.dataset.flip = 'hlsg:' + g.key;
    const fold = folded.has(g.key);
    const lid = `hls-${view.inst.replace(/[^a-z0-9-]/gi, '_')}-g${gi}`;
    const lead = by === 'stream' && g.key !== 's:' ? streamMarkHtml(g.key.slice(2))
      : by === 'person' && g.key !== 'p:' ? homeAvatar(getPerson(g.key.slice(2)), 18)
      : `<span class="hls-gdot hls-gdot--${escAttr(g.key.slice(2) || 'none')}" aria-hidden="true"></span>`;
    sec.innerHTML = `<h4 class="hls-gh"><button type="button" class="hls-gb" aria-expanded="${fold ? 'false' : 'true'}" aria-controls="${escAttr(lid)}" data-fk="${escAttr('hls-g:' + view.inst + ':' + g.key)}">${icon('chevron-down', 'i-hls-chev')}${lead}<span class="hls-gl">${esc(g.label)}</span><span class="hls-gn">${g.ids.length}</span></button></h4>`;
    const ul = _hlsList(ids.map(id => byId.get(id)), { noStream: by === 'stream' });
    ul.id = lid;
    if (ids.length < g.ids.length) {
      const li = document.createElement('li'); li.className = 'hls-gmore';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
      b.textContent = ids.length ? `and ${g.ids.length - ids.length} more` : `Show ${g.ids.length}`;
      b.setAttribute('aria-label', `Show all ${g.ids.length} in ${g.label}`);
      b.onclick = () => { _hlsMore.add(view.inst); ctx.rerender(); };
      li.appendChild(b); ul.appendChild(li);
    }
    if (fold) ul.hidden = true;
    sec.appendChild(ul);
    sec.querySelector('.hls-gb').onclick = () => _hlsToggleGroup(ctx, view.inst, g.key, lid, !fold);
    wrap.appendChild(sec);
  });
  body.appendChild(wrap);
  // Folded: each cut group already offers "and N more", so the foot only offers "Show less".
  if (more) _hlsMoreFoot(body, ctx, view, view.m.open.length, cap, more);
}
function _hlsToggleGroup(ctx, inst, key, lid, fold) {
  const ul = document.getElementById(lid);
  const go = () => {
    _hlsSetFolded(inst, key, fold);
    ctx.rerender();
    homeAnnounce(fold ? 'Group folded' : 'Group shown');
    if (!fold && window.Motion) { const n = document.getElementById(lid); if (n) Motion.expand(n); }
  };
  if (fold && ul && window.Motion) Motion.collapse(ul, go); else go();
}

/* ---------- ticked today ---------- */
function _hlsDoneList(body, view) {
  const done = view.m.done;
  const wrap = document.createElement('div'); wrap.className = 'hls-done';
  wrap.innerHTML = `<div class="hls-done-h">${icon('circle-check')}<span>Done today</span><span class="hls-gn">${done.length}</span></div>`;
  const shown = done.slice(-3);
  wrap.appendChild(_hlsList(shown.map(_hlsVM), { compact: true }));
  body.appendChild(wrap);
}

/* ---------- nothing open ---------- */
function _hlsEmpty(body, ctx, view) {
  const box = document.createElement('div'); box.className = 'hls-emp';
  const done = view.m.done;
  if (done.length) {
    // The "all caught up" moment: the only place this widget shows a scene.
    box.innerHTML = `${hglScene('celebration', { size: view.size === 's' ? 'sm' : 'md', once: true })}<h4>All clear</h4><p>${esc(done.length === 1 ? '1 done today.' : `${done.length} done today.`)} Nothing left in ${esc(view.title)}.</p>`;
    body.appendChild(box);
    if (view.size !== 's') _hlsDoneList(body, view);
    return;
  }
  box.innerHTML = `<span class="hls-emp-ic">${icon('search-x')}</span><h4>Nothing matches <code>${esc(view.raw)}</code></h4><p>${esc(view.m.parsed.implied ? 'No open task fits this search right now.' : 'No task fits this search right now.')}</p>`;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.dataset.act = 'edit';
  b.innerHTML = icon('pencil') + '<span>Edit</span>';
  b.setAttribute('aria-haspopup', 'dialog');
  b.onclick = () => _hlsEditor(b, ctx);
  box.appendChild(b);
  body.appendChild(box);
}

/* ---------- full: the board ---------- */
const _HLS_COLS = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done today']];
function _hlsBoard(body, ctx, view) {
  const cols = { todo: [], doing: [], done: [] };
  for (const i of view.m.open) cols[homeListColumn(statusOf(i.id))].push(i);
  for (const i of view.m.done) cols.done.push(i);
  const board = document.createElement('div'); board.className = 'hls-board';
  board.setAttribute('role', 'group'); board.setAttribute('aria-label', `${view.title} board`);
  const more = _hlsMore.has(view.inst);
  const cap = more ? 200 : Math.max(_hlsCap(view), 12);
  for (const [key, label] of _HLS_COLS) {
    const items = cols[key];
    const col = document.createElement('section'); col.className = 'hls-col'; col.dataset.col = key; col.dataset.hlsDrop = view.inst;
    col.dataset.flip = 'hlsc:' + key;
    const hid = `hls-${view.inst.replace(/[^a-z0-9-]/gi, '_')}-c-${key}`;
    col.setAttribute('aria-labelledby', hid);
    col.innerHTML = `<h4 class="hls-ch" id="${escAttr(hid)}"><span class="hls-cdot hls-cdot--${key}" aria-hidden="true"></span><span>${esc(label)}</span><span class="hls-gn">${items.length}</span></h4>`;
    const ul = _hlsList(items.slice(0, cap).map(_hlsVM), { board: true });
    ul.classList.add('hls-cards');
    if (!items.length) ul.insertAdjacentHTML('beforeend', `<li class="hls-cempty" aria-hidden="true">${esc(key === 'done' ? 'Nothing ticked yet today' : key === 'doing' ? 'Drag a card here to start it' : 'Nothing to do here')}</li>`);
    col.appendChild(ul);
    if (items.length > cap || (more && items.length > Math.max(_hlsCap(view), 12))) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm hls-more';
      b.innerHTML = `<span>${more ? 'Show less' : `+${items.length - cap} more`}</span>${icon(more ? 'chevron-up' : 'chevron-down')}`;
      b.setAttribute('aria-expanded', more ? 'true' : 'false');
      b.dataset.fk = 'hls-more:' + view.inst + ':' + key;
      b.onclick = () => { if (more) _hlsMore.delete(view.inst); else _hlsMore.add(view.inst); ctx.rerender(); };
      col.appendChild(b);
    }
    if (key === 'todo') _hlsAddRow(col, ctx, view);
    board.appendChild(col);
    if (!ctx.editing) ctx.sortable(ul, {
      items: '.hls-row[data-id]', reorder: false,
      dropTargets: `.hls-col[data-hls-drop="${CSS.escape(view.inst)}"]`,
      onDropTarget: (id, t) => _hlsSetColumn(id, t.dataset.col),
    });
  }
  body.appendChild(board);
  if (!view.m.open.length && !view.m.done.length) {
    const note = document.createElement('p'); note.className = 'hls-note';
    note.innerHTML = `Nothing matches <code>${esc(view.raw)}</code>. `;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.dataset.act = 'edit';
    b.innerHTML = icon('pencil') + '<span>Edit</span>'; b.setAttribute('aria-haspopup', 'dialog');
    b.onclick = () => _hlsEditor(b, ctx);
    note.appendChild(b);
    body.insertBefore(note, board);
  }
  // Alt+Left / Alt+Right moves the focused card to the next column.
  board.addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const row = e.target && e.target.closest ? e.target.closest('.hls-row[data-id]') : null;
    if (!row || row !== e.target) return;
    e.preventDefault();
    const order = _HLS_COLS.map(c => c[0]);
    const cur = row.closest('.hls-col') ? row.closest('.hls-col').dataset.col : 'todo';
    const to = order[order.indexOf(cur) + (e.key === 'ArrowRight' ? 1 : -1)];
    if (to) _hlsSetColumn(row.dataset.id, to);
  });
}
/** Drop on a column = its status (one save, one undo step). The column it is in already does nothing. */
function _hlsSetColumn(id, col) {
  const it = getItem(id); if (!it || !col) return;
  const cur = homeListColumn(statusOf(id));
  if (cur === col) return;
  const t = effTitle(it);
  _homeRememberNow();                                      // the card glides to its new column
  if (col === 'done') { toggleDone(id); homeAnnounce(`Done: ${t}`); return; }      // toggleDone toasts (Undo)
  if (col === 'doing') {
    setStatus(id, 'doing');
    toast('In progress', { kind: 'ok', icon: 'circle-dot', action: { label: 'Undo', run: () => undo() } });
    homeAnnounce(`In progress: ${t}`);
    return;
  }
  if (cur === 'done') toggleDone(id); else setStatus(id, 'todo');
  toast(cur === 'done' ? 'Reopened' : 'Back to To do', { kind: 'ok', icon: 'circle', action: { label: 'Undo', run: () => undo() } });
  homeAnnounce(`To do: ${t}`);
}

/* ---------- the row actions ---------- */
function _hlsTick(id, row) {
  const it = getItem(id);
  if (!it || _hlsBusy.has(id) || (row && row.classList.contains('is-completing'))) return;   // a second tick does nothing
  _hlsBusy.add(id); setTimeout(() => _hlsBusy.delete(id), 1500);
  const t = effTitle(it);
  if (statusOf(id) === 'done') {
    toggleDone(id);
    toast('Reopened', { kind: 'ok', icon: 'rotate-ccw', action: { label: 'Undo', run: () => undo() } });
    homeAnnounce(`Reopened: ${t}`);
    return;
  }
  const ck = row && row.querySelector('.check');
  if (ck) { ck.innerHTML = icon('check'); ck.setAttribute('aria-checked', 'true'); }
  homeAnnounce(`Done: ${t}`);
  homeCompleteTask(id, row && row.isConnected ? row : null);
}
function _hlsPlan(id, date) {
  const it = getItem(id); if (!it || !date) return;
  if (it.plannedFor === date) return;                      // already planned then: a no-op
  setPlanned(id, date);
  const when = date === todayStr() ? 'today' : 'tomorrow';
  toast(`Planned for ${when}`, { kind: 'ok', icon: when === 'today' ? 'sun' : 'sunrise', action: { label: 'Undo', run: () => undo() } });
  homeAnnounce(`Planned for ${when}: ${effTitle(it)}`);
}
function _hlsWire(body, ctx, view) {
  body.addEventListener('click', (e) => {
    const row = e.target.closest('.hls-row[data-id]');
    if (!row || !body.contains(row)) return;
    if (e.target.closest('[data-act="tick"]')) { e.stopPropagation(); _hlsTick(row.dataset.id, row); return; }
    if (e.target.closest('a[href], input, textarea, button')) return;
    if (window.getSelection && String(window.getSelection()).length) return;
    _hlsOpen(ctx, row.dataset.id, row);
  });
  homeRowKeys(body, {
    open: (id, row) => _hlsOpen(ctx, id, row),
    done: (id, row) => _hlsTick(id, row),
    today: (id) => _hlsPlan(id, todayStr()),
    tomorrow: (id) => _hlsPlan(id, _hlsTomorrow()),
  });
  for (const row of body.querySelectorAll('.hls-row[data-id]')) hglTrackCurrent(row, row.dataset.id);
}
/** Open a row's task: the centre card steps through THIS list (previous / next); already open = a no-op. */
function _hlsOpen(ctx, id, row) {
  if (hglIsCurrentTask(id)) return;
  const host = row && row.closest('.hls-b');
  const list = host ? [...new Set([...host.querySelectorAll('.hls-row[data-id]')].map(r => r.dataset.id))] : [id];
  if (typeof openTask !== 'function') { hglOpenTask(ctx, id, row, row); return; }
  for (const el of document.querySelectorAll('.hgl-row[aria-current="true"]')) el.removeAttribute('aria-current');
  if (row) row.setAttribute('aria-current', 'true');
  openTask(id, { from: row || null, context: 'home', list });
}
/** The list's search in Tasks (All tasks with the search box filled in). */
function _hlsOpenInTasks(q) {
  const s = document.getElementById('search-input'); if (s) s.value = q;
  searchQuery = String(q || '');
  if (state.view !== 'all') setView('all'); else renderMain();
}

/* ---------- Add ---------- */
function _hlsDefaults(parsed) { return homeQueryDefaults(parsed, _hlsKnown(parsed)); }
function _hlsAddHint(view, d) {
  let bits = [];
  if (d.tags) bits.push(...d.tags.map(t => '#' + t));
  if (d.people) bits.push(...d.people.map(id => { const p = getPerson(id); return '@' + ((p && p.name) || id).split(/\s+/)[0]; }));
  if (d.stream && STREAMS[d.stream]) bits.push(STREAMS[d.stream].label);
  if (d.dueDate) bits.push(dueLabel(d.dueDate).toLowerCase());
  const low = view.title.toLowerCase();
  bits = bits.filter(b => !low.includes(b.toLowerCase()));        // "#writing" is already in "Add to #writing"
  const tail = view.m.parsed.due === 'week' ? ' (give it a day: fri)' : '';
  return `Add to ${view.title}${bits.length ? ' · ' + bits.join(' ') : ''}${tail}`.slice(0, 90);
}
function _hlsAddRow(host, ctx, view) {
  const d = _hlsDefaults(view.m.parsed);
  const box = document.createElement('div'); box.className = 'hls-add';
  const text = _hlsDraft.get(view.inst) || '';
  box.innerHTML = `<div class="hls-add-r"><label class="hls-add-in">${icon('plus')}<input type="text" class="hls-add-input" maxlength="300" autocomplete="off" spellcheck="false" data-fk="${escAttr('hls-add:' + view.inst)}" placeholder="${escAttr(_hlsAddHint(view, d))}" aria-label="${escAttr('Add a task to ' + view.title)}" aria-keyshortcuts="Enter Alt+Enter"></label>`
    + `<button type="button" class="btn-icon btn-sm hls-add-ok" data-act="add-now" aria-label="Add it as typed" data-tip="Add as typed" data-kbd="Enter">${icon('check')}</button>`
    + `<button type="button" class="btn btn-ghost btn-sm hls-add-open" data-act="add-open" aria-label="${escAttr('Open a new task for ' + view.title + ', filled in')}" data-tip="Open it filled in, then Save" data-kbd="Alt+Enter">${icon('file-pen-line')}<span>Add…</span></button></div>`
    + '<div class="hls-add-chips" aria-live="polite"></div>';
  const inp = box.querySelector('input'), ok = box.querySelector('.hls-add-ok'), chips = box.querySelector('.hls-add-chips');
  const paint = () => {
    const v = inp.value.trim();
    ok.disabled = !v;
    box.classList.toggle('has-text', !!v);
    if (!v) { chips.innerHTML = ''; return; }
    const parsed = typeof parseQuickAdd === 'function' ? parseQuickAdd(v) : { tokens: [] };
    const extra = [];                                       // what the quick-add dialog's implied chips leave out
    if (d.priority && (!parsed.priority || parsed.priority === 'p0')) extra.push(icon('flag', 'i-xs') + `<span>${esc(d.priority.toUpperCase())}</span>`);
    if (d.status === 'doing') extra.push(icon('circle-dot', 'i-xs') + '<span>In progress</span>');
    if (d.plannedFor) extra.push(icon('sun', 'i-xs') + '<span>Planned today</span>');
    chips.innerHTML = qaChipsHtml(parsed, false) + (typeof _qadImplied === 'function' ? _qadImplied(parsed, d) : '')
      + extra.map(h => `<span class="chip qa-tok implied" title="From this list">${h}</span>`).join('');
  };
  inp.value = text;
  if (text) try { inp.setSelectionRange(text.length, text.length); } catch (e) { /* not focusable yet */ }
  paint();
  inp.addEventListener('input', () => { if (inp.value) _hlsDraft.set(view.inst, inp.value); else _hlsDraft.delete(view.inst); paint(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.altKey) { e.preventDefault(); _hlsAddOpen(view, inp.value, box.querySelector('.hls-add-open')); }
    else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); _hlsAddNow(view, inp.value); }
    else if (e.key === 'Escape' && inp.value) { e.stopPropagation(); inp.value = ''; _hlsDraft.delete(view.inst); paint(); }
  });
  ok.onclick = () => _hlsAddNow(view, inp.value);
  box.querySelector('.hls-add-open').onclick = (e) => _hlsAddOpen(view, inp.value, e.currentTarget);
  host.appendChild(box);
}
/** After a task was added: say where it went (in this list, or why not, with Open). */
function _hlsAfterAdd(view, id, quiet) {
  const it = getItem(id); if (!it) return;
  const inList = matchesSearch(it, homeListParse(view.raw, parseTaskSearch));
  if (inList) {
    if (!quiet) toast(`Added to ${view.title}`, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
    homeAnnounce(`Added to ${view.title}: ${effTitle(it)}`);
  } else {
    toast(`Added, but it isn't in ${view.title}: it doesn't match ${view.raw}`, { kind: 'ok', icon: 'info', action: { label: 'Open', run: () => homeOpenTask(id) } });
    homeAnnounce(`Added: ${effTitle(it)}. It does not match this list.`);
  }
}
/** Enter / the check: add it as typed, with the list's defaults (one save, one undo step). */
function _hlsAddNow(view, text) {
  const v = String(text || '').trim();
  if (!v) return;
  _hlsDraft.delete(view.inst);                             // the repaint after the save shows an empty field
  const id = addTaskFromText(v, _hlsDefaults(view.m.parsed));
  if (!id) { _hlsDraft.set(view.inst, v); return; }
  _hlsAfterAdd(view, id);
}
/** "Add…" / Alt+Enter: the task card in create mode, filled in; nothing is saved before Save. */
function _hlsAddOpen(view, text, from) {
  // Pressed again while its card is open: a no-op (the user's edits there stay).
  if (_hlsCreateFor === view.inst && typeof tcIsOpen === 'function' && tcIsOpen() && typeof tcCurrentTaskId === 'function' && !tcCurrentTaskId()) return;
  const d = _hlsDefaults(view.m.parsed);
  const pre = { title: String(text || '').trim() };
  if (d.tags) pre.tags = d.tags;
  if (d.people) pre.people = d.people;
  if (d.stream) pre.stream = d.stream;
  if (d.priority) pre.priority = d.priority;
  if (d.dueDate) pre.date = d.dueDate;
  pre.onCreated = (id) => { _hlsDraft.delete(view.inst); _hlsAfterAdd(view, id, true); };
  _hlsCreateFor = view.inst;
  if (typeof tcOpenCreate === 'function') tcOpenCreate(pre, { from: from || null });
  else if (typeof openNewTask === 'function') openNewTask(pre.title, { from: from || null });
}

/* ---------- setting up: presets (main = the editor, prefilled; the check = apply now) ---------- */
function _hlsSetupCard(body, ctx) {
  const box = document.createElement('div'); box.className = 'hls-setup';
  box.innerHTML = `<span class="hls-emp-ic">${icon('list-filter')}</span><h4>What should this list show?</h4><p>Pick a starting point; you can change it before it shows.</p>`;
  const grid = document.createElement('div'); grid.className = 'hls-presets'; grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Presets');
  for (const p of HOME_LIST_PRESETS) {
    const chip = document.createElement('span'); chip.className = 'hls-pre'; chip.dataset.pre = p.id;
    const main = document.createElement('button'); main.type = 'button'; main.className = 'hls-pre-b';
    main.innerHTML = icon(p.icon) + `<span>${esc(p.label)}</span>`;
    main.setAttribute('aria-haspopup', 'dialog');
    main.title = p.query ? `Open the list editor with ${p.query}` : 'Open the list editor';
    main.onclick = () => _hlsEditor(main, ctx, p.query ? { query: p.query } : { pick: p.pick });
    chip.appendChild(main);
    if (p.query) {
      const q = document.createElement('button'); q.type = 'button'; q.className = 'hls-pre-ok'; q.dataset.act = 'apply';
      q.innerHTML = icon('check');
      q.setAttribute('aria-label', `Show ${p.label} now`); q.setAttribute('data-tip', 'Use it as it is');
      q.onclick = (e) => {
        e.stopPropagation();
        if (q.dataset.done === '1') return;
        q.dataset.done = '1';
        homeSetPrefs(ctx.instance || ctx.id, { query: p.query, title: null }, `${p.label}: the list is set`);
        homeAnnounce(`The list shows ${p.label}`);
      };
      chip.appendChild(q);
    }
    grid.appendChild(chip);
  }
  box.appendChild(grid);
  body.appendChild(box);
}

/* ---------- the list editor (the widget's settings) ---------- */
function _hlsCountOf(q) {
  const parsed = homeListParse(q, parseTaskSearch);
  if (!parsed.raw) return { n: 0, top: [], parsed };
  const hits = sortItems(getAllItems().filter(i => matchesSearch(i, parsed)), 'date');
  return { n: hits.length, top: hits.slice(0, 3).map(effTitle), parsed };
}
function _hlsPickOptions(kind) {
  const open = getAllItems().filter(i => statusOf(i.id) !== 'done');
  if (kind === 'tag') {
    const n = new Map();
    for (const i of open) for (const t of effTags(i)) n.set(t, (n.get(t) || 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 16)
      .map(([t, c]) => ({ q: '#' + t, label: '#' + t, n: c, title: '#' + t }));
  }
  if (kind === 'person') {
    const n = new Map();
    for (const i of open) for (const pid of (typeof effPeople === 'function' ? effPeople(i) : [])) n.set(pid, (n.get(pid) || 0) + 1);
    return (state.people || []).filter(p => p && p.id && !p.self && !/\s/.test(p.id))
      .map(p => ({ p, c: n.get(p.id) || 0 })).filter(x => x.c > 0)
      .sort((a, b) => b.c - a.c || String(a.p.name).localeCompare(String(b.p.name))).slice(0, 16)
      .map(({ p, c }) => ({ q: '@' + String(p.id).toLowerCase(), label: p.name || p.id, n: c, title: p.name || p.id }));
  }
  if (kind === 'stream') {
    return Object.entries(STREAMS).filter(([id, s]) => !s.archived && !/\s/.test(id)).sort((a, b) => (a[1].order ?? 999) - (b[1].order ?? 999))
      .map(([id, s]) => ({ q: 'stream:' + id.toLowerCase(), label: s.label || id, n: open.filter(i => effStream(i) === id).length, title: s.label || id, stream: id }));
  }
  return [];
}
/**
 * The editor: what the list shows (with a live count), presets, title, grouping, rows and
 * "ticked today". seed: {query} (a preset: the editor opens filled in) or {pick: 'tag'|'person'|
 * 'stream'|'custom'}. Save = one homeSetPrefs (one undo step); nothing is saved before it.
 */
function _hlsEditor(anchor, ctx, seed) {
  if (!anchor || !ctx || ctx.preview) return;
  const inst = ctx.instance || ctx.id;
  const cur = homePrefs(inst);
  seed = seed || {};
  const d = {
    query: seed.query != null ? String(seed.query) : String(cur.query || ''),
    title: seed.query != null ? '' : String(cur.title || ''),
    group: _hlsGroupBy(cur), limit: _hlsCap({ inst, size: ctx.size }), showDoneToday: cur.showDoneToday !== false,
    pick: seed.pick && seed.pick !== 'custom' ? seed.pick : null,
  };
  openPopover(anchor, (el, close) => {
    el.classList.add('hg-set', 'hls-ed');
    el.innerHTML = `<div class="hg-set-h">${icon('list-filter')}<b>${esc(cur.query ? 'Edit list' : 'New list')}</b></div>
      <label class="hls-ed-f"><span>Show tasks matching</span><input type="text" class="input input-sm" data-k="query" maxlength="300" autocomplete="off" spellcheck="false" placeholder="#tag @person stream:x due:week p1" aria-describedby="hls-ed-hint"></label>
      <div class="hls-ed-pre" role="group" aria-label="Presets"></div>
      <div class="hls-ed-pick" hidden></div>
      <div class="hls-ed-prev" aria-live="polite"></div>
      <label class="hls-ed-f"><span>Title</span><input type="text" class="input input-sm" data-k="title" maxlength="80" autocomplete="off"></label>
      <div class="hls-ed-row" data-k="group"><span>Large: group by</span><span class="seg" role="radiogroup" aria-label="Group by"></span></div>
      <div class="hls-ed-row"><span>Rows</span><input type="number" class="input input-sm hls-ed-num" data-k="limit" min="1" max="50" step="1" aria-label="Rows"></div>
      <div class="hls-ed-row"><span>Show what was ticked today</span><button type="button" class="switch" role="switch" data-k="done" aria-label="Show what was ticked today"></button></div>
      <p class="hls-ed-hint" id="hls-ed-hint">Open tasks unless it says <code>is:done</code>. Also: <code>due:today</code> <code>due:none</code> <code>is:doing</code> <code>-word</code>.</p>
      <div class="hls-ed-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="cancel">Cancel</button><button type="button" class="btn btn-primary btn-sm" data-act="save">Show this list</button></div>`;
    const qi = el.querySelector('[data-k="query"]'), ti = el.querySelector('[data-k="title"]'), ni = el.querySelector('[data-k="limit"]');
    const sw = el.querySelector('[data-k="done"]'), seg = el.querySelector('[data-k="group"] .seg'), prev = el.querySelector('.hls-ed-prev');
    const pre = el.querySelector('.hls-ed-pre'), pick = el.querySelector('.hls-ed-pick'), save = el.querySelector('[data-act="save"]');
    qi.value = d.query; ti.value = d.title; ni.value = String(d.limit);
    let timer = 0;
    const paintPrev = () => {
      const r = _hlsCountOf(qi.value);
      ti.placeholder = r.parsed.raw ? homeListAutoTitle(r.parsed, { personName: _hlsPersonName, streamLabel: _hlsStreamLabel }) : 'A title (optional)';
      for (const b of pre.querySelectorAll('[data-q]')) { const on = b.dataset.q === qi.value.trim(); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
      if (!r.parsed.raw) { prev.innerHTML = `<span class="hls-ed-n">Type a search or pick a preset</span>`; save.disabled = !cur.query; save.textContent = cur.query ? 'Clear the list' : 'Show this list'; return; }
      save.disabled = false; save.textContent = 'Show this list';
      prev.innerHTML = `<span class="hls-ed-n"><b>${r.n}</b> ${r.n === 1 ? 'task matches' : 'tasks match'}${r.parsed.implied ? ' (open)' : ''}</span>`
        + (r.top.length ? `<ul>${r.top.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '');
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(paintPrev, 120); };
    const paintSeg = () => {
      seg.innerHTML = '';
      for (const [v, t] of [['due', 'Due'], ['stream', 'Stream'], ['person', 'Person']]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
        const on = d.group === v;
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false'); if (on) b.classList.add('on');
        b.onclick = () => { if (d.group === v) return; d.group = v; paintSeg(); seg.querySelector('.on').focus(); };
        seg.appendChild(b);
      }
    };
    const paintSwitch = () => { sw.classList.toggle('on', d.showDoneToday); sw.setAttribute('aria-checked', d.showDoneToday ? 'true' : 'false'); };
    const showPick = (kind) => {
      d.pick = kind;
      for (const b of pre.querySelectorAll('[data-pick]')) b.setAttribute('aria-expanded', b.dataset.pick === kind ? 'true' : 'false');
      if (!kind) { pick.hidden = true; pick.innerHTML = ''; return; }
      const opts = _hlsPickOptions(kind);
      pick.hidden = false;
      pick.innerHTML = opts.length ? '' : `<span class="hls-ed-n">${esc(kind === 'tag' ? 'No open task has a tag yet' : kind === 'person' ? 'No open task is linked to a person yet' : 'No streams yet')}</span>`;
      for (const o of opts) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip hls-ed-opt';
        b.innerHTML = (o.stream ? streamMarkHtml(o.stream) : '') + `<span>${esc(o.label)}</span><small>${o.n}</small>`;
        b.onclick = () => { qi.value = o.q; paintPrev(); showPick(null); qi.focus(); };
        pick.appendChild(b);
      }
    };
    for (const p of HOME_LIST_PRESETS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip hls-ed-chip';
      b.innerHTML = icon(p.icon, 'i-xs') + `<span>${esc(p.label)}</span>`;
      if (p.query) { b.dataset.q = p.query; b.onclick = () => { if (qi.value.trim() === p.query) return; qi.value = p.query; showPick(null); paintPrev(); }; }
      else if (p.pick === 'custom') b.onclick = () => { showPick(null); qi.focus(); qi.select(); };
      else { b.dataset.pick = p.pick; b.setAttribute('aria-expanded', 'false'); b.onclick = () => showPick(d.pick === p.pick ? null : p.pick); }
      pre.appendChild(b);
    }
    const doSave = () => {
      const q = qi.value.trim();
      if (!q && !cur.query) { qi.focus(); return; }
      const lim = Math.max(1, Math.min(50, Math.round(Number(ni.value) || d.limit)));
      const patch = {};
      const put = (k, v, dflt) => { const now = cur[k] === undefined ? dflt : cur[k]; if (JSON.stringify(v) !== JSON.stringify(now)) patch[k] = JSON.stringify(v) === JSON.stringify(dflt) ? null : v; };
      put('query', q, '');
      put('title', ti.value.trim(), '');
      if (!(d.group === 'due' && (cur.group === 'none' || cur.group === 'due'))) put('group', d.group, 'none');
      if (lim !== d.limit) patch.limit = lim;               // the rows shown now (size default or saved)
      put('showDoneToday', d.showDoneToday, true);
      close();
      if (!Object.keys(patch).length) return;               // nothing changed: nothing saved
      _homeRememberNow();
      homeSetPrefs(inst, patch, q ? 'List updated' : 'List cleared');
      homeAnnounce(q ? 'List updated' : 'List cleared');
    };
    qi.addEventListener('input', later);
    for (const i of [qi, ti, ni]) i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSave(); } });
    sw.onclick = () => { d.showDoneToday = !d.showDoneToday; paintSwitch(); };
    save.onclick = doSave;
    el.querySelector('[data-act="cancel"]').onclick = () => { close(); try { anchor.focus({ preventScroll: true }); } catch (e) { /* gone */ } };
    paintSeg(); paintSwitch(); paintPrev();
    if (d.pick) showPick(d.pick);
    setTimeout(() => { try { qi.focus({ preventScroll: true }); qi.setSelectionRange(qi.value.length, qi.value.length); } catch (e) { /* closed */ } }, 0);
  }, { width: 360, align: 'end', className: 'hg-set-pop hls-ed-pop', focus: false });
}

/* ---------- the gallery preview (sample data; nothing fetched, ticked or written) ---------- */
function _hlsSample(kit) {
  const people = new Map((kit.people || []).map(p => [p.id, p]));
  const rows = (kit.tasks || []).filter(t => ['today', 'week'].includes(homeListBucket(t.dueDate, kit.today))).map((t, i) => ({
    id: t.id, title: t.title, prio: t.priority || 'p0', dueDate: t.dueDate, dueTime: null, stream: t.stream,
    people: (t.people || []).map(id => people.get(id)).filter(Boolean), status: i === 2 ? 'doing' : 'todo', done: false, at: 0,
  }));
  const done = [{ id: 'sample-d1', title: 'Send the agenda', prio: 'p2', dueDate: kit.today, stream: 'work', people: [], status: 'done', done: true, at: Date.now() - 50 * 60000 }];
  return { title: 'Due this week', query: 'due:week', rows, done, today: kit.today };
}
function _hlsPreview(card, ctx, size) {
  const s = homeSample('list') || { title: 'Due this week', rows: [], done: [] };
  card.appendChild(_hlsHead(ctx, s.title, s.rows.length, size, ''));
  const body = document.createElement('div'); body.className = 'card-b hls-b';
  card.appendChild(body);
  if (size === 'full') {
    const board = document.createElement('div'); board.className = 'hls-board';
    for (const [key, label] of _HLS_COLS) {
      const items = key === 'done' ? s.done : s.rows.filter(r => (r.status === 'doing') === (key === 'doing'));
      const col = document.createElement('section'); col.className = 'hls-col'; col.dataset.col = key;
      col.innerHTML = `<h4 class="hls-ch"><span class="hls-cdot hls-cdot--${key}" aria-hidden="true"></span><span>${esc(label)}</span><span class="hls-gn">${items.length}</span></h4>`;
      const ul = _hlsList(items, { board: true }); ul.classList.add('hls-cards'); col.appendChild(ul);
      board.appendChild(col);
    }
    body.appendChild(board);
    return true;
  }
  if (size === 'l') {
    const groups = homeListGroups(s.rows.map(r => ({ id: r.id, due: r.dueDate })), 'due', { today: s.today });
    const byId = new Map(s.rows.map(r => [r.id, r]));
    const wrap = document.createElement('div'); wrap.className = 'hls-groups';
    for (const g of groups) {
      const sec = document.createElement('section'); sec.className = 'hls-grp';
      sec.innerHTML = `<h4 class="hls-gh"><span class="hls-gb">${icon('chevron-down', 'i-hls-chev')}<span class="hls-gdot hls-gdot--${escAttr(g.key.slice(2))}" aria-hidden="true"></span><span class="hls-gl">${esc(g.label)}</span><span class="hls-gn">${g.ids.length}</span></span></h4>`;
      sec.appendChild(_hlsList(g.ids.map(id => byId.get(id)), {}));
      wrap.appendChild(sec);
    }
    body.appendChild(wrap);
    return true;
  }
  body.appendChild(_hlsList(size === 's' ? s.rows.slice(0, 3) : s.rows, { compact: size === 's' }));
  if (size === 'm') {
    const add = document.createElement('div'); add.className = 'hls-add';
    add.innerHTML = `<div class="hls-add-r"><label class="hls-add-in">${icon('plus')}<input type="text" class="hls-add-input" tabindex="-1" placeholder="Add to Due this week (give it a day: fri)" aria-label="Add a task"></label></div>`;
    body.appendChild(add);
  }
  return true;
}
