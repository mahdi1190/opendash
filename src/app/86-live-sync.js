/* ============================================================
   LIVE SYNC + THREE-WAY MERGE
   ============================================================
   Server side: server/live-sync.mjs (GET /api/events, Server-Sent Events) and
   server/actions (changes made by the assistant, MCP clients and scripts).

   1. syncMerge3(base, local, remote, opts) - a PURE three-way merge of two
      edited copies of the state against the copy they both started from.
      Field by field: per task (state.custom by id), per note, per map entry
      (statuses, pinned, notes...), tag lists as sets. Only a true same-field
      conflict (both sides changed the same field to different values) is
      reported; everything else merges silently. Tested in
      tests/live-sync-merge.test.mjs (the file is loaded into a VM there, so
      nothing in it may touch the page at load time).
   2. liveSyncStart() - listens to /api/events; when the server's version is
      newer, it adopts it (keeping this tab's view, selection and unsaved
      edits) and shows "Updated by <source>" with an Undo for assistant/MCP
      changes.
   3. liveSyncHandleConflict(payload, key) - called by serverStateWrite
      (04-core-persistence.js) on 409: merges this tab's edits onto the newer
      file, asks the user only about true conflicts, then saves.
   4. liveSyncBootMerge(fromFile) - boot with unsaved edits from last time and
      a newer file: same merge, using the base saved when the tab was hidden.
   No edit is ever dropped silently: a conflict is always shown.
   ============================================================ */

// ---------- 1. the pure merge ----------
function _mStable(v) {
  if (v === undefined) return '~u';
  if (Array.isArray(v)) return '[' + v.map(_mStable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + _mStable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function _mEq(a, b) { return a === b || _mStable(a) === _mStable(b); }
function _mIsObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function _mIsPrim(v) { return v === null || ['string', 'number', 'boolean'].includes(typeof v); }
/** Identity key shared by every element of the arrays ('id', then 'binTs', then 'ts'), or null. */
function _mKeyOf(arrs) {
  for (const k of ['id', 'binTs', 'ts']) {
    const ok = arrs.every(a => a.every(x => _mIsObj(x) && (typeof x[k] === 'string' || typeof x[k] === 'number'))
      && new Set(a.map(x => x[k])).size === a.length);
    if (ok) return k;
  }
  return null;
}
function _mMerge(path, b, l, r, conflicts) {
  if (_mEq(l, r)) return l;
  if (_mEq(l, b)) return r;            // only the other side changed it
  if (_mEq(r, b)) return l;            // only this side changed it
  if (_mIsObj(l) && _mIsObj(r) && (b === undefined || _mIsObj(b))) return _mMergeObj(path, b || {}, l, r, conflicts);
  if (Array.isArray(l) && Array.isArray(r) && (b === undefined || Array.isArray(b))) {
    const bb = b || [];
    if (bb.every(_mIsPrim) && l.every(_mIsPrim) && r.every(_mIsPrim)) return _mMergeSet(bb, l, r);
    const key = _mKeyOf([bb, l, r]);
    if (key) return _mMergeById(path, key, bb, l, r, conflicts);
  }
  conflicts.push({ path, base: b, local: l, remote: r });
  return l;
}
function _mMergeObj(path, b, l, r, conflicts) {
  const out = {};
  const keys = [...Object.keys(l)];
  for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
  for (const k of Object.keys(b)) if (!keys.includes(k)) keys.push(k);
  for (const k of keys) {
    const v = _mMerge(path.concat(k), b[k], l[k], r[k], conflicts);
    if (v !== undefined) out[k] = v;
  }
  return out;
}
/** Lists of plain values (tags, people ids, timestamps) merge as sets. */
function _mMergeSet(b, l, r) {
  const k = (x) => JSON.stringify(x);
  const inB = new Set(b.map(k)), inR = new Set(r.map(k)), inL = new Set(l.map(k));
  const removedRemotely = new Set([...inB].filter(x => !inR.has(x)));
  const out = l.filter(x => !removedRemotely.has(k(x)));
  const seen = new Set(out.map(k));
  for (const x of r) if (!inB.has(k(x)) && !inL.has(k(x)) && !seen.has(k(x))) { out.push(x); seen.add(k(x)); }
  return out;
}
function _mOrder(baseIds, mine, theirs) {
  // If this side kept the base order of the shared items but the other side
  // reordered them, follow the other side; otherwise keep this side's order.
  const inBase = new Set(baseIds);
  const seq = (ids, set) => JSON.stringify(ids.filter(x => set.has(x)));
  const mineSet = new Set(mine), theirSet = new Set(theirs);
  const mineReordered = seq(mine, inBase) !== seq(baseIds, mineSet);
  const theirsReordered = seq(theirs, inBase) !== seq(baseIds, theirSet);
  const followTheirs = !mineReordered && theirsReordered;
  const skeleton = (followTheirs ? theirs : mine).slice();
  const other = followTheirs ? mine : theirs;
  const placed = new Set(skeleton);
  for (let i = 0; i < other.length; i++) {
    const id = other[i];
    if (placed.has(id)) continue;
    let j = i - 1;
    while (j >= 0 && !placed.has(other[j])) j--;
    const at = j < 0 ? 0 : skeleton.indexOf(other[j]) + 1;
    skeleton.splice(at, 0, id);
    placed.add(id);
  }
  return skeleton;
}
function _mMergeById(path, key, b, l, r, conflicts) {
  const bm = new Map(b.map(x => [x[key], x])), lm = new Map(l.map(x => [x[key], x])), rm = new Map(r.map(x => [x[key], x]));
  const ids = _mOrder(b.map(x => x[key]), l.map(x => x[key]), r.map(x => x[key]));
  const out = [];
  for (const id of ids) {
    const bi = bm.get(id), li = lm.get(id), ri = rm.get(id);
    const p = path.concat([{ [key]: id }]);
    let v;
    if (li !== undefined && ri !== undefined) v = _mMerge(p, bi, li, ri, conflicts);
    else if (li !== undefined) {                      // the other side does not have it
      if (bi === undefined) v = li;                   // added here
      else if (_mEq(li, bi)) v = undefined;           // deleted there, untouched here
      else { conflicts.push({ path: p, base: bi, local: li, remote: undefined, kind: 'deleted-remotely' }); v = li; }
    } else if (ri !== undefined) {
      if (bi === undefined) v = ri;                   // added there
      else if (_mEq(ri, bi)) v = undefined;           // deleted here, untouched there
      else { conflicts.push({ path: p, base: bi, local: undefined, remote: ri, kind: 'deleted-locally' }); v = undefined; }
    }
    if (v !== undefined) out.push(v);
  }
  return out;
}

/**
 * Three-way merge. base may be null/undefined (unknown common ancestor: then
 * anything the two sides disagree on is a conflict, and nothing is dropped).
 * opts.skip: Set/array of top-level keys taken from `local` as they are
 * (UI keys, bookkeeping). Conflicts default to the LOCAL value in `merged`.
 * -> { merged, conflicts: [{path, base, local, remote, kind?}] }
 */
function syncMerge3(base, local, remote, opts) {
  const skip = new Set((opts && opts.skip) ? [...opts.skip] : []);
  const conflicts = [];
  const b = base || undefined;
  const merged = {};
  const keys = [...Object.keys(local || {})];
  for (const k of Object.keys(remote || {})) if (!keys.includes(k)) keys.push(k);
  for (const k of keys) {
    if (skip.has(k)) { if (local && k in local) merged[k] = local[k]; continue; }
    const v = _mMerge([k], b ? b[k] : undefined, local ? local[k] : undefined, remote ? remote[k] : undefined, conflicts);
    if (v !== undefined) merged[k] = v;
  }
  return { merged, conflicts };
}

/** Put a conflict's REMOTE value (or 'local') at its path in `merged`. */
function syncResolve(merged, conflict, side) {
  const value = side === 'remote' ? conflict.remote : conflict.local;
  const path = conflict.path;
  let node = merged;
  for (let i = 0; i < path.length - 1; i++) {
    const step = path[i];
    if (step && typeof step === 'object') {
      const k = Object.keys(step)[0];
      node = Array.isArray(node) ? node.find(x => x && x[k] === step[k]) : undefined;
    } else node = node ? node[step] : undefined;
    if (node === undefined || node === null) return false;
  }
  const last = path[path.length - 1];
  if (last && typeof last === 'object') {
    if (!Array.isArray(node)) return false;
    const k = Object.keys(last)[0];
    const at = node.findIndex(x => x && x[k] === last[k]);
    if (value === undefined) { if (at >= 0) node.splice(at, 1); }
    else if (at >= 0) node[at] = value;
    else node.push(value);
  } else if (value === undefined) delete node[last];
  else node[last] = value;
  return true;
}

// ---------- 2-4. the page side (only runs in the browser) ----------
let _liveES = null;
let _liveRetryTimer = null;
let _liveMergeDepth = 0;
const _LIVE_BASE_KEY = 'dashboard-sync-base-v1';

function _liveIsEditing() {
  const a = document.activeElement;
  if (!a || a === document.body) return false;
  return a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
}
function _liveSourceLabel(d) {
  if (!d) return 'outside this tab';
  if (d.source === 'mcp') return d.client ? d.client.replace(/\s+[\d.]+$/, '') : 'an MCP client';
  if (d.source === 'assistant') return 'the assistant';
  if (d.source === 'script') return d.client ? d.client : 'a script';
  if (d.source === 'ui') return 'another tab';
  return 'outside this tab';
}
function _liveToast(msg, opts) {
  if (typeof toast === 'function') return toast(msg, opts || { kind: 'info' });
  showToast(msg, false);
}
/** Human label for a conflict path, e.g. 'Email Sam - due date'. */
function _liveConflictLabel(c, local, remote) {
  const p = c.path;
  const field = (f) => ({ dueDate: 'due date', detail: 'description', stream: 'stream', priority: 'priority', title: 'title', tags: 'tags', people: 'people', subtasks: 'subtasks', recurrence: 'repeat' }[f] || f);
  const taskTitle = (id) => {
    for (const s of [local, remote]) { const t = s && Array.isArray(s.custom) && s.custom.find(x => x && x.id === id); if (t) return t.title; }
    return 'a task';
  };
  if (p[0] === 'custom' && p[1] && typeof p[1] === 'object') {
    const id = p[1].id;
    if (p.length === 2) return `${taskTitle(id)} (${c.kind === 'deleted-locally' ? 'you deleted it, it was edited elsewhere' : c.kind === 'deleted-remotely' ? 'deleted elsewhere, you edited it' : 'whole task'})`;
    return `${taskTitle(id)} - ${field(p[2])}`;
  }
  if (['statuses', 'pinned', 'notes', 'completionLog'].includes(p[0]) && typeof p[1] === 'string') return `${taskTitle(p[1])} - ${p[0] === 'statuses' ? 'status' : p[0]}`;
  if (p[0] === 'people' && p[1] && typeof p[1] === 'object') {
    const pid = p[1].id;
    const who = [local, remote].map(s => s && Array.isArray(s.people) && s.people.find(x => x && x.id === pid)).find(Boolean);
    return `${who ? who.name : 'a person'}${p[2] ? ' - ' + p[2] : ''}`;
  }
  if (p[0] === 'countdowns') return 'countdowns';
  return p.map(x => (x && typeof x === 'object' ? Object.values(x)[0] : x)).join(' / ');
}
function _liveShow(v) {
  if (v === undefined) return '(deleted)';
  if (v === null || v === '') return '(empty)';
  if (Array.isArray(v)) return v.every(_mIsPrim) ? (v.join(', ') || '(none)') : `${v.length} item(s)`;
  if (typeof v === 'object') return v.title || v.name || v.label || v.text || '(changed)';
  return String(v);
}

/** Replace this tab's DATA with `merged` (keeps view, selection, caches); take the server's version. */
function _liveApply(merged, remoteVersion) {
  for (const k of Object.keys(state)) if (!_NON_DATA_KEYS.has(k) && !_NOT_PERSISTED.includes(k)) delete state[k];
  for (const k of Object.keys(merged)) if (!_NON_DATA_KEYS.has(k) && !_NOT_PERSISTED.includes(k)) state[k] = merged[k];
  state._lastSave = Number(remoteVersion) || state._lastSave;
  ensureStateDefaults(state);
  if (state.selectedTaskId && !getItem(state.selectedTaskId)) state.selectedTaskId = null;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  resetUndoHistory();
}
function _liveRender() {
  if (_liveIsEditing()) {
    // Do not pull the text field out from under the user: re-render once they leave it.
    const a = document.activeElement;
    const once = () => { a.removeEventListener('blur', once); setTimeout(() => { if (!_liveIsEditing()) render(); }, 0); };
    a.addEventListener('blur', once);
    return;
  }
  render();
}

/** Ask about true conflicts. Resolves when the user has chosen (closing = keep mine). */
function _liveAskConflicts(conflicts, merged, local, remote, who) {
  return new Promise((resolve) => {
    const choice = conflicts.map(() => 'local');
    const build = (el) => {
      const p = document.createElement('p'); p.className = 'muted live-merge-intro';
      p.textContent = `These were changed both here and ${who === 'outside this tab' ? 'elsewhere' : 'by ' + who} at the same time. Everything else was merged. Choose which version to keep:`;
      el.appendChild(p);
      const list = document.createElement('div'); list.className = 'live-merge-list';
      conflicts.slice(0, 40).forEach((c, i) => {
        const row = document.createElement('div'); row.className = 'live-merge-row';
        const lab = document.createElement('div'); lab.className = 'live-merge-label'; lab.textContent = _liveConflictLabel(c, local, remote);
        row.appendChild(lab);
        for (const side of ['local', 'remote']) {
          const opt = document.createElement('label'); opt.className = 'live-merge-opt';
          const r = document.createElement('input'); r.type = 'radio'; r.name = 'live-merge-' + i; r.checked = side === 'local';
          r.onchange = () => { choice[i] = side; };
          const t = document.createElement('span');
          t.textContent = (side === 'local' ? 'Mine: ' : 'Theirs: ') + _liveShow(side === 'local' ? c.local : c.remote);
          opt.append(r, t); row.appendChild(opt);
        }
        list.appendChild(row);
      });
      el.appendChild(list);
      if (conflicts.length > 40) { const more = document.createElement('p'); more.className = 'muted'; more.textContent = `${conflicts.length - 40} more keep your version.`; el.appendChild(more); }
    };
    const finish = () => {
      conflicts.forEach((c, i) => { if (choice[i] === 'remote') syncResolve(merged, c, 'remote'); });
      resolve(merged);
    };
    if (typeof openDialog === 'function') {
      let done = false;
      openDialog({
        title: 'Changes made in two places', width: 560, body: build,
        actions: [
          { label: 'Keep all mine', run: () => { done = true; choice.fill('local'); finish(); } },
          { label: 'Save choices', primary: true, run: () => { done = true; finish(); } },
        ],
        onClose: () => { if (!done) { done = true; finish(); } },
      });
    } else {
      showModal('<h3>Changes made in two places</h3><div id="live-merge-body"></div><div class="modal-actions"><button class="btn primary" id="live-merge-ok">Save choices</button></div>', (card) => {
        build(card.querySelector('#live-merge-body'));
        card.querySelector('#live-merge-ok').onclick = () => { closeModal(); finish(); };
      });
    }
  });
}

/**
 * Merge this tab's unsaved edits onto `remote` (the newer file) using `baseKey`
 * (the persist key of what this tab last loaded/saved). Returns true when the
 * tab is now consistent (a save is scheduled if anything of ours remains).
 */
async function _liveReconcile(remote, baseKey, info) {
  let base = null;
  try { base = baseKey ? JSON.parse(baseKey) : null; } catch (e) { base = null; }
  const local = _stateForPersist();
  const res = syncMerge3(base, local, remote, { skip: _NON_DATA_KEYS });
  let merged = res.merged;
  const who = _liveSourceLabel(info);
  if (res.conflicts.length) {
    _liveApply(merged, remote._lastSave);          // show the merge (mine on conflicts) while asking
    _liveRender();
    merged = await _liveAskConflicts(res.conflicts, _stateForPersist(), local, remote, who);
  }
  const before = _liveDataKey(state);
  _liveApply(merged, remote._lastSave);
  // Only DATA counts: every tab has its own view/selection (UI keys), and
  // re-saving just those after each sync would make two tabs ping-pong.
  const after = _liveDataKey(state);
  const ours = after !== _liveDataKey(remote);
  state._localDirty = ours;
  _liveRender();
  return { ours, conflicts: res.conflicts.length, changed: before !== after };
}
/** The data part of a state object as a comparable string (UI keys, caches and versions left out). */
function _liveDataKey(s) {
  const o = {};
  for (const k of Object.keys(s || {})) if (!_NON_DATA_KEYS.has(k) && !_NOT_PERSISTED.includes(k)) o[k] = s[k];
  return _mStable(o);
}

/** 409 from PUT /api/state: merge instead of throwing this tab's edits away. */
async function liveSyncHandleConflict(payload, key) {
  if (_liveMergeDepth > 4) {
    showToast('Could not save: the dashboard keeps changing elsewhere. Retrying shortly.', true);
    _liveMergeDepth = 0;
    schedulePersist(5000);
    return false;
  }
  const baseKey = _lastPersistedKey;              // before serverStateLoad replaces it
  const remote = await serverStateLoad();
  if (!remote) return false;
  if (_persistKey(remote) === key) {              // the file already holds exactly this
    state._lastSave = Number(remote._lastSave) || state._lastSave;
    state._localDirty = false;
    return true;
  }
  _liveMergeDepth++;
  try {
    const r = await _liveReconcile(remote, baseKey, { source: 'external' });
    if (r.ours) schedulePersist(50);              // our edits on top of theirs
    else _liveMergeDepth = 0;
    if (r.conflicts || r.changed) _liveToast(r.conflicts ? 'Saved your choices with the newer changes' : 'Merged with changes made elsewhere', { kind: 'info' });
    return true;
  } finally {
    setTimeout(() => { _liveMergeDepth = Math.max(0, _liveMergeDepth - 1); }, 3000);
  }
}

/** A newer version was announced over SSE. */
async function _liveOnRemote(d) {
  if (!d || !(Number(d.version) > (Number(state._lastSave) || 0))) return;
  if (_persistInFlight) { clearTimeout(_liveRetryTimer); _liveRetryTimer = setTimeout(() => _liveOnRemote(d), 400); return; }
  if (state._localDirty || _persistTimer) { _persistFire(); return; }   // the save meets a 409 and merges
  const baseKey = _lastPersistedKey;
  const remote = await serverStateLoad();
  if (!remote || !((Number(remote._lastSave) || 0) > (Number(state._lastSave) || 0))) return;
  const r = await _liveReconcile(remote, baseKey, d);
  if (r.ours) schedulePersist(50);
  if (!r.changed) return;                          // only another tab's view/selection moved
  // This tab's own assistant Apply/Undo: its card already says so (72-assistant.js).
  if (d.client === 'dashboard assistant' && typeof _asstOwnWrites === 'number' && _asstOwnWrites > 0) return;
  const msg = `Updated by ${_liveSourceLabel(d)}${d.summary ? ': ' + d.summary : ''}`;
  const canUndo = d.undo && (d.source === 'mcp' || d.source === 'assistant' || d.source === 'script');
  _liveToast(msg.length > 140 ? msg.slice(0, 139) + '...' : msg, {
    kind: 'info', icon: 'refresh-cw', timeout: 6000,
    ...(canUndo ? { action: { label: 'Undo', run: () => liveSyncUndo(d.undo) } } : {}),
  });
}

/** Undo an assistant/MCP change from its toast. */
async function liveSyncUndo(token) {
  try {
    const r = await fetch('/api/actions/undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, source: 'ui', client: 'dashboard' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error((j.error && j.error.message) || ('undo failed (' + r.status + ')'));
    _liveToast('Undone', { kind: 'ok' });
  } catch (e) {
    _liveToast(String(e.message || e), { kind: 'err' });
  }
}

/** Open the event stream (once the server is known to be there). */
function liveSyncStart() {
  if (_liveES && _liveES.readyState === 2) { try { _liveES.close(); } catch (e) {} _liveES = null; }   // gave up (e.g. after a restart): open a new one
  if (_liveES || !_serverAvailable || typeof EventSource === 'undefined') return;
  // Headless browsers (screenshots, tests) wait for every open request before
  // they finish, and an event stream never ends: no live sync there.
  if (/HeadlessChrome|PhantomJS/.test(navigator.userAgent || '') || navigator.webdriver) return;
  try { _liveES = new EventSource('/api/events'); } catch (e) { _liveES = null; return; }
  // The stream dropping is the first sign the server went away; it reconnects
  // by itself, and 86-offline-banner.js checks health and shows the banner.
  _liveES.addEventListener('open', () => { if (typeof srvConnectionOk === 'function') srvConnectionOk(); });
  _liveES.addEventListener('error', () => { if (typeof srvConnectionLost === 'function') srvConnectionLost('events'); });
  const on = (ev) => { let d = null; try { d = JSON.parse(ev.data); } catch (e) { return; } _liveOnRemote(d); };
  _liveES.addEventListener('state', on);
  // A change written to Google Calendar from another tab or tool (44-calendar-write.js).
  _liveES.addEventListener('calendar', (ev) => { let d = null; try { d = JSON.parse(ev.data); } catch (e) { return; } if (typeof calwOnRemote === 'function') calwOnRemote(d); });
  // Another tab told the server the computer's zone changed: read our own now (07-core-clock.js).
  _liveES.addEventListener('time', () => { if (typeof Clock !== 'undefined') Clock.check(); });
  // After a reconnect the hello carries the current version: catch up on anything missed.
  _liveES.addEventListener('hello', (ev) => { let d = null; try { d = JSON.parse(ev.data); } catch (e) { return; } if (d && d.version) _liveOnRemote({ version: d.version, source: 'external' }); });
}

/** Boot: unsaved edits from last time + a newer file. True if merged. */
function liveSyncBootMerge(fromFile) {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(_LIVE_BASE_KEY) || 'null'); } catch (e) { saved = null; }
  try { localStorage.removeItem(_LIVE_BASE_KEY); } catch (e) {}
  if (!saved || !saved.key || Number(saved.version) !== (Number(state._lastSave) || 0)) return false;
  _liveReconcile(fromFile, saved.key, { source: 'external' }).then((r) => {
    if (r.ours) schedulePersist(50);
    _liveToast('Your unsaved changes from last time were merged with newer ones', { kind: 'info' });
  });
  return true;
}

/** Keep the common base when leaving with unsaved edits, so the next boot can merge. */
function _liveRememberBase() {
  if (!(state && (state._localDirty || _persistTimer)) || !_lastPersistedKey) return;
  try { localStorage.setItem(_LIVE_BASE_KEY, JSON.stringify({ version: state._lastSave || 0, key: _lastPersistedKey })); } catch (e) { /* quota: the merge falls back to keeping both */ }
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('pagehide', _liveRememberBase);
  document.addEventListener('visibilitychange', () => { if (document.hidden) _liveRememberBase(); });
}
