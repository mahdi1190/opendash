/* ============================================================
   FILES & LINKS (owner: Files & links)
   Folders, files, links, GitHub, Google Drive and code snippets attached to
   tasks, streams (the "tabs"), people and sections. The model is the pure
   62-resources-logic.js (rsrc*), shared with Node; the data is
   state.resources (saveData). MCP / assistant: create_resource, link_resource,
   list_resources ... (server/actions/ops-resources.mjs).

     resBlock({type, id}, {compact})   the "Files & links" block (task detail, person panel, stream page)
     resFocusChips(taskId)             chips for Home's Focus cards (trusted markup, data-act="res")
     resPrimary(id)                    the row's main action: Explore a folder, open a file / link, show a snippet
     openAttachDialog({links})         paste anything / Browse / snippet
     openExplorePanel(id, {sub, link}) the in-app Explore panel for a folder resource
     #view=files                       the global Files & links view (Tasks sidebar)

   Opening, revealing and listing go through /api/resources/* with the id of
   a SAVED resource only; links open in the browser. Text from paths, URLs,
   labels, notes and snippets is escaped (esc / textContent) everywhere.
   ============================================================ */

const _RES_NOUN = { folder: 'folder', file: 'file', url: 'link', github: 'GitHub link', drive: 'Drive link', snippet: 'snippet' };
const _RES_LINK_NOUN = { task: 'task', stream: 'stream', person: 'person', section: 'page' };
let _resStatus = {};                 // id -> {exists, dir, size, mtime, at}
let _resStatusWant = new Set();
let _resStatusTimer = null;
let _resIntegrations = null, _resIntegrationsAt = 0, _resIntegrationsP = null;
let _resGh = {};                     // id -> {loading, error, data}
let _resOpenSnippets = new Set();    // snippet ids shown expanded
let _resFilesQuery = '', _resFilesKind = '';

/* ---------- data ---------- */
function resList() { if (!Array.isArray(state.resources)) state.resources = []; return state.resources; }
function resGet(id) { return resList().find(r => r && r.id === id) || null; }
function resFor(type, id) { return rsrcFor(resList(), type, id); }
function _resLinkLabel(l) {
  if (!l) return '';
  if (l.type === 'task') { const t = getItem(l.id); return t ? effTitle(t) : 'Missing task'; }
  if (l.type === 'stream') return (STREAMS[l.id] && STREAMS[l.id].label) || l.id;
  if (l.type === 'person') { const p = getPerson(l.id); return p ? p.name : l.id; }
  const sec = typeof sectionFor === 'function' ? sectionFor(l.id) : null;
  return sec ? String(sec.title(l.id) || l.id) : l.id;
}
function _resLinkView(l) {
  if (l.type === 'stream') return 'stream:' + l.id;
  if (l.type === 'person') return 'person:' + l.id;
  if (l.type === 'section') return l.id;
  return null;
}
/** The link that "this place" means for the current view (palette Attach…). */
function resContextLink() {
  if (state.selectedTaskId && getItem(state.selectedTaskId)) return { type: 'task', id: state.selectedTaskId };
  const v = String(state.view || '');
  if (v.startsWith('stream:')) return { type: 'stream', id: v.slice(7) };
  if (v.startsWith('person:')) return { type: 'person', id: v.slice(7) };
  return null;
}

/**
 * Add (or re-attach) resources from detected items. items: [{kind, target, label, lang?}]
 * Returns {added, linked} counts. One undo step.
 */
function resAddItems(items, links) {
  const list = resList();
  let added = 0, linked = 0;
  const touched = [];
  const ls = (links || []).filter(Boolean).map(l => ({ type: l.type, id: l.id }));
  for (const it of items) {
    let r;
    try { r = rsrcNormalize({ ...it, links: ls }); } catch (e) { toast(e.message || 'That cannot be attached', { kind: 'err' }); continue; }
    const same = rsrcFindSame(list, r.kind, r.target);
    if (same) {
      same.links = Array.isArray(same.links) ? same.links : [];
      for (const l of ls) if (!same.links.some(x => x.type === l.type && x.id === l.id)) { same.links.push(l); linked++; }
      touched.push(same.id);
      continue;
    }
    while (list.some(x => x.id === r.id)) r.id += 'x';
    list.push(r); added++; touched.push(r.id);
  }
  if (added || linked) {
    saveData();
    render();
    const n = added + linked;
    toast(n === 1 ? (added ? 'Attached' : 'Attached (it was already saved)') : `Attached ${n}`, { kind: 'ok', icon: 'paperclip', action: { label: 'Undo', run: () => undo() } });
    resRefreshStatus(touched, true);
  } else if (touched.length) toast('Already attached here', { icon: 'paperclip' });
  return { added, linked, ids: touched };
}
function resUpdate(id, patch) {
  const r = resGet(id);
  if (!r) return;
  Object.assign(r, patch);
  for (const k of Object.keys(patch)) if (patch[k] === undefined || patch[k] === '') delete r[k];
  saveData(); render();
}
function resDetach(id, link) {
  const r = resGet(id);
  if (!r || !link) return;
  r.links = (r.links || []).filter(l => !(l.type === link.type && l.id === link.id));
  saveData(); render();
  toast(`Detached from this ${_RES_LINK_NOUN[link.type] || 'item'}`, { icon: 'paperclip', action: { label: 'Undo', run: () => undo() } });
}
function resRemove(id) {
  const list = resList();
  const i = list.findIndex(r => r.id === id);
  if (i < 0) return;
  const r = list[i];
  list.splice(i, 1);
  saveData(); render();
  toast(r.kind === 'snippet' ? 'Snippet removed' : 'Removed from the dashboard (the original is untouched)', { icon: 'trash-2', action: { label: 'Undo', run: () => undo() } });
}

/* ---------- server ---------- */
async function _resApi(path, body, method) {
  const r = await fetch(path, method === 'GET' ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok) { const e = new Error((j && j.error) || `The dashboard answered ${r.status}`); e.code = j && j.code; e.status = r.status; throw e; }
  return j;
}
/** The server reads the SAVED state: write pending edits first so a new resource is known there. */
async function _resEnsureSaved() {
  try {
    if (typeof _persistFire === 'function' && typeof _persistTimer !== 'undefined' && (_persistTimer || _persistInFlight)) {
      await _persistFire();
      if (_persistInFlight) await new Promise(res => setTimeout(res, 500));
    }
  } catch (e) { /* the call below reports any problem */ }
}
async function _resServer(path, body, method) {
  try { return await _resApi(path, body, method); }
  catch (e) {
    if (e.code !== 'UNKNOWN_ID') throw e;
    await _resEnsureSaved();
    if (typeof _persistFire === 'function') { try { await _persistFire(); } catch (x) {} }
    return _resApi(path, body, method);
  }
}
function resRefreshStatus(ids, force) {
  for (const id of ids || []) {
    const r = resGet(id);
    if (!r || !RSRC_PATH_KINDS.includes(r.kind)) continue;
    const s = _resStatus[id];
    if (force || !s || Date.now() - s.at > 30000) _resStatusWant.add(id);
  }
  if (!_resStatusWant.size || _resStatusTimer) return;
  _resStatusTimer = setTimeout(async () => {
    _resStatusTimer = null;
    const want = [..._resStatusWant].slice(0, 300); _resStatusWant = new Set();
    if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) return;
    await _resEnsureSaved();
    let out;
    try { out = await _resApi('/api/resources/status', { ids: want }); } catch (e) { return; }
    const now = Date.now();
    for (const id of want) {
      const st = out.items && out.items[id];
      _resStatus[id] = st ? { ...st, at: now } : { unknown: true, at: now };
      _resPaintStatus(id);
    }
  }, 60);
}
function _resPaintStatus(id) {
  const st = _resStatus[id];
  for (const row of document.querySelectorAll(`[data-rid="${CSS.escape(id)}"]`)) {
    const missing = !!(st && !st.unknown && !st.exists);
    row.classList.toggle('is-missing', missing);
    const m = row.querySelector('.res-missing');
    if (m) m.hidden = !missing;
    const sz = row.querySelector('.res-size');
    if (sz) sz.textContent = st && st.exists && !st.dir && st.size != null ? resFmtSize(st.size) : '';
  }
}
function resIntegrations(force) {
  if (!force && _resIntegrations && Date.now() - _resIntegrationsAt < 60000) return Promise.resolve(_resIntegrations);
  if (_resIntegrationsP) return _resIntegrationsP;
  _resIntegrationsP = _resApi('/api/resources/integrations', null, 'GET')
    .then(j => { _resIntegrations = j; _resIntegrationsAt = Date.now(); return j; })
    .catch(() => _resIntegrations || { github: { state: 'unknown' }, drive: { state: 'unknown' }, picker: /Win/.test(navigator.platform || '') })
    .finally(() => { _resIntegrationsP = null; });
  return _resIntegrationsP;
}

function resFmtSize(n) {
  if (n == null || !isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v >= 10 ? Math.round(v) : v.toFixed(1)} ${u[i]}`;
}
function resFmtDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const loc = (APP_CONFIG && APP_CONFIG.locale) || undefined;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  try { return d.toLocaleDateString(loc, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }) + (sameYear ? ' ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) : ''); }
  catch (e) { return d.toISOString().slice(0, 10); }
}

/* ---------- actions ---------- */
async function resCopyText(text, msg) {
  const t = String(text == null ? '' : text);
  try { await navigator.clipboard.writeText(t); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.className = 'sr-only';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (x) { /* nothing else to try */ }
    ta.remove();
  }
  toast(msg || 'Copied', { kind: 'ok', icon: 'copy' });
}
function resOpenUrl(r) {
  const u = safeUrl(r && r.target);
  if (!u) { toast('That link cannot be opened', { kind: 'err' }); return; }
  window.open(u, '_blank', 'noopener,noreferrer');
}
async function resOpen(id, opts) {
  const r = resGet(id);
  if (!r) return;
  opts = opts || {};
  if (RSRC_URL_KINDS.includes(r.kind)) return resOpenUrl(r);
  if (r.kind === 'snippet') { _resOpenSnippets.add(id); render(); return; }
  try {
    const out = await _resServer('/api/resources/open', { id, action: opts.reveal ? 'reveal' : 'open', ...(opts.sub ? { sub: opts.sub } : {}) });
    toast(opts.reveal ? 'Shown in its folder' : out.opened === 'folder' ? 'Opened the folder' : 'Opening…', { kind: 'ok', icon: opts.reveal ? 'folder-search' : 'external-link', timeout: 1800 });
  } catch (e) {
    if (e.code === 'MISSING') {
      _resStatus[id] = { exists: false, at: Date.now() }; _resPaintStatus(id);
      toast(`${rsrcDisplayLabel(r)} is not on this computer any more`, { kind: 'err', action: { label: 'Fix path', run: () => resEditTarget(id) } });
    } else if (e.code === 'PROGRAM') {
      toast(e.message, { kind: 'err', action: { label: 'Reveal', run: () => resOpen(id, { reveal: true, sub: opts.sub }) } });
    } else toast(e.message || 'Could not open it', { kind: 'err' });
  }
}
/** Explore a folder, open a file or link, show a snippet. */
function resPrimary(id, link) {
  const r = resGet(id);
  if (!r) return;
  if (r.kind === 'folder') return openExplorePanel(id, { link });
  if (r.kind === 'snippet') { if (_resOpenSnippets.has(id)) _resOpenSnippets.delete(id); else _resOpenSnippets.add(id); render(); return; }
  return resOpen(id);
}
function resPathOf(r, sub) {
  if (!r) return '';
  if (!sub) return r.target;
  const sep = String(r.target).includes('\\') ? '\\' : '/';
  return String(r.target).replace(/[\\/]+$/, '') + sep + String(sub).split('/').join(sep);
}
function resCopyPath(r, sub) { resCopyText(resPathOf(r, sub), 'Path copied'); }
function resCopyLink(r) { resCopyText(rsrcLinkOf(r), RSRC_URL_KINDS.includes(r.kind) ? 'Link copied' : 'Copied as a file:// link'); }
function resSend(r) { resCopyText(rsrcSendLine(r), 'Copied: paste it into an email or a chat'); }

async function resRename(id) {
  const r = resGet(id); if (!r) return;
  const v = await promptDialog({ title: 'Rename', label: 'Name shown in the dashboard (the file itself is not renamed)', value: rsrcDisplayLabel(r), confirmLabel: 'Rename' });
  if (v) resUpdate(id, { label: v.slice(0, RSRC_LIMITS.label) });
}
async function resEditNote(id) {
  const r = resGet(id); if (!r) return;
  const v = await promptDialog({ title: 'Note', label: 'A short note (what it is, which version…)', value: r.note || '', confirmLabel: 'Save' });
  if (v !== null) resUpdate(id, { note: v.slice(0, RSRC_LIMITS.note) || undefined });
}
async function resEditTarget(id) {
  const r = resGet(id); if (!r || r.kind === 'snippet') return;
  const v = await promptDialog({ title: RSRC_PATH_KINDS.includes(r.kind) ? 'Change the path' : 'Change the link', label: RSRC_PATH_KINDS.includes(r.kind) ? 'The new absolute path' : 'The new link', value: r.target, confirmLabel: 'Save' });
  if (!v) return;
  const d = rsrcDetect(v);
  if (!d || RSRC_PATH_KINDS.includes(d.kind) !== RSRC_PATH_KINDS.includes(r.kind)) { toast(RSRC_PATH_KINDS.includes(r.kind) ? 'That is not an absolute local path' : 'That is not an http(s) link', { kind: 'err' }); return; }
  resUpdate(id, { target: d.target, kind: d.kind });
  delete _resStatus[id];
  resRefreshStatus([id], true);
}

function resMenuItems(r, link) {
  const items = [];
  const isPath = RSRC_PATH_KINDS.includes(r.kind);
  if (r.kind === 'folder') items.push({ label: 'Explore', icon: 'folder-search', run: () => openExplorePanel(r.id, { link }) }, { label: 'Open in Explorer', icon: 'folder-open', run: () => resOpen(r.id) });
  if (r.kind === 'file') items.push({ label: rsrcIsExecutable(r.target) ? 'Open (programs are not opened)' : 'Open', icon: 'external-link', disabled: rsrcIsExecutable(r.target), run: () => resOpen(r.id) });
  if (isPath) items.push({ label: 'Reveal in folder', icon: 'folder-search', run: () => resOpen(r.id, { reveal: true }) });
  if (RSRC_URL_KINDS.includes(r.kind)) items.push({ label: 'Open in the browser', icon: 'external-link', run: () => resOpenUrl(r) });
  if (r.kind === 'github') {
    const g = rsrcGithub(r.target);
    if (g && g.type === 'repo') items.push({ label: 'Show open PRs and issues', icon: 'git-pull-request', run: () => resLoadGithub(r.id) });
  }
  items.push('sep');
  if (isPath) items.push({ label: 'Copy path', icon: 'copy', run: () => resCopyPath(r) });
  if (r.kind === 'snippet') items.push({ label: 'Copy snippet', icon: 'copy', run: () => resCopyText(r.target, 'Snippet copied') });
  else items.push({ label: 'Copy link', icon: 'link', run: () => resCopyLink(r) });
  items.push({ label: 'Send (copy a line for email or chat)', icon: 'send', run: () => resSend(r) });
  items.push('sep');
  items.push({ label: r.pinned ? 'Unpin' : 'Pin to the top', icon: r.pinned ? 'pin-off' : 'pin', run: () => resUpdate(r.id, { pinned: !r.pinned }) });
  items.push({ label: 'Rename…', icon: 'pencil', run: () => resRename(r.id) });
  items.push({ label: r.note ? 'Edit note…' : 'Add a note…', icon: 'notebook-pen', run: () => resEditNote(r.id) });
  if (r.kind !== 'snippet') items.push({ label: isPath ? 'Change the path…' : 'Change the link…', icon: 'link', run: () => resEditTarget(r.id) });
  items.push({ label: 'Attach to more…', icon: 'paperclip', run: () => resAttachMore(r.id) });
  items.push('sep');
  if (link) items.push({ label: `Detach from this ${_RES_LINK_NOUN[link.type] || 'item'}`, icon: 'link-2-off', run: () => resDetach(r.id, link) });
  items.push({ label: 'Remove from the dashboard', icon: 'trash-2', danger: true, run: () => resRemove(r.id) });
  return items;
}

/* ---------- rows ---------- */
function _resIconHtml(r) {
  const g = r.kind === 'github' ? rsrcGithub(r.target) : null;
  return `<span class="res-ic k-${escAttr(r.kind)}${g ? ' g-' + escAttr(g.type) : ''}">${icon(rsrcIcon(r))}</span>`;
}
/** One resource row: icon, name (main action), what it is, quick buttons, menu. */
function resRow(r, o) {
  o = o || {};
  const link = o.link || null;
  const row = document.createElement('div');
  const st = _resStatus[r.id];
  const missing = !!(st && !st.unknown && st.exists === false);
  row.className = 'res-row k-' + r.kind + (r.pinned ? ' pinned' : '') + (missing ? ' is-missing' : '');
  row.dataset.rid = r.id;
  const main = document.createElement('button'); main.type = 'button'; main.className = 'res-main';
  const what = rsrcKindLabel(r);
  const sub = r.kind === 'snippet' ? what : RSRC_PATH_KINDS.includes(r.kind) ? r.target : r.target.replace(/^https?:\/\/(www\.)?/, '');
  main.innerHTML = _resIconHtml(r)
    + `<span class="res-txt"><span class="res-name">${esc(rsrcDisplayLabel(r))}</span>`
    + `<span class="res-sub"><span class="res-what">${esc(r.kind === 'snippet' ? 'Snippet' : what)}</span>${r.kind === 'snippet' ? (r.lang ? `<span class="res-lang">${esc(r.lang)}</span>` : '') : `<span class="res-path truncate">${esc(sub)}</span>`}`
    + `<span class="res-size">${st && st.exists && !st.dir && st.size != null ? esc(resFmtSize(st.size)) : ''}</span>`
    + `<span class="res-missing badge badge-danger"${missing ? '' : ' hidden'}>Not found</span></span>`
    + (r.note ? `<span class="res-note">${esc(r.note)}</span>` : '')
    + '</span>';
  main.title = r.kind === 'folder' ? 'Explore this folder' : r.kind === 'snippet' ? 'Show the snippet' : RSRC_URL_KINDS.includes(r.kind) ? 'Open in the browser' : 'Open';
  main.setAttribute('aria-label', `${main.title}: ${rsrcDisplayLabel(r)}`);
  main.onclick = () => resPrimary(r.id, link);
  row.appendChild(main);
  const acts = document.createElement('div'); acts.className = 'res-acts';
  const btn = (ic, label, run) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon btn-sm';
    b.innerHTML = icon(ic); b.setAttribute('aria-label', label); b.setAttribute('data-tip', label);
    b.onclick = (e) => { e.stopPropagation(); run(e.currentTarget); };
    acts.appendChild(b); return b;
  };
  if (r.kind === 'folder') btn('folder-open', 'Open in Explorer', () => resOpen(r.id));
  if (RSRC_PATH_KINDS.includes(r.kind)) btn('copy', 'Copy path', () => resCopyPath(r));
  else if (r.kind === 'snippet') btn('copy', 'Copy snippet', () => resCopyText(r.target, 'Snippet copied'));
  else btn('link', 'Copy link', () => resCopyLink(r));
  btn('send', 'Send: copy a line to paste in an email or chat', () => resSend(r));
  btn('ellipsis', 'More', (a) => openMenu(a, resMenuItems(r, link), { align: 'end', width: 260 }));
  row.appendChild(acts);
  row.addEventListener('contextmenu', (e) => { e.preventDefault(); openMenu(row, resMenuItems(r, link), { align: 'end', width: 260 }); });
  if (o.showLinks) row.appendChild(_resLinkChips(r));

  if (r.kind === 'snippet' && (_resOpenSnippets.has(r.id) || o.expandSnippets)) {
    const box = document.createElement('div'); box.className = 'res-snippet';
    const head = document.createElement('div'); head.className = 'res-snippet-h';
    head.innerHTML = `<span class="overline">${esc(r.lang || 'text')}</span>`;
    const cp = document.createElement('button'); cp.type = 'button'; cp.className = 'btn btn-ghost btn-sm';
    cp.innerHTML = icon('copy') + '<span>Copy</span>'; cp.onclick = () => resCopyText(r.target, 'Snippet copied');
    head.appendChild(cp);
    const pre = document.createElement('pre'); pre.className = 'res-code'; pre.tabIndex = 0;
    const code = document.createElement('code'); code.textContent = r.target;   // never markup
    if (r.lang) code.dataset.lang = r.lang;
    pre.appendChild(code);
    box.append(head, pre);
    row.appendChild(box);
  }
  if (r.kind === 'github' && _resGh[r.id]) row.appendChild(_resGithubPanel(r));
  return row;
}
/** "Attached to" chips (Files view): a task opens its detail, a stream/person/page goes there. */
function _resLinkChips(r) {
  const box = document.createElement('div'); box.className = 'res-links';
  const ls = (r.links || []);
  if (!ls.length) { box.innerHTML = '<span class="subtle">Not attached to anything</span>'; return box; }
  for (const l of ls.slice(0, 4)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip res-link-chip';
    const dot = l.type === 'stream' && STREAMS[l.id] ? `<span class="dot" style="--c:${escAttr(safeColor(STREAMS[l.id].color))}"></span>` : icon(l.type === 'task' ? 'circle-check' : l.type === 'person' ? 'user' : 'layout-grid', 'i-xs');
    b.innerHTML = `${dot}<span>${esc(_resLinkLabel(l))}</span>`;
    b.title = `Go to this ${_RES_LINK_NOUN[l.type] || 'item'}`;
    b.onclick = () => {
      if (l.type === 'task') {
        const t = getItem(l.id); if (!t) return;
        if (itemOpenTarget() === 'card' || detailPaneOpen()) { openTask(l.id, { from: b }); return; }   // the card, or the open side panel, right here (61-task-card.js)
        setView(typeof homeViewForTask === 'function' ? homeViewForTask(t) : 'all'); selectTask(l.id);
      }
      else { const v = _resLinkView(l); if (v) setView(v); }
    };
    box.appendChild(b);
  }
  if (ls.length > 4) box.insertAdjacentHTML('beforeend', `<span class="chip chip-more">+${esc(ls.length - 4)}</span>`);
  return box;
}

/* ---------- GitHub: open PRs and issues (read-only, optional) ---------- */
async function resLoadGithub(id, refresh) {
  const r = resGet(id); if (!r) return;
  const integ = await resIntegrations();
  if (!integ || !integ.github || integ.github.state !== 'ok') {
    const why = integ && integ.github && integ.github.state === 'auth' ? 'GitHub needs signing in again' : 'Connect the GitHub MCP server first';
    toast(why, { kind: 'err', action: { label: 'Connections', run: () => setView('connections') } });
    return;
  }
  if (typeof connHas === 'function' && !connHas('claude')) { toast('Connect Claude first', { kind: 'err', action: { label: 'Connections', run: () => setView('connections') } }); return; }
  _resGh[id] = { loading: true, data: _resGh[id] && _resGh[id].data };
  render();
  try {
    const data = await _resServer('/api/resources/github', { id, ...(refresh ? { refresh: true } : {}) });
    _resGh[id] = { data };
  } catch (e) { _resGh[id] = { error: e.message || 'GitHub could not be read' }; }
  render();
}
function _resGithubPanel(r) {
  const g = _resGh[r.id] || {};
  const box = document.createElement('div'); box.className = 'res-gh';
  const head = document.createElement('div'); head.className = 'res-gh-h';
  head.innerHTML = `<span class="overline">Open on GitHub</span>${g.data && g.data.fetchedAt ? `<span class="subtle">${esc(resFmtDate(Date.parse(g.data.fetchedAt)))}${g.data.cached ? ' (cached)' : ''}</span>` : ''}`;
  const rf = document.createElement('button'); rf.type = 'button'; rf.className = 'btn-icon btn-sm'; rf.innerHTML = icon('refresh-cw');
  rf.setAttribute('aria-label', 'Refresh'); rf.setAttribute('data-tip', 'Refresh'); rf.disabled = !!g.loading;
  rf.onclick = () => resLoadGithub(r.id, true);
  const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm'; x.innerHTML = icon('x');
  x.setAttribute('aria-label', 'Hide'); x.onclick = () => { delete _resGh[r.id]; render(); };
  head.append(rf, x);
  box.appendChild(head);
  if (g.loading && !g.data) { box.insertAdjacentHTML('beforeend', '<div class="res-gh-loading"><span class="spinner"></span><span class="muted">Reading GitHub (read-only)…</span></div>'); return box; }
  if (g.error) { const e = document.createElement('div'); e.className = 'callout warn'; e.textContent = g.error; box.appendChild(e); return box; }
  const d = g.data || { pulls: [], issues: [] };
  const sec = (title, list, ic) => {
    const h = document.createElement('div'); h.className = 'res-gh-sub'; h.textContent = `${title} (${list.length})`; box.appendChild(h);
    if (!list.length) { const e = document.createElement('div'); e.className = 'subtle res-gh-empty'; e.textContent = 'None open'; box.appendChild(e); return; }
    for (const it of list) {
      const a = document.createElement('a'); a.className = 'res-gh-item'; a.target = '_blank'; a.rel = 'noopener noreferrer';
      const u = safeUrl(it.url); if (u) a.href = u;
      a.innerHTML = `${icon(ic, 'i-sm')}<span class="num">#${esc(it.number)}</span><span class="truncate grow">${esc(it.title)}</span>${it.draft ? '<span class="badge badge-soft">Draft</span>' : ''}${it.author ? `<span class="subtle">${esc(it.author)}</span>` : ''}`;
      box.appendChild(a);
    }
  };
  sec('Pull requests', d.pulls || [], 'git-pull-request');
  sec('Issues', d.issues || [], 'circle-dot');
  return box;
}

/* ---------- the block (task detail, person panel, stream page) ---------- */
function resBlock(link, opts) {
  opts = opts || {};
  const list = resFor(link.type, link.id);
  const sec = document.createElement('section');
  sec.className = 'dp-section res-block' + (opts.compact ? ' res-compact' : '') + (list.length ? '' : ' is-empty') + (opts.className ? ' ' + opts.className : '');
  sec.dataset.resLink = link.type + ':' + link.id;
  const h = document.createElement('div');
  if (opts.panelTitle) {   // the person panel's own heading style
    h.className = 'dp-title res-h';
    h.innerHTML = `<span class="ppl-sh">Files &amp; links${list.length ? ` <span class="subtle">${list.length}</span>` : ''}</span><span class="grow"></span>`;
  } else {
    h.className = 'dp-sh res-h';
    h.innerHTML = `${opts.compact ? icon('paperclip', 'i-sm') : ''}<h4>Files &amp; links</h4>${list.length ? `<span class="count">${list.length}</span>` : ''}<span class="grow"></span>`;
  }
  const add = document.createElement('button'); add.type = 'button'; add.className = 'btn btn-ghost btn-sm res-add';
  add.innerHTML = icon('plus') + '<span>Attach</span>';
  add.setAttribute('aria-label', 'Attach a file, folder, link or snippet');
  add.onclick = (e) => resAddMenu(e.currentTarget, link);
  h.appendChild(add);
  sec.appendChild(h);
  const body = document.createElement('div'); body.className = 'res-list';
  for (const r of list) body.appendChild(resRow(r, { link }));
  sec.appendChild(body);
  // Paste anything: a path, a URL, a GitHub link; several lines add several.
  const paste = document.createElement('label'); paste.className = 'res-paste';
  paste.innerHTML = icon('paperclip', 'i-sm');
  const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'res-paste-in';
  inp.placeholder = list.length ? 'Paste a path or link to attach…' : 'Paste a folder, file, link or GitHub URL…';
  inp.setAttribute('aria-label', 'Paste a path or link to attach');
  inp.dataset.fk = 'res-paste-' + link.type + '-' + link.id;
  const take = (text) => {
    const parsed = rsrcParseMany(text);
    if (!parsed.items.length) {
      if (text.trim()) toast(parsed.rejected.length > 1 || /\n/.test(text) ? 'Nothing there looks like a path or a link. For text, use Attach > Snippet.' : 'That is not an absolute path or an http(s) link', { kind: 'err' });
      return false;
    }
    resAddItems(parsed.items, [link]);
    if (parsed.rejected.length) toast(`${parsed.rejected.length} line${parsed.rejected.length === 1 ? ' was' : 's were'} not a path or link`, { kind: 'err' });
    return true;
  };
  inp.addEventListener('paste', (e) => {
    const t = e.clipboardData && e.clipboardData.getData('text');
    if (t && /\n/.test(t.trim())) { e.preventDefault(); if (take(t)) inp.value = ''; }
  });
  inp.onkeydown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); if (take(inp.value)) inp.value = ''; }
    if (e.key === 'Escape') { inp.value = ''; inp.blur(); }
  };
  paste.appendChild(inp);
  // An empty stream strip stays one line: the paste box sits in the heading.
  if (opts.compact && !list.length) h.insertBefore(paste, add); else sec.appendChild(paste);
  resRefreshStatus(list.map(r => r.id));
  return sec;
}
function resAddMenu(anchor, link) {
  const items = [
    { label: 'Paste paths or links…', icon: 'clipboard', run: () => openAttachDialog({ links: [link] }) },
  ];
  const picker = !_resIntegrations || _resIntegrations.picker !== false;
  if (picker) {
    items.push({ label: 'Browse for a file…', icon: 'file', run: () => resBrowse('file', [link]) });
    items.push({ label: 'Browse for a folder…', icon: 'folder', run: () => resBrowse('folder', [link]) });
  }
  items.push({ label: 'Code snippet…', icon: 'square-code', run: () => openAttachDialog({ links: [link], mode: 'snippet' }) });
  items.push({ label: 'Search Google Drive…', icon: 'hard-drive', run: () => openAttachDialog({ links: [link], mode: 'drive' }) });
  const existing = resList().filter(r => !(r.links || []).some(l => l.type === link.type && l.id === link.id));
  if (existing.length) items.push('sep', { label: 'Something already saved…', icon: 'paperclip', run: () => resPickExisting(link) });
  openMenu(anchor, items, { align: 'end', width: 240 });
  resIntegrations();
}
async function resBrowse(mode, links) {
  const t = toast(mode === 'folder' ? 'Choose a folder in the window that opened…' : 'Choose a file in the window that opened…', { icon: mode === 'folder' ? 'folder' : 'file', timeout: 60000 });
  try {
    const out = await _resApi('/api/resources/pick', { mode, multi: mode === 'file' });
    t();
    if (out.cancelled) return;
    resAddItems(out.paths.map(p => ({ kind: mode, target: p })), links);
  } catch (e) {
    t();
    if (e.code === 'NO_PICKER') { toast('No file picker here: paste the path instead', { kind: 'err' }); openAttachDialog({ links }); return; }
    toast(e.message || 'The picker failed', { kind: 'err' });
  }
}
function resPickExisting(link) {
  openDialog({
    title: 'Attach something already saved', width: 520,
    body: (el, close) => {
      const f = document.createElement('label'); f.className = 'input';
      f.innerHTML = icon('search');
      const q = document.createElement('input'); q.placeholder = 'Filter'; q.setAttribute('autofocus', ''); q.setAttribute('aria-label', 'Filter');
      f.appendChild(q); el.appendChild(f);
      const box = document.createElement('div'); box.className = 'res-pick-list'; el.appendChild(box);
      const paint = () => {
        box.innerHTML = '';
        const rows = rsrcFilter(resList(), { q: q.value }).filter(r => !(r.links || []).some(l => l.type === link.type && l.id === link.id)).slice(0, 60);
        if (!rows.length) { box.innerHTML = '<div class="subtle res-empty">Nothing else saved matches.</div>'; return; }
        for (const r of rows) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'res-pick';
          b.innerHTML = _resIconHtml(r) + `<span class="res-txt"><span class="res-name">${esc(rsrcDisplayLabel(r))}</span><span class="res-sub">${esc(rsrcKindLabel(r))}</span></span>`;
          b.onclick = () => { r.links = Array.isArray(r.links) ? r.links : []; r.links.push({ type: link.type, id: link.id }); saveData(); render(); close(); toast('Attached', { kind: 'ok', icon: 'paperclip', action: { label: 'Undo', run: () => undo() } }); };
          box.appendChild(b);
        }
      };
      q.oninput = paint; paint();
    },
  });
}
/** Attach an existing resource to a task chosen by name, a stream or a person. */
function resAttachMore(id) {
  const r = resGet(id); if (!r) return;
  openDialog({
    title: `Attach "${rsrcDisplayLabel(r)}" to…`, width: 520,
    body: (el, close) => {
      const f = document.createElement('label'); f.className = 'input';
      f.innerHTML = icon('search');
      const q = document.createElement('input'); q.placeholder = 'A task, stream or person'; q.setAttribute('autofocus', ''); q.setAttribute('aria-label', 'Search tasks, streams and people');
      f.appendChild(q); el.appendChild(f);
      const box = document.createElement('div'); box.className = 'res-pick-list'; el.appendChild(box);
      const has = (type, lid) => (r.links || []).some(l => l.type === type && l.id === lid);
      const attach = (type, lid) => { r.links = Array.isArray(r.links) ? r.links : []; if (!has(type, lid)) r.links.push({ type, id: lid }); saveData(); render(); close(); toast('Attached', { kind: 'ok', icon: 'paperclip', action: { label: 'Undo', run: () => undo() } }); };
      const paint = () => {
        box.innerHTML = '';
        const ql = q.value.trim().toLowerCase();
        const out = [];
        for (const [k, s] of Object.entries(STREAMS)) if (!s.archived && !has('stream', k) && (!ql || s.label.toLowerCase().includes(ql))) out.push({ type: 'stream', id: k, label: s.label, html: `<span class="res-ic"><span class="dot" style="--c:${escAttr(safeColor(s.color))}"></span></span>`, what: 'Stream' });
        for (const p of (state.people || [])) if (p && !p.self && !has('person', p.id) && ql && String(p.name || '').toLowerCase().includes(ql)) out.push({ type: 'person', id: p.id, label: p.name, html: `<span class="res-ic">${icon('user')}</span>`, what: 'Person' });
        if (ql.length >= 2) {
          for (const t of getAllItems()) {
            if (out.length > 40) break;
            if (statusOf(t.id) === 'done' || has('task', t.id)) continue;
            if (effTitle(t).toLowerCase().includes(ql)) out.push({ type: 'task', id: t.id, label: effTitle(t), html: `<span class="res-ic">${icon('circle-check')}</span>`, what: (STREAMS[effStream(t)] || {}).label || 'Task' });
          }
        }
        if (!out.length) { box.innerHTML = `<div class="subtle res-empty">${ql.length < 2 ? 'Type to find a task, or pick a stream.' : 'No match.'}</div>`; return; }
        for (const o of out.slice(0, 40)) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'res-pick';
          b.innerHTML = o.html + `<span class="res-txt"><span class="res-name">${esc(o.label)}</span><span class="res-sub">${esc(o.what)}</span></span>`;
          b.onclick = () => attach(o.type, o.id);
          box.appendChild(b);
        }
      };
      q.oninput = paint; paint();
    },
  });
}

/* ---------- the Attach dialog: paste anything, browse, snippet, Drive ---------- */
function openAttachDialog(o) {
  o = o || {};
  const links = (o.links || []).filter(Boolean);
  let mode = o.mode || 'paste';
  let ta = null, sLabel = null, sLang = null, sText = null, preview = null;
  const where = links.length ? links.map(_resLinkLabel).join(', ') : 'Files & links (not attached to anything yet)';
  openDialog({
    title: 'Attach', width: 600,
    body: (el, close) => {
      const sub = document.createElement('p'); sub.className = 'muted res-dlg-to';
      sub.innerHTML = `${icon('paperclip', 'i-sm')}<span>To: <strong>${esc(where)}</strong></span>`;
      el.appendChild(sub);
      const seg = document.createElement('div'); seg.className = 'seg res-dlg-seg'; seg.setAttribute('role', 'tablist');
      const panes = document.createElement('div');
      el.append(seg, panes);
      const tabs = [['paste', 'Paths & links', 'clipboard'], ['snippet', 'Snippet', 'square-code'], ['drive', 'Google Drive', 'hard-drive']];
      const paint = () => {
        seg.innerHTML = '';
        for (const [k, l, ic] of tabs) {
          const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab');
          b.setAttribute('aria-pressed', mode === k ? 'true' : 'false'); b.innerHTML = icon(ic) + `<span>${esc(l)}</span>`;
          b.onclick = () => { mode = k; paint(); };
          seg.appendChild(b);
        }
        panes.innerHTML = '';
        if (mode === 'paste') {
          const f = document.createElement('label'); f.className = 'field';
          f.innerHTML = '<span class="field-label">Paste paths, links or GitHub URLs, one per line</span>';
          ta = document.createElement('textarea'); ta.className = 'control res-dlg-ta'; ta.rows = 5; ta.setAttribute('autofocus', '');
          ta.placeholder = 'C:\\Users\\Sam\\Documents\\Talks\nhttps://github.com/owner/repo/pull/12\nhttps://docs.google.com/presentation/d/…';
          f.appendChild(ta);
          panes.appendChild(f);
          preview = document.createElement('div'); preview.className = 'res-dlg-preview';
          panes.appendChild(preview);
          const upd = () => {
            const p = rsrcParseMany(ta.value);
            preview.innerHTML = '';
            for (const it of p.items) {
              const r = { ...it, id: '' };
              const exists = rsrcFindSame(resList(), it.kind, it.target);
              preview.insertAdjacentHTML('beforeend', `<div class="res-pv">${_resIconHtml(r)}<span class="res-txt"><span class="res-name">${esc(it.label)}</span><span class="res-sub">${esc(rsrcKindLabel(r))}${exists ? ' · already saved: it will be attached here too' : ''}</span></span></div>`);
            }
            for (const line of p.rejected.slice(0, 5)) preview.insertAdjacentHTML('beforeend', `<div class="res-pv bad">${icon('circle-alert', 'i-sm')}<span class="truncate">${esc(line)}</span><span class="subtle">not a path or link</span></div>`);
          };
          ta.oninput = upd;
          const tools = document.createElement('div'); tools.className = 'hstack res-dlg-tools';
          const picker = !_resIntegrations || _resIntegrations.picker !== false;
          if (picker) {
            for (const [m, l, ic] of [['file', 'Browse for files…', 'file'], ['folder', 'Browse for a folder…', 'folder']]) {
              const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm';
              b.innerHTML = icon(ic) + `<span>${esc(l)}</span>`;
              b.onclick = () => { close(); resBrowse(m, links); };
              tools.appendChild(b);
            }
          }
          const hint = document.createElement('span'); hint.className = 'subtle res-dlg-hint';
          hint.textContent = 'Tip: Shift + right-click a file in Explorer, then "Copy as path".';
          tools.appendChild(hint);
          panes.appendChild(tools);
          setTimeout(() => ta && ta.focus(), 0);
        } else if (mode === 'snippet') {
          const row = document.createElement('div'); row.className = 'res-dlg-row';
          const f1 = document.createElement('label'); f1.className = 'field grow';
          f1.innerHTML = '<span class="field-label">Name</span>';
          sLabel = document.createElement('input'); sLabel.className = 'control'; sLabel.placeholder = 'e.g. Run the solver'; sLabel.maxLength = RSRC_LIMITS.label;
          f1.appendChild(sLabel);
          const f2 = document.createElement('label'); f2.className = 'field res-dlg-lang';
          f2.innerHTML = '<span class="field-label">Language</span>';
          sLang = document.createElement('input'); sLang.className = 'control'; sLang.placeholder = 'python'; sLang.maxLength = RSRC_LIMITS.lang;
          sLang.setAttribute('list', 'res-langs');
          f2.appendChild(sLang);
          const dl = document.createElement('datalist'); dl.id = 'res-langs';
          for (const l of ['python', 'bash', 'powershell', 'sql', 'javascript', 'json', 'latex', 'r', 'matlab', 'text']) { const op = document.createElement('option'); op.value = l; dl.appendChild(op); }
          row.append(f1, f2, dl);
          panes.appendChild(row);
          const f3 = document.createElement('label'); f3.className = 'field';
          f3.innerHTML = '<span class="field-label">Text</span>';
          sText = document.createElement('textarea'); sText.className = 'control res-code-in'; sText.rows = 8; sText.spellcheck = false;
          sText.placeholder = 'Paste the command, query or code';
          f3.appendChild(sText);
          panes.appendChild(f3);
          setTimeout(() => sText && sText.focus(), 0);
        } else {
          _resDrivePane(panes, links, close);
        }
      };
      paint();
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Attach', primary: true, icon: 'paperclip', run: () => {
        if (mode === 'paste') {
          const p = rsrcParseMany(ta ? ta.value : '');
          if (!p.items.length) { toast('Paste at least one absolute path or http(s) link', { kind: 'err' }); return false; }
          resAddItems(p.items, links);
          return true;
        }
        if (mode === 'snippet') {
          if (!sText || !sText.value.trim()) { toast('Paste the snippet text first', { kind: 'err' }); return false; }
          resAddItems([{ kind: 'snippet', target: sText.value, label: sLabel.value, lang: sLang.value }], links);
          return true;
        }
        return false;
      } },
    ],
  });
  resIntegrations();
}
function _resDrivePane(el, links, close) {
  const integ = _resIntegrations;
  const st = integ && integ.drive ? integ.drive.state : 'unknown';
  if (st !== 'ok') {
    const c = document.createElement('div'); c.className = 'callout' + (st === 'auth' ? ' warn' : '');
    c.innerHTML = icon('hard-drive') + `<div class="grow">${st === 'auth' ? 'Google Drive needs signing in again (claude.ai, Settings, Connectors).' : st === 'unknown' ? 'Checking whether Google Drive is connected…' : 'Google Drive is not connected.'} You can still paste a Drive link in "Paths &amp; links".</div>`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.textContent = 'Connections';
    b.onclick = () => { close(); setView('connections'); };
    c.appendChild(b);
    el.appendChild(c);
    if (st === 'unknown') resIntegrations(true).then(() => { if (el.isConnected) { el.innerHTML = ''; _resDrivePane(el, links, close); } });
    return;
  }
  const f = document.createElement('div'); f.className = 'hstack';
  const box = document.createElement('label'); box.className = 'input grow'; box.innerHTML = icon('search');
  const q = document.createElement('input'); q.placeholder = 'Search Drive (read-only)'; q.setAttribute('aria-label', 'Search Google Drive');
  box.appendChild(q);
  const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-secondary'; go.textContent = 'Search';
  go.setAttribute('data-requires', 'claude');
  f.append(box, go);
  el.appendChild(f);
  const out = document.createElement('div'); out.className = 'res-pick-list'; el.appendChild(out);
  const run = async () => {
    if (!q.value.trim()) return;
    out.innerHTML = '<div class="res-gh-loading"><span class="spinner"></span><span class="muted">Searching Drive (read-only)…</span></div>';
    try {
      const j = await _resApi('/api/resources/drive-search', { q: q.value.trim() });
      out.innerHTML = '';
      if (!j.files.length) { out.innerHTML = '<div class="subtle res-empty">Nothing found.</div>'; return; }
      for (const fl of j.files) {
        const r = { kind: 'drive', target: fl.url, label: fl.title };
        const b = document.createElement('button'); b.type = 'button'; b.className = 'res-pick';
        b.innerHTML = _resIconHtml(r) + `<span class="res-txt"><span class="res-name">${esc(fl.title)}</span><span class="res-sub">${esc(rsrcKindLabel(r))}${fl.modifiedTime ? ' · ' + esc(resFmtDate(Date.parse(fl.modifiedTime))) : ''}</span></span>`;
        b.onclick = () => { resAddItems([r], links); close(); };
        out.appendChild(b);
      }
    } catch (e) { out.innerHTML = ''; const c = document.createElement('div'); c.className = 'callout warn'; c.textContent = e.message || 'Drive could not be searched'; out.appendChild(c); }
  };
  go.onclick = run;
  q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); run(); } };
  setTimeout(() => q.focus(), 0);
}

/* ---------- Explore panel ---------- */
let _resExplore = null;   // {id, sub, link, sort, q, data}
function openExplorePanel(id, o) {
  o = o || {};
  const r = resGet(id);
  if (!r || r.kind !== 'folder') return;
  _resExplore = { id, sub: o.sub || '', link: o.link || null, sort: 'name', q: '', data: null, loading: true, error: null };
  let bodyEl = null;
  openDrawer({
    title: rsrcDisplayLabel(r), width: 680, resizeId: 'explore',
    body: (el) => { bodyEl = el; el.classList.add('res-ex'); _resExplorePaint(el); },
    footer: (f) => {
      f.classList.add('res-ex-f');
      const a = document.createElement('button'); a.type = 'button'; a.className = 'btn btn-secondary btn-sm';
      a.innerHTML = icon('folder-open') + '<span>Open in Explorer</span>';
      a.onclick = () => resOpen(id, { sub: _resExplore && _resExplore.sub });
      const c = document.createElement('button'); c.type = 'button'; c.className = 'btn btn-ghost btn-sm';
      c.innerHTML = icon('copy') + '<span>Copy path</span>';
      c.onclick = () => resCopyPath(r, _resExplore && _resExplore.sub);
      const s = document.createElement('span'); s.className = 'spacer';
      f.append(a, c, s);
      const n = document.createElement('span'); n.className = 'subtle res-ex-count'; f.appendChild(n);
    },
    onClose: () => { _resExplore = null; },
  });
  _resExploreLoad(bodyEl);
}
async function _resExploreLoad(el) {
  const ex = _resExplore; if (!ex) return;
  ex.loading = true; ex.error = null; _resExplorePaint(el);
  try {
    await _resEnsureSaved();
    const j = await _resServer(`/api/resources/browse?id=${encodeURIComponent(ex.id)}&sub=${encodeURIComponent(ex.sub)}`, null, 'GET');
    if (_resExplore !== ex) return;
    ex.data = j;
  } catch (e) {
    if (_resExplore !== ex) return;
    ex.error = e; ex.data = null;
  }
  ex.loading = false;
  _resExplorePaint(el);
}
function _resExploreGo(el, sub) { if (!_resExplore) return; _resExplore.sub = sub; _resExplore.q = ''; _resExploreLoad(el); }
function _resExplorePaint(el) {
  const ex = _resExplore; if (!ex || !el) return;
  const r = resGet(ex.id);
  el.innerHTML = '';
  // Breadcrumbs
  const crumbs = document.createElement('nav'); crumbs.className = 'res-crumbs'; crumbs.setAttribute('aria-label', 'Folder path');
  const parts = (ex.data && ex.data.crumbs) || [{ name: rsrcDisplayLabel(r), sub: '' }].concat(ex.sub ? ex.sub.split('/').map((p, i, a) => ({ name: p, sub: a.slice(0, i + 1).join('/') })) : []);
  parts.forEach((c, i) => {
    if (i) crumbs.insertAdjacentHTML('beforeend', icon('chevron-right', 'i-xs'));
    const b = document.createElement('button'); b.type = 'button'; b.className = 'res-crumb' + (i === parts.length - 1 ? ' on' : '');
    if (i === 0) b.innerHTML = icon('folder', 'i-sm');
    b.insertAdjacentHTML('beforeend', `<span>${esc(c.name)}</span>`);
    if (i === parts.length - 1) b.setAttribute('aria-current', 'page');
    b.onclick = () => _resExploreGo(el, c.sub);
    crumbs.appendChild(b);
  });
  el.appendChild(crumbs);
  // Toolbar: filter + sort
  const bar = document.createElement('div'); bar.className = 'res-ex-bar';
  const fl = document.createElement('label'); fl.className = 'input input-sm grow'; fl.innerHTML = icon('search');
  const q = document.createElement('input'); q.type = 'search'; q.placeholder = 'Filter this folder'; q.value = ex.q; q.setAttribute('aria-label', 'Filter this folder');
  q.oninput = () => { ex.q = q.value; _resExploreList(el); };
  q.onkeydown = (e) => e.stopPropagation();
  fl.appendChild(q);
  const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Sort');
  for (const [k, l] of [['name', 'Name'], ['date', 'Date']]) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.setAttribute('aria-pressed', ex.sort === k ? 'true' : 'false');
    b.onclick = () => { ex.sort = k; _resExplorePaint(el); };
    seg.appendChild(b);
  }
  const up = document.createElement('button'); up.type = 'button'; up.className = 'btn-icon btn-sm'; up.innerHTML = icon('arrow-up');
  up.setAttribute('aria-label', 'Up one folder'); up.setAttribute('data-tip', 'Up one folder'); up.disabled = !ex.sub;
  up.onclick = () => _resExploreGo(el, ex.sub.split('/').slice(0, -1).join('/'));
  bar.append(up, fl, seg);
  el.appendChild(bar);
  const list = document.createElement('div'); list.className = 'res-ex-list'; list.setAttribute('role', 'list');
  el.appendChild(list);
  _resExploreList(el);
}
function _resExploreList(el) {
  const ex = _resExplore; if (!ex) return;
  const list = el.querySelector('.res-ex-list'); if (!list) return;
  const count = document.querySelector('.res-ex-count');
  list.innerHTML = '';
  if (ex.loading && !ex.data) {
    for (let i = 0; i < 6; i++) list.insertAdjacentHTML('beforeend', '<div class="res-ex-row skeleton-row"><span class="skeleton skeleton-text"></span></div>');
    return;
  }
  if (ex.error) {
    const c = document.createElement('div'); c.className = 'callout warn';
    c.innerHTML = icon('folder-x') + `<div class="grow">${esc(ex.error.code === 'MISSING' ? 'This folder is not on this computer any more (moved or renamed?).' : ex.error.message || 'The folder could not be read.')}</div>`;
    if (ex.error.code === 'MISSING' && !ex.sub) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.textContent = 'Fix path';
      b.onclick = () => resEditTarget(ex.id); c.appendChild(b);
    }
    list.appendChild(c);
    return;
  }
  const d = ex.data || { entries: [] };
  const ql = ex.q.trim().toLowerCase();
  let rows = d.entries.filter(e => !ql || e.name.toLowerCase().includes(ql));
  rows = rows.slice().sort((a, b) => (b.dir - a.dir) || (ex.sort === 'date' ? (b.mtime || 0) - (a.mtime || 0) : a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })));
  if (count) count.textContent = `${d.shown}${d.truncated ? ` of ${d.total}` : ''} item${d.shown === 1 ? '' : 's'}${d.hiddenOutside ? ` · ${d.hiddenOutside} link${d.hiddenOutside === 1 ? '' : 's'} outside hidden` : ''}`;
  if (!rows.length) { mountEmptyState(list, { icon: ql ? 'search-x' : 'folder-open', title: ql ? 'No match' : 'This folder is empty', compact: true }); return; }
  const r = resGet(ex.id);
  const task = ex.link && ex.link.type === 'task' ? ex.link : ((r && r.links) || []).find(l => l.type === 'task') || null;
  for (const e of rows) {
    const row = document.createElement('div'); row.className = 'res-ex-row' + (e.dir ? ' dir' : ''); row.setAttribute('role', 'listitem');
    const main = document.createElement('button'); main.type = 'button'; main.className = 'res-ex-main';
    const ic = e.dir ? 'folder' : rsrcFileTypeIcon(e.type || 'file');
    main.innerHTML = `<span class="res-ic k-${e.dir ? 'folder' : 'file'}">${icon(ic)}</span><span class="res-ex-name truncate">${esc(e.name)}</span>`
      + `<span class="res-ex-size num">${e.dir ? '' : esc(resFmtSize(e.size))}</span><span class="res-ex-date num">${esc(resFmtDate(e.mtime))}</span>`;
    main.title = e.dir ? 'Open this folder here' : rsrcIsExecutable(e.name) ? 'Programs are not opened from the dashboard' : 'Open in its app';
    main.onclick = () => { if (e.dir) _resExploreGo(el, e.sub); else if (!rsrcIsExecutable(e.name)) resOpen(ex.id, { sub: e.sub }); else resOpen(ex.id, { sub: e.sub, reveal: true }); };
    row.appendChild(main);
    const acts = document.createElement('div'); acts.className = 'res-acts';
    const btn = (icn, label, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon btn-sm'; b.innerHTML = icon(icn); b.setAttribute('aria-label', label); b.setAttribute('data-tip', label); b.onclick = (ev) => { ev.stopPropagation(); run(); }; acts.appendChild(b); };
    if (!e.dir) btn('folder-search', 'Reveal in folder', () => resOpen(ex.id, { sub: e.sub, reveal: true }));
    btn('copy', 'Copy path', () => resCopyPath(r, e.sub));
    const target = resPathOf(r, e.sub);
    if (task) btn('paperclip', `Attach to the task "${_resLinkLabel(task)}"`, () => resAddItems([{ kind: e.dir ? 'folder' : 'file', target, label: e.name }], [task]));
    else if (ex.link) btn('paperclip', `Attach to ${_resLinkLabel(ex.link)}`, () => resAddItems([{ kind: e.dir ? 'folder' : 'file', target, label: e.name }], [ex.link]));
    else btn('paperclip', 'Attach to…', () => { const out = resAddItems([{ kind: e.dir ? 'folder' : 'file', target, label: e.name }], []); if (out.ids[0]) resAttachMore(out.ids[0]); });
    row.appendChild(acts);
    list.appendChild(row);
  }
  if (d.truncated) list.insertAdjacentHTML('beforeend', `<div class="subtle res-empty">Showing the first ${esc(d.shown)} of ${esc(d.total)} items. Open the folder in Explorer for the rest.</div>`);
}

/* ---------- Home: chips on the Focus cards ---------- */
function resFocusChips(taskId) {
  const list = resFor('task', taskId);
  if (!list.length) return '';
  const shown = list.slice(0, 3);
  return '<div class="hf-res">' + shown.map(r => `<button type="button" class="chip res-chip k-${escAttr(r.kind)}" data-act="res" data-res="${escAttr(r.id)}" data-tip="${escAttr(rsrcKindLabel(r))}">${icon(rsrcIcon(r))}<span>${esc(rsrcDisplayLabel(r))}</span></button>`).join('')
    + (list.length > 3 ? `<button type="button" class="chip chip-more" data-act="open">+${list.length - 3}</button>` : '') + '</div>';
}

/* ---------- the stream page ("tabs"): a compact strip above the list ---------- */
function resStreamStrip(streamId) {
  const el = resBlock({ type: 'stream', id: streamId }, { compact: true, className: 'res-stream card' });
  return el;
}

/* ---------- global Files & links view ---------- */
registerSection('files', {
  group: 'tasks',
  title: () => 'Files & links',
  crumb: () => ['Files & links'],
  hashable: true,
  mount(container) {
    const sub = document.getElementById('view-subtitle');
    const all = resList();
    if (sub) sub.textContent = all.length ? `${all.length} saved` : '';
    const page = document.createElement('div'); page.className = 'res-page';
    container.appendChild(page);
    if (typeof autolinkFilesTabs === 'function' && autolinkFilesTabs(page)) return;   // Saved | Suggested (66-autolink.js)
    const bar = document.createElement('div'); bar.className = 'res-page-bar';
    const fl = document.createElement('label'); fl.className = 'input grow'; fl.innerHTML = icon('search');
    const q = document.createElement('input'); q.type = 'search'; q.placeholder = 'Find by name, path, link or note'; q.value = _resFilesQuery; q.dataset.fk = 'res-files-q';
    q.setAttribute('aria-label', 'Find files and links');
    fl.appendChild(q);
    const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Kind');
    for (const [k, l] of [['', 'All'], ['folder', 'Folders'], ['file', 'Files'], ['url', 'Links'], ['github', 'GitHub'], ['drive', 'Drive'], ['snippet', 'Snippets']]) {
      const n = k ? all.filter(r => r.kind === k).length : all.length;
      if (k && !n && _resFilesKind !== k) continue;
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span>${esc(l)}</span>${k ? `<span class="subtle num">${n}</span>` : ''}`;
      b.setAttribute('aria-pressed', _resFilesKind === k ? 'true' : 'false');
      b.onclick = () => { _resFilesKind = k; renderMain(); };
      seg.appendChild(b);
    }
    const add = document.createElement('button'); add.type = 'button'; add.className = 'btn btn-primary btn-sm';
    add.innerHTML = icon('paperclip') + '<span>Attach…</span>';
    add.onclick = () => openAttachDialog({ links: [] });
    bar.append(fl, seg, add);
    page.appendChild(bar);
    const listEl = document.createElement('div'); listEl.className = 'res-page-list card';
    page.appendChild(listEl);
    const paint = () => {
      listEl.innerHTML = '';
      const rows = rsrcFilter(all, { q: _resFilesQuery, kind: _resFilesKind || undefined })
        .sort((a, b) => (!!b.pinned - !!a.pinned) || ((b.createdAt || 0) - (a.createdAt || 0)));
      if (!rows.length) {
        mountEmptyState(listEl, all.length
          ? { icon: 'search-x', title: 'Nothing matches', text: 'Try another word, or show all kinds.', compact: true }
          : { icon: 'paperclip', title: 'No files or links yet', text: 'Attach the folder of a project, a deck, a GitHub repo or a command you keep looking up. Open a task, a stream or a person and use Files & links, or attach here.', actions: [{ label: 'Attach…', icon: 'paperclip', primary: true, run: () => openAttachDialog({ links: [] }) }] });
        return;
      }
      for (const r of rows) listEl.appendChild(resRow(r, { showLinks: true }));
      resRefreshStatus(rows.map(r => r.id));
    };
    q.oninput = () => { _resFilesQuery = q.value; paint(); };
    q.onkeydown = (e) => { if (e.key === 'Escape') { q.value = ''; _resFilesQuery = ''; paint(); } };
    paint();
  },
});

registerSidebarBlock('tasks', {
  id: 'files', order: 12,
  render(el) {
    const n = resList().length;
    el.appendChild(sbNavItem({ label: 'Files & links', icon: 'paperclip', view: 'files', count: n || '' }));
  },
});

/* ---------- palette: Attach…, Open folder…, and resources by name ---------- */
registerCommand({
  id: 'res-attach', label: 'Attach…', icon: 'paperclip', group: 'Commands', keywords: 'file folder link github drive snippet attach paste path',
  run: () => { const l = resContextLink(); openAttachDialog({ links: l ? [l] : [] }); },
});
registerCommand({
  id: 'res-open-folder', label: 'Open folder…', icon: 'folder-open', group: 'Commands', keywords: 'folder explore explorer files',
  run: () => resOpenFolderDialog(),
});
registerCommand({ id: 'res-files', label: 'Files & links', icon: 'paperclip', group: 'Go to', keywords: 'files links resources attachments', run: () => setView('files') });
function resOpenFolderDialog() {
  const folders = resList().filter(r => r.kind === 'folder');
  if (!folders.length) { toast('No folders saved yet: attach one first', { action: { label: 'Attach…', run: () => openAttachDialog({ links: [] }) } }); return; }
  openDialog({
    title: 'Open folder', width: 520,
    body: (el, close) => {
      const f = document.createElement('label'); f.className = 'input'; f.innerHTML = icon('search');
      const q = document.createElement('input'); q.placeholder = 'Filter folders'; q.setAttribute('autofocus', ''); q.setAttribute('aria-label', 'Filter folders');
      f.appendChild(q); el.appendChild(f);
      const box = document.createElement('div'); box.className = 'res-pick-list'; el.appendChild(box);
      const paint = () => {
        box.innerHTML = '';
        for (const r of rsrcFilter(folders, { q: q.value }).slice(0, 60)) {
          const row = document.createElement('div'); row.className = 'res-pick-row';
          const b = document.createElement('button'); b.type = 'button'; b.className = 'res-pick';
          b.innerHTML = _resIconHtml(r) + `<span class="res-txt"><span class="res-name">${esc(rsrcDisplayLabel(r))}</span><span class="res-sub truncate">${esc(r.target)}</span></span>`;
          b.onclick = () => { close(); openExplorePanel(r.id); };
          const ex = document.createElement('button'); ex.type = 'button'; ex.className = 'btn btn-ghost btn-sm'; ex.innerHTML = icon('folder-open') + '<span>Explorer</span>';
          ex.onclick = () => { close(); resOpen(r.id); };
          row.append(b, ex);
          box.appendChild(row);
        }
      };
      q.oninput = paint; paint();
      q.onkeydown = (e) => { if (e.key === 'Enter') { const first = box.querySelector('.res-pick'); if (first) { e.preventDefault(); first.click(); } } };
    },
  });
}
registerPaletteSource((add, mode) => {
  if (mode !== '') return;
  for (const r of resList()) {
    add({
      group: 'Files', icon: rsrcIcon(r), label: rsrcDisplayLabel(r),
      keywords: [r.kind, r.lang, rsrcBaseName(r.target), r.note].filter(Boolean).join(' ').slice(0, 200),
      hint: rsrcKindLabel(r), run: () => resPrimary(r.id),
    });
  }
});
