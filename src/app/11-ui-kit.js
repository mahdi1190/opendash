/* ============================================================
   UI KIT (design system v2): small helpers every module may use.
   Styles: src/styles/01-components.css. Reference: MODULES.md.

     icon(name, cls)                      -> '<svg class="i ..."><use href="#i-name"/></svg>'
     iconEl(name, cls)                    -> the same as an element
     emptyStateHtml({icon,title,text})    -> markup string (text is escaped)
     mountEmptyState(el, {icon,title,text,actions:[{label,icon,primary,run}]})
     openPopover(anchor, build(el,close), {align,width,className,onClose}) -> close()
     openMenu(anchor, items, opts)        -> close(); items: {label,icon,hint,kbd,checked,
                                             danger,disabled,run} | 'sep' | {heading}
     closePopovers()
     openDialog({title, body(el,close)|html, actions:[...], size:'sm'|'md'|'lg'|'xl', fixed,
                 height, width, className, onClose}) -> close()
     confirmDialog({title,text,confirmLabel,danger}) -> Promise<boolean>
     promptDialog({title,label,value,placeholder,confirmLabel}) -> Promise<string|null>
     openDrawer({title, body(el,close), footer(el,close), width, onClose}) -> close()
     toast(msg, {kind:'ok'|'err'|'info', icon, action:{label,run}, timeout})
     avatarInitials(name)
     Tooltips: any element with data-tip="text" (and optional data-kbd="Ctrl+K").

   The 2.18 kit (docs/dev/UI_CLEANUP_PLAN.md C1 + docs/dev/SIMPLIFY_PLAN.md section 3; one
   kit, use these instead of a private helper):
     uiButton({label, icon, kind, size, run(e,btn), tip, kbd, aria, cls, disabled, pressed,
               data, wait, bubble}) -> <button>        the one button builder
     cardHead({icon, title, count, page, actions, more}) -> .card-h;  cardHeadHtml(o) -> markup
     cardTitleLink(h, view, label)        a header's title opens its page
     secHead({title, sub, count, icon, actions, more}) -> .sec-h;  secHeadHtml(o) -> markup
     emptyLine(text, {label, run, icon}?) -> .empty-line   an empty list inside a card or dialog
     toastError(what, e, retry|{label,run})   "Couldn’t <what>: <reason>." + Try again
     copyText(text, what, {quiet}) -> Promise<boolean>     one wording for copied / couldn’t copy
     setStatusLine(tone, word, detail) -> .set-status      the status line a card starts with
     setStatusPaint(el, tone, word, detail)                repaint it in place
     setFold(host, key, label, fill({body, card}), {advanced}) -> <details>   More / Advanced
     setAction(host, label, run, {icon, kind, disabled, tip, wait}) -> <button>   the one main button
     secHead({..., sticky: true})         a section header that stays at the top while its section is on screen

   The 2.19 layout primitives (lean UI; MODULES.md "Layout primitives"; styles at the end of 01-components.css):
     pageLayout({main, side, sideWidth, sticky, cls})      two zones that stack on narrow windows (sticky: a short side stays in view)
     masterDetail({list, detail, empty, listWidth, label}) a list of things beside the selected one
     mdRow({title, sub, icon|avatar, badge, active, run})  one row of such a list
     subTabs({tabs, active, onChange, label})              the pill tabs of a page; headerSubTabs() puts them in the page header
     pagedList({items, pageSize, render, empty, loadMore}) a long list shown a page at a time (Show more)
   Everything that takes text escapes it or sets textContent.
   ============================================================ */

/** Inline sprite icon (markup string). Names are the Lucide ids in vendor/icons. */
function icon(name, cls) {
  const n = String(name || '').replace(/[^a-z0-9-]/g, '');
  const c = cls ? ' ' + String(cls).replace(/[^a-zA-Z0-9 _-]/g, '') : '';
  return `<svg class="i${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
}
function iconEl(name, cls) {
  const t = document.createElement('template'); t.innerHTML = icon(name, cls);
  return t.content.firstChild;
}
/** Is `s` an icon id (vs. legacy markup such as an emoji)? */
function _isIconName(s) { return typeof s === 'string' && /^[a-z][a-z0-9-]*$/.test(s); }

/** Two-letter initials for an avatar. */
function avatarInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] || ''))).toUpperCase();
}

/* ---------- empty states ---------- */
function emptyStateHtml(o) {
  o = o || {};
  // Today's empty-state art (78-anim-wire.js; plays once per entry), the section's icon as its badge.
  const art = !o.compact && o.art !== false && typeof animEmptyArtHtml === 'function' ? animEmptyArtHtml() : '';
  return `<div class="empty-state${o.compact ? ' compact' : ''}">`
    + (art ? `<div class="es-icon es-art">${art}<span class="es-badge">${icon(o.icon || 'sparkles')}</span></div>` : `<div class="es-icon">${icon(o.icon || 'sparkles')}</div>`)
    + (o.title ? `<div class="es-title">${esc(o.title)}</div>` : '')
    + (o.text ? `<div class="es-text">${esc(o.text)}</div>` : '')
    + `<div class="es-actions"></div></div>`;
}
function mountEmptyState(container, o) {
  o = o || {};
  const t = document.createElement('template'); t.innerHTML = emptyStateHtml(o);
  const el = t.content.firstChild;
  const acts = el.querySelector('.es-actions');
  for (const a of (o.actions || [])) {
    acts.appendChild(uiButton({ label: a.label, icon: a.icon, kind: a.primary ? 'primary' : 'secondary', run: () => { if (a.run) a.run(); } }));
  }
  if (!acts.children.length) acts.remove();
  container.appendChild(el);
  return el;
}

/* ---------- popovers + menus ---------- */
const _openPops = new Set();
function closePopovers() { for (const c of [..._openPops]) c(); }

function _placePop(pop, anchor, align) {
  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = align === 'start' ? r.left : align === 'center' ? r.left + r.width / 2 - pw / 2 : r.right - pw;
  left = Math.max(8, Math.min(left, vw - pw - 8));
  let top = r.bottom + 6;
  if (top + ph > vh - 8 && r.top - ph - 6 > 8) { top = r.top - ph - 6; pop.style.transformOrigin = 'bottom right'; }
  pop.style.left = Math.round(left) + 'px';
  pop.style.top = Math.round(Math.max(8, top)) + 'px';
}

/**
 * Open a popover under `anchor`. build(el, close) fills it. Returns close().
 * Clicking the anchor again, clicking outside, Esc or opening another
 * popover closes it.
 */
function openPopover(anchor, build, opts) {
  opts = opts || {};
  if (anchor && anchor._popClose) { anchor._popClose(); return () => {}; }
  closePopovers();
  const pop = document.createElement('div');
  pop.className = 'pop' + (opts.className ? ' ' + opts.className : '');
  pop.setAttribute('role', opts.role || 'dialog');
  if (opts.width) pop.style.width = typeof opts.width === 'number' ? opts.width + 'px' : opts.width;
  pop.style.left = '-9999px'; pop.style.top = '0px';
  document.body.appendChild(pop);
  let closed = false;
  const onDoc = (e) => { if (!pop.contains(e.target) && !(anchor && anchor.contains(e.target))) close(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); if (anchor && anchor.focus) anchor.focus(); } };
  const onWin = () => close();
  function close() {
    if (closed) return; closed = true;
    _openPops.delete(close);
    document.removeEventListener('mousedown', onDoc, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onWin);
    if (anchor) { anchor.setAttribute('aria-expanded', 'false'); delete anchor._popClose; }
    pop.remove();
    if (opts.onClose) try { opts.onClose(); } catch (e) { console.error(e); }
  }
  _openPops.add(close);
  if (anchor) { anchor.setAttribute('aria-expanded', 'true'); anchor._popClose = close; }
  build(pop, close);
  if (anchor) _placePop(pop, anchor, opts.align);
  setTimeout(() => {
    document.addEventListener('mousedown', onDoc, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onWin);
  }, 0);
  const first = pop.querySelector('[autofocus], .pop-item:not(:disabled), input, button');
  if (first && opts.focus !== false) setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) {} }, 0);
  return close;
}

/** Fill `el` with menu rows (used by openMenu and the command palette). */
function buildMenuItems(el, items, close) {
  for (const it of items) {
    if (!it) continue;
    if (it === 'sep') { const s = document.createElement('div'); s.className = 'pop-sep'; el.appendChild(s); continue; }
    if (it.heading) { const h = document.createElement('div'); h.className = 'pop-label'; h.textContent = it.heading; el.appendChild(h); continue; }
    if (it.hidden && (typeof it.hidden === 'function' ? it.hidden() : it.hidden)) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pop-item' + (it.danger ? ' danger' : '') + (it.className ? ' ' + it.className : '');
    b.setAttribute('role', it.checked !== undefined ? 'menuitemcheckbox' : 'menuitem');
    const checked = typeof it.checked === 'function' ? it.checked() : it.checked;
    if (checked !== undefined) b.setAttribute('aria-checked', checked ? 'true' : 'false');
    const disabled = typeof it.disabled === 'function' ? it.disabled() : it.disabled;
    if (disabled) b.disabled = true;
    const hint = typeof it.hint === 'function' ? it.hint() : it.hint;
    b.innerHTML = (it.icon ? (_isIconName(it.icon) ? icon(it.icon) : `<span class="ic">${it.icon}</span>`) : '')
      + `<span class="lbl">${esc(typeof it.label === 'function' ? it.label() : it.label)}</span>`
      + (hint ? `<span class="hint">${esc(hint)}</span>` : '')
      + (it.kbd ? `<span class="kbd-group">${String(it.kbd).split('+').map(k => `<kbd class="kbd">${esc(k)}</kbd>`).join('')}</span>` : '')
      + (checked ? icon('check', 'chk') : '');
    if (it.title) b.title = it.title;
    b.onclick = (e) => {
      e.stopPropagation();
      if (it.keepOpen) { it.run && it.run(e); return; }
      close && close();
      try { it.run && it.run(e); } catch (err) { console.error('[menu]', err); }
    };
    el.appendChild(b);
  }
  // Arrow-key navigation between rows
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = [...el.querySelectorAll('.pop-item:not(:disabled)')];
    if (!rows.length) return;
    e.preventDefault();
    const i = rows.indexOf(document.activeElement);
    const n = e.key === 'ArrowDown' ? (i + 1) % rows.length : (i <= 0 ? rows.length - 1 : i - 1);
    rows[n].focus();
  });
}
function openMenu(anchor, items, opts) {
  return openPopover(anchor, (el, close) => buildMenuItems(el, items, close), Object.assign({ role: 'menu' }, opts || {}));
}

/* ---------- dialogs ---------- */
let _dialogClose = null;
/** The four dialog widths in px (the same numbers as --modal-sm|md|lg|xl in 00-tokens.css). */
const DIALOG_SIZES = Object.freeze({ sm: 440, md: 560, lg: 760, xl: 1100 });
/** A width (a number of px, or 'NNNpx') -> its size name: <= 480 sm, <= 640 md, <= 800 lg, else xl. Anything else: null. */
function dialogSizeFor(w) {
  const n = typeof w === 'number' ? w : (/^\s*\d+(?:\.\d+)?\s*(?:px)?\s*$/.test(String(w == null ? '' : w)) ? parseFloat(w) : NaN);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n <= 480 ? 'sm' : n <= 640 ? 'md' : n <= 800 ? 'lg' : 'xl';
}
/**
 * A modal dialog (new style). body(el, close) fills the body, or pass html
 * (already-escaped markup). actions: [{label, icon, primary, danger, tip, disabled, run(close) -> false keeps open}].
 *   size: 'sm' 440 | 'md' 560 (the default) | 'lg' 760 | 'xl' 1100 px, never wider than the window less 32.
 *     o.width still works: a pixel width snaps to the nearest size (<= 480 sm, <= 640 md, <= 800 lg,
 *     else xl), so every dialog is one of four widths; another unit ('90vw') is used as it is.
 *   fixed: true - a fixed height (min(--modal-h, 86vh); o.height sets --modal-h, e.g. 760 or '90vh'):
 *     the header and the buttons never move; the body scrolls. For anything with steps, tabs,
 *     filters or a deck. A simple form or confirm leaves it off and sizes to its content.
 *   className: extra classes on the .modal. Every dialog sits 8vh from the top.
 */
function openDialog(o) {
  o = o || {};
  if (_dialogClose) _dialogClose();
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  const dlg = document.createElement('div'); dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
  const size = Object.prototype.hasOwnProperty.call(DIALOG_SIZES, o.size) ? o.size : dialogSizeFor(o.width);
  dlg.className = 'modal' + (size ? ' modal-' + size : '') + (o.fixed ? ' is-fixed' : '') + (o.className ? ' ' + String(o.className) : '');
  // No size and no width: the CSS width (560, or a module's own .modal.x rule).
  if (size) dlg.style.width = `min(var(--modal-${size}, ${DIALOG_SIZES[size]}px), calc(100vw - 32px))`;
  else if (o.width) dlg.style.width = `min(${typeof o.width === 'number' ? o.width + 'px' : o.width}, calc(100vw - 32px))`;
  if (o.height != null && o.height !== '') dlg.style.setProperty('--modal-h', typeof o.height === 'number' ? o.height + 'px' : String(o.height));
  const h = document.createElement('div'); h.className = 'modal-h';
  const h2 = document.createElement('h2'); h2.textContent = o.title || ''; h.appendChild(h2);
  const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon'; x.setAttribute('aria-label', 'Close'); x.innerHTML = icon('x');
  h.appendChild(x);
  const b = document.createElement('div'); b.className = 'modal-b';
  dlg.append(h, b);
  const prevFocus = document.activeElement;
  let closed = false;
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
    // Ctrl+Enter: the main button (a red one too, e.g. Delete in a confirm).
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { const p = dlg.querySelector('.modal-f .btn-primary') || [...dlg.querySelectorAll('.modal-f .btn-danger')].pop(); if (p) { e.preventDefault(); p.click(); } }
  };
  // A click beside the dialog does not throw away what you typed in it: the first one
  // only points at the dialog; a second click (or Esc, ×, Cancel) closes it.
  let typed = false, warned = false;
  dlg.addEventListener('input', () => { typed = true; });
  function close() {
    if (closed) return; closed = true;
    _dialogClose = null;
    document.removeEventListener('keydown', onKey, true);
    scrim.remove(); dlg.remove();
    if (o.onClose) try { o.onClose(); } catch (e) { console.error(e); }
    if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  x.onclick = close;
  scrim.onclick = () => {
    if (!typed || warned || o.keepOnOutside === false) { close(); return; }
    warned = true;
    dlg.classList.remove('nudge'); void dlg.offsetWidth; dlg.classList.add('nudge');
    toast('You’ve typed something here. Click outside again to close without saving it.', { icon: 'pencil', timeout: 4000 });
  };
  if (typeof o.body === 'function') o.body(b, close);
  else if (o.html) b.innerHTML = o.html;
  if (o.actions && o.actions.length) {
    const f = document.createElement('div'); f.className = 'modal-f';
    for (const a of o.actions) {
      if (a === 'spacer') { const s = document.createElement('span'); s.className = 'spacer'; f.appendChild(s); continue; }
      if (!a) continue;
      f.appendChild(uiButton({ label: a.label, icon: a.icon, kind: a.primary ? 'primary' : a.danger ? 'danger' : 'secondary', tip: a.tip, disabled: a.disabled, cls: a.cls, bubble: true, wait: true,
        // An async save keeps the dialog, and what was typed, until it has worked: false or a failure leaves it open.
        run: () => {
          const r = a.run ? a.run(close) : undefined;
          if (r && typeof r.then === 'function') return r.then((v) => { if (v !== false) close(); }, (e) => { console.error('[dialog]', e); toastError('do that', e); });
          if (r !== false) close();
          return undefined;
        } }));
    }
    dlg.appendChild(f);
  }
  document.body.append(scrim, dlg);
  // Drag the edges to resize; remembered per dialog type (o.resizeKey, else the width it asked for, so sizes
  // remembered before the snap still apply): 13-splitter.js.
  if (typeof makeResizable === 'function' && o.resizable !== false) {
    makeResizable(dlg, { key: 'dialog:' + (o.resizeKey || ('w' + (o.width || (size ? DIALOG_SIZES[size] : 560)))), center: 'x', edges: ['e', 'w', 's', 'se', 'sw'],
      min: { w: 320, h: 160 }, max: () => ({ h: Math.round(window.innerHeight * 0.9) - 16 }) });
  }
  document.addEventListener('keydown', onKey, true);
  _dialogClose = close;
  const first = dlg.querySelector('[autofocus], .modal-b input, .modal-b textarea, .modal-b select, .modal-f .btn-primary');
  setTimeout(() => { try { (first || x).focus({ preventScroll: true }); } catch (e) {} }, 0);
  return close;
}
function confirmDialog(o) {
  o = o || {};
  return new Promise((resolve) => {
    let answered = false;
    openDialog({
      title: o.title || 'Are you sure?', width: 440,
      body: (el) => { const p = document.createElement('p'); p.className = 'muted'; p.textContent = o.text || ''; el.appendChild(p); },
      actions: [
        { label: o.cancelLabel || 'Cancel', run: () => { answered = true; resolve(false); } },
        { label: o.confirmLabel || 'Confirm', primary: !o.danger, danger: !!o.danger, run: () => { answered = true; resolve(true); } },
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}
function promptDialog(o) {
  o = o || {};
  return new Promise((resolve) => {
    let input = null, answered = false;
    const ok = () => { answered = true; resolve(input ? input.value.trim() : ''); };
    openDialog({
      title: o.title || '', width: 440,
      body: (el, close) => {
        const f = document.createElement('label'); f.className = 'field';
        if (o.label) { const l = document.createElement('span'); l.className = 'field-label'; l.textContent = o.label; f.appendChild(l); }
        input = document.createElement('input'); input.className = 'control'; input.value = o.value || ''; input.placeholder = o.placeholder || '';
        input.setAttribute('autofocus', '');
        input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); close(); } };
        f.appendChild(input); el.appendChild(f);
      },
      actions: [
        { label: 'Cancel', run: () => { answered = true; resolve(null); } },
        { label: o.confirmLabel || 'Save', primary: true, run: ok },
      ],
      onClose: () => { if (!answered) resolve(null); },
    });
  });
}

/* ---------- drawer ---------- */
let _drawerClose = null;
function openDrawer(o) {
  o = o || {};
  if (_drawerClose) _drawerClose();
  const scrim = document.createElement('div'); scrim.className = 'scrim drawer-scrim';
  const d = document.createElement('aside'); d.className = 'drawer'; d.setAttribute('role', 'dialog');
  if (o.width) d.style.width = `min(${typeof o.width === 'number' ? o.width + 'px' : o.width}, 100vw)`;
  const h = document.createElement('div'); h.className = 'drawer-h';
  const h2 = document.createElement('h2'); h2.textContent = o.title || '';
  const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon'; x.setAttribute('aria-label', 'Close'); x.innerHTML = icon('x');
  h.append(h2, x);
  const b = document.createElement('div'); b.className = 'drawer-b';
  d.append(h, b);
  let closed = false;
  const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.modal, .pop:not([hidden])')) { e.stopPropagation(); close(); } };
  function close() {
    if (closed) return; closed = true; _drawerClose = null;
    document.removeEventListener('keydown', onKey, true);
    scrim.remove(); d.remove();
    if (o.onClose) try { o.onClose(); } catch (e) { console.error(e); }
  }
  x.onclick = close; scrim.onclick = close;
  if (o.body) o.body(b, close);
  if (o.footer) { const f = document.createElement('div'); f.className = 'drawer-f'; o.footer(f, close); d.appendChild(f); }
  document.body.append(scrim, d);
  // Drag the left edge to resize; the width is remembered per drawer (o.resizeId, else its default width): 13-splitter.js.
  if (typeof makeResizable === 'function' && o.resizable !== false) {
    makeResizable(d, { key: 'drawer:' + (o.resizeId || ('w' + (o.width || 440))), edges: ['w'], min: { w: 340 } });
  }
  document.addEventListener('keydown', onKey, true);
  _drawerClose = close;
  return close;
}

/* ---------- toasts ---------- */
/**
 * toast('Saved', {kind:'ok'}) / toast('Deleted', {action:{label:'Undo', run: undo}})
 * o: {kind:'ok'|'err'|'warn'|'info', icon, action:{label,run}, retry: fn, timeout, dismiss, busy}
 *   - A RUNNING WAIT (o.busy, or a Cancel / Stop button, e.g. "Asking Home
 *     laptop… Cancel", 56-remote-jobs.js) stays until its job ends: the caller
 *     calls close() (o.timeout, if given, is only an upper bound), or the user
 *     presses × or Cancel. Its icon turns, it counts the seconds, and
 *     close.progress(0..1 | 'text') shows how far it is. Cancel/Stop says
 *     "Cancelling…" until the job ends. The three-on-screen limit never drops it.
 *   - Toasts with a button (Undo, Open...) stay at least 12 s (errors 8 s, plain
 *     notes about reading time). Every toast waits while the pointer or keyboard
 *     focus is on it and while the tab is hidden; leaving it never cuts what is
 *     left short (a toast with a button keeps at least 4 s).
 *   - The same message while it is still showing merges into that toast (a ×2
 *     count, the timer starts again, the newest action wins) instead of stacking.
 *   - Errors, waits and toasts with a button get a × to dismiss; Esc closes the
 *     newest one when nothing else is open (toastDismissNewest, 90-wiring.js).
 *   - retry: fn adds "Try again"; a "server isn't running" error with no
 *     button gets "How to start it" (86-offline-banner.js).
 *   - An Undo button that runs the plain global undo() undoes THAT change,
 *     even after other edits (undoMark / undoMarked, 01-core-state.js).
 * Returns close(); close.update('New words') changes the message, close.progress(p) the progress.
 */
const _TOAST_KINDS = { ok: 'ok', success: 'ok', err: 'err', error: 'err', danger: 'err', warn: 'warn', warning: 'warn', info: '' };
const _toastLive = new Set();   // controllers of the toasts on screen
const _TOAST_MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl';
const _TOAST_STOP_RE = /^(cancel|stop)\b/i;
/** How long a toast stays (ms): about reading time, longer for errors and buttons. 0 = until closed. */
function _toastMs(msg, o, kind, busy) {
  if (busy) return o.timeout || 0;
  if (o.timeout) return o.timeout;
  const read = 2000 + String(msg || '').length * 45;
  if (kind === 'err') return Math.min(14000, Math.max(8000, read));
  if (o.action || o.retry) return Math.min(16000, Math.max(12000, read));
  return Math.min(8000, Math.max(2800, read));
}
/** Is this button the plain global undo (`() => undo()` or `undo`)? Then it is made precise. */
function _toastIsPlainUndo(a) {
  if (!a || typeof a.run !== 'function' || !/^undo$/i.test(String(a.label || ''))) return false;
  if (typeof undo === 'function' && a.run === undo) return true;
  return /^(?:\(\)|_)\s*=>\s*\{?\s*undo\(\)\s*;?\s*\}?$/.test(String(a.run).trim());
}
const _toastHeld = [];
/** You left the garden: the notes that waited for you, the newest few. */
function toastHeldFlush() { const list = _toastHeld.splice(0).slice(-3); list.forEach(([m, o], i) => setTimeout(() => toast(m, o), 500 + i * 300)); }
/** Close the newest toast (Esc). False when none is showing. */
function toastDismissNewest() {
  const list = [..._toastLive].filter(c => !c.leaving);
  if (!list.length) return false;
  list[list.length - 1].close();
  return true;
}
function toast(msg, o) {
  o = o || {};
  const host = document.getElementById('toast-host');
  if (!host) return () => {};
  // An "error" that only says another of your devices is asleep or off (56-presence.js) is not
  // an error: shown calmly (a moon, not red), and the same line again soon only pulses the sync dot.
  if (o.kind === 'err' && !o.calm && typeof presenceCalmMatch === 'function') {
    const calm = presenceCalmMatch(msg);
    if (calm) {
      if (typeof presenceCalmShowOk === 'function' && !presenceCalmShowOk(calm)) return Object.assign(() => {}, { update: () => {} });
      o = Object.assign({}, o, { kind: '', icon: 'moon', calm: true, action: o.action && /try again/i.test(o.action.label || '') ? null : o.action });
    }
  }
  const kind = Object.prototype.hasOwnProperty.call(_TOAST_KINDS, o.kind) ? _TOAST_KINDS[o.kind] : (o.kind ? String(o.kind).replace(/[^a-z-]/g, '') : '');
  const text = String(msg == null ? '' : msg);
  let action = o.action && o.action.label ? o.action : null;
  if (!action && typeof o.retry === 'function' && !o.calm) action = { label: 'Try again', run: o.retry };   // calm lines have no Try again
  if (!action && kind === 'err' && typeof srvShowStartHelp === 'function' && typeof NET_DOWN_REASON !== 'undefined' && text.includes(NET_DOWN_REASON)) action = { label: 'How to start it', run: () => srvShowStartHelp() };
  if (action && _toastIsPlainUndo(action) && typeof undoMark === 'function') {
    // Taken after this tick, so a save made just after the toast call is the step it undoes.
    let mark = null;
    setTimeout(() => { mark = undoMark(); }, 0);
    action = { label: action.label, run: () => (mark ? undoMarked(mark) : undo()) };
  }
  // A running wait: it ends when its job does (close()), not on a timer.
  const busy = kind !== 'err' && kind !== 'ok' && !!(o.busy || (action && _TOAST_STOP_RE.test(String(action.label))));
  const key = kind + '|' + (o.icon || '') + '|' + text;
  // the garden fills the window and answers with pictures: a passing note from the rest of the app waits until you leave it. Errors, waits and Undo still show; garden code passes `now`.
  if (!o.now && !busy && kind !== 'err' && !(action && /^undo$/i.test(String(action.label))) && typeof document !== 'undefined' && document.documentElement.classList.contains('gd-immersive')) {
    if (_toastHeld.length < 5 && !_toastHeld.some(h => h[0] === text)) _toastHeld.push([msg, o]);
    return Object.assign(() => {}, { update: () => {} });
  }
  const ms = _toastMs(text, Object.assign({}, o, { action }), kind, busy);

  // The same message is already showing: count it instead of stacking another (never two waits in one).
  if (!busy) for (const c of _toastLive) {
    if (c.key !== key || c.leaving || c.busy) continue;
    c.count++;
    c.setAction(action);
    c.restart(ms);
    return c.close;
  }

  const t = document.createElement('div');
  t.className = 'toast' + (kind ? ' ' + kind : '') + (busy ? ' busy' : '');
  const ic0 = o.icon || (busy ? 'loader-circle' : '');
  if (busy && /^(loader|loader-circle|refresh-cw|rotate-cw)$/.test(ic0)) t.classList.add('spin');   // a spinner icon turns
  t.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  if (busy) t.setAttribute('aria-busy', 'true');
  const ic = o.icon || (busy ? 'loader-circle' : kind === 'ok' ? 'circle-check' : kind === 'err' ? 'circle-alert' : kind === 'warn' ? 'triangle-alert' : 'info');
  t.innerHTML = icon(ic) + `<span class="msg">${esc(text)}</span><span class="toast-n" hidden></span>`
    + (busy ? '<span class="toast-t" aria-hidden="true"></span><span class="toast-bar" hidden><span></span></span>' : '');
  let timer = null, left = ms, startedAt = 0, hover = false, focus = false, btn = null, tick = null, shownProgress = null;
  const c = { key, count: 1, leaving: false, busy, close: null, setAction: null, restart: null };
  const stop = () => { if (timer) { clearTimeout(timer); timer = null; left = Math.max(1200, left - (Date.now() - startedAt)); } };
  const start = () => {
    if (timer || c.leaving || !left) return;                  // !left: a wait, closed by its job
    if (!busy && (hover || focus || (typeof document !== 'undefined' && document.hidden))) return;
    startedAt = Date.now(); timer = setTimeout(close, left);
  };
  // A wait counts the seconds (after a moment), unless the caller reports its own progress.
  const t0 = Date.now();
  const paintTime = () => {
    const el = t.querySelector('.toast-t'); if (!el || shownProgress != null) return;
    const sec = Math.round((Date.now() - t0) / 1000);
    el.textContent = sec >= 3 ? (sec < 90 ? sec + ' s' : Math.round(sec / 60) + ' min') : '';
  };
  if (busy) tick = setInterval(paintTime, 1000);
  function close() {
    if (c.leaving) return;
    c.leaving = true;
    if (timer) clearTimeout(timer);
    if (tick) clearInterval(tick);
    timer = null; tick = null;
    _toastLive.delete(c);
    t.classList.add('out');
    setTimeout(() => t.remove(), 160);
  }
  c.close = close;
  c.vis = () => { if (busy) return; if (document.hidden) stop(); else start(); };
  c.restart = (n) => {
    if (timer) clearTimeout(timer);
    timer = null; left = n;
    const badge = t.querySelector('.toast-n');
    if (badge && c.count > 1) { badge.hidden = false; badge.textContent = '×' + c.count; badge.setAttribute('aria-label', c.count + ' times'); }
    t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
    start();
  };
  c.setAction = (a) => {
    if (!a) { if (btn) { btn.remove(); btn = null; } return; }
    if (!btn) {
      btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-ghost btn-sm toast-act';
      const x = t.querySelector('.toast-x');
      if (x) t.insertBefore(btn, x); else t.appendChild(btn);
    }
    btn.textContent = a.label; btn.disabled = false;
    if (/^undo$/i.test(a.label)) { btn.setAttribute('data-tip', 'Undo this change'); btn.setAttribute('data-kbd', _TOAST_MOD + '+Z'); }
    btn.onclick = () => {
      const stopping = busy && _TOAST_STOP_RE.test(String(a.label));
      // Cancel / Stop on a wait: it says so until the job really ends (its close()); 6 s at most.
      if (stopping) { btn.disabled = true; close.update(/^stop/i.test(a.label) ? 'Stopping…' : 'Cancelling…'); setTimeout(close, 6000); }
      else close();
      try { const r = a.run && a.run(); if (r && typeof r.catch === 'function') r.catch(e => console.error(e)); } catch (e) { console.error(e); }
    };
  };
  if (kind === 'err' || action || busy || o.dismiss) {
    const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm toast-x';
    x.setAttribute('aria-label', busy ? 'Hide (it keeps going)' : 'Dismiss'); x.innerHTML = icon('x');
    if (busy) x.setAttribute('data-tip', 'Hide (it keeps going)');
    x.onclick = close;
    t.appendChild(x);
  }
  c.setAction(action);
  // A second button beside the first (o.action2, e.g. "Open it" next to Undo).
  if (action && o.action2 && o.action2.label && !busy) {
    const b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'btn btn-ghost btn-sm toast-act';
    b2.textContent = o.action2.label;
    b2.onclick = () => { close(); try { const r = o.action2.run && o.action2.run(); if (r && typeof r.catch === 'function') r.catch(e => console.error(e)); } catch (e) { console.error(e); } };
    t.insertBefore(b2, btn);
  }
  // At most three on screen: the oldest plain one goes first; a running wait is never dropped.
  const live = [..._toastLive].filter(x => !x.leaving);
  let extra = live.length - 2;
  for (const x of live) { if (extra <= 0) break; if (!x.busy) { x.close(); extra--; } }
  _toastLive.add(c);
  host.appendChild(t);
  start();
  const keep = action || busy ? 4000 : 1800;   // what is left after the pointer or focus leaves, at least
  t.addEventListener('mouseenter', () => { hover = true; if (!busy) stop(); });
  t.addEventListener('mouseleave', () => { hover = false; if (!busy) { left = Math.max(left, keep); start(); } });
  t.addEventListener('focusin', () => { focus = true; if (!busy) stop(); });
  t.addEventListener('focusout', (e) => { if (t.contains(e.relatedTarget)) return; focus = false; if (!busy) { left = Math.max(left, keep); start(); } });
  /** close.update('New words'): change the message of a toast that is still showing. */
  close.update = (m) => { const s = t.querySelector('.msg'); if (s && m != null) { s.textContent = String(m); c.key = kind + '|' + (o.icon || '') + '|' + String(m); } };
  /** close.progress(0.4) (a bar) or close.progress('3 of 8'): how far a wait is; null clears it. */
  close.progress = (p) => {
    const tt = t.querySelector('.toast-t'), bar = t.querySelector('.toast-bar');
    shownProgress = p == null ? null : p;
    if (typeof p === 'number' && Number.isFinite(p) && bar) {
      const pct = Math.round(Math.max(0, Math.min(1, p)) * 100);
      bar.hidden = false; bar.firstChild.style.width = pct + '%';
      if (tt) tt.textContent = pct + '%';
    } else if (typeof p === 'string' && tt) { tt.textContent = p; if (bar) bar.hidden = true; }
    else { if (bar) bar.hidden = true; paintTime(); }
  };
  return close;
}
// A toast that appears while you are in another tab waits for you to come back.
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { for (const c of [..._toastLive]) c.vis && c.vis(); });

/* ---------- tooltips: [data-tip] / [data-kbd] ---------- */
let _tipEl = null, _tipTimer = null, _tipFor = null;
function _hideTip() { if (_tipTimer) clearTimeout(_tipTimer); _tipTimer = null; _tipFor = null; if (_tipEl) { _tipEl.remove(); _tipEl = null; } }
document.addEventListener('mouseover', (e) => {
  const t = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
  if (t === _tipFor) return;
  _hideTip();
  if (!t || !t.getAttribute('data-tip')) return;
  _tipFor = t;
  _tipTimer = setTimeout(() => {
    if (!t.isConnected || t.getAttribute('aria-expanded') === 'true') return;
    _tipEl = document.createElement('div'); _tipEl.className = 'tip'; _tipEl.setAttribute('role', 'tooltip');
    _tipEl.textContent = t.getAttribute('data-tip');
    const k = t.getAttribute('data-kbd');
    if (k) { const s = document.createElement('span'); s.className = 'kbd'; s.textContent = k; _tipEl.appendChild(s); }
    document.body.appendChild(_tipEl);
    const r = t.getBoundingClientRect(), w = _tipEl.offsetWidth, h = _tipEl.offsetHeight;
    let left = Math.max(6, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 6));
    let top = r.bottom + 6; if (top + h > window.innerHeight - 6) top = r.top - h - 6;
    _tipEl.style.left = Math.round(left) + 'px'; _tipEl.style.top = Math.round(top) + 'px';
  }, 450);
});
document.addEventListener('mousedown', _hideTip, true);
document.addEventListener('keydown', _hideTip, true);
window.addEventListener('blur', _hideTip);

/* ============================================================
   THE 2.18 KIT: one set of building blocks for buttons, headers, empty
   lines, error toasts, copying, and a card's status line, folds and one
   main action (docs/dev/UI_CLEANUP_PLAN.md C1, docs/dev/SIMPLIFY_PLAN.md
   section 3). Styles: 01-components.css. New code uses these; the private
   helpers in the modules move onto them as their files are touched.
   ============================================================ */

/* ---------- buttons ---------- */
const _BTN_KINDS = Object.freeze({ primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost', danger: 'btn-danger', 'danger-solid': 'btn-danger-solid' });
/**
 * The one button builder -> <button type="button">.
 *   label, icon         text (escaped) and a sprite icon; no label = an icon button (.btn-icon)
 *                       named by `aria` / `tip`
 *   kind                'primary' | 'secondary' (default) | 'ghost' | 'danger' | 'danger-solid' |
 *                       'link' (an inline text link); 'btn-primary' etc. work too.
 *                       One primary per surface (UX_BLUEPRINT.md 3).
 *   size                'md' (default) | 'sm' | 'lg' (hero buttons only); 'xs' is 'sm'
 *   run(e, btn)         on click. The click stops at the button (a row or card under it does not
 *                       get it); bubble: true lets it through.
 *   wait: true          while the promise run returns is pending the button is disabled and
 *                       busy, so a second click does nothing
 *   tip, kbd, aria      tooltip (data-tip), its key (data-kbd), aria-label
 *   cls, iconCls, disabled, pressed (aria-pressed), data ({key: value} -> data-*), type ('submit')
 */
function uiButton(o) {
  o = o || {};
  const b = document.createElement('button');
  b.type = o.type === 'submit' ? 'submit' : 'button';
  const label = o.label == null ? '' : String(o.label);
  const size = o.size === 'xs' ? 'sm' : o.size;
  const kind = String(o.kind || 'secondary').replace(/^btn-/, '');
  if (!label && o.icon) b.className = 'btn-icon' + (size === 'sm' ? ' btn-sm' : '');
  else if (kind === 'link') b.className = 'btn-link';
  else b.className = 'btn ' + (_BTN_KINDS[kind] || 'btn-secondary') + (size === 'sm' ? ' btn-sm' : size === 'lg' ? ' btn-lg' : '');
  if (o.cls) b.className += ' ' + String(o.cls);
  b.innerHTML = (o.icon ? icon(o.icon, o.iconCls) : '') + (label ? `<span>${esc(label)}</span>` : '');
  const aria = o.aria || (label ? '' : o.tip);
  const tip = o.tip || (label ? '' : o.aria);
  if (aria) b.setAttribute('aria-label', String(aria));
  if (tip) b.setAttribute('data-tip', String(tip));
  if (o.kbd) b.setAttribute('data-kbd', String(o.kbd));
  if (o.pressed !== undefined) b.setAttribute('aria-pressed', o.pressed ? 'true' : 'false');
  if (o.disabled) b.disabled = true;
  if (o.data) for (const k of Object.keys(o.data)) if (o.data[k] != null) b.dataset[k] = String(o.data[k]);
  if (typeof o.run === 'function') {
    b.onclick = (e) => {
      if (!o.bubble) e.stopPropagation();
      if (b.getAttribute('aria-busy') === 'true') return;
      const r = o.run(e, b);
      if (!o.wait || !r || typeof r.then !== 'function') return;
      b.disabled = true; b.setAttribute('aria-busy', 'true'); b.classList.add('is-busy');
      const done = () => { b.disabled = !!o.disabled; b.removeAttribute('aria-busy'); b.classList.remove('is-busy'); };
      r.then(done, (err) => { done(); console.error('[button]', err); });
    };
  }
  return b;
}
/** Header actions: elements as they are, option objects through uiButton (ghost, small), `more` as a menu. */
function _headActions(h, o) {
  for (const a of (o.actions || [])) {
    if (!a) continue;
    h.appendChild(a.nodeType ? a : uiButton(Object.assign({ kind: 'ghost', size: 'sm' }, a)));
  }
  const more = (o.more || []).filter(Boolean);
  if (more.length) h.appendChild(uiButton({ icon: 'ellipsis', size: 'sm', aria: o.moreLabel || 'More', cls: 'head-more', run: (e, btn) => openMenu(btn, more) }));
}

/* ---------- card and section headers ---------- */
/**
 * A card's header (.card-h): [icon] Title [count] ............ [actions] [More].
 * The same markup Home cards use, so the grid's title link (NAVIGATION_PLAN.md 2.8),
 * edit mode (actions hide) and the idle icon nod all work with it.
 *   cardHeadHtml({icon, title, count, cls}) -> markup, for innerHTML templates
 *   cardHead({icon, title, count, cls, page, actions, more, moreLabel}) -> element
 *     page: a view; the title opens it (a chevron on hover and focus); Home cards can
 *       leave it to registerHomeWidget({page})
 *     actions: [element | uiButton options (default ghost, small)]: one main action at most
 *     more: openMenu items behind a "More" button, for everything else
 */
function cardHeadHtml(o) {
  o = o || {};
  const n = o.count != null && o.count !== '' ? `<span class="n num">${esc(o.count)}</span>` : '';
  return `<div class="card-h${o.cls ? ' ' + esc(o.cls) : ''}">${o.icon ? icon(o.icon) : ''}<h3>${esc(o.title || '')}</h3>${n}<span class="spacer"></span></div>`;
}
function cardHead(o) {
  o = o || {};
  const t = document.createElement('template'); t.innerHTML = cardHeadHtml(o);
  const h = t.content.firstChild;
  if (o.page) cardTitleLink(h.querySelector('h3'), o.page);
  _headActions(h, o);
  return h;
}
/**
 * Turn a header's title (an h3, or any element) into a button that opens `view`, with a chevron
 * on hover and focus. Opening the page you are on does nothing. False when it is a link already.
 * label: the page's name for the tooltip (default: the page registry's, else the view's title).
 */
function cardTitleLink(h, view, label) {
  if (!h || !view || (h.closest && h.closest('button, a')) || h.querySelector('.hw-title-link')) return false;
  if (!label) {
    try {
      const p = typeof pageFor === 'function' ? pageFor(view) : null;
      label = p && typeof pageLabel === 'function' ? pageLabel(p) : (typeof viewTitle === 'function' ? viewTitle(view) : '');
    } catch (e) { label = ''; }
    label = String(label || view);
  }
  const b = document.createElement('button'); b.type = 'button'; b.className = 'hw-title-link';
  while (h.firstChild) b.appendChild(h.firstChild);
  const text = b.textContent.trim();
  b.insertAdjacentHTML('beforeend', icon('chevron-right', 'i-xs hw-title-chev'));
  b.setAttribute('aria-label', text && text !== label ? `${text}: open ${label}` : `Open ${label}`);
  b.setAttribute('data-tip', 'Open ' + label);
  b.onclick = (e) => { e.stopPropagation(); if (state.view !== view) setView(view); };
  h.appendChild(b);
  return true;
}
/**
 * A section's header inside a page (.sec-h, an h2: the page title is the shared header's).
 *   secHeadHtml({title, sub, count, icon, cls}) -> markup
 *   secHead({title, sub, count, icon, cls, actions, more, moreLabel}) -> element
 *     sub: one short line beside the title; actions and more as in cardHead
 */
function secHeadHtml(o) {
  o = o || {};
  const n = o.count != null && o.count !== '' ? `<span class="n num">${esc(o.count)}</span>` : '';
  const sub = o.sub ? `<span class="sec-sub">${esc(o.sub)}</span>` : '';
  return `<div class="sec-h${o.sticky ? ' is-sticky' : ''}${o.cls ? ' ' + esc(o.cls) : ''}">${o.icon ? icon(o.icon) : ''}<h2>${esc(o.title || '')}</h2>${n}${sub}<span class="spacer"></span></div>`;
}
function secHead(o) {
  o = o || {};
  const t = document.createElement('template'); t.innerHTML = secHeadHtml(o);
  const h = t.content.firstChild;
  _headActions(h, o);
  return h;
}

/* ---------- empty lines ---------- */
/**
 * An empty list inside a card or dialog: one muted line, and an optional link that fills it.
 * (A page or a whole section uses mountEmptyState: art or icon, one sentence, one action.)
 * Say what will appear here, never "No data". emptyLine(text, {label, run, icon}?) -> <p>
 */
function emptyLine(text, action) {
  const p = document.createElement('p'); p.className = 'empty-line';
  const s = document.createElement('span'); s.textContent = String(text == null ? '' : text);
  p.appendChild(s);
  if (action && action.label && typeof action.run === 'function') p.appendChild(uiButton({ label: action.label, icon: action.icon, kind: 'link', run: action.run }));
  return p;
}

/* ---------- error toasts and copying ---------- */
/**
 * The error toast: "Couldn’t <what>: <plain reason>." with one action, Try again (retry is a
 * function) or the next step (retry is {label, run}). `what` is what failed, as a verb phrase:
 * 'save the note', 'copy the link'. With no button, a server-down error gets "How to start it",
 * and a line that only says another computer is asleep shows calmly (toast()). Returns close().
 */
function toastError(what, e, retry) {
  const w = String(what || '').trim();
  let text;
  if (w) { const r = netErrorReason(e); text = `Couldn’t ${w}: ${r}${/[.!?]$/.test(r) ? '' : '.'}`; }
  else text = netErrorMessage(e);
  const o = { kind: 'err' };
  if (typeof retry === 'function') o.retry = retry;
  else if (retry && retry.label && typeof retry.run === 'function') o.action = { label: retry.label, run: retry.run };
  if (e && e.stack && !netIsDown(e)) console.warn('[' + (w || 'error') + ']', e);
  return toast(text, o);
}
/** 'link' -> 'the link'; 'your code' and 'the address' stay as they are. */
function _copyWhat(w) { return /^(the|your|my|this|that|these|those|a|an|its|their)\b/i.test(w) ? w : 'the ' + w; }
/** Copy with no clipboard API (an old browser, or a page that is not allowed to): a hidden text box. */
function _copyFallback(s) {
  let ok = false;
  const ta = document.createElement('textarea');
  ta.value = s; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  const prev = document.activeElement;
  document.body.appendChild(ta);
  try { ta.select(); ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  if (prev && prev.focus) try { prev.focus({ preventScroll: true }); } catch (e) {}
  return !!ok;
}
/**
 * Copy text, with one wording everywhere: "Copied" / "Link copied", or
 * "Couldn’t copy the link: select it and press Ctrl+C." `what` is a noun ('link', 'invite link',
 * 'your code'). quiet: no toast when it worked (the button says Copied itself). -> Promise<boolean>
 */
async function copyText(text, what, opts) {
  const o = opts || {};
  const s = String(text == null ? '' : text);
  const w = String(what || '').trim();
  let ok = false;
  try { if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') { await navigator.clipboard.writeText(s); ok = true; } } catch (e) { ok = false; }
  if (!ok) ok = _copyFallback(s);
  if (ok) { if (!o.quiet) toast(w ? w.charAt(0).toUpperCase() + w.slice(1) + ' copied' : 'Copied', { kind: 'ok', icon: 'copy' }); }
  else toast(`Couldn’t copy${w ? ' ' + _copyWhat(w) : ''}: select it and press ${_TOAST_MOD}+C.`, { kind: 'err' });
  return ok;
}

/* ---------- a card's status line, folds and one main action (SIMPLIFY_PLAN.md section 3) ----------
   A card with a state: the card (a _settingsCard in Settings, a .card elsewhere), then
     host.body.appendChild(setStatusLine(tone, word, detail))   first
     the face rows (daily things)
     setAction(host, label, run)                                 the one main button
     setFold(host, '<group>-<card>-more', 'More', fill)          occasional things
     setFold(host, '<group>-<card>-adv', 'Advanced', fill, {advanced: true})   rare or technical
   Tones: ok (green), busy (blue, pulsing), idle and off (grey, calm), warn (amber: the user must
   act), err (red: broken, the user must act). Words come from the glossary (SIMPLIFY_PLAN.md 2):
   Up to date, Syncing, Catching up 40%, Setting up, Previewing, Asleep, Off, On, Not set up,
   Paused, Needs an update, Needs you. Asleep, offline and first runs are grey, never amber.
   (setStatus(id, s) is the task status setter in 20-task-model.js, hence setStatusLine.) */
const SET_TONES = Object.freeze(['ok', 'busy', 'idle', 'off', 'warn', 'err']);
const _setFoldOpen = new Map();   // fold key -> open, for this session
/** Repaint a status line in place: a dot, one word, at most one short detail. Returns el. */
function setStatusPaint(el, tone, word, detail) {
  el.className = 'set-status set-status-' + (SET_TONES.includes(tone) ? tone : 'idle');
  el.replaceChildren();
  const dot = document.createElement('span'); dot.className = 'set-status-dot'; dot.setAttribute('aria-hidden', 'true');
  const w = document.createElement('b'); w.className = 'set-status-w'; w.textContent = String(word || '');
  el.append(dot, w);
  if (detail) { const d = document.createElement('span'); d.className = 'set-status-d'; d.textContent = '· ' + String(detail); el.appendChild(d); }
  return el;
}
/** The status line a card starts with -> <div class="set-status" role="status">. */
function setStatusLine(tone, word, detail) {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  return setStatusPaint(el, tone, word, detail);
}
/**
 * A More / Advanced fold (a <details>) appended to host (a {card, body} or an element).
 * fill({body, card}) adds rows to body exactly like a _settingsCard. Rows are built at once,
 * so Settings search finds them and opens the fold. Folds start closed and remember being
 * open for the session (by key: '<group>-<card>-more' / '-adv', so two cards never share one).
 * A fold that fill left empty is not shown. -> the <details>
 */
function setFold(host, key, label, fill, opts) {
  const o = opts || {};
  const det = document.createElement('details');
  det.className = 'set-more' + (o.advanced ? ' set-adv' : '');
  det.dataset.fold = String(key || '');
  det.open = _setFoldOpen.get(det.dataset.fold) === true;
  det.ontoggle = () => { _setFoldOpen.set(det.dataset.fold, det.open); };
  const sum = document.createElement('summary');
  sum.textContent = label || (o.advanced ? 'Advanced' : 'More');
  const body = document.createElement('div'); body.className = 'set-more-b';
  det.append(sum, body);
  if (typeof fill === 'function') fill({ body, card: det });
  if (typeof fill !== 'function' || body.childNodes.length) (host.body || host).appendChild(det);
  return det;
}
/** The card's one main button, on its own row (uiButton; kind 'primary' unless given). -> the button */
function setAction(host, label, run, opts) {
  const o = opts || {};
  const row = document.createElement('div'); row.className = 'set-action';
  const b = uiButton({ label, icon: o.icon, kind: o.kind || 'primary', size: 'sm', run, disabled: o.disabled, tip: o.tip, wait: o.wait, bubble: true });
  row.appendChild(b);
  (host.body || host).appendChild(row);
  return b;
}

/* ---------- 2.19 layout primitives (lean UI; MODULES.md "Layout primitives") ----------
   Small, reusable pieces for pages that had grown into one long stack of cards: a two-zone page,
   a list beside the selected thing, pill tabs in the page header, a long list shown a page at a time.
   Every text goes in with textContent; `main`, `side`, `list`, `detail`, `empty` take an element, a
   plain string, or a function(host) that fills (or returns) one. They stack on a narrow window by the
   width of the page itself (container query on #main), so a half-width window and a phone read well. */
function _lyFill(host, v) {
  if (typeof v === 'function') { const r = v(host); if (r && r.nodeType) host.appendChild(r); return; }
  if (v && v.nodeType) host.appendChild(v);
  else if (typeof v === 'string' && v) host.appendChild(emptyLine(v));
}
const _lyCls = (c) => (c ? ' ' + String(c).replace(/[^a-zA-Z0-9 _-]/g, '') : '');
/** Two zones: `main` (grows, a readable width) and `side` (a fixed column; sticky: true keeps a SHORT one in view). -> .pg-layout (.pgMain, .pgSide) */
function pageLayout(o) {
  o = o || {};
  const el = document.createElement('div');
  el.className = 'pg-layout' + (o.side ? '' : ' no-side') + (o.side && o.sticky ? ' is-sticky' : '') + _lyCls(o.cls);
  if (o.sideWidth) el.style.setProperty('--pg-side', Math.max(220, Math.min(480, Number(o.sideWidth) || 320)) + 'px');
  const main = document.createElement('div'); main.className = 'pg-main';
  _lyFill(main, o.main);
  el.appendChild(main);
  el.pgMain = main; el.pgSide = null;
  if (o.side) { const side = document.createElement('aside'); side.className = 'pg-side'; _lyFill(side, o.side); el.appendChild(side); el.pgSide = side; }
  return el;
}
/**
 * A list of things and the selected one beside it. `list` fills the left column (build its rows with mdRow);
 * `detail` fills the right one, or `empty` shows when there is nothing to show. -> .md
 * (.mdList, .mdDetail; .mdSet(detail) swaps the right side without touching the list, so scroll and focus stay).
 */
function masterDetail(o) {
  o = o || {};
  const el = document.createElement('div');
  el.className = 'md' + _lyCls(o.cls);
  if (o.listWidth) el.style.setProperty('--md-list', Math.max(200, Math.min(420, Number(o.listWidth) || 280)) + 'px');
  const list = document.createElement('div'); list.className = 'md-list'; list.setAttribute('role', 'list');
  if (o.label) list.setAttribute('aria-label', String(o.label));
  _lyFill(list, o.list);
  const pane = document.createElement('div'); pane.className = 'md-detail';
  const set = (v) => { pane.replaceChildren(); if (v === null || v === undefined || v === false) _lyFill(pane, o.empty); else _lyFill(pane, v); };
  set(o.detail);
  el.append(list, pane);
  el.mdList = list; el.mdDetail = pane; el.mdSet = set;
  return el;
}
/**
 * One row of a masterDetail list: {title, sub, icon | avatar (an element), badge, active, tip, run}. -> <button class="md-row">
 * pickable: true makes it a <div> that acts as a button, because a checkbox (multiPick, 11-ui-pick.js) cannot sit in a <button>.
 */
function mdRow(o) {
  o = o || {};
  const b = document.createElement(o.pickable ? 'div' : 'button');
  if (o.pickable) { b.tabIndex = 0; b.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === b) { e.preventDefault(); b.click(); } }); } else b.type = 'button';
  b.className = 'md-row' + (o.active ? ' on' : '') + _lyCls(o.cls);
  b.setAttribute('role', 'listitem');
  if (o.active) b.setAttribute('aria-current', 'true');
  if (o.tip) b.title = String(o.tip);
  if (o.avatar && o.avatar.nodeType) { const a = document.createElement('span'); a.className = 'md-row-lead'; a.appendChild(o.avatar); b.appendChild(a); }
  else if (o.icon) { const a = document.createElement('span'); a.className = 'md-row-lead md-row-ic'; a.appendChild(iconEl(o.icon)); b.appendChild(a); }
  const t = document.createElement('span'); t.className = 'md-row-t';
  const n = document.createElement('span'); n.className = 'md-row-n'; n.textContent = String(o.title == null ? '' : o.title);
  t.appendChild(n);
  if (o.sub) { const s = document.createElement('span'); s.className = 'md-row-s'; s.textContent = String(o.sub); t.appendChild(s); }
  b.appendChild(t);
  if (o.badge != null && o.badge !== '' && o.badge !== 0) { const g = document.createElement('span'); g.className = 'md-row-b num'; g.textContent = String(o.badge); b.appendChild(g); }
  if (typeof o.run === 'function') b.onclick = (e) => o.run(e, b);
  return b;
}
/**
 * The pill tabs of a page: tabs [{id, label, icon, badge}], the active id, onChange(id, tab). Arrow keys move,
 * Home / End jump. -> .sub-tabs. headerSubTabs(el, /^friends/) puts it in the page header (below the title and the
 * area tabs; it goes away by itself when the view stops matching the regexp) and returns the host.
 */
function subTabs(o) {
  o = o || {};
  const bar = document.createElement('div'); bar.className = 'sub-tabs'; bar.setAttribute('role', 'tablist');
  if (o.label) bar.setAttribute('aria-label', String(o.label));
  const tabs = Array.isArray(o.tabs) ? o.tabs.filter(t => t && t.id) : [];
  for (const t of tabs) {
    const on = t.id === o.active;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'sub-tab' + (on ? ' on' : '');
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; b.dataset.tab = String(t.id);
    if (t.icon) b.appendChild(iconEl(t.icon, 'i-xs'));
    const s = document.createElement('span'); s.textContent = String(t.label || t.id); b.appendChild(s);
    if (t.badge != null && t.badge !== '' && t.badge !== 0) { const g = document.createElement('span'); g.className = 'sub-tab-n num'; g.textContent = String(t.badge); b.appendChild(g); }
    b.onclick = () => { if (!on && typeof o.onChange === 'function') o.onChange(t.id, t); };
    bar.appendChild(b);
  }
  bar.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const all = [...bar.querySelectorAll('.sub-tab')], i = all.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    all[e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length].focus();
  });
  bar.dataset.k = JSON.stringify([o.active, tabs.map(t => [t.id, t.label, t.badge || 0])]);
  return bar;
}
function headerSubTabs(el, viewRe) {
  const head = document.getElementById('view-header');
  if (!head) return null;
  let host = document.getElementById('view-subtabs');
  if (!el) { if (host) host.remove(); return null; }
  if (host && host.firstChild && host.firstChild.dataset.k === el.dataset.k) return host;   // nothing changed: focus stays
  const had = host && host.contains(document.activeElement) ? [...host.querySelectorAll('button')].indexOf(document.activeElement) : -1;
  if (!host) { host = document.createElement('div'); host.id = 'view-subtabs'; host.className = 'view-subtabs'; head.appendChild(host); }
  host.dataset.for = viewRe instanceof RegExp ? viewRe.source : '';
  host.replaceChildren(el);
  if (had >= 0) { const b = el.querySelectorAll('button')[had]; if (b) b.focus({ preventScroll: true }); }
  return host;
}
/** The shell calls this on every page change: tabs a page put in the header leave with it. */
function headerSubTabsSweep() {
  const host = document.getElementById('view-subtabs');
  if (!host) return;
  let keep = false;
  try { keep = !!host.dataset.for && new RegExp(host.dataset.for).test(String(state.view || '')); } catch (e) { keep = false; }
  if (!keep) host.remove();
}
/**
 * A long list shown a page at a time: items, pageSize (20), render(item, i) -> element, empty (as for pageLayout),
 * tag ('div'). "Show more (n)" reveals the next page in place. For a list the server pages (a feed), pass
 * loadMore(): Promise<array of the next items> (an empty answer ends it), or hasMore:false to hide the button.
 * start: how many to draw first (default one page); onShown(n): told how many are drawn, so a repaint can ask for the same.
 * -> .pg-list (.setItems(items, {hasMore, keep}) starts over, or keeps the count shown; .shown() how many are drawn)
 */
function pagedList(o) {
  o = o || {};
  const size = Math.max(3, Math.min(200, Number(o.pageSize) || 20));
  const el = document.createElement('div'); el.className = 'pg-list' + _lyCls(o.cls);
  const body = document.createElement(o.tag || 'div'); body.className = 'pg-list-b';
  const foot = document.createElement('div'); foot.className = 'pg-list-more';
  el.append(body, foot);
  let startN = Math.max(0, Number(o.start) || 0);   // how many to draw first (a repaint keeps what was already shown)
  let items = [], shown = 0, remote = typeof o.loadMore === 'function' && o.hasMore !== false;
  const draw = (to) => {
    for (; shown < to && shown < items.length; shown++) { let n = null; try { n = o.render(items[shown], shown); } catch (e) { console.error('[pagedList] render', e); } if (n && n.nodeType) body.appendChild(n); }
    foot.replaceChildren();
    if (typeof o.onShown === 'function') { try { o.onShown(shown); } catch (e) { /* the caller's note */ } }
    const left = items.length - shown;
    if (left > 0) foot.appendChild(uiButton({ label: `Show more (${left})`, kind: 'ghost', size: 'sm', run: () => draw(shown + size) }));
    else if (remote) foot.appendChild(uiButton({ label: 'Show more', kind: 'ghost', size: 'sm', wait: true, run: async () => {
      let more = [];
      try { more = await o.loadMore(); } catch (e) { toastError('load more', e); return; }
      if (!Array.isArray(more) || !more.length) { remote = false; draw(shown); return; }
      items = items.concat(more); draw(shown + size);
    } }));
  };
  const empty = () => { const h = document.createElement('div'); h.className = 'pg-list-empty'; _lyFill(h, o.empty); body.appendChild(h); };
  el.setItems = (next, opt) => {
    const keepN = opt && opt.keep ? shown : 0;
    items = Array.isArray(next) ? next : []; shown = 0; body.replaceChildren(); foot.replaceChildren();
    if (opt && opt.hasMore === false) remote = false; else if (opt && opt.hasMore === true) remote = typeof o.loadMore === 'function';
    if (!items.length) { empty(); return; }
    draw(Math.max(size, keepN, startN)); startN = 0;
  };
  el.shown = () => shown;
  el.setItems(o.items);
  return el;
}
