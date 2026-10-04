/* ============================================================
   EMAIL ACTIONS (owner: Home foundations W0-C; Calendar/Email area)
   ------------------------------------------------------------
   emailQuickTask(m, o)    one click: "Reply to <first>: <subject>" due today,
                           the sender linked when they are in People, tag
                           `email`, the thread related, and the thread marked
                           handled: ONE undo step. -> task id | null
   emailNeedsReply(o)      homeNeedsReply (12-home-mail-logic.js) over the
                           inbox store and state.emailTriage
   window.GmailDraft       Gmail DRAFTS (never sent; lib/gmail-draft.mjs):
     .info()               -> Promise<{fake, model}|null>   (GET /api/gmail/drafts/info)
     .available()          -> boolean: the server is up and a mailbox is connected
     .prefill(kind, o)     -> {to, cc, subject, body, threadId?, purpose, taskId?}
                              kind 'nudge' {task, person}, 'reply' {message|threadId, task?},
                              'note' {person, subject?, line?}
     .openEditor(prefill, {title, onSaved(res), onCancel})
                           the NORMAL draft editor, prefilled: To / Cc chips (People
                           and the thread's sender only), Subject, Message; Save
                           draft in Gmail. One click on a suggestion opens this.
     .quick(prefill, {onSaved})  the small "✓": save as it is, at once, with Undo
     .create(body) / .remove(draftId)   the raw calls -> {ok, ...} | {ok:false, code, message}
     .mailto(prefill)      the fallback without Gmail: opens the mail app (never sends)
   Nothing here can send an email: the server only creates or deletes drafts.
   ============================================================ */

/* ---------- one-click task from a thread ---------- */
function _emaFirst(m) { return homeMailFirstName(m && m.from && m.from.name, m && m.from && m.from.email) || 'them'; }
function _emaPersonFor(email) {
  try { if (typeof pplIndex === 'function' && email) return pplIndex().email.get(String(email).toLowerCase()) || null; } catch (e) { /* no index */ }
  return null;
}
function emailQuickTask(m, o) {
  o = o || {};
  if (!m || !m.id) return null;
  const who = typeof _emSenderName === 'function' ? _emSenderName(m) : _emaFirst(m);
  const pid = _emaPersonFor(m.from && m.from.email);
  const link = typeof _emLink === 'function' ? _emLink(m) : (m.link || '');
  const title = homeMailQuickTaskTitle({ m, first: _emaFirst(m) });
  let id = null;
  selUndoGroup(() => {
    id = addCustomTask(title, o.due === undefined ? todayStr() : o.due, o.priority || 'p0', ['email'], o.stream || null, 'none', {
      people: pid ? [pid] : [], detail: `From: ${m.sender || who}\nSubject: ${m.subject || '(no subject)'}${link ? '\n' + link : ''}`,
      ...(o.plannedFor ? { plannedFor: o.plannedFor } : {}),
    });
    if (!id) return;
    const t = getItem(id);
    if (t && !(Array.isArray(t.related) && t.related.some(r => r && r.type === 'email' && r.id === m.id))) {
      t.related = [...(Array.isArray(t.related) ? t.related : []), Object.assign({ type: 'email', id: m.id, label: String(m.subject || '(no subject)').slice(0, 200), at: Date.now() },
        /^https:\/\//.test(link) ? { link } : {}, m.from && m.from.email ? { from: String(m.sender || m.from.email).slice(0, 120) } : {}, m.date ? { date: String(m.date).slice(0, 25) } : {})];
    }
    emailMarkHandled(m.id, 'task', id);
  });
  if (id && o.toast) toast('Task added: ' + title, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
  return id;
}

/** Threads that need the user (Home's Needs reply), from the inbox store. */
function emailNeedsReply(o) {
  o = o || {};
  const taskThreads = new Set();
  for (const t of (state.custom || [])) {
    // Only OPEN tasks hide a thread (a done or won't-do task's thread may need you again).
    if (!t || !Array.isArray(t.related) || statusOf(t.id) === 'done') continue;
    for (const r of t.related) if (r && r.type === 'email' && r.id) taskThreads.add(r.id);
  }
  let idx = null;
  try { idx = typeof pplIndex === 'function' ? pplIndex() : null; } catch (e) { idx = null; }
  return homeNeedsReply(typeof emailMessages === 'function' ? emailMessages() : [], state.emailTriage || {}, {
    myEmails: (APP_CONFIG.myEmails || []).concat(...(state.people || []).filter(p => p && p.self).map(p => pplPersonEmails(p))),
    peopleIdx: idx, maxDays: o.maxDays, knownOnly: !!o.knownOnly, now: Date.now(), taskThreads, limit: o.limit,
  });
}

/* ---------- Gmail drafts ---------- */
let _gmdInfo = null, _gmdInfoAt = 0, _gmdInfoP = null, _gmdAsked = false;
async function _gmdSend(method, url, body) {
  let r;
  try {
    r = await fetch(url, Object.assign({ method, headers: { 'Content-Type': 'application/json' } }, body ? { body: JSON.stringify(body) } : {}));
  } catch (e) {
    return { ok: false, code: netIsDown(e) ? 'SERVER_DOWN' : 'NETWORK', message: netErrorMessage(e) };
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) return { ok: false, code: j.code || 'HTTP_' + r.status, message: j.message || j.error || ('The draft could not be saved (HTTP ' + r.status + ').') };
  return Object.assign({ ok: true }, j);
}
function _gmdMe() { return String(userName() || '').split(/\s+/)[0] || ''; }
function _gmdTask(t) { return typeof t === 'string' ? getItem(t) : t || null; }
function _gmdPerson(p) { return typeof p === 'string' ? getPerson(p) : p || null; }
function _gmdEmailOf(p) { const l = p ? pplPersonEmails(p) : []; return l[0] || ''; }
function _gmdThread(id) { return id && typeof emailById === 'function' ? emailById(id) : null; }
/** The newest related email of a task that is still in the inbox snapshot (a draft can answer in it). */
function _gmdTaskThread(t) {
  const rel = t && Array.isArray(t.related) ? t.related.filter(r => r && r.type === 'email' && r.id) : [];
  for (const r of rel.slice().reverse()) { const m = _gmdThread(r.id); if (m && (!m.sourceId || /gmail/.test(String(m.sourceId)))) return m; }
  return null;
}
function _gmdPrefill(kind, o) {
  o = o || {};
  const me = _gmdMe();
  if (kind === 'reply') {
    const m = o.message || _gmdThread(o.threadId);
    if (!m || !m.from || !m.from.email) return null;
    const t = _gmdTask(o.task);
    return { to: [String(m.from.email).toLowerCase()], cc: [], subject: homeMailReplySubject(m.subject), body: homeMailDraftTemplate('reply', { first: _emaFirst(m), me }),
      threadId: m.id, purpose: 'reply', ...(t ? { taskId: t.id } : {}) };
  }
  if (kind === 'nudge') {
    const t = _gmdTask(o.task);
    const p = _gmdPerson(o.person) || (t && typeof homeWaitingPerson === 'function' ? _gmdPerson(homeWaitingPerson(t)) : null);
    const email = _gmdEmailOf(p);
    if (!t || !email) return null;
    const m = _gmdTaskThread(t);
    const title = typeof effTitle === 'function' ? effTitle(t) : t.title;
    return { to: [email], cc: [], subject: m ? homeMailReplySubject(m.subject) : String(title || '').slice(0, 200), body: homeMailDraftTemplate('nudge', { first: homeMailFirstName(p.name, email), me, taskTitle: title }),
      ...(m ? { threadId: m.id } : {}), purpose: 'nudge', taskId: t.id };
  }
  const p = _gmdPerson(o.person);
  const email = _gmdEmailOf(p);
  if (!email) return null;
  return { to: [email], cc: [], subject: String(o.subject || '').slice(0, 200), body: homeMailDraftTemplate('note', { first: homeMailFirstName(p.name, email), me, line: o.line || '' }), purpose: 'note' };
}
/** Addresses a draft may go to: everyone in People with an address, plus the thread's sender. */
function _gmdChoices(threadId) {
  const out = [];
  const seen = new Set();
  for (const p of state.people || []) {
    if (!p || p.self) continue;
    for (const e of pplPersonEmails(p)) if (!seen.has(e)) { seen.add(e); out.push({ email: e, name: p.name || e, person: p }); }
  }
  const m = _gmdThread(threadId);
  const s = m && m.from && m.from.email ? String(m.from.email).toLowerCase() : '';
  if (s && !seen.has(s)) out.unshift({ email: s, name: (m.from.name || s), person: null });
  return out;
}
function _gmdReceipt(res, o) {
  toast('Draft saved in Gmail, not sent', { kind: 'ok', icon: 'mail', timeout: 8000, action: { label: 'Undo', run: async () => {
    const r = await _gmdSend('DELETE', '/api/gmail/drafts/' + encodeURIComponent(res.draftId));
    if (r.ok) toast(r.gone ? 'That draft was already gone from Gmail' : 'Draft deleted', { icon: 'undo-2' });
    else toast(r.message, { kind: 'err' });
    if (o && typeof o.onUndone === 'function') try { o.onUndone(r); } catch (e) { console.error(e); }
  } } });
}
/** A short, kind message for a failed draft, plus what to do. */
function _gmdFailText(r, inline) {
  // Inline (the editor) the buttons beside the text say where to go.
  if (r.code === 'CONNECTOR_AUTH') return inline ? 'Gmail needs you to sign in again.' : 'Gmail needs you to sign in again (Connections).';
  if (r.code === 'TOOL_MISSING') return inline ? 'Gmail is not connected to Claude.' : 'Gmail is not connected to Claude: connect it, or use your mail app instead.';
  return r.message || 'The draft could not be saved.';
}

function _gmdChipsField(label, list, choices, max) {
  const f = document.createElement('div'); f.className = 'field gmd-field';
  const l = document.createElement('span'); l.className = 'field-label'; l.textContent = label; f.appendChild(l);
  const box = document.createElement('div'); box.className = 'gmd-chips'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', label);
  f.appendChild(box);
  const draw = () => {
    box.textContent = '';
    for (const e of list) {
      const c = choices.find(x => x.email === e);
      const chip = document.createElement('span'); chip.className = 'chip gmd-chip';
      if (c && c.person && typeof avatarHtml === 'function') chip.insertAdjacentHTML('beforeend', avatarHtml(c.person, 16));
      chip.appendChild(Object.assign(document.createElement('span'), { textContent: c && c.name && c.name !== e ? `${c.name} <${e}>` : e }));
      const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon gmd-x'; x.setAttribute('aria-label', 'Remove ' + e); x.innerHTML = icon('x', 'i-xs');
      x.onclick = () => { list.splice(list.indexOf(e), 1); draw(); };
      chip.appendChild(x);
      box.appendChild(chip);
    }
    const left = choices.filter(x => !list.includes(x.email));
    if (list.length < max && left.length) {
      const sel = document.createElement('select'); sel.className = 'control control-sm gmd-add'; sel.setAttribute('aria-label', 'Add to ' + label);
      sel.innerHTML = `<option value="">${esc(list.length ? 'Add…' : 'Choose someone…')}</option>` + left.map(x => `<option value="${escAttr(x.email)}">${esc(x.name !== x.email ? `${x.name} (${x.email})` : x.email)}</option>`).join('');
      sel.onchange = () => { if (sel.value && !list.includes(sel.value)) list.push(sel.value); draw(); const n = box.querySelector('.gmd-add'); if (n) n.focus(); };
      box.appendChild(sel);
    }
  };
  draw();
  return f;
}

function _gmdOpenEditor(prefill, o) {
  o = o || {};
  if (!prefill) { toast('There is no email address to write to.', { kind: 'err' }); return null; }
  const d = { to: (prefill.to || []).slice(0, 3), cc: (prefill.cc || []).slice(0, 3), subject: prefill.subject || '', body: prefill.body || '' };
  const choices = _gmdChoices(prefill.threadId);
  // A prefilled address that is not in People or the thread cannot be saved: keep it visible so the user sees why.
  for (const e of [...d.to, ...d.cc]) if (!choices.some(c => c.email === e)) choices.push({ email: e, name: e, person: null });
  const thread = _gmdThread(prefill.threadId);
  let busy = false, errEl = null, saveBtn = null, subj = null, txt = null, dlgEl = null;
  const title = o.title || (prefill.purpose === 'reply' ? 'Draft a reply' : prefill.purpose === 'nudge' ? 'Draft a nudge' : 'New draft');
  const close = openDialog({
    title, width: 600, resizeKey: 'gmail-draft',
    body: (el) => {
      el.classList.add('gmd');
      dlgEl = el.parentElement;
      if (thread) {
        const ctx = document.createElement('div'); ctx.className = 'gmd-ctx';
        ctx.innerHTML = icon('corner-down-left', 'i-xs') + '<span></span>';
        ctx.querySelector('span').textContent = `In reply to ${typeof _emSenderName === 'function' ? _emSenderName(thread) : (thread.from && thread.from.email) || ''}: ${thread.subject || '(no subject)'}`;
        el.appendChild(ctx);
      }
      el.appendChild(_gmdChipsField('To', d.to, choices, 3));
      if (d.cc.length) el.appendChild(_gmdChipsField('Cc', d.cc, choices, 3));
      const sf = document.createElement('label'); sf.className = 'field gmd-field';
      sf.innerHTML = '<span class="field-label">Subject</span>';
      subj = document.createElement('input'); subj.className = 'control'; subj.maxLength = 200; subj.value = d.subject;
      subj.oninput = () => { d.subject = subj.value; };
      sf.appendChild(subj); el.appendChild(sf);
      const bf = document.createElement('label'); bf.className = 'field gmd-field';
      bf.innerHTML = '<span class="field-label">Message</span>';
      txt = document.createElement('textarea'); txt.className = 'control gmd-body'; txt.rows = 9; txt.maxLength = 2000; txt.value = d.body;
      txt.setAttribute('autofocus', '');
      const cnt = document.createElement('span'); cnt.className = 'field-hint gmd-count';
      const upd = () => { d.body = txt.value; cnt.textContent = `${txt.value.length} / 2000`; };
      txt.oninput = upd; upd();
      bf.append(txt, cnt); el.appendChild(bf);
      const note = document.createElement('p'); note.className = 'gmd-note';
      note.innerHTML = icon('shield-check', 'i-xs') + '<span>Saved as a draft in your Gmail. Nothing is sent: you send it from Gmail when you are ready.</span>';
      el.appendChild(note);
      errEl = document.createElement('div'); errEl.className = 'gmd-err'; errEl.setAttribute('role', 'alert'); errEl.hidden = true;
      el.appendChild(errEl);
      // Put the caret on the empty line of a reply template (after the greeting).
      setTimeout(() => { try { const i = txt.value.indexOf('\n\n\n'); if (i >= 0) { txt.focus({ preventScroll: true }); txt.setSelectionRange(i + 2, i + 2); } } catch (e) { /* focus moved */ } }, 30);
    },
    actions: [
      { label: 'Cancel', run: () => { if (o.onCancel) try { o.onCancel(); } catch (e) { console.error(e); } } },
      'spacer',
      { label: 'Save draft in Gmail', icon: 'mail', primary: true, run: () => { save(); return false; } },
    ],
  });
  saveBtn = dlgEl ? dlgEl.querySelector('.modal-f .btn-primary') : null;
  function showErr(r) {
    if (!errEl) return;
    errEl.hidden = false; errEl.textContent = '';
    errEl.appendChild(Object.assign(document.createElement('span'), { textContent: _gmdFailText(r, true) }));
    if (r.code === 'CONNECTOR_AUTH' || r.code === 'TOOL_MISSING') {
      const a = document.createElement('button'); a.type = 'button'; a.className = 'btn btn-ghost btn-sm'; a.textContent = 'Open Connections';
      a.onclick = () => { close(); if (window.Connections) Connections.open('gmail'); };
      errEl.appendChild(a);
    }
    if (r.code === 'TOOL_MISSING' || r.code === 'SERVER_DOWN') {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = 'Use my mail app';
      b.onclick = () => { _gmdMailto(Object.assign({}, prefill, d)); close(); };
      errEl.appendChild(b);
    }
  }
  async function save() {
    if (busy) return;
    if (!d.to.length) { showErr({ message: 'Choose who the draft is to.' }); return; }
    busy = true;
    if (saveBtn) { saveBtn.disabled = true; saveBtn.setAttribute('aria-busy', 'true'); const s = saveBtn.querySelector('span'); if (s) s.textContent = 'Drafting in Gmail…'; }
    if (errEl) errEl.hidden = true;
    const body = { to: d.to, ...(d.cc.length ? { cc: d.cc } : {}), subject: d.subject, body: d.body, purpose: prefill.purpose || 'note',
      ...(prefill.threadId ? { threadId: prefill.threadId } : {}), ...(prefill.taskId ? { taskId: prefill.taskId } : {}) };
    const r = await _gmdSend('POST', '/api/gmail/drafts', body);
    busy = false;
    if (!r.ok) {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.removeAttribute('aria-busy'); const s = saveBtn.querySelector('span'); if (s) s.textContent = 'Save draft in Gmail'; }
      showErr(r);       // the dialog keeps what was typed, so Save works again
      return;
    }
    close();
    _gmdReceipt(r, o);
    if (o.onSaved) try { o.onSaved(r); } catch (e) { console.error(e); }
  }
  return close;
}
async function _gmdQuick(prefill, o) {
  o = o || {};
  if (!prefill) return { ok: false, code: 'NO_ADDRESS', message: 'There is no email address to write to.' };
  const r = await _gmdSend('POST', '/api/gmail/drafts', { to: prefill.to, ...(prefill.cc && prefill.cc.length ? { cc: prefill.cc } : {}), subject: prefill.subject, body: prefill.body,
    purpose: prefill.purpose || 'note', ...(prefill.threadId ? { threadId: prefill.threadId } : {}), ...(prefill.taskId ? { taskId: prefill.taskId } : {}) });
  if (r.ok) { _gmdReceipt(r, o); if (o.onSaved) try { o.onSaved(r); } catch (e) { console.error(e); } }
  else if (!o.quiet) toast(_gmdFailText(r), { kind: 'err' });
  return r;
}
function _gmdMailto(p) {
  if (!p || !p.to || !p.to.length) return false;
  const url = hglMailto({ email: p.to[0] }, p.subject, p.body);
  return hglOpenMail(url);
}

window.GmailDraft = {
  async info(force) {
    if (!_serverAvailable) return null;
    if (_gmdInfo && !force && Date.now() - _gmdInfoAt < 10 * 60000) return _gmdInfo;
    if (_gmdInfoP) return _gmdInfoP;
    _gmdInfoP = fetch('/api/gmail/drafts/info').then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(j => { _gmdInfo = j; _gmdInfoAt = Date.now(); _gmdInfoP = null; return j; });
    return _gmdInfoP;
  },
  available() {
    if (!_serverAvailable) return false;
    if (_gmdInfo && _gmdInfo.fake) return true;
    // Ask the server once (integrator, 4 Oct): with the fake Gmail connector (tests, demos)
    // drafts are on only once /info has answered, so suggestions refresh when it says so.
    if (!_gmdInfo && !_gmdInfoP && !_gmdAsked) {
      _gmdAsked = true;
      window.GmailDraft.info().then(j => { if (j && j.fake && typeof sgRefresh === 'function') sgRefresh(); });
    }
    return !!(window.Connections && Connections.has('gmail'));
  },
  prefill: _gmdPrefill,
  openEditor: _gmdOpenEditor,
  quick: _gmdQuick,
  create: (body) => _gmdSend('POST', '/api/gmail/drafts', body),
  remove: (id) => _gmdSend('DELETE', '/api/gmail/drafts/' + encodeURIComponent(String(id || ''))),
  mailto: _gmdMailto,
};
