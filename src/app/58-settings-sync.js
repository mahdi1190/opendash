/* ============================================================
   SETTINGS > SYNC ACROSS MY DEVICES (owner: Sync)
   Server: server/routes/sync.mjs and lib/sync/engine.mjs. Off by default.
   End-to-end encrypted (lib/sync/e2e.mjs): the cloud folder only ever holds
   locked files.
     Off:        "Is this your first computer with OpenDash?"
                 Yes -> the folder, a name, Turn on -> "Make a backup sheet?" (optional, once)
                 No  -> Step 1 of 2: the folder, a name; Step 2 of 2: type the 4 letters
                        from the other computer, both show the same picture, done.
                        (2.20.1: no recovery code in the way; "Lost all your computers?"
                        under it takes the emergency backup sheet's 10 words.)
     On (2.17.1; docs/dev/SIMPLIFY_PLAN.md section 4, the owner: "let's
                 just simplify all of these cards"): ONE card. Its face: the
                 status line (syncSummary: a dot, one word, one detail: Up to
                 date, Catching up, Syncing, Setting up, Previewing, Needs
                 you), the path line (syncPathLine: "Same Wi-Fi: direct ·
                 Elsewhere: your relay · OneDrive: backup", only what applies),
                 one row per computer (syncComputerRows: Up to date, Catching
                 up n%, Asleep, Off, Needs an update, Main computer), edits to
                 review, and one main button (the fix when something needs
                 you, else Add a computer). More: computers and phones (rename,
                 remove), the main computer (one choice for the jobs, who
                 answers first and Claude), add a phone, the recovery code,
                 Sync now, turn off. Advanced: ways to sync (your relay, the
                 cloud folder, direct on the same Wi-Fi, outside home only
                 without the relay), Preview changes first, which computer does
                 what, details for support. An asleep computer is never a fault
                 and never shows a router reason; with your relay in use the
                 router is left alone and not mentioned.
   Through your relay (lib/sync/relay.mjs; Settings > Your relay sets it up):
   when one is connected, "Sync through your relay (recommended)" is the
   default and a folder is the alternative; a computer that syncs through a
   folder gets "Sync through your relay too" (both at once). A new computer
   joins with a LINK from the other one (<relay>/j#ODJ1....) plus the 4
   letters; the existing one still asks "Approve <name>?".
   Changes from the other computer arrive through live sync (86-live-sync.js
   shows "Updated by Work laptop"). The helpers syncAgo / syncStatusLine /
   syncDeviceLines / syncScreen / syncPairView / syncKindLabel /
   syncCodeLines / syncSummary / syncPathLine / syncComputerRows /
   syncNeedsYou / syncRelayState / syncLiveLines / syncMainLines are pure.
   ============================================================ */
let _syncSt = null;
let _syncErr = '';
let _syncBusy = false;
let _syncOther = false;      // "Another folder..." picked: show the path box
let _syncTicker = null;
let _syncFlow = null;        // before sync is on: null (the question), 'first' or 'join'
let _syncCode = null;        // the backup sheet's 10 words, shown once (after "Make a backup sheet")
let _syncSheetOffer = false;  // sync was just set up: offer a backup sheet once (optional)
let _syncOffer = null;       // {text, expiresAt}: the QR offer on screen
let _syncAdd = false;        // "Add a computer or phone" open
const _syncIgnored = new Set();
let _syncOtherOpen = false;  // "Other ways" unfolded
let _syncJoinDismissed = null;   // the finished join-code panel the user closed (its expiresAt)
let _syncJoinTick = null;    // the join code's countdown (text only, every second)
let _syncLastJoinCode = null;   // the 4 letters typed last (Try again sends them again at once)
let _syncVia = null;            // the setup's way: 'relay' | 'folder' (first computer), 'link' | 'folder' (joining)
let _syncLastJoinLink = null;   // the join link pasted last (Try again sends it again)
let _syncAddInMore = false;     // the face's one button is a fix: Add a computer is the first row of More

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
/** The status line of the screens before and around the summary: {tone: off|ok|busy|warn|err|idle, word, detail}. */
function syncStatusLine(st, nowMs) {
  if (!st) return { tone: 'idle', word: 'Checking…', detail: '' };
  if (!st.enabled) return { tone: 'off', word: 'Off', detail: 'Your data stays on this computer' };
  const e = st.e2e || {};
  if (st.state === 'error') return { tone: 'err', word: 'Paused', detail: st.message || '' };
  if (st.state === 'locked') return e.reason === 'not-joined' ? { tone: 'busy', word: 'Setting up', detail: st.message || '' } : { tone: 'warn', word: 'Needs you', detail: e.reason === 'removed' ? 'This computer was removed from sync' : st.message || '' };
  if (!e.on) return { tone: 'warn', word: 'Needs you', detail: "Your synced data isn't encrypted yet" };
  if (st.mode === 'shadow') return { tone: 'idle', word: 'Previewing', detail: 'Changes from your other computers wait for you' };
  if (st.state === 'waiting' || !st.lastSyncAt) return { tone: 'busy', word: 'Setting up', detail: st.state === 'waiting' ? st.message || '' : '' };
  return { tone: 'ok', word: 'On', detail: 'last change ' + syncAgo(st.lastSyncAt, nowMs) };
}
/** One line per other computer. */
function syncDeviceLines(st, nowMs) {
  const others = ((st && st.devices) || []).filter(d => !d.me);
  if (!others.length) return ['No other computer yet.'];
  return others.map(d => `${d.name}: seen ${syncAgo(d.lastSeen, nowMs) || 'a while ago'}`);
}
/** Is this computer's sync going through your relay now? */
function syncViaRelay(st) { const R = (st && st.relay) || {}; return !!(R.on && (R.transport === 'relay' || R.transport === 'both')); }
/** "OneDrive" / "Google Drive" / "your cloud folder" (never "the sync folder"), or null without a folder. */
function syncCloudName(st) { return st && st.folder ? (st.cloud && st.cloud !== 'the sync folder' && st.cloud !== 'your relay' ? st.cloud : 'your cloud folder') : null; }
const _syncCap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
/**
 * Advanced > Details for support (docs/dev/SIMPLIFY_PLAN.md table 5.2): one line per other computer about
 * its direct link, in plain words, grey unless it needs you; then (only without your relay) whether this
 * computer can be reached from outside home. {tone, text, peer?, act?: 'hold'|'retry'}. pres (optional):
 * the presence rows, so an asleep computer shows no reason at all. Pure.
 */
function syncLiveLines(st, pres) {
  const L = st && st.live;
  if (!st || !st.enabled || !L) return [];
  const relay = syncViaRelay(st);
  const via = relay ? 'via your relay' : 'via ' + (syncCloudName(st) || 'your cloud folder');
  if (!L.on) return [{ tone: 'off', text: 'Direct on the same Wi-Fi is off.' }];
  if (L.state !== 'on') return [];
  const out = [];
  const pr = new Map((pres || []).map(d => [d.id, d]));
  const peers = L.peers || [];
  if (!peers.length) out.push({ tone: 'idle', text: 'No other computer to connect to yet.' });
  for (const p of peers) {
    const n = p.name || 'Your other computer';
    if (p.state === 'live') { out.push({ tone: 'ok', text: `${n}: direct (${p.path === 'lan' ? 'same Wi-Fi' : 'over the internet'})` }); continue; }
    const q = pr.get(p.id);
    const away = q ? !(q.reachable || q.checking) : p.reason === 'offline';
    // Every wait has a way out: Stop trying while it connects, Try again (at once, no back-off) otherwise.
    if (p.reason === 'trying') { out.push({ tone: 'idle', text: `${n}: connecting…`, peer: p.id, act: 'hold' }); continue; }
    if (p.reason === 'held') { out.push({ tone: 'idle', text: `${n}: direct paused`, peer: p.id, act: 'retry' }); continue; }
    if (away && p.reason !== 'new-key') { out.push({ tone: 'idle', text: `${n}: ${q && q.base === 'off' ? 'off' : 'asleep'}${q && q.ago != null ? ', seen ' + syncAgo(Date.now() - q.ago, Date.now()) : ''}` }); continue; }
    if (p.reason === 'no-address') out.push({ tone: 'idle', text: `${n}: no direct address yet (is Freeflo up to date on it?)`, peer: p.id, act: 'retry' });
    else if (p.reason === 'new-key') out.push({ tone: 'idle', text: `${n}: catching up with a change` });
    else if (p.reason === 'firewall') out.push({ tone: relay ? 'idle' : 'warn', text: 'Windows Firewall blocks direct connections on this Wi-Fi', peer: p.id, act: 'firewall' });
    else if (p.reason === 'lan-blocked') out.push({ tone: 'idle', text: `${n}: this Wi-Fi keeps computers apart; ${via}`, peer: p.id, act: 'retry' });
    else out.push({ tone: 'idle', text: `${n}: no direct path; ${via}`, peer: p.id, act: 'retry' });
  }
  if (relay) return out;
  // This computer from outside home: only without the relay (with it, the router does not matter).
  const r = L.reach || {};
  const cloud = syncCloudName(st) || 'your cloud folder';
  if (L.internet === false) out.push({ tone: 'idle', text: 'Outside home: not asked (the switch is off)' });
  else if (r.state === 'mapped') out.push({ tone: 'ok', text: 'Outside home: reachable' });
  else if (['cgnat', 'double-nat', 'none', 'refused'].includes(r.state)) out.push({ tone: 'idle', text: 'Outside home: not reachable directly; ' + cloud + ' carries changes', peer: 'all', act: 'retry' });
  else if (r.state === 'trying') out.push({ tone: 'idle', text: 'Outside home: asking your router…' });
  return out;
}
/** Which computer does what, one line per job (Advanced): "Answers your phone: This computer", "Checks Gmail: Work laptop". Pure. */
function syncMainLines(st) {
  const L = st && st.live;
  if (!L || L.state !== 'on') return [];
  return (L.roles || []).filter(r => r && r.name).map((r) => {
    const what = r.role === 'phone' ? 'Answers your phone' : r.role === 'claude' ? 'Runs Claude jobs' : 'Checks ' + (r.label || 'an account');
    return what + ': ' + (r.me ? 'this computer' : r.name) + (r.acting ? '' : ' (taking over)');
  });
}
/** a < b for two app versions ('2.16.0' < '2.17.1'); unknown versions compare equal. */
function _syncVerLess(a, b) {
  const p = (v) => { const m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(v || '')); return m ? [+m[1], +m[2], +(m[3] || 0)] : null; };
  const x = p(a), y = p(b);
  if (!x || !y) return false;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i];
  return false;
}
const SYNC_AWAKE_MS = 210 * 1000;          // a device.json heartbeat every 2 minutes (lib/sync/presence.mjs FRESH_MS)
const SYNC_ASLEEP_MS = 12 * 3600 * 1000;   // quiet for less than this: asleep; longer: off (presence.mjs ASLEEP_MS)
/**
 * The path line (plan 4.3): how this computer's changes travel now, only what applies.
 * "Same Wi-Fi: direct · Elsewhere: your relay · OneDrive: backup". Pure.
 */
function syncPathLine(st) {
  const R = (st && st.relay) || {}, L = (st && st.live) || null;
  const relay = syncViaRelay(st);
  const cloud = syncCloudName(st);
  const parts = [];
  if (L && L.on && L.state === 'on') parts.push('Same Wi-Fi: direct');
  const whose = R.role === 'member' ? "a friend's relay" : 'your relay';
  const why = { busy: whose + ' is resting until tomorrow', rate: whose + ' is slowing down for a moment', offline: whose + " can't be reached right now" }[R.state];
  if (relay && !why) { parts.push('Elsewhere: ' + whose); if (cloud) parts.push(_syncCap(cloud) + ': backup'); }
  else if (relay) parts.push(cloud ? 'Elsewhere: ' + cloud + ' for now (' + why + ')' : _syncCap(why) + '; changes wait here and go then');
  else if (cloud) parts.push('Elsewhere: ' + cloud);
  return parts.join(' · ');
}
/**
 * One row per other computer and phone, then this computer (plan 4.4). Pure.
 * pres: GET /api/sync/presence devices ({id, base, reachable, checking, outdated, version, ago}) or null;
 * main: {name, me} of the main computer, or null.
 * -> [{id, name, kind, me, chip, tone: ok|busy|idle|warn, detail, away, pct, main}]
 * Asleep or off is never shown as a fault, and never with a reason (router, unreachable).
 */
function syncComputerRows(st, pres, nowMs, main) {
  const R = (st && st.relay) || {}, L = (st && st.live) || null;
  const relayUp = syncViaRelay(st) && (R.state === 'live' || R.state === 'polling');
  const cloud = syncCloudName(st);
  const peers = new Map(((L && L.peers) || []).map(p => [p.id, p]));
  const pr = new Map((pres || []).map(d => [d.id, d]));
  const catching = syncCatchUpLines(st);
  const mine = st && st.health && st.health.appVersion;
  const rows = [];
  for (const d of ((st && st.devices) || []).filter(x => !x.me)) {
    const name = d.name || 'Your other computer';
    const p = peers.get(d.id), q = pr.get(d.id);
    const live = !!(p && p.state === 'live');
    const seenMs = q && q.ago != null ? nowMs - q.ago : d.lastSeen || 0;
    const base = live ? 'running' : q ? q.base : (seenMs && nowMs - seenMs <= SYNC_AWAKE_MS && !(p && p.reason === 'offline') ? 'running' : seenMs && nowMs - seenMs <= SYNC_ASLEEP_MS ? 'asleep' : 'off');
    const reachable = live || (q ? !!q.reachable : base === 'running');
    const seen = seenMs ? 'seen ' + syncAgo(seenMs, nowMs) : '';
    const path = live || q && q.path === 'direct' ? 'direct' : q && q.path === 'relay' ? 'via your relay' : cloud ? 'via ' + cloud : '';
    const ver = (q && q.version) || d.app || null;
    const old = q && q.outdated != null ? !!q.outdated : !!(ver && mine && _syncVerLess(ver, mine));
    const c = catching.find(x => x.name === name);
    const row = { id: d.id, name, kind: d.kind || 'computer', me: false, away: false, pct: null, main: !!(main && !main.me && main.name === name) };
    if (row.kind === 'phone') Object.assign(row, { chip: '', tone: 'idle', detail: seen });
    else if (c) Object.assign(row, { chip: c.pct == null ? 'Catching up' : 'Catching up ' + c.pct + '%', tone: 'busy', detail: reachable ? path : seen, pct: c.pct });
    else if (q && q.checking && !live) Object.assign(row, { chip: 'Checking…', tone: 'idle', detail: '' });
    else if (old && ver && reachable) Object.assign(row, { chip: 'Needs an update', tone: 'warn', detail: 'On Freeflo ' + ver + ': update it there' });
    else if (reachable && q && q.behind > 0) Object.assign(row, { chip: q.pct != null ? 'Catching up ' + q.pct + '%' : 'Catching up', tone: 'busy', detail: q.pct != null ? path : q.behind + ' change' + (q.behind === 1 ? '' : 's') + ' to go', pct: q.pct != null ? q.pct : null });
    else if (reachable) Object.assign(row, { chip: 'Up to date', tone: 'ok', detail: path });
    else Object.assign(row, { chip: base === 'off' ? 'Off' : 'Asleep', tone: 'idle', detail: seen, away: true });
    rows.push(row);
  }
  rows.push({ id: 'me', name: 'This computer', kind: 'computer', me: true, chip: main && main.me ? 'Main computer' : '', tone: 'idle', detail: '', away: false, pct: null, main: !!(main && main.me) });
  return rows;
}
/**
 * Something only you can fix (plan 4.2 row 4, L7): {detail, fix: {label, run: id}, err} or null. Pure.
 * health: the Check-up answer (GET /api/sync/health) when loaded: its first `needsUser` item.
 * fix.run: 'check' (look for the relay again) | 'compact' | 'checkup' | 'apply-health' (run the item's own fix) | 'now'.
 */
function syncNeedsYou(st, health) {
  if (!st || !st.enabled) return null;
  const R = st.relay || {};
  if (st.state === 'error') return { detail: 'Sync is paused', fix: { label: 'Try again', run: 'now' }, err: true };
  if (R.on && R.state === 'quota') return { detail: "Your relay's storage is full", fix: { label: 'Make room', run: 'compact' } };
  if (R.on && R.state === 'denied') return R.hasKey ? { detail: 'Your relay refused this computer', fix: { label: 'Open Check-up', run: 'checkup' } } : { detail: 'Type a 4-letter code from a computer that uses your relay', fix: null };
  if (['key', 'record', 'private'].includes(R.missing)) return { detail: R.missing === 'private' ? "Your relay's address doesn't work on this network" : "Your relay isn't set up on this computer yet", fix: { label: 'Try again', run: 'check' } };
  if (st.skew && Math.abs(st.skew.aheadMin || 0) > 2) return { detail: `${st.skew.device}'s clock is ${Math.abs(st.skew.aheadMin)} min out`, fix: { label: 'How to fix', run: 'checkup' } };
  const c = health && Array.isArray(health.checks) ? health.checks.find(x => x.needsUser) : null;
  if (c) return { detail: c.title, fix: c.fix && (c.fix.action || c.fix.view) ? { label: c.fix.label || 'Fix it', run: 'apply-health', check: c.id } : { label: 'Open Check-up', run: 'checkup' }, err: c.tone === 'err' };
  return null;
}
/**
 * The status line (plan 4.2, first match wins): {tone: ok|busy|idle|off|warn|err, word, detail, fix?}. Pure.
 * Never amber for another computer asleep or off, the relay resting, the first sync, or no direct link.
 */
function syncSummary(st, pres, health, nowMs, main) {
  if (!st) return { tone: 'idle', word: 'Checking…', detail: '' };
  if (!st.enabled) return { tone: 'off', word: 'Off', detail: 'Your data stays on this computer' };
  const need = syncNeedsYou(st, health);
  if (need) return { tone: need.err ? 'err' : 'warn', word: 'Needs you', detail: need.detail, fix: need.fix };
  if (!st.apply) return { tone: 'idle', word: 'Previewing', detail: 'Changes from your other computers wait for you (Advanced)' };
  if (st.state === 'waiting' || !st.lastSyncAt) return { tone: 'busy', word: 'Setting up', detail: st.state === 'waiting' && st.message ? st.message : '' };
  const rows = syncComputerRows(st, pres, nowMs || Date.now(), main).filter(r => !r.me && r.kind !== 'phone');
  const c = rows.find(r => r.tone === 'busy');
  if (c) return { tone: 'busy', word: 'Catching up', detail: c.name + (c.pct != null ? ' ' + c.pct + '%' : c.detail && /to go$/.test(c.detail) ? ': ' + c.detail : '') };
  const sending = (pres || []).some(d => d.reachable && ['live', 'direct', 'relay'].includes(d.path) && d.behind > 0);
  if (sending) return { tone: 'busy', word: 'Syncing', detail: 'Sending your changes' };
  if (!rows.length) return { tone: 'ok', word: 'On', detail: 'Add your other computer to start' };
  const away = rows.filter(r => r.away);
  if (!away.length) return { tone: 'ok', word: 'Up to date', detail: rows.length === 1 ? rows[0].name + ' has everything' : 'your ' + rows.length + ' other computers have everything' };
  return { tone: 'ok', word: 'Up to date', detail: away.length === 1 ? away[0].name + ' is ' + (away[0].chip === 'Off' ? 'off' : 'asleep') + ' and catches up when it wakes' : away.length + " computers catch up when they're back" };
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
/** A 4-letter code as it is shown: "KQ MX". */
function syncFormatShort(c) { const s = String(c || ''); return s.length === 4 ? s.slice(0, 2) + ' ' + s.slice(2) : s; }
/** The matching picture ([emoji, word]) both computers show: a calm box, or null. */
function syncPicEl(pic) {
  if (!Array.isArray(pic) || !pic[0]) return null;
  const box = _syncEl('div', 'sync-pic');
  const e = _syncEl('span', 'sync-pic-e', pic[0]); e.setAttribute('aria-hidden', 'true');
  box.append(e, _syncEl('span', 'sync-pic-w', pic[1] || ''));
  box.setAttribute('role', 'img'); box.setAttribute('aria-label', 'Picture: ' + (pic[1] || ''));
  return box;
}
/** The recovery code in two lines of four groups (easier to copy by hand). */
function syncCodeLines(code) {
  const g = String(code || '').split('-');
  return g.length === 8 ? [g.slice(0, 4).join('-'), g.slice(4).join('-')] : [String(code || '')];
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
      case 'waiting': return { title: 'Waiting for your other computer', text: 'Open Settings > Sync on it. Nothing yet? Ask again.', actions: [['again', 'Ask again'], ['cancel', 'Cancel']] };
      case 'compare': return { title: 'Check code', code, text: 'Is it exactly the same on your other computer?', actions: [['yes', 'Yes, the same', true], ['no', 'No']] };
      case 'confirmed': return { title: 'Check code', code, text: 'Now click "Yes, the same" there.', actions: [['cancel', 'Cancel']] };
      case 'done': return { title: 'Done', text: 'This computer syncs now.', actions: [] };
      case 'declined': return { title: 'Stopped', text: "The codes didn't match. Nothing was shared.", actions: [['again', 'Try again', true], ['close', 'Close']] };
      case 'cancelled': return { title: 'Stopped', text: 'Nothing was shared.', actions: [['again', 'Try again', true], ['close', 'Close']] };
      case 'expired': return p.why === 'other-ended'
        ? { title: 'Your other computer stopped', text: 'Nothing was shared.', actions: [['again', 'Try again', true], ['close', 'Close']] }
        : { title: 'This took too long', text: 'Nothing was shared.', actions: [['again', 'Try again', true], ['close', 'Close']] };
      default: return { title: 'Something went wrong', text: 'Nothing was shared. Try again.', actions: [['again', 'Try again', true], ['close', 'Close']] };
    }
  }
  switch (p.step) {
    case 'waiting': return { title: 'Checking ' + other, text: 'Waiting for ' + other + '…', actions: [['cancel', 'Cancel']] };
    case 'compare': return { title: 'Check code', code, text: 'Only say yes if ' + other + ' shows exactly these numbers.', actions: [['yes', 'Yes, the same', true], ['no', 'No']] };
    case 'sent': return { title: 'Sent', text: _syncCap(other) + ' finishes by itself.', actions: [['cancel', 'Cancel']] };
    case 'done': return { title: 'Done', text: _syncCap(other) + ' syncs now.', actions: [['close', 'OK', true]] };
    case 'declined': return { title: 'Stopped', text: "The codes didn't match. Nothing was shared.", actions: [['close', 'Close']] };
    case 'cancelled': return { title: 'Stopped', text: 'Nothing was shared.', actions: [['close', 'Close']] };
    case 'expired': return p.why === 'other-ended'
      ? { title: 'The new computer stopped', text: 'Nothing was shared.', actions: [['close', 'Close']] }
      : { title: 'This took too long', text: 'Nothing was shared.', actions: [['close', 'Close']] };
    default: return { title: 'Stopped for safety', text: 'The request changed while it was checked. Nothing was shared; start again on the new computer.', actions: [['close', 'Close']] };
  }
}

/** A relay this person can sync through, known on this computer (not just the link of a join). */
function syncRelayReady(st) { const R = st && st.relay; return !!(R && R.available && R.usable && R.source !== 'link'); }
/**
 * Catching up: [{name, pct}] for each other computer whose changes are still being read here
 * (bytes of its logs and snapshot not read yet, Health's transfer.in), and holes being filled
 * ({name, pct: null, hole: true}: one change missing, its changes are read again). Pure.
 */
function syncCatchUpLines(st) {
  const h = (st && st.health) || {};
  const inn = h.transfer && h.transfer.in;
  const out = [];
  for (const f of (inn && inn.from) || []) {
    if (!f || !(f.total > 0) || f.total - f.read <= 0) continue;
    out.push({ name: f.name || 'your other computer', pct: Math.max(0, Math.min(99, Math.floor((f.read / f.total) * 100))) });
  }
  for (const g of h.gaps || []) if (g && !out.some(x => x.name === g.name)) out.push({ name: g.name || 'your other computer', pct: null, hole: true });
  return out;
}
/** "Catching up with Work laptop: 28%" (one line per computer). */
function syncCatchUpText(c) { return 'Catching up with ' + c.name + (c.pct == null ? ': a change is missing here, reading its changes again' : ': ' + c.pct + '%'); }
/** Your relay's state for Advanced > Ways to sync (plan table 5.2): {tone, word, detail, fix?} or null when it is not used here. Pure. */
function syncRelayState(st) {
  const R = st && st.relay;
  if (!R || !R.on || !(R.transport === 'relay' || R.transport === 'both')) return null;
  switch (R.state) {
    case 'live': return { tone: 'ok', word: 'Connected', detail: 'changes arrive within a second' };
    case 'polling': return { tone: 'ok', word: 'Connected', detail: 'checks every minute' };
    case 'connecting': case undefined: return { tone: 'busy', word: 'Connecting', detail: '' };
    case 'offline': return { tone: 'idle', word: "Can't be reached right now", detail: 'tries again by itself' };
    case 'rate': return { tone: 'idle', word: 'Slowing down for a moment', detail: 'tries again by itself' };
    case 'busy': return { tone: 'idle', word: 'Resting until tomorrow', detail: "Cloudflare's free daily allowance is used up" };
    case 'quota': return { tone: 'warn', word: 'Storage full', detail: '', fix: { label: 'Make room', run: 'compact' } };
    case 'denied': return R.hasKey ? { tone: 'warn', word: 'Refused this computer', detail: '', fix: { label: 'Open Check-up', run: 'checkup' } } : { tone: 'warn', word: 'Needs you', detail: 'Type a 4-letter code from a computer that uses it' };
    default: return { tone: 'idle', word: 'Unexpected answer', detail: 'tries again by itself' };
  }
}
/**
 * The relay row while this computer does NOT sync through it: {title, text, tone, act}
 * act: 'use' (Use it here) | 'check' (Try again: look for it again) | 'relay' (Open Your relay:
 * a friend's relay to choose for sync there) | null. Never offers
 * Set up my relay when the person already has a relay (here or on another computer):
 * that would make a second one. Pure.
 */
function syncRelayView(st) {
  const R = (st && st.relay) || {};
  const P = R.person || null;
  const host = (P && P.host) || R.host || R.privateHost || null;
  const name = host ? 'Your relay ' + host : 'Your relay';
  const other = (P && P.from === 'peer' && P.by) || 'your other computer';
  if (R.missing === 'private') return { title: name, tone: 'warn', text: syncNoRelayLine(st), act: 'check' };
  if (R.missing === 'scope') return { title: name, tone: 'idle', text: "It belongs to a friend, who gave you messages only, so it does not carry your sync. Ask them for an invite that includes device sync, or sync through your folder as now.", act: null };
  // A friend's relay that allows device sync is used for it only once chosen in Settings > Your relay (never by itself).
  if (R.missing === 'choose') return { title: "A friend's relay" + (host ? ' ' + host : ''), tone: 'idle', text: "Its owner lets you sync your devices through it, but you haven't chosen that yet, so sync goes through your folder as now. To use it, open Your relay and click Use it for sync.", act: 'relay' };
  if (R.missing === 'key') return { title: name + " isn't used on this computer yet", tone: 'warn', text: 'Waiting for ' + other + ' to share the key to it: open Freeflo there (on the same network it takes a second). Or paste a join link from it (Advanced, below).', act: 'check' };
  if (R.missing === 'record') return { title: name + " isn't used on this computer yet", tone: 'warn', text: 'Its details are on their way from ' + other + ': open Freeflo there, or click Try again.', act: 'check' };
  if (P || (R.available && R.usable && R.source !== 'link')) {
    const cloud = st && st.folder ? (st.cloud || 'your folder') : 'your folder';
    return { title: name + " isn't used on this computer yet", tone: 'idle', text: (R.off ? 'You turned it off on this computer. ' : '') + 'It carries your changes locked, within a second, without ' + cloud + ' having to be running; ' + cloud + ' keeps a backup copy.', act: R.available && R.usable ? 'use' : 'check' };
  }
  return { title: 'Your relay', tone: 'idle', text: syncNoRelayLine(st), act: syncRelayCanCheck(st) ? 'check' : null };
}
/**
 * The calm line when this computer has no relay to sync through. st (optional): the status,
 * so a relay that is set up elsewhere, or whose address is refused here, is never mistaken
 * for none at all (that would invite a second relay).
 */
function syncNoRelayLine(st) {
  const R = (st && st.relay) || {};
  if (R.private) return "Your relay's address" + (R.privateHost ? ' (' + R.privateHost + ')' : '') + ' points inside this network, so Freeflo does not use it here. Check the address in Settings > Your relay, then click Try again.';
  if (R.person || (R.hasKey && !R.available)) return 'Your relay' + (R.person && R.person.host ? ' ' + R.person.host : '') + ' is set up on your other computer but has not reached this one yet. It arrives by itself when your computers next sync; Try again looks now.';
  return 'Tip: set up your relay (free) to sync anywhere within a second.';
}
/** Whether the no-relay line has a Try again (the relay exists, it has not arrived or its address was refused). */
function syncRelayCanCheck(st) { const R = (st && st.relay) || {}; return !!(R.private || R.person || (R.hasKey && !R.available)); }
/** One line: what syncs and what never does. */
function syncWhatSyncs() { return 'Syncs your tasks, notes, people, Home and settings. Never sign-ins, passwords or bank connections.'; }
/** The folder row's one line: the personal OneDrive is picked for you, and why. */
function syncFolderHint(st, first) {
  if (!first) return 'The same one as on your other computer.';
  const det = (st && st.detected) || [];
  const pick = (st && st.folder && det.find(d => d.path === st.folder)) || det.find(d => !d.work) || null;
  const work = det.some(d => d.work);
  if (pick && pick.kind === 'onedrive' && !pick.work) return 'Your personal OneDrive.' + (work ? ' Not the work one: your employer can see that.' : '');
  return 'OneDrive, Google Drive or Dropbox.';
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
  // 2.20.1: big friendly steps, the code as "KQ MX", the matching picture, and what to do next in plain words.
  if (j.role === 'offer') {
    switch (j.step) {
      case 'waiting': return { step: 'Step 1 of 2', title: 'Type this on your new computer', code: syncFormatShort(j.code), countdown: true, text: 'On the new computer, open Freeflo, go to Settings > Sync, choose "No, join my other computer" and type these 4 letters. The code works once.' + (j.wrong ? ' ' + j.wrong + (j.wrong === 1 ? ' wrong try' : ' wrong tries') + ' so far; after 3 you need a new code.' : ''), actions: [['new', 'New code'], ['cancel', 'Cancel']] };
      case 'approve': return j.member
        ? { step: 'Step 2 of 2', title: 'Let ' + other + ' use fast sync too?', pic: j.pic, text: j.pic ? 'It already syncs with this computer. Say yes only if it shows the same picture:' : 'It already syncs with this computer.', actions: [['approve', 'Yes', true], ['decline', 'No']] }
        : { step: 'Step 2 of 2', title: 'Is ' + other + ' your new computer?', pic: j.pic, text: j.pic ? 'Say yes only if it shows this same picture:' : "Say yes only if you're adding it right now.", actions: [['approve', 'Yes, add it', true], ['decline', 'No, not mine']] };
      case 'sent': return { title: 'Adding ' + other, text: Other + ' finishes by itself in a few seconds.', actions: [['cancel', 'Cancel']] };
      case 'done': return { title: 'Done', text: Other + (j.member ? ' uses fast sync now.' : ' is joined. Your computers now stay the same.'), actions: [['close', 'OK', true]] };
      case 'declined': return { title: 'Not added', text: 'Nothing was shared. Make a new code to try again.', actions: [['new', 'Make a new code', true], ['close', 'Close']] };
      case 'burned': return { title: 'This code stopped working', text: 'It was typed wrong 3 times, so nothing was shared. Make a new code and type it carefully.', actions: [['new', 'Make a new code', true], ['close', 'Close']] };
      case 'clash': return { title: 'Two computers typed this code', text: 'Nothing was shared, to be safe. Make a new code and type it only on your new computer.', actions: [['new', 'Make a new code', true], ['close', 'Close']] };
      case 'expired': return { title: 'The code ran out', text: 'Codes last 10 minutes. Nothing was shared. Make a new one when you are ready.', actions: [['new', 'Make a new code', true], ['close', 'Close']] };
      default: return { title: 'Stopped', text: 'Nothing was shared. Make a new code to try again.', actions: [['new', 'Make a new code', true], ['close', 'Close']] };
    }
  }
  // j.member: this computer already syncs and asked for fast sync only (2.17.1: a pasted join link under Advanced)
  switch (j.step) {
    case 'looking': return { step: 'Step 2 of 2', title: j.member ? 'Asking your other computer' : 'Looking for your other computer', countdown: true, text: 'Usually a few seconds. Keep Freeflo open on both computers.', actions: [['retry', 'Try again'], ['cancel', 'Cancel']] };
    case 'sent': return { step: 'Step 2 of 2', title: 'Now press Yes on your other computer', pic: j.pic, countdown: true, text: j.pic ? 'It asks if this is your new computer and shows this same picture:' : 'It asks if this is your new computer.', actions: [['retry', 'Try again'], ['cancel', 'Cancel']] };
    case 'declined': return { title: 'Not added', text: 'Your other computer said no. To try again, make a new code there (Settings > Sync > Add a computer).', actions: [['close', 'Close']] };
    case 'done': return { title: 'Done', text: j.member ? 'This computer uses fast sync in a moment.' : 'This computer is joined. It now stays the same as your other one.', actions: j.member ? [['close', 'OK', true]] : [] };
    case 'wrong': return { title: "That code isn't right", text: 'Look at your other computer and type the 4 letters again. After 3 wrong tries it makes you a new code.', actions: [['close', 'Close']] };
    case 'clash': return { title: 'Two computers typed this code', text: 'Nothing was shared, to be safe. Make a new code on your other computer.', actions: [['close', 'Close']] };
    case 'taken': return { title: 'That code was already used', text: 'Each code works once. Make a new one on your other computer.', actions: [['close', 'Close']] };
    case 'expired': return { title: 'This took too long', text: 'Codes last 10 minutes. Make a new one on your other computer (Settings > Sync > Add a computer).', actions: [['close', 'Close']] };
    default: return { title: 'Stopped', text: 'Nothing was shared. You can type a code again.', actions: [['retry', 'Try again'], ['close', 'Close']] };
  }
}

async function _syncJson(url, body, signal) {
  const r = await fetch(url, body === undefined ? { cache: 'no-store', signal } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j && (j.error && (j.error.message || j.error))) || ('HTTP ' + r.status));
  return j;
}
/** What makes the Sync tab redraw when it changes: the newest feed line, the clashes waiting. */
function _syncFeedKey(s) { const c = (s && s.changes) || []; return [c[0] ? c[0].id + ':' + c[0].count : '', s && s.health ? s.health.conflictsOpen || 0 : 0].join('|'); }
function _syncRefresh() { if (state.view === 'settings:sync') renderMain(); }
async function syncLoad() {
  try { _syncSt = await _syncJson('/api/sync/status'); _syncErr = ''; }
  catch (e) { _syncErr = netErrorMessage(e); }
  _syncRefresh();
}
async function _syncSave(patch, okMsg) { return _syncPost('/api/sync/settings', patch, okMsg); }
// Every wait has a way out (the user's rule, 23 Oct 2026): a request in flight shows
// Cancel, which stops waiting at once; a failure shows its reason with Try again,
// which sends the same request again straight away. The timeout is only the fallback.
let _syncAbort = null;           // the AbortController of the request in flight
let _syncLast = null;            // {url, body, okMsg} of the last request (Try again)
const SYNC_POST_TIMEOUT_MS = 90 * 1000;
/** POST, keep the status it answers with, show a code it carries once. */
async function _syncPost(url, body, okMsg) {
  if (_syncBusy) return null;
  _syncBusy = true; _syncErr = '';
  _syncLast = { url, body: body || {}, okMsg };
  const ac = new AbortController();
  _syncAbort = ac;
  const timer = setTimeout(() => ac.abort('timeout'), SYNC_POST_TIMEOUT_MS);
  _syncRefresh();
  let j = null;
  try {
    j = await _syncJson(url, body || {}, ac.signal);
    // The backup sheet's words come only from "Make a backup sheet"; setting up offers one (optional).
    if (j && j.recoveryCode) { if (url === '/api/sync/recovery/new') _syncCode = j.recoveryCode; delete j.recoveryCode; }
    if (j && j.sheetOffer) { _syncSheetOffer = true; delete j.sheetOffer; }
    if (j && j.offer) { _syncOffer = j.offer; delete j.offer; }
    if (j && j.enabled !== undefined) _syncSt = j;
    if (okMsg) toast(okMsg, { kind: 'ok' });
    _syncLast = null;
  } catch (e) {
    if (ac.signal.aborted) _syncErr = ac.signal.reason === 'timeout' ? 'No answer yet. It may still finish; this page will show it.' : 'Stopped waiting. If it finishes anyway, this page shows it.';
    else _syncErr = netErrorMessage(e);
    j = null;
  }
  clearTimeout(timer);
  if (_syncAbort === ac) _syncAbort = null;
  _syncBusy = false;
  _syncRefresh();
  // The status as it is now (a cancelled step may have moved on); the failure line stays.
  if (!j) _syncJson('/api/sync/status').then((s) => { _syncSt = s; _syncRefresh(); }).catch(() => {});
  return j;
}
function syncCancelWait() { if (_syncAbort) _syncAbort.abort('cancel'); }
/** "Working… [Cancel]" while a request is in flight; "<reason> [Try again]" after one failed. */
function _syncWaitRow(card) {
  if (_syncBusy) {
    const row = _syncEl('div', 'sync-wait'); row.setAttribute('role', 'status');
    row.appendChild(_syncEl('span', 'spinner'));
    row.appendChild(_syncEl('span', null, 'Working…'));
    row.appendChild(uiButton({ label: 'Cancel', kind: 'ghost', size: 'sm', run: syncCancelWait, bubble: true }));   // never disabled
    card.body.prepend(row);
  }
}
function _syncFailRow(card) {
  if (!_syncErr) return;
  const e = _syncEl('div', 'sync-status sync-err sync-fail'); e.setAttribute('role', 'alert');
  e.appendChild(_syncEl('span', null, _syncErr));
  if (_syncLast) e.appendChild(uiButton({ label: 'Try again', size: 'sm', bubble: true, run: () => { const l = _syncLast; _syncErr = ''; _syncPost(l.url, l.body, l.okMsg); } }));
  e.appendChild(uiButton({ label: 'Close', kind: 'ghost', size: 'sm', bubble: true, run: () => { _syncErr = ''; _syncLast = null; _syncRefresh(); } }));
  card.body.prepend(e);
}

function _syncEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
/** The card's small button: the kit's uiButton (disabled while a request is in flight). */
function _syncBtn(label, onClick, primary, disabled) {
  return uiButton({ label, kind: primary ? 'primary' : 'secondary', size: 'sm', disabled: !!disabled || _syncBusy, run: onClick, bubble: true });
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
    const o = document.createElement('option'); o.value = d.path; o.textContent = `${d.kind === 'onedrive' && !d.work ? 'OneDrive (personal)' : d.label} (${d.path})`;
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
  const use = _syncBtn('Use this folder', () => {
    const v = input.value.trim();
    if (!v) return;
    _syncOther = false;
    if (st && st.enabled) _syncSave({ folder: v }, 'Folder changed');
    else if (_syncSt) { _syncSt = Object.assign({}, _syncSt, { folder: v }); _syncRefresh(); }
  });
  box.append(input, use);
  box.hidden = !(_syncOther || (!det.length && !cur));
  wrap.appendChild(box);
  sel.onchange = () => {
    if (sel.value === '__other') { _syncOther = true; box.hidden = false; input.focus(); return; }
    _syncOther = false; box.hidden = true;
    if (st && st.enabled) _syncSave({ folder: sel.value }, 'Folder changed');
    else if (_syncSt) _syncSt = Object.assign({}, _syncSt, { folder: sel.value });
  };
  wrap._value = () => (sel.value === '__other' ? (input.value.trim() || null) : sel.value);
  return wrap;
}

/**
 * "Remove <device>" (2.19.8; 2.20.1: one calm step, no codes). Removing also renews the backup
 * secret unseen (the removed device knew the old one's public half): a person who had made a backup
 * sheet is reminded in Settings to print a new one. When Friends is set up, it is locked out of
 * Friends too, without asking (server/routes/sync.mjs).
 */
function _syncRemoveDialog(id, name) {
  const fr = !!(typeof _fr !== 'undefined' && _fr && _fr.data && _fr.data.me && _fr.data.me.id);
  openDialog({
    title: 'Remove ' + name + '?', width: 440,
    body(el) {
      el.appendChild(_syncEl('p', 'muted', 'It stops getting your changes and keeps what it already has. Your other computers carry on as usual.'));
      if (fr) el.appendChild(_syncEl('p', 'muted', 'It is locked out of Friends too, so it can\u2019t act as you.'));
      el.appendChild(_syncEl('p', 'muted', 'Got it back later? Join it again with a code, like a new computer.'));
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Remove', danger: true, run: () => { _syncPost('/api/sync/devices/remove', { id }, 'Removed ' + name); } },
    ],
  });
}

/** The words of a backup sheet, numbered, in two columns. */
function _syncWordsEl(words, cls) {
  const list = _syncEl('ol', cls || 'sync-words');
  for (const w of String(words || '').split(/\s+/).filter(Boolean)) list.appendChild(_syncEl('li', null, w));
  return list;
}
/** Print the emergency backup sheet (the words, big, with how to use them). */
function _syncPrintSheet(words) {
  const sheet = _syncEl('div', 'sync-print-sheet');
  sheet.appendChild(_syncEl('h1', null, 'Freeflo emergency backup sheet'));
  sheet.appendChild(_syncEl('p', null, 'Keep this at home, somewhere safe. You only need it if you lose every computer that has Freeflo.'));
  if (/^[a-z]+( [a-z]+){5,}$/.test(String(words || ''))) sheet.appendChild(_syncWordsEl(words, 'sync-words sync-words-print'));
  else for (const l of syncCodeLines(words)) sheet.appendChild(_syncEl('p', 'sync-code-v', l));
  sheet.appendChild(_syncEl('p', null, 'To use it: put Freeflo on a computer, open Settings > Sync, choose "No, join my other computer", then "Lost all your computers?", and type these words.'));
  sheet.appendChild(_syncEl('p', null, 'Anyone with these words and your cloud folder can read your synced data, so keep it private. Made ' + new Date().toLocaleDateString() + '.'));
  document.body.appendChild(sheet); document.body.classList.add('sync-printing');
  const done = () => { document.body.classList.remove('sync-printing'); sheet.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 60000);
}
/** "Make a backup sheet": a new sheet (any older one stops working), shown once here. */
function syncMakeSheet() { _syncSheetOffer = false; _syncPost('/api/sync/recovery/new'); }
/** The emergency backup sheet, shown once: print it or write the words down. */
function _syncCodePanel(card) {
  const box = _syncEl('div', 'sync-code');
  box.appendChild(_syncEl('div', 'sync-code-t', 'Your emergency backup sheet'));
  box.appendChild(_syncEl('p', 'set-h', 'Only needed if you lose every computer. Print it, or write the 10 words down in this order, and keep it somewhere safe at home.'));
  if (/^[a-z]+( [a-z]+){5,}$/.test(String(_syncCode || ''))) box.appendChild(_syncWordsEl(_syncCode));
  else { const c = _syncEl('div', 'sync-code-v'); for (const l of syncCodeLines(_syncCode)) c.appendChild(_syncEl('div', null, l)); box.appendChild(c); }
  box.appendChild(_syncEl('p', 'set-h', 'It is shown only now. Any older backup sheet no longer works.'));
  const row = _syncEl('div', 'sync-actions');
  const words = _syncCode;
  row.append(
    _syncBtn('Print it', () => _syncPrintSheet(words)),
    _syncBtn("Done, I've saved it", () => { _syncCode = null; _syncRefresh(); }, true),
  );
  box.appendChild(row);
  card.body.appendChild(box);
}
/** Right after sync is set up: a backup sheet, offered once, gently (optional). */
function _syncSheetOfferPanel(card) {
  const box = _syncEl('div', 'sync-code sync-sheet-offer');
  box.appendChild(_syncEl('div', 'sync-code-t', 'Sync is on'));
  box.appendChild(_syncEl('p', 'set-h', 'One more thing, if you like: print or save a backup sheet in case you ever lose all your computers. You can also do it later in Settings > Sync > More.'));
  const row = _syncEl('div', 'sync-actions');
  row.append(_syncBtn('Make a backup sheet', syncMakeSheet, true), _syncBtn('Not now', () => { _syncSheetOffer = false; _syncRefresh(); }));
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
      else if (id === 'cancel' || id === 'close') _syncPost('/api/sync/pair/cancel');     // close: a finished pairing goes at once
      else if (id === 'again') _syncPost('/api/sync/pair/start');                         // a fresh session now (the old one is replaced on both sides)
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
  if (v.step) box.appendChild(_syncEl('div', 'sync-step', v.step));
  box.appendChild(_syncEl('div', 'sync-pair-t', v.title));
  if (v.code) { const c = _syncEl('div', 'sync-join-code', v.code); c.setAttribute('aria-label', 'Code: ' + v.code.replace(/\s/g, '').split('').join(' ')); box.appendChild(c); }
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
  const pic = syncPicEl(v.pic);
  if (pic) box.appendChild(pic);
  _syncLinkBox(box, j);
  if (v.actions.length) {
    const row = _syncEl('div', 'sync-actions');
    for (const [id, label, primary] of v.actions) {
      row.appendChild(_syncBtn(label, () => {
        if (id === 'cancel') _syncPost('/api/sync/code/cancel');
        else if (id === 'approve' || id === 'decline') _syncPost('/api/sync/code/approve', { yes: id === 'approve' }, id === 'approve' ? 'Approved' : null);
        else if (id === 'new') { _syncJoinDismissed = null; _syncPost('/api/sync/code/start'); }                 // a fresh code now; the old one stops
        else if (id === 'close') { _syncJoinDismissed = j.expiresAt; _syncPost('/api/sync/code/cancel'); }       // a finished one goes at once, on the server too
        else if (id === 'retry') { if (_syncLastJoinCode) _syncPost('/api/sync/code/join', Object.assign({ code: _syncLastJoinCode }, _syncLastJoinLink && j.role === 'join' ? { link: _syncLastJoinLink } : {})); else { const inp = document.querySelector('.sync-join-input'); if (inp) inp.focus(); } }
      }, primary));
    }
    box.appendChild(row);
  }
  card.body.appendChild(box);
}
/**
 * The join link under the code on the computer that shows it (sync through your relay):
 * Copy, "send it to yourself", and its own 2-minute countdown.
 */
function _syncLinkBox(box, j) {
  const R = _syncSt && _syncSt.relay;
  const L = R && R.link && R.link.role === 'host' ? R.link : null;
  if (!L || !j || j.role !== 'offer' || !['waiting', 'approve'].includes(j.step)) return;
  const wrap = _syncEl('div', 'sync-link');
  if (L.state === 'open' && L.link) {
    wrap.appendChild(_syncEl('div', 'sync-pair-t', 'Or send this link to the new computer'));
    const row = _syncEl('div', 'sync-other');
    const inp = _syncEl('input', 'control control-sm sync-link-input'); inp.readOnly = true; inp.value = L.link; inp.setAttribute('aria-label', 'Join link');
    inp.onfocus = () => { try { inp.select(); } catch (e) { /* fine */ } };
    const copy = _syncBtn('Copy', async () => { if (!(await copyText(L.link, 'link'))) { inp.focus(); inp.select(); } }, true);
    row.append(inp, copy);
    wrap.appendChild(row);
    const left = _syncEl('div', 'sync-join-left', syncTimeLeft(L.expiresAt, Date.now()));
    left.dataset.exp = String(L.expiresAt);
    wrap.appendChild(left);
    wrap.appendChild(_syncEl('p', 'set-h', 'Paste it there, then type the 4 letters. Works once, for 2 minutes.'));
  } else if (L.state === 'expired') {
    wrap.appendChild(_syncEl('p', 'set-h', 'The link ran out. The 4 letters still work through ' + (syncCloudName(_syncSt) || 'your cloud folder') + '.'));
  } else if (L.state === 'clash') {
    wrap.appendChild(_syncEl('p', 'sync-status sync-warn', 'Someone else used this link. Start again.'));
  }
  if (wrap.childNodes.length) box.appendChild(wrap);
}
/**
 * "Paste the join link" + the 4 letters: a new computer with no shared folder (sync through your relay),
 * or (o.member, 2.17.1) a computer that already syncs and wants your relay now: it keeps everything,
 * and gets only the key to your relay.
 */
function _syncLinkJoin(card, o) {
  const wrap = _syncEl('div', 'sync-link-join');
  const link = _syncEl('input', 'control control-sm sync-link-input'); link.placeholder = 'https://…/j#ODJ1.…'; link.maxLength = 400; link.autocomplete = 'off'; link.spellcheck = false;
  link.setAttribute('aria-label', 'The join link from your other computer');
  if (_syncLastJoinLink) link.value = _syncLastJoinLink;
  const code = _syncEl('input', 'control sync-join-input'); code.maxLength = 9; code.autocomplete = 'off'; code.spellcheck = false; code.placeholder = 'AB CD';
  code.setAttribute('aria-label', 'The 4-letter code');
  const go = () => {
    const l = link.value.trim(), c = code.value.trim();
    if (!l) { link.focus(); return; }
    if (!c) { code.focus(); return; }
    _syncLastJoinLink = l; _syncLastJoinCode = c;
    _syncPost('/api/sync/code/join', { code: c, link: l });
  };
  link.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); code.focus(); } };
  code.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  const row = _syncEl('div', 'sync-other'); row.append(code, _syncBtn('Join', go, true));
  wrap.append(link, row);
  card.body.appendChild(o && o.member
    ? _settingsRow('Get fast sync from your other computer', 'On it: Settings > Sync > Add a computer. Paste its link, then type its 4 letters.', wrap)
    : _settingsRow('Paste the link from your other computer', 'On it: Settings > Sync > Add a computer.', wrap));
}
/** "Type the 4-letter code from your other computer" (the new computer's default way in). */
function _syncJoinInput(card) {
  const wrap = _syncEl('div', 'sync-other');
  const input = _syncEl('input', 'control sync-join-input');
  input.maxLength = 9; input.autocomplete = 'off'; input.spellcheck = false; input.placeholder = 'AB CD';
  input.setAttribute('aria-label', 'The 4-letter code');
  const go = () => { const v = input.value.trim(); if (v) { _syncLastJoinCode = v; _syncPost('/api/sync/code/join', { code: v }); } else input.focus(); };
  input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  wrap.append(input, _syncBtn('Join', go, true));
  card.body.appendChild(_settingsRow('Type the 4 letters from your other computer', 'On your other computer, open Freeflo, go to Settings > Sync and press Add a computer. It shows 4 letters.', wrap));
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

/** "Lost all your computers?": the emergency backup sheet's 10 words (or an old 32-character code). */
function _syncRecoveryRow(card, title, hint) {
  const wrap = _syncEl('div', 'sync-other');
  const input = _syncEl('textarea', 'control control-sm sync-words-input');
  input.rows = 2; input.placeholder = 'the 10 words, for example: apple river candle ...'; input.maxLength = 200; input.autocomplete = 'off'; input.spellcheck = false;
  input.setAttribute('aria-label', 'The words from your backup sheet');
  const go = () => { const v = input.value.trim(); if (v) _syncPost('/api/sync/recovery', { code: v }, 'This computer now syncs'); else input.focus(); };
  input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  wrap.append(input, _syncBtn('Use my backup sheet', go, true));
  card.body.appendChild(_settingsRow(title, hint, wrap));
}
const SYNC_LOST_ALL = 'Lost all your other computers?';
const SYNC_LOST_HINT = 'Only if no other computer has Freeflo any more: type the 10 words from your emergency backup sheet.';

function _syncStart(card, st) {
  const e2e = (st && st.e2e) || {};
  if (!e2e.available) {
    // An older server: the plain switch.
    card.body.appendChild(_settingsRow('Sync across my devices', 'Off by default.', _settingsSwitch(false, 'Sync across my devices', () => _syncSave({ enabled: true }, 'Sync is on'), _syncBusy)));
    return;
  }
  const q = _syncEl('div', 'sync-actions');
  q.append(
    _syncBtn("Yes, it's my first", () => { _syncFlow = 'first'; _syncRefresh(); }, true),
    _syncBtn('No, join my other computer', () => { _syncFlow = 'join'; _syncRefresh(); }),
  );
  card.body.appendChild(_settingsRow('Is this your first computer with Freeflo?', '', q));
  card.body.appendChild(_syncEl('p', 'set-h sync-what', syncWhatSyncs()));
  // 2.20.1: no relay tip on this first screen (jargon for someone just starting); Advanced has it.
}

function _syncSetup(card, st, first) {
  const relayOk = syncRelayReady(st);
  if (!first) {
    card.body.appendChild(_syncEl('div', 'sync-step', 'Step 1 of 2'));
    card.body.appendChild(_syncEl('div', 'sync-pair-t', 'Name this computer, then join'));
  }
  // The way: through your relay (recommended when one is connected) or a folder; a new computer: a link or a folder.
  const ways = first ? (relayOk ? ['relay', 'folder'] : ['folder']) : ['link', 'folder'];
  if (!_syncVia || !ways.includes(_syncVia)) _syncVia = ways[0];
  if (ways.length > 1) {
    const seg = _syncEl('div', 'sync-actions sync-ways');
    const label = { relay: 'Fast sync (recommended)', link: 'With a link from it', folder: first ? 'A cloud folder' : 'Through a cloud folder' };
    for (const w of ways) {
      const b = _syncBtn(label[w], () => { _syncVia = w; _syncRefresh(); }, _syncVia === w);
      b.setAttribute('aria-pressed', _syncVia === w ? 'true' : 'false');
      seg.appendChild(b);
    }
    card.body.appendChild(_settingsRow(first ? 'How should your computers sync?' : 'How does your other computer sync?', first
      ? (_syncVia === 'relay' ? "Fast, works anywhere, and can't read your data." : 'OneDrive, Google Drive or Dropbox.')
      : '', seg));
  }
  if (!first && _syncVia === 'link') {
    _syncLinkJoin(card);
    card.body.appendChild(_settingsRow('Back', '', _syncBtn('Back', () => { _syncFlow = null; _syncVia = null; _syncRefresh(); })));
    return;
  }
  const viaRelay = first && _syncVia === 'relay';
  const folder = viaRelay ? null : _syncFolderControl(st);
  if (folder) card.body.appendChild(_settingsRow('Cloud folder', syncFolderHint(st, first), folder));
  const name = _syncEl('input', 'control control-sm'); name.maxLength = 60;
  name.value = (st && st.deviceName) || ''; name.placeholder = 'Home laptop';
  card.body.appendChild(_settingsRow('Name this computer', '', name));
  const row = _syncEl('div', 'sync-actions');
  row.append(
    _syncBtn('Back', () => { _syncFlow = null; _syncVia = null; _syncRefresh(); }),
    _syncBtn(first ? 'Turn on sync' : 'Next', async () => {
      const f = folder ? folder._value() : null;
      const body = Object.assign({ apply: true }, f ? { folder: f } : {}, viaRelay ? { relay: true } : {}, name.value.trim() ? { deviceName: name.value.trim() } : {});
      const j = await _syncPost(first ? '/api/sync/setup' : '/api/sync/join', body, first ? 'Sync is on' : null);
      if (j) _syncFlow = null;
      _syncRefresh();
    }, true),
  );
  card.body.appendChild(row);
}

const _SYNC_PAIR_LIVE = ['waiting', 'compare', 'confirmed'];
/**
 * The new computer, Step 2 of 2: type the 4 letters from the other computer (the one way in). Under
 * "Other ways": the emergency backup sheet (only if every other computer is lost) and, for an other
 * computer with an older OpenDash, approving with 6 numbers.
 */
function _syncJoining(card, st) {
  const e = st.e2e || {};
  const p = e.pairing && e.pairing.role === 'join' ? e.pairing : null;
  const jc = e.joinCode && e.joinCode.role === 'join' ? e.joinCode : null;
  const stop = () => { const row = _syncEl('div', 'sync-actions'); row.appendChild(uiButton({ label: 'Cancel', kind: 'ghost', size: 'sm', bubble: true, run: () => _syncSave({ enabled: false }, 'Sync is off') })); card.body.appendChild(row); };
  if (p && _SYNC_PAIR_LIVE.includes(p.step)) { _syncPairPanel(card, p); return; }
  if (jc) _syncJoinPanel(card, jc);
  if (jc && (jc.step === 'looking' || jc.step === 'sent')) { stop(); return; }
  if (p) _syncPairPanel(card, p);
  if (!jc) card.body.appendChild(_syncEl('div', 'sync-step', 'Step 2 of 2'));
  if (st.relay && st.relay.on && !st.folder) _syncLinkJoin(card); else _syncJoinInput(card);
  _syncOtherWays(card, (box) => {
    _syncRecoveryRow(box, SYNC_LOST_ALL, SYNC_LOST_HINT);
    box.body.appendChild(_settingsRow('Your other computer has an older Freeflo?', 'It can approve this one with 6 numbers instead.', _syncBtn('Ask it to approve', () => _syncPost('/api/sync/pair/start'))));
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
      _syncBtn("Check it's mine", () => _syncPost('/api/sync/pair/respond', { sid: r.sid }), true),
      _syncBtn('Not mine', () => { _syncIgnored.add(r.sid); _syncRefresh(); }),
    );
    // A computer that was removed and asks again is shown too (it comes back as a new device).
    if (r.removed) card.body.appendChild(_settingsRow(`${r.oldName || r.name} wants to join again`, 'It comes back as a new computer.', row));
    else card.body.appendChild(_settingsRow(`${r.name} wants to join`, 'Only if you\'re setting it up now.', row));
  }
}

/** The presence rows the top bar keeps (56-presence.js: asleep, off, online), or null. */
function _syncPres() { try { return typeof _pr !== 'undefined' && _pr.view && Array.isArray(_pr.view.devices) ? _pr.view.devices : null; } catch (e) { return null; } }
/** The main computer as Settings > Sync > More shows it ({name, me}), or null (58-settings-main.js loads it). */
function _syncMain() { try { return typeof _mcSt !== 'undefined' && _mcSt && _mcSt.main ? { name: _mcSt.main.name, me: !!_mcSt.isMain } : null; } catch (e) { return null; } }
/** Open a fold on purpose (Check-up's fix for Advanced, a computer row): the next paint opens it; the kit remembers the rest. */
const _syncFolds = { more: false, advanced: false };
/** More / Advanced: the kit's folds (setFold), keyed sync-sync-more / sync-sync-adv; rows are built at once, so Settings search finds and opens them. */
function _syncFold(parent, key, label, fill) {
  const adv = key === 'advanced';
  const det = setFold(parent, 'sync-sync-' + (adv ? 'adv' : 'more'), label, fill, { advanced: adv });
  if (_syncFolds[key]) { det.open = true; _syncFolds[key] = false; }
  return det;
}
/** A sub-heading inside a fold. */
function _syncSub(box, text) { box.body.appendChild(_syncEl('div', 'sync-sub', text)); }
/** Check now: a sync pass (the status it answers with). */
async function _syncCheckNow() { try { _syncSt = await _syncJson('/api/sync/now', {}); _syncErr = ''; } catch (e) { _syncErr = netErrorMessage(e); } _syncRefresh(); }
/** Run a status-line fix (syncNeedsYou / syncRelayState fix.run). */
function _syncRunFix(fix) {
  if (!fix) return;
  if (fix.run === 'now') _syncCheckNow();
  else if (fix.run === 'check') _syncPost('/api/sync/relay/check');
  else if (fix.run === 'compact') { if (typeof syncRunFix === 'function') syncRunFix({ action: 'compact', label: fix.label }); }
  else if (fix.run === 'apply-health') {
    const c = _shHealth && (_shHealth.checks || []).find(x => x.id === fix.check);
    if (c && c.fix && typeof syncRunFix === 'function') syncRunFix(c.fix); else syncOpenHealth();
  } else syncOpenHealth();
}

/** Paint the face: the status line, the path line and the computer rows (text only: the 3-second ticker calls it too). */
function _syncFacePaint(face, st) {
  const now = Date.now(), pres = _syncPres(), main = _syncMain();
  const s = syncSummary(st, pres, _shHealth, now, main);
  setStatusPaint(face.querySelector('.set-status'), s.tone, s.word, s.detail);
  const path = face.querySelector('.sync-path');
  path.textContent = syncPathLine(st);
  path.hidden = !path.textContent;
  const list = face.querySelector('.sync-peers');
  list.replaceChildren();
  const rows = syncComputerRows(st, pres, now, main);
  if (rows.length === 1) { list.appendChild(_syncEl('div', 'set-h', 'No other computer yet.')); return; }
  for (const r of rows) {
    const row = _syncEl('button', 'sync-peer sync-peer-' + r.tone + (r.me ? ' sync-peer-me' : '')); row.type = 'button';
    row.setAttribute('role', 'listitem');
    const ic = _syncEl('span', 'sync-peer-ic'); ic.setAttribute('aria-hidden', 'true');
    ic.innerHTML = icon(r.away ? 'moon' : r.tone === 'warn' ? 'circle-alert' : r.kind === 'phone' ? 'phone' : 'laptop');
    const chip = _syncEl('span', 'sync-peer-chip');
    if (r.chip) chip.textContent = r.chip;
    if (r.main && !r.me) chip.textContent = (r.chip ? r.chip + ' · ' : '') + 'Main computer';
    row.append(ic, _syncEl('span', 'sync-peer-n', r.name), chip, _syncEl('span', 'sync-peer-d', r.detail || ''));
    row.setAttribute('aria-label', [r.name, chip.textContent, r.detail].filter(Boolean).join(', '));
    // The row opens More > Computers and phones at that computer (rename, remove).
    row.onclick = () => {
      const det = document.querySelector('[data-fold="sync-sync-more"]'); if (det) det.open = true;
      const t = document.querySelector('.sync-dev[data-dev="' + (r.me ? 'me' : r.id) + '"]');
      if (t) { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.classList.add('set-search-hit'); setTimeout(() => t.classList.remove('set-search-hit'), 2400); }
    };
    list.appendChild(row);
  }
}
/** The face of the card for a computer that syncs: status, path, computers, what needs you, one main action. */
function _syncFace(card, st, showAdd) {
  const face = _syncEl('div', 'sync-face');
  face.append(setStatusLine('idle', '', ''), _syncEl('div', 'sync-path'));
  const list = _syncEl('div', 'sync-peers'); list.setAttribute('role', 'list'); list.setAttribute('aria-label', 'Your computers');
  face.appendChild(list);
  card.body.appendChild(face);
  _syncFacePaint(face, st);
  const R = st.relay || {};
  // Your relay is waiting for its key here: the 4-letter code box, on the face.
  if (R.on && R.state === 'denied' && !R.hasKey) _syncJoinInput(card);
  // "This computer now syncs through your relay too" (it switched by itself, 2.17.1): Undo and OK.
  const auto = syncRelayAutoLine(st);
  if (auto) {
    const cloud = syncCloudName(st);
    const undo = uiButton({ label: 'Undo', kind: 'ghost', size: 'sm', bubble: true, run: () => _syncSave({ relay: false }, 'This computer syncs through ' + (cloud || 'the folder') + ' again') });
    const okb = uiButton({ label: 'OK', kind: 'ghost', size: 'sm', bubble: true, run: () => _syncSave({ relayNotice: false }) });
    _syncNote(card, auto, 'ok', [undo, okb]);
  }
  // A grey tip: your relay could carry this computer's changes too (or a friend's relay waits to be chosen).
  const tip = _syncRelayTip(st);
  if (tip) _syncNote(card, tip.text, 'idle', [tip.btn]);
  // A calm reminder, only for someone who had made a backup sheet and then removed a computer.
  if (st.e2e && st.e2e.sheet === 'old' && !_syncCode) _syncNote(card, 'Your backup sheet is out of date: print a new one.', 'idle', [_syncBtn('Make a new sheet', syncMakeSheet)]);
  const open = st.health && st.health.conflictsOpen;
  if (open) _syncNote(card, open + ' edit' + (open === 1 ? '' : 's') + ' to review: changed on two computers at once; the later one was kept.', 'idle', [_syncBtn('Review', () => { _syncTab = 'review'; syncReviewLoad(); _syncRefresh(); })]);
  // One main action: the fix when something needs you, Use them now while previewing, else Add a computer.
  const s = syncSummary(st, _syncPres(), _shHealth, Date.now(), _syncMain());
  const addComputer = () => { _syncJoinDismissed = null; _syncPost('/api/sync/code/start'); };
  let main = null;
  if (s.fix) main = { label: s.fix.label, run: () => _syncRunFix(s.fix) };
  else if (s.word === 'Previewing') main = { label: 'Use them now', run: () => _syncSave({ apply: true }, 'Changes from your other computers are used now') };
  else if (showAdd) main = { label: 'Add a computer', run: addComputer };
  if (main) setAction(card, main.label, main.run, { disabled: _syncBusy });
  // When the fix is the one main button, Add a computer waits at the top of More.
  _syncAddInMore = !!(showAdd && main && main.label !== 'Add a computer');
  return face;
}
/** A short line on the face with its buttons. */
function _syncNote(card, text, tone, btns) {
  const row = _syncEl('div', 'sync-note sync-note-' + (tone || 'idle')); row.setAttribute('role', 'status');
  row.appendChild(_syncEl('span', 'sync-note-t', text));
  for (const b of btns || []) if (b) row.appendChild(b);
  card.body.appendChild(row);
}
/** "This computer now syncs through your relay too" (it switched by itself, 2.17.1). */
function syncRelayAutoLine(st) {
  const R = (st && st.relay) || {};
  if (!R.on || !R.autoAt) return null;
  const cloud = syncCloudName(st);
  return 'This computer now syncs through your relay too, like your other computers' + (cloud ? '; ' + cloud + ' keeps a backup.' : '.');
}
/** The grey tip for a computer that syncs through a folder while a relay is there: {text, btn} or null. */
function _syncRelayTip(st) {
  const R = st.relay || {};
  if (!(R.transport === 'folder' || (!R.on && st.folder))) return null;
  if (['key', 'record', 'private'].includes(R.missing)) return null;          // the status line says it, with Try again
  const v = syncRelayView(st);
  const cloud = syncCloudName(st) || 'your cloud folder';
  if (v.act === 'use' && syncRelayReady(st)) return { text: 'Use your relay too: faster, and ' + cloud + ' keeps working alongside.', btn: _syncBtn('Use my relay too', () => _syncSave({ relay: true }, 'This computer syncs through your relay now (' + cloud + ' keeps a backup)'), true) };
  if (v.act === 'relay') return { text: v.text, btn: _syncBtn('Open Your relay', () => setView('settings:relay')) };
  return null;
}

/** More > Computers and phones: rename, remove. */
function _syncDevices(box, st) {
  const list = _syncEl('div', 'sync-dev-list');
  const devs = [...(st.devices || [])].sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0));
  for (const d of devs) {
    const name = d.name || 'A computer';
    const row = _syncEl('div', 'sync-dev'); row.dataset.dev = d.me ? 'me' : d.id; row.tabIndex = -1;
    const info = _syncEl('div', 'sync-dev-info');
    info.append(_syncEl('div', 'sync-dev-name', name), _syncEl('div', 'set-h', d.me ? 'This computer' : (d.kind === 'phone' ? 'Phone · ' : '') + 'seen ' + (syncAgo(d.lastSeen, Date.now()) || 'a while ago')));
    const acts = _syncEl('div', 'sync-actions');
    acts.appendChild(_syncBtn('Rename', async () => {
      const n = await promptDialog({ title: 'Rename ' + name, label: 'Name', value: d.name || '', confirmLabel: 'Save' });
      if (n) _syncPost('/api/sync/devices/rename', { id: d.id, name: n }, 'Name saved');
    }));
    if (!d.me && st.e2e && st.e2e.on) {
      acts.appendChild(_syncBtn('Remove…', () => _syncRemoveDialog(d.id, name)));
    }
    row.append(info, acts);
    list.appendChild(row);
  }
  box.body.appendChild(_settingsRow('Computers and phones', '', list));
}
/** More > Main computer (L6): one choice sets the automatic jobs, who answers first, and where Claude runs. */
function _syncMainRow(box, st) {
  if (typeof _mcLoad === 'function') _mcLoad(false);
  const m = typeof _mcSt !== 'undefined' ? _mcSt : null;
  const sel = document.createElement('select'); sel.className = 'control control-sm'; sel.setAttribute('aria-label', 'Main computer');
  const auto = document.createElement('option'); auto.value = ''; auto.textContent = 'Whichever is on'; sel.appendChild(auto);
  const comps = m && Array.isArray(m.computers) ? m.computers : (st.devices || []).filter(d => d.kind !== 'phone').map(d => ({ id: d.id, name: d.name, me: d.me }));
  for (const c of comps) { if (!c || !c.id) continue; const o = document.createElement('option'); o.value = c.id; o.textContent = c.me ? 'This computer' : c.name || 'A computer'; sel.appendChild(o); }
  sel.value = m && m.main ? m.main.id : '';
  sel.disabled = _syncBusy || !m || !!m.error;
  sel.onchange = async () => {
    const id = sel.value || null, pick = comps.find(c => c.id === id);
    const others = comps.filter(c => c.id !== id && !(st.devices || []).some(d => d.id === c.id && d.kind === 'phone')).map(c => c.id);
    const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => (r.ok ? r.json() : null)).catch(() => null);
    const [mc] = await Promise.all([
      post('/api/main-computer', { id: id ? (pick && pick.me ? 'this' : id) : null }),
      st.live && st.live.on ? post('/api/sync/live', { prefer: id ? [id, ...others] : [] }) : null,
      post('/api/claude-host', { host: 'main' }),
    ]);
    if (mc && typeof _mcSt !== 'undefined') _mcSt = mc;
    if (mc) toast(id ? (pick && pick.me ? 'This computer' : (pick && pick.name) || 'That computer') + ' is the main computer' : 'Whichever computer is on does the jobs', { kind: 'ok' });
    else toastError('change the main computer', new Error(NET_DOWN_REASON), () => sel.onchange());
    syncLoad();
  };
  box.body.appendChild(_settingsRow('Main computer', 'Checks mail, calendar and bank, and runs Claude jobs. Another takes over when it sleeps.', sel));
}
/** More: the occasional things. */
function _syncMore(box, st) {
  if (_syncAddInMore) box.body.appendChild(_settingsRow('Add a computer', '', _syncBtn('Add a computer', () => { _syncJoinDismissed = null; _syncPost('/api/sync/code/start'); })));
  _syncDevices(box, st);
  _syncMainRow(box, st);
  if (_syncAdd) _syncAddPanel(box);
  else box.body.appendChild(_settingsRow('Add a phone', '', _syncBtn('Show a QR code', () => { _syncAdd = true; _syncPost('/api/sync/offer'); })));
  // The emergency backup sheet (2.20.1): optional; only needed if every computer is lost.
  const sheet = (st.e2e && st.e2e.sheet) || 'none';
  box.body.appendChild(_settingsRow('Emergency backup sheet', sheet === 'old' ? 'Out of date: a computer was removed since you made it. Print a new one.' : sheet === 'made' ? 'You have one. Only needed if you lose every computer.' : 'Only needed if you lose every computer. Print it and keep it at home.', _syncBtn(sheet === 'none' ? 'Make a backup sheet' : 'Make a new one…', async () => {
    if (sheet === 'made') {
      const ok = await confirmDialog({ title: 'Make a new backup sheet?', text: 'The sheet you have now stops working.', confirmLabel: 'Make a new one' });
      if (!ok) return;
    }
    syncMakeSheet();
  }, sheet === 'old')));
  box.body.appendChild(_settingsRow('Sync now', '', _syncBtn('Sync now', _syncCheckNow)));
  // People's pictures and story audio (lib/sync/blobs.mjs), one line: 'Pictures and audio: 34 MB of 200 MB'.
  if (st.blobs && st.blobs.text) box.body.appendChild(_settingsRow(st.blobs.text, '', null));
  box.body.appendChild(_settingsRow('Turn off sync on this computer', 'Nothing is deleted.', _syncBtn('Turn off', async () => {
    const j = await _syncSave({ enabled: false });
    if (j) toast('Sync is off on this computer. Nothing was deleted.', { kind: 'ok', timeout: 15000, action: { label: 'Undo', run: () => _syncSave({ enabled: true }, 'Sync is on again') } });
  })));
}
function _syncAddPanel(box) {
  const p = _syncEl('div', 'sync-add');
  if (_syncOffer && _syncOffer.expiresAt > Date.now()) {
    p.appendChild(_syncEl('p', 'set-h', 'Scan it in Freeflo on the phone. Works once, for 10 minutes.'));
    try { const q = _syncEl('div', 'sync-qr'); q.appendChild(syncQrSvg(_syncOffer.text, 220)); p.appendChild(q); }
    catch (e) { p.appendChild(_syncEl('p', 'sync-status sync-err', 'The code could not be drawn.')); }
  } else p.appendChild(_syncBtn('Show a QR code', () => _syncPost('/api/sync/offer')));
  p.appendChild(_syncBtn('Close', () => { _syncAdd = false; _syncOffer = null; _syncRefresh(); }));
  box.body.appendChild(_settingsRow('Add a phone', '', p));
}
/** Advanced > Ways to sync: your relay, the cloud folder, direct on the same Wi-Fi, outside home. */
function _syncWays(box, st) {
  const R = st.relay || {}, L = st.live;
  const cloud = syncCloudName(st) || 'your cloud folder';
  _syncSub(box, 'Ways to sync');
  const rs = syncRelayState(st);
  if (rs) {
    const wrap = _syncEl('div', 'sync-relay'); wrap.appendChild(setStatusLine(rs.tone, rs.word, rs.detail));
    if (rs.fix) wrap.appendChild(_syncBtn(rs.fix.label, () => _syncRunFix(rs.fix)));
    if (R.transport === 'both') wrap.appendChild(_syncBtn('Stop using ' + cloud + '…', async () => {
      const ok = await confirmDialog({ title: 'Stop using ' + cloud + '?', text: 'Nothing is deleted. Computers that only use ' + cloud + ' stop getting this one\'s changes.', confirmLabel: 'Stop using ' + cloud });
      if (ok) _syncSave({ folder: false }, 'This computer syncs through your relay only');
    }));
    box.body.appendChild(_settingsRow('Your relay', R.transport === 'both' ? 'Your other computers should use the relay before you stop using ' + cloud + '.' : '', wrap));
  } else {
    const v = syncRelayView(st);
    const btn = v.act === 'use' && syncRelayReady(st) ? _syncBtn('Use my relay too', () => _syncSave({ relay: true }, 'This computer syncs through your relay now'), true)
      : v.act === 'check' ? _syncBtn('Try again', () => _syncPost('/api/sync/relay/check'))
        : v.act === 'relay' ? _syncBtn('Open Your relay', () => setView('settings:relay')) : _syncBtn('Your relay', () => setView('settings:relay'));
    box.body.appendChild(_settingsRow('Your relay', v.act === 'use' ? 'Faster, and ' + cloud + ' keeps working alongside.' : v.text, btn));
  }
  box.body.appendChild(_settingsRow(st.folder ? _syncCap(cloud) + ' folder' : 'Cloud folder (optional)', 'Freeflo keeps an "OpenDash Sync" folder in it.', _syncFolderControl(st)));
  if (L) {
    box.body.appendChild(_settingsRow('Direct on the same Wi-Fi', 'Changes show within a second when both computers are on the same Wi-Fi.', _settingsSwitch(!!L.on, 'Direct on the same Wi-Fi', (v) => _syncPost('/api/sync/live', { enabled: v }, v ? 'Direct on the same Wi-Fi is on' : 'Direct on the same Wi-Fi is off'), _syncBusy)));
    // L4: on 'auto' (off and hidden while your relay is in use); shown again if you turned it on yourself.
    const relay = syncViaRelay(st);
    if (L.on && (!relay || (L.internetSet && L.internet))) box.body.appendChild(_settingsRow('Let my computers reach this one from outside home', 'Asks your router to let them in. Not needed with your relay.', _settingsSwitch(L.internet !== false, 'Let my computers reach this one from outside home', (v) => _syncPost('/api/sync/live', { internet: v }, v ? 'Asking your router' : 'Your router is left alone'), _syncBusy)));
  }
}
/** Advanced: ways to sync, preview, which computer does what, details for support. */
function _syncAdvanced(box, st) {
  _syncWays(box, st);
  _syncSub(box, 'Preview changes first');
  box.body.appendChild(_settingsRow('Preview changes first', 'Lists what your other computers changed, without using it.', _settingsSwitch(!st.apply, 'Preview changes first', (v) => _syncSave({ apply: !v }, v ? 'Changes from your other computers wait for you now' : 'Changes from your other computers are used now'), _syncBusy)));
  _syncPreview(box, st);
  _syncSub(box, 'Which computer does what');
  for (const l of syncMainLines(st)) box.body.appendChild(_syncEl('div', 'set-h sync-job', l));
  const accounts = st.accounts || [];
  for (const a of accounts) {
    const f = a.fetcher || {};
    box.body.appendChild(_settingsRow('Checks ' + a.label + ': ' + (f.me ? 'this computer' : f.name || 'no computer yet'), f.note || '', f.me ? null : _syncBtn('Use this computer', () => _syncPost('/api/sync/fetcher', { account: a.id }, 'This computer checks it now'))));
  }
  const jobs = _syncEl('div');
  if (typeof settingsMainComputerJobs === 'function') settingsMainComputerJobs(jobs);
  if (jobs.childNodes.length) box.body.appendChild(jobs);
  if (typeof settingsClaudeHostCard === 'function') settingsClaudeHostCard(box.body);   // 58-settings-claude-host.js: Runs Claude jobs
  _syncSub(box, 'Details for support');
  const live = _syncEl('div', 'sync-live');
  _syncLivePaint(live, st);
  box.body.appendChild(live);
  const R = st.relay || {};
  const facts = [];
  if (R.host) facts.push('Relay: ' + R.host + (R.state ? ' (' + R.state + ')' : ''));
  if (R.outbox && R.outbox.bytes > 0) facts.push(_syncSize(R.outbox.bytes) + ' waiting to send');
  if (st.live && st.live.port) facts.push('Direct link port: ' + st.live.port);
  if (st.live && st.live.listenError) facts.push('Direct links could not start: ' + st.live.listenError);
  if (Array.isArray(st.notSynced) && st.notSynced.length) facts.push(st.notSynced.length + ' file' + (st.notSynced.length === 1 ? ' is' : 's are') + ' too big to sync from here: ' + st.notSynced[0].file + (st.notSynced.length > 1 ? '…' : ''));
  if (st.skew) facts.push(st.skew.text || `${st.skew.device}'s clock is about ${st.skew.aheadMin} min ahead of this one.`);
  for (const f of facts) box.body.appendChild(_syncEl('div', 'set-h sync-fact', f));
}
function _syncSize(n) { return n >= 1e6 ? (Math.round(n / 1e5) / 10) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB'; }
function _syncLivePaint(box, st) {
  box.textContent = '';
  for (const l of syncLiveLines(st, _syncPres())) {
    const line = _syncEl('div', 'sync-status sync-' + l.tone + (l.act ? ' sync-live-line' : ''));
    line.appendChild(_syncEl('span', null, l.text));
    if (l.act && l.peer) {
      line.appendChild(uiButton({ label: l.act === 'hold' ? 'Stop trying' : l.act === 'firewall' ? 'Show me how' : 'Try again', kind: 'ghost', size: 'sm', bubble: true,
        run: () => (l.act === 'firewall' ? syncOpenHealth() : _syncPost('/api/sync/live', l.act === 'hold' ? { hold: l.peer } : { retry: l.peer }, l.act === 'hold' ? 'Stopped trying' : 'Trying again now')) }));
    }
    box.appendChild(line);
  }
}
/** What preview would change (apply off): "Waiting for you". */
function _syncPreview(box, st) {
  if (st.apply || !st.preview || !st.preview.changes) return;
  const p = st.preview, list = document.createElement('div'); list.className = 'set-h sync-preview';
  const lines = [];
  for (const t of p.sample.added) lines.push('New: ' + (t.title || 'a task'));
  for (const t of p.sample.changed) lines.push('Changed: ' + (t.title || 'a task') + (t.fields.length ? ' (' + t.fields.join(', ') + ')' : ''));
  for (const t of p.sample.removed) lines.push('Removed: ' + (t.title || 'a task'));
  if (p.keys.length) lines.push('Also: ' + p.keys.map(k => String(k).replace(/^file:/, '')).join(', '));
  list.textContent = lines.join('\n');
  box.body.appendChild(_settingsRow('Waiting for you', `${p.tasks.added} new, ${p.tasks.changed} changed and ${p.tasks.removed} removed task${p.tasks.removed === 1 ? '' : 's'} from ${p.from.join(', ') || 'another computer'}${p.conflicts ? `; ${p.conflicts} edit${p.conflicts === 1 ? '' : 's'} clash with yours (the later one would be kept)` : ''}.`, list));
}

function _syncCard(el) {
  const st = _syncSt;
  const screen = syncScreen(st, _syncFlow);
  const ready = screen === 'ready';
  const card = _settingsCard('Sync', '');
  const line = setStatusLine('idle', '', '');
  let face = null;
  const paint = () => {
    if (face && _syncSt) { _syncFacePaint(face, _syncSt); const live = card.card.querySelector('.sync-live'); if (live) _syncLivePaint(live, _syncSt); return; }
    const s = syncStatusLine(_syncSt, Date.now());
    setStatusPaint(line, s.tone, s.word, s.detail);
    const devs = card.body.querySelector('.sync-devices');
    if (devs) devs.textContent = syncDeviceLines(_syncSt, Date.now()).join('\n');
  };
  if (_syncCode) _syncCodePanel(card);
  else if (_syncSheetOffer && ready) _syncSheetOfferPanel(card);
  if (screen === 'loading') card.body.appendChild(line);
  else if (screen === 'start') { card.body.appendChild(line); _syncStart(card, st); }
  else if (screen === 'first' || screen === 'join') _syncSetup(card, st, screen === 'first');
  else if (ready) {
    _syncRequests(card, st);
    // "Add a computer": a 4-letter code to type on the new one (the usual way).
    const jc = st.e2e && st.e2e.joinCode && st.e2e.joinCode.role === 'offer' ? st.e2e.joinCode : null;
    // A pasted join link on a computer that already syncs (Advanced): its progress, here.
    const jj = st.e2e && st.e2e.joinCode && st.e2e.joinCode.role === 'join' ? Object.assign({}, st.e2e.joinCode, { member: !!(st.relay && st.relay.on) }) : null;
    if (jj && _syncJoinDismissed !== jj.expiresAt) _syncJoinPanel(card, jj);
    const codeOpen = !!(jc && _syncJoinDismissed !== jc.expiresAt);
    if (codeOpen) _syncJoinPanel(card, jc);
    face = _syncFace(card, st, !codeOpen);
    _syncFold(card.body, 'more', 'More', (box) => _syncMore(box, st));
    _syncFold(card.body, 'advanced', 'Advanced', (box) => {
      _syncAdvanced(box, st);
      // 2.17.1: the manual way to the relay (and its key) at once, when it has not come over by itself yet
      const R = st.relay || {};
      if (!(R.on && R.state && R.state !== 'denied' && R.hasKey)) _syncLinkJoin(box, { member: true });
    });
  } else {
    const status = document.createElement('div');
    status.appendChild(line);
    if (screen === 'plain') { const devs = document.createElement('div'); devs.className = 'set-h sync-devices'; status.appendChild(devs); }
    // Catching up with another computer (its changes are still being read here): n%, and Check again.
    const catching = syncCatchUpLines(st);
    if (catching.length) {
      const cu = _syncEl('div', 'sync-catchup');
      for (const c of catching.slice(0, 3)) cu.appendChild(_syncEl('div', 'sync-status sync-idle', syncCatchUpText(c)));
      cu.appendChild(_syncBtn('Check again', _syncCheckNow));
      status.appendChild(cu);
    }
    // Waiting for the cloud folder, or paused by an error: Try again now (no waiting for the next check), or see Check-up.
    if (st && st.enabled && ['waiting', 'error', 'locked'].includes(st.state)) {
      const acts = _syncEl('div', 'sync-actions');
      acts.append(_syncBtn('Try again', _syncCheckNow), _syncBtn('Open Check-up', () => syncOpenHealth()));
      status.appendChild(acts);
    }
    card.body.appendChild(_settingsRow('Status', '', status));
  }
  if (screen === 'joining') _syncJoining(card, st);
  if (screen === 'removed' || screen === 'locked') {
    const jc = st.e2e && st.e2e.joinCode && st.e2e.joinCode.role === 'join' ? st.e2e.joinCode : null;
    if (jc) _syncJoinPanel(card, jc);
    if (st.e2e && st.e2e.pairing && st.e2e.pairing.role === 'join') _syncPairPanel(card, st.e2e.pairing);
    // Removed, or set up again: join it to the other computer with a code, like a new one.
    if (!(jc && (jc.step === 'looking' || jc.step === 'sent'))) _syncJoinInput(card);
    // A computer that already syncs takes keys only from your other computers (the code above).
    if (!(st.e2e && st.e2e.ready)) _syncOtherWays(card, (box) => {
      _syncRecoveryRow(box, SYNC_LOST_ALL, SYNC_LOST_HINT);
      if (st.e2e && st.e2e.found && st.e2e.found.groups) box.body.appendChild(_settingsRow('Your other computer has an older Freeflo?', 'It can approve this one with 6 numbers instead.', _syncBtn('Ask it to approve', () => _syncPost('/api/sync/pair/start'))));
    });
  }
  if (screen === 'plain') {
    setAction(card, 'Encrypt it', () => _syncPost('/api/sync/encrypt', {}, 'Your synced data is now encrypted'), { disabled: _syncBusy });
    // Trial mode first: changes from the other computers are listed, not applied.
    card.body.appendChild(_settingsRow('Preview changes first', 'Lists what your other computers changed, without using it.', _settingsSwitch(!st.apply, 'Preview changes first', (v) => _syncSave({ apply: !v }, v ? 'Changes from your other computers wait for you now' : 'Changes from your other computers are used now'), _syncBusy)));
    _syncPreview(card, st);
    const name = document.createElement('input'); name.className = 'control control-sm'; name.maxLength = 60;
    name.value = st.deviceName || ''; name.placeholder = 'Home laptop';
    name.onchange = () => _syncSave({ deviceName: name.value.trim() }, 'Name saved');
    card.body.appendChild(_settingsRow('Name this computer', '', name));
    card.body.appendChild(_settingsRow('Cloud folder', 'Freeflo keeps an "OpenDash Sync" folder in it.', _syncFolderControl(st)));
    card.body.appendChild(_settingsRow('Sync now', '', _syncBtn('Sync now', _syncCheckNow)));
    if (st.blobs && st.blobs.text) card.body.appendChild(_settingsRow(st.blobs.text, '', null));
  }
  if (!ready && st && st.enabled && st.skew) card.body.appendChild(_settingsRow('Clock', st.skew.text || `${st.skew.device}'s clock is about ${st.skew.aheadMin} min ahead of this one. Set both to the right time so the newest change wins.`, null));
  if (!ready && st && st.enabled && screen !== 'joining') card.body.appendChild(_settingsRow('Turn off sync on this computer', 'Nothing is deleted.', _syncBtn('Turn off', () => _syncSave({ enabled: false }, 'Sync is off on this computer. Nothing was deleted.'))));
  _syncFailRow(card);
  _syncWaitRow(card);
  el.appendChild(card.card);
  // Check-up's "Type the 4-letter code": straight to the box.
  if (_syncFocusJoin) { _syncFocusJoin = false; const inp = card.card.querySelector('.sync-join-input'); if (inp) setTimeout(() => { try { const d = inp.closest('details'); if (d) d.open = true; inp.focus(); inp.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* fine */ } }, 0); }
  paint();
  // Keep the status and each computer's line current while this page is open (text only); re-render when the screen changes.
  clearInterval(_syncTicker);
  const watch = card.card;
  _syncTicker = setInterval(() => {
    if (!document.body.contains(watch)) { clearInterval(_syncTicker); _syncTicker = null; return; }
    if (typeof presenceLoad === 'function') presenceLoad(false);     // asleep or awake: the top bar's presence, kept fresh here
    _syncJson('/api/sync/status').then((s) => {
      const key = (x) => JSON.stringify([syncScreen(x, _syncFlow), x && x.state, x && x.apply, _syncFeedKey(x), x && x.e2e && x.e2e.pairing, x && x.e2e && x.e2e.joinCode, x && x.e2e && x.e2e.requests, x && x.devices && x.devices.map(d => d.name), x && x.relay && [x.relay.state, x.relay.transport, x.relay.available, x.relay.link && x.relay.link.state, x.relay.autoAt, x.relay.missing, x.relay.person && x.relay.person.host], x && x.live && [x.live.on, x.live.internet]]);
      const before = key(_syncSt);
      _syncSt = s;
      if (before !== key(s) && !_syncBusy) _syncRefresh(); else paint();
    }).catch(() => paint());
  }, 3000);
}

registerSettingsGroup({
  id: 'sync', title: 'Sync', icon: 'refresh-cw', order: 91,
  description: 'Keep your computers the same, encrypted.',
  // Rows that moved into More and Advanced (2.17.1): Settings search finds them and opens their fold.
  search: [
    { label: 'Add a computer', target: 'Sync', description: 'Shows 4 letters to type on the new computer.', keywords: 'join pair new computer laptop lost reinstall set up again' },
    { label: 'Computers and phones', target: 'Computers and phones', description: 'Rename one, or remove one you no longer have.', keywords: 'devices remove rename lost stolen phone' },
    { label: 'Main computer', target: 'Main computer', description: 'Checks mail, calendar and bank, and runs Claude jobs.', keywords: 'main primary fetch fetcher claude host jobs' },
    { label: 'Add a phone', target: 'Add a phone', description: 'A QR code to scan in Freeflo on the phone.', keywords: 'qr scan mobile' },
    { label: 'Emergency backup sheet', target: 'Emergency backup sheet', description: 'Print one in case you lose every computer.', keywords: 'recovery code backup words lost all computers print sheet' },
    { label: 'Sync now', target: 'Sync now', description: 'Look for changes now.', keywords: 'check now refresh folder' },
    { label: 'Turn off sync on this computer', target: 'Turn off sync on this computer', description: 'Nothing is deleted.', keywords: 'disable stop sync across my devices' },
    { label: 'Ways to sync', target: 'Your relay', description: 'Your relay, your cloud folder and direct on the same Wi-Fi.', keywords: 'relay folder onedrive google drive dropbox transport' },
    { label: 'Direct on the same Wi-Fi', target: 'Direct on the same Wi-Fi', description: 'Changes show within a second on the same Wi-Fi.', keywords: 'live sync connection lan instant realtime peer' },
    { label: 'Let my computers reach this one from outside home', target: 'Ways to sync', description: 'Only shown when your relay isn\'t in use.', keywords: 'router upnp nat port internet reach' },
    { label: 'Preview changes first', target: 'Preview changes first', description: 'List what your other computers changed, without using it.', keywords: 'trial shadow apply use changes from my other computers' },
    { label: 'Which computer does what', target: 'Runs Claude jobs', description: 'Who checks each account, answers your phone and runs Claude jobs.', keywords: 'claude host fetcher accounts phone main computer for each account' },
    { label: 'Details for support', target: 'Details for support', description: 'Each computer\'s direct link, in plain words.', keywords: 'connection reasons firewall router live connection' },
    { label: 'Is this your first computer with Freeflo?', target: 'Sync', description: 'Set up sync on this computer, or join the one you already have.', keywords: 'join setup start first computer new computer' },
    { label: 'Check-up', target: 'Check-up', description: 'Problems that need you, each with one fix.', keywords: 'health problems fix' },
  ],
  render(el) {
    if (!_syncSt && !_syncErr) syncLoad();
    // Sync | What changed | Check-up | Review (58-settings-sync-health.js), once sync is on.
    syncTabsBar(el, _syncSt);
    if (_syncSt && _syncSt.enabled && _syncTab !== 'setup') {
      if (_syncTab === 'health') syncHealthPage(el);
      else if (_syncTab === 'changes') syncChangesPage(el);
      else syncReviewPage(el);
      return;
    }
    // Check-up's answer feeds the status line ("Needs you") and the tab's count: read now and then.
    if (_syncSt && _syncSt.enabled && !_shBusy && Date.now() - _shHealthTried > 60000) syncHealthLoad(false);
    _syncCard(el);
    // While sync is on, the main computer and Claude live in More and Advanced; off, their own cards.
    if (!(_syncSt && _syncSt.enabled)) {
      if (typeof settingsMainComputerCard === 'function') settingsMainComputerCard(el);   // 58-settings-main.js
      if (typeof settingsClaudeHostCard === 'function') settingsClaudeHostCard(el);       // 58-settings-claude-host.js
    }
  },
});
