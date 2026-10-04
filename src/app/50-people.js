/* ============================================================
   PEOPLE - the model on the page (owner: People).
   The matching rules are pure functions in 52-people-link.js (shared with
   Node through lib/people-tags.mjs: the actions layer, MCP and migrations
   link people exactly like this file).

   Person shape (state.people[]):
     {id, name, kind:'person'|'org'|'mailbox', role, org, group,
      emails:[...], email (= emails[0], for older readers), aliases:[...],
      streams:[streamId], phone, linkedin, avatarUrl, color,
      notes:[{id, ts, text}], pinned, inactive, self (the user: never shown,
      never matched), stub (made for a dangling link; fill it in)}
   Task fields: task.people [ids], task.peopleExcluded [ids the user
   unlinked: tags, mentions and the backfill never bring them back].
   Data keys: state.peopleAutoLink (default on), state.peopleIgnoredNames.

   API used by other areas:
     getPerson(id), effPeople(item) (linked ids), tasksForPerson(id, {open}),
     openTaskCountFor(id), addPersonToTask / removePersonFromTask (remembers
     the removal), avatarHtml(person, size), pplIndex() (cached index),
     pplAutoLinkOnCreate(item) (quick add calls it), createPerson(fields),
     updatePersonFields(id, patch), mergePeople(from, into), deletePersonById(id),
     addPersonNote(id, text), linkSuggestedPeople(list)
   ============================================================ */
function getPerson(id) { return (state.people || []).find(p => p && p.id === id); }

// The index is rebuilt only when the people list changes (one signature per call is cheap).
let _pplIdxCache = { sig: null, idx: null };
function _pplSig() {
  const list = Array.isArray(state.people) ? state.people : [];
  let s = String(list.length);
  for (const p of list) if (p) s += '|' + p.id + '\u0001' + (p.name || '') + '\u0001' + (p.kind || '') + '\u0001' + (p.self ? 1 : 0)
    + '\u0001' + (Array.isArray(p.aliases) ? p.aliases.join(',') : '') + '\u0001' + (Array.isArray(p.emails) ? p.emails.join(',') : (p.email || ''));
  return s;
}
function pplIndex() {
  const sig = _pplSig();
  if (_pplIdxCache.sig !== sig) _pplIdxCache = { sig, idx: pplBuildIndex(state.people) };
  return _pplIdxCache.idx;
}
/** People linked to a task (ids): explicit + named by a tag - unlinked. */
function effPeople(item) { return item ? pplLinked(state, item, pplIndex()) : []; }
/** Tasks linked to a person. opts.open: only open ones (the default for counts). */
function tasksForPerson(personId, opts) {
  const idx = pplIndex();                  // once per call, not once per task (the sidebar asks for every person)
  const all = getAllItems().filter(i => pplLinked(state, i, idx).includes(personId));
  return opts && opts.open ? all.filter(i => statusOf(i.id) !== 'done') : all;
}
function openTaskCountFor(personId) { return tasksForPerson(personId, { open: true }).length; }

function setTaskPeople(taskId, people) { setOverride(taskId, 'people', people); }
function addPersonToTask(taskId, personId) {
  const item = getItem(taskId); if (!item) return;
  const cur = item.people ?? [];
  const excl = Array.isArray(item.peopleExcluded) ? item.peopleExcluded : [];
  if (excl.includes(personId)) { item.peopleExcluded = excl.filter(x => x !== personId); if (!item.peopleExcluded.length) delete item.peopleExcluded; }
  if (cur.includes(personId)) { saveData(); render(); return; }
  setTaskPeople(taskId, [...cur, personId]);
  render();
}
/** Unlink (also a person linked through a tag); remembered so it sticks. */
function removePersonFromTask(taskId, personId) {
  const item = getItem(taskId); if (!item) return;
  const excl = Array.isArray(item.peopleExcluded) ? item.peopleExcluded : [];
  if (!excl.includes(personId)) item.peopleExcluded = [...excl, personId];
  const cur = item.people ?? [];
  setTaskPeople(taskId, cur.filter(id => id !== personId));
  render();
}

/** New tasks link the people their title/subtasks name (Settings: state.peopleAutoLink). Mutates item; returns ids added. */
function pplAutoLinkOnCreate(item) {
  if (!item || state.peopleAutoLink === false) return [];
  try { return pplAutoLink(state, item, pplIndex()); } catch (e) { console.error('[people] auto-link', e); return []; }
}

/* ---------- avatars ---------- */
// An <img> only for http(s) URLs; if it fails to load, the error listener
// below swaps in the initials (no inline onerror strings).
function _pplAvClass(sz) { return [16, 24, 28, 32, 40, 56].includes(sz) ? 'avatar-' + sz : ''; }
// A colour that is one of the design swatches (by name, or the light theme's
// hex) uses the theme's swatch variable, so avatars follow light/dark like the mockups.
const _PPL_SWATCH_HEX = { '#5b5bd6': 'indigo', '#0b84e8': 'blue', '#12a594': 'teal', '#3f9f52': 'green', '#f0a000': 'amber', '#f76b15': 'orange', '#e5484d': 'red', '#d6409f': 'pink', '#8e4ec6': 'violet', '#868a94': 'slate' };
const _PPL_SWATCHES = new Set(Object.values(_PPL_SWATCH_HEX));
function pplAvatarColor(c) {
  const v = String(c == null ? '' : c).trim().toLowerCase();
  const sw = _PPL_SWATCHES.has(v) ? v : _PPL_SWATCH_HEX[v];
  return sw ? 'var(--sw-' + sw + ')' : safeColor(c, 'var(--sw-slate)');
}
function avatarHtml(person, size) {
  const sz = Number(size) || 32;
  const p = person || { name: '?' };
  // A picture set on their card (54-people-card.js: uploaded, or Gravatar when the user opted in) comes first.
  const url = (typeof pcPhotoUrl === 'function' && pcPhotoUrl(p.photo)) || safeUrl(p.avatarUrl);
  const cls = 'avatar ' + _pplAvClass(sz) + (p.stub ? ' unknown' : '');
  const st = `--c:${escAttr(pplAvatarColor(p.color))};--size:${sz}px`;
  if (url) return `<span class="${cls}" style="${st}" title="${escAttr(p.name)}"${p.id && !p.stub && typeof czAttrs === 'function' ? czAttrs('person', p.id) : ''}><img src="${escAttr(url)}" alt="" data-avatar-fallback="${escAttr(p.id || '')}" data-avatar-size="${sz}"></span>`;
  return avatarHtmlInitials(p, sz);
}
function avatarHtmlInitials(person, sz) {
  sz = Number(sz) || 32;
  const p = person || { name: '?' };
  const kindIcon = p.kind === 'org' ? 'building-2' : p.kind === 'mailbox' ? 'inbox' : '';
  // A symbol or emoji chosen for them (right-click > Colour & symbol) replaces the initials.
  const sym = typeof czMarkParts === 'function' ? czMarkParts({ icon: p.icon }) : { iconKind: '' };
  const inner = sym.iconKind === 'icon' ? icon(sym.icon) : sym.iconKind === 'emoji' ? `<span class="av-e">${esc(sym.icon)}</span>`
    : kindIcon ? icon(kindIcon) : esc(avatarInitials(p.name || '?'));
  // Right-click any avatar for the person's menu (28-customise.js).
  const cz = p.id && !p.stub && typeof czAttrs === 'function' ? czAttrs('person', p.id) : '';
  return `<span class="avatar ${_pplAvClass(sz)}${p.stub ? ' unknown' : ''}${sym.iconKind === 'emoji' ? ' av-emoji' : ''}" style="--c:${escAttr(pplAvatarColor(p.color))};--size:${sz}px" title="${escAttr(p.name || '')}"${cz}>${inner}</span>`;
}
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG' || !img.dataset || !img.dataset.avatarFallback) return;
  const p = getPerson(img.dataset.avatarFallback) || { name: '?' };
  const host = img.closest('.avatar');
  const tmp = document.createElement('div');
  tmp.innerHTML = avatarHtmlInitials(p, Number(img.dataset.avatarSize) || 32);
  if (host && tmp.firstChild && host.parentNode) host.parentNode.replaceChild(tmp.firstChild, host);
}, true);

/* ---------- people records ---------- */
const PPL_COLORS = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#ea580c', '#db2777', '#dc2626', '#0d9488', '#475569'];
function _pplList() { if (!Array.isArray(state.people)) state.people = []; return state.people; }
function _pplCleanList(v, lower) {
  const arr = Array.isArray(v) ? v : String(v || '').split(/[,;\n]/);
  const out = [];
  for (const x of arr) { let s = String(x || '').trim(); if (lower) s = s.toLowerCase(); if (s && !out.includes(s)) out.push(s); }
  return out;
}
function _pplNewId(name) {
  const taken = new Set(_pplList().map(p => p.id));
  const words = String(name || '').replace(/\([^)]*\)/g, ' ').trim().split(/\s+/);
  const slug = (s) => pplFold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const first = slug(words[0] || '') || 'person';
  if (!taken.has(first)) return first;
  const full = slug(words.join(' '));
  if (full && !taken.has(full)) return full;
  for (let n = 2; ; n++) if (!taken.has(first + '-' + n)) return first + '-' + n;
}
const _PPL_EMAIL_RE = /^[^\s@<>"',;:()]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;
/** Apply form fields to a person (validates emails). Returns an error message or ''. */
function _pplApply(p, f) {
  if (f.name !== undefined) { const n = String(f.name || '').trim().slice(0, 100); if (!n) return 'A name is needed.'; p.name = n; }
  for (const k of ['role', 'org', 'group', 'phone', 'linkedin', 'avatarUrl']) {
    if (f[k] === undefined) continue;
    const v = String(f[k] || '').trim().slice(0, k === 'linkedin' || k === 'avatarUrl' ? 500 : 200);
    if (v) p[k] = v; else delete p[k];
  }
  if (f.kind !== undefined) p.kind = ['person', 'org', 'mailbox'].includes(f.kind) ? f.kind : 'person';
  if (f.emails !== undefined) {
    const list = _pplCleanList(f.emails, true);
    const bad = list.find(e => !_PPL_EMAIL_RE.test(e));
    if (bad) return `“${bad}” is not an email address.`;
    p.emails = list; p.email = list[0] || '';
  }
  if (f.aliases !== undefined) p.aliases = _pplCleanList(f.aliases, true).map(a => a.slice(0, 60));
  if (f.streams !== undefined) p.streams = _pplCleanList(f.streams, false).filter(s => STREAMS[s]);
  if (f.color !== undefined && safeColor(f.color, '') ) p.color = f.color;
  for (const k of ['inactive', 'pinned']) if (f[k] !== undefined) { if (f[k]) p[k] = true; else delete p[k]; }
  if (f.tz !== undefined) {   // their IANA time zone (travel spec 5.2); '' removes it
    const z = typeof trPersonTzCheck === 'function' ? trPersonTzCheck(f.tz) : { ok: true, zone: String(f.tz || '').trim() };
    if (!z.ok) return z.message;
    if (z.zone) p.tz = z.zone; else delete p.tz;
  }
  if (p.stub && f.name !== undefined) delete p.stub;
  return '';
}
/** Create a person. Returns {id} or {error}. */
function createPerson(fields) {
  const f = fields || {};
  const name = String(f.name || '').trim();
  if (!name) return { error: 'A name is needed.' };
  const id = f.id && !getPerson(f.id) ? String(f.id) : _pplNewId(name);
  const p = { id, name, kind: 'person', email: '', emails: [], aliases: [], streams: [], color: PPL_COLORS[_pplList().length % PPL_COLORS.length], createdAt: Date.now() };
  const err = _pplApply(p, f);
  if (err) return { error: err };
  _pplList().push(p);
  saveData();
  return { id };
}
/** Update fields. Returns '' or an error message. */
function updatePersonFields(id, patch) {
  const p = getPerson(id); if (!p) return 'Person not found.';
  const copy = JSON.parse(JSON.stringify(p));
  const err = _pplApply(copy, patch || {});
  if (err) return err;
  Object.keys(p).forEach(k => delete p[k]);
  Object.assign(p, copy);
  saveData();
  return '';
}
/** Old API (single field). */
function updatePerson(id, field, value) { return updatePersonFields(id, { [field]: value }); }
/** Fold one person into another: links, aliases, emails, streams, notes. Returns the number of tasks relinked. */
function mergePeople(fromId, intoId) {
  const a = getPerson(fromId), b = getPerson(intoId);
  if (!a || !b || a.id === b.id || a.self) return 0;
  const emails = pplPersonEmails(b);
  for (const e of pplPersonEmails(a)) if (!emails.includes(e)) emails.push(e);
  b.emails = emails; b.email = emails[0] || '';
  const aliases = Array.isArray(b.aliases) ? b.aliases.slice() : [];
  for (const x of [...(a.aliases || []), pplFold(a.name), a.id]) { const v = String(x || '').toLowerCase(); if (v && v !== pplFold(b.name) && v !== b.id && !aliases.includes(v)) aliases.push(v); }
  b.aliases = aliases;
  b.streams = [...new Set([...(b.streams || []), ...(a.streams || [])])];
  const notes = [...(Array.isArray(b.notes) ? b.notes : []), ...(Array.isArray(a.notes) ? a.notes : [])].sort((x, y) => (y.ts || 0) - (x.ts || 0));
  if (notes.length) b.notes = notes;
  for (const k of ['role', 'org', 'group', 'phone', 'linkedin', 'avatarUrl', 'photo', 'cover']) if (!b[k] && a[k]) b[k] = a[k];
  delete b.stub;
  let moved = 0;
  const fix = (t) => {
    let hit = false;
    for (const key of ['people', 'peopleExcluded']) {
      if (!Array.isArray(t[key]) || !t[key].includes(a.id)) continue;
      t[key] = [...new Set(t[key].map(x => (x === a.id ? b.id : x)))];
      hit = true;
    }
    return hit;
  };
  for (const t of state.custom || []) if (t && fix(t)) { moved++; logActivity(t.id, 'people', { text: `${a.name} merged into ${b.name}` }); }
  for (const bt of (state.bin && state.bin.tasks) || []) if (bt && bt.customData) fix(bt.customData);
  state.people = _pplList().filter(p => p.id !== a.id);
  saveData();
  return moved;
}
function deletePersonById(id) {
  const p = getPerson(id); if (!p || p.self) return 0;
  let n = 0;
  for (const t of state.custom || []) {
    if (!t) continue;
    if (Array.isArray(t.people) && t.people.includes(id)) { t.people = t.people.filter(x => x !== id); n++; logActivity(t.id, 'people', { text: `Unlinked ${p.name} (person deleted)` }); }
    if (Array.isArray(t.peopleExcluded) && t.peopleExcluded.includes(id)) { t.peopleExcluded = t.peopleExcluded.filter(x => x !== id); if (!t.peopleExcluded.length) delete t.peopleExcluded; }
  }
  state.people = _pplList().filter(x => x.id !== id);
  saveData();
  return n;
}
function addPersonNote(id, text) {
  const p = getPerson(id); const t = String(text || '').trim();
  if (!p || !t) return null;
  const n = { id: 'pn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), ts: Date.now(), text: t.slice(0, 4000) };
  p.notes = [n, ...(Array.isArray(p.notes) ? p.notes : [])];
  saveData();
  return n.id;
}
function deletePersonNote(id, noteId) {
  const p = getPerson(id); if (!p || !Array.isArray(p.notes)) return;
  p.notes = p.notes.filter(n => n.id !== noteId);
  if (!p.notes.length) delete p.notes;
  saveData();
}
/** Accept link suggestions [{taskId, personId}] in one undo step. Returns how many were linked. */
function linkSuggestedPeople(list) {
  let n = 0;
  for (const x of list || []) {
    const t = getItem(x.taskId); const p = getPerson(x.personId);
    if (!t || !p) continue;
    const cur = Array.isArray(t.people) ? t.people : [];
    if (cur.includes(p.id)) continue;
    t.people = [...cur, p.id];
    if (Array.isArray(t.peopleExcluded)) { t.peopleExcluded = t.peopleExcluded.filter(q => q !== p.id); if (!t.peopleExcluded.length) delete t.peopleExcluded; }
    logActivity(t.id, 'people', { text: `Linked ${p.name} (named in the ${x.where || 'task'})` });
    n++;
  }
  if (n) saveData();
  return n;
}

/* ---------- old entry points (kept for other modules) ---------- */
function addNewPerson(prefill) { if (typeof openPersonEditor === 'function') openPersonEditor(null, prefill); }
function deletePerson(id) { if (typeof pplConfirmDelete === 'function') pplConfirmDelete(id); }
function renderPersonView(personId, container) { if (typeof renderPeoplePage === 'function') renderPeoplePage(container, personId); }

/* ---------- recent email (Gmail snapshot via /api/inbox/person) ---------- */
// Per-session cache: {[personId]: {ts, messages, err}} (not saved).
const _pplMail = {};
async function fetchPersonEmails(personId, force) {
  const p = getPerson(personId);
  if (!p) return [];
  const emails = pplPersonEmails(p);
  if (!emails.length) return [];
  const cached = _pplMail[personId];
  if (!force && cached && Date.now() - cached.ts < 10 * 60 * 1000) return cached.messages;
  if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) return [];
  try {
    const qs = emails.slice(0, 10).map(e => 'email=' + encodeURIComponent(e)).join('&');
    const r = await fetch('/api/inbox/person?' + qs, { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'request failed');
    _pplMail[personId] = { ts: Date.now(), messages: Array.isArray(d.messages) ? d.messages : [], err: null };
  } catch (e) {
    _pplMail[personId] = { ts: Date.now(), messages: [], err: (e && e.message) || String(e) };
  }
  return _pplMail[personId].messages;
}

/* ---------- AI linking (optional extra; the deterministic suggestions come first) ---------- */
async function aiAutoLinkPeople() {
  if (typeof openLinkSuggestions === 'function') { openLinkSuggestions(); return; }
}
