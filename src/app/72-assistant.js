/* ============================================================
   THE ASSISTANT (owner: Command bar / quick add / assistant)
   A chat panel on the right: talk to Claude about your tasks and ask it to
   change things. The server (server/routes/assistant.mjs) runs Claude with
   the dashboard's OWN MCP server in propose mode, so Claude looks things up
   itself and can only PROPOSE changes. Each proposal shows a before/after
   preview; nothing changes until you click Apply (POST /api/actions
   {proposalId}), and every applied change can be undone.

   API
     openAssistant({message, send, prefill})   open (and optionally ask)
     closeAssistant() / toggleAssistant()      Ctrl+J toggles
     assistantReady()                          Claude connected and AI on
     showAssistantProposal(id, text)           show a stored proposal (Assistant.showProposal)
   A proposal with two or more changes gets a checkbox per change (the shared
   select list): apply all, or only the ticked ones (dry run for their own
   confirm token, then apply); changes that need another ($ref) tick and
   untick with it; applied ones are marked done and the rest stay to apply.
   Each change also has its own buttons (user request, 4 Oct): a tick applies just
   it (with what it needs) with Undo, Skip sets it aside; a new person's primary
   button opens the person editor prefilled (Add person there applies it, and the
   changes that link them to tasks follow, with Undo). The assistant suggests
   several things at once, including people from meetings and tasks who are not in
   People yet (list_link_suggestions; ignored names never come back).
   Conversation memory: this tab's session (sessionStorage), last 40 messages;
   the server gets the last 12 turns with each question. Model choice is kept
   on this device (Opus 5.5 medium by default; Haiku 4.5 for speed).
   ============================================================ */
const _ASST_KEY = 'dashboard-assistant-v1';
const _ASST_MODEL_KEY = 'dashboard-assistant-model';
const _ASST_MODELS_FALLBACK = [
  { id: 'claude-opus-5-5', effort: 'medium', label: 'Opus 5.5', hint: 'Medium effort' },
  { id: 'claude-sonnet-5', effort: 'medium', label: 'Sonnet 5', hint: 'Medium effort' },
  { id: 'claude-haiku-4-5', effort: null, label: 'Haiku 4.5', hint: 'Fast' },
];
const _ASST_SUGGESTIONS = [
  ['calendar-range', 'What is due this week?'],
  ['sun', 'Plan my day'],
  ['circle-alert', 'What is overdue, and what should I move?'],
  ['users', 'What am I waiting on from other people?'],
  ['lightbulb', 'Suggest a few things to tidy up, including people to add'],
];
let _asst = { el: null, open: false, messages: [], busy: false, ctrl: null, models: null, prevFocus: null, pollTimer: null, unsub: null };

function _asstLoad() {
  try {
    const s = JSON.parse(sessionStorage.getItem(_ASST_KEY) || 'null');
    if (s && Array.isArray(s.messages)) {
      _asst.messages = s.messages.slice(-40);
      for (const m of _asst.messages) if (m.pending) { m.pending = false; if (!m.text && !m.error) m.error = { code: 'CANCELLED', message: 'Interrupted (the page was reloaded).' }; }
    }
  } catch (e) { _asst.messages = []; }
}
function _asstSave() {
  try { sessionStorage.setItem(_ASST_KEY, JSON.stringify({ messages: _asst.messages.slice(-40) })); } catch (e) { /* storage full: memory only */ }
}
function _asstModelChoice() {
  const list = _asst.models || _ASST_MODELS_FALLBACK;
  let id = null;
  try { id = localStorage.getItem(_ASST_MODEL_KEY); } catch (e) { id = null; }
  return list.find(m => m.id === id) || list[0];
}
async function _asstLoadModels() {
  if (_asst.models) return _asst.models;
  try {
    const r = await fetch('/api/assistant', { cache: 'no-store' });
    if (r.ok) { const j = await r.json(); if (Array.isArray(j.models) && j.models.length) _asst.models = j.models; }
  } catch (e) { /* offline: the fallback list */ }
  return _asst.models || _ASST_MODELS_FALLBACK;
}

/** Claude is connected (and the assistant is not switched off). */
function assistantReady() {
  if ((APP_CONFIG.features || {}).ai === false) return false;
  if (window.Connections && typeof Connections.has === 'function') { try { return !!Connections.has('claude'); } catch (e) { /* fall through */ } }
  return typeof AI_AVAILABLE !== 'undefined' && !!AI_AVAILABLE;
}
function _asstChecking() {
  return !assistantReady() && typeof AI_PENDING !== 'undefined' && AI_PENDING;
}

/* ---------- tiny, safe Markdown: escape first, then add our own tags ---------- */
function _asstInline(s) {
  return esc(s)
    .replace(/`([^`\n]{1,200})`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]{1,300})\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]{1,200})\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
}
function _asstMd(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  let html = '', list = null, para = [];
  const flushPara = () => { if (para.length) { html += `<p>${para.map(_asstInline).join('<br>')}</p>`; para = []; } };
  const flushList = () => { if (list) { html += `<${list.tag}>${list.items.map(i => `<li>${_asstInline(i)}</li>`).join('')}</${list.tag}>`; list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if ((m = /^\s*[-*•]\s+(.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = /^#{1,4}\s+(.*)$/.exec(line))) { flushPara(); flushList(); html += `<p class="asst-h4">${_asstInline(m[1])}</p>`; continue; }
    if (!line.trim()) { flushPara(); flushList(); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return html;
}

/* ---------- proposal previews ---------- */
const _ASST_FIELD = { dueDate: 'Due', priority: 'Priority', stream: 'Stream', title: 'Title', tags: 'Tags', people: 'People', status: 'Status',
  recurrence: 'Repeat', pinned: 'Pinned', detail: 'Description', created: 'New task', subtasks: 'Subtasks', 'subtask+': 'Subtask', notes: 'Notes', binned: 'Bin', date: 'Date', label: 'Label', name: 'Name' };
function _asstVal(field, v) {
  if (v === null || v === undefined || v === '') return field === 'dueDate' ? 'No date' : 'none';
  if (field === 'dueDate' || field === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
    if (!m) return String(v);
    // "Tue 6 Oct" (plus the year when it is not this year): exact, never relative.
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    const opts = { weekday: 'short', day: 'numeric', month: 'short' };
    if (m[1] !== todayStr().slice(0, 4)) opts.year = 'numeric';
    try { return d.toLocaleDateString(APP_CONFIG.locale || undefined, opts); } catch (e) { return String(v); }
  }
  if (field === 'priority') return ({ p0: 'None', p1: 'P1 High', p2: 'P2 Medium', p3: 'P3 Low' })[v] || String(v);
  if (field === 'stream') return (STREAMS[v] && STREAMS[v].label) || String(v);
  if (field === 'status') return ({ todo: 'To do', doing: 'In progress', done: 'Done' })[v] || String(v);
  if (field === 'people' && Array.isArray(v)) return v.map(id => (getPerson(id) || {}).name || id).join(', ') || 'none';
  if (field === 'tags' && Array.isArray(v)) return v.length ? v.map(t => '#' + t).join(' ') : 'none';
  if (field === 'pinned') return v ? 'Yes' : 'No';
  if (field === 'binned' || field === 'bin') return v ? 'In the bin' : 'Active';
  if (Array.isArray(v)) return v.length + ' item' + (v.length === 1 ? '' : 's');
  if (typeof v === 'object') return v.title || v.name || v.label || v.text || 'changed';
  const s = String(v);
  return s.length > 80 ? s.slice(0, 79) + '…' : s;
}
function _asstProposalHtml(p) {
  const rows = [];
  const byEntity = new Map();
  for (const op of (p.preview || [])) {
    const changes = op.changes || [];
    if (!changes.length) { rows.push(`<div class="asst-pv-op subtle">${esc(op.summary || op.op)}</div>`); continue; }
    for (const c of changes) {
      const key = (c.entity || 'task') + ':' + (c.id || c.label || '');
      if (!byEntity.has(key)) byEntity.set(key, { label: c.label || c.id || '', entity: c.entity || 'task', changes: [] });
      byEntity.get(key).changes.push(c);
    }
  }
  for (const ent of byEntity.values()) {
    const created = ent.changes.find(c => c.field === 'created');
    const lines = ent.changes.filter(c => c.field !== 'created').map((c) => {
      const f = _ASST_FIELD[c.field] || c.field || 'Change';
      return `<div class="asst-pv-ch"><span class="f">${esc(f)}</span><span class="from">${esc(_asstVal(c.field, c.from))}</span>${icon('arrow-right', 'i-xs')}<span class="to">${esc(_asstVal(c.field, c.to))}</span></div>`;
    }).join('');
    const ic = ent.entity === 'person' ? 'user' : ent.entity === 'countdown' ? 'hourglass' : ent.entity === 'tag' ? 'hash' : (created ? 'circle-plus' : 'circle');
    rows.push(`<div class="asst-pv-ent${created ? ' is-new' : ''}"><div class="asst-pv-t">${icon(ic, 'i-sm')}<span>${esc(ent.label)}</span>${created ? '<span class="badge badge-accent">New</span>' : ''}</div>${lines}</div>`);
  }
  return rows.join('');
}
/* ---------- ticking which changes to apply (the shared select list, 11-ui-select.js) ---------- */
// p.sel = ticked op numbers, p.applied = op numbers applied so far (server: appliedIdx),
// p.parts = [{idx, undo, state}] one per apply, p.opErrors = {opNumber: message}.
// All kept on the proposal (sessionStorage), so a re-render, a reload or a
// failed request never loses what was ticked.
const _asstSelStores = new WeakMap();
/** Two or more changes still open: tick which to apply. */
function _asstSelectable(p) { return (p.preview || []).length > 1 && ['pending', 'error', 'applying'].includes(p.state || 'pending'); }
/** deps[i] = the changes op i needs ($ref to a task another change creates). */
function _asstDeps(p) {
  const n = (p.preview || []).length;
  return Array.isArray(p.deps) && p.deps.length >= n ? p.deps : (p.preview || []).map(() => []);
}
/** A create_person change's draft for the person editor: {id, name, email}. */
function _asstPersonDraft(p, op) {
  if (!op || op.op !== 'person.create') return null;
  const d = (p.people && p.people[op.index]) || {};
  const c = (op.changes || []).find(x => x.entity === 'person' && x.field === 'created') || {};
  const name = d.name || c.label || '';
  return name ? { id: d.id || c.id || '', name, email: d.email || '' } : null;
}
function _asstOpRowsHtml(p) {
  const undone = new Set(p.undoneIdx || []);
  const applied = new Set(p.applied || []);
  const skipped = new Set(p.skipped || []), handled = new Set(p.handled || []);
  const live = ['pending', 'error'].includes(p.state || 'pending');
  return (p.preview || []).slice().sort((a, b) => a.index - b.index).map((op) => {
    const label = op.summary || ((op.changes || [])[0] || {}).label || op.op || 'Change';
    const i = op.index;
    const badge = undone.has(i) ? '<span class="badge badge-soft">Undone</span>' : applied.has(i) ? '<span class="badge badge-success">Applied</span>'
      : handled.has(i) ? '<span class="badge badge-success">Added</span>' : skipped.has(i) ? '<span class="badge badge-soft">Skipped</span>' : '';
    // Its own buttons: the person editor (prefilled) for a new person, a tick to apply it now, Skip.
    let acts = '';
    if (live && !applied.has(i) && !undone.has(i) && !handled.has(i)) {
      if (skipped.has(i)) acts = `<button type="button" class="btn btn-ghost btn-xs" data-row-act="unskip" data-tip="Offer it again">${icon('undo-2', 'i-sm')}<span>Restore</span></button>`;
      else {
        const draft = _asstPersonDraft(p, op);
        acts = (draft ? `<button type="button" class="btn btn-secondary btn-xs" data-row-act="edit" data-tip="Open the person editor, filled in">${icon('user-plus', 'i-sm')}<span>Add ${esc(draft.name.split(/\s+/)[0])}…</span></button>` : '')
          + `<button type="button" class="btn btn-ghost btn-icon btn-xs" data-row-act="apply" aria-label="${escAttr('Apply this: ' + label)}" data-tip="Apply this one">${icon('check', 'i-sm')}</button>`
          + `<button type="button" class="btn btn-ghost btn-icon btn-xs" data-row-act="skip" aria-label="${escAttr('Skip this: ' + label)}" data-tip="Skip">${icon('x', 'i-sm')}</button>`;
      }
    }
    return `<div class="asst-pv-row" data-sel-id="${escAttr(String(i))}" data-label="${escAttr(label)}"><div class="asst-pv-body">${_asstProposalHtml({ preview: [op] })}</div>`
      + badge + (acts ? `<span class="asst-row-acts">${acts}</span>` : '') + '</div>';
  }).join('');
}
function _asstMountSelect(msg, p, card) {
  const list = card.querySelector('.asst-pv');
  let store = _asstSelStores.get(p);
  if (!store) {
    // p.sel saved: every change has been seen (unticked ones stay unticked); none saved yet: all start ticked.
    store = { on: new Set((p.sel || []).map(String)), seen: new Set(Array.isArray(p.sel) ? (p.preview || []).map(x => String(x.index)) : []) };
    _asstSelStores.set(p, store);
  }
  store.errors = new Map(Object.entries(p.opErrors || {}).map(([k, v]) => [String(k), String(v)]));
  const applied = new Set(p.applied || []);
  const undone = new Set(p.undoneIdx || []);
  const deps = _asstDeps(p);
  const open = (k) => !applied.has(k) && !undone.has(k);
  const n = (k) => `${k} change${k === 1 ? '' : 's'}`;
  const sl = selectList(list, {
    store, rows: '.asst-pv-row', labelOf: (row) => row.dataset.label, label: 'Proposed changes', rowClick: true,
    locked: (id) => (applied.has(Number(id)) || (p.handled || []).includes(Number(id)) ? 'done' : undone.has(Number(id)) || (p.skipped || []).includes(Number(id))),
    apply: { label: 'Apply selected', danger: !!p.needsConfirm && !applied.size, run: (ids) => _asstApplySome(msg, p, ids.map(Number)) },
    applyAll: { label: 'Apply all', run: (ids) => _asstApplySome(msg, p, ids.map(Number)) },
    // Unticking a change unticks the changes that need it; ticking one ticks what it needs.
    onToggle: (id, value, on) => {
      const i = Number(id);
      if (value) {
        const need = opsTickClosure(deps, i).filter(k => k !== i && open(k) && !on.has(String(k)));
        return { also: need.map(String), note: need.length ? `Also ticked ${n(need.length)} it needs` : '' };
      }
      const users = opsUntickClosure(deps, i).filter(k => k !== i && on.has(String(k)));
      return { also: users.map(String), note: users.length ? `Also unticked ${n(users.length)} that need${users.length === 1 ? 's' : ''} it` : '' };
    },
    normalize: (on) => { for (const id of [...on]) for (const k of opsTickClosure(deps, Number(id))) if (open(k)) on.add(String(k)); },
    onChange: (on) => { p.sel = [...on].map(Number); _asstSave(); },
  });
  if (p.state === 'applying') sl.setBusy(true);
  card.classList.add('has-sel');
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-row-act]'); if (!b || !list.contains(b)) return;
    e.stopPropagation();
    const i = Number(b.closest('.asst-pv-row').dataset.selId);
    _asstRowAct(msg, p, i, b.dataset.rowAct, b);
  });
  return sl;
}
/** The changes that need op i (and are still open), i itself first. */
function _asstWithUsers(p, i) {
  const done = new Set([...(p.applied || []), ...(p.handled || []), ...(p.skipped || []), ...(p.undoneIdx || [])]);
  return [i, ...opsUntickClosure(_asstDeps(p), i).filter(k => k !== i && !done.has(k))];
}
/** One change's own button: apply it now (with Undo), skip it, restore it, or open the person editor prefilled. */
async function _asstRowAct(msg, p, i, act, btn) {
  if (p.state === 'applying') return;
  if (act === 'apply') return _asstApplySome(msg, p, [i]);
  if (act === 'skip' || act === 'unskip') {
    // Skipping a change skips the ones that need it; restoring one restores it alone.
    const ids = act === 'skip' ? _asstWithUsers(p, i) : [i];
    const set = new Set(p.skipped || []);
    for (const k of ids) { if (act === 'skip') set.add(k); else set.delete(k); }
    p.skipped = [...set];
    p.sel = (p.sel || []).filter(k => !set.has(k));
    if (act === 'unskip') p.sel = [...new Set([...(p.sel || []), i])];
    _asstSettle(p); _asstSave(); _asstPaint();
    return;
  }
  if (act === 'edit') {
    const op = (p.preview || []).find(x => x.index === i);
    const draft = _asstPersonDraft(p, op);
    if (!draft || typeof openPersonEditor !== 'function') return;
    openPersonEditor(null, { id: draft.id || undefined, name: draft.name, emails: draft.email ? [draft.email] : [] }, {
      stay: true,
      onSaved: (pid) => _asstPersonAdded(msg, p, i, pid),
    });
  }
}
/**
 * The person editor added someone a proposal offered: that change is done, and the
 * changes that link them to tasks are applied as they were proposed (one Undo).
 */
async function _asstPersonAdded(msg, p, i, pid) {
  const users = _asstWithUsers(p, i).filter(k => k !== i);
  const links = users.map(k => (p.preview || []).find(x => x.index === k)).filter(op => op && op.op === 'task.link_person');
  const ops = links.map(op => { const c = (op.changes || []).find(x => x.id) || {}; return c.id ? { op: 'task.link_person', id: c.id, person: pid } : null; }).filter(Boolean);
  p.handled = [...new Set([...(p.handled || []), i])];
  p.sel = (p.sel || []).filter(k => k !== i);
  if (ops.length && typeof actionsApply === 'function') {
    const j = await actionsApply(ops, { client: 'dashboard assistant', done: `Linked to ${ops.length} task${ops.length === 1 ? '' : 's'}` });
    if (j) { const idx = links.map(op => op.index); p.handled = [...new Set([...p.handled, ...idx])]; p.sel = (p.sel || []).filter(k => !idx.includes(k)); }
  }
  _asstSettle(p); _asstSave(); _asstPaint();
}
/** Every change decided (applied, added, skipped or undone): the proposal is finished. */
function _asstSettle(p) {
  const n = (p.preview || []).length;
  const decided = new Set([...(p.applied || []), ...(p.handled || []), ...(p.skipped || []), ...(p.undoneIdx || [])]);
  if (!n || decided.size < n || !['pending', 'error'].includes(p.state || 'pending')) return;
  p.state = (p.applied || []).length || (p.handled || []).length ? 'applied' : 'dismissed';
}
function _asstProposalCard(msg, p) {
  const card = document.createElement('div');
  card.className = 'asst-prop card is-' + (p.state || 'pending');
  const selectable = _asstSelectable(p);
  const n = (p.preview || []).reduce((a, op) => a + Math.max(1, (op.changes || []).length), 0);
  const badge = { pending: '', applying: '<span class="status busy">Applying…</span>', applied: `<span class="status ok">Applied</span>`,
    undone: '<span class="status">Undone</span>', dismissed: '<span class="status">Dismissed</span>', error: '<span class="status err">Not applied</span>' }[p.state || 'pending'] || '';
  card.innerHTML = `
    <div class="asst-prop-h">${icon('wand-sparkles', 'i-sm')}<b>Proposed change${n === 1 ? '' : 's'}</b><span class="subtle">${n} change${n === 1 ? '' : 's'}</span><span class="spacer"></span>${badge}</div>
    ${p.note ? `<div class="asst-prop-note">${esc(p.note)}</div>` : ''}
    ${p.notice ? `<div class="callout warn">${icon('info', 'i-sm')}<span>${esc(p.notice)}</span></div>` : ''}
    <div class="asst-pv">${selectable || (p.skipped || []).length || (p.handled || []).length ? _asstOpRowsHtml(p) : _asstProposalHtml(p)}</div>
    ${(p.warnings || []).length ? `<div class="asst-prop-warn subtle">${p.warnings.slice(0, 3).map(w => esc(w.message || w)).join('<br>')}</div>` : ''}
    ${p.needsConfirm && p.state === 'pending' && !(p.applied || []).length ? `<div class="callout danger">${icon('triangle-alert', 'i-sm')}<span>${esc(_asstConfirmText(p))} You can still undo it.</span></div>` : ''}
    ${p.error ? `<div class="callout danger">${icon('circle-alert', 'i-sm')}<span>${esc(p.error)}</span></div>` : ''}
    <div class="asst-prop-f"></div>`;
  const f = card.querySelector('.asst-prop-f');
  const btn = (label, cls, ic, run) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls;
    b.innerHTML = (ic ? icon(ic) : '') + `<span>${esc(label)}</span>`;
    b.onclick = run; f.appendChild(b); return b;
  };
  // Parts applied one at a time: an Undo for each.
  const parts = (p.parts || []).filter(x => x.state === 'applied' && x.undo);
  const partUndos = () => parts.forEach((x) => btn(parts.length > 1 || selectable ? `Undo ${x.idx.length} applied` : 'Undo', 'btn-secondary', 'undo-2', () => _asstUndoPart(msg, p, x)));
  if (selectable) {
    // Apply selected / Apply all live in the selection bar above the changes.
    _asstMountSelect(msg, p, card);
    if (p.state !== 'applying') btn((p.applied || []).length ? 'Dismiss the rest' : 'Dismiss', 'btn-ghost', null, () => _asstDismiss(msg, p));
    else f.insertAdjacentHTML('beforeend', '<span class="spinner"></span><span class="subtle">Applying…</span>');
    f.insertAdjacentHTML('beforeend', '<span class="spacer"></span>');
    partUndos();
  } else if (p.state === 'pending' || p.state === 'error') {
    const one = (p.preview || [])[0];
    const draft = (p.preview || []).length === 1 ? _asstPersonDraft(p, one) : null;
    if (draft && typeof openPersonEditor === 'function') {
      btn(`Add ${draft.name.split(/\s+/)[0]}…`, 'btn-primary', 'user-plus', () => openPersonEditor(null, { id: draft.id || undefined, name: draft.name, emails: draft.email ? [draft.email] : [] }, {
        stay: true, onSaved: () => { _asstDismiss(msg, p).then(() => { p.state = 'applied'; p.note = p.note || null; _asstSave(); _asstPaint(); }); },
      }));
      btn('Apply as it is', 'btn-secondary', 'check', () => _asstApply(msg, p));
    } else btn('Apply', p.needsConfirm ? 'btn-danger' : 'btn-primary', 'check', () => _asstApply(msg, p));
    btn('Dismiss', 'btn-ghost', null, () => _asstDismiss(msg, p));
  } else if (p.state === 'applied' && parts.length > 1) {
    f.insertAdjacentHTML('beforeend', `<span class="subtle">${icon('circle-check', 'i-sm')} Done. </span>`);
    partUndos();
  } else if (p.state === 'applying') {
    f.innerHTML = '<span class="spinner"></span><span class="subtle">Applying…</span>';
  } else if (p.state === 'applied') {
    f.insertAdjacentHTML('beforeend', `<span class="subtle">${icon('circle-check', 'i-sm')} Done. </span>`);
    if (p.undo) btn('Undo', 'btn-secondary', 'undo-2', () => _asstUndo(msg, p));
  } else if (p.state === 'undone') {
    f.insertAdjacentHTML('beforeend', `<span class="subtle">${icon('undo-2', 'i-sm')} Undone.</span>`);
  }
  return card;
}

/* ---------- applying, undoing, dismissing ---------- */
// Apply/Undo writes this tab is making right now. Live sync (86-live-sync.js)
// still adopts the new version but skips its "Updated by the assistant" toast
// for these: the proposal card already shows Applied/Undone with its own Undo.
let _asstOwnWrites = 0;
async function _asstPost(url, body) {
  _asstOwnWrites++;
  let r;
  try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  finally { setTimeout(() => { _asstOwnWrites = Math.max(0, _asstOwnWrites - 1); }, 1500); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) {
    const e = new Error((j.error && (j.error.message || j.error)) || ('HTTP ' + r.status));
    e.code = (j.error && j.error.code) || j.code || null; e.data = j.error || j;
    throw e;
  }
  return j;
}
/** Bring this tab up to the version the server just wrote (keeps view/selection; merges unsaved edits). */
async function _asstAdopt(version) {
  if (!(Number(version) > (Number(state._lastSave) || 0))) return;
  try {
    if (state._localDirty || _persistTimer || _persistInFlight) { _persistFire(); return; }   // the save meets a 409 and merges
    // The merge base is what this tab last loaded/saved: read it BEFORE
    // serverStateLoad() replaces it, or the merge would see the server's new
    // values as "theirs = base" and keep this tab's old ones.
    const baseKey = _lastPersistedKey;
    const remote = await serverStateLoad();
    if (!remote || !((Number(remote._lastSave) || 0) > (Number(state._lastSave) || 0))) return;
    if (typeof _liveReconcile === 'function') {
      const r = await _liveReconcile(remote, baseKey, { source: 'assistant' });
      if (r && r.ours) schedulePersist(50);
    } else if (typeof _liveOnRemote === 'function') {
      await _liveOnRemote({ version, source: 'assistant' });
    }
  } catch (e) { console.error('[assistant] refresh', e); }
}
/** Why a proposal needs a second click, from the server's reasons (bin/delete/merge, or a large batch). */
function _asstConfirmText(p) {
  const rs = Array.isArray(p.reasons) ? p.reasons.map(String) : [];
  const danger = !rs.length || rs.some(r => /delete|merge/i.test(r));
  const bulk = rs.some(r => /more than/i.test(r));
  if (danger && bulk) return 'This changes a lot at once, and includes moving something to the bin, deleting or merging.';
  if (bulk) return 'This changes a lot at once (more than 25 tasks or changes).';
  return 'This includes moving something to the bin, deleting or merging.';
}
async function _asstApply(msg, p) {
  if (p.needsConfirm) {
    const ok = await confirmDialog({ title: 'Apply these changes?', text: _asstConfirmText(p) + ' You can undo it afterwards.', confirmLabel: 'Apply', danger: true });
    if (!ok) return;
  }
  p.state = 'applying'; p.error = null; p.notice = null; _asstPaint();
  try {
    const j = await _asstPost('/api/actions', { proposalId: p.id, source: 'assistant', client: 'dashboard assistant' });
    p.state = 'applied'; p.undo = j.undo || null;
    await _asstAdopt(j.version);
  } catch (e) {
    if (e.code === 'PREVIEW_CHANGED') {
      try {
        const r = await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'proposal.get', params: { id: p.id } }) });
        const fresh = await r.json();
        if (r.ok && fresh && fresh.preview) { p.preview = fresh.preview; p.needsConfirm = !!fresh.needsConfirm; p.reasons = Array.isArray(fresh.reasons) ? fresh.reasons : []; }
      } catch (e2) { /* keep the old preview */ }
      p.state = 'pending';
      p.notice = 'Your tasks changed since this was proposed, so here is what it would do now. Check it, then apply again.';
    } else if (e.code === 'ALREADY_APPLIED') {
      p.state = 'applied';
    } else {
      // Nothing was applied (a batch is all-or-nothing). The ticks stay, so Apply tries again.
      p.state = 'error'; p.error = netErrorMessage(e, 'Could not apply.');
      _asstMarkOpErrors(p, e);
    }
  }
  _asstSave(); _asstPaint();
}
/** The change that failed keeps its tick and shows why ("ops[2] (task.bin): ..." -> "..."). */
function _asstMarkOpErrors(p, e) {
  const d = (e && e.data) || {};
  const list = Array.isArray(d.errors) && d.errors.length ? d.errors : Number.isInteger(d.opIndex) ? [d] : [];
  p.opErrors = {};
  for (const x of list) if (Number.isInteger(x.opIndex)) p.opErrors[x.opIndex] = String(x.message || e.message || '').replace(/^ops\[\d+\]\s*(\([^)]*\))?:?\s*/, '');
  if (list.length) p.error = list.length === 1 ? 'Nothing was applied: one change could not be made (marked below).' : `Nothing was applied: ${list.length} changes could not be made (marked below).`;
}
/** Bring a proposal's applied/undone state in step with the server's copy. */
async function _asstRefreshProposal(p) {
  try {
    const r = await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'proposal.get', params: { id: p.id } }) });
    const fresh = await r.json();
    if (!r.ok || !fresh) return;
    if (Array.isArray(fresh.appliedIdx)) p.applied = fresh.appliedIdx;
    if (fresh.preview) { p.preview = fresh.preview; p.needsConfirm = !!fresh.needsConfirm; p.reasons = Array.isArray(fresh.reasons) ? fresh.reasons : []; }
    if (fresh.status && fresh.status !== 'pending') p.state = fresh.status;
  } catch (e) { /* keep what we have */ }
}
/** A dry run of a subset that deletes/merges, or that changed since it was proposed: show what it will do now. */
function _asstConfirmSubset(p, dry) {
  return new Promise((resolve) => {
    let answered = false;
    const k = (dry.only || []).length;
    const why = [];
    if (dry.changedSinceProposal) why.push('Your tasks changed since this was proposed, so this is what it would do now.');
    if (dry.needsConfirm) why.push(_asstConfirmText({ reasons: dry.reasons }));
    if ((dry.added || []).length) why.push(`It includes ${dry.added.length} change${dry.added.length === 1 ? '' : 's'} the ticked ones need.`);
    openDialog({
      title: `Apply ${k} change${k === 1 ? '' : 's'}?`, width: 480,
      body: (el) => {
        const t = document.createElement('p'); t.className = 'muted'; t.textContent = why.join(' ') + ' You can undo it afterwards.';
        const pv = document.createElement('div'); pv.className = 'asst-pv asst-pv-dialog card'; pv.innerHTML = _asstProposalHtml({ preview: dry.preview || [] });
        el.append(t, pv);
      },
      actions: [
        { label: 'Cancel', run: () => { answered = true; resolve(false); } },
        { label: 'Apply', primary: !dry.needsConfirm, danger: !!dry.needsConfirm, run: () => { answered = true; resolve(true); } },
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}
/**
 * Apply only the ticked changes. The server's confirm token is tied to the
 * exact ops, so the subset is dry-run first for its own token (never the old
 * one); a dangerous or changed subset is shown before it is applied. The
 * batch is all-or-nothing; applied changes are marked done and the rest stay
 * ticked and ready.
 */
async function _asstApplySome(msg, p, ids) {
  const aside = new Set([...(p.skipped || []), ...(p.handled || [])]);
  ids = [...new Set(ids)].filter(Number.isInteger).filter(i => !aside.has(i)).sort((a, b) => a - b);
  if (!ids.length) return;
  const applied = new Set(p.applied || []);
  if (!applied.size && !aside.size && !(p.parts || []).length && ids.length >= (p.preview || []).length) return _asstApply(msg, p);   // all of it: the one-click path
  p.state = 'applying'; p.error = null; p.notice = null; p.opErrors = {};
  _asstSave(); _asstPaint();
  const body = { proposalId: p.id, source: 'assistant', client: 'dashboard assistant' };
  try {
    const dry = await _asstPost('/api/actions', Object.assign({}, body, { only: ids, dryRun: true }));
    if (dry.needsConfirm || dry.changedSinceProposal) {
      if (!await _asstConfirmSubset(p, dry)) { p.state = 'pending'; _asstSave(); _asstPaint(); return; }
    }
    const j = await _asstPost('/api/actions', Object.assign({}, body, { only: dry.only, confirm: dry.confirm }));
    const part = { idx: j.only || dry.only, undo: j.undo || null, state: 'applied', at: Date.now() };
    p.parts = [...(p.parts || []), part];
    p.applied = Array.isArray(j.appliedIdx) ? j.appliedIdx : [...applied, ...part.idx];
    p.sel = (p.sel || []).filter(i => !p.applied.includes(i));
    p.state = j.status === 'applied' ? 'applied' : 'pending';
    if (p.state === 'applied') p.undo = part.undo;
    else _asstSettle(p);
    await _asstAdopt(j.version);
    const k = part.idx.length;
    toast(`Applied ${k} change${k === 1 ? '' : 's'}${p.state === 'applied' ? '' : `; ${(p.preview || []).length - p.applied.length} still to decide`}`, { kind: 'ok', icon: 'check', action: part.undo ? { label: 'Undo', run: () => _asstUndoPart(msg, p, part) } : undefined });
  } catch (e) {
    p.state = 'pending';
    if (e.code === 'ALREADY_APPLIED') await _asstRefreshProposal(p);
    else if (e.code === 'PREVIEW_CHANGED' || e.code === 'BAD_CONFIRM') {
      p.notice = 'Your tasks changed while this was being applied, so nothing was applied. Check the changes, then apply again.';
      await _asstRefreshProposal(p);
      if (p.state === 'applying') p.state = 'pending';
    } else {
      p.error = netErrorMessage(e, 'Could not apply.');
      _asstMarkOpErrors(p, e);
    }
  }
  _asstSave(); _asstPaint();
}
async function _asstUndoPart(msg, p, part, force) {
  if (!part || part.state !== 'applied' || !part.undo) return;
  try {
    const j = await _asstPost('/api/actions/undo', { token: part.undo, force: !!force, source: 'ui', client: 'dashboard assistant' });
    part.state = 'undone';
    p.undoneIdx = [...new Set([...(p.undoneIdx || []), ...part.idx])];
    if ((p.parts || []).every(x => x.state === 'undone') && p.state === 'applied') p.state = 'undone';
    await _asstAdopt(j.version);
  } catch (e) {
    if (e.code === 'CONFLICT' && !force) {
      const ok = await confirmDialog({ title: 'Undo anyway?', text: 'Some of these were changed again since. Undoing now would overwrite those newer edits.', confirmLabel: 'Undo anyway', danger: true });
      if (ok) return _asstUndoPart(msg, p, part, true);
      return;
    }
    toast(netErrorMessage(e, 'Could not undo'), { kind: 'err' });
  }
  _asstSave(); _asstPaint();
}
async function _asstUndo(msg, p, force) {
  try {
    const j = await _asstPost('/api/actions/undo', { token: p.undo, force: !!force, source: 'ui', client: 'dashboard assistant' });
    p.state = 'undone';
    await _asstAdopt(j.version);
  } catch (e) {
    if (e.code === 'CONFLICT' && !force) {
      const ok = await confirmDialog({ title: 'Undo anyway?', text: 'Some of these were changed again since. Undoing now would overwrite those newer edits.', confirmLabel: 'Undo anyway', danger: true });
      if (ok) return _asstUndo(msg, p, true);
      return;
    }
    toast(e.message || 'Could not undo', { kind: 'err' });
  }
  _asstSave(); _asstPaint();
}
async function _asstDismiss(msg, p) {
  try { await _asstPost('/api/actions', { proposalId: p.id, dismiss: true }); } catch (e) { /* expired or gone: dismiss locally anyway */ }
  p.state = 'dismissed';
  _asstSave(); _asstPaint();
}

/* ---------- talking to the server ---------- */
function _asstHistory(upto) {
  const out = [];
  for (const m of _asst.messages.slice(0, upto)) {
    if (m.role === 'user') { out.push({ role: 'user', text: m.text }); continue; }
    if (m.role !== 'assistant' || (!m.text && !(m.proposals || []).length)) continue;
    let t = m.text || '';
    for (const p of (m.proposals || [])) t += `\n[Proposed: ${p.summary || 'changes'} - ${p.state || 'pending'}${(p.applied || []).length && p.state === 'pending' ? `, ${p.applied.length} of ${(p.preview || []).length} changes applied` : ''}]`;
    out.push({ role: 'assistant', text: t.trim() });
  }
  return out.slice(-12);
}
function _asstPageContext() {
  const v = state.view || '';
  let label = '';
  try { label = typeof viewTitle === 'function' ? viewTitle(v) : v; } catch (e) { label = v; }
  const sec = typeof sectionFor === 'function' ? sectionFor(v) : null;
  if (sec && typeof sec.title === 'function') { try { label = String(sec.title(v) || label); } catch (e) { /* keep */ } }
  const sel = state.selectedTaskId ? getItem(state.selectedTaskId) : null;
  return { view: v, viewLabel: label, selectedTaskId: sel ? sel.id : '', selectedTaskTitle: sel ? effTitle(sel) : '' };
}
async function _asstSend(text) {
  text = String(text || '').trim();
  if (!text || _asst.busy) return;
  if (!assistantReady()) { _asstPaint(); return; }
  const model = _asstModelChoice();
  const user = { id: 'm' + Date.now(), role: 'user', text: text.slice(0, 4000), ts: Date.now() };
  _asst.messages.push(user);
  const reply = { id: 'm' + (Date.now() + 1), role: 'assistant', text: '', ts: Date.now(), pending: true, status: 'Thinking', proposals: [], model: model.label };
  _asst.messages.push(reply);
  _asst.busy = true;
  _asst.ctrl = new AbortController();
  _asstSave(); _asstPaint(true);
  const t0 = Date.now();
  try {
    const r = await fetch('/api/assistant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: _asst.ctrl.signal,
      body: JSON.stringify({ message: user.text, history: _asstHistory(_asst.messages.length - 2), page: _asstPageContext(), model: model.id, effort: model.effort }),
    });
    if (!r.ok || !r.body) {
      const j = await r.json().catch(() => ({}));
      reply.error = { code: j.code || 'HTTP_' + r.status, message: j.error || `The assistant could not start (${r.status}).` };
    } else {
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line) continue;
          let ev; try { ev = JSON.parse(line); } catch (e) { continue; }
          _asstOnEvent(reply, ev);
        }
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError') reply.stopped = true;
    else reply.error = { code: 'NETWORK', message: netErrorMessage(e, NET_DOWN_MESSAGE) };
  } finally {
    reply.pending = false;
    reply.ms = Date.now() - t0;
    if (reply.stopped && !reply.text) reply.text = 'Stopped.';
    _asst.busy = false; _asst.ctrl = null;
    _asstSave(); _asstPaint(true);
    const ta = _asst.el && _asst.el.querySelector('.asst-input');
    if (ta && _asst.open) ta.focus({ preventScroll: true });
  }
}
function _asstOnEvent(reply, ev) {
  if (ev.type === 'status') reply.status = ev.text;
  else if (ev.type === 'text') reply.interim = ev.text;
  else if (ev.type === 'fallback') reply.status = 'Answering without the dashboard tools';
  else if (ev.type === 'proposal' && ev.proposal) reply.proposals.push(Object.assign({}, ev.proposal, { state: 'pending' }));
  else if (ev.type === 'done') { reply.text = ev.text || ''; reply.via = ev.via; }
  else if (ev.type === 'error') reply.error = { code: ev.code, message: ev.error };
  _asstPaint(true);
}

/* ---------- the panel ---------- */
function _asstBuild() {
  const el = document.createElement('aside');
  el.className = 'asst';
  el.setAttribute('role', 'complementary');
  el.setAttribute('aria-label', 'Assistant');
  el.innerHTML = `
    <div class="asst-h">
      <span class="asst-mark">${icon('sparkles')}</span><b>Assistant</b>
      <button type="button" class="btn btn-ghost btn-sm asst-model" aria-haspopup="menu" data-tip="Model"></button>
      <span class="spacer"></span>
      <button type="button" class="btn-icon asst-new" aria-label="New conversation" data-tip="New conversation">${icon('rotate-ccw')}</button>
      <button type="button" class="btn-icon asst-close" aria-label="Close the assistant" data-tip="Close" data-kbd="Ctrl+J">${icon('x')}</button>
    </div>
    <div class="asst-body" role="log" aria-live="polite" aria-relevant="additions"></div>
    <div class="asst-gate" hidden></div>
    <div class="asst-compose">
      <div class="asst-box">
        <textarea class="asst-input" rows="1" placeholder="Ask about your tasks, or say what to change…" aria-label="Message the assistant"></textarea>
        <button type="button" class="btn btn-primary btn-icon asst-send" aria-label="Send">${icon('arrow-up')}</button>
      </div>
      <div class="asst-hint"><span>${icon('shield-check', 'i-xs')}Changes wait for your Apply</span><span class="spacer"></span><span><kbd class="kbd">Enter</kbd> send</span><span><kbd class="kbd">Shift</kbd><kbd class="kbd">Enter</kbd> new line</span></div>
    </div>`;
  const ta = el.querySelector('.asst-input');
  const send = el.querySelector('.asst-send');
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; send.disabled = !_asst.busy && !ta.value.trim(); };
  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (_asst.busy) return;
      const v = ta.value; ta.value = ''; grow(); _asstSend(v);
    }
  });
  send.onclick = () => {
    if (_asst.busy) { if (_asst.ctrl) _asst.ctrl.abort(); return; }
    const v = ta.value; ta.value = ''; grow(); _asstSend(v);
  };
  el.querySelector('.asst-close').onclick = () => closeAssistant();
  el.querySelector('.asst-new').onclick = () => {
    if (_asst.busy && _asst.ctrl) _asst.ctrl.abort();
    _asst.messages = []; _asstSave(); _asstPaint(); ta.focus();
  };
  const mb = el.querySelector('.asst-model');
  mb.onclick = async () => {
    const list = await _asstLoadModels();
    const cur = _asstModelChoice();
    openMenu(mb, [{ heading: 'Model' }, ...list.map(m => ({
      label: m.label, hint: m.hint || (m.effort ? m.effort : ''), checked: m.id === cur.id,
      run: () => { try { localStorage.setItem(_ASST_MODEL_KEY, m.id); } catch (e) {} _asstPaint(); },
    }))]);
  };
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.querySelector('.pop:not([hidden]), .modal')) { e.preventDefault(); e.stopPropagation(); closeAssistant(); }
  });
  el.addEventListener('click', (e) => {
    const s = e.target.closest('[data-asst-suggest]');
    if (s) { _asstSend(s.getAttribute('data-asst-suggest')); return; }
    const c = e.target.closest('[data-asst-connect]');
    if (c) { if (window.Connections && Connections.open) Connections.open('claude'); else setView('connections'); return; }
    const retry = e.target.closest('[data-asst-retry]');
    if (retry) {
      const i = _asst.messages.findIndex(m => m.id === retry.getAttribute('data-asst-retry'));
      const q = i > 0 ? _asst.messages[i - 1] : null;
      if (q && q.role === 'user') { _asst.messages.splice(i - 1, 2); _asstSend(q.text); }
    }
  });
  document.body.appendChild(el);
  return el;
}

function _asstBubble(m, i) {
  const row = document.createElement('div');
  row.className = 'asst-msg ' + m.role + (m.pending ? ' is-pending' : '') + (m.error ? ' is-error' : '');
  if (m.role === 'user') {
    row.innerHTML = `<div class="asst-bubble">${_asstInline(m.text).replace(/\n/g, '<br>')}</div>`;
    return row;
  }
  let html = '';
  if (m.pending) {
    html += `<div class="asst-status"><span class="spinner"></span><span>${esc(m.status || 'Thinking')}…</span></div>`;
    if (m.interim) html += `<div class="asst-interim">${_asstMd(m.interim)}</div>`;
  } else if (m.error) {
    const code = m.error.code || '';
    const connect = ['CLI_MISSING', 'NOT_SIGNED_IN', 'UNAVAILABLE'].includes(code);
    html += `<div class="callout danger asst-err">${icon('circle-alert', 'i-sm')}<div><div>${esc(m.error.message || 'Something went wrong.')}</div>`
      + `<div class="asst-err-a">${connect ? '<button type="button" class="btn btn-secondary btn-sm" data-asst-connect>Open Connections</button>' : ''}`
      + `<button type="button" class="btn btn-ghost btn-sm" data-asst-retry="${escAttr(m.id)}">${icon('refresh-cw')}<span>Try again</span></button></div></div></div>`;
  } else {
    html += `<div class="asst-text">${_asstMd(m.text)}</div>`;
  }
  row.innerHTML = html;
  for (const p of (m.proposals || [])) row.appendChild(_asstProposalCard(m, p));
  if (!m.pending && !m.error && (m.model || m.ms)) {
    const meta = document.createElement('div'); meta.className = 'asst-meta';
    meta.textContent = [m.model, m.ms ? (m.ms / 1000).toFixed(1) + 's' : '', m.via === 'json' ? 'without tools' : ''].filter(Boolean).join(' · ');
    row.appendChild(meta);
  }
  return row;
}

function _asstPaint(stick) {
  const el = _asst.el;
  if (!el || !_asst.open) return;
  const body = el.querySelector('.asst-body');
  const nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
  const ready = assistantReady();
  const model = _asstModelChoice();
  el.querySelector('.asst-model').innerHTML = `<span>${esc(model.label)}</span><span class="subtle">${esc(model.effort ? model.effort[0].toUpperCase() + model.effort.slice(1) : (model.hint || ''))}</span>${icon('chevron-down', 'i-xs')}`;
  body.innerHTML = '';
  if (!_asst.messages.length) {
    const e = document.createElement('div'); e.className = 'asst-empty';
    e.innerHTML = `<div class="asst-empty-ic">${icon('sparkles')}</div>
      <div class="asst-empty-t">Ask about your tasks, or say what to change</div>
      <div class="asst-empty-s">It looks things up in your dashboard and proposes changes. Nothing changes until you press Apply.</div>
      <div class="asst-sugs">${_ASST_SUGGESTIONS.map(([ic, t]) => `<button type="button" class="asst-sug" data-asst-suggest="${escAttr(t)}"${ready ? '' : ' disabled'}>${icon(ic, 'i-sm')}<span>${esc(t)}</span></button>`).join('')}</div>`;
    body.appendChild(e);
  } else {
    _asst.messages.forEach((m, i) => body.appendChild(_asstBubble(m, i)));
  }
  const gate = el.querySelector('.asst-gate');
  gate.hidden = ready;
  if (!ready) {
    const off = (APP_CONFIG.features || {}).ai === false;
    gate.innerHTML = _asstChecking()
      ? `<div class="callout">${icon('loader-circle', 'i-sm')}<span>Checking the Claude connection…</span></div>`
      : off
        ? `<div class="callout">${icon('lock', 'i-sm')}<span>The assistant is switched off in Settings.</span></div>`
        : `<div class="callout">${icon('plug', 'i-sm')}<div><b>Connect Claude to use the assistant.</b><div class="subtle">It runs on the Claude Code app on this computer, with your own Claude account.</div><button type="button" class="btn btn-primary btn-sm" data-asst-connect>${icon('plug-zap')}<span>Connect Claude</span></button></div></div>`;
  }
  el.classList.toggle('is-locked', !ready);
  const ta = el.querySelector('.asst-input');
  ta.disabled = !ready;
  const send = el.querySelector('.asst-send');
  send.innerHTML = _asst.busy ? icon('square') : icon('arrow-up');
  send.setAttribute('aria-label', _asst.busy ? 'Stop' : 'Send');
  send.setAttribute('data-tip', _asst.busy ? 'Stop' : 'Send');
  send.classList.toggle('is-stop', _asst.busy);
  send.disabled = !ready || (!_asst.busy && !ta.value.trim());
  if (stick || nearBottom) body.scrollTop = body.scrollHeight;
}

function openAssistant(o) {
  o = o || {};
  if (!_asst.el) { _asstLoad(); _asst.el = _asstBuild(); if (typeof splitSync === 'function') splitSync(); }   // drag-to-resize edge (13-splitter.js)
  if (!_asst.open) {
    _asst.prevFocus = document.activeElement;
    _asst.open = true;
    _asst.el.classList.add('open');
    document.body.classList.add('asst-open');
    if (window.Connections && Connections.onChange && !_asst.unsub) _asst.unsub = Connections.onChange(() => _asstPaint());
    clearInterval(_asst.pollTimer);
    _asst.pollTimer = setInterval(() => { if (_asst.open && !assistantReady()) _asstPaint(); }, 4000);
    _asstLoadModels().then(() => _asstPaint());
  }
  _asstPaint(true);
  const ta = _asst.el.querySelector('.asst-input');
  if (o.prefill && !ta.value) { ta.value = o.prefill; ta.dispatchEvent(new Event('input')); }
  if (o.message && o.send && assistantReady()) _asstSend(o.message);
  else if (o.message && !ta.value) { ta.value = o.message; ta.dispatchEvent(new Event('input')); }
  setTimeout(() => { try { if (!ta.disabled) ta.focus({ preventScroll: true }); } catch (e) {} }, 0);
  renderSidebarFooterAssistant();
}
function closeAssistant() {
  if (!_asst.open) return;
  _asst.open = false;
  clearInterval(_asst.pollTimer); _asst.pollTimer = null;
  if (_asst.unsub) { _asst.unsub(); _asst.unsub = null; }
  if (_asst.el) _asst.el.classList.remove('open');
  document.body.classList.remove('asst-open');
  const pf = _asst.prevFocus;
  _asst.prevFocus = null;
  if (pf && pf.focus && document.contains(pf)) try { pf.focus({ preventScroll: true }); } catch (e) {}
  renderSidebarFooterAssistant();
}
function toggleAssistant() { if (_asst.open) closeAssistant(); else openAssistant(); }
/**
 * Show a stored proposal (from the assistant, or any MCP client in propose
 * mode) in the panel as if the assistant had just made it. Also the test hook
 * for a deterministic proposal: POST /api/actions {ops, propose:true}, then this.
 */
async function showAssistantProposal(id, text) {
  const r = await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'proposal.get', params: { id } }) });
  const pr = await r.json().catch(() => null);
  if (!r.ok || !pr || !Array.isArray(pr.ops)) throw new Error((pr && pr.error && (pr.error.message || pr.error)) || 'No such proposal');
  const p = {
    id, summary: pr.summary || '', note: pr.note || null, preview: pr.preview || [], warnings: pr.warnings || [],
    needsConfirm: !!pr.needsConfirm, reasons: Array.isArray(pr.reasons) ? pr.reasons : [], ops: pr.ops.length,
    deps: opsRefDeps(pr.ops), applied: Array.isArray(pr.appliedIdx) ? pr.appliedIdx : [], state: pr.status && pr.status !== 'pending' ? pr.status : 'pending',
    people: Object.fromEntries(pr.ops.map((o, i) => [i, o]).filter(([, o]) => o && o.op === 'person.create').map(([i, o]) => { const q = o.params || o; return [i, { id: q.id || '', name: q.name || '', email: q.email || (Array.isArray(q.emails) ? q.emails[0] : '') || '' }]; })),
  };
  if (!_asst.el) _asstLoad();   // openAssistant() builds the panel (and reloads these messages)
  _asst.messages.push({ id: 'm' + Date.now(), role: 'assistant', text: String(text || ''), ts: Date.now(), proposals: [p] });
  _asstSave();
  openAssistant();
  _asstPaint(true);
  return p;
}
/** Keep the sidebar footer button's pressed state in step (the footer is re-drawn by the shell). */
function renderSidebarFooterAssistant() {
  const b = document.querySelector('#sb-foot [data-act="assistant"]');
  if (b) { b.classList.toggle('on', _asst.open); b.setAttribute('aria-pressed', _asst.open ? 'true' : 'false'); }
}
window.Assistant = { open: openAssistant, close: closeAssistant, toggle: toggleAssistant, ready: assistantReady, showProposal: showAssistantProposal };

// Ctrl/Cmd+J toggles the panel from anywhere (also inside text fields).
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'j' || e.key === 'J')) {
    e.preventDefault();
    toggleAssistant();
  }
});

registerMoreItem({ id: 'assistant', label: 'Ask the assistant', icon: 'sparkles', order: 15, kbd: 'Ctrl+J', run: () => openAssistant() });
registerCommand({ id: 'ask-about-task', label: () => {
  const it = state.selectedTaskId && getItem(state.selectedTaskId);
  return it ? `Ask the assistant about “${effTitle(it).slice(0, 40)}”` : 'Ask about this task';
}, icon: 'message-circle', keywords: 'ai claude help this task', group: 'Commands',
when: () => !!(state.selectedTaskId && getItem(state.selectedTaskId)),
run: () => { const it = getItem(state.selectedTaskId); openAssistant({ prefill: it ? `About “${effTitle(it)}”: ` : '' }); } });
