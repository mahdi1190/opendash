/* ============================================================
   SETTINGS > SYNC ACROSS MY DEVICES (owner: Sync)
   Server: server/routes/sync.mjs and lib/sync/engine.mjs. Off by default.
   One switch, the folder (the OneDrive / Google Drive / Dropbox folder the
   server found, or another one typed in), this computer's name, and the
   status in plain words: "Synced 12 s ago", "Waiting for OneDrive",
   "Another device: Work laptop, last seen 2 min ago".
   Changes from the other computer arrive through live sync (86-live-sync.js
   shows "Updated by Work laptop"). The helpers syncAgo / syncStatusLine /
   syncDeviceLines are pure (tested in Node).
   ============================================================ */
let _syncSt = null;
let _syncErr = '';
let _syncBusy = false;
let _syncOther = false;      // "Another folder..." picked: show the path box
let _syncTicker = null;

/** "just now", "12 s ago", "2 min ago", "3 h ago", "2 days ago". */
function syncAgo(ms, nowMs) {
  if (!ms) return '';
  const s = Math.max(0, Math.round((nowMs - ms) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return s + ' s ago';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  const d = Math.round(h / 24);
  return d + (d === 1 ? ' day ago' : ' days ago');
}
/** {tone: off|ok|warn|err|idle, text} for the status line. */
function syncStatusLine(st, nowMs) {
  if (!st) return { tone: 'idle', text: 'Reading...' };
  if (!st.enabled) return { tone: 'off', text: 'Off. Your data stays on this computer.' };
  if (st.mode === 'shadow' && st.state === 'ok') return { tone: 'warn', text: st.message || 'Trial mode: nothing is applied yet.' };
  if (st.state === 'error') return { tone: 'err', text: st.message || 'Sync is paused.' };
  if (st.state === 'waiting') return { tone: 'warn', text: st.message || 'Waiting for the cloud folder.' };
  if (!st.lastSyncAt) return { tone: 'idle', text: 'Starting...' };
  return { tone: 'ok', text: 'Synced ' + syncAgo(st.lastSyncAt, nowMs) };
}
/** One line per other computer. */
function syncDeviceLines(st, nowMs) {
  const others = ((st && st.devices) || []).filter(d => !d.me);
  if (!others.length) return ['No other computer yet: turn this on with the same folder on your other computer.'];
  return others.map(d => `Another device: ${d.name}, last seen ${syncAgo(d.lastSeen, nowMs) || 'a while ago'}`);
}

async function _syncJson(url, body) {
  const r = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j && (j.error && (j.error.message || j.error))) || ('HTTP ' + r.status));
  return j;
}
function _syncRefresh() { if (state.view === 'settings:sync') renderMain(); }
async function syncLoad() {
  try { _syncSt = await _syncJson('/api/sync/status'); _syncErr = ''; }
  catch (e) { _syncErr = netErrorMessage(e); }
  _syncRefresh();
}
async function _syncSave(patch, okMsg) {
  if (_syncBusy) return;
  _syncBusy = true; _syncErr = '';
  _syncRefresh();
  try {
    _syncSt = await _syncJson('/api/sync/settings', patch);
    if (okMsg) toast(okMsg, { kind: 'ok' });
  } catch (e) { _syncErr = netErrorMessage(e); }
  _syncBusy = false;
  _syncRefresh();
}

function _syncFolderControl(st) {
  const wrap = document.createElement('div'); wrap.className = 'sync-folder';
  const det = (st && st.detected) || [];
  const sel = document.createElement('select'); sel.className = 'control control-sm';
  const cur = st && st.folder;
  const known = det.some(d => d.path === cur);
  for (const d of det) {
    const o = document.createElement('option'); o.value = d.path; o.textContent = `${d.label} (${d.path})`;
    if (d.path === cur || (!cur && d === det[0])) o.selected = true;
    sel.appendChild(o);
  }
  if (cur && !known) { const o = document.createElement('option'); o.value = cur; o.textContent = cur; o.selected = true; sel.appendChild(o); }
  const other = document.createElement('option'); other.value = '__other'; other.textContent = 'Another folder...';
  if (_syncOther || (!det.length && !cur)) other.selected = true;
  sel.appendChild(other);
  sel.disabled = _syncBusy;
  wrap.appendChild(sel);
  const box = document.createElement('div'); box.className = 'sync-other';
  const input = document.createElement('input'); input.className = 'control control-sm'; input.placeholder = 'Full path of a folder your cloud drive syncs';
  input.value = cur && !known ? cur : ''; input.maxLength = 1000;
  const use = document.createElement('button'); use.type = 'button'; use.className = 'btn btn-secondary btn-sm'; use.textContent = 'Use this folder';
  use.onclick = () => { const v = input.value.trim(); if (v) { _syncOther = false; _syncSave({ folder: v }, 'Sync folder changed'); } };
  box.append(input, use);
  box.hidden = !(_syncOther || (!det.length && !cur));
  wrap.appendChild(box);
  sel.onchange = () => {
    if (sel.value === '__other') { _syncOther = true; box.hidden = false; input.focus(); return; }
    _syncOther = false; box.hidden = true;
    if (st && st.enabled) _syncSave({ folder: sel.value }, 'Sync folder changed');
    else if (_syncSt) _syncSt = Object.assign({}, _syncSt, { folder: sel.value });
  };
  return wrap;
}

function _syncCard(el) {
  const st = _syncSt;
  const card = _settingsCard('Sync across my devices', 'Keeps your tasks, notes, people, streams and countdowns the same on your computers, through a cloud folder you already have (OneDrive, Google Drive or Dropbox). No account and no OpenDash server. Sign-ins, bank connections and keys never leave this computer.');
  const line = document.createElement('div'); line.className = 'sync-status'; line.setAttribute('role', 'status');
  const paint = () => {
    const s = syncStatusLine(_syncSt, Date.now());
    line.className = 'sync-status sync-' + s.tone;
    line.textContent = s.text;
    const devs = card.body.querySelector('.sync-devices');
    if (devs) devs.textContent = syncDeviceLines(_syncSt, Date.now()).join('\n');
  };
  card.body.appendChild(_settingsRow('Sync across my devices', 'Off by default. Turn it on here and on your other computer, with the same folder.',
    _settingsSwitch(!!(st && st.enabled), 'Sync across my devices', (v) => {
      const sel = card.body.querySelector('.sync-folder select');
      const folder = st && st.folder ? st.folder : (sel && sel.value !== '__other' ? sel.value : null);
      _syncSave(v ? Object.assign({ enabled: true }, folder ? { folder } : {}) : { enabled: false }, v ? 'Sync is on' : 'Sync is off');
    }, !st || _syncBusy)));
  card.body.appendChild(_settingsRow('Folder', 'OpenDash makes an "OpenDash Sync" folder inside it. Each computer writes only its own files there.', _syncFolderControl(st)));
  const status = document.createElement('div');
  status.appendChild(line);
  const devs = document.createElement('div'); devs.className = 'set-h sync-devices';
  status.appendChild(devs);
  card.body.appendChild(_settingsRow('Status', '', status));
  if (st && st.enabled) {
    // Trial mode first: changes from the other computers are listed, not applied.
    card.body.appendChild(_settingsRow('Use changes from my other computers', st.apply
      ? 'On: changes made on your other computers appear here within seconds of your cloud drive bringing them.'
      : 'Off for now (trial): OpenDash checks what your other computers changed and lists it below, without changing anything here. Turn this on when the list looks right.',
    _settingsSwitch(!!st.apply, 'Use changes from my other computers', (v) => _syncSave({ apply: v }, v ? 'Changes from your other computers will be used' : 'Back to trial mode'), _syncBusy)));
    if (!st.apply && st.preview && st.preview.changes) {
      const p = st.preview, list = document.createElement('div'); list.className = 'set-h sync-preview';
      const lines = [];
      for (const t of p.sample.added) lines.push('New: ' + (t.title || 'a task'));
      for (const t of p.sample.changed) lines.push('Changed: ' + (t.title || 'a task') + (t.fields.length ? ' (' + t.fields.join(', ') + ')' : ''));
      for (const t of p.sample.removed) lines.push('Removed: ' + (t.title || 'a task'));
      if (p.keys.length) lines.push('Also: ' + p.keys.map(k => String(k).replace(/^file:/, '')).join(', '));
      list.textContent = lines.join('\n');
      card.body.appendChild(_settingsRow('Waiting to be used', `${p.tasks.added} new, ${p.tasks.changed} changed and ${p.tasks.removed} removed task${p.tasks.removed === 1 ? '' : 's'} from ${p.from.join(', ') || 'another computer'}${p.conflicts ? `; ${p.conflicts} edit${p.conflicts === 1 ? '' : 's'} clash with yours (the later one would be kept)` : ''}.`, list));
    }
    const name = document.createElement('input'); name.className = 'control control-sm'; name.maxLength = 60;
    name.value = st.deviceName || ''; name.placeholder = 'Work laptop';
    name.onchange = () => _syncSave({ deviceName: name.value.trim() }, 'Name saved');
    card.body.appendChild(_settingsRow('This computer is called', 'How your other computers show this one.', name));
    const now = document.createElement('button'); now.type = 'button'; now.className = 'btn btn-secondary btn-sm'; now.textContent = 'Sync now';
    now.disabled = _syncBusy;
    now.onclick = async () => { try { _syncSt = await _syncJson('/api/sync/now', {}); } catch (e) { _syncErr = netErrorMessage(e); } _syncRefresh(); };
    card.body.appendChild(_settingsRow('Check the folder now', 'It also checks by itself every few seconds.', now));
    if (st.conflicts && st.conflicts.count) {
      const c = st.conflicts.recent[0];
      const what = c ? `${c.name ? '"' + c.name + '"' : 'an item'}${c.field ? ' (' + c.field + ')' : ''}` : 'an item';
      card.body.appendChild(_settingsRow('Edits that clashed', `${st.conflicts.count} time${st.conflicts.count === 1 ? '' : 's'} the same thing was changed on two computers at once; the later change was kept. Latest: ${what}, kept the change from ${c ? c.kept.by : 'the other computer'}. Each one is listed in conflicts.jsonl in this computer's OpenDash sync folder.`, null));
    }
    if (st.skew) card.body.appendChild(_settingsRow('Clock', `${st.skew.device}'s clock is about ${st.skew.aheadMin} min ahead of this one. Set both to the right time so the newest change wins.`, null));
  }
  if (_syncErr) { const e = document.createElement('div'); e.className = 'sync-status sync-err'; e.textContent = _syncErr; card.body.appendChild(e); }
  el.appendChild(card.card);
  paint();
  // Keep "Synced 12 s ago" current while this page is open (text only, no re-render).
  clearInterval(_syncTicker);
  _syncTicker = setInterval(() => {
    if (!document.body.contains(line)) { clearInterval(_syncTicker); _syncTicker = null; return; }
    _syncJson('/api/sync/status').then((s) => { _syncSt = s; paint(); }).catch(() => paint());
  }, 5000);
}

registerSettingsGroup({
  id: 'sync', title: 'Sync', icon: 'refresh-cw', order: 91,
  description: 'Keep your data the same on your computers through OneDrive, Google Drive or Dropbox.',
  render(el) {
    if (!_syncSt && !_syncErr) syncLoad();
    _syncCard(el);
    if (typeof settingsMainComputerCard === 'function') settingsMainComputerCard(el);   // 58-settings-main.js
  },
});
