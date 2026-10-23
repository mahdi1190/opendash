/* ============================================================
   SETTINGS > SYNC ACROSS MY DEVICES (owner: Sync)
   Server: server/routes/sync.mjs and lib/sync/engine.mjs. Off by default.
   End-to-end encrypted (lib/sync/e2e.mjs): the cloud folder only ever holds
   locked files.
     Off:        "Is this your first computer with OpenDash?"
                 Yes -> the folder, a name, Turn on -> the recovery code (once)
                 No  -> the folder, a name -> "Approve on your other computer"
                        (6 digits on both screens) or "Type your recovery code"
     On:         the status in plain words, a new computer asking to join,
                 the devices (name, kind, last seen, This computer, Rename,
                 Remove this device, main computer for each account), add a
                 phone (QR code), a new recovery code, the trial switch.
   Changes from the other computer arrive through live sync (86-live-sync.js
   shows "Updated by Work laptop"). The helpers syncAgo / syncStatusLine /
   syncDeviceLines / syncScreen / syncPairView / syncKindLabel /
   syncDeviceSummary / syncCodeLines are pure (tested in Node).
   ============================================================ */
let _syncSt = null;
let _syncErr = '';
let _syncBusy = false;
let _syncOther = false;      // "Another folder..." picked: show the path box
let _syncTicker = null;
let _syncFlow = null;        // before sync is on: null (the question), 'first' or 'join'
let _syncCode = null;        // a recovery code to show once
let _syncOffer = null;       // {text, expiresAt}: the QR offer on screen
let _syncAdd = false;        // "Add a computer or phone" open
const _syncIgnored = new Set();
let _syncOtherOpen = false;  // "Other ways" unfolded
let _syncJoinDismissed = null;   // the finished join-code panel the user closed (its expiresAt)
let _syncJoinTick = null;    // the join code's countdown (text only, every second)

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
  if (st.state === 'locked') return { tone: 'warn', text: st.message || "This computer can't read the synced data yet." };
  if (st.state === 'waiting') return { tone: 'warn', text: st.message || 'Waiting for the cloud folder.' };
  if (!st.lastSyncAt) return { tone: 'idle', text: 'Starting...' };
  if (st.message && st.message !== 'Up to date.' && st.state === 'ok') return { tone: 'warn', text: st.message };
  return { tone: 'ok', text: 'Synced ' + syncAgo(st.lastSyncAt, nowMs) };
}
/** One line per other computer. */
function syncDeviceLines(st, nowMs) {
  const others = ((st && st.devices) || []).filter(d => !d.me);
  if (!others.length) return ['No other computer yet: turn this on with the same folder on your other computer.'];
  return others.map(d => `Another device: ${d.name}, last seen ${syncAgo(d.lastSeen, nowMs) || 'a while ago'}`);
}
/**
 * Live sync (lib/sync/live/): one {tone, text} per line, in plain words.
 * st.live = {on, state, why, reach:{state, external}, firewall, peers:[{name,
 * state, path, reason}], roles:[{label, name, me, acting}]}.
 */
function syncLiveLines(st) {
  const L = st && st.live;
  if (!st || !st.enabled || !L) return [];
  const cloud = st.cloud || 'the sync folder';
  if (!L.on) return [{ tone: 'off', text: `Live sync is off: changes travel through ${cloud} (10 to 60 seconds).` }];
  if (L.state !== 'on') return [];
  const out = [];
  if (L.firewall) out.push({ tone: 'warn', text: 'Windows asked to allow OpenDash on private networks: click Allow. (Missed it? Start > "Allow an app through Windows Firewall" > tick Node.js for Private.)' });
  else if (L.firewallHint) out.push({ tone: 'idle', text: 'If Windows asks to allow OpenDash (Node.js) on private networks, click Allow: that lets your other computer connect.' });
  const peers = L.peers || [];
  if (!peers.length) out.push({ tone: 'idle', text: 'Live sync is ready: it connects as soon as your other computer is on.' });
  for (const p of peers) {
    const n = p.name || 'your other computer';
    if (p.state === 'live') { out.push({ tone: 'ok', text: `Live with ${n} (${p.path === 'lan' ? 'same Wi-Fi' : 'over the internet'})` }); continue; }
    const why = {
      'offline': `${n} is off or asleep; its changes come through ${cloud} when it is back`,
      'no-address': `${n} has not shared how to reach it yet (is OpenDash up to date on it?)`,
      'trying': null,
      'new-key': `waiting for ${cloud} to bring the new sync key`,
      'firewall': 'Windows on one of the computers is blocking OpenDash',
      'lan-blocked': 'something on this network blocks the connection',
      'cgnat': 'your internet provider does not allow incoming connections',
      'router': 'your router does not allow incoming connections',
      'unreachable': `${n} cannot be reached right now`,
    }[p.reason];
    if (p.reason === 'trying') out.push({ tone: 'idle', text: `Connecting to ${n}...` });
    else if (p.reason === 'offline') out.push({ tone: 'idle', text: `Not live: ${why}.` });
    else out.push({ tone: 'warn', text: `Not live with ${n}: using ${cloud === 'OneDrive' ? 'OneDrive' : cloud} (${why || 'not connected'})` });
  }
  const r = L.reach || {};
  if (L.internet === false) out.push({ tone: 'idle', text: 'This computer does not ask your router to let your other computers in (turned off below).' });
  else if (r.state === 'mapped') out.push({ tone: 'ok', text: 'Your other computers can reach this one over the internet (your router opened a door for OpenDash).' });
  else if (r.state === 'cgnat') out.push({ tone: 'idle', text: 'This computer cannot be reached from the internet: your internet provider shares one address between many homes. Live sync still works on the same Wi-Fi, or when your other computer can be reached.' });
  else if (r.state === 'double-nat') out.push({ tone: 'idle', text: 'This computer cannot be reached from the internet: there is a second router in front of this one. Live sync still works on the same Wi-Fi.' });
  else if (r.state === 'none' || r.state === 'refused') out.push({ tone: 'idle', text: 'This computer cannot be reached from the internet: your router does not allow incoming connections. Live sync still works on the same Wi-Fi; otherwise changes go through ' + cloud + '.' });
  else if (r.state === 'trying') out.push({ tone: 'idle', text: 'Asking your router to let your other computers in...' });
  return out;
}
/** "Main computer for Gmail: Home laptop" lines. */
function syncMainLines(st) {
  const L = st && st.live;
  if (!L || L.state !== 'on') return [];
  return (L.roles || []).map(r => `${r.label}: ${r.name ? (r.me ? 'this computer' : r.name) : 'no computer yet'}${r.name && !r.acting ? ' (taking over)' : ''}`);
}
/** Which screen: start | first | join | plain | joining | removed | locked | ready. */
function syncScreen(st, flow) {
  if (!st) return 'loading';
  const e = st.e2e || {};
  if (!st.enabled) return flow === 'first' ? 'first' : flow === 'join' ? 'join' : 'start';
  if (!e.on) return 'plain';
  if (e.ready && st.state !== 'locked') return 'ready';
  if (e.reason === 'removed') return 'removed';
  if (e.reason === 'not-joined') return 'joining';
  return 'locked';
}
function syncKindLabel(k) { return k === 'phone' ? 'Phone' : k === 'tablet' ? 'Tablet' : 'Computer'; }
/** "482 913" */
function syncFormatPairCode(c) { return typeof c === 'string' && /^\d{6}$/.test(c) ? c.slice(0, 3) + ' ' + c.slice(3) : ''; }
/** The recovery code in two lines of four groups (easier to copy by hand). */
function syncCodeLines(code) {
  const g = String(code || '').split('-');
  return g.length === 8 ? [g.slice(0, 4).join('-'), g.slice(4).join('-')] : [String(code || '')];
}
/** {name, detail} for a row of the devices list. */
function syncDeviceSummary(d, nowMs) {
  const parts = [syncKindLabel(d.kind)];
  parts.push(d.me ? 'This computer' : ('last seen ' + (syncAgo(d.lastSeen, nowMs) || 'a while ago')));
  if (d.fetches && d.fetches.length) parts.push('main computer for ' + d.fetches.join(', '));
  return { name: d.name || 'A device', detail: parts.join(' · ') };
}
/**
 * What the pairing panel says: {title, text, code, actions: [[id, label, primary?]]}.
 * p: the status's e2e.pairing ({role, step, code, name}).
 */
function syncPairView(p) {
  if (!p) return null;
  const other = p.name ? '"' + p.name + '"' : 'the new computer';
  const code = syncFormatPairCode(p.code);
  if (p.role === 'join') {
    switch (p.step) {
      case 'waiting': return { title: 'Waiting for your other computer', text: 'On your other computer, open OpenDash and go to Settings > Sync. It will ask you to check this computer. If nothing happens after a minute, your cloud drive may still be uploading.', actions: [['cancel', 'Cancel']] };
      case 'compare': return { title: 'Check the numbers', code, text: 'Your other computer shows 6 numbers too. Are they exactly the same as these?', actions: [['yes', 'Yes, they match', true], ['no', "No, they're different"]] };
      case 'confirmed': return { title: 'Nearly done', code, text: 'Now click "Yes, the same" on your other computer. This computer finishes by itself.', actions: [['cancel', 'Cancel']] };
      case 'done': return { title: 'Done', text: 'This computer now syncs with your other computer.', actions: [] };
      case 'declined': return { title: 'Stopped', text: 'Your other computer said the numbers did not match, so nothing was shared. You can try again.', actions: [['again', 'Try again', true]] };
      case 'cancelled': return { title: 'Stopped', text: 'Nothing was shared.', actions: [['again', 'Try again', true]] };
      case 'expired': return p.why === 'other-ended'
        ? { title: 'Your other computer stopped', text: 'It ended this pairing (or was restarted), so nothing was shared. Try again.', actions: [['again', 'Try again', true]] }
        : { title: 'This took too long', text: 'Nothing was shared. Try again.', actions: [['again', 'Try again', true]] };
      default: return { title: 'Something went wrong', text: 'Nothing was shared. Try again, or use your recovery code instead.', actions: [['again', 'Try again', true]] };
    }
  }
  switch (p.step) {
    case 'waiting': return { title: 'Checking ' + other, text: 'Waiting for your cloud drive to bring the answer from ' + other + '. This can take a minute.', actions: [['cancel', 'Cancel']] };
    case 'compare': return { title: 'Check the numbers', code, text: 'Does ' + other + ' show exactly these 6 numbers? Only say yes if they are the same: if they differ, someone else may be trying to get in.', actions: [['yes', 'Yes, the same', true], ['no', 'No, different']] };
    case 'sent': return { title: 'Sent', text: other + ' finishes by itself in a moment.', actions: [] };
    case 'done': return { title: 'Done', text: other + ' now syncs too.', actions: [] };
    case 'declined': return { title: 'Stopped', text: other + ' said the numbers did not match, so nothing was shared.', actions: [] };
    case 'cancelled': return { title: 'Stopped', text: 'Nothing was shared.', actions: [] };
    case 'expired': return p.why === 'other-ended'
      ? { title: 'The new computer stopped', text: 'It ended its request, so nothing was shared. If it asks again, its new request shows here.', actions: [] }
      : { title: 'This took too long', text: 'Nothing was shared. Start again on the new computer.', actions: [] };
    default: return { title: 'Stopped for safety', text: 'Something changed the request while it was being checked, so nothing was shared. Start again on the new computer; if it keeps happening, use the recovery code there instead.', actions: [] };
  }
}

/** "9:41 left" */
function syncTimeLeft(expiresAt, nowMs) {
  const s = Math.max(0, Math.round((Number(expiresAt) - nowMs) / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' left';
}
/**
 * What the join-code panel says: {title, text, code?, countdown?, actions: [[id, label, primary?]]}.
 * j: the status's e2e.joinCode ({role: 'offer' (this computer shows the code) | 'join', step, code, expiresAt, name, wrong}).
 */
function syncJoinCodeView(j) {
  if (!j) return null;
  const other = j.name ? '"' + j.name + '"' : 'the new computer';
  const Other = other.charAt(0).toUpperCase() + other.slice(1);
  if (j.role === 'offer') {
    switch (j.step) {
      case 'waiting': return { title: 'Type this code on the new computer', code: j.code, countdown: true, text: 'On the new computer: OpenDash > Settings > Sync > "No, I already use OpenDash", then type these 4 letters. The code works once.' + (j.wrong ? ' ' + j.wrong + ' wrong ' + (j.wrong === 1 ? 'try' : 'tries') + ' so far: after 3 it stops working.' : ''), actions: [['cancel', 'Cancel']] };
      case 'sent': return { title: 'Adding ' + other, text: Other + ' finishes by itself in a moment.', actions: [] };
      case 'done': return { title: 'Done', text: Other + ' now syncs too.', actions: [['close', 'OK', true]] };
      case 'burned': return { title: 'This code no longer works', text: 'It was typed wrongly 3 times, so it was stopped for safety. Nothing was shared.', actions: [['new', 'Make a new code', true], ['close', 'Close']] };
      case 'clash': return { title: 'Two computers tried to use this code', text: 'For safety, neither was added. Start again, with only the new computer.', actions: [['new', 'Start again', true], ['close', 'Close']] };
      case 'expired': return { title: 'The code ran out', text: 'Nothing was shared. Make a new one when the new computer is ready.', actions: [['new', 'Make a new code', true], ['close', 'Close']] };
      default: return { title: 'Stopped', text: 'Nothing was shared.', actions: [['new', 'Make a new code', true], ['close', 'Close']] };
    }
  }
  switch (j.step) {
    case 'looking': return { title: 'Looking for your other computer', countdown: true, text: 'Your cloud drive is bringing its code. This usually takes a few seconds, sometimes a minute.', actions: [['cancel', 'Cancel']] };
    case 'sent': return { title: 'Checking the code', countdown: true, text: 'Your other computer checks it, then sends this one the key. A few seconds, sometimes a minute.', actions: [['cancel', 'Cancel']] };
    case 'done': return { title: 'Done', text: 'This computer now syncs with your other computer.', actions: [] };
    case 'wrong': return { title: 'That code is not right', text: 'Check the 4 letters on your other computer and type them again below.', actions: [] };
    case 'clash': return { title: 'Two computers tried to use this code', text: 'For safety, neither was added. Make a new code on your other computer and type it below.', actions: [] };
    case 'taken': return { title: 'That code was already used', text: 'Each code works once. Make a new one on your other computer and type it below.', actions: [] };
    case 'expired': return { title: 'This took too long', text: 'Make a new code on your other computer and type it below.', actions: [] };
    default: return { title: 'Stopped', text: 'Nothing was shared. You can type a code again below.', actions: [] };
  }
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
async function _syncSave(patch, okMsg) { return _syncPost('/api/sync/settings', patch, okMsg); }
/** POST, keep the status it answers with, show a code it carries once. */
async function _syncPost(url, body, okMsg) {
  if (_syncBusy) return null;
  _syncBusy = true; _syncErr = '';
  _syncRefresh();
  let j = null;
  try {
    j = await _syncJson(url, body || {});
    if (j && j.recoveryCode) { _syncCode = j.recoveryCode; delete j.recoveryCode; }
    if (j && j.offer) { _syncOffer = j.offer; delete j.offer; }
    if (j && j.enabled !== undefined) _syncSt = j;
    if (okMsg) toast(okMsg, { kind: 'ok' });
  } catch (e) { _syncErr = netErrorMessage(e); }
  _syncBusy = false;
  _syncRefresh();
  return j;
}

function _syncEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function _syncBtn(label, onClick, primary, disabled) {
  const b = _syncEl('button', 'btn ' + (primary ? 'btn-primary' : 'btn-secondary') + ' btn-sm', label);
  b.type = 'button'; b.disabled = !!disabled || _syncBusy; b.onclick = onClick;
  return b;
}

function _syncFolderControl(st) {
  const wrap = document.createElement('div'); wrap.className = 'sync-folder';
  const det = (st && st.detected) || [];
  const sel = document.createElement('select'); sel.className = 'control control-sm';
  const cur = st && st.folder;
  const known = det.some(d => d.path === cur);
  // A work or school OneDrive is listed (last) but never chosen for you: personal data stays out of an employer's cloud.
  const firstOwn = det.find(d => !d.work) || null;
  for (const d of det) {
    const o = document.createElement('option'); o.value = d.path; o.textContent = `${d.label} (${d.path})`;
    if (d.path === cur || (!cur && d === firstOwn)) o.selected = true;
    sel.appendChild(o);
  }
  if (cur && !known) { const o = document.createElement('option'); o.value = cur; o.textContent = cur; o.selected = true; sel.appendChild(o); }
  const other = document.createElement('option'); other.value = '__other'; other.textContent = 'Another folder...';
  if (_syncOther || (!firstOwn && !cur)) other.selected = true;
  sel.appendChild(other);
  sel.disabled = _syncBusy;
  wrap.appendChild(sel);
  const box = document.createElement('div'); box.className = 'sync-other';
  const input = document.createElement('input'); input.className = 'control control-sm'; input.placeholder = 'Full path of a folder your cloud drive syncs';
  input.value = cur && !known ? cur : ''; input.maxLength = 1000;
  const use = document.createElement('button'); use.type = 'button'; use.className = 'btn btn-secondary btn-sm'; use.textContent = 'Use this folder';
  use.onclick = () => {
    const v = input.value.trim();
    if (!v) return;
    _syncOther = false;
    if (st && st.enabled) _syncSave({ folder: v }, 'Sync folder changed');
    else if (_syncSt) { _syncSt = Object.assign({}, _syncSt, { folder: v }); _syncRefresh(); }
  };
  box.append(input, use);
  box.hidden = !(_syncOther || (!det.length && !cur));
  wrap.appendChild(box);
  sel.onchange = () => {
    if (sel.value === '__other') { _syncOther = true; box.hidden = false; input.focus(); return; }
    _syncOther = false; box.hidden = true;
    if (st && st.enabled) _syncSave({ folder: sel.value }, 'Sync folder changed');
    else if (_syncSt) _syncSt = Object.assign({}, _syncSt, { folder: sel.value });
  };
  wrap._value = () => (sel.value === '__other' ? (input.value.trim() || null) : sel.value);
  return wrap;
}

/** The recovery code, once: write it down or print it. */
function _syncCodePanel(card) {
  const box = _syncEl('div', 'sync-code');
  box.appendChild(_syncEl('div', 'sync-code-t', 'Your recovery code'));
  const c = _syncEl('div', 'sync-code-v');
  for (const l of syncCodeLines(_syncCode)) c.appendChild(_syncEl('div', null, l));
  box.appendChild(c);
  box.appendChild(_syncEl('p', 'set-h', 'Write it down or print it, and keep it somewhere safe (not on this computer). You need it to add a computer when your other one is not around, or if you lose this one. OpenDash cannot show it again.'));
  const row = _syncEl('div', 'sync-actions');
  row.append(
    _syncBtn('Print', () => {
      const sheet = _syncEl('div', 'sync-print-sheet');
      sheet.appendChild(_syncEl('h1', null, 'OpenDash recovery code'));
      for (const l of syncCodeLines(_syncCode)) sheet.appendChild(_syncEl('p', 'sync-code-v', l));
      sheet.appendChild(_syncEl('p', null, 'Keep this somewhere safe. With it, a new computer can read your synced OpenDash data.'));
      document.body.appendChild(sheet); document.body.classList.add('sync-printing');
      const done = () => { document.body.classList.remove('sync-printing'); sheet.remove(); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      window.print();
      setTimeout(done, 60000);
    }),
    _syncBtn('I have written it down', () => { _syncCode = null; _syncRefresh(); }, true),
  );
  box.appendChild(row);
  card.body.appendChild(box);
}

function _syncPairPanel(card, p) {
  const v = syncPairView(p);
  if (!v) return;
  const box = _syncEl('div', 'sync-pair');
  box.appendChild(_syncEl('div', 'sync-pair-t', v.title));
  if (v.code) box.appendChild(_syncEl('div', 'sync-pair-code', v.code));
  box.appendChild(_syncEl('p', 'set-h', v.text));
  const row = _syncEl('div', 'sync-actions');
  for (const [id, label, primary] of v.actions) {
    row.appendChild(_syncBtn(label, () => {
      if (id === 'yes' || id === 'no') _syncPost('/api/sync/pair/confirm', { sid: p.sid, match: id === 'yes' });
      else if (id === 'cancel') _syncPost('/api/sync/pair/cancel');
      else if (id === 'again') _syncPost('/api/sync/pair/start');
    }, primary));
  }
  if (v.actions.length) box.appendChild(row);
  card.body.appendChild(box);
}

/** The join code panel (either computer), with its countdown. */
function _syncJoinPanel(card, j) {
  const v = syncJoinCodeView(j);
  if (!v) return;
  const box = _syncEl('div', 'sync-join');
  box.setAttribute('role', 'status');
  box.appendChild(_syncEl('div', 'sync-pair-t', v.title));
  if (v.code) { const c = _syncEl('div', 'sync-join-code', v.code); c.setAttribute('aria-label', 'Code: ' + v.code.split('').join(' ')); box.appendChild(c); }
  if (v.countdown && j.expiresAt) {
    const left = _syncEl('div', 'sync-join-left', syncTimeLeft(j.expiresAt, Date.now()));
    left.dataset.exp = String(j.expiresAt);
    box.appendChild(left);
    if (!_syncJoinTick) {
      _syncJoinTick = setInterval(() => {
        const els = document.querySelectorAll('.sync-join-left');
        if (!els.length) { clearInterval(_syncJoinTick); _syncJoinTick = null; return; }
        els.forEach(el => { el.textContent = syncTimeLeft(el.dataset.exp, Date.now()); });
      }, 1000);
    }
  }
  box.appendChild(_syncEl('p', 'set-h', v.text));
  if (v.actions.length) {
    const row = _syncEl('div', 'sync-actions');
    for (const [id, label, primary] of v.actions) {
      row.appendChild(_syncBtn(label, () => {
        if (id === 'cancel') _syncPost('/api/sync/code/cancel');
        else if (id === 'new') { _syncJoinDismissed = null; _syncPost('/api/sync/code/start'); }
        else if (id === 'close') { _syncJoinDismissed = j.expiresAt; _syncRefresh(); }
      }, primary));
    }
    box.appendChild(row);
  }
  card.body.appendChild(box);
}
/** "Type the 4-letter code from your other computer" (the new computer's default way in). */
function _syncJoinInput(card) {
  const wrap = _syncEl('div', 'sync-other');
  const input = _syncEl('input', 'control sync-join-input');
  input.maxLength = 9; input.autocomplete = 'off'; input.spellcheck = false; input.placeholder = 'ABCD';
  input.setAttribute('aria-label', 'The 4-letter code');
  const go = () => { const v = input.value.trim(); if (v) _syncPost('/api/sync/code/join', { code: v }); };
  input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  wrap.append(input, _syncBtn('Join', go, true));
  card.body.appendChild(_settingsRow('Type the 4-letter code from your other computer', 'On your other computer: Settings > Sync > Add a computer.', wrap));
}
/** A folded "Other ways" box; fill(box) adds rows to box.body like a card. */
function _syncOtherWays(card, fill) {
  const det = document.createElement('details'); det.className = 'sync-other-ways';
  det.open = _syncOtherOpen;
  det.ontoggle = () => { _syncOtherOpen = det.open; };
  det.appendChild(_syncEl('summary', null, 'Other ways'));
  fill({ body: det });
  card.body.appendChild(det);
}

/** "Type your recovery code" */
function _syncRecoveryRow(card, title, hint) {
  const wrap = _syncEl('div', 'sync-other');
  const input = _syncEl('input', 'control control-sm sync-code-input');
  input.placeholder = 'XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX'; input.maxLength = 60; input.autocomplete = 'off'; input.spellcheck = false;
  const go = () => { const v = input.value.trim(); if (v) _syncPost('/api/sync/recovery', { code: v }, 'This computer now syncs'); };
  input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  wrap.append(input, _syncBtn('Use this code', go, true));
  card.body.appendChild(_settingsRow(title, hint, wrap));
}

function _syncStart(card, st) {
  const e2e = (st && st.e2e) || {};
  if (!e2e.available) {
    // An older server: the plain switch.
    card.body.appendChild(_settingsRow('Sync across my devices', 'Off by default.', _settingsSwitch(false, 'Sync across my devices', () => _syncSave({ enabled: true }, 'Sync is on'), _syncBusy)));
    return;
  }
  const q = _syncEl('div', 'sync-actions');
  q.append(
    _syncBtn('Yes, this is my first', () => { _syncFlow = 'first'; _syncRefresh(); }, true),
    _syncBtn('No, I already use OpenDash', () => { _syncFlow = 'join'; _syncRefresh(); }),
  );
  card.body.appendChild(_settingsRow('Is this your first computer with OpenDash?', 'Choose "No" if OpenDash already syncs on another computer of yours.', q));
}

function _syncSetup(card, st, first) {
  const folder = _syncFolderControl(st);
  card.body.appendChild(_settingsRow('Folder', first ? 'OpenDash makes an "OpenDash Sync" folder inside it. Everything in it is locked: only your computers can read it.' : 'The same cloud folder you chose on your other computer.', folder));
  const name = _syncEl('input', 'control control-sm'); name.maxLength = 60;
  name.value = (st && st.deviceName) || ''; name.placeholder = 'Work laptop';
  card.body.appendChild(_settingsRow('This computer is called', 'How your other computers show this one.', name));
  const row = _syncEl('div', 'sync-actions');
  row.append(
    _syncBtn('Back', () => { _syncFlow = null; _syncRefresh(); }),
    _syncBtn(first ? 'Turn on sync' : 'Find my sync', async () => {
      const f = folder._value();
      const body = Object.assign({ apply: true }, f ? { folder: f } : {}, name.value.trim() ? { deviceName: name.value.trim() } : {});
      const j = await _syncPost(first ? '/api/sync/setup' : '/api/sync/join', body, first ? 'Sync is on' : null);
      if (j) _syncFlow = null;
      _syncRefresh();
    }, true),
  );
  card.body.appendChild(row);
}

const _SYNC_PAIR_LIVE = ['waiting', 'compare', 'confirmed'];
/** The new computer: the 4-letter code first; approving with 6 numbers and the recovery code under "Other ways". */
function _syncJoining(card, st) {
  const e = st.e2e || {};
  const p = e.pairing && e.pairing.role === 'join' ? e.pairing : null;
  const jc = e.joinCode && e.joinCode.role === 'join' ? e.joinCode : null;
  const stop = () => card.body.appendChild(_settingsRow('Stop', 'Turn sync off on this computer.', _syncBtn('Turn off', () => _syncSave({ enabled: false }, 'Sync is off'))));
  if (p && _SYNC_PAIR_LIVE.includes(p.step)) { _syncPairPanel(card, p); return; }
  if (jc) _syncJoinPanel(card, jc);
  if (jc && (jc.step === 'looking' || jc.step === 'sent')) { stop(); return; }
  if (p) _syncPairPanel(card, p);
  _syncJoinInput(card);
  _syncOtherWays(card, (box) => {
    box.body.appendChild(_settingsRow('Approve on your other computer', 'Your other computer shows 6 numbers; you check this one shows the same.', _syncBtn('Ask my other computer', () => _syncPost('/api/sync/pair/start'))));
    _syncRecoveryRow(box, 'Type your recovery code', 'The long code you wrote down or printed when you turned sync on: for when your other computer is not around.');
  });
  stop();
}

function _syncRequests(card, st) {
  const reqs = ((st.e2e && st.e2e.requests) || []).filter(r => !_syncIgnored.has(r.sid));
  const p = st.e2e && st.e2e.pairing;
  if (p && p.role === 'approve') _syncPairPanel(card, p);
  if (p && p.role === 'approve' && (p.step === 'waiting' || p.step === 'compare')) return;
  for (const r of reqs.slice(0, 3)) {
    const row = _syncEl('div', 'sync-actions');
    row.append(
      _syncBtn("Check it's yours", () => _syncPost('/api/sync/pair/respond', { sid: r.sid }), true),
      _syncBtn('Not mine', () => { _syncIgnored.add(r.sid); _syncRefresh(); }),
    );
    // A computer that was removed and asks again is shown too (it comes back as a new device).
    if (r.removed) card.body.appendChild(_settingsRow(`A ${syncKindLabel(r.kind).toLowerCase()} you removed, "${r.oldName || r.name}", wants to join again`, 'Only continue if you are adding it back now. It comes back as a new device; its old place stays removed.', row));
    else card.body.appendChild(_settingsRow(`A new ${syncKindLabel(r.kind).toLowerCase()}, "${r.name}", wants to join your sync`, 'Only continue if you are setting it up now.', row));
  }
}

function _syncDevices(card, st) {
  const list = _syncEl('div', 'sync-dev-list');
  for (const d of st.devices || []) {
    const s = syncDeviceSummary(d, Date.now());
    const row = _syncEl('div', 'sync-dev');
    const info = _syncEl('div', 'sync-dev-info');
    info.append(_syncEl('div', 'sync-dev-name', s.name), _syncEl('div', 'set-h', s.detail));
    const acts = _syncEl('div', 'sync-actions');
    acts.appendChild(_syncBtn('Rename', async () => {
      const n = await promptDialog({ title: 'Rename ' + s.name, label: 'Name', value: d.name || '', confirmLabel: 'Save' });
      if (n) _syncPost('/api/sync/devices/rename', { id: d.id, name: n }, 'Name saved');
    }));
    if (!d.me && st.e2e && st.e2e.on) {
      acts.appendChild(_syncBtn('Remove this device', async () => {
        const ok = await confirmDialog({ title: 'Remove "' + s.name + '"?', text: 'It stops getting your changes, and what it changes is no longer used here. It keeps what it already has. Your other devices get a new key.', confirmLabel: 'Remove', danger: true });
        if (ok) _syncPost('/api/sync/devices/remove', { id: d.id }, 'Removed. Your other devices now use a new key.');
      }));
    }
    row.append(info, acts);
    list.appendChild(row);
  }
  card.body.appendChild(_settingsRow('Devices', 'Every computer and phone that syncs.', list));
  const accounts = st.accounts || [];
  if (accounts.length) {
    const box = _syncEl('div', 'sync-dev-list');
    for (const a of accounts) {
      const f = a.fetcher || {};
      const row = _syncEl('div', 'sync-dev');
      const info = _syncEl('div', 'sync-dev-info');
      info.append(_syncEl('div', 'sync-dev-name', a.label), _syncEl('div', 'set-h', f.me ? 'Checked by this computer' : f.name ? 'Checked by ' + f.name + (f.note ? '. ' + f.note : '') : 'Not checked by any computer yet'));
      row.appendChild(info);
      if (!f.me) row.appendChild(_syncBtn('Use this computer instead', () => _syncPost('/api/sync/fetcher', { account: a.id }, 'This computer checks it now')));
      box.appendChild(row);
    }
    card.body.appendChild(_settingsRow('Main computer for each account', 'One computer checks each mail or calendar account and shares what it finds. It needs its own sign-in.', box));
  }
}

function _syncLivePaint(box, st) {
  box.textContent = '';
  for (const l of syncLiveLines(st)) box.appendChild(_syncEl('div', 'sync-status sync-' + l.tone, l.text));
  const mains = syncMainLines(st);
  if (mains.length) box.appendChild(_syncEl('div', 'set-h', 'Main computer: ' + mains.join(' · ')));
}
function _syncLive(card, st) {
  const L = st.live;
  if (!L) return;
  const box = _syncEl('div', 'sync-live');
  _syncLivePaint(box, st);
  card.body.appendChild(_settingsRow('Live connection', 'When your computers can reach each other, a change shows on the other one within a second. Otherwise it goes through your cloud folder as before. Only your own paired computers can connect, and everything is encrypted.', box));
  if (L.on) {
    card.body.appendChild(_settingsRow('Let my other computers reach this one over the internet', 'Asks your router to open a door for OpenDash only (UPnP). Turn it off if you would rather not.', _settingsSwitch(L.internet !== false, 'Let my other computers reach this one over the internet', (v) => _syncPost('/api/sync/live', { internet: v }, v ? 'Asking your router' : 'Your router is left alone'), _syncBusy)));
    const computers = (st.devices || []).filter(d => d.kind !== 'phone');
    if (computers.length > 1) {
      const sel = document.createElement('select'); sel.className = 'control control-sm';
      const auto = document.createElement('option'); auto.value = ''; auto.textContent = 'Whichever is on'; sel.appendChild(auto);
      for (const d of computers) { const o = document.createElement('option'); o.value = d.id; o.textContent = (d.me ? 'This computer' : d.name) + ' first'; sel.appendChild(o); }
      sel.value = (L.prefs && L.prefs[0]) || '';
      sel.onchange = () => _syncPost('/api/sync/live', { prefer: sel.value ? [sel.value, ...computers.map(d => d.id).filter(id => id !== sel.value)] : [] }, 'Saved');
      card.body.appendChild(_settingsRow('Main computer', 'Which computer checks your accounts when more than one is on. When it is off or asleep, another one takes over by itself.', sel));
    }
  }
  card.body.appendChild(_settingsRow('Live sync', L.on ? 'On.' : 'Off: changes travel through your cloud folder only.', _settingsSwitch(!!L.on, 'Live sync', (v) => _syncPost('/api/sync/live', { enabled: v }, v ? 'Live sync is on' : 'Live sync is off'), _syncBusy)));
}

function _syncAddPanel(card) {
  const box = _syncEl('div', 'sync-add');
  box.appendChild(_syncEl('p', 'set-h', 'Without the 4-letter code: on the other computer, open OpenDash, go to Settings > Sync, choose "No, I already use OpenDash", then "Other ways" > "Ask my other computer". This computer will then ask you to check it.'));
  if (_syncOffer && _syncOffer.expiresAt > Date.now()) {
    box.appendChild(_syncEl('p', 'set-h', 'On a phone: open OpenDash and scan this code. It works once, for 10 minutes. Do not share a photo of it.'));
    try { const q = _syncEl('div', 'sync-qr'); q.appendChild(syncQrSvg(_syncOffer.text, 220)); box.appendChild(q); }
    catch (e) { box.appendChild(_syncEl('p', 'sync-status sync-err', 'The code could not be drawn.')); }
  } else box.appendChild(_syncBtn('Show a code for a phone', () => _syncPost('/api/sync/offer')));
  box.appendChild(_syncBtn('Close', () => { _syncAdd = false; _syncOffer = null; _syncRefresh(); }));
  card.body.appendChild(_settingsRow('Add a computer or phone', '', box));
}

function _syncCard(el) {
  const st = _syncSt;
  const card = _settingsCard('Sync across my devices', 'Keeps your tasks, notes, people, streams and countdowns the same on your computers, through a cloud folder you already have (OneDrive, Google Drive or Dropbox). Everything is locked before it leaves this computer: the cloud cannot read it. No account and no OpenDash server. Sign-ins, bank connections and keys never leave this computer.');
  const line = document.createElement('div'); line.className = 'sync-status'; line.setAttribute('role', 'status');
  const paint = () => {
    const s = syncStatusLine(_syncSt, Date.now());
    line.className = 'sync-status sync-' + s.tone;
    line.textContent = s.text;
    const devs = card.body.querySelector('.sync-devices');
    if (devs) devs.textContent = syncDeviceLines(_syncSt, Date.now()).join('\n');
    const live = card.body.querySelector('.sync-live');
    if (live && _syncSt) _syncLivePaint(live, _syncSt);
  };
  if (_syncCode) _syncCodePanel(card);
  const screen = syncScreen(st, _syncFlow);
  if (screen === 'loading') card.body.appendChild(_settingsRow('Status', '', line));
  else if (screen === 'start') _syncStart(card, st);
  else if (screen === 'first' || screen === 'join') _syncSetup(card, st, screen === 'first');
  else {
    const status = document.createElement('div');
    status.appendChild(line);
    if (screen === 'plain') { const devs = document.createElement('div'); devs.className = 'set-h sync-devices'; status.appendChild(devs); }
    card.body.appendChild(_settingsRow('Status', '', status));
  }
  if (screen === 'joining') _syncJoining(card, st);
  if (screen === 'removed' || screen === 'locked') {
    const jc = st.e2e && st.e2e.joinCode && st.e2e.joinCode.role === 'join' ? st.e2e.joinCode : null;
    if (jc) _syncJoinPanel(card, jc);
    if (st.e2e && st.e2e.pairing && st.e2e.pairing.role === 'join') _syncPairPanel(card, st.e2e.pairing);
    // Removed: the code (or approving) brings it back as a new device.
    if (!(jc && (jc.step === 'looking' || jc.step === 'sent'))) _syncJoinInput(card);
    _syncOtherWays(card, (box) => {
      _syncRecoveryRow(box, 'Type your recovery code', 'The long code you wrote down or printed when you turned sync on.');
      if (st.e2e && st.e2e.found && st.e2e.found.groups) box.body.appendChild(_settingsRow('Approve on your other computer', '', _syncBtn('Ask my other computer', () => _syncPost('/api/sync/pair/start'))));
    });
  }
  if (screen === 'plain') {
    card.body.appendChild(_settingsRow('Not encrypted yet', 'This sync started before encryption. Lock it so the cloud cannot read it; your other computer joins afterwards.', _syncBtn('Encrypt my synced data', () => _syncPost('/api/sync/encrypt', {}, 'Your synced data is now encrypted'), true)));
  }
  if (screen === 'ready') {
    _syncRequests(card, st);
    // "Add a computer": a 4-letter code to type on the new one (the usual way).
    const jc = st.e2e && st.e2e.joinCode && st.e2e.joinCode.role === 'offer' ? st.e2e.joinCode : null;
    if (jc && _syncJoinDismissed !== jc.expiresAt) _syncJoinPanel(card, jc);
    else card.body.appendChild(_settingsRow('Add a computer', 'Shows a 4-letter code to type on the new computer. It works once, for 10 minutes.', _syncBtn('Add a computer', () => { _syncJoinDismissed = null; _syncPost('/api/sync/code/start'); }, true)));
    _syncDevices(card, st);
    _syncLive(card, st);
    _syncOtherWays(card, (box) => {
      if (_syncAdd) _syncAddPanel(box);
      else box.body.appendChild(_settingsRow('Add a phone, or approve with 6 numbers', '', _syncBtn('Show the other ways', () => { _syncAdd = true; _syncOtherOpen = true; _syncRefresh(); })));
    });
    card.body.appendChild(_settingsRow('Recovery code', 'Lost the one you wrote down? Make a new one: the old one stops working.', _syncBtn('Make a new recovery code', async () => {
      const ok = await confirmDialog({ title: 'Make a new recovery code?', text: 'The old code will stop working. Write the new one down straight away.', confirmLabel: 'Make a new code' });
      if (ok) _syncPost('/api/sync/recovery/new');
    })));
  }
  if (screen === 'plain' || screen === 'ready') {
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
    if (screen === 'plain') {
      const name = document.createElement('input'); name.className = 'control control-sm'; name.maxLength = 60;
      name.value = st.deviceName || ''; name.placeholder = 'Work laptop';
      name.onchange = () => _syncSave({ deviceName: name.value.trim() }, 'Name saved');
      card.body.appendChild(_settingsRow('This computer is called', 'How your other computers show this one.', name));
    }
    card.body.appendChild(_settingsRow('Folder', 'OpenDash keeps an "OpenDash Sync" folder inside it. Each computer writes only its own files there.', _syncFolderControl(st)));
    const now = document.createElement('button'); now.type = 'button'; now.className = 'btn btn-secondary btn-sm'; now.textContent = 'Sync now';
    now.disabled = _syncBusy;
    now.onclick = async () => { try { _syncSt = await _syncJson('/api/sync/now', {}); } catch (e) { _syncErr = netErrorMessage(e); } _syncRefresh(); };
    card.body.appendChild(_settingsRow('Check the folder now', 'It also checks by itself every few seconds.', now));
    if (st.conflicts && st.conflicts.count) {
      const c = st.conflicts.recent[0];
      const what = c ? `${c.name ? '"' + c.name + '"' : 'an item'}${c.field ? ' (' + c.field + ')' : ''}` : 'an item';
      card.body.appendChild(_settingsRow('Edits that clashed', `${st.conflicts.count} time${st.conflicts.count === 1 ? '' : 's'} the same thing was changed on two computers at once; the later change was kept. Latest: ${what}, kept the change from ${c ? c.kept.by : 'the other computer'}. Each one is listed in conflicts.jsonl in this computer's OpenDash sync folder.`, null));
    }
  }
  if (st && st.enabled && st.skew) card.body.appendChild(_settingsRow('Clock', st.skew.text || `${st.skew.device}'s clock is about ${st.skew.aheadMin} min ahead of this one. Set both to the right time so the newest change wins.`, null));
  // Files too big to send from this computer (lib/sync/engine.mjs notSynced): they stay as they are here.
  if (st && st.enabled && Array.isArray(st.notSynced) && st.notSynced.length) {
    const n = st.notSynced;
    card.body.appendChild(_settingsRow('Not synced from this computer', `${n.slice(0, 3).map(x => x.file + ' (' + x.why + ')').join('; ')}${n.length > 3 ? ` and ${n.length - 3} more` : ''}. ${n.length === 1 ? 'It stays' : 'They stay'} as ${n.length === 1 ? 'it is' : 'they are'} on this computer; your other computers keep their own copy.`, null));
  }
  if (st && st.enabled && screen !== 'joining') card.body.appendChild(_settingsRow('Sync across my devices', 'On. Turn it off to stop syncing this computer (nothing is deleted).', _settingsSwitch(true, 'Sync across my devices', () => _syncSave({ enabled: false }, 'Sync is off'), _syncBusy)));
  if (_syncErr) { const e = document.createElement('div'); e.className = 'sync-status sync-err'; e.textContent = _syncErr; card.body.appendChild(e); }
  el.appendChild(card.card);
  paint();
  // Keep "Synced 12 s ago" current while this page is open (text only); re-render when the screen changes.
  clearInterval(_syncTicker);
  _syncTicker = setInterval(() => {
    if (!document.body.contains(line) && !document.body.contains(card.card)) { clearInterval(_syncTicker); _syncTicker = null; return; }
    _syncJson('/api/sync/status').then((s) => {
      const before = JSON.stringify([syncScreen(_syncSt, _syncFlow), _syncSt && _syncSt.e2e && _syncSt.e2e.pairing, _syncSt && _syncSt.e2e && _syncSt.e2e.joinCode, _syncSt && _syncSt.e2e && _syncSt.e2e.requests, _syncSt && _syncSt.devices && _syncSt.devices.map(d => d.name)]);
      _syncSt = s;
      const after = JSON.stringify([syncScreen(s, _syncFlow), s.e2e && s.e2e.pairing, s.e2e && s.e2e.joinCode, s.e2e && s.e2e.requests, s.devices && s.devices.map(d => d.name)]);
      if (before !== after && !_syncBusy) _syncRefresh(); else paint();
    }).catch(() => paint());
  }, 3000);
}

registerSettingsGroup({
  id: 'sync', title: 'Sync', icon: 'refresh-cw', order: 91,
  description: 'Keep your data the same on your computers through OneDrive, Google Drive or Dropbox, end-to-end encrypted.',
  render(el) {
    if (!_syncSt && !_syncErr) syncLoad();
    _syncCard(el);
    if (typeof settingsMainComputerCard === 'function') settingsMainComputerCard(el);   // 58-settings-main.js
  },
});
