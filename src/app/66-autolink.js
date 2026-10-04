/* ============================================================
   AUTO-LINKING (owner: Auto-linking)
   Everything a task relates to, found for it: the FOLDERS where its work
   lives (never single files: they are the "why"), GitHub repos and PRs,
   meetings, emails, people and similar tasks. The server finds and judges
   them (lib/autolink.mjs, lib/workspace-index.mjs); this file shows them and
   sends the user's decisions through the actions layer (links.apply /
   links.reject / task.relate ...), so every change has Undo.

     autolinkRelatedSection(taskId)   the task detail's "Related" section (Files & links,
                                      meetings, emails, people, related tasks, suggestions)
     autolinkEventExtras(ev)          event panel: files of the related tasks + suggested tasks
     autolinkPersonFiles(p)           person panel: files linked to their tasks
     autolinkHomeCard(side)           Home: "Suggested links" card
     autolinkFocusChips(taskId)       Home Focus cards: the next linked meeting (data-act="alink-ev")
     autolinkFilesTabs(page)          Files view: Saved | Suggested tabs (true = rendered here)
     alSelectList(list, key)          ticks on suggestion lists (Files > Suggested, Home card, Related,
                                      event panel): Link selected / Link all / Dismiss selected
     Settings > Files & auto-link     workspace folders, names-only folders, auto-attach, judge, status
     Palette: Auto-link now, Review suggested links, Find links for this task; task menu item.

   state.autolink = {suggestions:[...], rejected:{}, applied:{}} (written by the server only).
   All text (titles, paths, file names, reasons, subjects) is escaped or set as textContent.
   ============================================================ */

let _alStatus = null, _alStatusAt = 0, _alStatusP = null;
let _alPollTimer = null;
let _alFilesTab = 'saved';
let _alShowWeak = false;
let _alFolderSug = null;
const AL_WEAK = 0.4;
const _AL_NOUN = { resource: 'Folder', event: 'Meeting', email: 'Email', person: 'Person', task: 'Task' };

/* ---------- model ---------- */
function alData() {
  const a = state.autolink && typeof state.autolink === 'object' ? state.autolink : {};
  return { suggestions: Array.isArray(a.suggestions) ? a.suggestions : [], applied: a.applied || {}, rejected: a.rejected || {} };
}
function alConf(sg) { return sg && sg.judged && Number.isFinite(sg.judged.confidence) ? sg.judged.confidence : Math.min(0.75, Number(sg && sg.score) || 0); }
function alPct(c) { return Math.round((Number(c) || 0) * 100) + '%'; }
function alPending(o) {
  o = o || {};
  return alData().suggestions
    .filter(sg => sg && (!o.taskId || sg.taskId === o.taskId) && (!o.type || sg.type === o.type) && getItem(sg.taskId) && statusOf(sg.taskId) !== 'done')
    .filter(sg => o.all || _alShowWeak || alConf(sg) >= (o.min != null ? o.min : AL_WEAK))
    .sort((a, b) => alConf(b) - alConf(a));
}
function alLabel(sg) {
  const t = (sg && sg.target) || {};
  return sg.type === 'resource' ? (t.label || t.target || '') : sg.type === 'event' ? (t.title || '') : sg.type === 'email' ? (t.subject || '') : sg.type === 'person' ? (t.name || '') : (t.title || '');
}
function alNoun(sg) { return sg.type === 'resource' ? (sg.target && sg.target.kind === 'github' ? 'GitHub' : 'Folder') : _AL_NOUN[sg.type] || sg.type; }
function alIcon(sg) {
  const t = (sg && sg.target) || {};
  if (sg.type === 'resource') return t.kind === 'github' ? (/\/(pull|issues)\/\d+/.test(t.target || '') ? 'git-pull-request' : 'folder-git-2') : 'folder';
  return sg.type === 'event' ? 'calendar' : sg.type === 'email' ? 'mail' : sg.type === 'person' ? 'user' : 'circle-check';
}
function alWhen(iso) {
  const s = String(iso || '');
  if (!s) return '';
  const d = new Date(/T/.test(s) ? s : s + 'T12:00:00');
  if (isNaN(d)) return '';
  const L = APP_CONFIG.locale || undefined;
  // A timestamp is an instant (shown in the dashboard's zone); a bare date is a wall date.
  const zone = /T/.test(s) ? { timeZone: Clock.zone() } : {};
  const day = d.toLocaleDateString(L, { weekday: 'short', day: 'numeric', month: 'short', ...zone });
  return /T/.test(s) ? `${day} ${d.toLocaleTimeString(L, { hour: '2-digit', minute: '2-digit', ...(typeof clockH12Opt === 'function' ? clockH12Opt() : {}), ...zone })}` : day;
}
function _alEvents() { try { return typeof calAllEvents === 'function' ? calAllEvents() : []; } catch (e) { return []; } }
function _alEnsureCalendar() { try { if (typeof CalStore !== 'undefined' && _serverAvailable && !CalStore.st.loaded && !CalStore.st.loading) CalStore.load(); } catch (e) { /* the calendar is optional */ } }

/** What a task is linked to, grouped (the page's view of the same rules as get_related). */
function alLinked(taskId) {
  const t = getItem(taskId);
  if (!t) return null;
  const evs = _alEvents();
  const meetings = [];
  for (const [eid, m] of Object.entries(state.eventMeta || {})) {
    if (!m || !Array.isArray(m.tasks) || !m.tasks.includes(taskId)) continue;
    const ev = evs.find(e => e.id === eid) || null;
    meetings.push({ id: eid, ev, start: ev ? (ev.start.dateTime || ev.start.date) : '' });
  }
  const today = todayStr();
  meetings.sort((a, b) => ((a.start || '').slice(0, 10) < today) - ((b.start || '').slice(0, 10) < today) || String(a.start).localeCompare(String(b.start)));
  const emails = (Array.isArray(t.related) ? t.related : []).filter(r => r && r.type === 'email');
  const tasks = [];
  for (const r of Array.isArray(t.related) ? t.related : []) if (r && r.type === 'task' && getItem(r.id)) tasks.push(r.id);
  for (const o of state.custom || []) if (o && o.id !== taskId && Array.isArray(o.related) && o.related.some(r => r && r.type === 'task' && r.id === taskId) && !tasks.includes(o.id)) tasks.push(o.id);
  const people = (typeof effPeople === 'function' ? effPeople(t) : (t.people || [])).map(getPerson).filter(p => p && !p.self);
  return { meetings, emails, tasks, people };
}

/* ---------- server ---------- */
async function _alPost(url, body, method) {
  const r = await fetch(url, method === 'GET' ? { cache: 'no-store' } : { method: method || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) { const e = new Error((j.error && (j.error.message || j.error)) || `The dashboard answered ${r.status}`); e.code = j.error && j.error.code || j.code; throw e; }
  return j;
}
/** Apply ops through the actions layer (dry run first; a big batch asks), adopt the result, offer Undo. */
async function alActions(ops, o) {
  o = o || {};
  try {
    if (typeof _persistFire === 'function' && (state._localDirty || (typeof _persistTimer !== 'undefined' && _persistTimer))) { _persistFire(); await new Promise(r => setTimeout(r, 400)); }
    const client = o.client || 'auto-link review';
    const dry = await _alPost('/api/actions', { ops, dryRun: true, source: 'ui', client });
    if (dry.needsConfirm) {
      const n = (dry.preview || []).reduce((a, p) => a + ((p.changes || []).length || 1), 0);
      if (!await confirmDialog({ title: o.confirmTitle || 'Apply these links?', text: `${n} change${n === 1 ? '' : 's'}. You can undo it afterwards.`, confirmLabel: 'Apply' })) return null;
    }
    const j = await _alPost('/api/actions', { ops, confirm: dry.confirm, source: 'ui', client });
    if (typeof _asstAdopt === 'function') await _asstAdopt(j.version);
    render();
    if (o.done !== false) toast(o.done || j.summary || 'Done', { kind: 'ok', icon: o.icon || 'link', action: j.undo ? { label: 'Undo', run: () => alUndo(j.undo) } : undefined });
    return j;
  } catch (e) {
    if (o.rethrow) throw e;   // a select list shows it inline, with Try again and the ticks kept
    toast(netErrorMessage(e, 'That did not work'), { kind: 'err' });
    return null;
  }
}
async function alUndo(token) {
  try {
    const u = await _alPost('/api/actions/undo', { token, source: 'ui', client: 'auto-link review' });
    if (typeof _asstAdopt === 'function') await _asstAdopt(u.version);
    render();
    toast('Undone', { kind: 'ok', icon: 'undo-2' });
  } catch (e) { toast(e.message || 'Could not undo', { kind: 'err' }); }
}
function alAccept(ids, o) {
  const list = alData().suggestions.filter(sg => ids.includes(sg.id));
  const one = list.length === 1 ? list[0] : null;
  return alActions([{ op: 'links.apply', suggestionIds: ids }], { done: one ? `Linked: ${alLabel(one)}` : `Linked ${ids.length}`, ...(o || {}) });
}
function alReject(ids, o) {
  return alActions([{ op: 'links.reject', suggestionIds: ids }], { done: ids.length === 1 ? 'Rejected: it will not be suggested again' : `Rejected ${ids.length}`, icon: 'circle-x', ...(o || {}) });
}
/**
 * Tick suggestions, then link or dismiss the ticked ones (the shared select
 * list, 11-ui-select.js). Confident ones (80%+) start ticked. `key` keeps the
 * ticks across re-renders: 'al-files', 'al-home', 'al-task:<id>'.
 */
function alSelectList(list, key, o) {
  o = o || {};
  const byId = new Map(alData().suggestions.map(sg => [sg.id, sg]));
  return selectList(list, {
    key, rows: '.al-row[data-sid]', idOf: (r) => r.dataset.sid, compact: !!o.compact, label: o.label || 'Suggested links',
    labelOf: (r) => { const m = r.querySelector('.al-main'); return (m && m.getAttribute('aria-label')) || ''; },
    defaultOn: (id) => { const sg = byId.get(id); return !!sg && alConf(sg) >= 0.8; },
    apply: { label: 'Link selected', icon: 'link', run: (ids) => alAccept(ids, { rethrow: true }) },
    applyAll: { label: 'Link all', run: (ids) => alAccept(ids, { rethrow: true, confirmTitle: `Link all ${ids.length}?` }) },
    dismiss: { label: o.compact ? 'Dismiss' : 'Dismiss selected', tip: 'Not related: never suggest them again', run: (ids) => alReject(ids, { rethrow: true }) },
    extra: o.extra, bar: o.bar,
  });
}
function alAcceptAbove(min, taskId) {
  const ids = alPending({ taskId, all: true }).filter(sg => alConf(sg) >= min).map(sg => sg.id);
  if (!ids.length) { toast(`Nothing at ${alPct(min)} or more`); return; }
  return alActions([{ op: 'links.apply', suggestionIds: ids.slice(0, 200) }], { done: `Linked ${ids.length}`, confirmTitle: `Link all ${ids.length} at ${alPct(min)} or more?` });
}

function alStatus(force) {
  if (!_serverAvailable) return Promise.resolve(null);
  if (!force && _alStatus && Date.now() - _alStatusAt < 60000) return Promise.resolve(_alStatus);
  if (_alStatusP) return _alStatusP;
  _alStatusP = _alPost('/api/autolink/status', null, 'GET').then(s => { _alStatus = s; _alStatusAt = Date.now(); return s; }).catch(() => _alStatus).finally(() => { _alStatusP = null; });
  return _alStatusP;
}
/** Poll while a run is going; repaint the bits that show it. */
function _alWatch() {
  clearTimeout(_alPollTimer);
  const tick = async () => {
    const was = _alStatus && _alStatus.lastRun ? _alStatus.lastRun.at : null;
    const s = await alStatus(true);
    _alPaintStatus();
    if (s && (s.running || s.queued)) { _alPollTimer = setTimeout(tick, 1500); return; }
    if (s && s.lastRun && s.lastRun.at !== was) {
      const r = s.lastRun;
      if (r.error) toast(`Auto-link stopped: ${r.error.message || r.error.code}`, { kind: 'err' });
      else toast(`Auto-link: ${r.suggestions} suggestion${r.suggestions === 1 ? '' : 's'} waiting${r.autoApplied ? `, ${r.autoApplied} attached` : ''}`, { kind: 'ok', icon: 'wand-sparkles',
        action: r.autoApplied && r.undo ? { label: 'Undo', run: () => alUndo(r.undo) } : { label: 'Review', run: () => alOpenReview() } });
      if (typeof liveSyncCheck === 'function') liveSyncCheck();
    }
  };
  _alPollTimer = setTimeout(tick, 900);
}
async function alRunNow(o) {
  o = o || {};
  try {
    if (typeof _persistFire === 'function' && (state._localDirty || (typeof _persistTimer !== 'undefined' && _persistTimer))) { _persistFire(); await new Promise(r => setTimeout(r, 400)); }
    await _alPost('/api/autolink/run', o.taskId ? { taskId: o.taskId } : o.index ? { index: true } : {});
    toast(o.taskId ? 'Looking for links for this task…' : o.index ? 'Indexing your workspace folders…' : 'Auto-linking…', { icon: 'wand-sparkles' });
    _alWatch();
  } catch (e) { toast(e.message || 'The OpenDash server is not running.', { kind: 'err' }); }
}
function alOpenReview() { _alFilesTab = 'suggested'; if (state.view === 'files') renderMain(); else setView('files'); }

/* ---------- a suggestion row ---------- */
function alSuggestionRow(sg, o) {
  o = o || {};
  const row = document.createElement('div');
  const c = alConf(sg);
  row.className = 'al-row' + (c < AL_WEAK ? ' is-weak' : '');
  row.dataset.sid = sg.id;
  const t = sg.target || {};
  const main = document.createElement('div'); main.className = 'al-main';
  // asTask: the row is about the TASK (the event panel's "Suggested tasks"), the event is the context.
  const asTask = !!o.asTask;
  const where = asTask ? '' : sg.type === 'resource' && t.kind === 'folder' ? [t.root, t.rel].filter(Boolean).join(' / ') : sg.type === 'event' ? alWhen(t.start) : sg.type === 'email' ? [t.from, alWhen(t.date)].filter(Boolean).join(' · ') : '';
  main.innerHTML = `<span class="al-ic t-${escAttr(asTask ? 'task' : sg.type)}">${icon(asTask ? 'circle-check' : alIcon(sg))}</span>`
    + '<span class="al-txt">'
    + (o.showTask && !asTask ? `<span class="al-task truncate">${esc(effTitle(getItem(sg.taskId)) || '')}</span>` : '')
    + `<span class="al-name"><span class="al-kind">${esc(asTask ? 'Task' : alNoun(sg))}</span><span class="al-label truncate"></span></span>`
    + (where ? `<span class="al-where truncate${sg.type === 'resource' && t.kind === 'folder' ? ' al-path' : ''}">${esc(where)}</span>` : '')
    + `<span class="al-why"></span>`
    + '</span>'
    + `<span class="al-conf${sg.judged ? ' judged' : ''}" data-tip="${escAttr(sg.judged ? `Checked by Claude: ${sg.judged.reason || ''}` : 'From matching words, people and dates (not checked by Claude yet)')}">${sg.judged ? icon('sparkles', 'i-xs') : ''}${esc(alPct(c))}</span>`;
  main.querySelector('.al-label').textContent = asTask ? effTitle(getItem(sg.taskId)) || '' : alLabel(sg);
  const why = main.querySelector('.al-why');
  const reasons = [];
  if (sg.judged && sg.judged.reason) reasons.push(sg.judged.reason);
  for (const w of (sg.why || []).slice(0, 2)) reasons.push(w);
  why.textContent = reasons.join(' · ');
  if (sg.type === 'resource' && t.kind === 'folder') main.title = t.target || '';
  main.tabIndex = 0;
  main.setAttribute('role', 'button');
  main.setAttribute('aria-label', `${alNoun(sg)}: ${alLabel(sg)} (${alPct(c)})`);
  main.onclick = () => alOpenTarget(sg);
  main.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); alOpenTarget(sg); } };
  row.appendChild(main);
  const acts = document.createElement('div'); acts.className = 'al-acts';
  const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn btn-secondary btn-sm al-ok';
  ok.innerHTML = icon('check') + '<span>Link</span>'; ok.setAttribute('aria-label', `Link ${alLabel(sg)}`);
  ok.onclick = (e) => { e.stopPropagation(); ok.disabled = true; alAccept([sg.id]); };
  const no = document.createElement('button'); no.type = 'button'; no.className = 'btn-icon btn-sm al-no';
  no.innerHTML = icon('x'); no.setAttribute('aria-label', `Not related: ${alLabel(sg)}`); no.setAttribute('data-tip', 'Not related (never suggest it again)');
  no.onclick = (e) => { e.stopPropagation(); no.disabled = true; alReject([sg.id]); };
  acts.append(ok, no);
  row.appendChild(acts);
  return row;
}
function alOpenTarget(sg) {
  const t = sg.target || {};
  if (sg.type === 'resource') {
    if (t.kind === 'github') { const u = safeUrl(t.target); if (u) window.open(u, '_blank', 'noopener'); return; }
    if (typeof resCopyText === 'function') resCopyText(t.target || '', 'Folder path copied (link it to explore it here)');
    return;
  }
  if (sg.type === 'event' && typeof calOpenEvent === 'function') return calOpenEvent(t.eventId);
  if (sg.type === 'email') { const u = safeUrl(t.link || ''); if (u) window.open(u, '_blank', 'noopener'); return; }
  if (sg.type === 'person') return openPerson(t.personId);
  if (sg.type === 'task' && getItem(t.taskId)) return openTask(t.taskId);   // centre card or side panel (61-task-card.js)
}

/* ---------- the task detail's Related section ---------- */
function _alGroup(title, iconName, count) {
  const g = document.createElement('div'); g.className = 'al-group';
  g.innerHTML = `<div class="al-gh">${icon(iconName, 'i-sm')}<span>${esc(title)}</span>${count ? `<span class="count">${esc(count)}</span>` : ''}</div>`;
  return g;
}
function _alLinkedRow(o) {
  const row = document.createElement('div'); row.className = 'al-row al-linked';
  const main = document.createElement('div'); main.className = 'al-main'; main.tabIndex = 0; main.setAttribute('role', 'button');
  main.innerHTML = `<span class="al-ic">${o.avatar || icon(o.icon)}</span><span class="al-txt"><span class="al-name"><span class="al-label truncate"></span></span>${o.sub ? `<span class="al-where truncate">${esc(o.sub)}</span>` : ''}</span>`;
  main.querySelector('.al-label').textContent = o.label;
  main.setAttribute('aria-label', o.openLabel || `Open ${o.label}`);
  main.onclick = o.open;
  main.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); o.open(); } };
  row.appendChild(main);
  if (o.unlink) {
    const acts = document.createElement('div'); acts.className = 'al-acts';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon btn-sm';
    b.innerHTML = icon('link-2-off'); b.setAttribute('aria-label', `Unlink ${o.label}`); b.setAttribute('data-tip', 'Unlink');
    b.onclick = (e) => { e.stopPropagation(); b.disabled = true; o.unlink(); };
    acts.appendChild(b); row.appendChild(acts);
  }
  return row;
}
function autolinkRelatedSection(taskId) {
  const sec = document.createElement('section'); sec.className = 'dp-section al-related';
  const L = alLinked(taskId);
  if (!L) return sec;
  _alEnsureCalendar();
  const sugg = alPending({ taskId });
  const weak = alPending({ taskId, all: true }).length - sugg.length;
  const files = typeof resFor === 'function' ? resFor('task', taskId) : [];
  const n = files.length + L.meetings.length + L.emails.length + L.people.length + L.tasks.length;
  const h = document.createElement('div'); h.className = 'dp-sh';
  h.innerHTML = `<h4>Related</h4>${n ? `<span class="count">${esc(n)}</span>` : ''}<span class="grow"></span>`;
  const find = document.createElement('button'); find.type = 'button'; find.className = 'btn btn-ghost btn-sm al-find';
  find.innerHTML = icon('wand-sparkles') + '<span>Find links</span>';
  find.setAttribute('data-tip', 'Look for the folders, repos, meetings, emails, people and tasks this relates to');
  find.onclick = () => alRunNow({ taskId });
  h.appendChild(find);
  sec.appendChild(h);
  // Files & links (63-resources.js), as the first group.
  if (typeof resBlock === 'function') { const rb = resBlock({ type: 'task', id: taskId }); rb.classList.add('al-files'); sec.appendChild(rb); }
  const item = getItem(taskId);
  if (L.meetings.length) {
    const g = _alGroup('Meetings', 'calendar', L.meetings.length);
    for (const m of L.meetings) {
      const title = m.ev ? m.ev.summary : 'Calendar event';
      g.appendChild(_alLinkedRow({ icon: 'calendar', label: title, sub: m.ev ? alWhen(m.start) + ((m.start || '').slice(0, 10) < todayStr() ? ' · past' : '') : 'Not in the loaded calendar',
        open: () => calOpenEvent(m.id),
        unlink: () => alActions([{ op: 'event.annotate', eventId: m.id, unlinkTasks: [taskId] }, ...(m.ev ? [{ op: 'links.reject', items: [{ taskId, type: 'event', target: { title: m.ev.summary } }] }] : [])], { done: 'Unlinked the meeting' }) }));
    }
    sec.appendChild(g);
  }
  if (L.emails.length) {
    const g = _alGroup('Emails', 'mail', L.emails.length);
    for (const e of L.emails) {
      g.appendChild(_alLinkedRow({ icon: 'mail', label: e.label || '(no subject)', sub: [e.from, alWhen(e.date)].filter(Boolean).join(' · '),
        open: () => { const u = safeUrl(e.link || ''); if (u) window.open(u, '_blank', 'noopener'); else toast('No link for this email'); },
        unlink: () => alActions([{ op: 'task.unrelate', id: taskId, type: 'email', target: e.id }, { op: 'links.reject', items: [{ taskId, type: 'email', target: { messageId: e.id } }] }], { done: 'Unlinked the email' }) }));
    }
    sec.appendChild(g);
  }
  if (L.people.length) {
    const g = _alGroup('People', 'users', L.people.length);
    for (const p of L.people) {
      g.appendChild(_alLinkedRow({ avatar: typeof homeAvatar === 'function' ? homeAvatar(p, 18) : null, icon: 'user', label: p.name, sub: [p.role, p.org].filter(Boolean).join(' · '),
        open: () => openPerson(p.id),
        unlink: () => alActions([{ op: 'task.unlink_person', id: taskId, person: p.id }], { done: `Unlinked ${p.name}` }) }));
    }
    sec.appendChild(g);
  }
  if (L.tasks.length) {
    const g = _alGroup('Related tasks', 'circle-check', L.tasks.length);
    for (const id of L.tasks) {
      const t = getItem(id);
      g.appendChild(_alLinkedRow({ icon: statusOf(id) === 'done' ? 'circle-check' : 'circle', label: effTitle(t), sub: [STREAMS[effStream(t)] ? STREAMS[effStream(t)].label : '', effDate(t) ? dueLabel(effDate(t)) : ''].filter(Boolean).join(' · '),
        open: () => openTask(id),
        unlink: () => alActions([{ op: 'task.unrelate', id: taskId, type: 'task', target: id }, { op: 'links.reject', items: [{ taskId, type: 'task', target: { taskId: id } }] }], { done: 'Unlinked the task' }) }));
    }
    sec.appendChild(g);
  }
  // Suggestions for this task.
  if (sugg.length || weak > 0) {
    const g = _alGroup('Suggested', 'wand-sparkles', sugg.length);
    g.classList.add('al-sugg');
    // Two or more: tick which to link (80%+ start ticked), then Link selected / Link all / Dismiss.
    const box = document.createElement('div'); box.className = 'al-list';
    for (const sg of sugg.slice(0, 8)) box.appendChild(alSuggestionRow(sg));
    g.appendChild(box);
    if (sugg.length > 1) alSelectList(box, 'al-task:' + taskId, { compact: true, label: 'Suggested links for this task' });
    if (weak > 0 && !_alShowWeak) {
      const more = document.createElement('button'); more.type = 'button'; more.className = 'btn-link al-more';
      more.textContent = `Show ${weak} weaker suggestion${weak === 1 ? '' : 's'}`;
      more.onclick = () => { _alShowWeak = true; render(); };
      g.appendChild(more);
    }
    sec.appendChild(g);
  }
  if (!n && !sugg.length && item) {
    const e = document.createElement('div'); e.className = 'subtle al-empty';
    e.textContent = 'Nothing else linked yet. Find links looks through your workspace folders, calendar, email, people and tasks.';
    sec.appendChild(e);
  }
  return sec;
}

/* ---------- calendar event panel ---------- */
function autolinkEventExtras(ev) {
  const box = document.createElement('div'); box.className = 'al-ev';
  const m = (state.eventMeta || {})[ev.id] || {};
  const taskIds = (m.tasks || []).filter(id => getItem(id));
  const seen = new Set();
  const files = [];
  for (const id of taskIds) for (const r of (typeof resFor === 'function' ? resFor('task', id) : [])) if (!seen.has(r.id)) { seen.add(r.id); files.push({ r, taskId: id }); }
  if (files.length) {
    const h = document.createElement('div'); h.className = 'ev-sec';
    h.innerHTML = `Files from related tasks <span>${esc(files.length)}</span>`;
    box.appendChild(h);
    const list = document.createElement('div'); list.className = 'al-ev-files';
    for (const f of files.slice(0, 8)) list.appendChild(resRow(f.r, { link: { type: 'task', id: f.taskId } }));
    box.appendChild(list);
  }
  const key = String(ev.summary || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const sugg = alData().suggestions.filter(sg => sg.type === 'event' && sg.target && (sg.target.eventId === ev.id || String(sg.target.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === key) && getItem(sg.taskId) && statusOf(sg.taskId) !== 'done')
    .sort((a, b) => alConf(b) - alConf(a));
  if (sugg.length) {
    const h = document.createElement('div'); h.className = 'ev-sec';
    h.innerHTML = `Suggested tasks <span>${esc(sugg.length)}</span>`;
    box.appendChild(h);
    const list = document.createElement('div'); list.className = 'al-list';
    for (const sg of sugg.slice(0, 5)) {
      const row = alSuggestionRow(sg, { asTask: true });
      row.querySelector('.al-main').onclick = () => openTask(sg.taskId, { from: row });
      list.appendChild(row);
    }
    box.appendChild(list);
    if (Math.min(5, sugg.length) > 1) alSelectList(list, 'al-ev:' + ev.id, { compact: true, label: 'Suggested tasks for this event' });
  }
  return box;
}

/* ---------- person panel ---------- */
function autolinkPersonFiles(p) {
  const sec = document.createElement('section'); sec.className = 'dp-section al-person';
  const tasks = typeof tasksForPerson === 'function' ? tasksForPerson(p.id, { open: true }) : [];
  const seen = new Set();
  const files = [];
  for (const t of tasks) for (const r of (typeof resFor === 'function' ? resFor('task', t.id) : [])) if (!seen.has(r.id)) { seen.add(r.id); files.push({ r, t }); }
  if (!files.length) return sec;
  sec.innerHTML = `<div class="dp-title"><span class="ppl-sh">Files from their tasks <span class="subtle">${esc(files.length)}</span></span></div>`;
  const list = document.createElement('div'); list.className = 'res-list';
  for (const f of files.slice(0, 12)) {
    const row = resRow(f.r, { link: { type: 'task', id: f.t.id } });
    const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'chip al-taskchip';
    chip.innerHTML = icon('circle-check', 'i-xs') + '<span class="truncate"></span>';
    chip.querySelector('span').textContent = effTitle(f.t);
    chip.title = 'Open the task';
    chip.onclick = () => openTask(f.t.id, { from: chip });
    row.appendChild(chip);
    list.appendChild(row);
  }
  sec.appendChild(list);
  return sec;
}

/* ---------- Home ---------- */
function autolinkFocusChips(taskId) {
  const L = alLinked(taskId);
  if (!L || !L.meetings.length) return '';
  const today = todayStr();
  const next = L.meetings.find(m => m.ev && (m.start || '').slice(0, 10) >= today);
  if (!next) return '';
  return `<div class="hf-res al-chips"><button type="button" class="chip al-chip" data-act="alink-ev" data-ev="${escAttr(next.id)}" data-tip="Linked meeting">${icon('calendar')}<span>${esc(alWhen(next.start))} · ${esc(next.ev.summary)}</span></button></div>`;
}
function autolinkHomeCard(side) {
  const list = alPending({ min: 0.5 });
  const st = _alStatus;
  const lastAuto = st && st.lastAuto && Date.now() - Date.parse(st.lastAuto.at) < 24 * 3600000 ? st.lastAuto : null;
  // The status (last automatic attach + its Undo) is fetched once; Home repaints if there is something to show.
  if (!st && !_alStatusP) alStatus().then(s => { if (s && s.lastAuto && state.view === 'home') renderMain(); });
  if (!list.length && !lastAuto) return;
  const card = document.createElement('section'); card.className = 'card home-card al-home';
  const h = document.createElement('div'); h.className = 'section-h home-sec';
  h.innerHTML = `<h2>Suggested links</h2><span class="n">${esc(list.length)}</span>`;
  const act = document.createElement('span'); act.className = 'act';
  const rv = document.createElement('button'); rv.type = 'button'; rv.className = 'btn btn-ghost btn-sm'; rv.innerHTML = '<span>Review all</span>' + icon('chevron-right');
  rv.onclick = () => alOpenReview();
  act.appendChild(rv); h.appendChild(act);
  card.appendChild(h);
  if (lastAuto) {
    const a = document.createElement('div'); a.className = 'al-auto';
    a.innerHTML = `${icon('wand-sparkles', 'i-sm')}<span>Attached ${esc(lastAuto.count)} automatically, ${esc(alWhen(lastAuto.at))}</span>`;
    const u = document.createElement('button'); u.type = 'button'; u.className = 'btn-link'; u.textContent = 'Undo';
    u.onclick = () => alUndo(lastAuto.undo).then(() => { _alStatusAt = 0; });
    a.appendChild(u);
    card.appendChild(a);
  }
  const box = document.createElement('div'); box.className = 'al-list';
  for (const sg of list.slice(0, 4)) {
    const row = alSuggestionRow(sg, { showTask: true });
    box.appendChild(row);
  }
  card.appendChild(box);
  if (Math.min(4, list.length) > 1) alSelectList(box, 'al-home', { compact: true });
  if (list.length > 4) {
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn-link al-more';
    more.textContent = `${list.length - 4} more to review`;
    more.onclick = () => alOpenReview();
    card.appendChild(more);
  }
  side.appendChild(card);
}

/* ---------- Files view: Saved | Suggested ---------- */
function autolinkFilesTabs(page) {
  const all = alPending({ all: true });
  const n = alPending({}).length;
  const tabs = document.createElement('div'); tabs.className = 'seg al-tabs'; tabs.setAttribute('role', 'tablist');
  for (const [k, l] of [['saved', 'Saved'], ['suggested', 'Suggested']]) {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab');
    b.innerHTML = `<span>${esc(l)}</span>${k === 'suggested' && n ? `<span class="subtle num">${esc(n)}</span>` : ''}`;
    b.setAttribute('aria-selected', _alFilesTab === k ? 'true' : 'false'); b.setAttribute('aria-pressed', _alFilesTab === k ? 'true' : 'false');
    b.onclick = () => { _alFilesTab = k; renderMain(); };
    tabs.appendChild(b);
  }
  page.appendChild(tabs);
  if (_alFilesTab !== 'suggested') return false;
  const bar = document.createElement('div'); bar.className = 'res-page-bar al-bar';
  const info = document.createElement('div'); info.className = 'grow subtle al-bar-info';
  info.textContent = all.length ? `${n} to review${all.length > n ? ` (${all.length - n} weaker hidden)` : ''}. Linking a folder lets you explore it from the task.` : '';
  bar.appendChild(info);
  const run = document.createElement('button'); run.type = 'button'; run.className = 'btn btn-secondary btn-sm';
  run.innerHTML = icon('wand-sparkles') + '<span>Auto-link now</span>';
  run.onclick = () => alRunNow();
  bar.appendChild(run);
  page.appendChild(bar);
  const list = document.createElement('div'); list.className = 'card al-review';
  page.appendChild(list);
  const shown = _alShowWeak ? all : all.filter(sg => alConf(sg) >= AL_WEAK);
  if (!shown.length) {
    mountEmptyState(list, { icon: 'wand-sparkles', title: all.length ? 'Only weak suggestions left' : 'No suggestions waiting',
      text: all.length ? 'They are probably not related.' : 'Auto-link looks for the folders, repos, meetings, emails, people and tasks each open task relates to. Add your workspace folders in Settings first.',
      actions: [...(all.length ? [{ label: 'Show them', run: () => { _alShowWeak = true; renderMain(); } }] : [{ label: 'Workspace folders', icon: 'settings', run: () => setView('settings:autolink') }]), { label: 'Auto-link now', icon: 'wand-sparkles', primary: true, run: () => alRunNow() }] });
    return true;
  }
  // Grouped by task, most confident task first.
  const groups = new Map();
  for (const sg of shown) { if (!groups.has(sg.taskId)) groups.set(sg.taskId, []); groups.get(sg.taskId).push(sg); }
  for (const [tid, sgs] of groups) {
    const g = document.createElement('div'); g.className = 'al-tgroup';
    const th = document.createElement('button'); th.type = 'button'; th.className = 'al-thead';
    const t = getItem(tid);
    const s = STREAMS[effStream(t)];
    th.innerHTML = `${s ? `<span class="dot" style="--c:${escAttr(safeColor(s.color))}"></span>` : ''}<span class="truncate"></span>`;
    th.querySelector('.truncate').textContent = effTitle(t);
    th.title = 'Open the task';
    th.onclick = () => openTask(tid, { from: th });
    g.appendChild(th);
    for (const sg of sgs) g.appendChild(alSuggestionRow(sg));
    list.appendChild(g);
  }
  if (!_alShowWeak && all.length > shown.length) {
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn-link al-more';
    more.textContent = `Show ${all.length - shown.length} weaker suggestion${all.length - shown.length === 1 ? '' : 's'}`;
    more.onclick = () => { _alShowWeak = true; renderMain(); };
    list.appendChild(more);
  }
  // Tick, then Link selected / Link all / Dismiss selected; "Tick 85% or more" replaces the old threshold + Link all.
  const selBar = document.createElement('div');
  list.insertBefore(selBar, list.firstChild);
  alSelectList(list, 'al-files', {
    bar: selBar,
    extra: (barEl, sl) => {
      const s = document.createElement('select'); s.className = 'control control-sm al-tickby'; s.setAttribute('aria-label', 'Tick by confidence');
      s.innerHTML = '<option value="">Tick by confidence…</option>' + [0.9, 0.85, 0.8, 0.7, 0.6].map(v => `<option value="${v}">${esc(alPct(v))} or more</option>`).join('');
      s.onchange = () => {
        if (!s.value) return;
        const v = Number(s.value);
        sl.set(shown.map(sg => sg.id), false);
        sl.set(shown.filter(sg => alConf(sg) >= v).map(sg => sg.id), true);
        s.value = '';
      };
      barEl.querySelector('.sel-quick').appendChild(s);
    },
  });
  return true;
}

/* ---------- Settings > Files & auto-link ---------- */
let _alSettingsEl = null, _alSettingsAsked = false;
async function _alSaveSettings(patch, msg) {
  try {
    const s = await _alPost('/api/autolink/settings', patch, 'PUT');
    if (_alStatus) _alStatus.settings = s;
    if (msg !== false) toast(msg || 'Saved', { kind: 'ok' });
    alStatus(true).then(() => _alPaintSettings());
    return s;
  } catch (e) { toast(e.message || 'Could not save', { kind: 'err' }); return null; }
}
function _alAgo(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.round(m / 60)} h ago`;
  return alWhen(Clock.parts(t).iso);   // the page's calendar day (not UTC's)
}
function _alPaintStatus() {
  const el = document.querySelector('.al-status');
  if (el) _alStatusBox(el);
  const sidebarDot = document.querySelector('.al-busy');
  if (sidebarDot) sidebarDot.hidden = !(_alStatus && _alStatus.running);
}
function _alStatusBox(el) {
  const s = _alStatus || {};
  el.innerHTML = '';
  const ix = s.index;
  const lines = [];
  lines.push(ix && ix.builtAt ? `Index: ${Number(ix.files || 0).toLocaleString()} files in ${Number(ix.dirs || 0).toLocaleString()} folders, built ${_alAgo(ix.builtAt)}${ix.truncated ? ' (stopped at a limit)' : ''}` : 'Index: not built yet');
  const r = s.lastRun;
  if (r) {
    lines.push(r.error ? `Last run ${_alAgo(r.at)}: stopped (${r.error.message || r.error.code})`
      : `Last run ${_alAgo(r.at)}: ${r.tasks} task${r.tasks === 1 ? '' : 's'}, ${r.suggestions} waiting, ${r.judged || 0} checked by Claude${r.judgeSkipped && r.judgeSkipped !== 'off' ? ` (judge ${r.judgeSkipped === 'claude' ? 'needs Claude' : r.judgeSkipped === 'rate-limit' ? 'paused: hourly limit' : 'skipped'})` : ''}, ${r.autoApplied || 0} attached automatically`);
  }
  if (s.nextRunAt && s.settings && s.settings.enabled) lines.push(`Next automatic run: ${alWhen(s.nextRunAt)}`);
  for (const l of lines) { const d = document.createElement('div'); d.textContent = l; el.appendChild(d); }
  if (s.running) {
    const p = document.createElement('div'); p.className = 'al-prog';
    const phase = { index: 'Indexing', 'cloud-check': 'Checking OneDrive files', candidates: 'Finding candidates', judge: 'Checking with Claude' }[s.running.phase] || 'Working';
    p.innerHTML = `<span class="spinner"></span><span></span>${s.running.total ? `<span class="progress"><i style="--pct:${Math.round((s.running.done || 0) / s.running.total * 100)}%"></i></span>` : ''}`;
    p.querySelector('span:nth-child(2)').textContent = `${phase}${s.running.phase === 'index' && s.running.done ? ` (${Number(s.running.done).toLocaleString()} files)` : ''}${s.running.total ? ` ${s.running.done}/${s.running.total}` : ''}…`;
    el.appendChild(p);
  }
  if (s.lastAuto && s.lastAuto.undo) {
    const a = document.createElement('div'); a.className = 'al-auto';
    a.innerHTML = `<span>Attached ${esc(s.lastAuto.count)} automatically ${esc(_alAgo(s.lastAuto.at))}.</span>`;
    const u = document.createElement('button'); u.type = 'button'; u.className = 'btn-link'; u.textContent = 'Undo';
    u.onclick = () => alUndo(s.lastAuto.undo);
    a.appendChild(u);
    el.appendChild(a);
  }
}
function _alPaintSettings() { if (_alSettingsEl && document.body.contains(_alSettingsEl)) _alSettingsRender(_alSettingsEl); }
function _alSettingsRender(el) {
  _alSettingsEl = el;
  el.innerHTML = '';
  const s = _alStatus;
  if (!s) {
    el.innerHTML = '<div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>';
    // Ask once; when the server cannot answer, say so (never re-ask in a loop).
    if (!_alSettingsAsked) {
      _alSettingsAsked = true;
      let tries = 0;
      const ask = () => alStatus(true).then((st) => {
        if (st) { _alSettingsAsked = false; _alPaintSettings(); return; }
        if (++tries < 6) { setTimeout(ask, 800); return; }   // the page may still be connecting to its server
        _alSettingsAsked = false;
        if (_alSettingsEl) _alSettingsEl.innerHTML = '<div class="callout warn">Auto-linking needs the OpenDash server (start it with start-opendash).</div>';
      });
      setTimeout(ask, 0);
    }
    return;
  }
  const cfg = s.settings || {};
  el.appendChild(_settingsRow('Auto-linking', 'At start, every few hours and after you edit a task, look for the folders, GitHub repos, meetings, emails, people and tasks each open task relates to.',
    _settingsSwitch(!!cfg.enabled, 'Auto-linking', (v) => _alSaveSettings({ enabled: v }, v ? 'Auto-linking is on' : 'Auto-linking is off'))));
  const thr = _settingsSelect([[0.95, '95%'], [0.9, '90%'], [0.85, '85%'], [0.8, '80%']].map(([v, l]) => [String(v), l]), String(cfg.threshold), (v) => _alSaveSettings({ threshold: Number(v) }));
  const autoBox = document.createElement('div'); autoBox.className = 'hstack';
  autoBox.append(_settingsSwitch(!!cfg.autoApply, 'Auto-attach confident links', (v) => _alSaveSettings({ autoApply: v })), thr);
  el.appendChild(_settingsRow('Auto-attach confident links', `Links Claude rates at or above this are attached for you (at most ${cfg.maxAutoPerTask || 2} folders or repos per task); the rest wait in Suggested. Every automatic change can be undone.`, autoBox));
  const judgeBox = document.createElement('div'); judgeBox.className = 'hstack';
  const jsw = _settingsSwitch(!!(cfg.judge && cfg.judge.enabled), 'Check suggestions with Claude', (v) => _alSaveSettings({ judge: { enabled: v } }));
  jsw.setAttribute('data-requires', 'claude');
  judgeBox.append(jsw, _settingsSelect([['claude-haiku-4-5', 'Haiku 4.5'], ['claude-sonnet-5', 'Sonnet 5']], cfg.judge ? cfg.judge.model : 'claude-haiku-4-5', (v) => _alSaveSettings({ judge: { model: v } })));
  el.appendChild(_settingsRow('Check with Claude', `Names, paths, why and short excerpts only (nothing from names-only folders); at most ${cfg.judge ? cfg.judge.maxCallsPerHour : 12} calls an hour.`, judgeBox));
  el.appendChild(_settingsRow('Run every', 'While the dashboard is open.', _settingsSelect([['2', '2 hours'], ['4', '4 hours'], ['8', '8 hours'], ['12', '12 hours'], ['24', 'day']], String(cfg.intervalHours || 4), (v) => _alSaveSettings({ intervalHours: Number(v) }))));

  // Workspace folders
  const fh = document.createElement('div'); fh.className = 'set-subh';
  fh.innerHTML = `<h3>Workspace folders</h3><span class="subtle">Indexed by name, size and date, plus a short excerpt of text files. Nothing is changed in them.</span>`;
  el.appendChild(fh);
  const fl = document.createElement('div'); fl.className = 'al-folders card';
  const roots = (s.index && s.index.roots) || [];
  if (!(cfg.folders || []).length) fl.innerHTML = '<div class="subtle al-empty">No folders yet. Add the places your projects live: a Documents folder, git repositories, OneDrive.</div>';
  for (const f of cfg.folders || []) {
    const st = roots.find(r => String(r.path).toLowerCase() === String(f.path).toLowerCase());
    const row = document.createElement('div'); row.className = 'al-folder';
    row.innerHTML = `<span class="res-ic k-folder">${icon('folder')}</span><span class="al-txt"><span class="al-label truncate"></span><span class="al-where"></span></span>`;
    row.querySelector('.al-label').textContent = f.path;
    row.querySelector('.al-where').textContent = [st ? (st.error ? (st.error === 'MISSING' ? 'Not found on this computer' : st.error) : `${Number(st.files).toLocaleString()} files`) : 'Not indexed yet', f.depth != null ? `depth ${f.depth}` : '', f.container ? 'only its subfolders are suggested' : '', st && st.truncated ? 'stopped at a limit' : '', st && st.cloudUnknown ? 'OneDrive check failed: contents not read' : ''].filter(Boolean).join(' · ');
    const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'btn-icon btn-sm'; rm.innerHTML = icon('x');
    rm.setAttribute('aria-label', `Remove ${f.path}`); rm.setAttribute('data-tip', 'Remove');
    rm.onclick = () => _alSaveSettings({ folders: cfg.folders.filter(x => x.path !== f.path) }, 'Folder removed');
    row.appendChild(rm);
    fl.appendChild(row);
  }
  el.appendChild(fl);
  const add = document.createElement('div'); add.className = 'al-add hstack';
  const inp = document.createElement('input'); inp.className = 'control control-sm grow'; inp.placeholder = 'Paste a folder path, e.g. C:\\Users\\you\\Projects';
  inp.setAttribute('aria-label', 'Folder to add');
  const addPath = (p) => {
    const d = typeof rsrcDetect === 'function' ? rsrcDetect(p) : null;
    if (!d || d.kind !== 'folder') { toast('That is not an absolute folder path', { kind: 'err' }); return; }
    _alSaveSettings({ folders: [...(cfg.folders || []), { path: d.target }] }, 'Folder added: indexing starts');
  };
  inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); addPath(inp.value.trim()); } };
  const addB = document.createElement('button'); addB.type = 'button'; addB.className = 'btn btn-secondary btn-sm'; addB.innerHTML = icon('plus') + '<span>Add</span>';
  addB.onclick = () => { if (inp.value.trim()) addPath(inp.value.trim()); };
  const browse = document.createElement('button'); browse.type = 'button'; browse.className = 'btn btn-ghost btn-sm'; browse.innerHTML = icon('folder-open') + '<span>Browse…</span>';
  browse.onclick = async () => {
    try {
      const r = await _alPost('/api/resources/pick', { mode: 'folder' });
      if (r && r.paths && r.paths[0]) addPath(r.paths[0]);
    } catch (e) { toast(e.code === 'NO_PICKER' ? 'Paste the folder path instead' : (e.message || 'The picker did not open'), { kind: e.code === 'NO_PICKER' ? undefined : 'err' }); }
  };
  add.append(inp, addB, browse);
  el.appendChild(add);
  // Likely folders
  const sugBox = document.createElement('div'); sugBox.className = 'al-sugfolders';
  el.appendChild(sugBox);
  const paintSug = () => {
    sugBox.innerHTML = '';
    const list = (_alFolderSug || []).filter(f => !(cfg.folders || []).some(x => x.path.toLowerCase() === f.path.toLowerCase()));
    if (!list.length) return;
    const h = document.createElement('div'); h.className = 'overline'; h.textContent = 'Suggested folders'; sugBox.appendChild(h);
    for (const f of list.slice(0, 12)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip al-sugf';
      b.innerHTML = icon(f.why === 'Git repository' ? 'folder-git-2' : 'folder', 'i-xs') + '<span class="truncate"></span>' + icon('plus', 'i-xs');
      b.querySelector('.truncate').textContent = f.path;
      b.title = `${f.why}: add it`;
      b.onclick = () => _alSaveSettings({ folders: [...(cfg.folders || []), { path: f.path, ...(f.depth != null ? { depth: f.depth } : {}), ...(f.container ? { container: true } : {}) }] }, 'Folder added: indexing starts');
      sugBox.appendChild(b);
    }
  };
  if (_alFolderSug) paintSug();
  else _alPost('/api/autolink/folder-suggestions', null, 'GET').then(j => { _alFolderSug = j.folders || []; paintSug(); }).catch(() => {});

  // Names only
  const nh = document.createElement('div'); nh.className = 'set-subh';
  nh.innerHTML = '<h3>Names only</h3><span class="subtle">Folders whose files are listed by name only: their contents are never opened or sent to Claude. Always: client_data, secrets, .env, private.</span>';
  el.appendChild(nh);
  const nl = document.createElement('div'); nl.className = 'chips al-names';
  for (const n of cfg.namesOnly || []) {
    const c = document.createElement('span'); c.className = 'chip';
    c.innerHTML = icon('lock', 'i-xs') + '<span class="truncate"></span>';
    c.querySelector('.truncate').textContent = n;
    const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm'; x.innerHTML = icon('x', 'i-xs'); x.setAttribute('aria-label', `Remove ${n}`);
    x.onclick = () => _alSaveSettings({ namesOnly: cfg.namesOnly.filter(v => v !== n) });
    c.appendChild(x);
    nl.appendChild(c);
  }
  el.appendChild(nl);
  const nadd = document.createElement('div'); nadd.className = 'al-add hstack';
  const ninp = document.createElement('input'); ninp.className = 'control control-sm grow'; ninp.placeholder = 'A folder name (e.g. confidential) or a full path';
  ninp.setAttribute('aria-label', 'Names-only folder to add');
  const nAdd = () => { const v = ninp.value.trim(); if (!v) return; _alSaveSettings({ namesOnly: [...(cfg.namesOnly || []), v] }, 'Added: its contents will not be read'); };
  ninp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); nAdd(); } };
  const nb = document.createElement('button'); nb.type = 'button'; nb.className = 'btn btn-secondary btn-sm'; nb.innerHTML = icon('plus') + '<span>Add</span>'; nb.onclick = nAdd;
  nadd.append(ninp, nb);
  el.appendChild(nadd);

  // Status + run
  const sh = document.createElement('div'); sh.className = 'set-subh'; sh.innerHTML = '<h3>Status</h3>';
  el.appendChild(sh);
  const box = document.createElement('div'); box.className = 'al-status card'; box.setAttribute('aria-live', 'polite');
  _alStatusBox(box);
  el.appendChild(box);
  const btns = document.createElement('div'); btns.className = 'hstack al-runbtns';
  const ib = document.createElement('button'); ib.type = 'button'; ib.className = 'btn btn-secondary btn-sm'; ib.innerHTML = icon('refresh-cw') + '<span>Index now</span>';
  ib.onclick = () => alRunNow({ index: true });
  const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'btn btn-primary btn-sm'; rb.innerHTML = icon('wand-sparkles') + '<span>Auto-link now</span>';
  rb.onclick = () => alRunNow();
  const rv = document.createElement('button'); rv.type = 'button'; rv.className = 'btn btn-ghost btn-sm'; rv.innerHTML = '<span>Review suggestions</span>' + icon('chevron-right');
  rv.onclick = () => alOpenReview();
  btns.append(ib, rb, rv);
  el.appendChild(btns);
  if (s.running || s.queued) _alWatch();
}
registerSettingsGroup({
  id: 'autolink', title: 'Files & auto-link', icon: 'wand-sparkles', order: 45,
  description: 'Workspace folders to search, what is never read, and how links are suggested and attached.',
  render(el) { _alSettingsRender(el); },
});

/* ---------- palette + task menu ---------- */
registerCommand({ id: 'al-run', label: 'Auto-link now', icon: 'wand-sparkles', group: 'Commands', keywords: 'auto link related folders suggest attach', run: () => alRunNow() });
registerCommand({ id: 'al-review', label: 'Review suggested links', icon: 'wand-sparkles', group: 'Go to', keywords: 'suggestions links related auto', run: () => alOpenReview() });
registerCommand({
  id: 'al-task', label: 'Find links for this task', icon: 'wand-sparkles', group: 'Commands', keywords: 'related folder meeting email auto link',
  when: () => !!(state.selectedTaskId && getItem(state.selectedTaskId)), run: () => alRunNow({ taskId: state.selectedTaskId }),
});
function alTaskMenuItem(id) {
  return { label: 'Find related links', icon: 'wand-sparkles', run: () => alRunNow({ taskId: id }) };
}
