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
  } catch (e) { _upError = netErrorMessage(e); if (!quiet) toastError('check for updates', e, () => upCheck()); }
  finally { _upBusy = false; _upRefresh(); }
  return _upStatus;
}

async function upInstall() {
  const st = _upStatus || await upLoad();
  if (!st || !st.available) { toast('No newer version yet. Check for updates first.', { kind: 'info' }); return false; }
  if (!st.canApply) { toast(st.reason || 'This copy cannot update itself.', { kind: 'err', timeout: 9000 }); return false; }
  const how = 'OpenDash downloads it, checks it, keeps a copy of the old files and restarts. Your data stays as it is. About a minute.';
  // One decision with everything on it: what is new, what happens, and Not now.
  const ok = await _upAsk(st, how);
  if (!ok) return false;
  const done = await srvRestart({ rebuild: true, label: `Updating to ${st.latest.version}…`, post: ['/api/update/apply', { version: st.latest.version }] });
  _upStatus = null;
  return done;
}

/** The release notes as text (trimmed to `max` lines, with a note when cut). */
function _upNotesText(latest, max) {
  const lines = String((latest && latest.notes) || '').replace(/\r/g, '').split('\n');
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) return '(no release notes)';
  return max && lines.length > max ? lines.slice(0, max).join('\n') + '\n…' : lines.join('\n');
}
/** "Update to X?" with the release notes in it. Resolves true to go ahead. */
function _upAsk(st, how) {
  return new Promise((resolve) => {
    let answered = false;
    openDialog({
      title: `Update to OpenDash ${st.latest.version}?`, size: 'md', fixed: true, resizeKey: 'update-ask',
      body: (el) => {
        const h = document.createElement('h3'); h.className = 'up-ask-h'; h.textContent = `What’s new in ${st.latest.version}`;
        const pre = document.createElement('pre'); pre.className = 'up-notes'; pre.tabIndex = 0; pre.textContent = _upNotesText(st.latest, 40);
        const p = document.createElement('p'); p.className = 'muted'; p.textContent = how;
        el.append(h, pre, p);
      },
      actions: [
        { label: 'Not now', run: () => { answered = true; resolve(false); } },
        { label: 'Update and restart', icon: 'download', primary: true, run: () => { answered = true; resolve(true); } },
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}
/** The release notes on their own (after an update: "What's new"). */
async function upShowNotes() {
  const st = _upStatus || await upLoad();
  const latest = st && st.latest;
  if (!latest || !latest.notes) { setView('settings:updates'); return; }
  openDialog({
    title: `What’s new in OpenDash ${latest.version}`, size: 'md', fixed: true, resizeKey: 'update-notes',
    body: (el) => {
      const pre = document.createElement('pre'); pre.className = 'up-notes'; pre.tabIndex = 0; pre.textContent = _upNotesText(latest, 0);
      el.appendChild(pre);
      if (latest.url) { const a = document.createElement('a'); a.href = safeUrl(latest.url); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'set-h'; a.textContent = 'Open the release on GitHub'; el.appendChild(a); }
    },
    actions: [{ label: 'Close', primary: true }],
  });
}

function _upCard(el) {
  const st = _upStatus;
  const card = _settingsCard('OpenDash version');
  if (_upError) card.body.appendChild(setStatusLine('warn', 'Needs you', _upError));
  else if (!st) card.body.appendChild(setStatusLine('idle', 'Checking', ''));
  else if (st.available) card.body.appendChild(setStatusLine('busy', 'Update available', `${st.latest.version} (you have ${st.current})`));
  else if (st.error) card.body.appendChild(setStatusLine('warn', 'Needs you', st.error));
  else if (st.upToDate) card.body.appendChild(setStatusLine('ok', 'Up to date', `OpenDash ${st.current}`));
  else card.body.appendChild(setStatusLine('idle', 'Not checked yet', `OpenDash ${st.current}`));
  card.body.appendChild(_settingsRow('', 'Checking sends nothing about you.', null));
  if (st && st.available) setAction(card, st.canApply ? 'Update and restart' : `Update to ${st.latest.version}`, () => upInstall(), { icon: 'download', disabled: _upBusy || !st.canApply });
  else setAction(card, _upBusy ? 'Checking…' : 'Check for updates', () => upCheck(), { icon: 'refresh-cw', disabled: _upBusy });
  if (st && st.available && st.reason) { const n = document.createElement('p'); n.className = 'set-h'; n.textContent = st.reason; card.body.appendChild(n); }
  setFold(card, 'updates-card-more', 'More', ({ body }) => {
    if (st && st.available) body.appendChild(_settingsRow('Check again', '', _ssBtn(_upBusy ? 'Checking…' : 'Check for updates', 'refresh-cw', 'btn-secondary', () => upCheck())));
    if (st && st.checkedAt) body.appendChild(_settingsRow('Last checked', _upWhen(st.checkedAt), null));
  });
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
  card.body.appendChild(_settingsRow('Check once a day', 'Asks GitHub once a day while OpenDash is open. It only tells you; it never installs.',
    _settingsSwitch(!!(st && st.auto), 'Check for updates once a day', async (v) => {
      try { _upStatus = await _upPost('/api/update/settings', { auto: v }); toast(v ? 'Will check once a day' : 'Automatic checks off', { kind: 'ok' }); }
      catch (e) { toastError('save that', e); }   // the switch shows the old state again: flip it to retry
      _upRefresh();
    }, !st)));
  if (st) setFold(card, 'updates-auto-adv', 'Advanced', ({ body }) => body.appendChild(_settingsRow('This copy', st.kind === 'git' ? 'Installed from source: updating moves it to the release, and refuses when files are changed.' : 'Installed from a release zip: updating replaces the app files and keeps your data folder.', null)), { advanced: true });
  el.appendChild(card.card);
}

registerSettingsGroup({
  id: 'updates', title: 'Updates', icon: 'download', order: 93,
  description: 'Get the newest OpenDash.',
  search: [
    { label: 'OpenDash version', target: 'OpenDash version', description: 'Check for updates and install a newer release.', keywords: 'upgrade github update release install latest rollback' },
    { label: 'Check once a day', target: 'Check once a day', description: 'Choose whether to check for updates automatically.', keywords: 'automatic check daily' },
    { label: 'This copy', target: 'This copy', description: 'How this app copy was installed and updated.', keywords: 'zip git installed source' },
  ],
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
      if (u && u.to) setTimeout(() => toast(`OpenDash updated to ${u.to}`, { kind: 'ok', timeout: 10000, action: { label: 'What’s new', run: () => upShowNotes() } }), 900);
    }
  } catch (e) { /* fine */ }
  setTimeout(async () => {
    try {
      const st = await _upJson('/api/update/status');
      if (!upCheckDue(st, Date.now())) return;
      const fresh = await upCheck({ quiet: true });
      // One click from the toast: the update dialog (what's new, Update and restart, Not now).
      if (fresh && fresh.available) toast(`OpenDash ${fresh.latest.version} is available`, { icon: 'download', timeout: 12000, action: { label: fresh.canApply ? 'See what’s new' : 'View', run: () => (fresh.canApply ? upInstall() : setView('settings:updates')) } });
    } catch (e) { /* offline or no server: nothing to say */ }
  }, 6000);
}, { once: true });
