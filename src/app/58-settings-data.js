/* ============================================================
   SETTINGS > Data and Diagnostics. Owner: Connections/Settings.
   Server side: server/routes/settings.mjs (lib/sharing.mjs).
     data folder, backups + restore, export/import of all data (moving
     computers), a clean JSON export, a clean copy of the APP for sharing,
     reset (backup first, typed confirmation), diagnostics with no
     personal content.
   ============================================================ */
let _sdInfo = null, _sdBackups = null, _sdShowAll = false, _sdDiag = null;

async function _sdJson(url, opts) {
  const r = await fetch(url, Object.assign({ cache: 'no-store' }, opts || {}));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}
function _sdWhen(iso) {
  try { return new Date(iso).toLocaleString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; }
}
function _sdSize(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
function _sdBtn(label, ic, cls, run) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || 'btn-secondary') + ' btn-sm';
  b.innerHTML = (ic ? icon(ic) : '') + `<span>${esc(label)}</span>`;
  b.onclick = () => run(b);
  return b;
}
function _sdLink(label, ic, href) {
  const a = document.createElement('a'); a.className = 'btn btn-secondary btn-sm'; a.href = href; a.setAttribute('download', '');
  a.innerHTML = icon(ic) + `<span>${esc(label)}</span>`;
  return a;
}
function _sdRefresh() { if (state.view === 'settings:data' || state.view === 'settings:diagnostics') renderMain(); }

/** A JSON file of the data only: no view, theme, caches or bookkeeping. */
function settingsCleanJsonExport() {
  const src = typeof _stateForPersist === 'function' ? _stateForPersist() : state;
  const skip = new Set([...(typeof UI_STATE_KEYS !== 'undefined' ? UI_STATE_KEYS : []), '_lastSave', '_saveCount', '_localDirty']);
  const out = { exportedAt: new Date().toISOString(), app: 'dashboard', kind: 'state' };
  for (const k of Object.keys(src)) if (!skip.has(k) && !/^_(cowork|sync|oneDrive|seed|overrides)/i.test(k)) out[k] = src[k];
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `opendash-data-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Exported your data as JSON', { kind: 'ok' });
}

async function _sdRestore(b) {
  let info = null;
  try { info = await _sdJson('/api/settings/backups/info?name=' + encodeURIComponent(b.name)); } catch (e) { toast(e.message, { kind: 'err' }); return; }
  const now = Array.isArray(state.custom) ? state.custom.length : 0;
  const ok = await confirmDialog({
    title: 'Restore this backup?',
    text: `Backup from ${_sdWhen(info.savedAt || b.at)}: ${info.tasks} tasks (you have ${now} now). Your current data is saved as a backup first, so this can be undone by restoring that one.`,
    confirmLabel: 'Restore',
  });
  if (!ok) return;
  try {
    await _sdJson('/api/settings/backups/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: b.name }) });
    toast('Restored. Loading it…', { kind: 'ok' });
    setTimeout(() => location.reload(), 600);
  } catch (e) { toast('Restore failed: ' + e.message, { kind: 'err' }); }
}

function _sdPickZip() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.zip,application/zip';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    let prev;
    try {
      prev = await _sdJson('/api/settings/import-data?dryRun=1', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: f });
    } catch (e) { toast('That file cannot be imported: ' + e.message, { kind: 'err' }); return; }
    const bits = [prev.tasks != null ? `${prev.tasks} tasks` : null, prev.people != null ? `${prev.people} people` : null,
      prev.financeFiles ? `${prev.financeFiles} finance files` : null, prev.hasConfig ? 'your settings' : null].filter(Boolean).join(', ');
    const ok = await confirmDialog({
      title: 'Replace your data with this export?',
      text: `${f.name}${prev.savedAt ? ' (saved ' + _sdWhen(prev.savedAt) + ')' : ''} holds ${bits || 'no recognisable data'}. Your current data folder is copied to backups first.`,
      confirmLabel: 'Import and replace', danger: true,
    });
    if (!ok) return;
    try {
      await _sdJson('/api/settings/import-data', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: f });
      toast('Imported. Loading it…', { kind: 'ok' });
      setTimeout(() => location.reload(), 700);
    } catch (e) { toast('Import failed: ' + e.message, { kind: 'err' }); }
  };
  inp.click();
}

function _sdReset() {
  let input = null, fin = null, go = null;
  openDialog({
    title: 'Reset app data', width: 480,
    body: (el) => {
      const p = document.createElement('p'); p.className = 'muted';
      p.textContent = 'This empties your tasks, people, countdowns and settings and shows the welcome set-up again. A full copy of your data folder is kept in backups first.';
      const lab = document.createElement('label'); lab.className = 'toggle-row';
      fin = document.createElement('input'); fin.type = 'checkbox';
      lab.append(fin, document.createTextNode(' Also clear finance data (your spending pipeline and rules are kept)'));
      const f = document.createElement('label'); f.className = 'field';
      const s = document.createElement('span'); s.className = 'field-label'; s.textContent = 'Type RESET to confirm';
      input = document.createElement('input'); input.className = 'control'; input.autocomplete = 'off'; input.setAttribute('autofocus', '');
      input.oninput = () => { if (go) go.disabled = input.value !== 'RESET'; };
      f.append(s, input);
      el.append(p, lab, f);
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Reset everything', danger: true, run: () => {
        if (!input || input.value !== 'RESET') { if (input) { input.classList.add('is-invalid'); input.focus(); } return false; }
        _sdJson('/api/settings/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'RESET', includeFinance: !!(fin && fin.checked) }) })
          .then((r) => {
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
            toast('Reset. Your old data is in backups (' + r.backup + ').', { kind: 'ok' });
            setTimeout(() => { location.hash = ''; location.reload(); }, 900);
          })
          .catch(e => toast('Reset failed: ' + e.message, { kind: 'err' }));
      } },
    ],
  });
  setTimeout(() => { go = document.querySelector('.modal-f .btn-danger'); if (go) go.disabled = true; }, 0);
}

registerSettingsGroup({
  id: 'data', title: 'Data', icon: 'database', order: 90,
  description: 'Everything you own lives in one data folder on this computer. Backups and exports are plain files.',
  render(el) {
    if (!_sdInfo) { _sdJson('/api/settings/info').then(j => { _sdInfo = j; _sdRefresh(); }).catch(() => { _sdInfo = { error: true }; _sdRefresh(); }); }
    if (!_sdBackups) { _sdJson('/api/settings/backups').then(j => { _sdBackups = j.backups || []; _sdRefresh(); }).catch(() => { _sdBackups = []; _sdRefresh(); }); }
    const folder = document.createElement('div'); folder.className = 'set-path';
    const code = document.createElement('code'); code.textContent = _sdInfo && _sdInfo.dataDir ? _sdInfo.dataDir : (_sdInfo && _sdInfo.error ? 'The OpenDash server is not running.' : 'Loading…');
    folder.appendChild(code);
    if (_sdInfo && _sdInfo.dataDir) {
      const cp = _sdBtn('Copy', 'copy', 'btn-ghost', async () => { try { await navigator.clipboard.writeText(_sdInfo.dataDir); toast('Copied', { kind: 'ok' }); } catch (e) { /* ignore */ } });
      folder.appendChild(cp);
    }
    const fr = _settingsRow('Data folder', 'To move it, start the app with --data-dir <folder> or set DASHBOARD_DATA_DIR. Keep it out of any public repository.', null);
    fr.classList.add('set-row-stack'); fr.appendChild(folder);
    el.appendChild(fr);

    // Backups
    const bk = _settingsCard('Backups', 'Made automatically when your data changes (at most every 10 minutes, plus one a day for 30 days).');
    const bt = document.createElement('div'); bt.className = 'btn-group set-btns';
    bt.append(
      _sdBtn('Back up now', 'download', 'btn-secondary', async (b) => {
        b.disabled = true;
        try { const r = await _sdJson('/api/settings/backups/now', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); toast('Backed up (' + r.name + ')', { kind: 'ok' }); _sdBackups = null; _sdRefresh(); }
        catch (e) { toast(e.message, { kind: 'err' }); }
        b.disabled = false;
      }),
      _sdBtn('Download a copy', 'file-down', 'btn-ghost', () => downloadBackup(false)),
      _sdBtn('Restore a downloaded copy…', 'upload', 'btn-ghost', () => document.getElementById('import-file').click()));
    bk.body.appendChild(bt);
    if (_sdBackups && _sdBackups.length) {
      const tbl = document.createElement('table'); tbl.className = 'table set-table';
      tbl.innerHTML = '<thead><tr><th>Saved</th><th>Kind</th><th class="num">Size</th><th></th></tr></thead>';
      const tb = document.createElement('tbody');
      for (const b of _sdBackups.slice(0, _sdShowAll ? 200 : 6)) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${esc(_sdWhen(b.at))}</td><td class="subtle">${esc(b.kind)}</td><td class="num subtle">${esc(_sdSize(b.size))}</td><td class="num"></td>`;
        tr.lastChild.appendChild(_sdBtn('Restore', 'rotate-ccw', 'btn-ghost', () => _sdRestore(b)));
        tb.appendChild(tr);
      }
      tbl.appendChild(tb);
      bk.body.appendChild(tbl);
      if (_sdBackups.length > 6) bk.body.appendChild(_sdBtn(_sdShowAll ? 'Show fewer' : `Show all ${_sdBackups.length}`, null, 'btn-ghost', () => { _sdShowAll = !_sdShowAll; _sdRefresh(); }));
    } else {
      const p = document.createElement('p'); p.className = 'set-h'; p.textContent = _sdBackups ? 'No backups yet: the first one is made after your next change.' : 'Loading backups…';
      bk.body.appendChild(p);
    }
    el.appendChild(bk.card);

    // Move to another computer
    const mv = _settingsCard('Export and import', 'Moving to another computer: export everything here, then import it there. Connections and sign-ins are set up again on the new computer.');
    const g = document.createElement('div'); g.className = 'btn-group set-btns';
    g.append(_sdLink('Export all data (.zip)', 'file-down', '/api/settings/export-data'),
      _sdBtn('Import data (.zip)…', 'file-up', 'btn-secondary', () => _sdPickZip()),
      _sdBtn('Export as JSON', 'file-text', 'btn-ghost', () => settingsCleanJsonExport()),
      _sdBtn('Export tasks as Markdown', 'file-down', 'btn-ghost', () => exportMarkdown()));
    mv.body.appendChild(g);
    el.appendChild(mv.card);

    // Share the app
    const sh = _settingsCard('Share the app', 'A clean copy of the app for someone else: no data folder, no settings, logs, sign-ins or secrets. They unzip it, start it, and connect their own Claude.');
    sh.body.appendChild(_sdLink('Export a clean copy of the app (.zip)', 'download', '/api/settings/export-app'));
    el.appendChild(sh.card);

    // Danger zone
    const dz = _settingsCard('Start over');
    dz.card.classList.add('set-danger');
    dz.body.appendChild(_settingsRow('Reset app data', 'Empties the dashboard and shows the welcome set-up. Your data folder is backed up first.',
      _sdBtn('Reset app data…', 'trash-2', 'btn-danger', () => _sdReset())));
    el.appendChild(dz.card);
  },
});

registerSettingsGroup({
  id: 'diagnostics', title: 'Diagnostics', icon: 'gauge', order: 95,
  description: 'For fixing problems. The copied text has no task content, names, addresses or money in it.',
  render(el) {
    if (!_sdDiag) {
      _sdJson('/api/settings/diagnostics').then(j => { _sdDiag = j; _sdRefresh(); }).catch(e => { _sdDiag = { error: e.message }; _sdRefresh(); });
      for (let i = 0; i < 3; i++) { const s = document.createElement('div'); s.className = 'skeleton skeleton-row'; el.appendChild(s); }
      return;
    }
    if (_sdDiag.error) { mountEmptyState(el, { icon: 'circle-alert', title: 'Diagnostics unavailable', text: _sdDiag.error, compact: true }); return; }
    const d = _sdDiag;
    const top = document.createElement('div'); top.className = 'btn-group set-btns';
    top.append(_sdBtn('Copy diagnostics', 'copy', 'btn-secondary', async () => {
      const extra = `\nBrowser: ${navigator.userAgent}\nScreen: ${window.innerWidth}x${window.innerHeight} · theme ${state.theme} · reduced motion ${window.Motion && Motion.prefersReduced() ? 'on' : 'off'}`;
      try { await navigator.clipboard.writeText(d.text + '\n' + extra); toast('Copied diagnostics', { kind: 'ok' }); } catch (e) { toast('Could not copy.', { kind: 'err' }); }
    }), _sdBtn('Refresh', 'refresh-cw', 'btn-ghost', () => { _sdDiag = null; _sdRefresh(); }));
    el.appendChild(top);
    const dl = document.createElement('dl'); dl.className = 'kv set-kv';
    const rows = [['App', `${d.app.version} · port ${d.app.port} · up ${d.app.uptimeMin} min`], ['Node', d.app.node], ['System', d.app.platform],
      ['Data folder', d.data.folder], ['State', d.data.stateExists ? `${d.data.stateSizeKb} KB · ${d.data.taskCount ?? '?'} tasks` : 'none yet'],
      ['Finances', d.data.financeAvailable ? 'set up' : 'not set up'], ['Migrations', (d.data.migrations || []).join(', ') || 'none'],
      ['AI queue', d.queue ? `${d.queue.running} running · ${d.queue.waiting} waiting · ${d.queue.failed} failed since start` : '-']];
    dl.innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    el.appendChild(dl);
    const ct = document.createElement('table'); ct.className = 'table set-table';
    ct.innerHTML = '<thead><tr><th>Connection</th><th>Status</th><th>Checked</th><th>Last message</th></tr></thead>';
    const tb = document.createElement('tbody');
    for (const [id, c] of Object.entries(d.connections || {})) {
      const tr = document.createElement('tr');
      const label = { claude: 'Claude', gmail: 'Gmail', calendar: 'Google Calendar', bank: 'Bank', mcp: 'OpenDash MCP', google: 'Google (direct)' }[id] || id;
      const st = String(c.status || 'unknown');
      const tone = /^(ok|connected)$/i.test(st) ? 'ok' : /auth|limit|sign/i.test(st) ? 'warn' : /err|fail/i.test(st) ? 'err' : 'off';
      const stLabel = st.charAt(0).toUpperCase() + st.slice(1).replace(/[-_]/g, ' ');
      tr.innerHTML = `<td>${esc(label)}</td><td><span class="status ${tone}">${esc(stLabel)}</span>${c.code ? ` <span class="subtle">(${esc(c.code)})</span>` : ''}</td><td class="subtle">${esc(c.checkedAt ? _sdWhen(c.checkedAt) : 'never')}</td><td class="subtle set-msg">${esc(c.message || '')}</td>`;
      tb.appendChild(tr);
    }
    ct.appendChild(tb);
    el.appendChild(ct);
    const lh = document.createElement('div'); lh.className = 'set-t set-log-h'; lh.textContent = 'Recent server log';
    const pre = document.createElement('pre'); pre.className = 'set-log'; pre.textContent = (d.log || []).join('\n') || '(empty)';
    el.append(lh, pre);
  },
});

registerCommand({ id: 'export-app-copy', label: 'Export a clean copy of the app', icon: 'download', keywords: 'share zip someone else clean copy', run: () => { location.href = '/api/settings/export-app'; } });
registerCommand({ id: 'export-all-data', label: 'Export all data (.zip)', icon: 'file-down', keywords: 'backup move computer zip', run: () => { location.href = '/api/settings/export-data'; } });
registerCommand({ id: 'open-diagnostics', label: 'Diagnostics', icon: 'gauge', group: 'Go to', keywords: 'debug log problem help version', run: () => setView('settings:diagnostics') });
registerCommand({ id: 'open-data-settings', label: 'Backups and data', icon: 'database', group: 'Go to', keywords: 'backup restore import export reset data folder', run: () => setView('settings:data') });
