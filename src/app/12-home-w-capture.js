/* ============================================================
   HOME widget "capture": Quick capture (WIDGETS_CATALOGUE.md 3.1).
   OWNER: the "capture" widget builder (Phase 1, wave 1).
   The job: put a thought into the system in two seconds, then sort what was
   captured. Built on the quick-add parser (22-quick-add.js: parseQuickAdd,
   addParsedTask; 23-quick-add-dialog.js: qaSplitLines; the platform's
   qaChipsHtml / qaSuggest): never a second parser. Pure rules:
   12-home-capture-logic.js (tests/home-w-capture.test.mjs).

   SIZES
     S  the input ("Add a task…"), the parser's live chips under it (click one to
        keep the word as text), # @ + suggestions, and a "N to sort" pill that
        opens To sort in place.
     M  S + up to 4 template chips (quick templates, then the user's task
        templates) + "Just added": the last 5 open tasks made in the last 24 h,
        each with Today, Tomorrow, Date… and Stream.
     L  M + "To sort": open tasks from the last 7 days with no date, no plan, no
        tags and the default (or no) stream. Each row: one-click stream chips (the
        likely one first, then the most used), More, and Looks fine.
   ACTIONS (the user's rule, 3 Oct: a recommendation opens the NORMAL editor
   prefilled; a small check applies it as-is, with Undo)
     Enter       the typed task is added (addParsedTask, the widget's default stream);
                 a toast offers Undo and Open; the input clears and keeps focus.
     Alt+Enter / the expand button: the task card in create mode, prefilled with what
                 was typed (tcOpenCreate); Save creates it, Cancel keeps the text here.
     Paste 2+ lines: a preview ("Add 5 tasks"), one row per line with its chips (x
                 drops a line); Add makes them all as ONE undo step (selUndoGroup);
                 "Edit in full" opens the several-tasks dialog with them.
     Template chip: the task card, prefilled from the template (Save creates it,
                 subtasks too, one undo step). Its small check adds it at once, with
                 Undo (not offered for a title that waits to be finished: "Email re: ").
     Today / Tomorrow: setPlanned (the deadline stays). A chip already on (the task's
                 plan, else its due date, is that day) is pressed: clicking it does nothing.
     Date…       the due-date picker (setDateWithReason); Stream: the stream menu.
     To sort     a stream chip moves the task there; Looks fine hides it from To sort
                 (widgetPrefs.capture.sorted). Both glide the row out; Undo in the toast.
   KEYS  in the input: Enter, Alt+Enter, Up/Down/Tab in the suggestions, Esc (closes
         the suggestions, then clears, then leaves). Rows are one Tab stop each:
         Enter open, T today, ] tomorrow, D date, S stream; To sort also X looks fine
         and 1-4 the stream chips.
   MOTION  new rows rise once (ctx.enterNew); sorted rows glide out (Motion.collapse);
         nothing replays on re-renders; reduced motion is instant.
   SETTINGS  {stream: null, showSort: true, sorted: []} (HOME_WIDGET_PREFS.capture).
   ============================================================ */

/* What survives Home's re-renders (every save and live-sync rebuilds the board):
   the typed text, the words kept as text, the caret, the pasted lines, the open state
   of To sort, and when a template's check was last used. */
const _hcap = { text: '', ignore: [], sel: null, lines: null, sortOpen: false, sortAll: false, used: {}, sugIndex: 0 };
const _HCAP_FK = 'hcap-in';
const _HCAP_TIP = [['hash', '#tag'], ['at-sign', '@person'], ['calendar', 'tomorrow 9am'], ['flag', 'p1'], ['timer', '~30m']];

registerHomeWidget({
  id: 'capture', title: 'Quick capture', icon: 'circle-plus', order: 100, group: 'tasks',
  description: 'Add a task in two seconds, then sort what you captured',
  sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultHidden: true, fresh: true,
  aliases: ['capture', 'quick add', 'add a task', 'new task', 'to sort'],
  defaults: { stream: null, showSort: true, sorted: [] },
  available: () => true,
  render(el, ctx) { return _hcapRender(el, ctx || {}); },
  settings(anchor, ctx) { _hcapSettings(anchor, ctx || {}); },
  sample(kit) { return _hcapSample(kit); },
  unmount() { _hcap.sortOpen = false; _hcap.sortAll = false; },
});

/* ---------- the model ---------- */
function _hcapOpenStreams() {
  return Object.entries(typeof STREAMS !== 'undefined' ? STREAMS : {}).filter(([, s]) => s && !s.archived)
    .sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0)).map(([k]) => k);
}
function _hcapStreamLabel(sid) { return (typeof STREAMS !== 'undefined' && STREAMS[sid] && STREAMS[sid].label) || sid || 'No stream'; }
/** The widget's stream for new tasks (null = the usual default), when it still exists. */
function _hcapPrefStream(prefs) {
  const s = prefs && prefs.stream;
  return s && typeof STREAMS !== 'undefined' && STREAMS[s] && !STREAMS[s].archived ? s : null;
}
function _hcapDefaults(prefs) { const s = _hcapPrefStream(prefs); return s ? { stream: s } : {}; }
/** The stream that means "not sorted yet": the usual default (a stream picked for the widget was a choice). */
function _hcapDefaultStreams() {
  return [typeof defaultStreamId === 'function' ? defaultStreamId() : null].filter(Boolean);
}
function _hcapTomorrow() {
  if (typeof tomorrowStr === 'function') return tomorrowStr();
  return Clock.addDays(todayStr(), 1);   // the page's tomorrow (travel spec 2.7)
}
function _hcapRowOf(i) {
  return { id: i.id, title: effTitle(i), createdAt: i.createdAt, dueDate: effDate(i), plannedFor: i.plannedFor || null,
    tags: effTags(i), stream: effStream(i), open: statusOf(i.id) !== 'done' };
}
/** Everything the widget shows, memoised per data version, minute, size and settings. */
function _hcapModel(ctx, prefs) {
  const size = ctx.size || 'm';
  return homeMemo('capture:model', homeMemoSig({ minute: true, extra: [size, prefs.stream || '', prefs.showSort !== false, prefs.sorted || []] }), () => {
    const now = Date.now();
    const rows = getAllItems().map(_hcapRowOf);
    const dflt = _hcapDefaultStreams();
    const allowed = _hcapOpenStreams();
    const just = size === 's' ? [] : homeCaptureJustAdded(rows, now, { limit: 5 });
    const unsorted = prefs.showSort === false ? [] : homeCaptureUnsorted(rows, now, { defaultStream: dflt, sorted: prefs.sorted, skip: just.map(r => r.id) });
    const tpls = size === 's' ? [] : homeCaptureTemplates(typeof TEMPLATES !== 'undefined' ? TEMPLATES : [], state.taskTemplates || [], { limit: 4 });
    let index = null, top = null;
    if (unsorted.length) {
      index = homeCaptureWordIndex(rows, { allowed, exclude: dflt });
      top = homeCaptureTopStreams(rows, { allowed, exclude: dflt, limit: 5 });
    }
    return { now, rows, dflt, allowed, just, unsorted, tpls, index, top, recent: just.length + unsorted.length };
  });
}

/* ---------- render ---------- */
function _hcapRender(el, ctx) {
  const size = ctx.size || 'm';
  const prefs = ctx.prefs || homePrefs(ctx);
  const preview = !!ctx.preview;
  if (ctx.firstPaint && !preview) { _hcap.sortOpen = false; _hcap.sortAll = false; }
  const m = preview ? _hcapSampleModel(ctx) : _hcapModel(ctx, prefs);
  const showSort = prefs.showSort !== false && m.unsorted.length > 0;
  const card = document.createElement('section');
  card.className = `card home-card hcap hcap--${size}`;
  const head = hglHead({ icon: 'circle-plus', title: 'Quick capture' });
  if (showSort && size !== 'l') {
    const pill = document.createElement('button'); pill.type = 'button'; pill.className = 'hcap-pill';
    const n = m.unsorted.length;
    pill.innerHTML = `${icon('inbox')}<span>${n} to sort</span>${icon(_hcap.sortOpen ? 'chevron-up' : 'chevron-down')}`;
    pill.setAttribute('aria-expanded', _hcap.sortOpen ? 'true' : 'false');
    pill.setAttribute('aria-label', `${n} recent task${n === 1 ? '' : 's'} to sort: ${_hcap.sortOpen ? 'hide' : 'show'} them`);
    if (!preview) pill.onclick = () => { _hcap.sortOpen = !_hcap.sortOpen; _hcap.sortAll = false; if (ctx.rerender) ctx.rerender(); };
    head.appendChild(pill);
  }
  card.appendChild(head);
  const body = document.createElement('div'); body.className = 'card-b hcap-b';
  card.appendChild(body);
  el.appendChild(card);

  body.appendChild(_hcapInputBlock(ctx, prefs, preview, m.recent > 0 || !!_hcap.lines));
  if (_hcap.lines && !preview) body.appendChild(_hcapPasteBlock(ctx, prefs));
  if (m.tpls.length) body.appendChild(_hcapTemplates(ctx, m.tpls, preview));
  const lists = [];
  if (m.just.length) {
    const sec = _hcapSection('Just added', m.just.length);
    const list = document.createElement('div'); list.className = 'hcap-list'; list.setAttribute('role', 'list');
    for (const r of m.just) list.appendChild(_hcapJustRow(ctx, r, m, preview));
    sec.appendChild(list);
    body.appendChild(sec);
    lists.push(list);
    if (!preview) _hcapBindRowKeys(list, ctx, 'just');
  }
  if (showSort && (size === 'l' || _hcap.sortOpen)) {
    const cap = size === 'l' ? 6 : size === 'm' ? 5 : 4;
    const shown = _hcap.sortAll ? m.unsorted : m.unsorted.slice(0, cap);
    const sec = _hcapSection('To sort', m.unsorted.length, 'Recent tasks with no date, plan, tags or stream');
    sec.classList.add('hcap-sec-sort');
    const list = document.createElement('div'); list.className = 'hcap-list hcap-sortlist'; list.setAttribute('role', 'list');
    const chips = size === 's' ? 2 : size === 'm' ? 3 : 4;
    for (const r of shown) list.appendChild(_hcapSortRow(ctx, r, m, prefs, chips, preview));
    sec.appendChild(list);
    if (m.unsorted.length > cap) {
      const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost btn-sm hcap-more';
      more.innerHTML = `<span>${_hcap.sortAll ? 'Show less' : `+${m.unsorted.length - cap} more`}</span>${icon(_hcap.sortAll ? 'chevron-up' : 'chevron-down')}`;
      more.setAttribute('aria-expanded', _hcap.sortAll ? 'true' : 'false');
      if (!preview) more.onclick = () => { _hcap.sortAll = !_hcap.sortAll; if (ctx.rerender) ctx.rerender(); };
      sec.appendChild(more);
    }
    body.appendChild(sec);
    lists.push(list);
    if (!preview) _hcapBindRowKeys(list, ctx, 'sort');
  }
  // Nothing recent: the input and one tip line (the whole syntax at a glance).
  if (!m.recent && !_hcap.lines) {
    const tip = document.createElement('p'); tip.className = 'hcap-tip';
    tip.innerHTML = `<span class="hcap-tip-l">Type it the quick way:</span>` + _HCAP_TIP.map(([ic, t]) => `<span class="hcap-tip-k">${icon(ic, 'i-xs')}${esc(t)}</span>`).join('');
    body.appendChild(tip);
  }
  if (!preview && size !== 's' && typeof homeSuggestSlot === 'function') homeSuggestSlot(body, ctx, null);
  if (!preview && ctx.enterNew) for (const l of lists) ctx.enterNew(l.children, (r) => r.dataset.flip);
  return true;
}
function _hcapSection(title, n, tip) {
  const sec = document.createElement('section'); sec.className = 'hcap-sec';
  sec.innerHTML = `<h4 class="hcap-sh"${tip ? ` title="${escAttr(tip)}"` : ''}><span class="hgl-ovl">${esc(title)}</span><span class="hcap-shn">${esc(String(n))}</span></h4>`;
  return sec;
}

/* ---------- the input ---------- */
function _hcapInputBlock(ctx, prefs, preview, ghost) {
  const wrap = document.createElement('div'); wrap.className = 'hcap-in';
  const box = document.createElement('div'); box.className = 'hcap-box';
  box.innerHTML = `<span class="hcap-plus" aria-hidden="true">${icon('plus')}</span>`;
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'hcap-input'; inp.maxLength = 300; inp.autocomplete = 'off'; inp.spellcheck = true;
  inp.dataset.fk = _HCAP_FK;
  inp.placeholder = 'Add a task…';
  inp.setAttribute('aria-label', 'Add a task');
  inp.setAttribute('aria-autocomplete', 'list');
  if (preview) { inp.readOnly = true; inp.tabIndex = -1; }
  else { inp.value = _hcap.text; inp.setAttribute('aria-describedby', 'hcap-help'); }
  box.appendChild(inp);
  const full = document.createElement('button'); full.type = 'button'; full.className = 'btn-icon btn-sm hcap-full';
  full.innerHTML = icon('maximize-2'); full.setAttribute('aria-label', 'Open in the full editor (Alt+Enter)'); full.setAttribute('data-tip', 'Open in the full editor'); full.setAttribute('data-kbd', 'Alt+Enter');
  const add = document.createElement('button'); add.type = 'button'; add.className = 'btn-icon btn-sm hcap-add';
  add.innerHTML = icon('corner-down-left'); add.setAttribute('aria-label', 'Add the task (Enter)'); add.setAttribute('data-tip', 'Add'); add.setAttribute('data-kbd', 'Enter');
  box.append(full, add);
  wrap.appendChild(box);
  const sug = document.createElement('div'); sug.className = 'hcap-sug'; sug.setAttribute('role', 'listbox'); sug.setAttribute('aria-label', 'Suggestions'); sug.hidden = true;
  const chips = document.createElement('div'); chips.className = 'hcap-chips qa-preview'; chips.setAttribute('aria-live', 'polite');
  const help = document.createElement('div'); help.className = 'hcap-help';
  if (!preview) help.id = 'hcap-help';
  wrap.append(sug, chips, help);
  const paint = () => {
    const txt = inp.value;
    const parsed = parseQuickAdd(txt, _hcap.ignore.length ? { ignore: _hcap.ignore } : undefined);
    let html = txt.trim() ? qaChipsHtml(parsed, !preview) : '';
    const ps = _hcapPrefStream(prefs);
    if (txt.trim() && !parsed.stream && ps) html += `<span class="chip qa-tok implied" title="Quick capture's stream (settings)">${streamMarkHtml(ps)}<span>${esc(_hcapStreamLabel(ps))}</span></span>`;
    chips.innerHTML = html;
    chips.hidden = !html;
    box.classList.remove('is-invalid');
    // The ghost example; with nothing recent the tip line under the field shows the syntax instead.
    help.innerHTML = html ? '' : (ghost ? `<span class="hcap-ghost">${icon('sparkles', 'i-xs')}<span>e.g. Book dentist tomorrow 9am #health</span></span>` : '<span></span>')
      + `<span class="hcap-keys"><kbd class="kbd">Enter</kbd> add <kbd class="kbd">Alt</kbd><kbd class="kbd">Enter</kbd> full editor</span>`;
    help.hidden = !!html;
  };
  paint();
  if (preview) return wrap;

  const sugState = { items: [], word: null };
  const paintSug = () => {
    const w = _hcapWordAtCaret(inp);
    sugState.word = w;
    sugState.items = w && typeof qaSuggest === 'function' ? qaSuggest(w.sigil, w.text, w.raw).slice(0, 6) : [];
    if (!sugState.items.length || document.activeElement !== inp) { sug.hidden = true; sug.innerHTML = ''; inp.removeAttribute('aria-activedescendant'); return; }
    _hcap.sugIndex = Math.min(_hcap.sugIndex, sugState.items.length - 1);
    sug.innerHTML = '';
    sugState.items.forEach((s, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.tabIndex = -1;
      b.id = 'hcap-sug-' + i; b.className = 'pop-item' + (i === _hcap.sugIndex ? ' on' : '');
      b.setAttribute('role', 'option'); b.setAttribute('aria-selected', i === _hcap.sugIndex ? 'true' : 'false');
      const lead = s.kind === 'stream' ? `<span class="ic"><span class="dot" style="--c:${escAttr(safeColor(s.color))}"></span></span>`
        : s.kind === 'person' ? `<span class="avatar avatar-16" style="--c:${escAttr(safeColor(s.color, 'var(--sw-slate)'))}">${esc(avatarInitials(s.label))}</span>`
          : icon(s.kind === 'new' ? 'user-plus' : 'hash');
      b.innerHTML = lead + `<span class="lbl">${esc(s.label)}</span>${s.hint ? `<span class="hint">${esc(s.hint)}</span>` : ''}`;
      b.addEventListener('mousedown', (e) => { e.preventDefault(); accept(s); });
      sug.appendChild(b);
    });
    sug.hidden = false;
    inp.setAttribute('aria-activedescendant', 'hcap-sug-' + _hcap.sugIndex);
  };
  const remember = () => { _hcap.text = inp.value; _hcap.sel = [inp.selectionStart, inp.selectionEnd]; };
  const accept = (it) => {
    const w = sugState.word;
    if (!w || !it) return;
    const v = inp.value, ins = it.insert + ' ';
    inp.value = v.slice(0, w.start) + ins + v.slice(w.end).replace(/^[ \t]+/, '');
    const pos = w.start + ins.length;
    try { inp.setSelectionRange(pos, pos); } catch (e) { /* not a text field */ }
    _hcap.sugIndex = 0;
    remember(); paint(); paintSug();
  };
  chips.addEventListener('mousedown', (e) => { if (e.target.closest('[data-raw]')) e.preventDefault(); });
  chips.addEventListener('click', (e) => {
    const c = e.target.closest('[data-raw]');
    if (!c) return;
    _hcap.ignore.push(c.getAttribute('data-raw'));
    paint(); inp.focus();
  });
  inp.addEventListener('input', () => { if (!inp.value.trim()) _hcap.ignore = []; remember(); paint(); paintSug(); });
  inp.addEventListener('keyup', (e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { remember(); paintSug(); } });
  inp.addEventListener('click', () => { remember(); paintSug(); });
  // A rebuilt board gives focus back to this field (data-fk): the caret goes back where it was.
  inp.addEventListener('focus', () => {
    if (_hcap.sel && inp.value === _hcap.text) { try { inp.setSelectionRange(_hcap.sel[0], _hcap.sel[1]); } catch (e) { /* ignore */ } }
  });
  inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) { sug.hidden = true; inp.removeAttribute('aria-activedescendant'); } }, 120));
  inp.addEventListener('paste', (e) => {
    const txt = e.clipboardData ? e.clipboardData.getData('text') : '';
    if (typeof qaSplitLines !== 'function' || qaSplitLines(txt).length < 2) return;
    e.preventDefault();
    _hcap.lines = [inp.value.trim(), txt].filter(Boolean).join('\n');
    _hcap.text = ''; _hcap.ignore = []; _hcap.sel = null;
    if (ctx.rerender) ctx.rerender();
    requestAnimationFrame(() => { const b = document.querySelector('#main-body .hcap-paste [data-fk="hcap-paste-add"]'); if (b) b.focus({ preventScroll: true }); });
  });
  inp.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    e.stopPropagation();                                   // the board's own keys stay out of the field
    const open = !sug.hidden && sugState.items.length;
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      _hcap.sugIndex = (_hcap.sugIndex + (e.key === 'ArrowDown' ? 1 : -1) + sugState.items.length) % sugState.items.length;
      paintSug(); return;
    }
    if (open && (e.key === 'Tab' || (e.key === 'Enter' && !e.altKey))) { e.preventDefault(); accept(sugState.items[_hcap.sugIndex]); return; }
    if (e.key === 'Enter' && e.altKey) { e.preventDefault(); _hcapOpenEditor(inp, prefs); return; }
    if (e.key === 'Enter') { e.preventDefault(); _hcapSubmit(inp, box, prefs); return; }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (open) { sug.hidden = true; return; }
      if (inp.value) { inp.value = ''; _hcap.ignore = []; remember(); paint(); return; }
      inp.blur();
    }
  });
  full.onclick = () => _hcapOpenEditor(inp, prefs);
  add.onclick = () => { if (inp.value.trim()) _hcapSubmit(inp, box, prefs); else inp.focus(); };
  return wrap;
}
/** The #word / @word / +word being typed at the caret, or null (as the quick-add dialog reads it). */
function _hcapWordAtCaret(inp) {
  const pos = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
  const m = /(^|\s)([#@+])([\p{L}\p{N}_.-]{0,40})$/u.exec(inp.value.slice(0, pos));
  return m ? { sigil: m[2], text: m[3].toLowerCase(), raw: m[3], start: pos - m[3].length - 1, end: pos } : null;
}
function _hcapFocusInput() {
  const go = () => {
    const n = document.querySelector(`#main-body [data-fk="${_HCAP_FK}"]`);
    if (n && document.activeElement !== n) try { n.focus({ preventScroll: true }); } catch (e) { /* gone */ }
  };
  go();
  requestAnimationFrame(go);
}
/** Enter: add what was typed (one undo step); Undo and Open in the toast; the field stays ready. */
function _hcapSubmit(inp, box, prefs) {
  const text = String(inp.value || '').trim();
  if (!text) return null;
  const parsed = parseQuickAdd(text, _hcap.ignore.length ? { ignore: _hcap.ignore } : undefined);
  if (!parsed.title) {
    box.classList.add('is-invalid');
    if (window.Motion && !Motion.prefersReduced() && box.animate) box.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 240 });
    return null;
  }
  _hcap.text = ''; _hcap.ignore = []; _hcap.sel = null; _hcap.sugIndex = 0;
  inp.value = '';
  const id = addParsedTask(parsed, _hcapDefaults(prefs));          // saves (one undo step) and repaints Home
  if (!id) return null;
  const it = getItem(id);
  const title = it ? effTitle(it) : parsed.title;
  _hcapToast(`Added: ${title}`, id);
  if (typeof homeAnnounce === 'function') homeAnnounce(`Added: ${title}`);
  _hcapFocusInput();
  return id;
}
/** Alt+Enter: the task card in create mode, filled in with what was typed. */
function _hcapOpenEditor(inp, prefs) {
  const text = String(inp.value || '').trim();
  const dflt = _hcapPrefStream(prefs);
  let pre;
  if (_hcap.ignore.length) {
    // Words the user kept as text: hand the card the result, not the raw words.
    const p = parseQuickAdd(text, { ignore: _hcap.ignore });
    pre = { title: p.title, date: p.dueDate, time: p.dueTime, priority: p.priority, stream: p.stream || dflt, tags: p.tags, people: p.people, minutes: p.estimate, recurrence: p.recurrence || 'none' };
  } else pre = { title: text, stream: dflt };
  const typed = inp.value;
  pre.onCreated = () => {
    if (_hcap.text !== typed) return;                        // typed on since: keep it
    _hcap.text = ''; _hcap.ignore = []; _hcap.sel = null;
    if (state.view === 'home' && typeof homeRerenderWidget === 'function') homeRerenderWidget('capture');
  };
  if (typeof tcOpenCreate === 'function') tcOpenCreate(pre, { from: inp });
  else if (typeof openQuickAddDialog === 'function') openQuickAddDialog(text);
}
/** A toast with Undo, plus Open for the new task. */
function _hcapToast(msg, openId) {
  const close = toast(msg, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
  const host = openId ? document.getElementById('toast-host') : null;
  const t = host && host.lastElementChild;
  if (t && t.classList.contains('toast')) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = 'Open';
    b.onclick = () => { if (typeof close === 'function') close(); if (getItem(openId)) homeOpenTask(openId); };
    t.appendChild(b);
  }
  return close;
}

/* ---------- several lines pasted: a preview, then one undo step ---------- */
const _HCAP_PASTE_MAX = 50;
function _hcapPasteBlock(ctx, prefs) {
  const all = qaSplitLines(_hcap.lines || '');
  const lines = all.slice(0, _HCAP_PASTE_MAX);
  const dflt = _hcapDefaults(prefs);
  const known = typeof _qadKnownTags === 'function' ? _qadKnownTags() : undefined;
  const parsed = lines.map(l => parseQuickAdd(l));
  const n = parsed.filter(p => p.title).length;
  const box = document.createElement('div'); box.className = 'hcap-paste'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', `Pasted: ${n} tasks to add`);
  const h = document.createElement('div'); h.className = 'hcap-paste-h';
  h.innerHTML = `${icon('clipboard-list')}<b>${n} task${n === 1 ? '' : 's'} from what you pasted</b><span class="spacer"></span>`;
  const full = document.createElement('button'); full.type = 'button'; full.className = 'btn btn-ghost btn-sm hcap-paste-full';
  full.innerHTML = `${icon('maximize-2')}<span>Edit in full</span>`;
  full.onclick = () => { const txt = _hcap.lines; _hcap.lines = null; if (ctx.rerender) ctx.rerender(); openQuickAddDialog(txt, { multi: true }); };
  h.appendChild(full);
  box.appendChild(h);
  const ul = document.createElement('ul'); ul.className = 'hcap-pl';
  parsed.forEach((p, i) => {
    const li = document.createElement('li'); li.className = 'hcap-pli' + (p.title ? '' : ' is-empty');
    const implied = !p.stream && dflt.stream ? `<span class="chip qa-tok implied">${streamMarkHtml(dflt.stream)}<span>${esc(_hcapStreamLabel(dflt.stream))}</span></span>` : '';
    li.innerHTML = `<span class="check check-sm ${escAttr(p.priority || 'p0')}" aria-hidden="true"></span><span class="hcap-plt">${esc(p.title || '(no title)')}</span><span class="hcap-plc">${qaChipsHtml(p, false, known)}${implied}</span>`;
    const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm hcap-plx';
    x.innerHTML = icon('x'); x.setAttribute('aria-label', `Leave out “${p.title || lines[i]}”`);
    x.onclick = () => {
      const rest = lines.filter((_, j) => j !== i).concat(all.slice(_HCAP_PASTE_MAX));
      if (rest.length > 1) _hcap.lines = rest.join('\n');
      else { _hcap.lines = null; _hcap.text = rest[0] || ''; _hcap.sel = null; }
      if (ctx.rerender) ctx.rerender();
      requestAnimationFrame(() => { const b = document.querySelector('#main-body .hcap-paste [data-fk="hcap-paste-add"]'); if (b) b.focus({ preventScroll: true }); else _hcapFocusInput(); });
    };
    li.appendChild(x);
    ul.appendChild(li);
  });
  box.appendChild(ul);
  if (all.length > _HCAP_PASTE_MAX) {
    const more = document.createElement('p'); more.className = 'hcap-paste-more';
    more.textContent = `and ${all.length - _HCAP_PASTE_MAX} more lines: use Edit in full for those`;
    box.appendChild(more);
  }
  const f = document.createElement('div'); f.className = 'hcap-paste-f';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-ghost btn-sm'; cancel.textContent = 'Cancel';
  cancel.onclick = () => { _hcap.lines = null; if (ctx.rerender) ctx.rerender(); _hcapFocusInput(); };
  const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-primary btn-sm'; go.dataset.fk = 'hcap-paste-add';
  go.innerHTML = `${icon('plus')}<span>Add ${n} task${n === 1 ? '' : 's'}</span>`;
  go.disabled = !n;
  go.onclick = () => {
    if (go.dataset.done === '1') return;
    go.dataset.done = '1';
    _hcapAddLines(lines, dflt);
  };
  f.append(cancel, go);
  box.appendChild(f);
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel.click(); } });
  return box;
}
/** Every pasted line as a task, as ONE undo step. */
function _hcapAddLines(lines, dflt) {
  _hcap.lines = null;
  const ids = selUndoGroup(() => {
    const out = [];
    for (const l of lines) {
      const p = parseQuickAdd(l);
      if (!p.title) continue;
      const id = addParsedTask(p, dflt);
      if (id) out.push(id);
    }
    return out;
  });
  if (!ids.length) { render(); return ids; }
  if (ids.length === 1) _hcapToast(`Added: ${effTitle(getItem(ids[0]))}`, ids[0]);
  else toast(`Added ${ids.length} tasks`, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
  if (typeof homeAnnounce === 'function') homeAnnounce(`Added ${ids.length} task${ids.length === 1 ? '' : 's'}`);
  _hcapFocusInput();
  return ids;
}

/* ---------- templates: the main click opens the card prefilled; the check adds it now ---------- */
function _hcapTemplates(ctx, tpls, preview) {
  const row = document.createElement('div'); row.className = 'hcap-tpls'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Templates');
  const now = Date.now();
  for (const t of tpls) {
    const chip = document.createElement('span'); chip.className = 'hcap-tpl'; chip.dataset.flip = 'tpl:' + t.key;
    const main = document.createElement('button'); main.type = 'button'; main.className = 'hcap-tpl-main';
    main.innerHTML = `${t.stream && typeof STREAMS !== 'undefined' && STREAMS[t.stream] ? streamMarkHtml(t.stream) : icon(t.kind === 'task' ? 'copy' : 'layout-template', 'i-xs')}<span>${esc(t.label)}</span>`;
    main.title = `New task from “${t.label}”: opens it filled in; Save creates it`;
    main.setAttribute('aria-label', `New task from the template ${t.label} (opens the editor)`);
    chip.appendChild(main);
    if (!homeCaptureTemplateOpenEnded(t)) {
      const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'hcap-tpl-ok';
      ok.innerHTML = icon('check', 'i-xs');
      ok.setAttribute('aria-label', `Add “${t.title.trim()}” now`);
      ok.setAttribute('data-tip', 'Add it now');
      const used = _hcap.used[t.key] || 0;
      if (now - used < 4000) {
        ok.dataset.done = '1'; ok.classList.add('is-done'); ok.setAttribute('aria-disabled', 'true');
        setTimeout(() => { delete ok.dataset.done; ok.classList.remove('is-done'); ok.removeAttribute('aria-disabled'); }, 4000 - (now - used));
      }
      if (!preview) ok.onclick = (e) => { e.stopPropagation(); if (ok.dataset.done === '1') return; _hcapTemplateNow(t); };
      chip.appendChild(ok);
    }
    if (!preview) main.onclick = () => _hcapTemplateOpen(t, main);
    row.appendChild(chip);
  }
  return row;
}
function _hcapTemplatePrefill(t) {
  return { title: t.title, stream: t.stream || null, priority: t.priority, tags: t.tags.slice(), detail: t.detail || '',
    people: t.people.slice(), recurrence: t.recurrence || 'none', date: homeCaptureTemplateDue(t, todayStr()) };
}
function _hcapTemplateOpen(t, from) {
  const pre = _hcapTemplatePrefill(t);
  if (t.subtasks.length) pre.onCreated = (id) => _hcapAddSubtasks(id, t.subtasks);
  if (typeof tcOpenCreate === 'function') tcOpenCreate(pre, { from });
}
/** The card made the task a moment ago: its subtasks join it in the SAME undo step. */
function _hcapAddSubtasks(id, titles) {
  const it = getItem(id);
  if (!it || !titles.length) return;
  const n = typeof _undoStack !== 'undefined' ? _undoStack.length : -1;
  it.subtasks = (Array.isArray(it.subtasks) ? it.subtasks : []).concat(titles.map(x => ({ id: _newSubId(), title: String(x), done: false, ts: Date.now() })));
  saveData();
  if (n >= 0 && _undoStack.length > n) _undoStack.splice(n);   // fold this save into the card's
  render();
}
/** The check: the template's task, made at once (Undo and Open in the toast). */
function _hcapTemplateNow(t) {
  _hcap.used[t.key] = Date.now();
  const p = _hcapTemplatePrefill(t);
  const id = addCustomTask(t.title.trim(), p.date, t.priority, p.tags, t.stream, t.recurrence || 'none',
    { detail: t.detail || '', subtasks: t.subtasks, people: p.people });
  if (!id) return null;
  _hcapToast(`Added: ${t.title.trim()}`, id);
  if (typeof homeAnnounce === 'function') homeAnnounce(`Added from the template ${t.label}`);
  return id;
}

/* ---------- rows ---------- */
function _hcapMeta(r, now, withStream, withDue) {
  const parts = [];
  const ago = homeCaptureAgo(r.createdAt, now);
  if (ago) parts.push(`<span class="hcap-ago">${esc(ago)}</span>`);
  if (r.dueDate && withDue) {
    const n = daysUntil(r.dueDate);
    parts.push(`<span class="hcap-due${n < 0 ? ' late' : ''}">due ${esc(dueLabel(r.dueDate))}</span>`);
  }
  if (r.plannedFor && r.plannedFor !== r.dueDate) parts.push(`<span>planned ${esc(dueLabel(r.plannedFor))}</span>`);
  if (withStream && r.stream) parts.push(`<span class="hcap-sn">${esc(_hcapStreamLabel(r.stream))}</span>`);
  return parts.join('<span class="hcap-dot" aria-hidden="true"> · </span>');
}
function _hcapChip(label, act, o) {
  o = o || {};
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chip chip-lg hcap-chip' + (o.cls ? ' ' + o.cls : '');
  b.tabIndex = -1; b.dataset.act = act;
  b.innerHTML = (o.lead || '') + `<span>${esc(label)}</span>`;
  if (o.pressed !== undefined) b.setAttribute('aria-pressed', o.pressed ? 'true' : 'false');
  if (o.title) b.title = o.title;
  if (o.aria) b.setAttribute('aria-label', o.aria);
  if (o.kbd) b.setAttribute('data-kbd', o.kbd);
  return b;
}
function _hcapRowShell(ctx, r, kind, preview, label) {
  const row = document.createElement('div');
  row.className = `hcap-row hgl-row hcap-row--${kind}`;
  row.setAttribute('role', 'listitem');
  row.dataset.flip = (kind === 'sort' ? 'ts:' : 'ja:') + r.id;
  row.dataset.id = r.id;
  if (!preview) { row.dataset.row = r.id; row.tabIndex = 0; row.setAttribute('aria-label', label); }
  return row;
}
function _hcapJustRow(ctx, r, m, preview) {
  const today = typeof todayStr === 'function' ? todayStr() : '';
  const tomorrow = _hcapTomorrow();
  const onToday = homeCaptureDayOn(r, today), onTomorrow = homeCaptureDayOn(r, tomorrow);
  const row = _hcapRowShell(ctx, r, 'just', preview, `${r.title}. ${homeCaptureAgo(r.createdAt, m.now)}. Keys: Enter open, T today, ] tomorrow, D date, S stream`);
  row.innerHTML = `<span class="hcap-mk">${r.stream ? streamMarkHtml(r.stream) : ''}</span>`
    + `<span class="hcap-rt"><span class="hcap-t">${esc(r.title)}</span><span class="hcap-s">${_hcapMeta(r, m.now, false, false)}</span></span>`;
  const acts = document.createElement('span'); acts.className = 'hcap-acts';
  const bToday = _hcapChip('Today', 'today', { lead: icon('sun', 'i-xs'), pressed: onToday, kbd: 'T', title: onToday ? 'Already on today' : 'Plan it for today (the deadline stays)' });
  const bTom = _hcapChip('Tomorrow', 'tomorrow', { lead: icon('sunrise', 'i-xs'), pressed: onTomorrow, kbd: ']', title: onTomorrow ? 'Already on tomorrow' : 'Plan it for tomorrow (the deadline stays)' });
  const dl = r.dueDate ? dueLabel(r.dueDate) : '';
  const late = r.dueDate && typeof daysUntil === 'function' && daysUntil(r.dueDate) < 0;
  const bDate = _hcapChip(r.dueDate ? `Due ${/^(Today|Tomorrow)$/.test(dl) ? dl.toLowerCase() : dl}` : 'Date…', 'date', { lead: icon('calendar', 'i-xs'), pressed: !!r.dueDate, kbd: 'D', title: r.dueDate ? 'Change the due date' : 'Give it a due date', cls: (r.dueDate ? 'is-set' : '') + (late ? ' is-late' : '') });
  const bStream = _hcapChip(r.stream ? _hcapStreamLabel(r.stream) : 'Stream', 'stream', { lead: r.stream ? streamMarkHtml(r.stream) : icon('circle', 'i-xs'), kbd: 'S', title: 'Move it to another stream', aria: `Stream: ${_hcapStreamLabel(r.stream)}. Change it` });
  acts.append(bToday, bTom, bDate, bStream);
  row.appendChild(acts);
  if (preview) return row;
  hglTrackCurrent(row, r.id);
  bToday.onclick = (e) => { e.stopPropagation(); _hcapPlan(r.id, today, bToday); };
  bTom.onclick = (e) => { e.stopPropagation(); _hcapPlan(r.id, tomorrow, bTom); };
  bDate.onclick = (e) => { e.stopPropagation(); _hcapPickDate(r.id, bDate); };
  bStream.onclick = (e) => { e.stopPropagation(); _hcapPickStream(r.id, bStream); };
  row.onclick = (e) => { if (e.target.closest('button')) return; hglOpenTask(ctx, r.id, row, row); };
  return row;
}
function _hcapSortRow(ctx, r, m, prefs, nChips, preview) {
  const row = _hcapRowShell(ctx, r, 'sort', preview, `${r.title}. ${homeCaptureAgo(r.createdAt, m.now)}. Keys: Enter open, 1 to ${nChips} pick a stream, S more streams, X looks fine`);
  row.innerHTML = `<span class="hcap-rt"><span class="hcap-t">${esc(r.title)}</span><span class="hcap-s">${_hcapMeta(r, m.now, true, true)}</span></span>`;
  const acts = document.createElement('span'); acts.className = 'hcap-acts';
  const choices = homeCaptureStreamChoices(r.title, m.rows, { allowed: m.allowed, exclude: m.dflt, limit: nChips, index: m.index, top: m.top, selfId: r.id });
  const btns = [];
  choices.forEach((c, i) => {
    const b = _hcapChip(_hcapStreamLabel(c.id), 'stream', { lead: streamMarkHtml(c.id), cls: 'hcap-st' + (c.guess ? ' is-guess' : ''), kbd: String(i + 1),
      title: c.guess ? `Move it to ${_hcapStreamLabel(c.id)} (similar tasks are there)` : `Move it to ${_hcapStreamLabel(c.id)}`,
      aria: `Move to ${_hcapStreamLabel(c.id)}${c.guess ? ', the likely stream' : ''}` });
    b.dataset.stream = c.id;
    btns.push(b); acts.appendChild(b);
  });
  const more = _hcapChip('More', 'more', { lead: icon('ellipsis', 'i-xs'), cls: 'chip-more hcap-more-st', kbd: 'S', title: 'Every stream', aria: 'More streams' });
  const fine = _hcapChip('Looks fine', 'fine', { lead: icon('check', 'i-xs'), cls: 'hcap-fine', kbd: 'X', title: 'Leave it as it is and stop showing it here', aria: 'Looks fine: leave it as it is' });
  acts.append(more, fine);
  row.appendChild(acts);
  if (preview) return row;
  hglTrackCurrent(row, r.id);
  for (const b of btns) b.onclick = (e) => { e.stopPropagation(); _hcapSortTo(r.id, b.dataset.stream, row); };
  more.onclick = (e) => { e.stopPropagation(); _hcapPickStream(r.id, more, row); };
  fine.onclick = (e) => { e.stopPropagation(); _hcapLooksFine(ctx, r.id, row); };
  row.onclick = (e) => { if (e.target.closest('button')) return; hglOpenTask(ctx, r.id, row, row); };
  return row;
}
function _hcapBindRowKeys(list, ctx, kind) {
  const chip = (row, act) => row.querySelector(`[data-act="${act}"]`);
  const h = {
    open: (id, row) => hglOpenTask(ctx, id, row, row),
  };
  if (kind === 'just') {
    h.today = (id, row) => { const b = chip(row, 'today'); if (b) b.click(); };
    h.tomorrow = (id, row) => { const b = chip(row, 'tomorrow'); if (b) b.click(); };
    h.keys = { d: (id, row) => { const b = chip(row, 'date'); if (b) b.click(); }, s: (id, row) => { const b = chip(row, 'stream'); if (b) b.click(); } };
  } else {
    h.done = (id, row) => { const b = chip(row, 'fine'); if (b) b.click(); };
    h.keys = { s: (id, row) => { const b = chip(row, 'more'); if (b) b.click(); } };
    for (const k of ['1', '2', '3', '4']) h.keys[k] = (id, row) => { const b = row.querySelectorAll('.hcap-st')[Number(k) - 1]; if (b) b.click(); };
  }
  homeRowKeys(list, h);
}

/* ---------- row actions (each one undo step, with Undo in the toast) ---------- */
function _hcapPlan(id, iso, btn) {
  const it = getItem(id);
  if (!it || !iso) return;
  if (btn && btn.getAttribute('aria-pressed') === 'true') return;          // already on that day: nothing
  if (homeCaptureDayOn(_hcapRowOf(it), iso)) return;
  setPlanned(id, iso);
  const today = iso === todayStr();
  toast(today ? 'Planned for today' : 'Planned for tomorrow', { kind: 'ok', icon: today ? 'sun' : 'sunrise', action: { label: 'Undo', run: () => undo() } });
  if (typeof homeAnnounce === 'function') homeAnnounce(`${effTitle(it)}: planned for ${today ? 'today' : 'tomorrow'}`);
}
function _hcapPickDate(id, anchor) {
  const it = getItem(id);
  if (!it) return;
  openDueDatePopover(anchor, {
    value: effDate(it), title: 'Due date', align: 'end',
    onPick: (d) => {
      const cur = getItem(id);
      if (!cur || (effDate(cur) || null) === (d || null)) return;          // the same day: nothing
      setDateWithReason(id, d || null, 'Set on Home');
      toast(d ? `Due ${dueLabel(d)}` : 'Due date removed', { kind: 'ok', icon: 'calendar', action: { label: 'Undo', run: () => undo() } });
    },
  });
}
function _hcapPickStream(id, anchor, rowToGlide) {
  const it = getItem(id);
  if (!it) return;
  openStreamMenu(anchor, id, (k) => {
    const cur = getItem(id);
    if (!cur || effStream(cur) === k) return;                              // the same stream: nothing
    if (rowToGlide) _hcapSortTo(id, k, rowToGlide);
    else _hcapSetStream(id, k);
  });
}
function _hcapSetStream(id, k) {
  setOverride(id, 'stream', k);
  render();
  toast(`Moved to ${_hcapStreamLabel(k)}`, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
}
/** The row glides out first (once), then the change is saved. */
function _hcapGlideOut(row, fn) {
  if (!row || row.dataset.leaving === '1') return;
  row.dataset.leaving = '1';
  row.classList.add('is-leaving');
  for (const b of row.querySelectorAll('button')) b.disabled = true;
  if (row.isConnected && window.Motion && !Motion.prefersReduced()) Motion.collapse(row, fn);
  else fn();
}
function _hcapSortTo(id, k, row) {
  const it = getItem(id);
  if (!it || !k || effStream(it) === k) return;
  _hcapGlideOut(row, () => {
    _hcapSetStream(id, k);
    if (typeof homeAnnounce === 'function') homeAnnounce(`${effTitle(it)}: moved to ${_hcapStreamLabel(k)}`);
  });
}
function _hcapLooksFine(ctx, id, row) {
  const prefs = homePrefs(ctx.instance || ctx.id || 'capture');
  if ((prefs.sorted || []).includes(id)) return;
  const windowMs = 8 * 86400000, now = Date.now();
  const keep = (x) => { const t = getItem(x); const ts = t ? homeCaptureTs(t.createdAt) : null; return !!t && ts != null && now - ts < windowMs; };
  const next = homeCaptureSortedAdd(prefs.sorted, id, { keep });
  _hcapGlideOut(row, () => {
    homeSetPrefs(ctx.instance || ctx.id || 'capture', { sorted: next }, 'Left as it is');
    if (typeof homeAnnounce === 'function') { const t = getItem(id); homeAnnounce(`${t ? effTitle(t) : 'Task'}: left as it is`); }
  });
}

/* ---------- settings ---------- */
function _hcapSettings(anchor, ctx) {
  const wid = ctx.instance || ctx.id || 'capture';
  openPopover(anchor, (el) => {
    el.classList.add('hg-set', 'hcap-set');
    const paint = (focusKey) => {
      const p = homePrefs(wid);
      el.innerHTML = `<div class="hg-set-h">${icon('circle-plus')}<b>Quick capture settings</b></div>`;
      // The stream for new tasks (a list: a seg would not fit ten streams).
      const r1 = document.createElement('div'); r1.className = 'hg-set-row'; r1.dataset.key = 'stream';
      const dflt = typeof defaultStreamId === 'function' ? defaultStreamId() : '';
      r1.innerHTML = `<div class="hg-set-l"><span>New tasks go to</span><small>When you do not type a #stream</small></div>`;
      const sel = document.createElement('select'); sel.className = 'control control-sm hcap-set-sel'; sel.setAttribute('aria-label', 'New tasks go to');
      sel.innerHTML = `<option value="">Usual (${esc(_hcapStreamLabel(dflt))})</option>` + _hcapOpenStreams().map(k => `<option value="${escAttr(k)}"${p.stream === k ? ' selected' : ''}>${esc(_hcapStreamLabel(k))}</option>`).join('');
      if (!_hcapPrefStream(p)) sel.value = '';
      sel.onchange = () => { const v = sel.value || null; if (v === (p.stream || null)) return; if (homeSetPrefs(wid, { stream: v })) paint('stream'); };
      r1.appendChild(sel);
      el.appendChild(r1);
      const r2 = document.createElement('div'); r2.className = 'hg-set-row'; r2.dataset.key = 'showSort';
      const on = p.showSort !== false;
      r2.innerHTML = `<div class="hg-set-l"><span>Show To sort</span><small>Recent tasks with no date, plan, tags or stream</small></div>`;
      const sw = document.createElement('button'); sw.type = 'button'; sw.className = 'switch' + (on ? ' on' : '');
      sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', on ? 'true' : 'false'); sw.setAttribute('aria-label', 'Show To sort');
      sw.onclick = () => { if (homeSetPrefs(wid, { showSort: !on })) paint('showSort'); };
      r2.appendChild(sw);
      el.appendChild(r2);
      const n = (p.sorted || []).length;
      if (n) {
        const f = document.createElement('div'); f.className = 'hg-set-foot hcap-set-foot';
        f.innerHTML = `<span>${n} task${n === 1 ? '' : 's'} left as ${n === 1 ? 'it is' : 'they are'}.</span>`;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = 'Show them again';
        b.onclick = () => { if (homeSetPrefs(wid, { sorted: null }, 'To sort shows them again')) paint(); };
        f.appendChild(b);
        el.appendChild(f);
      }
      const to = focusKey && el.querySelector(`.hg-set-row[data-key="${focusKey}"] select, .hg-set-row[data-key="${focusKey}"] .switch`);
      if (to) try { to.focus({ preventScroll: true }); } catch (e) { /* gone */ }
    };
    paint();
  }, { width: 340, align: 'end', className: 'hg-set-pop' });
}

/* ---------- the gallery's preview (synthetic, relative to now) ---------- */
function _hcapSample(kit) {
  const now = Date.now();
  const t = (kit && kit.tasks) || [];
  // The kit's generic streams drawn as the user's own (their colours), when they have some.
  const open = _hcapOpenStreams(), home = typeof defaultStreamId === 'function' ? defaultStreamId() : null;
  const work = open.find(s => s !== home) || null;
  const as = (s) => (s === 'work' ? work || s : s === 'personal' ? home || s : s);
  const row = (x, minAgo, extra) => Object.assign({ id: x.id, title: x.title, createdAt: now - minAgo * 60000, dueDate: null, plannedFor: null, tags: [], stream: as(x.stream || null), open: true }, extra || {});
  return {
    just: t.length >= 3 ? [row(t[2], 4, { plannedFor: kit.today }), row(t[4], 38, { dueDate: t[4].dueDate }), row(t[0], 125)] : [],
    unsorted: t.length >= 6 ? [row(t[5], 60 * 26), { id: 'sample-7', title: 'Look into a new phone plan', createdAt: now - 3 * 86400000, dueDate: null, plannedFor: null, tags: [], stream: null, open: true }] : [],
    tpls: homeCaptureTemplates([{ label: 'Follow-up email', title: 'Email re: ', stream: as('work'), tags: ['email'], priority: 'p3' }, { label: 'Daily review', title: 'Daily review + plan', stream: as('personal'), daysAhead: 1, recurrence: 'daily' }], [], { limit: 4 }),
    streams: [...new Set([work, ...open.filter(s => s !== home)].filter(Boolean))].slice(0, 4),
    home,
  };
}
function _hcapSampleModel(ctx) {
  const s = homeSample('capture') || { just: [], unsorted: [], tpls: [], streams: [] };
  const size = ctx.size || 'm';
  const rows = s.just.concat(s.unsorted);
  const top = s.streams && s.streams.length ? s.streams : ['work', 'personal'];
  return { now: Date.now(), rows, dflt: s.home ? [s.home] : [], allowed: top, just: size === 's' ? [] : s.just, unsorted: s.unsorted, tpls: size === 's' ? [] : s.tpls,
    index: homeCaptureWordIndex(rows, {}), top, recent: s.just.length + s.unsorted.length };
}
