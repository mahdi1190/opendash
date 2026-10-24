/* ============================================================
   SETTINGS > Sync > More > "Main computer" (and, with sync off, its own card): which computer runs the automatic
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
  const c = _settingsCard('Main computer', 'Checks mail, calendar and bank, and runs Claude jobs. Another takes over when it sleeps.');
  el.appendChild(c.card);
  if (!s) { c.body.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: 'Loading…' })); return; }
  if (s.error) { c.body.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: "OpenDash isn't answering." })); return; }
  const line = document.createElement('p'); line.className = 'set-h';
  line.textContent = !s.main ? 'Every computer runs its own automatic jobs.' : s.isMain ? `This computer (${s.me.name}) runs the automatic jobs.` : `${s.main.name} runs the automatic jobs; this computer leaves them to it.`;
  c.body.appendChild(line);
  const ul = document.createElement('ul'); ul.className = 'mv-devices';
  for (const d of s.computers || []) {
    const li = document.createElement('li');
    const isMain = s.main && s.main.id === d.id;
    const b = uiButton({ label: d.name || 'A computer', icon: isMain ? 'crown' : 'monitor', kind: isMain ? 'primary' : 'secondary', size: 'sm', pressed: isMain, disabled: !d.id, bubble: true, run: () => _mcSet(d.me ? 'this' : d.id) });
    const meta = document.createElement('span'); meta.className = 'mv-me';
    meta.textContent = d.me ? 'this computer' : d.lastSeen ? 'seen ' + (typeof _sdWhen === 'function' ? _sdWhen(new Date(d.lastSeen).toISOString()) : '') : d.lastSeenMs != null ? `seen ${Math.round(d.lastSeenMs / 60000)} min ago` : '';
    li.append(b, meta);
    ul.appendChild(li);
  }
  c.body.appendChild(ul);
  if ((s.computers || []).length < 2) c.body.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: 'Only this computer so far.' }));
  if (s.main && s.mode === 'local') c.body.appendChild(_settingsRow('No main computer', 'Every computer runs its own jobs again.', uiButton({ label: 'Clear', kind: 'ghost', size: 'sm', bubble: true, run: () => _mcSet(null) })));
  const jobs = document.createElement('dl'); jobs.className = 'kv set-kv';
  jobs.innerHTML = (s.jobs || []).map(j => `<dt>${esc(j.label)}</dt><dd>${esc(j.here ? 'here' : 'runs on ' + j.runsOn)}</dd>`).join('');
  c.body.appendChild(jobs);
}

/** Advanced > Which computer does what (2.17.1): the automatic jobs and where each runs (Settings > Sync > More picks the main computer). */
function settingsMainComputerJobs(el) {
  _mcLoad(false);
  const s = _mcSt;
  if (!s || s.error || !(s.jobs || []).length) return;
  const jobs = document.createElement('dl'); jobs.className = 'kv set-kv';
  jobs.innerHTML = (s.jobs || []).map(j => `<dt>${esc(j.label)}</dt><dd>${esc(j.here ? 'this computer' : j.runsOn)}</dd>`).join('');
  el.appendChild(_settingsRow('Automatic jobs', '', jobs));
}

async function _mcSet(id) {
  try {
    const r = await fetch('/api/main-computer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
    _mcSt = j;
    toast(j.main ? `${j.main.name} is the main computer` : 'Every computer runs its own jobs', { kind: 'ok' });
  } catch (e) { toastError('change the main computer', e, () => _mcSet(id)); }
  if (state.view === 'settings:sync') renderMain();
}
