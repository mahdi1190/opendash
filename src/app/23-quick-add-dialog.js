/* ============================================================
   QUICK ADD, EVERYWHERE (owner: Command bar / quick add)
   The parser, the per-view defaults and task creation are the Tasks area's
   (22-quick-add.js: parseQuickAdd, quickAddDefaults, addParsedTask); the
   inline box on task lists is theirs too (31-task-views.js). This file adds:
     openQuickAddDialog(prefill?, {multi})  the same natural-language entry from
                    any page (Q, Ctrl+/, the palette's "New task", More > Add
                    several tasks), with live chips, # @ + autocomplete and
                    one task per line
     multi-line paste into the inline box opens the dialog with every line
     quickAddLines(text, view) -> [ids]     several tasks at once (one Undo)
   ============================================================ */

/** Split pasted text into task lines (bullets, numbers and checkboxes dropped). */
function qaSplitLines(text) {
  return String(text || '').split(/\r?\n/)
    .map(l => l.replace(/^\s*(?:[-*•–]|\d+[.)])\s+/, '').replace(/^\s*\[[ xX]?\]\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Create one task per line with the view's defaults. Returns the new ids.
 * opts: {ignore: [raw tokens kept as text] (single line only)}
 */
function quickAddLines(text, view, opts) {
  opts = opts || {};
  const lines = qaSplitLines(text).slice(0, 200);
  const defaults = typeof quickAddDefaults === 'function' ? quickAddDefaults(view || state.view) : {};
  const ids = [];
  for (const line of lines) {
    const parsed = parseQuickAdd(line, lines.length === 1 && opts.ignore ? { ignore: opts.ignore } : undefined);
    if (!parsed.title) continue;
    const id = typeof addParsedTask === 'function'
      ? addParsedTask(parsed, defaults)
      : addCustomTask(parsed.title, parsed.dueDate || defaults.dueDate, parsed.priority, parsed.tags, parsed.stream || defaults.stream, parsed.recurrence || 'none');
    if (id) ids.push(id);
  }
  return ids;
}

function _qadAnnounce(ids, undoSteps) {
  if (!ids.length) return;
  if (ids.length > 1) {
    toast(`Added ${ids.length} tasks`, { kind: 'ok', action: { label: 'Undo', run: () => { for (let i = 0; i < undoSteps; i++) undo(); } } });
    return;
  }
  const it = getItem(ids[0]);
  if (!it) return;
  const visible = typeof matchesView === 'function' && isTaskView(state.view) ? matchesView(it, state.view) : false;
  const home = typeof homeViewForTask === 'function' ? homeViewForTask(it) : 'all';
  const open = (tid) => (typeof openTask === 'function' ? openTask(tid) : selectTask(tid));   // centre card or side panel
  if (visible) { toast('Task added', { kind: 'ok', action: { label: 'Open', run: () => open(it.id) } }); return; }
  toast(`Added to ${typeof viewTitle === 'function' ? viewTitle(home) : 'your tasks'}`, {
    kind: 'ok', action: { label: 'Show', run: () => { setView(home); open(it.id); } },
  });
}

const _QAD_ICON = { date: 'calendar', time: 'clock', priority: 'flag', tag: 'hash', stream: 'circle', person: 'at-sign', repeat: 'repeat', estimate: 'timer' };
/** Chip markup for a parse result (escaped). removable: the chip's x keeps the word as text. */
const _QAD_ORDER = ['date', 'time', 'repeat', 'priority', 'stream', 'tag', 'person', 'estimate'];
/** Tags already in use (or registered): a tag outside this set is shown as new, to keep tags tidy. */
function _qadKnownTags() {
  const s = new Set();
  for (const it of getAllItems()) for (const t of effTags(it)) s.add(String(t).toLowerCase());
  for (const e of (Array.isArray(state.tagRegistry) ? state.tagRegistry : [])) s.add(String(typeof e === 'string' ? e : (e && e.id) || '').toLowerCase());
  return s;
}
function _qadChips(parsed, removable, known) {
  const toks = [...(parsed.tokens || [])].sort((a, b) => _QAD_ORDER.indexOf(a.kind) - _QAD_ORDER.indexOf(b.kind));
  if (toks.some(t => t.kind === 'tag')) {
    known = known || _qadKnownTags();
    for (const t of toks) if (t.kind === 'tag' && !known.has(t.label.replace(/^#/, ''))) { t.isNew = true; t.label = t.label + ' (new tag)'; }
  }
  return toks.map((t) => {
    const lead = t.kind === 'stream'
      ? `<span class="dot" style="--c:${escAttr(safeColor(t.color, 'var(--fg-subtle)'))}"></span>`
      : icon(_QAD_ICON[t.kind] || 'circle', 'i-xs');
    const x = removable ? `<span class="qad-x" aria-hidden="true">${icon('x', 'i-xs')}</span>` : '';
    const tag = removable ? 'button' : 'span';
    return `<${tag}${removable ? ' type="button"' : ''} class="chip qa-tok qa-${escAttr(t.kind)}${t.isNew ? ' is-new' : ''}${t.kind === 'priority' && /^p[1-3]$/i.test(t.label) ? ' qa-' + t.label.toLowerCase() : ''}"`
      + (removable ? ` data-raw="${escAttr(t.raw)}" title="${escAttr('Read “' + t.raw + '” as ' + t.kind + '. Click to keep it as text.')}"` : '')
      + `>${lead}<span>${esc(t.label)}</span>${x}</${tag}>`;
  }).join('');
}
function _qadImplied(parsed, defaults) {
  const out = [];
  const d = defaults || {};
  if (!parsed.dueDate && d.dueDate) out.push(icon('calendar', 'i-xs') + `<span>${esc(dueLabel(d.dueDate))}</span>`);
  if (!parsed.stream && d.stream && STREAMS[d.stream]) out.push(`<span class="dot" style="--c:${escAttr(safeColor(STREAMS[d.stream].color))}"></span><span>${esc(STREAMS[d.stream].label)}</span>`);
  for (const t of (d.tags || [])) if (!(parsed.tags || []).includes(t)) out.push(icon('hash', 'i-xs') + `<span>${esc(t)}</span>`);
  for (const pid of (d.people || [])) { const p = getPerson(pid); if (p && !(parsed.people || []).includes(pid)) out.push(icon('at-sign', 'i-xs') + `<span>${esc(p.name)}</span>`); }
  return out.map(h => `<span class="chip qa-tok implied" title="From this list">${h}</span>`).join('');
}

/** The quick-add dialog. Returns its close(). */
function openQuickAddDialog(prefill, o) {
  o = o || {};
  const view = state.view;
  const defaults = isTaskView(view) && typeof quickAddDefaults === 'function' ? quickAddDefaults(view) : {};
  let ta = null, ignore = [], submitLbl = null, sug = null;
  // Escape with the suggestion list open closes only the list. The dialog
  // listens on document (capture), so this runs first, on window (capture).
  const escSug = (e) => {
    if (e.key === 'Escape' && sug && !sug.hidden && document.activeElement === ta) { e.preventDefault(); e.stopPropagation(); sug.hidden = true; }
  };
  window.addEventListener('keydown', escSug, true);
  const submit = () => {
    if (!ta) return true;
    const before = typeof _undoStack !== 'undefined' ? _undoStack.length : 0;
    const ids = quickAddLines(ta.value, isTaskView(view) ? view : '', { ignore });
    if (!ids.length) { ta.closest('.qad-box').classList.add('is-invalid'); ta.focus(); return false; }
    const steps = typeof _undoStack !== 'undefined' ? Math.max(1, _undoStack.length - before) : ids.length;
    _qadAnnounce(ids, steps);
    return true;
  };
  const close = openDialog({
    title: o.multi ? 'Add several tasks' : 'New task', width: 600, resizeKey: o.multi ? 'quick-add-multi' : 'quick-add',
    body: (el) => {
      el.classList.add('qad');
      const box = document.createElement('div'); box.className = 'qad-box';
      box.innerHTML = `<span class="qa-plus">${icon('plus')}</span>`;
      ta = document.createElement('textarea');
      ta.rows = o.multi ? 4 : 1; ta.className = 'qad-input'; ta.setAttribute('autofocus', ''); ta.setAttribute('aria-label', 'New task');
      ta.spellcheck = true;
      ta.placeholder = o.multi ? 'One task per line, e.g.\nEmail Sam fri 3pm !p1\nBook the venue next week #events' : 'e.g. “Email Sam fri 3pm !p1 ~30m @Sam”';
      ta.value = prefill || '';
      box.appendChild(ta);
      const chips = document.createElement('div'); chips.className = 'qa-preview qad-chips'; chips.setAttribute('aria-live', 'polite');
      const lines = document.createElement('div'); lines.className = 'qad-lines'; lines.hidden = true;
      sug = document.createElement('div'); sug.className = 'qa-suggest pop qad-suggest'; sug.hidden = true; sug.setAttribute('role', 'listbox');
      const help = document.createElement('div'); help.className = 'qad-help';
      help.innerHTML = [['calendar', 'fri · next mon · 15 oct'], ['clock', '3pm'], ['flag', '!p1'], ['hash', '#stream or #tag'], ['at-sign', '@person'], ['timer', '~2h'], ['repeat', 'every week']]
        .map(([ic, t]) => `<span>${icon(ic, 'i-xs')}${esc(t)}</span>`).join('');
      const foot = document.createElement('div'); foot.className = 'qad-foot subtle';
      foot.innerHTML = `<span><kbd class="kbd">Enter</kbd> add</span><span><kbd class="kbd">Shift</kbd><kbd class="kbd">Enter</kbd> new line</span><span><kbd class="kbd">Tab</kbd> accept suggestion</span>`;
      el.append(box, chips, lines, sug, help, foot);

      const paint = () => {
        ta.style.height = 'auto';
        ta.style.height = Math.min(Math.max(ta.scrollHeight, o.multi ? 96 : 0), 260) + 'px';
        const ls = qaSplitLines(ta.value);
        box.classList.remove('is-invalid');
        if (ls.length <= 1) {
          lines.hidden = true; lines.innerHTML = '';
          const parsed = parseQuickAdd(ls[0] || '', { ignore });
          chips.innerHTML = ls.length ? _qadChips(parsed, true) + _qadImplied(parsed, defaults) : ''; chips.hidden = false;
          if (submitLbl) submitLbl.textContent = 'Add task';
          return;
        }
        chips.innerHTML = ''; chips.hidden = true;
        lines.hidden = false;
        let n = 0; const known = _qadKnownTags();
        lines.innerHTML = ls.slice(0, 60).map((l) => {
          const p = parseQuickAdd(l);
          if (p.title) n++;
          return `<div class="qad-line${p.title ? '' : ' is-empty'}"><span class="check check-sm ${escAttr(p.priority || 'p0')}"></span><span class="qad-line-t">${esc(p.title || '(no title)')}</span><span class="qad-line-c">${_qadChips(p, false, known)}${_qadImplied(p, defaults)}</span></div>`;
        }).join('') + (ls.length > 60 ? `<div class="subtle qad-more">and ${ls.length - 60} more</div>` : '');
        if (ls.length > 60) for (const l of ls.slice(60)) if (parseQuickAdd(l).title) n++;
        if (submitLbl) submitLbl.textContent = n > 1 ? `Add ${n} tasks` : 'Add task';
      };
      const sugState = { items: [], index: 0, word: null };
      const accept = (it) => {
        const w = sugState.word;
        if (!w || !it) return;
        const v = ta.value, ins = it.insert + ' ';
        ta.value = v.slice(0, w.start) + ins + v.slice(w.end).replace(/^[ \t]+/, '');
        const pos = w.start + ins.length;
        try { ta.setSelectionRange(pos, pos); } catch (e) {}
        sugState.index = 0;
      };
      const paintSug = () => {
        const w = _qadWordAtCaret(ta);
        sugState.word = w;
        sugState.items = w ? _qadSuggestions(w.sigil, w.text, w.raw) : [];
        if (!sugState.items.length || document.activeElement !== ta) { sug.hidden = true; return; }
        sugState.index = Math.min(sugState.index, sugState.items.length - 1);
        sug.innerHTML = '';
        sugState.items.forEach((s, i) => {
          const b = document.createElement('button'); b.type = 'button';
          b.className = 'pop-item' + (i === sugState.index ? ' on' : '');
          b.setAttribute('role', 'option');
          const lead = s.kind === 'stream' ? `<span class="ic"><span class="dot" style="--c:${escAttr(safeColor(s.color))}"></span></span>`
            : s.kind === 'person' ? `<span class="avatar avatar-16" style="--c:${escAttr(safeColor(s.color, 'var(--sw-slate)'))}">${esc(avatarInitials(s.label))}</span>`
              : icon(s.kind === 'new' ? 'user-plus' : 'hash');
          b.innerHTML = lead + `<span class="lbl">${esc(s.label)}</span>${s.hint ? `<span class="hint">${esc(s.hint)}</span>` : ''}`;
          b.addEventListener('mousedown', (e) => { e.preventDefault(); accept(s); paint(); paintSug(); });
          sug.appendChild(b);
        });
        sug.hidden = false;
        _qadPlaceSuggest(sug, ta);
      };
      chips.addEventListener('mousedown', (e) => { if (e.target.closest('[data-raw]')) e.preventDefault(); });
      chips.addEventListener('click', (e) => {
        const c = e.target.closest('[data-raw]');
        if (!c) return;
        ignore.push(c.getAttribute('data-raw'));
        paint(); ta.focus();
      });
      sug.addEventListener('mousedown', (e) => e.preventDefault());
      ta.addEventListener('input', () => { if (!ta.value.trim()) ignore = []; paint(); paintSug(); });
      ta.addEventListener('keyup', (e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) paintSug(); });
      ta.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== ta) sug.hidden = true; }, 150));
      ta.addEventListener('keydown', (e) => {
        if (e.isComposing) return;
        const sugOpen = !sug.hidden && sugState.items.length;
        if (sugOpen) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            sugState.index = (sugState.index + (e.key === 'ArrowDown' ? 1 : -1) + sugState.items.length) % sugState.items.length;
            paintSug(); return;
          }
          if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
            e.preventDefault();
            accept(sugState.items[sugState.index]);
            paint(); paintSug(); return;
          }
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); sug.hidden = true; return; }
        }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (submit()) close(); }
      });
      setTimeout(() => {
        const btn = el.closest('.modal') && el.closest('.modal').querySelector('.modal-f .btn-primary span');
        submitLbl = btn || null;
        paint();
        try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {}
      }, 0);
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Add task', primary: true, icon: 'plus', run: () => submit() },
    ],
    onClose: () => { if (sug) sug.hidden = true; window.removeEventListener('keydown', escSug, true); },
  });
  return close;
}
/** The #word / +word / @word being typed at the caret, or null. */
function _qadWordAtCaret(ta) {
  const pos = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
  const m = /(^|\s)([#@+])([\p{L}\p{N}_.-]{0,40})$/u.exec(ta.value.slice(0, pos));
  return m ? { sigil: m[2], text: m[3].toLowerCase(), raw: m[3], start: pos - m[3].length - 1, end: pos } : null;
}
/** Streams + tags for '#', streams for '+', people for '@' (a new name offers to create the person). */
function _qadSuggestions(sigil, q, raw) {
  const starts = (s) => { s = String(s || '').toLowerCase(); return !q || s.startsWith(q) || s.split(/[\s_-]+/).some(w => w.startsWith(q)); };
  const items = [];
  if (sigil === '#' || sigil === '+') {
    for (const [id, s] of Object.entries(STREAMS)) {
      if (!s || s.archived) continue;
      const key = String(s.label || id).toLowerCase().replace(/\s+/g, '');
      if (starts(s.label) || starts(id)) items.push({ kind: 'stream', insert: sigil + key, label: s.label, color: s.color, hint: 'Stream' });
    }
  }
  if (sigil === '#') {
    const counts = {};
    for (const it of getAllItems()) if (statusOf(it.id) !== 'done') for (const t of effTags(it)) counts[t] = (counts[t] || 0) + 1;
    Object.entries(counts).filter(([t]) => starts(t)).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .forEach(([t, n]) => items.push({ kind: 'tag', insert: '#' + t, label: '#' + t, hint: `${n} open` }));
  }
  if (sigil === '@') {
    const firstCount = {};
    for (const p of state.people || []) { const f = String(p.name || '').trim().split(/\s+/)[0].toLowerCase(); firstCount[f] = (firstCount[f] || 0) + 1; }
    for (const p of state.people || []) {
      if (!p || !p.name || p.self) continue;
      if (!(starts(p.name) || starts(p.id) || (p.aliases || []).some(starts))) continue;
      const parts = String(p.name).trim().split(/\s+/);
      const token = firstCount[parts[0].toLowerCase()] > 1 ? parts.join('_') : parts[0];
      items.push({ kind: 'person', insert: '@' + token, label: p.name, color: p.color, hint: p.role || '' });
    }
    if (q && !items.length) { const nm = raw || q; items.push({ kind: 'new', insert: '@' + nm, label: `Add “${nm}” as a new person`, hint: '' }); }
  }
  return items.slice(0, 8);
}
function _qadPlaceSuggest(sug, ta) {
  if (sug.hidden) return;
  // Under the caret line, inside the dialog body.
  const body = ta.closest('.modal-b');
  if (!body) return;
  const r = ta.getBoundingClientRect(), b = body.getBoundingClientRect();
  sug.style.position = 'absolute';
  sug.style.left = Math.max(0, r.left - b.left + 24) + 'px';
  sug.style.top = (r.bottom - b.top + body.scrollTop + 4) + 'px';
}

// Several lines pasted into the inline quick-add box: confirm them in the dialog.
document.addEventListener('paste', (e) => {
  const t = e.target;
  if (!t || t.id !== 'quick-add') return;
  const cd = e.clipboardData;
  const txt = cd ? cd.getData('text') : '';
  if (qaSplitLines(txt).length < 2) return;
  e.preventDefault();
  const merged = [t.value.trim(), txt].filter(Boolean).join('\n');
  t.value = '';
  t.dispatchEvent(new Event('input', { bubbles: true }));
  openQuickAddDialog(merged, { multi: true });
}, true);

registerMoreItem({ id: 'bulk-add', label: 'Add several tasks…', icon: 'clipboard-list', order: 20, run: () => openQuickAddDialog('', { multi: true }) });
