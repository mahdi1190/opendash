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
     openDialog({title, body(el,close)|html, actions:[...], width, onClose}) -> close()
     confirmDialog({title,text,confirmLabel,danger}) -> Promise<boolean>
     promptDialog({title,label,value,placeholder,confirmLabel}) -> Promise<string|null>
     openDrawer({title, body(el,close), footer(el,close), width, onClose}) -> close()
     toast(msg, {kind:'ok'|'err'|'info', icon, action:{label,run}, timeout})
     avatarInitials(name)
     Tooltips: any element with data-tip="text" (and optional data-kbd="Ctrl+K").
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
  return `<div class="empty-state${o.compact ? ' compact' : ''}">`
    + `<div class="es-icon">${icon(o.icon || 'sparkles')}</div>`
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
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (a.primary ? 'btn-primary' : 'btn-secondary');
    b.innerHTML = (a.icon ? icon(a.icon) : '') + `<span>${esc(a.label)}</span>`;
    b.onclick = (e) => { e.stopPropagation(); a.run && a.run(); };
    acts.appendChild(b);
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
/**
 * A modal dialog (new style). body(el, close) fills the body, or pass html
 * (already-escaped markup). actions: [{label, primary, danger, run(close) -> false keeps open}].
 */
function openDialog(o) {
  o = o || {};
  if (_dialogClose) _dialogClose();
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  const dlg = document.createElement('div'); dlg.className = 'modal'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
  if (o.width) dlg.style.width = `min(${typeof o.width === 'number' ? o.width + 'px' : o.width}, calc(100vw - 32px))`;
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
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { const p = dlg.querySelector('.modal-f .btn-primary'); if (p) { e.preventDefault(); p.click(); } }
  };
  function close() {
    if (closed) return; closed = true;
    _dialogClose = null;
    document.removeEventListener('keydown', onKey, true);
    scrim.remove(); dlg.remove();
    if (o.onClose) try { o.onClose(); } catch (e) { console.error(e); }
    if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  x.onclick = close;
  scrim.onclick = close;
  if (typeof o.body === 'function') o.body(b, close);
  else if (o.html) b.innerHTML = o.html;
  if (o.actions && o.actions.length) {
    const f = document.createElement('div'); f.className = 'modal-f';
    for (const a of o.actions) {
      if (a === 'spacer') { const s = document.createElement('span'); s.className = 'spacer'; f.appendChild(s); continue; }
      const btn = document.createElement('button'); btn.type = 'button';
      btn.className = 'btn ' + (a.primary ? 'btn-primary' : a.danger ? 'btn-danger' : 'btn-secondary');
      btn.innerHTML = (a.icon ? icon(a.icon) : '') + `<span>${esc(a.label)}</span>`;
      btn.onclick = () => { const r = a.run ? a.run(close) : undefined; if (r !== false) close(); };
      f.appendChild(btn);
    }
    dlg.appendChild(f);
  }
  document.body.append(scrim, dlg);
  // Drag the edges to resize; remembered per dialog type (o.resizeKey, else its default width): 13-splitter.js.
  if (typeof makeResizable === 'function' && o.resizable !== false) {
    makeResizable(dlg, { key: 'dialog:' + (o.resizeKey || ('w' + (o.width || 560))), center: 'x', edges: ['e', 'w', 's', 'se', 'sw'],
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
/** toast('Saved', {kind:'ok'}) / toast('Deleted', {action:{label:'Undo', run: undo}}) */
function toast(msg, o) {
  o = o || {};
  const host = document.getElementById('toast-host');
  if (!host) return () => {};
  const t = document.createElement('div');
  t.className = 'toast' + (o.kind ? ' ' + o.kind : '');
  t.setAttribute('role', o.kind === 'err' ? 'alert' : 'status');
  const ic = o.icon || (o.kind === 'ok' ? 'circle-check' : o.kind === 'err' ? 'circle-alert' : 'info');
  t.innerHTML = icon(ic) + `<span class="msg">${esc(msg)}</span>`;
  let timer = null;
  const close = () => {
    if (timer) clearTimeout(timer);
    t.classList.add('out');
    setTimeout(() => t.remove(), 160);
  };
  if (o.action && o.action.label) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
    b.textContent = o.action.label;
    b.onclick = () => { close(); try { o.action.run && o.action.run(); } catch (e) { console.error(e); } };
    t.appendChild(b);
  }
  while (host.children.length >= 3) host.firstChild.remove();
  host.appendChild(t);
  timer = setTimeout(close, o.timeout || (o.action ? 6000 : 2800));
  t.addEventListener('mouseenter', () => { if (timer) clearTimeout(timer); });
  t.addEventListener('mouseleave', () => { timer = setTimeout(close, 1800); });
  return close;
}

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
