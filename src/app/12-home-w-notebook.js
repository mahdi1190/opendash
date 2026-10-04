/* ============================================================
   HOME widget "notebook": Daily note (WIDGETS_CATALOGUE.md 3.15).
   OWNER: the "notebook" widget builder (Phase 1, wave 2). A running markdown
   note for each day: what the user tried, decided and learned.
   Store: state.daynotes (12-home-daynotes.js: daynoteGet / daynoteSet /
   daynoteAppend; server op daynote.save, query daynotes.get). Rules (cap,
   append, merge, search, Make task's mark): 12-home-notebook-logic.js.
   Styles: 13-home-w-notebook.css.

   SIZES
     S     today's last line (or "Nothing written today") and Write: a one-line
           input that appends '- HH:MM text' (one save).
     M     the editor for one day: ← / → and Today, Insert time (Alt+T), Preview
           (renderMarkdown; '- [ ]' lines get Make task), Copy day, "Saved 10:42".
     L     M plus a side column: Tasks in this note, Yesterday (folded), On this day
           (the same date last month and last year; setting onThisDay).
     Full  L plus the last 30 days (a dot where a note exists) and a search across
           every note (in the browser).

   ACTIONS (the user's rule, 3 Oct: the main click opens the NORMAL editor prefilled,
   a small ✓ applies it as it is with Undo)
     Make task   the task card in create mode, filled in from the line (tcOpenCreate);
                 its Save adds the task and the line becomes '- [x] text (task)', ONE undo
                 step. Pressed again while that card is open: nothing (the edits stay).
     ✓           addTaskFromText(line) + the same mark, one undo group, toast with Undo.
     Autosave    1.5 s after typing stops, at most once every 20 s while the editor has
                 focus, and at once on blur, day change, leaving Home or hiding the tab
                 (every save is a whole-state undo snapshot). Day navigation, Preview and
                 Copy day write nothing.
   The editor node is kept across Home re-renders (a save, live sync, another widget's
   repaint), so typing never loses the caret, the selection or the scroll position.
   Another copy of the same day changing (a second tab, an assistant's append, Undo)
   is merged in line by line (dnMerge3); nothing typed here is lost.
   ============================================================ */
const _nb = {
  date: null,          // the day shown (null = today, so it follows midnight)
  ta: null,            // the editor, kept across Home re-renders
  taDate: null,        // the day the editor holds
  base: '',            // what the store held when the editor last loaded / saved
  start: '',           // the editor's text at that point (base, or the unsaved template)
  tpl: false,          // the editor shows the template (nothing saved yet)
  dirty: false, focused: false,
  sel: null, scroll: 0,
  lastInput: 0, lastSave: 0, timer: 0,
  savedAt: 0, failed: '', fresh: false,
  preview: false,      // M and up: Preview on
  dir: 0,              // the last day change (-1 back, 1 forward): the editor slides once
  yOpen: false,        // L: Yesterday unfolded
  q: '', searchOpen: false,   // Full: search (the hits show while the search has focus)
  selLine: null, pendingLine: null,
  justMade: null,      // the line Make task / ✓ just ticked (it animates once)
  writeDraft: '',      // S: Write's text across re-renders
  ctx: null, statusEl: null, countEl: null,
};

registerHomeWidget({
  id: 'notebook', title: 'Daily note', icon: 'notebook-pen', order: 240, group: 'files',
  description: 'A running note for each day: what you tried, decided and learned',
  sizes: ['s', 'm', 'l', 'full'], defaultSize: 'm', defaultHidden: true, fresh: true,
  aliases: ['daily note', 'notes', 'journal', 'lab notebook', 'work log', 'scratchpad'],
  defaults: { template: '', onThisDay: true },
  emptyHint: 'Always shows: a note for today',
  available: () => true,
  render(el, ctx) { return _nbRender(el, ctx || {}); },
  settings(anchor, ctx) { _nbSettings(anchor, ctx); },
  unmount() { _nbFlush('leave'); _nb.focused = false; _nb.ta = null; _nb.taDate = null; _nb.ctx = null; },
});

// Saved before the tab hides or closes. Hooked on the first paint (widget files only declare
// things at load), in the capture phase, so they run before 99-boot.js sends the state off.
let _nbHooked = false;
function _nbHook() {
  if (_nbHooked || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  _nbHooked = true;
  document.addEventListener('visibilitychange', () => { if (document.hidden) _nbFlush('hide'); }, true);
  window.addEventListener('pagehide', () => _nbFlush('exit'), true);
}

/* ---------- small helpers ---------- */
const _NB_TODO_IC = 'nb-todo-ic', _NB_CHEV = 'nb-chev';   // icon classes (names, so the sprite check skips them)
function _nbLoc() { return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined; }
function _nbDate(iso) { return new Date(iso + 'T12:00:00'); }
function _nbLong(iso) { try { return _nbDate(iso).toLocaleDateString(_nbLoc(), { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return iso; } }
function _nbShort(iso) { try { return _nbDate(iso).toLocaleDateString(_nbLoc(), { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return iso; } }
function _nbRel(iso, today) {
  const t = today || todayStr();
  return iso === t ? 'Today' : iso === dnAddDays(t, -1) ? 'Yesterday' : iso === dnAddDays(t, 1) ? 'Tomorrow' : '';
}
function _nbNowHM() { const p = Clock.parts(); return dnHM(p.h * 60 + p.mi); }   // now on the page's clock (travel spec 2.7)
function _nbPrefs() { try { return homePrefs('notebook'); } catch (e) { return { template: '', onThisDay: true }; } }
function _nbRerender() {
  if (_nb.ctx && typeof _nb.ctx.rerender === 'function') _nb.ctx.rerender();
  else if (typeof homeRerenderWidget === 'function') homeRerenderWidget('notebook');
}
function _nbBtn(cls, html, o) {
  const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html;
  o = o || {};
  if (o.label) b.setAttribute('aria-label', o.label);
  if (o.tip) b.setAttribute('data-tip', o.tip);
  if (o.act) b.dataset.act = o.act;
  if (o.run) b.onclick = o.run;
  return b;
}

/* ---------- render ---------- */
function _nbRender(el, ctx) {
  const size = ctx.size || 'm';
  if (ctx.preview) return _nbRenderSample(el, ctx, size);
  _nbHook();
  const today = todayStr();
  if (ctx.firstPaint) {                                   // a new visit to Home starts on today
    _nbFlush('entry');
    _nb.date = null; _nb.preview = false; _nb.q = ''; _nb.dir = 0; _nb.selLine = null; _nb.pendingLine = null;
  }
  if (size === 's') { if (_nb.dirty) _nbFlush('size'); _nb.date = null; }       // S always writes to today
  const date = _nb.date || today;
  _nb.ctx = ctx;
  const card = document.createElement('section');
  card.className = `card home-card nb nb--${size}`;
  el.appendChild(card);
  card.appendChild(_nbHead(ctx, size, date, today));
  const body = document.createElement('div'); body.className = 'card-b nb-b';
  card.appendChild(body);
  if (size === 's') { _nbSmall(body, ctx, today); return true; }
  if (size === 'full') body.appendChild(_nbFullTop(ctx, date, today));
  const grid = document.createElement('div'); grid.className = 'nb-grid';
  body.appendChild(grid);
  const main = document.createElement('div'); main.className = 'nb-main';
  grid.appendChild(main);
  _nbEditor(main, ctx, date, today);
  if (size === 'l' || size === 'full') grid.appendChild(_nbSide(ctx, date, today));
  if (typeof homeSuggestSlot === 'function') homeSuggestSlot(body, ctx, { date });
  _nbAfterPaint(main);
  return true;
}

function _nbHead(ctx, size, date, today) {
  const h = document.createElement('div'); h.className = 'card-h nb-h';
  h.innerHTML = `${icon('notebook-pen')}<h3>Daily note</h3>`;
  if (size === 's') {
    const d = document.createElement('span'); d.className = 'nb-h-day'; d.textContent = _nbShort(today);
    h.appendChild(d);
  } else {
    const nav = document.createElement('div'); nav.className = 'nb-nav'; nav.setAttribute('role', 'group'); nav.setAttribute('aria-label', 'Choose the day');
    const prev = dnAddDays(date, -1), next = dnAddDays(date, 1);
    nav.appendChild(_nbBtn('btn-icon btn-sm nb-prev', icon('chevron-left'), { label: `Previous day: ${_nbLong(prev)}`, tip: 'Previous day', act: 'prev', run: () => _nbGo(prev) }));
    const lab = document.createElement('span'); lab.className = 'nb-day';
    const rel = _nbRel(date, today);
    lab.innerHTML = `${rel ? `<b>${esc(rel)}</b><span class="nb-day-sep"> · </span>` : ''}<span class="nb-day-d">${esc(size === 'm' ? _nbShort(date) : _nbLong(date))}</span>`;
    nav.appendChild(lab);
    const nx = _nbBtn('btn-icon btn-sm nb-next', icon('chevron-right'), { label: `Next day: ${_nbLong(next)}`, tip: 'Next day', act: 'next', run: () => _nbGo(next) });
    if (next > dnAddDays(today, 1)) { nx.disabled = true; nx.setAttribute('data-tip', 'Up to tomorrow'); }
    nav.appendChild(nx);
    const onToday = date === today;
    const tb = _nbBtn('btn btn-ghost btn-sm nb-today' + (onToday ? ' is-current' : ''), '<span>Today</span>', { act: 'today', run: () => _nbGo(todayStr()) });
    tb.setAttribute('aria-pressed', onToday ? 'true' : 'false');
    if (onToday) tb.setAttribute('aria-current', 'date');
    nav.appendChild(tb);
    h.appendChild(nav);
  }
  const sp = document.createElement('span'); sp.className = 'spacer'; h.appendChild(sp);
  if (typeof homeSettingsButton === 'function') h.appendChild(homeSettingsButton(ctx, 'Daily note settings'));
  return h;
}

/* ---------- S: the last line and Write ---------- */
function _nbSmall(body, ctx, today) {
  const last = document.createElement('div'); last.className = 'nb-last';
  _nbPaintLast(last, today);
  body.appendChild(last);
  const form = document.createElement('form'); form.className = 'nb-write'; form.setAttribute('autocomplete', 'off');
  const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'control nb-write-in';
  inp.dataset.fk = 'nb-write'; inp.maxLength = 500; inp.enterKeyHint = 'send';
  inp.placeholder = dnPlaceholder({ hour: Clock.parts().h, rel: 0 });
  inp.setAttribute('aria-label', `Write a line in the note for ${_nbLong(today)}`);
  inp.value = _nb.writeDraft;
  inp.oninput = () => { _nb.writeDraft = inp.value; };
  inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.onsubmit(e); } };
  const go = _nbBtn('btn btn-secondary btn-sm nb-write-go', `${icon('corner-down-left')}<span>Write</span>`, { tip: 'Adds the line with the time' });
  go.type = 'submit';
  form.append(inp, go);
  form.onsubmit = (e) => {
    e.preventDefault();
    const text = inp.value.trim();
    if (!text) return;                                        // nothing to write: a no-op
    const day = todayStr();
    const r = daynoteAppend(day, dnTimeLine(text, _nbNowHM()));
    if (!r.ok) { _nbFail(r.error); return; }
    inp.value = ''; _nb.writeDraft = '';
    if (_nb.ta && _nb.taDate === day && !_nb.dirty) _nbReconcile(day);
    _nbPaintLast(last, day, true);
    _nbSaved();
  };
  body.appendChild(form);
  const foot = document.createElement('div'); foot.className = 'nb-foot';
  const st = document.createElement('span'); st.className = 'nb-status';
  foot.appendChild(st); body.appendChild(foot);
  _nb.statusEl = st; _nb.countEl = null;
  _nbPaintStatus(false);
}
function _nbPaintLast(box, day, animate) {
  const line = dnLastLine(daynoteMd(day));
  const n = dnNorm(daynoteMd(day)).split('\n').filter(l => l.trim()).length;
  box.innerHTML = line
    ? `<span class="nb-last-k">${n === 1 ? 'Last line' : `Last of ${n} lines`}</span><span class="nb-last-t">${esc(dnShow(line))}</span>`
    : `<span class="nb-last-none">Nothing written today</span>`;
  if (animate) hglAnim(box.querySelector('.nb-last-t'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
}

/* ---------- M and up: the editor ---------- */
function _nbEditor(main, ctx, date, today) {
  const bar = document.createElement('div'); bar.className = 'nb-bar';
  const ins = _nbBtn('btn btn-ghost btn-sm nb-ins', `${icon('clock')}<span>Insert time</span>`, { act: 'time', label: 'Insert time', tip: 'Insert time (Alt+T)', run: () => _nbInsertTime() });
  ins.addEventListener('mousedown', (e) => e.preventDefault());       // the editor keeps focus (no blur, no extra save)
  if (_nb.preview) ins.disabled = true;
  const pv = _nbBtn('btn btn-ghost btn-sm nb-pv' + (_nb.preview ? ' is-on' : ''), `${icon('eye')}<span>Preview</span>`, {
    act: 'preview', label: 'Preview', tip: _nb.preview ? 'Back to editing' : 'See it formatted; checkbox lines can become tasks',
    run: () => { _nbFlush('preview'); _nb.preview = !_nb.preview; _nb.focused = false; _nbRerender(); },
  });
  pv.setAttribute('aria-pressed', _nb.preview ? 'true' : 'false');
  const cp = _nbBtn('btn btn-ghost btn-sm nb-copy', `${icon('copy')}<span>Copy day</span>`, { act: 'copy', label: 'Copy day', tip: "Copy the day's markdown" });
  cp.onclick = () => _nbCopy(cp, date);
  const st = document.createElement('span'); st.className = 'nb-status';
  bar.append(ins, pv, cp, st);
  main.appendChild(bar);
  const surf = document.createElement('div'); surf.className = 'nb-surface';
  if (_nb.preview) surf.appendChild(_nbPreview(date));
  else surf.appendChild(_nbTextarea(date, today));
  main.appendChild(surf);
  const count = document.createElement('div'); count.className = 'nb-count'; count.setAttribute('aria-live', 'off');
  main.appendChild(count);
  _nb.statusEl = st; _nb.countEl = count;
  _nbPaintStatus(false);
  _nbCount();
  if (_nb.dir) {                                            // a day change the user asked for: the page turns once
    hglAnim(surf, [{ opacity: 0, transform: `translateX(${_nb.dir * 14}px)` }, { opacity: 1, transform: 'none' }], { duration: 220 });
    _nb.dir = 0;
  }
}

function _nbTextarea(date, today) {
  let ta = _nb.ta;
  if (!ta) {
    ta = document.createElement('textarea');
    ta.className = 'control nb-ta'; ta.dataset.fk = 'nb-editor'; ta.maxLength = DAYNOTE_MAX; ta.spellcheck = true; ta.rows = 9;
    ta.addEventListener('input', _nbOnInput);
    ta.addEventListener('focus', () => { _nb.focused = true; _nbKeepSel(); });
    // Taken out by a Home re-render, Chrome sends a late blur after the node is back and
    // focused again: that is not a real blur (no save, focus stays remembered).
    ta.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement === ta) return;
        _nb.focused = false; _nbFlush('blur');
      }, 0);
    });
    for (const ev of ['select', 'keyup', 'mouseup']) ta.addEventListener(ev, _nbKeepSel);
    ta.addEventListener('scroll', () => { _nb.scroll = ta.scrollTop; }, { passive: true });
    ta.addEventListener('keydown', _nbKey);
    _nb.ta = ta; _nb.taDate = null;
  }
  if (_nb.taDate !== date) _nbLoad(date, today);
  else _nbReconcile(date);
  const rel = date === today ? 0 : date < today ? -1 : 1;
  ta.placeholder = dnPlaceholder({ hour: Clock.parts().h, rel });
  ta.setAttribute('aria-label', `Daily note for ${_nbLong(date)}`);
  return ta;
}
/** Put a day into the editor (the previous day is saved first). */
function _nbLoad(date, today) {
  if (_nb.taDate && _nb.dirty) _nbFlush('switch');
  const ta = _nb.ta;
  const md = daynoteMd(date);
  const tplRaw = (_nbPrefs().template || '').trim();
  const tpl = !md && tplRaw && date >= today ? dnTemplate(tplRaw, _nbLong(date)) : '';
  ta.value = md || tpl;
  _nb.taDate = date; _nb.base = md; _nb.start = ta.value; _nb.tpl = !md && !!tpl; _nb.dirty = false;
  _nb.failed = ''; _nb.savedAt = 0; _nb.scroll = 0;
  const end = ta.value.length;
  _nb.sel = [end, end, 'none'];
  try { ta.setSelectionRange(end, end); } catch (e) { /* detached */ }
  ta.scrollTop = 0;
}
/** The store changed this day behind the editor (Undo, another tab, an assistant): take it in. */
function _nbReconcile(date) {
  const stored = daynoteMd(date);
  if (stored === _nb.base) return;
  const ta = _nb.ta;
  if (!_nb.dirty) {
    _nbSetQuiet(stored);
    _nb.base = _nb.start = stored; _nb.tpl = false; _nb.dirty = false;
    clearTimeout(_nb.timer); _nb.timer = 0;
    return;
  }
  const merged = dnMerge3(_nb.base, ta.value, stored);
  if (merged !== ta.value) _nbSetQuiet(merged);
  _nb.base = stored; _nb.start = stored; _nb.tpl = false;
  _nb.dirty = merged !== stored;
  if (_nb.dirty) _nbSchedule(); else { clearTimeout(_nb.timer); _nb.timer = 0; }
}
/** Replace the editor's text without moving the caret further than it must. */
function _nbSetQuiet(v) {
  const ta = _nb.ta;
  const s = Math.min(ta.selectionStart, v.length), e = Math.min(ta.selectionEnd, v.length);
  ta.value = v;
  try { ta.setSelectionRange(s, e); } catch (err) { /* detached */ }
  _nb.sel = [s, e, 'none'];
}
function _nbKeepSel() {
  const ta = _nb.ta; if (!ta) return;
  _nb.sel = [ta.selectionStart, ta.selectionEnd, ta.selectionDirection || 'none'];
  _nb.scroll = ta.scrollTop;
}
/** After a paint: the editor gets its focus, caret and scroll back; a search hit gets selected. */
function _nbAfterPaint() {
  const ta = _nb.ta;
  if (!ta || !ta.isConnected || _nb.preview) return;
  if (_nb.pendingLine != null) {
    const line = _nb.pendingLine; _nb.pendingLine = null;
    const lines = ta.value.split('\n');
    if (line < lines.length) {
      let s = 0; for (let i = 0; i < line; i++) s += lines[i].length + 1;
      try { ta.focus({ preventScroll: true }); ta.setSelectionRange(s, s + lines[line].length); } catch (e) { /* gone */ }
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      ta.scrollTop = Math.max(0, line * lh - ta.clientHeight / 3);
      _nbKeepSel();
      return;
    }
  }
  if (_nb.focused && document.activeElement !== ta) {
    try { ta.focus({ preventScroll: true }); } catch (e) { /* gone */ }
    if (_nb.sel) try { ta.setSelectionRange(_nb.sel[0], _nb.sel[1], _nb.sel[2]); } catch (e) { /* gone */ }
  }
  ta.scrollTop = _nb.scroll;
}

function _nbOnInput() {
  const ta = _nb.ta; if (!ta) return;
  _nb.lastInput = Date.now();
  _nb.dirty = ta.value !== _nb.start;
  _nbKeepSel();
  _nbCount();
  if (_nb.statusEl) _nb.statusEl.classList.toggle('is-stale', _nb.dirty);
  _nbSchedule();
}
function _nbSchedule() {
  clearTimeout(_nb.timer); _nb.timer = 0;
  if (!_nb.dirty) return;
  const ms = dnSaveDelay({ now: Date.now(), lastInput: _nb.lastInput, lastSave: _nb.lastSave, focused: _nb.focused });
  _nb.timer = setTimeout(() => { _nb.timer = 0; _nbFlush('auto'); }, ms);
}
/** Save the editor now if it has changes. -> false when the save was refused. */
function _nbFlush(why) {
  clearTimeout(_nb.timer); _nb.timer = 0;
  const ta = _nb.ta;
  if (!ta || !_nb.taDate || !_nb.dirty) return true;
  const date = _nb.taDate;
  let md = ta.value;
  const stored = daynoteMd(date);
  if (stored !== _nb.base) {                               // changed elsewhere meanwhile: their lines come in too
    md = dnMerge3(_nb.base, md, stored);
    if (md !== ta.value) _nbSetQuiet(md);
  }
  const r = daynoteSet(date, md);
  if (!r.ok) { _nbFail(r.error); return false; }
  _nb.base = _nb.start = md; _nb.tpl = false; _nb.dirty = false; _nb.lastSave = Date.now();
  if (r.changed) _nbSaved(); else _nbPaintStatus(false);
  if (why !== 'leave' && why !== 'exit' && why !== 'hide') _nbPaintSideTasks();
  return true;
}
function _nbSaved() {
  _nb.savedAt = Date.now(); _nb.failed = ''; _nb.fresh = true;
  _nbPaintStatus(true);
}
function _nbFail(msg) {
  _nb.failed = msg || 'The note could not be saved.';
  _nbPaintStatus(false);
  // Announced (role=alert); a successful save is not.
  toast(`Daily note not saved: ${_nb.failed}`, { kind: 'err' });
}
function _nbPaintStatus(fresh) {
  const st = _nb.statusEl;
  if (!st || !st.isConnected) return;
  st.classList.remove('is-fresh', 'is-err', 'is-stale');
  if (_nb.failed) { st.classList.add('is-err'); st.innerHTML = `${icon('circle-alert')}<span>Not saved</span>`; st.title = _nb.failed; return; }
  st.title = '';
  if (!_nb.savedAt) { st.textContent = ''; return; }
  const d = Clock.parts(new Date(_nb.savedAt).getTime());   // the time on the page's clock
  const off = typeof _serverAvailable !== 'undefined' && !_serverAvailable;
  st.innerHTML = `${icon('check')}<span>Saved ${esc(dnHM(d.h * 60 + d.mi))}${off ? ' in this browser' : ''}</span>`;
  if (fresh) { void st.offsetWidth; st.classList.add('is-fresh'); }
  if (_nb.dirty) st.classList.add('is-stale');
}
function _nbCount() {
  const c = _nb.countEl; if (!c || !c.isConnected) return;
  const n = _nb.ta && !_nb.preview ? _nb.ta.value.length : daynoteMd(_nb.date || todayStr()).length;
  const show = n > DAYNOTE_MAX * 0.8;
  c.hidden = !show;
  c.classList.toggle('is-warn', n > DAYNOTE_MAX * 0.95);
  c.textContent = show ? `${n.toLocaleString(_nbLoc())} of ${DAYNOTE_MAX.toLocaleString(_nbLoc())} characters` : '';
}

/* ---------- editor keys and inserts ---------- */
function _nbKey(e) {
  if (e.isComposing || e.keyCode === 229) return;
  const ta = _nb.ta;
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
    const r = dnEnterContinue(ta.value, ta.selectionStart, ta.selectionEnd);
    if (r && r.value.length <= DAYNOTE_MAX) { e.preventDefault(); _nbReplace(r.value, r.caret); }
    return;
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && String(e.key).toLowerCase() === 't') { e.preventDefault(); _nbInsertTime(); return; }
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && String(e.key).toLowerCase() === 's') { e.preventDefault(); e.stopPropagation(); _nbFlush('key'); }
}
/**
 * Change the editor's text the way typing would, so the browser's own Undo (Ctrl+Z
 * in the editor) still works: only the changed middle is replaced.
 */
function _nbReplace(next, caret) {
  const ta = _nb.ta, cur = ta.value;
  if (next !== cur) {
    let a = 0; while (a < cur.length && a < next.length && cur[a] === next[a]) a++;
    let b = 0; while (b < cur.length - a && b < next.length - a && cur[cur.length - 1 - b] === next[next.length - 1 - b]) b++;
    const ins = next.slice(a, next.length - b);
    if (document.activeElement !== ta) try { ta.focus({ preventScroll: true }); } catch (e) { /* gone */ }
    ta.setSelectionRange(a, cur.length - b);
    let ok = false;
    try { ok = document.execCommand(ins ? 'insertText' : 'delete', false, ins); } catch (e) { ok = false; }
    if (!ok || ta.value !== next) { ta.value = next; _nbOnInput(); }
  }
  try { ta.setSelectionRange(caret, caret); } catch (e) { /* gone */ }
  _nbKeepSel();
}
function _nbInsertTime() {
  const ta = _nb.ta;
  if (!ta || _nb.preview || !ta.isConnected) return;
  const r = dnInsertTime(ta.value, ta.selectionStart, ta.selectionEnd, _nbNowHM());
  if (r.value.length > DAYNOTE_MAX) { _nbFail(dnCheck(r.value)); return; }
  _nbReplace(r.value, r.caret);
}
async function _nbCopy(btn, date) {
  const md = _nb.ta && _nb.taDate === date ? _nb.ta.value : daynoteMd(date);
  if (!md.trim()) { toast('Nothing written on this day yet', {}); return; }
  try {
    await navigator.clipboard.writeText(md);
    btn.innerHTML = `${icon('check')}<span>Copied</span>`; btn.classList.add('is-done');
    if (typeof homeAnnounce === 'function') homeAnnounce('Copied the note');
    setTimeout(() => { if (btn.isConnected) { btn.innerHTML = `${icon('copy')}<span>Copy day</span>`; btn.classList.remove('is-done'); } }, 1600);
  } catch (e) { toast('Could not copy the note', { kind: 'err' }); }
}

/* ---------- day navigation (writes nothing) ---------- */
function _nbGo(date, o) {
  o = o || {};
  const today = todayStr();
  const cur = _nb.date || today;
  if (date === cur && o.line == null) return;              // re-selecting the day shown is a no-op
  if (date > dnAddDays(today, 1)) return;
  _nbFlush('switch');
  _nb.dir = date > cur ? 1 : date < cur ? -1 : 0;
  _nb.date = date === today ? null : date;
  _nb.pendingLine = o.line != null ? o.line : null;
  _nb.selLine = o.line != null ? o.line : null;
  _nbRerender();
}

/* ---------- Preview and Make task ---------- */
function _nbPreview(date) {
  const box = document.createElement('div'); box.className = 'nb-preview';
  const md = daynoteMd(date);
  if (!md.trim()) {
    box.innerHTML = `<p class="nb-none">Nothing written ${date === todayStr() ? 'today' : 'on this day'} yet. Switch to Edit to start.</p>`;
    return box;
  }
  const lines = dnNorm(md).split('\n');
  let chunk = [];
  const flush = () => {
    if (!chunk.length) return;
    const d = document.createElement('div'); d.className = 'md nb-md';
    d.innerHTML = renderMarkdown(chunk.join('\n'));
    box.appendChild(d); chunk = [];
  };
  const open = new Map(dnTasks(md).filter(t => !t.done || t.made).map(t => [t.line, t]));   // open lines (Make task) and made ones (a chip)
  lines.forEach((raw, i) => {
    if (open.has(i)) { flush(); box.appendChild(_nbTodoRow(date, open.get(i))); }
    else chunk.push(raw);
  });
  flush();
  _nbRowKeys(box);
  return box;
}
function _nbKeyOf(date, t) { return `${date}|${t.line}|${t.text}`; }
/** The task card is open in create mode for this line (Make task pressed before). */
function _nbCardFor(key) {
  try {
    if (typeof _tc === 'undefined' || !_tc || _tc.closing || typeof _tcCur !== 'function') return false;
    const c = _tcCur();
    return !!(c && c.kind === 'create' && c.draft && c.draft.onCreated && c.draft.onCreated.nbKey === key);
  } catch (e) { return false; }
}
function _nbTodoRow(date, t) {
  const key = _nbKeyOf(date, t);
  const row = document.createElement('div');
  row.className = 'nb-todo' + (t.made ? ' is-made' : t.done ? ' is-done' : '');
  row.dataset.key = key;
  const title = dnTaskTitle(t.text);
  row.innerHTML = `${icon(t.done ? 'square-check-big' : 'square', _NB_TODO_IC)}<span class="nb-todo-t">${esc(title)}</span>`;
  if (t.made) {
    const chip = document.createElement('span'); chip.className = 'nb-made'; chip.textContent = 'Task made';
    row.appendChild(chip);
  } else if (!t.done) {
    row.setAttribute('data-row', key); row.tabIndex = 0;
    row.setAttribute('aria-label', `${title}. Enter: make a task from it. X: add it as a task now.`);
    const acts = document.createElement('span'); acts.className = 'nb-todo-acts';
    const mk = _nbBtn('btn btn-secondary btn-sm nb-make', `${icon('circle-plus')}<span>Make task</span>`, {
      act: 'make', tip: 'Opens a new task filled in with this line; Save adds it',
    });
    mk.setAttribute('aria-label', `Make a task from: ${title}`);
    mk.onclick = () => _nbMakeTask(date, t, mk, row);
    const ok = _nbBtn('btn-icon btn-sm nb-quick', icon('check'), { act: 'quick', label: `Add as a task now: ${title}`, tip: 'Add it now (Undo in the message)' });
    ok.onclick = () => _nbQuickTask(date, t, ok);
    acts.append(mk, ok);
    row.appendChild(acts);
    row._nbMake = () => mk.click();
    row._nbQuick = () => ok.click();
    if (_nbCardFor(key)) row.setAttribute('aria-current', 'true');
    row.addEventListener('focusin', () => { if (!_nbCardFor(key)) row.removeAttribute('aria-current'); });
  }
  if (_nb.justMade && _nb.justMade === `${date}|${t.text}` && t.made) {
    _nb.justMade = null;
    row.classList.add('is-just-made');                    // a one-off flash (13-home-w-notebook.css; none under reduced motion)
  }
  return row;
}
function _nbRowKeys(box) {
  if (typeof homeRowKeys !== 'function') return;
  homeRowKeys(box, {
    open: (id, row) => { if (row && row._nbMake) row._nbMake(); },
    done: (id, row) => { if (row && row._nbQuick) row._nbQuick(); },
  });
}
/** Make task (the main click): the task card, filled in; its Save adds the task and ticks the line. */
function _nbMakeTask(date, t, btn, row) {
  const key = _nbKeyOf(date, t);
  if (_nbCardFor(key)) { if (typeof _tcFocusStart === 'function') _tcFocusStart(); return; }   // pressed again: the edits stay
  _nbFlush('make');
  const onCreated = (id) => { _nbMark(date, t, true); };
  onCreated.nbKey = key;
  for (const el of document.querySelectorAll('.nb-todo[aria-current="true"]')) el.removeAttribute('aria-current');
  if (row) row.setAttribute('aria-current', 'true');
  if (typeof tcOpenCreate === 'function') tcOpenCreate({ title: dnTaskTitle(t.text), detail: `From the daily note for ${_nbLong(date)}.`, onCreated }, { from: btn });
  else if (typeof openNewTask === 'function') openNewTask(dnTaskTitle(t.text), { from: btn });
}
/** ✓: the task as it is, now; the line is ticked in the same undo step. */
function _nbQuickTask(date, t, btn) {
  return homeAction(btn, () => {
    _nbFlush('make');
    let id = null;
    selUndoGroup(() => {
      id = addTaskFromText(dnTaskTitle(t.text));
      if (id) _nbMark(date, t, false);
    });
    return id ? true : false;
  }, { done: 'Added', toast: 'Task added from your note', undo: true, say: 'Task added' });
}
/** Tick the line ('- [x] text (task)'). fold: merge this save into the task's own undo step. */
function _nbMark(date, t, fold) {
  const next = dnMarkTask(daynoteMd(date), t.line, t.text);
  if (next == null) return false;                         // the line is gone: the task stays, nothing to tick
  const mid = fold && typeof _dataSnapshot === 'function' ? _dataSnapshot() : null;
  const r = daynoteSet(date, next);
  if (!r.ok) { _nbFail(r.error); return false; }
  if (mid !== null && Array.isArray(_undoStack) && _undoStack.length && _undoStack[_undoStack.length - 1] === mid) _undoStack.pop();
  _nb.justMade = `${date}|${t.text}`;
  if (_nb.ta && _nb.taDate === date && !_nb.dirty) _nbReconcile(date);
  if (state.view === 'home') _nbRerender();
  return true;
}

/* ---------- L and Full: the side column ---------- */
function _nbSide(ctx, date, today) {
  const side = document.createElement('aside'); side.className = 'nb-side'; side.setAttribute('aria-label', 'Around this day');
  const tasksSec = document.createElement('section'); tasksSec.className = 'nb-sec nb-sec-tasks';
  side.appendChild(tasksSec);
  _nbPaintSideTasks(tasksSec, date, today);
  // Yesterday (folded): the day before the one shown.
  const y = dnAddDays(date, -1), ymd = daynoteMd(y);
  const det = document.createElement('details'); det.className = 'nb-sec nb-sec-y'; det.open = _nb.yOpen;
  det.innerHTML = `<summary>${icon('chevron-right', _NB_CHEV)}<span class="nb-sec-h">${esc(date === today ? 'Yesterday' : 'The day before')}</span><span class="nb-sec-d">${esc(_nbShort(y))}${ymd.trim() ? '' : ' · nothing written'}</span></summary>`;
  const yb = document.createElement('div'); yb.className = 'nb-sec-b';
  if (ymd.trim()) {
    const md = document.createElement('div'); md.className = 'md nb-md nb-md-sm';
    md.innerHTML = renderMarkdown(dnNorm(ymd).split('\n').slice(0, 40).join('\n'));
    yb.appendChild(md);
  } else yb.innerHTML = '<p class="nb-none">Nothing was written that day.</p>';
  yb.appendChild(_nbBtn('btn btn-ghost btn-sm nb-goto', `<span>Go to ${esc(_nbShort(y))}</span>${icon('arrow-right')}`, { act: 'goto-y', run: () => _nbGo(y) }));
  det.appendChild(yb);
  det.addEventListener('toggle', () => { _nb.yOpen = det.open; });
  side.appendChild(det);
  // On this day: the same date last month and last year, when there is a note.
  if (_nbPrefs().onThisDay !== false) {
    const o = dnOnThisDay(date);
    const items = [['A month ago', o.month], ['A year ago', o.year]].filter(([, d]) => daynoteMd(d).trim());
    if (items.length) {
      const sec = document.createElement('section'); sec.className = 'nb-sec nb-sec-otd';
      sec.innerHTML = `<h4 class="nb-sec-h">${icon('history')}<span>On this day</span></h4>`;
      for (const [label, d] of items) {
        const lines = dnNorm(daynoteMd(d)).split('\n').map(dnShow).filter(Boolean).slice(0, 2);
        const b = _nbBtn('nb-otd', `<span class="nb-otd-k">${esc(label)} · ${esc(_nbShort(d))}</span>${lines.map(l => `<span class="nb-otd-t">${esc(l)}</span>`).join('')}`, { act: 'otd', run: () => _nbGo(d) });
        b.setAttribute('aria-label', `${label}, ${_nbLong(d)}: open that day's note`);
        sec.appendChild(b);
      }
      side.appendChild(sec);
    }
  }
  return side;
}
/** "Tasks in this note": the checkbox lines of the day shown (repainted in place after a save). */
function _nbPaintSideTasks(sec, date, today) {
  if (!sec) {                                             // after a save: the one on screen, if any
    sec = typeof document !== 'undefined' && document.querySelector ? document.querySelector('#main-body .hg-w[data-wid="notebook"] .nb-sec-tasks') : null;
    if (!sec || _nb.preview) return;
  }
  date = date || _nb.date || todayStr(); today = today || todayStr();
  const tasks = dnTasks(daynoteMd(date));
  const open = tasks.filter(t => !t.done).length;
  sec.innerHTML = `<h4 class="nb-sec-h">${icon('list-todo')}<span>${esc(date === today ? "Tasks in today's note" : 'Tasks in this note')}</span>${open ? `<span class="nb-sec-n">${open}</span>` : ''}</h4>`;
  if (!tasks.length) {
    const p = document.createElement('p'); p.className = 'nb-none';
    p.innerHTML = 'Start a line with <code>- [ ]</code> and it can become a task.';
    sec.appendChild(p);
    return;
  }
  const list = document.createElement('div'); list.className = 'nb-todos';
  for (const t of tasks.slice(0, 12)) list.appendChild(_nbTodoRow(date, t));
  sec.appendChild(list);
  _nbRowKeys(list);
}

/* ---------- Full: the last 30 days and search ---------- */
function _nbFullTop(ctx, date, today) {
  const top = document.createElement('div'); top.className = 'nb-top';
  const strip = document.createElement('div'); strip.className = 'nb-strip'; strip.setAttribute('role', 'group'); strip.setAttribute('aria-label', 'The last 30 days');
  const have = new Set(daynoteDates());
  const days = dnStrip(today, 30);
  for (const d of days) {
    const dt = _nbDate(d);
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'nb-dd' + (have.has(d) ? ' has-note' : '') + (d === today ? ' is-today' : '') + (d === date ? ' is-current' : '') + (dt.getDay() === 1 ? ' is-mon' : '');   // clock-ok: wall date
    b.dataset.date = d;
    b.innerHTML = `<span class="nb-dd-w">${esc(dt.toLocaleDateString(_nbLoc(), { weekday: 'narrow' }))}</span><span class="nb-dd-n">${dt.getDate()}</span><span class="nb-dd-dot" aria-hidden="true"></span>`;   // clock-ok: wall date
    b.setAttribute('aria-label', `${_nbLong(d)}${have.has(d) ? ', has a note' : ''}`);
    if (d === date) b.setAttribute('aria-current', 'date');
    b.onclick = () => _nbGo(d);
    strip.appendChild(b);
  }
  top.appendChild(strip);
  if (ctx.firstPaint) [...strip.querySelectorAll('.has-note .nb-dd-dot')].forEach((el, i) => hglAnim(el, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 300, delay: 260 + i * 18 }));
  // keep the current day in view (the strip scrolls on a phone)
  requestAnimationFrame(() => { const cur = strip.querySelector('.is-current'); if (cur && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = Math.max(0, cur.offsetLeft - strip.clientWidth / 2); });
  const search = document.createElement('div'); search.className = 'nb-search';
  const field = document.createElement('label'); field.className = 'input input-sm nb-search-f';
  field.innerHTML = icon('search');
  const inp = document.createElement('input'); inp.type = 'search'; inp.className = 'nb-search-in';
  inp.dataset.fk = 'nb-search'; inp.placeholder = 'Search every note'; inp.setAttribute('aria-label', 'Search every daily note');
  inp.value = _nb.q; inp.maxLength = 200;
  field.appendChild(inp);
  const res = document.createElement('div'); res.className = 'nb-results';
  // The hits float over the side column while the search has focus; picking one closes them.
  inp.oninput = () => { _nb.q = inp.value; _nb.searchOpen = true; _nbPaintResults(res); };
  inp.onfocus = () => { if (!_nb.searchOpen && _nb.q.trim()) { _nb.searchOpen = true; _nbPaintResults(res); } };
  inp.onkeydown = (e) => {
    if (e.key !== 'Escape' || (!inp.value && !_nb.searchOpen)) return;
    e.preventDefault(); e.stopPropagation();
    if (inp.value) { inp.value = ''; _nb.q = ''; }
    _nb.searchOpen = false; _nbPaintResults(res);
  };
  search.addEventListener('focusout', (e) => {
    if (e.relatedTarget && search.contains(e.relatedTarget)) return;
    setTimeout(() => { if (!search.isConnected || search.contains(document.activeElement)) return; _nb.searchOpen = false; _nbPaintResults(res); }, 0);
  });
  search.append(field, res);
  top.appendChild(search);
  _nbPaintResults(res);
  return top;
}
function _nbPaintResults(box) {
  const q = _nb.q.trim();
  box.innerHTML = '';
  box.hidden = !q || !_nb.searchOpen;
  if (box.hidden) return;
  const notes = Object.assign({}, state.daynotes || {});
  if (_nb.ta && _nb.taDate && _nb.dirty) notes[_nb.taDate] = { md: _nb.ta.value };   // what is on screen counts
  const hits = dnSearch(notes, q, { limit: 30, perDay: 3 });
  if (!hits.length) { box.innerHTML = `<p class="nb-none">No note mentions “${esc(q)}”.</p>`; return; }
  const head = document.createElement('div'); head.className = 'nb-res-h';
  head.textContent = `${hits.length}${hits.length >= 30 ? '+' : ''} line${hits.length === 1 ? '' : 's'}`;
  box.appendChild(head);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = _nb.date || todayStr();
  for (const h of hits) {
    const cur = h.date === shown && h.line === _nb.selLine;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'nb-res' + (cur ? ' is-current' : '');
    b.innerHTML = `<span class="nb-res-d">${esc(_nbShort(h.date))}</span><span class="nb-res-t">${_nbMarkWords(dnShow(h.text) || h.text, words)}</span>`;
    if (cur) b.setAttribute('aria-current', 'true');
    b.onclick = () => { if (b.getAttribute('aria-current') === 'true') return; _nb.searchOpen = false; _nbGo(h.date, { line: h.line }); };
    box.appendChild(b);
  }
}
function _nbMarkWords(text, words) {
  const low = text.toLowerCase();
  const hits = [];
  for (const w of words) { let i = low.indexOf(w); while (i >= 0) { hits.push([i, i + w.length]); i = low.indexOf(w, i + w.length); } }
  hits.sort((a, b) => a[0] - b[0]);
  let out = '', at = 0;
  for (const [s, e] of hits) { if (s < at) continue; out += esc(text.slice(at, s)) + `<mark>${esc(text.slice(s, e))}</mark>`; at = e; }
  return out + esc(text.slice(at));
}

/* ---------- settings ---------- */
function _nbSettings(anchor, ctx) {
  if (typeof openPopover !== 'function') return;
  openPopover(anchor, (el) => {
    el.classList.add('hg-set', 'nb-set');
    const p = homePrefs(ctx);
    el.innerHTML = `<div class="hg-set-h">${icon('notebook-pen')}<b>Daily note settings</b></div>`;
    const row = document.createElement('div'); row.className = 'hg-set-row';
    row.innerHTML = '<div class="hg-set-l"><span>On this day</span><small>Large: the same date last month and last year</small></div>';
    const sw = document.createElement('button'); sw.type = 'button'; sw.className = 'switch' + (p.onThisDay !== false ? ' on' : '');
    sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', p.onThisDay !== false ? 'true' : 'false'); sw.setAttribute('aria-label', 'On this day');
    sw.onclick = () => {
      const on = sw.getAttribute('aria-checked') !== 'true';
      if (homeSetPrefs(ctx, { onThisDay: on ? null : false })) { sw.classList.toggle('on', on); sw.setAttribute('aria-checked', on ? 'true' : 'false'); }
    };
    row.appendChild(sw);
    el.appendChild(row);
    const t = document.createElement('div'); t.className = 'nb-set-tpl';
    t.innerHTML = '<label class="hg-set-l" for="nb-set-tpl"><span>New day template</span><small>A new day starts with this. {date} becomes the day.</small></label>';
    const ta = document.createElement('textarea'); ta.id = 'nb-set-tpl'; ta.className = 'control nb-set-ta'; ta.rows = 5; ta.maxLength = 2000;
    ta.placeholder = '## Plan\n- [ ] \n\n## Learned\n- ';
    ta.value = p.template || '';
    const save = () => {
      const v = dnNorm(ta.value).replace(/\s+$/, '');
      if (v === (homePrefs(ctx).template || '')) return;
      homeSetPrefs(ctx, { template: v ? v : null });
      msg.textContent = v ? 'Template saved' : 'Template cleared';
    };
    ta.onchange = save;
    const acts = document.createElement('div'); acts.className = 'nb-set-acts';
    const use = _nbBtn('btn btn-ghost btn-sm', `${icon('copy')}<span>Use today's note</span>`, { run: () => { const md = daynoteMd(todayStr()); if (!md.trim()) { msg.textContent = 'Nothing written today yet'; return; } ta.value = md.slice(0, 2000); save(); } });
    const msg = document.createElement('span'); msg.className = 'nb-set-msg'; msg.setAttribute('role', 'status');
    acts.append(use, msg);
    t.append(ta, acts);
    el.appendChild(t);
  }, { width: 340, align: 'end', className: 'hg-set-pop' });
}

/* ---------- the gallery preview: sample content, nothing live ---------- */
function _nbRenderSample(el, ctx, size) {
  const md = String((typeof homeSample === 'function' && homeSample('note')) || '- 09:10 Tried the new outline.\n- [ ] Ask Sam about the figures');
  const today = todayStr();
  const card = document.createElement('section'); card.className = `card home-card nb nb--${size} is-sample`;
  card.innerHTML = `<div class="card-h nb-h">${icon('notebook-pen')}<h3>Daily note</h3><span class="nb-h-day">${esc(size === 's' ? _nbShort(today) : 'Today · ' + _nbShort(today))}</span><span class="spacer"></span></div>`;
  const body = document.createElement('div'); body.className = 'card-b nb-b';
  card.appendChild(body); el.appendChild(card);
  if (size === 's') {
    body.innerHTML = `<div class="nb-last"><span class="nb-last-k">Last line</span><span class="nb-last-t">${esc(dnShow(dnLastLine(md.split('\n').filter(l => !/\[ \]/.test(l)).join('\n'))))}</span></div>`
      + `<div class="nb-write"><input class="control nb-write-in" disabled placeholder="${escAttr(dnPlaceholder({ hour: Clock.parts().h, rel: 0 }))}" aria-label="Write (preview)"><span class="btn btn-secondary btn-sm nb-write-go" aria-hidden="true">${icon('corner-down-left')}<span>Write</span></span></div>`;
    return true;
  }
  const grid = document.createElement('div'); grid.className = 'nb-grid'; body.appendChild(grid);
  const main = document.createElement('div'); main.className = 'nb-main';
  main.innerHTML = `<div class="nb-bar"><span class="btn btn-ghost btn-sm" aria-hidden="true">${icon('clock')}<span>Insert time</span></span><span class="btn btn-ghost btn-sm" aria-hidden="true">${icon('eye')}<span>Preview</span></span></div>`
    + `<div class="nb-surface"><div class="control nb-ta nb-ta-sample">${esc(md)}</div></div>`;
  grid.appendChild(main);
  if (size === 'l' || size === 'full') {
    const side = document.createElement('aside'); side.className = 'nb-side';
    const todos = dnTasks(md).map(t => `<div class="nb-todo">${icon('square', _NB_TODO_IC)}<span class="nb-todo-t">${esc(dnTaskTitle(t.text))}</span><span class="nb-todo-acts"><span class="btn btn-secondary btn-sm nb-make" aria-hidden="true">${icon('circle-plus')}<span>Make task</span></span></span></div>`).join('');
    side.innerHTML = `<section class="nb-sec"><h4 class="nb-sec-h">${icon('list-todo')}<span>Tasks in today's note</span></h4>${todos}</section>`;
    grid.appendChild(side);
  }
  return true;
}
