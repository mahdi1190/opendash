/* ============================================================
   QUICK CAPTURE AND THE INBOX (owner: lists).
   Ctrl+Shift+Space on any page (or the palette's "Quick capture") opens a
   small bar at the top: type a task the quick way ("email Sam tomorrow 3pm
   p1 #email @computer ~30m", live chips, a click keeps a word as text) and
   Enter files it in the Inbox without leaving what you are doing. The bar
   stays for the next one; Esc closes it.
   The Inbox ('inbox' view) lists captured tasks until they are sorted:
   giving one a date, plan, stream, priority, tags, context or estimate
   sorts it (inboxOnActivity, called from logActivity), or "Mark all sorted".
   Outside the app: '#capture' (or '#capture=<text>') opens the page as a
   capture box only; Settings-free launcher: openCaptureLauncher() makes a
   small desktop launcher (Windows: opens Edge in a small app window, no
   admin rights; any system: a bookmark), and Windows can give its shortcut
   a global key.
   ============================================================ */
const _QCAP_SORTS = new Set(['date', 'plan', 'stream', 'priority', 'tags', 'contexts', 'energy', 'estimate', 'people']);
/** A task captured to the Inbox is sorted once it is given a home (20-task-model.js logActivity). */
function inboxOnActivity(taskId, type) {
  if (!_QCAP_SORTS.has(type)) return;
  const it = getItem(taskId);
  if (it && it.inbox) { delete it.inbox; _qcapMaybeZero(); }
}
let _qcapZeroAt = 0;
function _qcapMaybeZero() {
  setTimeout(() => {
    const left = getAllItems().filter(i => i.inbox && statusOf(i.id) !== 'done').length;
    if (!left && state.view === 'inbox' && Date.now() - _qcapZeroAt > 60000) { _qcapZeroAt = Date.now(); toast('Inbox zero. Everything has a home.', { icon: 'party-popper', kind: 'ok' }); }
  }, 0);
}
function inboxStrip() {
  const open = getAllItems().filter(i => i.inbox && statusOf(i.id) !== 'done');
  const box = document.createElement('div'); box.className = 'sl-strip ib-strip';
  box.innerHTML = `<span class="sl-strip-lead">${icon('inbox', 'i-sm')}<span>${open.length ? `${open.length} to sort` : 'All sorted'}</span></span>`
    + `<span class="sl-chips subtle">Give each one a date, stream, tag or context and it leaves the Inbox.</span>`;
  const cap = document.createElement('button'); cap.type = 'button'; cap.className = 'btn btn-ghost btn-sm';
  cap.innerHTML = icon('plus') + '<span>Capture</span>'; cap.setAttribute('data-tip', 'Ctrl+Shift+Space on any page');
  cap.onclick = () => openQuickCapture();
  box.appendChild(cap);
  if (open.length) {
    const all = document.createElement('button'); all.type = 'button'; all.className = 'btn btn-secondary btn-sm';
    all.innerHTML = icon('check-check') + '<span>Mark all sorted</span>';
    all.onclick = () => {
      batchTasks(open.map(i => i.id), id => { const it = getItem(id); if (it) delete it.inbox; });
      toast(`${open.length} sorted. Inbox zero.`, { icon: 'party-popper', kind: 'ok', action: { label: 'Undo', run: () => undo() } });
    };
    box.appendChild(all);
  }
  const more = document.createElement('button'); more.type = 'button'; more.className = 'btn-icon btn-sm'; more.setAttribute('aria-label', 'Desktop launcher'); more.setAttribute('data-tip', 'Capture from outside the app');
  more.innerHTML = icon('external-link'); more.onclick = () => openCaptureLauncher();
  box.appendChild(more);
  return box;
}

/* ---------- the capture bar ---------- */
let _qcap = null;   // {el, inp, n, close}
function openQuickCapture(prefill, o) {
  o = o || {};
  if (_qcap) { _qcap.inp.focus(); if (prefill) { _qcap.inp.value = prefill; _qcap.paint(); } return; }
  const prevFocus = document.activeElement;
  const el = document.createElement('div'); el.className = 'qcap' + (o.standalone ? ' is-standalone' : '');
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Quick capture to the Inbox');
  el.innerHTML = `<div class="qcap-box"><span class="qcap-ic">${icon('inbox')}</span></div><div class="qa-preview qcap-chips" aria-live="polite"></div>`
    + `<div class="qa-suggest pop qcap-suggest" role="listbox" hidden></div>`
    + `<div class="qcap-foot subtle"><span class="qcap-msg"></span><span class="qcap-keys"><span><kbd class="kbd">Enter</kbd> to Inbox</span><span><kbd class="kbd">Ctrl</kbd><kbd class="kbd">Enter</kbd> add and close</span><span><kbd class="kbd">Esc</kbd> close</span></span></div>`;
  const box = el.querySelector('.qcap-box'), chips = el.querySelector('.qcap-chips'), sug = el.querySelector('.qcap-suggest'), msg = el.querySelector('.qcap-msg');
  const inp = document.createElement('input'); inp.className = 'qcap-input'; inp.autocomplete = 'off'; inp.spellcheck = true;
  inp.placeholder = 'Capture a task… e.g. email Sam tomorrow 3pm p1 @computer ~30m';
  inp.setAttribute('aria-label', 'Capture a task');
  inp.value = prefill || '';
  box.appendChild(inp);
  const launch = document.createElement('button'); launch.type = 'button'; launch.className = 'btn-icon btn-sm'; launch.setAttribute('aria-label', 'Capture from outside the app'); launch.setAttribute('data-tip', 'Desktop launcher');
  launch.innerHTML = icon('external-link'); launch.onclick = () => openCaptureLauncher();
  if (!o.standalone) box.appendChild(launch);
  let ignore = [], n = 0;
  const sugState = { items: [], index: 0, word: null };
  const paint = () => {
    const txt = inp.value.trim();
    if (!txt) { chips.innerHTML = `<span class="qa-help">${esc('tomorrow 3pm · p1 · #tag · @person · @phone · low energy · ~30m')}</span>`; return; }
    const parsed = parseQuickAdd(txt, { ignore });
    chips.innerHTML = (typeof _qadChips === 'function' ? _qadChips(parsed, true) : '') + `<span class="chip qa-tok implied" title="Where it goes">${icon('inbox', 'i-xs')}<span>Inbox</span></span>`;
  };
  const paintSug = () => {
    const w = typeof _qadWordAtCaret === 'function' ? _qadWordAtCaret(inp) : null;
    sugState.word = w;
    sugState.items = w ? _qadSuggestions(w.sigil, w.text, w.raw) : [];
    if (!sugState.items.length || document.activeElement !== inp) { sug.hidden = true; return; }
    sugState.index = Math.min(sugState.index, sugState.items.length - 1);
    sug.innerHTML = '';
    sugState.items.forEach((s, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pop-item' + (i === sugState.index ? ' on' : ''); b.setAttribute('role', 'option');
      b.innerHTML = (s.kind === 'stream' ? `<span class="ic"><span class="dot" style="--c:${escAttr(safeColor(s.color))}"></span></span>` : icon(s.icon || (s.kind === 'person' ? 'at-sign' : s.kind === 'new' ? 'user-plus' : 'hash'))) + `<span class="lbl">${esc(s.label)}</span>${s.hint ? `<span class="hint">${esc(s.hint)}</span>` : ''}`;
      b.addEventListener('mousedown', (e) => { e.preventDefault(); accept(s); });
      sug.appendChild(b);
    });
    sug.hidden = false;
  };
  const accept = (s) => {
    const w = sugState.word; if (!w || !s) return;
    const v = inp.value, ins = s.insert + ' ';
    inp.value = v.slice(0, w.start) + ins + v.slice(w.end).replace(/^[ \t]+/, '');
    const pos = w.start + ins.length; try { inp.setSelectionRange(pos, pos); } catch (e) {}
    sugState.index = 0; paint(); paintSug();
  };
  const add = () => {
    const parsed = parseQuickAdd(inp.value, { ignore });
    if (!parsed.title) { box.classList.add('is-invalid'); setTimeout(() => box.classList.remove('is-invalid'), 400); return null; }
    const id = addParsedTask(parsed, { inbox: true });
    if (!id) return null;
    n++;
    const typed = inp.value, ign = ignore.slice();
    inp.value = ''; ignore = []; paint();
    msg.innerHTML = `${icon('check', 'i-xs')}<span>${n === 1 ? 'In the Inbox' : `${n} captured`}: ${esc(parsed.title.slice(0, 50))}</span>`;
    const u = document.createElement('button'); u.type = 'button'; u.className = 'link qcap-undo'; u.textContent = 'Undo';
    u.onclick = () => { undo(); n = Math.max(0, n - 1); msg.innerHTML = `${icon('undo-2', 'i-xs')}<span>Taken back: the text is here to change</span>`; if (!inp.value.trim()) { inp.value = typed; ignore = ign; } paint(); inp.focus(); };
    msg.appendChild(u);
    el.classList.remove('is-added'); void el.offsetWidth; el.classList.add('is-added');
    return id;
  };
  const close = () => {
    if (!_qcap) return;
    document.removeEventListener('mousedown', onDoc, true);
    el.remove(); _qcap = null;
    if (o.standalone) {
      document.body.classList.remove('capture-mode');
      // A launcher window (Edge --app) closes itself; a normal tab shows the app.
      try { window.close(); } catch (e) { /* not a script-closable window */ }
      render();
      return;
    }
    if (prevFocus && prevFocus.isConnected && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
  };
  const onDoc = (e) => { if (!el.contains(e.target) && !o.standalone && !inp.value.trim()) close(); };
  inp.addEventListener('input', () => { if (!inp.value.trim()) ignore = []; paint(); paintSug(); });
  inp.addEventListener('keyup', (e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) paintSug(); });
  inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) sug.hidden = true; }, 150));
  inp.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (!sug.hidden && sugState.items.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugState.index = (sugState.index + (e.key === 'ArrowDown' ? 1 : -1) + sugState.items.length) % sugState.items.length; paintSug(); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); accept(sugState.items[sugState.index]); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); sug.hidden = true; return; }
    }
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      const left = inp.value.trim();
      close();
      if (left && !o.standalone) toast('Not captured', { icon: 'file-pen-line', action: { label: 'Restore', run: () => openQuickCapture(left) } });
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); const id = add(); if (id && (e.ctrlKey || e.metaKey)) close(); }
  });
  chips.addEventListener('mousedown', (e) => { if (e.target.closest('[data-raw]')) e.preventDefault(); });
  chips.addEventListener('click', (e) => { const c = e.target.closest('[data-raw]'); if (!c) return; ignore.push(c.getAttribute('data-raw')); paint(); inp.focus(); });
  sug.addEventListener('mousedown', (e) => e.preventDefault());
  document.body.appendChild(el);
  _qcap = { el, inp, paint, close };
  paint();
  setTimeout(() => { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {} document.addEventListener('mousedown', onDoc, true); }, 0);
  return close;
}
// Ctrl+Shift+Space: capture from any page, even while typing somewhere else.
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.altKey || (e.code !== 'Space' && e.key !== ' ')) return;
  e.preventDefault(); e.stopPropagation();
  if (_qcap) { _qcap.inp.focus(); return; }
  const t = e.target;
  // Selected text in the page (an email, a note) becomes the capture's text.
  let sel = '';
  try { if (!(t && ['INPUT', 'TEXTAREA'].includes(t.tagName))) sel = String(window.getSelection() || '').trim().replace(/\s+/g, ' ').slice(0, 200); } catch (e2) { sel = ''; }
  openQuickCapture(sel);
}, true);
registerCommand({ id: 'quick-capture', label: 'Quick capture to the Inbox', icon: 'inbox', kbd: 'Ctrl+Shift+Space', keywords: 'capture inbox jot note add task quick later', run: () => setTimeout(() => openQuickCapture(), 30) });
registerCommand({ id: 'capture-launcher', label: 'Desktop launcher for quick capture…', icon: 'external-link', keywords: 'shortcut desktop launcher hotkey capture window outside', run: () => openCaptureLauncher() });
if (typeof registerMoreItem === 'function') registerMoreItem({ id: 'quick-capture', label: 'Quick capture', icon: 'inbox', order: 19, run: () => openQuickCapture() });

/* ---------- '#capture': the page as a capture box (the launcher's small window) ---------- */
const _QCAP_BOOT = (() => { const m = /^#capture(?:=(.*))?$/.exec(location.hash || ''); if (!m) return null; try { return { text: m[1] ? decodeURIComponent(m[1]).slice(0, 300) : '' }; } catch (e) { return { text: '' }; } })();
if (_QCAP_BOOT) {
  document.body.classList.add('capture-mode');
  setTimeout(() => openQuickCapture(_QCAP_BOOT.text, { standalone: true }), 0);   // after the boot (99-boot.js) has drawn the page
}
window.addEventListener('hashchange', () => {
  const m = /^#capture(?:=(.*))?$/.exec(location.hash || '');
  if (!m) return;
  let text = ''; try { text = m[1] ? decodeURIComponent(m[1]).slice(0, 300) : ''; } catch (e) { text = ''; }
  try { history.replaceState(history.state, '', '#view=' + encodeURIComponent(state.view || 'home').replace(/%3A/gi, ':')); } catch (e) {}
  openQuickCapture(text);
});

/* ---------- the desktop launcher ---------- */
function openCaptureLauncher() {
  const url = location.origin + location.pathname + '#capture';
  const win = /Windows/i.test(navigator.userAgent || '');
  openDialog({
    title: 'Capture from outside the app', size: 'md', resizeKey: 'capture-launcher',
    body: (el) => {
      el.classList.add('qcap-launch');
      const p = document.createElement('p'); p.className = 'muted';
      p.textContent = 'Open a small capture window without opening the dashboard first. Whatever you type goes to the Inbox. OpenDash must be running.';
      el.appendChild(p);
      if (win) {
        const s1 = document.createElement('div'); s1.className = 'qcap-step';
        s1.innerHTML = `<div class="qcap-step-h">${icon('monitor', 'i-sm')}<b>Windows: a launcher file</b></div>`
          + '<ol><li>Download the launcher and move it to your desktop (or any folder).</li>'
          + '<li>Double-click it: a small capture window opens (Microsoft Edge, app mode; no admin rights needed).</li>'
          + '<li>For a key from anywhere: right-click it, <b>Show more options</b> then <b>Create shortcut</b>; in the shortcut’s <b>Properties</b>, set <b>Shortcut key</b> (for example Ctrl+Alt+Space). Keep the shortcut on the desktop or in the Start menu.</li></ol>';
        const dl = document.createElement('button'); dl.type = 'button'; dl.className = 'btn btn-primary btn-sm';
        dl.innerHTML = icon('download') + '<span>Download the launcher</span>';
        dl.onclick = () => {
          // A two-line script: Edge in a small app window at this dashboard's own address. Nothing else.
          const safe = url.replace(/[^A-Za-z0-9:/._#?=&%-]/g, '');
          const body = `@echo off\r\nrem OpenDash quick capture: opens a small window at the dashboard's capture page.\r\nstart "" msedge --app="${safe}" --window-size=620,260\r\n`;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([body], { type: 'application/octet-stream' }));
          a.download = 'OpenDash quick capture.cmd';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          toast('Launcher downloaded', { kind: 'ok' });
        };
        s1.appendChild(dl);
        el.appendChild(s1);
      }
      const s2 = document.createElement('div'); s2.className = 'qcap-step';
      s2.innerHTML = `<div class="qcap-step-h">${icon('link', 'i-sm')}<b>Any browser: a bookmark</b></div><p class="subtle">Bookmark this address (or pin it as an app). Add <code>=your text</code> after it to start with that text.</p>`;
      const row = document.createElement('div'); row.className = 'hstack qcap-url';
      const inp = document.createElement('input'); inp.className = 'control control-sm'; inp.readOnly = true; inp.value = url; inp.onfocus = () => inp.select();
      const cp = uiButton({ label: 'Copy', icon: 'copy', size: 'sm', run: () => copyText(url, 'address').then((ok) => { if (!ok) inp.select(); }) });
      const tryIt = uiButton({ label: 'Try it', icon: 'external-link', kind: 'ghost', size: 'sm', run: () => { try { window.open(url, 'opendash-capture', 'popup,width=620,height=260'); } catch (e) { /* blocked */ } } });
      row.append(inp, cp, tryIt);
      s2.appendChild(row);
      el.appendChild(s2);
      const s3 = document.createElement('p'); s3.className = 'field-hint';
      s3.innerHTML = `Inside the app: <kbd class="kbd">Ctrl</kbd><kbd class="kbd">Shift</kbd><kbd class="kbd">Space</kbd> on any page. Text you have selected on the page comes along.`;
      el.appendChild(s3);
    },
    actions: [{ label: 'Done', primary: true }],
  });
}
