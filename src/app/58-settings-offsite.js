/* ============================================================
   SETTINGS > Data > "Daily encrypted copy" (off-site backup).
   Owner: Connections/Settings. Server: server/routes/offsite-backup.mjs
   (lib/offsite-backup.mjs). settingsOffsiteCard(el) is called by
   58-settings-data.js. Once a day a LOCKED copy of your data goes to
   OneDrive/OpenDash Backups (or a folder you choose); the newest 14 are kept;
   any of them can be restored here (or on a new computer, with the passphrase).
   ============================================================ */
let _obInfo = null, _obLoading = false, _obLook = '';

async function _obJson(url, body) {
  const r = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || ('HTTP ' + r.status)), { status: r.status, code: j.code });
  return j;
}
function _obLoad(force) {
  if (_obLoading || (_obInfo && !force)) return;
  _obLoading = true;
  _obJson('/api/backup/offsite' + (_obLook ? '?folder=' + encodeURIComponent(_obLook) : '')).then(j => { _obInfo = j; }).catch(() => { _obInfo = { error: true }; })
    .finally(() => { _obLoading = false; if (typeof _sdRefresh === 'function') _sdRefresh(); });
}
function _obField(label, value, opts) {
  const f = document.createElement('label'); f.className = 'field';
  const s = document.createElement('span'); s.className = 'field-label'; s.textContent = label;
  const i = document.createElement('input'); i.className = 'control'; i.value = value || ''; i.spellcheck = false;
  if (opts && opts.password) { i.type = 'password'; i.autocomplete = 'new-password'; }
  f.append(s, i);
  return { f, i };
}

function settingsOffsiteCard(el) {
  _obLoad(false);
  const i = _obInfo;
  const c = _settingsCard('Daily encrypted copy');
  el.appendChild(c.card);
  if (!i) { c.body.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: 'Loading…' })); return; }
  if (i.error) { c.body.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: 'Freeflo isn’t answering.' })); return; }
  const when = (iso) => (typeof _sdWhen === 'function' ? _sdWhen(iso) : iso);
  if (!i.enabled) {
    c.body.appendChild(setStatusLine('off', 'Off', ''));
    c.body.appendChild(_settingsRow('', 'One encrypted copy a day in a cloud folder, in case this computer breaks.', null));
    const fold = _obField('Folder for the copies', i.folder || i.suggestedFolder || '');
    const p1 = _obField('Passphrase (at least 10 characters; a few words is easiest)', '', { password: true });
    const p2 = _obField('The same passphrase again', '', { password: true });
    const warn = Object.assign(document.createElement('p'), { className: 'set-h', textContent: 'Write it down: without it nobody can open the copies.' });
    const go = _sdBtn('Switch on the daily copy', 'shield-check', 'btn-primary', async (b) => {
      if (p1.i.value !== p2.i.value) { toast('The two passphrases are not the same', { kind: 'err' }); return; }
      b.disabled = true;
      try {
        _obInfo = Object.assign({}, _obInfo, await _obJson('/api/backup/offsite/settings', { folder: fold.i.value.trim(), passphrase: p1.i.value, enabled: true }));
        toast('Switched on', { kind: 'ok' });
        await _obJson('/api/backup/offsite/now', {}).then(() => toast('Copy saved', { kind: 'ok' })).catch(e => toastError('make the first copy', e));
      } catch (e) { toastError('switch it on', e); }
      b.disabled = false; _obLoad(true);
    });
    c.body.append(fold.f, p1.f, p2.f, warn);
    if (i.canUseRecoveryKey) c.body.appendChild(_sdBtn('Use my recovery code instead', 'key-round', 'btn-ghost', async () => {
      try { await _obJson('/api/backup/offsite/settings', { folder: fold.i.value.trim(), useRecoveryKey: true, enabled: true }); await _obJson('/api/backup/offsite/now', {}); toast('Switched on', { kind: 'ok' }); } catch (e) { toastError('switch it on', e); }
      _obLoad(true);
    }));
    c.body.appendChild(go);
  } else {
    c.body.appendChild(i.lastResult === 'error'
      ? setStatusLine('warn', 'Needs you', `The last try failed (${when(i.lastRunAt)}); it tries again every half hour`)
      : i.lastResult === 'ok' ? setStatusLine('ok', 'On', `last copy ${when(i.lastRunAt)}`) : setStatusLine('busy', 'On', 'the first copy is made within a few minutes'));
    setAction(c, 'Make a copy now', async (e, b) => { try { await _obJson('/api/backup/offsite/now', {}); toast('Copy saved', { kind: 'ok' }); } catch (err) { toastError('make a copy', err, () => b.click()); } _obLoad(true); }, { icon: 'download', kind: 'secondary', wait: true });
    setFold(c, 'data-offsite-more', 'More', ({ body }) => {
      body.appendChild(_settingsRow('Copies go to', `${i.folder} · locked with ${i.lock === 'recovery' ? 'your recovery code' : 'your passphrase'}.`, null));
      const g = document.createElement('div'); g.className = 'btn-group set-btns';
      g.append(
        _sdBtn('Change the passphrase…', 'key-round', 'ghost', () => _obPassDialog()),
        _sdBtn('Switch off', 'x', 'ghost', async () => { try { await _obJson('/api/backup/offsite/settings', { enabled: false }); toast('Switched off. The copies already made are kept', { kind: 'ok' }); } catch (e) { toastError('switch it off', e); } _obLoad(true); }));
      body.appendChild(g);
    });
  }
  // The copies, and restoring one
  const look = _obField('Look for copies in another folder (for example on a new computer)', _obLook || '');
  const lb = _sdBtn('Look', 'folder-search', 'btn-ghost', () => { _obLook = look.i.value.trim(); _obLoad(true); });
  const lr = document.createElement('div'); lr.className = 'btn-group'; lr.append(look.f, lb);
  const list = i.backups || [];
  if (list.length) {
    const tbl = document.createElement('table'); tbl.className = 'table set-table';
    tbl.innerHTML = '<thead><tr><th>Day</th><th>Computer</th><th class="num">Size</th><th></th></tr></thead>';
    const tb = document.createElement('tbody');
    for (const b of list.slice(0, 14)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(b.date)}</td><td class="subtle">${esc(b.host)}</td><td class="num subtle">${esc(_sdSize(b.size))}</td><td class="num"></td>`;
      tr.lastChild.appendChild(_sdBtn('Restore…', 'archive-restore', 'btn-ghost', () => _obRestoreDialog(b, i.looked || null)));
      tb.appendChild(tr);
    }
    tbl.appendChild(tb);
    c.body.appendChild(tbl);
  } else if (i.enabled || _obLook) c.body.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: _obLook ? 'No copies in that folder.' : 'No copies yet.' }));
  c.body.appendChild(lr);
}

function _obPassDialog() {
  let a = null, b = null;
  openDialog({
    title: 'Change the passphrase', size: 'sm',
    body: (el) => {
      el.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: 'New copies use the new passphrase. Copies made before keep the old one: keep a note of both until the old copies are gone (14 days).' }));
      a = _obField('New passphrase', '', { password: true }); b = _obField('The same again', '', { password: true });
      el.append(a.f, b.f);
    },
    actions: [{ label: 'Cancel' }, { label: 'Change', primary: true, run: () => {
      if (a.i.value !== b.i.value) { toast('The two passphrases are not the same', { kind: 'err' }); return false; }
      _obJson('/api/backup/offsite/settings', { passphrase: a.i.value }).then(() => { toast('Passphrase changed', { kind: 'ok' }); _obLoad(true); }).catch(e => toastError('change the passphrase', e));
    } }],
  });
}

function _obRestoreDialog(bk, folder) {
  openDialog({
    title: `Restore the copy of ${bk.date}`, size: 'md',
    body: (el, close) => {
      el.appendChild(Object.assign(document.createElement('p'), { className: 'set-h', textContent: `${bk.name}. On the computer that made it you can leave the passphrase empty. Your current data is saved as a backup first, so this can be undone.` }));
      const p = _obField(bk.lock === 'recovery key' ? 'Sync recovery key' : 'Passphrase', '', { password: true });
      el.appendChild(p.f);
      const out = document.createElement('div'); el.appendChild(out);
      const secret = () => Object.assign({ name: bk.name }, folder ? { folder } : {}, p.i.value ? (bk.lock === 'recovery key' ? { recoveryKey: p.i.value } : { passphrase: p.i.value }) : {});
      const g = document.createElement('div'); g.className = 'btn-group mv-actions';
      const go = _sdBtn('Restore', 'archive-restore', 'btn-primary', async (btn) => {
        btn.disabled = true;
        try { await _obJson('/api/backup/offsite/restore', secret()); toast('Restored. Loading it…', { kind: 'ok' }); setTimeout(() => location.reload(), 700); }
        catch (e) { toastError('restore it', e); btn.disabled = false; }
      });
      go.disabled = true;
      g.append(_sdBtn('Cancel', null, 'btn-ghost', close), _sdBtn('Check', 'list-checks', 'btn-secondary', async () => {
        out.textContent = 'Opening…';
        try {
          const j = await _obJson('/api/backup/offsite/inspect', secret());
          out.textContent = `It holds ${j.tasks != null ? j.tasks + ' tasks' : 'no task list'}${j.people != null ? ', ' + j.people + ' people' : ''}${j.financeFiles ? ', ' + j.financeFiles + ' finance files' : ''}${j.savedAt ? ' (saved ' + _sdWhen(j.savedAt) + ')' : ''}. You have ${Array.isArray(state.custom) ? state.custom.length : 0} tasks now.`;
          go.disabled = false;
        } catch (e) { out.textContent = netErrorMessage(e); }
      }), go);
      el.appendChild(g);
    },
  });
}
