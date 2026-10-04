/* ============================================================
   HOME widget "activity": What changed (WIDGETS_CATALOGUE.md 3.16).
   OWNER: the "activity" widget builder (Phase 1, wave 1).
   The trust widget: what assistants, MCP clients, auto-link and scripts changed
   through the actions layer, with Undo. The id, sizes, defaultSize,
   defaultHidden, group, multi and aliases are mirrored in lib/home-topbar.mjs
   HOME_WIDGETS and the settings keys in HOME_WIDGET_PREFS (tests compare them).
   Rules (pure, tested in a VM): 12-home-activity-logic.js. Styles: 13-home-w-activity.css.

   DATA   homeData('history', '/api/query?op=history.list&limit=100') (both ranges),
          max age 60 s, fetched again whenever state._lastSave changes (live sync, undo).
          Each entry: {token, at, source, client?, summary, ops, undoOf?, undone?,
          undoable, touched?, touchedCount?}.
   SIZES  S: "4 changes by assistants today", the newest one, Undo last.
          M: rows (source icon, summary, time, Undo); undone rows struck through, "Undone".
          L: M plus filter chips (All / Assistant / MCP / Auto-link / Scripts / You:
             the ones with changes) and rows that open to show what they touched.
   UNDO   POST /api/actions/undo {token, source: 'ui', client: 'home:activity'}
          (actionsUndo, which adopts the new version), after a dry run of the same
          call: when something was changed since (the server's 409), a dialog that
          keeps focus inside it asks "Undo anyway" (force). The toast
          offers Redo (= undo the undo). An undone row has no button, so a re-click
          does nothing; a row undone then redone is live again (its Undo sends the
          newest link of the chain, actvResolve).
   ROW    M: a row that changed exactly one task opens it (ctx.openTask; the row is
          current while its card is open). L: a row opens in place to show its ops.
          Keys on a row: Enter opens, X undoes, Up/Down move (homeRowKeys).
   PREFS  {mine: false (also list your own changes), range: 'today' | '7d'}.
   MOTION New entries enter once, keyed by token (ctx.enterNew). Nothing else moves.
   No gate. Server down: netErrorMessage with Retry.
   ============================================================ */
const _ACTV_CLIENT = 'home:activity';
const _ACTV_SPIN = 'spin';                  // a class for icon(), not an icon name (the sprite test reads literals)
const _actvLocal = Object.create(null);    // token -> {by, at}: undone in this tab before the list caught up
const _actvBusy = new Set();               // tokens whose undo (or redo) is running
const _actvUI = new Map();                 // instance id -> {filter, open: Set(token), all}
let _actvDay = '';                         // the day the widget last painted (a new day repaints)

registerHomeWidget({
  id: 'activity', title: 'What changed', icon: 'history', order: 250, group: 'system',
  description: 'What assistants and scripts changed, with Undo',
  sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, fresh: true,
  aliases: ['what changed', 'changes', 'history', 'undo', 'audit', 'recent changes'],
  defaults: { mine: false, range: 'today' },
  available: () => true,
  sample: (kit) => _actvSample(kit),
  render(el, ctx) { return _actvRender(el, ctx || {}); },
  settings(anchor, ctx) {
    return homeSettingsMenu(anchor, ctx, [
      { key: 'range', label: 'Show', type: 'choice', choices: [['today', 'Today'], ['7d', '7 days']] },
      { key: 'mine', label: 'Include my own changes', type: 'toggle', hint: 'What you changed in the dashboard (Undo, suggestions, menus)' },
    ], { foot: 'Undo puts back what was there before. Redo is in the toast.' });
  },
  unmount() { _actvUI.clear(); for (const k of Object.keys(_actvLocal)) delete _actvLocal[k]; },
});

/* One fetch for both ranges: the newest 100 batches (the most history.list gives). With 50
   (the catalogue's first idea) a busy day of your own clicks pushed the assistants' changes out. */
const _ACTV_LIMIT = 100;
function _actvKey() { return 'history'; }
function _actvUrl() { return `/api/query?op=history.list&limit=${_ACTV_LIMIT}`; }
function _actvUi(id) {
  let u = _actvUI.get(id);
  if (!u) { u = { filter: 'all', open: new Set(), all: false }; _actvUI.set(id, u); }
  return u;
}
/** What a row changed, for labels: an undo entry's summary without its "Undo: " (its button redoes). */
function _actvWhat(r) {
  const s = String((r && r.e && r.e.summary) || 'that change');
  return r && r.e && r.e.undoOf ? s.replace(/^Undo:\s*/, '') : s;
}
function _actvShort(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  const max = n || 80;
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

/* ---------- sample (the Add widget gallery) ---------- */
function _actvSample(kit) {
  const now = Date.now();
  const base = (kit && Array.isArray(kit.history) ? kit.history : []).map(h => Object.assign({ ops: 1 }, h, { touched: h.token === 'sample-h1' ? ['task:sample-1'] : [] }));
  return base.concat([
    { token: 'sample-h4', at: now - 4 * 3600000, source: 'script', client: 'nightly tidy', summary: 'Moved "Book a dentist appointment" to Friday', ops: 1, undoable: false, undone: { at: now - 3.5 * 3600000, by: 'sample-h5' }, touched: ['task:sample-4'] },
  ]);
}

/* ---------- render ---------- */
function _actvRender(el, ctx) {
  const size = ctx.size || 's';
  const prefs = ctx.prefs || homePrefs(ctx);
  const range = prefs.range === '7d' ? '7d' : 'today';
  const ui = _actvUi(ctx.id || 'activity');
  if (ctx.firstPaint) { ui.all = false; ui.open.clear(); }
  const today = todayStr();
  _actvDay = today;
  let v;
  if (ctx.preview) v = { status: 'ok', data: { history: homeSample('activity') || [] } };
  else v = homeData(_actvKey(), _actvUrl(), { ctx, maxAge: 60000, sig: state._lastSave });
  const list = v && v.data && Array.isArray(v.data.history) ? v.data.history : null;
  const m = list ? actvModel(list, { range, mine: !!prefs.mine, filter: size === 'l' ? ui.filter : 'all', today, limit: _ACTV_LIMIT, local: _actvLocal }) : null;

  const card = document.createElement('section');
  card.className = `card home-card actv actv--${size}`;
  const head = hglHead({ icon: 'history', title: 'What changed', n: m && size !== 's' && m.total ? String(m.total) : '' });
  if (size !== 's' && !ctx.preview && !ctx.editing && typeof homeSettingsButton === 'function') head.appendChild(homeSettingsButton(ctx, 'What changed settings'));
  card.appendChild(head);
  const body = document.createElement('div'); body.className = 'card-b actv-b';
  card.appendChild(body);
  el.appendChild(card);

  if (!m) {                                                  // nothing yet: loading, offline or failed
    if (v && (v.status === 'error' || v.offline)) body.appendChild(_actvFailed(v, ctx));
    else body.appendChild(_actvSkeleton(size));
    return true;
  }
  if (size === 's') _actvSmall(body, m, ctx, range);
  else _actvList(body, m, ctx, range, size, ui);
  if (v.error && !ctx.preview) {                             // a refresh failed: the last answer stands
    const f = document.createElement('div'); f.className = 'actv-stale';
    f.innerHTML = `${icon('circle-alert')}<span>Could not refresh</span>`;
    f.appendChild(_actvRetryBtn(ctx, 'btn btn-ghost btn-sm'));
    body.appendChild(f);
  }
  if (!ctx.preview) {
    homeTick(ctx, (now) => {
      if (todayStr() !== _actvDay) return 'rerender';
      for (const x of card.querySelectorAll('[data-actv-ago]')) x.textContent = actvAgo(Number(x.dataset.actvAgo), now.getTime());
      return undefined;
    });
  }
  return true;
}

/* S: the count, the newest change, Undo last. */
function _actvSmall(body, m, ctx, range) {
  const sum = document.createElement('div'); sum.className = 'actv-sum';
  const n = m.others;
  sum.innerHTML = n
    ? `<b class="actv-big num">${esc(String(n))}${m.capped ? '+' : ''}</b><span class="actv-sumt">${esc(actvCountText(n, range, m.capped).replace(/^\d+\+?\s/, ''))}</span>`
    : `<span class="actv-sumt is-none">${esc(actvCountText(0, range))}</span>`;
  body.appendChild(sum);
  if (m.you && ctx.prefs && ctx.prefs.mine) {
    const y = document.createElement('div'); y.className = 'actv-you';
    y.textContent = `and ${m.you} by you`;
    body.appendChild(y);
  }
  const r = m.last;
  if (r) {
    const box = document.createElement('div'); box.className = 'actv-last hgl-row' + (r.undone ? ' is-undone' : '');
    box.dataset.flip = 'act:' + r.token; box.dataset.id = r.token;
    const main = _actvMain(r, ctx, 's');
    box.appendChild(main);
    if (r.task) hglTrackCurrent(box, r.task, main);
    const acts = document.createElement('div'); acts.className = 'actv-acts';
    if (r.undone) acts.appendChild(_actvTag(r));
    else if (r.target) acts.appendChild(_actvUndoBtn(r, ctx, 'Undo last'));
    box.appendChild(acts);
    body.appendChild(box);
    if (ctx.enterNew) ctx.enterNew([box]);
  } else {
    const a = m.lastAny;
    const p = document.createElement('p'); p.className = 'actv-quiet';
    p.innerHTML = a
      ? `The last one was <span data-actv-ago="${a.at}">${esc(actvAgo(a.at, Date.now()))}</span>: ${esc(_actvShort(a.e.summary, 70))}`
      : 'When an assistant, an MCP client, auto-link or a script changes something, it shows here with Undo.';
    body.appendChild(p);
  }
}

/* M and L: rows (L: chips, rows that open). */
function _actvList(body, m, ctx, range, size, ui) {
  if (size === 'l' && (m.chips.length > 2 || m.filter !== 'all')) {
    const bar = document.createElement('div'); bar.className = 'actv-chips';
    bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Show changes by');
    for (const c of m.chips) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'actv-chip';
      b.setAttribute('aria-pressed', c.on ? 'true' : 'false');
      if (c.k !== 'all') b.innerHTML = `<span class="actv-dot k-${escAttr(c.k)}" aria-hidden="true"></span>`;
      b.insertAdjacentHTML('beforeend', `<span>${esc(c.label)}</span><span class="n">${esc(String(c.n))}</span>`);
      b.onclick = () => {
        if (c.on) return;                                    // the current filter: a re-click does nothing
        ui.filter = c.k; ui.all = false;
        if (ctx.rerender) ctx.rerender();
      };
      bar.appendChild(b);
    }
    body.appendChild(bar);
  }
  if (!m.rows.length) {
    const who = m.filter !== 'all' ? ({ assistant: 'the assistant', mcp: 'MCP clients', autolink: 'auto-link', script: 'scripts', you: 'you' })[m.filter] : null;
    const when = range === '7d' ? 'in the last 7 days' : 'today';
    const a = m.filter === 'all' ? m.lastAny : null;
    body.appendChild(hglEmpty({
      scene: size === 'l' ? 'review' : '', icon: 'shield-check',
      title: who ? `No changes by ${who} ${when}` : (ctx.prefs && ctx.prefs.mine ? `No changes ${when}` : actvCountText(0, range)),
      text: a ? `The last one was ${actvAgo(a.at, Date.now())}: ${_actvShort(a.e.summary, 70)}` : 'When an assistant, an MCP client, auto-link or a script changes something, it shows here with Undo.',
    }));
    return;
  }
  const cap = size === 'l' ? 10 : 6;
  const shown = ui.all ? m.rows : m.rows.slice(0, cap);
  const listEl = document.createElement('ul'); listEl.className = 'actv-list';
  for (const r of shown) listEl.appendChild(_actvRow(r, ctx, size, ui));
  body.appendChild(listEl);
  homeRowKeys(listEl, {
    open: (tok, row) => { if (row.tagName === 'BUTTON') row.click(); },
    done: (tok, row) => { const b = row.parentElement && row.parentElement.querySelector(':scope > .actv-undo'); if (b && !b.disabled) b.click(); },
  });
  const foot = document.createElement('div'); foot.className = 'hgl-foot actv-foot';
  foot.innerHTML = `${icon('info')}<span>Undo puts back what was there before</span>`;
  if (m.rows.length > cap) {
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost btn-sm actv-more';
    more.innerHTML = `<span>${ui.all ? 'Show less' : `+${m.rows.length - cap} more`}</span>${icon(ui.all ? 'chevron-up' : 'chevron-down')}`;
    more.setAttribute('aria-expanded', ui.all ? 'true' : 'false');
    more.onclick = () => { ui.all = !ui.all; if (ctx.rerender) ctx.rerender(); };
    foot.appendChild(more);
  }
  body.appendChild(foot);
  if (ctx.enterNew) ctx.enterNew(listEl.children);
  if (typeof homeSuggestSlot === 'function') homeSuggestSlot(body, ctx, null);
}

function _actvRow(r, ctx, size, ui) {
  const li = document.createElement('li');
  li.className = 'actv-row hgl-row' + (r.undone ? ' is-undone' : '');
  li.dataset.flip = 'act:' + r.token; li.dataset.id = r.token;
  const open = size === 'l' && ui.open.has(r.token);
  const main = _actvMain(r, ctx, size, ui, open);
  li.appendChild(main);
  if (r.undone) li.appendChild(_actvTag(r));
  else if (r.target) li.appendChild(_actvUndoBtn(r, ctx, r.e.undoOf ? 'Redo' : 'Undo'));
  if (open) li.appendChild(_actvDetails(r, ctx));
  if (open) li.classList.add('is-open');
  if (size !== 'l' && r.task) hglTrackCurrent(li, r.task, main);
  return li;
}

/* The row's own part: icon, summary, who and when. A button when clicking does something. */
function _actvMain(r, ctx, size, ui, open) {
  const label = `${r.label}: ${r.e.summary || 'a change'}${r.undone ? ' (undone)' : ''}`;
  const opensTask = size !== 'l' && r.task && !ctx.preview && typeof getItem === 'function' && getItem(r.task);
  const toggles = size === 'l' && !ctx.preview;
  const main = document.createElement(opensTask || toggles ? 'button' : 'div');
  if (main.tagName === 'BUTTON') main.type = 'button';
  main.className = 'actv-main';
  main.setAttribute('data-row', r.token);
  main.tabIndex = 0;
  main.setAttribute('aria-label', label);
  const when = size === 's'
    ? `<span data-actv-ago="${r.at}">${esc(actvAgo(r.at, Date.now()))}</span>`
    : `<time datetime="${escAttr(new Date(r.at).toISOString())}">${esc(actvWhen(r.at, todayStr(), APP_CONFIG.locale))}</time>`;
  const state = r.redone ? ' · <span class="actv-st">Redone</span>' : '';     // undone: the tag beside it says so
  main.innerHTML = `<span class="actv-ic k-${escAttr(r.kind)}" aria-hidden="true">${icon(r.icon || 'history')}</span>`
    + `<span class="actv-body"><span class="actv-t">${esc(r.e.summary || 'A change')}</span>`
    + `<span class="actv-s"><span class="actv-who">${esc(r.label)}</span> · ${when}${state}</span></span>`
    + (toggles ? `<span class="actv-chev" aria-hidden="true">${icon('chevron-down')}</span>` : '');
  if (opensTask) {
    main.title = 'Open the task';
    main.onclick = () => hglOpenTask(ctx, r.task, main.closest('.hgl-row'), main);
  } else if (toggles) {
    const detId = `actv-det-${r.token.replace(/[^A-Za-z0-9_-]/g, '')}`;
    main.setAttribute('aria-expanded', open ? 'true' : 'false');
    main.setAttribute('aria-controls', detId);
    main.onclick = () => {
      if (ui.open.has(r.token)) ui.open.delete(r.token); else ui.open.add(r.token);
      if (ctx.rerender) ctx.rerender();
    };
  }
  return main;
}

function _actvTag(r) {
  const t = document.createElement('span'); t.className = 'actv-tag';
  const at = r.e.undone && r.e.undone.at ? actvTime(r.e.undone.at) : NaN;
  t.innerHTML = `${icon('undo-2')}<span>Undone</span>`;
  if (Number.isFinite(at)) t.title = `Undone ${actvWhen(at, todayStr(), APP_CONFIG.locale)}`;
  return t;
}

function _actvUndoBtn(r, ctx, text) {
  const b = document.createElement('button'); b.type = 'button';
  b.className = (text === 'Undo last' ? 'btn btn-secondary btn-sm' : 'hgl-mini') + ' actv-undo';
  const verb = text === 'Redo' ? 'Redo' : 'Undo';
  b.setAttribute('aria-label', `${verb}: ${_actvShort(_actvWhat(r), 120)}`);
  if (_actvBusy.has(r.target)) {
    b.disabled = true; b.setAttribute('aria-busy', 'true'); b.classList.add('is-busy');
    b.innerHTML = `${icon('loader-circle', _ACTV_SPIN)}<span>${verb === 'Redo' ? 'Redoing' : 'Undoing'}…</span>`;
  } else b.innerHTML = `${icon(verb === 'Redo' ? 'redo-2' : 'undo-2')}<span>${esc(text)}</span>`;
  if (ctx.preview) { b.tabIndex = -1; return b; }
  b.onclick = (e) => { e.stopPropagation(); _actvUndo(r, b, ctx); };
  return b;
}

/* L: what a change touched, who made it and when. */
function _actvDetails(r, ctx) {
  const e = r.e;
  const d = document.createElement('div'); d.className = 'actv-det';
  d.id = `actv-det-${r.token.replace(/[^A-Za-z0-9_-]/g, '')}`;
  const at = new Date(r.at);
  let whenFull = '';
  try { whenFull = at.toLocaleString(APP_CONFIG.locale || undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', ...(typeof clockH12Opt === 'function' ? clockH12Opt() : {}), second: '2-digit' }); } catch (x) { whenFull = at.toISOString(); }
  const ops = Number(e.ops) || 0;
  const n = Number(e.touchedCount) || (Array.isArray(e.touched) ? e.touched.length : 0);
  const client = e.client ? ` (${_actvShort(e.client, 40)})` : '';
  const lines = [
    `<p class="actv-dl"><b>${esc(r.label)}</b>${esc(client)} · ${esc(whenFull)}</p>`,
    `<p class="actv-dl">${ops ? `${ops} ${ops === 1 ? 'change' : 'changes'} in one go` : 'One change'}${n ? ` · touched ${n} ${n === 1 ? 'item' : 'items'}` : ''}</p>`,
  ];
  if (e.summary && e.summary.length > 60) lines.push(`<p class="actv-dl actv-sumfull">${esc(e.summary)}</p>`);
  d.innerHTML = lines.join('');
  const keys = Array.isArray(e.touched) ? e.touched.slice(0, 8) : [];
  if (keys.length) {
    const ul = document.createElement('ul'); ul.className = 'actv-ents';
    const look = {
      task: (id) => { const t = typeof getItem === 'function' ? getItem(id) : null; return t ? (typeof effTitle === 'function' ? effTitle(t) : t.title) : null; },
      person: (id) => { const p = typeof getPerson === 'function' ? getPerson(id) : null; return p ? p.name : null; },
      resource: (id) => { const x = typeof resGet === 'function' ? resGet(id) : null; return x ? (x.label || x.title || x.target) : null; },
    };
    for (const k of keys) {
      const en = actvEntity(k, look);
      const li = document.createElement('li');
      if (en.task || en.person) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'actv-ent';
        b.innerHTML = `${icon(en.icon)}<span>${esc(en.label)}</span>`;
        if (en.task) {
          if (hglIsCurrentTask(en.task)) b.setAttribute('aria-current', 'true');
          b.onclick = () => { if (hglIsCurrentTask(en.task)) return; b.setAttribute('aria-current', 'true'); ctx.openTask(en.task, b); };
        } else b.onclick = () => hglOpenPerson(en.person);
        li.appendChild(b);
      } else li.innerHTML = `<span class="actv-ent is-plain">${icon(en.icon)}<span>${esc(en.label)}</span></span>`;
      ul.appendChild(li);
    }
    if (n > keys.length) { const li = document.createElement('li'); li.className = 'actv-more-ents'; li.textContent = `and ${n - keys.length} more`; ul.appendChild(li); }
    d.appendChild(ul);
  }
  const notes = [];
  if (r.undone && e.undone && e.undone.at) notes.push(`Undone ${actvWhen(actvTime(e.undone.at), todayStr(), APP_CONFIG.locale)}.`);
  else if (r.redone) notes.push('Undone, then redone.');
  else if (!r.target && !r.undone) notes.push('Too old to undo from here.');
  if (e.undoOf) notes.push('This undid an earlier change.');
  if (notes.length) { const p = document.createElement('p'); p.className = 'actv-dl actv-note'; p.textContent = notes.join(' '); d.appendChild(p); }
  return d;
}

/* ---------- loading, failure ---------- */
function _actvSkeleton(size) {
  const s = document.createElement('div'); s.className = 'actv-skel'; s.setAttribute('aria-busy', 'true');
  s.setAttribute('aria-label', 'Loading recent changes');
  const n = size === 's' ? 2 : 4;
  s.innerHTML = Array.from({ length: n }, (_, i) => `<span class="actv-sk${i === 0 && size === 's' ? ' big' : ''}"></span>`).join('');
  return s;
}
function _actvFailed(v, ctx) {
  const box = document.createElement('div'); box.className = 'actv-fail';
  const msg = v.offline && typeof NET_DOWN_MESSAGE === 'string' ? NET_DOWN_MESSAGE : (v.error || 'Could not load the recent changes.');
  box.innerHTML = `${icon('circle-alert')}<p role="status">${esc(msg)}</p>`;
  if (!ctx.preview) box.appendChild(_actvRetryBtn(ctx, 'btn btn-secondary btn-sm'));
  return box;
}
function _actvRetryBtn(ctx, cls) {
  const b = document.createElement('button'); b.type = 'button'; b.className = cls + ' actv-retry';
  b.innerHTML = `${icon('refresh-cw')}<span>Retry</span>`;
  b.onclick = async () => {
    if (b.getAttribute('aria-busy') === 'true') return;
    b.setAttribute('aria-busy', 'true'); b.disabled = true;
    try { if (typeof _serverAvailable !== 'undefined' && !_serverAvailable && typeof detectStateServer === 'function') await detectStateServer(); } catch (e) { /* stays down */ }
    homeData(_actvKey(), _actvUrl(), { ctx, maxAge: 60000, sig: state._lastSave });
    homeDataRefresh(_actvKey());
    setTimeout(() => { if (b.isConnected) { b.removeAttribute('aria-busy'); b.disabled = false; } }, 1500);
  };
  return b;
}

/* ---------- undo / redo ---------- */
function _actvRepaint() {
  homeDataRefresh(_actvKey());
  if (typeof state === 'undefined' || state.view !== 'home' || typeof document === 'undefined') return;
  for (const id of homeInstancesShown('activity')) {
    if (document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(id)}"]`)) homeRerenderWidget(id);
  }
}
function _actvUndo(r, btn, ctx) {
  const tok = r.target;
  if (!tok || _actvBusy.has(tok) || _actvLocal[tok]) return Promise.resolve(false);
  return homeAction(btn, () => _actvRevert(tok, r, false), { wid: ctx.id, done: r.e.undoOf ? 'Redone' : 'Undone' });
}
/**
 * Undo one token (redo = undo the undo). A 409 asks first, then forces. Returns the
 * server's answer, or false (cancelled, or refused for good: the list is refreshed).
 * Other errors throw (homeAction offers Try again).
 */
async function _actvRevert(tok, r, redo) {
  if (_actvBusy.has(tok) || _actvLocal[tok]) return false;
  _actvBusy.add(tok);
  let u = null;
  const refused = (err) => {
    if (!(err && /^(ALREADY_UNDONE|NOT_UNDOABLE|NOT_FOUND)$/.test(String(err.code || '')))) return false;
    toast(netErrorMessage(err, redo ? 'Could not redo that' : 'Could not undo that'), { kind: 'err' });
    return true;
  };
  try {
    // A dry run first: conflicts come back as data (no 409 in the console), and the
    // user decides before anything is written. A change in between still gets a 409.
    let force = false;
    let dry = null;
    try { dry = await _actionsPost('/api/actions/undo', { token: tok, dryRun: true, source: 'ui', client: _ACTV_CLIENT }); }
    catch (err) { if (refused(err)) return false; throw err; }
    if (dry && Array.isArray(dry.conflicts) && dry.conflicts.length) {
      if (!(await _actvConflict(r, dry.conflicts, redo))) return false;
      force = true;
    }
    try { u = await actionsUndo(tok, Object.assign({ client: _ACTV_CLIENT }, force ? { force: true } : {})); }
    catch (err) {
      if (err && err.code === 'CONFLICT' && !force) {
        if (!(await _actvConflict(r, (err.data && err.data.conflicts) || [], redo))) return false;
        u = await actionsUndo(tok, { client: _ACTV_CLIENT, force: true });
      } else if (refused(err)) return false;
      else throw err;
    }
  } finally {
    _actvBusy.delete(tok);
    setTimeout(_actvRepaint, 0);
  }
  _actvLocal[tok] = { by: (u && typeof u.undo === 'string' && u.undo) || null, at: Date.now() };
  const what = _actvShort(_actvWhat(r), 70);
  const msg = redo !== !!r.e.undoOf ? `Redone: ${what}` : `Undone: ${what}`;     // an undo entry's own button redoes
  toast(msg, { kind: 'ok', action: u && u.undo && !redo ? { label: r.e.undoOf ? 'Undo' : 'Redo', run: () => _actvRevert(u.undo, r, true) } : undefined });
  if (typeof homeAnnounce === 'function') homeAnnounce(msg);
  return u || true;
}

/* 409: something in the change was edited since. A dialog that keeps focus inside it. */
function _actvConflict(r, conflicts, redo) {
  const all = Array.isArray(conflicts) ? conflicts : [];
  const list = all.slice(0, 6);
  const more = all.length - list.length;
  return new Promise((resolve) => {
    let answered = false;
    openDialog({
      title: redo ? 'Redo anyway?' : 'Undo anyway?', width: 460, resizable: false,
      body: (el) => {
        const q = document.createElement('p'); q.className = 'actv-conf-what';
        q.textContent = _actvShort(_actvWhat(r), 140);
        el.appendChild(q);
        const p = document.createElement('p'); p.className = 'muted';
        p.textContent = `${all.length === 1 ? 'This was' : 'These were'} edited again after that change:`;
        el.appendChild(p);
        if (list.length) {
          const ul = document.createElement('ul'); ul.className = 'actv-conf';
          for (const c of list) { const li = document.createElement('li'); li.textContent = String((c && (c.label || c.entity)) || 'An item'); ul.appendChild(li); }
          if (more > 0) { const li = document.createElement('li'); li.textContent = `and ${more} more`; ul.appendChild(li); }
          el.appendChild(ul);
        }
        const w = document.createElement('p'); w.className = 'muted actv-conf-foot';
        w.textContent = `${redo ? 'Redoing' : 'Undoing'} it now overwrites those later edits. You can undo that too.`;
        el.appendChild(w);
        _actvTrapFocus(el.closest('.modal') || el.parentElement);
      },
      actions: [
        { label: 'Cancel', run: () => { answered = true; resolve(false); } },
        { label: redo ? 'Redo anyway' : 'Undo anyway', primary: true, run: () => { answered = true; resolve(true); } },
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}
function _actvTrapFocus(dlg) {
  if (!dlg || dlg._actvTrap) return;
  dlg._actvTrap = true;
  dlg.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...dlg.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.getClientRects().length);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !dlg.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });
}
