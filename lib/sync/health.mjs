// lib/sync/health.mjs - Settings > Sync > Health: every way syncing can go
// wrong, as a checklist in plain words, each problem with ONE clear fix (a
// button, or steps to follow). docs/dev/MULTI_DEVICE.md "When something goes
// wrong" lists the same checks for people.
//
// PLATFORM-AGNOSTIC: no node: imports, no I/O. It reads what the sync engine
// already knows (lib/sync/engine.mjs status(), with live sync's status in
// `live` and the engine's `health` block) and the cheap checks of this
// computer that lib/sync/node-health.mjs makes (`os`), and decides.
//
//   syncHealth({status, os, now, platform}) -> {overall, title, attention, checks}
//   check = {id, tone: 'err'|'warn'|'info'|'ok', title, text,
//            fix?: {label, action?, view?, steps?, id?, folder?, confirm?},
//            alt?: (a second way out: the same shape), progress?: {done, total, unit}}
//   fix.action: a POST /api/sync/fix name (lib/sync/node-health.mjs FIXES), or one the
//               page runs itself: 'live-retry' / 'live-hold' (POST /api/sync/live),
//               'remove-device', 'apply-on', 'sync-off'
//   fix.view:   a place in Settings > Sync: 'join' (type the code), 'review', 'updates', 'sync'
//
// Every wait has a way out (the user's rule, 23 Oct 2026): a check that is
// waiting for something carries "Try again" / "Check again" (immediate) and,
// where stopping makes sense, "Stop trying"; timeouts are only the fallback.

const DAY = 86400000;
const OLD_DEVICE_MS = 30 * DAY;
const MB = 1024 * 1024;

export function mb(bytes) {
  const b = Number(bytes) || 0;
  if (b >= 1024 * MB) return (b / (1024 * MB)).toFixed(1) + ' GB';
  if (b >= 10 * MB) return Math.round(b / MB) + ' MB';
  if (b >= 0.1 * MB) return (b / MB).toFixed(1) + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}
export function ago(ms, now) {
  if (!ms) return 'a while ago';
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
const mins = (ms) => { const m = Math.round(Math.abs(ms) / 60000); return m < 90 ? `${Math.max(1, m)} minute${m === 1 ? '' : 's'}` : `${Math.round(m / 60)} hours`; };
const secs = (ms) => { const s = Math.round(Math.abs(ms) / 1000); return s < 120 ? `${s} seconds` : mins(ms); };
/** -1, 0, 1 comparing "2.15.1" with "2.16.0" (missing parts count as 0; anything odd compares equal). */
export function cmpVersion(a, b) {
  const p = (v) => String(v || '').replace(/^v/, '').split(/[.+-]/).slice(0, 3).map(x => parseInt(x, 10));
  const x = p(a), y = p(b);
  if (x.some(Number.isNaN) || y.some(Number.isNaN)) return 0;
  for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
const TONE_ORDER = { err: 0, warn: 1, info: 2, ok: 3 };

export function syncHealth({ status: s, os = null, now = Date.now(), platform = null, presence = null } = {}) {
  // presence: lib/sync-presence.mjs view().devices ({id, name, state, base, word, lastSeen, outdated}), when known
  const pres = new Map((Array.isArray(presence) ? presence : []).map(d => [d.id, d]));
  const presByName = new Map((Array.isArray(presence) ? presence : []).map(d => [d.name, d]));
  const checks = [];
  const add = (c) => { checks.push(c); return c; };
  if (!s || !s.enabled) {
    return { overall: 'off', title: 'Sync is off', attention: 0, at: now,
      checks: [{ id: 'off', tone: 'info', title: 'Sync is off', text: 'Your data stays on this computer. Turn sync on to keep your computers the same.', fix: { view: 'sync', label: 'Set up sync' } }] };
  }
  const h = s.health || {};
  const cloud = s.cloud || 'the cloud folder';
  const app = cloud === 'the sync folder' ? 'your cloud app' : cloud;
  const L = s.live || null;
  const e = s.e2e || {};
  const plat = platform || (os && os.platform) || null;
  const win = plat === 'win32', mac = plat === 'darwin';
  const others = (s.devices || []).filter(d => !d.me);
  const peerName = (id) => { const d = (s.devices || []).find(x => x.id === id); return d ? d.name : 'your other computer'; };
  const tryAgain = { action: 'sync-now', label: 'Try again' };
  const io = h.io || {};
  const cloudIcon = mac ? 'the cloud icon in the menu bar' : 'the cloud icon by the clock';

  // ── The folder ──────────────────────────────────────────────────────
  if (h.moved) {
    const c = h.moved.candidates || [];
    const use = c.find(x => !x.renamed);
    const renamed = c.find(x => x.renamed);
    const chk = add({ id: 'moved', tone: 'err', title: `The OpenDash Sync folder is missing from ${cloud}`,
      text: h.moved.kind === 'root'
        ? `It is not in ${s.folder || 'the folder you chose'} any more. Nothing is written until you choose, so nothing is lost and no empty sync is started.`
        : `The OpenDash Sync folder there holds none of your devices: ${cloud} may be signed in to a different account. Nothing is written until you choose.` });
    if (use) chk.fix = { action: 'relink', folder: use.folder, label: `Use the one in ${use.label}` , steps: [`Found your OpenDash Sync folder in ${use.folder}.`] };
    else if (renamed) chk.fix = { steps: [`Your sync is in a folder now called "${renamed.root.split(/[\\/]/).pop()}" (${renamed.root}).`, 'Rename it back to "OpenDash Sync".', 'Then click Try again.'], action: 'sync-now', label: 'Try again' };
    else chk.fix = { steps: [`If you moved or renamed it: put it back in ${cloud} and call it "OpenDash Sync".`, `If ${cloud} is signed in to another account now: sign in to the account you used when you set up sync (${cloudIcon} > Settings > Account).`, 'Then click Try again.'], action: 'sync-now', label: 'Try again' };
    chk.alt = { action: 'fresh', label: 'Start sync again here', confirm: `OpenDash writes everything this computer has into a new OpenDash Sync folder in ${s.folder}. Your other computers must then choose this folder too (Settings > Sync > Folder). Use this only if the old folder is gone for good.` };
  } else if ((os && os.folder && os.folder.exists === false) || (s.state === 'waiting' && /is not there/i.test(s.message || ''))) {
    add({ id: 'folder', tone: 'err', title: `${cloud}'s folder is not on this computer right now`,
      text: `${s.folder} is not there. ${app} may not be running or signed in, or the drive is not connected. Sync carries on by itself as soon as it is back.`,
      fix: os.cloud && os.cloud.kind ? { action: 'start-cloud', label: `Start ${app}` } : { steps: ['Connect the drive or start your cloud app, then click Try again.'], ...tryAgain },
      alt: { view: 'sync', label: 'Choose another folder' } });
  } else if (['EPERM', 'EACCES', 'EROFS'].includes(io.error)) {
    add({ id: 'folder', tone: 'err', title: 'OpenDash cannot write in the sync folder',
      text: `${io.error === 'EROFS' ? 'The folder is read-only.' : 'Windows or macOS refused the write (permissions, or a security app).'} Your changes wait here until it can.`,
      fix: { steps: [`Open the folder and check you can make a file in it.`, mac ? 'If macOS asks whether OpenDash (node) may use the folder, click Allow (System Settings > Privacy & Security > Files and Folders).' : 'If a security app (Controlled folder access) blocked node.exe, allow it there.', 'Then click Try again.'], action: 'open-folder', label: 'Open the folder' }, alt: tryAgain });
  } else if (io.error === 'EBUSY') {
    add({ id: 'folder', tone: 'warn', title: `${app} is holding a sync file`, text: 'It is probably uploading it. Sync tries again by itself in a few seconds.', fix: tryAgain });
  } else {
    add({ id: 'folder', tone: 'ok', title: 'The sync folder is reachable', text: `${s.where || s.folder || ''}${io.lastWriteAt ? ` · last written ${ago(io.lastWriteAt, now)}` : ''}` });
  }
  if (h.rewroteOwnAt && now - h.rewroteOwnAt < DAY) add({ id: 'rewrote', tone: 'info', title: 'This computer wrote its sync files again', text: `They had gone missing from ${cloud} (${ago(h.rewroteOwnAt, now)}); your other computers picked them up again. Nothing was lost.` });

  // ── The cloud app ───────────────────────────────────────────────────
  const c = (os && os.cloud) || {};
  if (c.running === false) {
    add({ id: 'cloud', tone: 'err', title: `${app} is not running`, text: `Without it nothing is uploaded or downloaded, so your other computers do not see changes made here.`, fix: { action: 'start-cloud', label: `Start ${app}` } });
  } else if (c.signedIn === false) {
    add({ id: 'cloud', tone: 'err', title: `${app} is not signed in to your personal account`, text: 'Sign in with the account you use for OpenDash sync.', fix: { action: 'start-cloud', label: `Open ${app} to sign in` } });
  } else if (c.accountChanged) {
    add({ id: 'cloud', tone: 'err', title: `${app} is signed in to a different account than before`, text: `Your sync lives in the account you used when you set it up. With another account, this computer cannot see it.`,
      fix: { steps: [`Click ${cloudIcon} > Settings > Account.`, 'Sign in with the account you used for OpenDash before.', 'Then click Try again.'], ...tryAgain } });
  } else if (c.outsidePersonal) {
    add({ id: 'cloud', tone: 'warn', title: `Your sync folder is not in the ${app} that is signed in now`, text: `${app} now keeps your files in ${c.personalFolder}; your sync folder is ${s.folder}.`,
      fix: { steps: ['If you moved your OneDrive: choose the OpenDash Sync folder in its new place (Settings > Sync > Folder).', 'Otherwise sign in to the account you used before.'], view: 'sync', label: 'Choose the folder' } });
  } else if (h.uploadLag) {
    add({ id: 'cloud', tone: 'warn', title: `${h.uploadLag} has not received this computer's latest changes`, text: `It has been on since, so ${app} may be paused, full, or still uploading.`,
      fix: { steps: [`Click ${cloudIcon}.`, 'If it says Paused, choose Resume syncing.', 'If it says your storage is full, free some space in it (or get more).', 'Then click Check again.'], action: 'sync-now', label: 'Check again' } });
  } else if (h.waitingLines) {
    add({ id: 'cloud', tone: 'info', title: `${app} is still downloading a change`, text: `From ${h.waitingFrom || 'your other computer'}. It is used as soon as it has arrived.`, fix: { action: 'sync-now', label: 'Check again' } });
  } else if (c.running === true || c.signedIn === true) {
    add({ id: 'cloud', tone: 'ok', title: `${app} is running`, text: c.signedIn ? 'Signed in.' : '' });
  }
  // Files still only in the cloud (Files On-Demand on Windows, File Provider on a Mac)
  const oo = os && os.onlineOnly;
  if (oo && oo.offline > 0) {
    add({ id: 'online-only', tone: 'warn', title: `${oo.offline} sync file${oo.offline === 1 ? ' is' : 's are'} still online-only`,
      text: `Of ${oo.files} from your other computers${oo.bytes ? ` (${mb(oo.bytes)} still to download)` : ''}. ${app} fetches them when OpenDash reads them, which is slow, and fails without internet.${os.downloading ? ' Downloading now…' : ''}`,
      fix: win ? { action: 'keep-offline', label: 'Always keep on this device', steps: ['Or: right-click the OpenDash Sync folder > "Always keep on this device".'] }
        : { action: 'download', label: os.downloading ? 'Downloading…' : 'Download them now', steps: ['To keep them on this Mac for good: in Finder, right-click the OpenDash Sync folder > "Always Keep on This Device" (Google Drive, Dropbox: "Make available offline").'] } });
  } else if (oo && oo.files) add({ id: 'online-only', tone: 'ok', title: 'Every sync file is on this computer', text: `${oo.files} file${oo.files === 1 ? '' : 's'} from your other computers.` });

  // ── Progress: the first big upload or download ──────────────────────
  const tr = h.transfer || {};
  if (tr.in && tr.in.total - tr.in.read > 256 * 1024) {
    const from = (tr.in.from || []).map(x => x.name).join(', ') || 'your other computer';
    add({ id: 'transfer-in', tone: 'info', title: `Receiving from ${from}`, text: `${mb(tr.in.read)} of ${mb(tr.in.total)} read. ${app} brings the rest; this carries on by itself.`,
      progress: { done: tr.in.read, total: tr.in.total, unit: 'bytes' }, fix: { action: 'sync-now', label: 'Check again' }, alt: { action: 'sync-off', label: 'Stop syncing for now', confirm: 'Sync stops on this computer until you turn it on again (Settings > Sync). Nothing is deleted.' } });
  }
  if (tr.out && (tr.out.peers || []).length && tr.out.bytes > 512 * 1024) {
    for (const p of tr.out.peers.slice(0, 3)) {
      const pd = presByName.get(p.name);
      const away = pd ? !pd.reachable && pd.word !== 'checking' : p.lastSeen && now - p.lastSeen > 10 * 60000;
      add({ id: `transfer-out-${p.name}`, tone: 'info', title: `Sending this computer's data to ${p.name}`,
        text: away ? `${p.name} has ${p.pct}% so far; it gets the rest when it is on again (last seen ${ago(p.lastSeen, now)}).` : `${p.name} has about ${p.pct}% (${mb(tr.out.bytes * p.pct / 100)} of ${mb(tr.out.bytes)}). ${app} is uploading the rest.`,
        progress: { done: p.pct, total: 100, unit: '%' }, fix: { action: 'sync-now', label: 'Check again' }, alt: { action: 'sync-off', label: 'Stop syncing for now', confirm: 'Sync stops on this computer until you turn it on again (Settings > Sync). Nothing is deleted; what was sent so far stays.' } });
    }
  }

  // ── Live sync ───────────────────────────────────────────────────────
  if (L && L.on && L.state === 'on') {
    const net = os && os.network;
    if (win && net && net.publicActive) {
      add({ id: 'network', tone: 'warn', title: 'Windows treats this network as Public', text: 'On a Public network Windows keeps your other computers out, even on the same Wi-Fi. At home or on a network you trust, make it Private.',
        fix: { action: 'open-network', label: 'Open network settings', steps: [`Click ${net.wifi ? 'your Wi-Fi network (or Manage known networks > it) > Properties' : 'your network > Properties'}.`, 'Set "Network profile type" to Private network.'] } });
    } else if (win && net) add({ id: 'network', tone: 'ok', title: 'This network is Private', text: 'Windows lets your other computers reach this one here.' });
    const fw = os && os.firewall;
    const fwFix = win
      ? { action: 'open-firewall', label: 'Open "Allow apps through Windows Firewall"', steps: ['Click Change settings.', 'Find every "Node.js JavaScript Runtime" (or node.exe) entry and tick Private.', 'None there? Allow another app… > Browse > the node.exe that runs OpenDash > Add, then tick Private.', 'A red "blocked" rule left from clicking Cancel earlier: Windows Defender Firewall > Advanced settings > Inbound Rules > delete the Node.js rules marked Block.'] }
      : { action: 'open-firewall', label: 'Open firewall settings', steps: ['System Settings > Network > Firewall > Options…', 'Turn off "Block all incoming connections".', 'Find "node" in the list and set it to "Allow incoming connections" (add it with + if it is missing).'] };
    if (fw && fw.os === 'windows' && fw.blockRules > 0) add({ id: 'firewall', tone: 'err', title: 'Windows Firewall blocks OpenDash', text: 'A rule blocks Node.js (which runs OpenDash) on this network, so your other computers cannot connect to this one directly. Changes still go through ' + cloud + '.', fix: fwFix });
    else if (fw && fw.os === 'mac' && (fw.blockAll || fw.nodeBlocked)) add({ id: 'firewall', tone: 'err', title: fw.blockAll ? 'macOS blocks all incoming connections' : 'The macOS firewall blocks OpenDash', text: 'Your other computers cannot connect to this Mac directly. Changes still go through ' + cloud + '.', fix: fwFix });
    else if ((fw && fw.os === 'windows' && fw.on && fw.allowRules === 0) || L.firewall) add({ id: 'firewall', tone: 'warn', title: 'Windows has not been told to let OpenDash in', text: L.firewall ? 'Your other computer could not reach this one on the same network.' : 'If Windows asks to allow Node.js on private networks, click Allow.', fix: fwFix });
    else if (fw) add({ id: 'firewall', tone: 'ok', title: 'The firewall lets OpenDash in', text: '' });

    for (const p of L.peers || []) {
      const n = p.name || 'your other computer';
      const id = `live-${p.id}`;
      if (p.state === 'live') { add({ id, tone: 'ok', title: `Live with ${n}`, text: p.path === 'lan' ? 'Same network: changes show within a second.' : 'Over the internet: changes show within a second.' }); continue; }
      const retry = { action: 'live-retry', id: p.id, label: 'Try again' };
      const reasons = {
        trying: [`Connecting to ${n}…`, `Until it connects, changes go through ${cloud}.`, 'info', { action: 'live-hold', id: p.id, label: 'Stop trying' }],
        held: [`Not connecting to ${n}`, `You stopped trying. Changes go through ${cloud} (10 to 60 seconds).`, 'info', retry],
        offline: [`${n} is ${pres.get(p.id) && pres.get(p.id).base === 'asleep' ? 'asleep' : pres.get(p.id) && pres.get(p.id).base === 'off' ? 'off' : 'off or asleep'}`, `Its changes come through ${cloud} when it is back.`, 'info', retry],
        'no-address': [`${n} has not shared how to reach it`, 'Is OpenDash up to date and running on it?', 'warn', retry],
        'new-key': [`Waiting for the new sync key`, `${cloud} is bringing it; then the two connect again.`, 'info', retry],
        firewall: [`A firewall blocks the connection to ${n}`, 'See the firewall item above (on this computer or on ' + n + ').', 'warn', retry],
        'lan-blocked': [`Something on this network blocks the connection to ${n}`, 'Some office and hotel Wi-Fi keeps computers apart. Changes go through ' + cloud + '.', 'warn', retry],
        cgnat: [`${n} cannot be reached over the internet`, 'Your internet provider shares one address between many homes (CGNAT). On the same Wi-Fi live sync works; elsewhere changes go through ' + cloud + '.', 'info', retry],
        router: [`${n} cannot be reached over the internet`, 'Neither router lets OpenDash in (see "Your router" below). Changes go through ' + cloud + '.', 'info', retry],
        unreachable: [`${n} cannot be reached right now`, `Changes go through ${cloud} meanwhile.`, 'warn', retry],
      }[p.reason] || [`Not live with ${n}`, `Changes go through ${cloud}.`, 'info', retry];
      add({ id, tone: reasons[2], title: reasons[0], text: reasons[1] + (p.nextDialAt ? ` Next try ${Math.max(1, Math.round((p.nextDialAt - now) / 1000))} s from now.` : ''), fix: reasons[3] });
    }
    const r = L.reach || {};
    if (L.internet !== false) {
      if (r.state === 'mapped') add({ id: 'router', tone: 'ok', title: 'Your router lets your other computers in', text: 'Live sync works away from home too.' });
      else if (r.state === 'cgnat') add({ id: 'router', tone: 'info', title: 'This computer cannot be reached from the internet', text: 'Your internet provider shares one address between many homes (CGNAT). Nothing to fix here: on the same Wi-Fi live sync works, and elsewhere changes go through ' + cloud + '. Some providers turn CGNAT off if you ask.', fix: { action: 'live-retry', id: 'all', label: 'Try again' } });
      else if (r.state === 'double-nat') add({ id: 'router', tone: 'info', title: 'There are two routers in front of this computer', text: 'Your other computers cannot reach this one from outside. On the same Wi-Fi live sync works.', fix: { steps: ['If you have your own router behind the provider\'s, set one of them to bridge (or access point) mode.', 'Then click Try again.'], action: 'live-retry', id: 'all', label: 'Try again' } });
      else if (r.state === 'none' || r.state === 'refused') add({ id: 'router', tone: 'info', title: 'Your router does not let OpenDash in', text: 'From outside your home, your other computers cannot reach this one; changes go through ' + cloud + ' instead.', fix: { steps: ["Open your router's settings page (often 192.168.1.1 or 192.168.0.1; see the sticker on the router).", 'Turn on UPnP (often under Advanced > NAT forwarding).', 'Then click Try again.'], action: 'live-retry', id: 'all', label: 'Try again' } });
    }
  } else if (L && !L.on) add({ id: 'live', tone: 'info', title: 'Live sync is off', text: `Changes travel through ${cloud} only (10 to 60 seconds).`, fix: { view: 'sync', label: 'Turn live sync on' } });

  // ── Clocks ──────────────────────────────────────────────────────────
  const clockFix = { action: 'open-datetime', label: "Open this computer's date & time settings", steps: [win ? 'Turn on "Set time automatically", then click Sync now.' : mac ? 'Turn on "Set time and date automatically".' : 'Turn on automatic time.', 'Do the same on your other computer.'] };
  const skewed = [];
  if (s.skew) skewed.push({ tone: 'err', title: `${s.skew.device}'s clock is ${mins(s.skew.aheadMin * 60000)} ahead`, text: s.skew.text });
  for (const d of others) if (d.clockAheadMs > 0) skewed.push({ tone: 'warn', title: `${d.name}'s clock is about ${mins(d.clockAheadMs)} ahead of this one`, text: 'Or this computer is behind. The newest change wins, so both clocks should be right.' });
  for (const p of (L && L.peers) || []) if (p.skewMs != null && Math.abs(p.skewMs) > 10000) skewed.push({ tone: 'warn', title: `${p.name}'s clock is ${secs(p.skewMs)} ${p.skewMs > 0 ? 'ahead of' : 'behind'} this one`, text: 'Requests to the Claude host need the clocks within 10 seconds, and the newest change wins.' });
  if (skewed.length) { const k = skewed[0]; add({ id: 'clock', tone: k.tone, title: k.title, text: k.text + (skewed.length > 1 ? ` (${skewed.length - 1} more)` : ''), fix: clockFix }); }
  else if (others.length) add({ id: 'clock', tone: 'ok', title: 'The clocks agree', text: '' });

  // ── The key ─────────────────────────────────────────────────────────
  if (e.on && !e.ready) {
    const join = { view: 'join', label: 'Type the 4-letter code', steps: ['On your other computer: Settings > Sync > Add a computer.', 'Type the 4 letters it shows on this computer.'] };
    if (e.reason === 'removed') add({ id: 'key', tone: 'err', title: 'This computer was removed from sync', text: `${e.removedBy && e.removedBy.name ? `${e.removedBy.name} removed it. ` : ''}It keeps what it had but gets nothing new.`, fix: join });
    else if (e.reason === 'not-joined') add({ id: 'key', tone: 'warn', title: 'This computer is not in your sync yet', text: 'It needs the key from your other computer.', fix: join });
    else add({ id: 'key', tone: 'warn', title: 'Waiting for the sync key', text: `${cloud} is bringing it from your other computer.`, fix: { action: 'sync-now', label: 'Check again' }, alt: { view: 'join', label: 'Use the code or recovery code instead' } });
  } else if (e.on && e.waitingKey) {
    add({ id: 'key', tone: 'warn', title: 'Waiting for the new sync key', text: `A device was removed (or a new recovery code made), so there is a new key. ${cloud} is bringing it.`, fix: { action: 'sync-now', label: 'Check again' }, alt: { view: 'join', label: 'Use the code or recovery code instead' } });
  } else if (e.on && (e.plainFrom || []).length) {
    add({ id: 'key', tone: 'warn', title: `${e.plainFrom[0]} still syncs without encryption`, text: 'Its changes are not used here.', fix: { steps: [`On ${e.plainFrom[0]}: Settings > Sync > "Encrypt my synced data".`, 'Then add it with Settings > Sync > Add a computer.'] } });
  } else if (e.on) add({ id: 'key', tone: 'ok', title: 'Encrypted, and this computer has the key', text: e.tampered ? `${e.tampered} change${e.tampered === 1 ? '' : 's'} in ${cloud} did not come from your devices and ${e.tampered === 1 ? 'was' : 'were'} ignored.` : '' });
  else if (e.available) add({ id: 'key', tone: 'warn', title: 'Your synced data is not encrypted', text: `${cloud} can read it.`, fix: { view: 'sync', label: 'Encrypt my synced data' } });

  // ── Versions ────────────────────────────────────────────────────────
  const mine = h.appVersion || null;
  let verIssue = false;
  if (s.message && /newer format|Update OpenDash here/i.test(s.message)) { verIssue = true; add({ id: 'versions', tone: 'err', title: 'Another device uses a newer OpenDash', text: 'This version cannot read its changes. Update OpenDash here.', fix: { view: 'updates', label: 'Check for updates' } }); }
  for (const d of others) {
    if (!mine || !d.app) continue;
    const k = cmpVersion(d.app, mine);
    if (k < 0) { verIssue = true; add({ id: `version-${d.id}`, tone: 'warn', title: `${d.name} runs an older OpenDash (${d.app})`, text: `This computer runs ${mine}. Some things sync only once both are up to date.`, fix: { steps: [`On ${d.name}: Settings > Updates > Update.`] } }); }
    else if (k > 0 && !verIssue) { verIssue = true; add({ id: 'versions', tone: 'warn', title: `This computer runs an older OpenDash (${mine})`, text: `${d.name} runs ${d.app}.`, fix: { view: 'updates', label: 'Check for updates' } }); }
  }
  if (!verIssue && mine && others.some(d => d.app)) add({ id: 'versions', tone: 'ok', title: 'Every device runs the same OpenDash', text: mine });

  // ── Old devices ─────────────────────────────────────────────────────
  for (const d of others) {
    if (!d.lastSeen || now - d.lastSeen < OLD_DEVICE_MS || !e.on) continue;
    add({ id: `old-${d.id}`, tone: 'warn', title: `${d.name} was last seen ${ago(d.lastSeen, now)}`, text: 'Still using it? If not, remove it: it then gets nothing new, and a week later its files leave the sync folder.',
      fix: { action: 'remove-device', id: d.id, label: 'Remove old device', confirm: `Remove "${d.name}"? It stops getting your changes and what it changes is no longer used. Your other devices get a new key. It can join again later with a code.` } });
  }
  for (const p of h.pruned || []) if (now - p.at < 7 * DAY) add({ id: `pruned-${p.at}`, tone: 'info', title: `Tidied up after ${p.name}`, text: `Its files left the sync folder (it had been removed). ${ago(p.at, now)}.` });

  // ── The disk ────────────────────────────────────────────────────────
  const free = os && os.disk ? [os.disk.data, os.disk.sync].filter(x => Number.isFinite(x)) : [];
  const low = free.length ? Math.min(...free) : null;
  const diskFix = { action: 'open-storage', label: 'Open storage settings', steps: [win ? 'Empty the Recycle Bin, or let Storage Sense clean up.' : 'Empty the Bin, or see what takes space.', 'Then click Try again.'] };
  if (h.diskFull) add({ id: 'disk', tone: 'err', title: 'The disk is full: sync stopped writing', text: `Nothing half-written was left behind. It tries again every minute${low != null ? ` (${mb(low)} free now)` : ''}.`, fix: diskFix, alt: tryAgain });
  else if (low != null && low < 500 * MB) add({ id: 'disk', tone: 'warn', title: `Only ${mb(low)} free on this computer`, text: 'When the disk is full, sync stops writing until there is room.', fix: diskFix });
  else if (low != null) add({ id: 'disk', tone: 'ok', title: 'Enough disk space', text: `${mb(low)} free.` });

  // ── Clashes ─────────────────────────────────────────────────────────
  if (h.conflictsOpen > 0) add({ id: 'conflicts', tone: 'warn', title: `${h.conflictsOpen} edit${h.conflictsOpen === 1 ? '' : 's'} clashed`, text: 'The same thing was changed on two computers while they could not see each other. The later change was kept: check it is the one you want.', fix: { view: 'review', label: 'Review' } });

  // ── Size and compaction ─────────────────────────────────────────────
  const sto = h.storage;
  if (sto && sto.mine) {
    const m = sto.mine;
    const due = m.oldLogs > 0 || m.sinceSnapshot > 1024 * 1024;
    if (sto.total > 300 * MB) add({ id: 'storage', tone: 'warn', title: `The sync folder holds ${mb(sto.total)}`, text: `This computer's part: ${mb(m.bytes)}. ${(sto.devices || []).filter(d => d.removed).length ? 'Removed devices still have files there (they go a week after removal). ' : ''}Compacting writes one fresh snapshot and removes old change logs.`, fix: { action: 'compact', label: 'Compact now' } });
    else add({ id: 'storage', tone: due ? 'info' : 'ok', title: `${mb(sto.total)} in the sync folder`, text: `This computer's part: ${mb(m.bytes)} (${m.logs} change log${m.logs === 1 ? '' : 's'}, snapshot ${mb(m.snapshot)}${m.lastSnapshotAt ? `, compacted ${ago(m.lastSnapshotAt, now)}` : ''}).${due ? ' Compaction is due and runs by itself.' : ''}`, ...(due ? { fix: { action: 'compact', label: 'Compact now' } } : {}) });
  }

  // ── Recently: sleep, a new network ──────────────────────────────────
  const woke = Math.max(h.wokeAt || 0, (L && L.wokeAt) || 0);
  if (woke && now - woke < 60 * 60000) add({ id: 'woke', tone: 'ok', title: `Back from sleep ${ago(woke, now)}`, text: 'Caught up with your other computers and reconnected.' });
  if (L && L.netChangedAt && now - L.netChangedAt < 60 * 60000) add({ id: 'net-changed', tone: 'ok', title: `New network ${ago(L.netChangedAt, now)}`, text: 'Reconnected, and told your other computers where to find this one.' });

  // ── Trial mode, other errors ────────────────────────────────────────
  if (!s.apply && (!e.on || e.ready)) add({ id: 'trial', tone: 'info', title: 'Trial mode', text: 'Changes from your other computers are listed in Settings > Sync, not used yet.', fix: { action: 'apply-on', label: 'Use changes from my other computers' } });
  if (s.state === 'error' && !h.moved && !h.diskFull && !io.error) add({ id: 'error', tone: 'err', title: 'Sync is paused', text: s.message || 'Something went wrong reading or writing the sync folder.', fix: tryAgain });

  checks.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
  const attention = checks.filter(x => x.tone === 'err' || x.tone === 'warn').length;
  const overall = checks.some(x => x.tone === 'err') ? 'err' : attention ? 'warn' : 'ok';
  return { overall, attention, at: now, title: attention ? `${attention} thing${attention === 1 ? ' needs' : 's need'} attention` : 'Everything looks good', checks };
}
