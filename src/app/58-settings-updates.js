/* ============================================================
   SETTINGS > Updates: is there a newer OpenDash, and install it.
   Server side: server/routes/updates.mjs + lib/updater.mjs.
     status (what the last check found), Check now, Update to X (downloads the
     release, verifies its checksum, replaces the app files, rebuilds and
     restarts through srvRestart({post}) in 58-settings-server.js),
     "Check once a day" (off by default: the only thing OpenDash ever asks
     the internet for on its own, and only while this page is open).
   The check is a GET to the project's GitHub releases; nothing is sent.
   Palette: "Check for updates", "Update OpenDash".
   ============================================================ */
let _upStatus = null, _upBusy = false, _upError = '';

async function _upJson(url, opts) {
  const r = await fetch(url, Object.assign({ cache: 'no-store' }, opts || {}));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j && (j.error && (j.error.message || j.error))) || ('HTTP ' + r.status));
  return j;
}
const _upPost = (url, body) => _upJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
function _upRefresh() { if (state.view === 'settings:updates') renderMain(); }
function _upWhen(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...(typeof clockH12Opt === 'function' ? clockH12Opt() : {}), timeZone: Clock.zone() }); } catch (e) { return String(iso); }
}
/** What the page says about the last check (pure: tested). */
function upSummary(st) {
  if (!st) return { tone: 'idle', text: 'Reading…' };
  if (st.available) return { tone: 'new', text: `OpenDash ${st.latest.version} is available (you have ${st.current}).` };
  if (st.error) return { tone: 'err', text: st.error };
  if (st.upToDate) return { tone: 'ok', text: `You have the latest version (${st.current}).` };
  return { tone: 'idle', text: `You have ${st.current}. Not checked yet.` };
}
/** Is the once-a-day check due? (pure: tested) */
function upCheckDue(st, now) {
  if (!st || !st.auto) return false;
  const t = st.checkedAt ? Date.parse(st.checkedAt) : 0;
  return !(t && now - t < 24 * 3600 * 1000);
}

async function upLoad() {
  if (_upStatus) return _upStatus;
  try { _upStatus = await _upJson('/api/update/status'); _upError = ''; }
  catch (e) { _upError = netErrorMessage(e); }
  _upRefresh();
  return _upStatus;
}

/** Ask GitHub now. Resolves the new status (null when this server is not running). */
async function upCheck(opts) {
  if (_upBusy) return _upStatus;
  const quiet = !!(opts && opts.quiet);
  _upBusy = true; _upRefresh();
  try {
    _upStatus = await _upPost('/api/update/check', {}); _upError = '';
    if (!quiet) { const s = upSummary(_upStatus); toast(s.text, { kind: s.tone === 'err' ? 'err' : 'ok' }); }
  } catch (e) { _upError = netErrorMessage(e); if (!quiet) toast(_upError, { kind: 'err' }); }
  finally { _upBusy = false; _upRefresh(); }
  return _upStatus;
}

async function upInstall() {
  const st = _upStatus || await upLoad();
  if (!st || !st.available) { toast('There is no newer version to install. Check first.', { kind: 'info' }); return false; }
  if (!st.canApply) { toast(st.reason || 'This copy cannot update itself.', { kind: 'err', timeout: 9000 }); return false; }
  const how = st.kind === 'git'
    ? 'This moves the git checkout to the release tag, then rebuilds and restarts the server.'
    : 'This downloads the release, checks it against its published checksum, replaces the app files (the replaced ones are copied to the update-backup folder in your data folder first), then rebuilds and restarts the server.';
  const ok = await confirmDialog({
    title: `Update to OpenDash ${st.latest.version}?`,
    text: how + ' Your data folder is kept (it is backed up before any upgrade step). The page reloads when it is done.',
    confirmLabel: 'Update and restart',
  });
  if (!ok) return false;
  const done = await srvRestart({ rebuild: true, label: `Updating to ${st.latest.version}…`, post: ['/api/update/apply', { version: st.latest.version }] });
  _upStatus = null;
  return done;
}

function _upCard(el) {
  const st = _upStatus;
  const card = _settingsCard('OpenDash version', 'Updates come from the project’s GitHub releases. Checking sends nothing about you; it only asks GitHub for the newest release.');
  const sum = _upError ? { tone: 'err', text: _upError } : upSummary(st);
  const row = document.createElement('div'); row.className = 'up-status up-' + sum.tone; row.setAttribute('role', 'status');
  row.innerHTML = icon(sum.tone === 'new' ? 'download' : sum.tone === 'ok' ? 'circle-check' : sum.tone === 'err' ? 'circle-alert' : 'info') + `<span>${esc(sum.text)}</span>`;
  const btns = document.createElement('div'); btns.className = 'up-btns';
  const check = _ssBtn(_upBusy ? 'Checking…' : 'Check for updates', 'refresh-cw', 'btn-secondary', () => upCheck());
  check.disabled = _upBusy;
  btns.appendChild(check);
  if (st && st.available) {
    const go = _ssBtn(`Update to ${st.latest.version}`, 'download', 'btn-primary', () => upInstall());
    go.disabled = _upBusy || !st.canApply;
    btns.appendChild(go);
  }
  card.body.append(row, btns);
  if (st && st.available && st.reason) { const n = document.createElement('p'); n.className = 'set-h'; n.textContent = st.reason; card.body.appendChild(n); }
  if (st && st.checkedAt) { const n = document.createElement('p'); n.className = 'set-h'; n.textContent = 'Last checked ' + _upWhen(st.checkedAt) + '.'; card.body.appendChild(n); }
  el.appendChild(card.card);
}

function _upNotesCard(el) {
  const st = _upStatus;
  if (!st || !st.available || !st.latest) return;
  const card = _settingsCard(`What’s new in ${st.latest.version}`, st.latest.publishedAt ? 'Released ' + _upWhen(st.latest.publishedAt) : '');
  const pre = document.createElement('pre'); pre.className = 'up-notes'; pre.tabIndex = 0;
  pre.textContent = st.latest.notes || '(no release notes)';
  card.body.appendChild(pre);
  const a = document.createElement('a'); a.href = safeUrl(st.latest.url); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'set-h';
  a.textContent = 'Open the release on GitHub';
  card.body.appendChild(a);
  el.appendChild(card.card);
}

function _upAutoCard(el) {
  const st = _upStatus;
  const card = _settingsCard('Automatic checks');
  card.body.appendChild(_settingsRow('Check once a day', 'When on, this page asks GitHub for the newest release at most once a day while it is open, and tells you if there is one. Off by default: otherwise OpenDash never contacts the internet on its own for this.',
    _settingsSwitch(!!(st && st.auto), 'Check for updates once a day', async (v) => {
      try { _upStatus = await _upPost('/api/update/settings', { auto: v }); toast(v ? 'Will check once a day' : 'Automatic checks off', { kind: 'ok' }); }
      catch (e) { toast(netErrorMessage(e), { kind: 'err' }); }
      _upRefresh();
    }, !st)));
  if (st) card.body.appendChild(_settingsRow('This copy', st.kind === 'git' ? 'A git checkout: updating moves it to the release tag (it refuses when tracked files are changed).' : 'Installed from a release zip: updating replaces the app files and keeps your data folder.', null));
  el.appendChild(card.card);
}

registerSettingsGroup({
  id: 'updates', title: 'Updates', icon: 'download', order: 93,
  description: 'Check for a newer OpenDash and install it.',
  render(el) {
    upLoad();
    _upCard(el);
    _upNotesCard(el);
    _upAutoCard(el);
  },
});

registerCommand({ id: 'update-check', label: 'Check for updates', icon: 'download', keywords: 'update upgrade new version release check latest', run: () => { setView('settings:updates'); upCheck(); } });
registerCommand({ id: 'update-install', label: 'Update OpenDash', icon: 'download', keywords: 'update upgrade install new version release', run: async () => { const st = await upCheck({ quiet: true }); if (st && st.available) upInstall(); else toast(upSummary(st).text, { kind: 'info' }); } });

/* After an update reloads the page: say what happened. Once a day when the
   switch is on: look quietly and tell the user (it never installs by itself). */
if (typeof window !== 'undefined') window.addEventListener('load', () => {
  try {
    const raw = sessionStorage.getItem('dashboard-updated');
    if (raw) {
      sessionStorage.removeItem('dashboard-updated');
      const u = JSON.parse(raw);
      if (u && u.to) setTimeout(() => toast(`OpenDash updated to ${u.to}`, { kind: 'ok', timeout: 8000 }), 900);
    }
  } catch (e) { /* fine */ }
  setTimeout(async () => {
    try {
      const st = await _upJson('/api/update/status');
      if (!upCheckDue(st, Date.now())) return;
      const fresh = await upCheck({ quiet: true });
      if (fresh && fresh.available) toast(`OpenDash ${fresh.latest.version} is available`, { icon: 'download', timeout: 12000, action: { label: 'View', run: () => setView('settings:updates') } });
    } catch (e) { /* offline or no server: nothing to say */ }
  }, 6000);
}, { once: true });
