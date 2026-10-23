/* ============================================================
   SETTINGS > Sync > "Main computer": which computer runs the automatic
   background jobs (bank updates, AI summaries and reviews, story scripts,
   calendar and email updates). Owner: Connections/Settings.
   Server: server/routes/main-computer.mjs (lib/main-computer.mjs).
   settingsMainComputerCard(el) is called by 58-settings-sync.js. The other
   computers show "Runs on <name>" (here and in the Start my day progress).
   ============================================================ */
let _mcSt = null, _mcLoading = false;

function _mcLoad(force) {
  if (_mcLoading || (_mcSt && !force)) return;
  _mcLoading = true;
  fetch('/api/main-computer', { cache: 'no-store' }).then(r => r.json()).then(j => { _mcSt = j; }).catch(() => { _mcSt = { error: true }; })
    .finally(() => { _mcLoading = false; if (state.view === 'settings:sync') renderMain(); });
}

function settingsMainComputerCard(el) {
  _mcLoad(false);
  const s = _mcSt;
  const c = _settingsCard('Main computer', 'One computer runs the automatic jobs, so your bank is not asked twice and Claude does not write the same summary on two computers. On the others they show "Runs on <name>". Anything you start with a click still runs where you click.');
  el.appendChild(c.card);
  if (!s) { c.body.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: 'Loading…' })); return; }
  if (s.error) { c.body.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: 'The OpenDash server is not running.' })); return; }
  const line = document.createElement('p'); line.className = 'set-h';
  line.textContent = !s.main ? 'No main computer is chosen: every computer runs its own jobs.' : s.isMain ? `This computer (${s.me.name}) is the main computer.` : `Runs on ${s.main.name}. This computer (${s.me.name}) leaves the automatic jobs to it.`;
  c.body.appendChild(line);
  const ul = document.createElement('ul'); ul.className = 'mv-devices';
  for (const d of s.computers || []) {
    const li = document.createElement('li');
    const isMain = s.main && s.main.id === d.id;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + (isMain ? 'btn-primary' : 'btn-secondary');
    b.innerHTML = icon(isMain ? 'crown' : 'monitor') + `<span>${esc(d.name || 'a computer')}</span>`;
    b.setAttribute('aria-pressed', isMain ? 'true' : 'false');
    b.disabled = !d.id;
    b.onclick = () => _mcSet(d.me ? 'this' : d.id);
    const meta = document.createElement('span'); meta.className = 'mv-me';
    meta.textContent = d.me ? 'this computer' : d.lastSeen ? 'seen ' + (typeof _sdWhen === 'function' ? _sdWhen(new Date(d.lastSeen).toISOString()) : '') : d.lastSeenMs != null ? `seen ${Math.round(d.lastSeenMs / 60000)} min ago` : '';
    li.append(b, meta);
    ul.appendChild(li);
  }
  c.body.appendChild(ul);
  if ((s.computers || []).length < 2) c.body.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: 'Only this computer is known so far. Others appear once OpenDash has run on them with sync on.' }));
  if (s.main && s.mode === 'local') c.body.appendChild(_settingsRow('No main computer', 'Every computer runs its own jobs again.', (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = 'Clear'; b.onclick = () => _mcSet(null); return b; })()));
  const jobs = document.createElement('dl'); jobs.className = 'kv set-kv';
  jobs.innerHTML = (s.jobs || []).map(j => `<dt>${esc(j.label)}</dt><dd>${esc(j.here ? 'here' : 'runs on ' + j.runsOn)}</dd>`).join('');
  c.body.appendChild(jobs);
}

async function _mcSet(id) {
  try {
    const r = await fetch('/api/main-computer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
    _mcSt = j;
    toast(j.main ? `${j.main.name} is the main computer` : 'Every computer runs its own jobs', { kind: 'ok' });
  } catch (e) { toast(e.message, { kind: 'err' }); }
  if (state.view === 'settings:sync') renderMain();
}
