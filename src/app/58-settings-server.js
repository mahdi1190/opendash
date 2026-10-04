/* ============================================================
   SETTINGS > Server, and restarting the server from the page.
   Server side: server/routes/server-control.mjs (+ server/lifecycle.mjs,
   tools/supervisor.mjs, lib/os-integration.mjs). The offline banner and
   reconnect are in 86-offline-banner.js.
     status (running since, pid, port, version, data folder, supervised),
     Restart server / Rebuild & restart / Open log / Stop server,
     Windows-only opt-in switches (start when I log in, the Start server
     button) read back from Windows each time, the offline page switch.
   Restart: unsaved edits are sent first, an overlay says "Restarting...",
   /api/health?quick=1 is polled until a NEW pid answers, then the page
   reloads if the app changed (build or version), else it just re-syncs.
   No answer in 30 s (90 s for a rebuild): the offline banner takes over.
   ============================================================ */
let _ssStatus = null, _ssInteg = null, _ssIntegBusy = '', _ssRestarting = false;

async function _ssJson(url, opts) {
  const r = await fetch(url, Object.assign({ cache: 'no-store' }, opts || {}));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j && (j.error && (j.error.message || j.error))) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
  return j;
}
const _ssPost = (url, body) => _ssJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
function _ssRefresh() { if (state.view === 'settings:server') renderMain(); }
/** The server came back (86-offline-banner.js): read its status again. */
function srvSettingsInvalidate() { _ssStatus = null; _ssInteg = null; _ssRefresh(); }
function _ssWhen(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(APP_CONFIG.locale || undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...(typeof clockH12Opt === 'function' ? clockH12Opt() : {}), timeZone: Clock.zone() }); } catch (e) { return String(iso); }
}
function _ssDuration(s) {
  s = Math.max(0, Math.round(Number(s) || 0));
  if (s < 90) return s + ' s';
  const m = Math.round(s / 60);
  if (m < 90) return m + ' min';
  const h = Math.floor(m / 60);
  if (h < 48) return h + ' h ' + (m % 60) + ' min';
  return Math.floor(h / 24) + ' days';
}
function _ssBtn(label, ic, cls, run) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || 'btn-secondary') + ' btn-sm';
  b.innerHTML = (ic ? icon(ic) : '') + `<span>${esc(label)}</span>`;
  b.onclick = () => run(b);
  return b;
}

/* ---------- restart ---------- */
function _ssOverlay(text, sub) {
  let ov = document.getElementById('srv-overlay');
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'srv-overlay'; ov.className = 'srv-overlay';
    ov.setAttribute('role', 'alertdialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-live', 'assertive');
    ov.innerHTML = '<div class="srv-ov-card"><span class="spinner" aria-hidden="true"></span><div class="srv-ov-t"></div><div class="srv-ov-s"></div></div>';
    document.body.appendChild(ov);
  }
  ov.querySelector('.srv-ov-t').textContent = text;
  ov.querySelector('.srv-ov-s').textContent = sub || '';
  ov.hidden = false;
  const app = document.getElementById('app'); if (app) app.inert = true;
  return ov;
}
function _ssOverlayOff() {
  const ov = document.getElementById('srv-overlay'); if (ov) ov.hidden = true;
  const app = document.getElementById('app'); if (app) app.inert = false;
}
/** Send unsaved edits now (and wait for a save already on its way). */
async function _ssFlush() {
  for (let i = 0; i < 20 && typeof _persistInFlight !== 'undefined' && _persistInFlight; i++) await new Promise(r => setTimeout(r, 100));
  if (typeof state !== 'undefined' && (state._localDirty || _persistTimer)) await _persistFire();
}

/** Restart the server ({rebuild:true}: migrations + build first). Resolves true when it is back.
 *  {post:[url, body]} asks another route to do the restart (the update install, 58-settings-updates.js);
 *  {label} names the overlay. */
async function srvRestart(opts) {
  const rebuild = !!(opts && opts.rebuild);
  if (_ssRestarting) return false;
  if (typeof srvIsOffline === 'function' && srvIsOffline()) { toast('The server is not running: use Start server in the banner.', { kind: 'err' }); return false; }
  _ssRestarting = true;
  const label = (opts && opts.label) || (rebuild ? 'Rebuilding and restarting…' : 'Restarting the server…');
  _ssOverlay(label, 'Saving your changes first');
  try {
    await _ssFlush();
    const before = await srvProbe(5000);
    let r;
    try { r = await (opts && opts.post ? _ssPost(opts.post[0], opts.post[1]) : _ssPost('/api/server/restart', { rebuild })); }
    catch (e) { _ssOverlayOff(); toast((opts && opts.post ? '' : 'Could not restart: ') + _srvErrText(e), { kind: 'err', timeout: 10000 }); return false; }
    if (typeof _srvLink !== 'undefined') _srvLink.state = 'restarting';
    const oldPid = (r && r.pid) || (before && before.pid);
    if (r && r.updated) { try { sessionStorage.setItem('dashboard-updated', JSON.stringify({ from: r.updated.from, to: r.updated.to })); } catch (e) { /* fine */ } }
    const budget = (rebuild ? 90 : 30) * 1000;
    const t0 = Date.now();
    let h = null;
    while (Date.now() - t0 < budget) {
      const secs = Math.round((Date.now() - t0) / 1000);
      _ssOverlay(label, rebuild ? `Migrations, check and build, then start (${secs} s)` : `Waiting for the new server (${secs} s)`);
      await new Promise(res => setTimeout(res, 600));
      const x = await srvProbe(2500);
      if (x && x.pid && x.pid !== oldPid) { h = x; break; }
    }
    if (!h) {
      _ssOverlayOff();
      if (typeof _srvLink !== 'undefined') _srvLink.state = 'unknown';
      if (typeof srvGoOffline === 'function') srvGoOffline('restart');
      toast(`The server did not come back within ${Math.round(budget / 1000)} s.`, { kind: 'err', action: { label: 'How to start it', run: () => srvShowStartHelp() }, timeout: 10000 });
      return false;
    }
    if (typeof _srvLink !== 'undefined') _srvLink.state = 'online';
    const versionChanged = !!(before && before.version && h.version && before.version !== h.version);
    const failed = h.lastRebuild && h.lastRebuild.ok === false;
    if (failed) {
      _ssOverlayOff();
      toast(`The rebuild failed (${h.lastRebuild.step || 'build'} step), so the previous version was restarted.`, { kind: 'err', action: { label: 'Open log', run: () => srvOpenLog() }, timeout: 12000 });
    }
    if (!failed && (versionChanged || srvBuildChanged(h))) {
      _ssOverlay('Loading the new version…', '');
      try { sessionStorage.setItem('dashboard-srv-reload-at', String(Date.now())); } catch (e) { /* fine */ }
      setTimeout(() => location.reload(), 250);
      return true;
    }
    await srvResync(h);
    _ssOverlayOff();
    _ssStatus = null; _ssRefresh();
    if (!failed) toast(rebuild ? 'Rebuilt and restarted (no changes to the app)' : 'Server restarted', { kind: 'ok' });
    return true;
  } finally {
    _ssRestarting = false;
  }
}

async function srvStop() {
  const ok = await confirmDialog({
    title: 'Stop the OpenDash server?',
    text: 'This page stops saving to your data folder until the server is started again (your changes are kept in this browser meanwhile). Start it again with start-opendash in the app folder (or your OpenDash shortcut)' + (srvStartScheme() ? ', or Start server in the banner.' : '.'),
    confirmLabel: 'Stop server', danger: true,
  });
  if (!ok) return;
  try { await _ssFlush(); await _ssPost('/api/server/stop', {}); }
  catch (e) { toast('Could not stop it: ' + _srvErrText(e), { kind: 'err' }); return; }
  setTimeout(() => { if (typeof srvGoOffline === 'function') srvGoOffline('stopped'); }, 800);
}

/** The last 200 lines of the server log, in a dialog. */
async function srvOpenLog() {
  let pre = null, info = null;
  const load = async () => {
    if (!pre) return;
    pre.textContent = 'Loading…';
    try {
      const j = await _ssJson('/api/server/log?lines=200');
      pre.textContent = (j.lines || []).join('\n') || '(the log is empty)';
      if (info) info.textContent = j.file || '';
      pre.scrollTop = pre.scrollHeight;
    } catch (e) { pre.textContent = 'Could not read the log: ' + _srvErrText(e); }
  };
  openDialog({
    title: 'Server log (last 200 lines)', width: 900,
    body: (el) => {
      info = document.createElement('div'); info.className = 'set-h srv-log-file';
      pre = document.createElement('pre'); pre.className = 'srv-log'; pre.tabIndex = 0;
      pre.setAttribute('aria-label', 'Server log');
      el.append(info, pre);
      load();
    },
    actions: [
      { label: 'Copy', icon: 'copy', run: () => { navigator.clipboard.writeText(pre ? pre.textContent : '').then(() => toast('Copied', { kind: 'ok' }), () => toast('Could not copy.', { kind: 'err' })); return false; } },
      { label: 'Refresh', icon: 'refresh-cw', run: () => { load(); return false; } },
      'spacer',
      { label: 'Close', primary: true },
    ],
  });
}

/* ---------- the Settings group ---------- */
function _ssLoad(force) {
  if (force) { _ssStatus = null; _ssInteg = null; }
  if (!_ssStatus) _ssJson('/api/server/status').then(j => { _ssStatus = j; _ssRefresh(); }).catch(e => { _ssStatus = { error: _srvErrText(e) }; _ssRefresh(); });
  if (!_ssInteg) _ssJson('/api/server/integration').then(j => {
    _ssInteg = j;
    if (j && j.supported) srvRememberScheme(j.protocol && j.protocol.enabled && j.protocol.current ? j.scheme : null);
    _ssRefresh();
  }).catch(e => { _ssInteg = { error: _srvErrText(e) }; _ssRefresh(); });
}

async function _ssToggle(feature, on) {
  if (_ssIntegBusy) return;
  _ssIntegBusy = feature; _ssRefresh();
  try {
    const st = await _ssPost('/api/server/integration', { feature, enabled: on });
    _ssInteg = st;
    if (st && st.supported) srvRememberScheme(st.protocol && st.protocol.enabled && st.protocol.current ? st.scheme : null);
    const now = st && st[feature] && st[feature].enabled;
    if (now !== on) toast('Windows did not keep the change. Check the log.', { kind: 'err' });
    else toast(feature === 'autostart' ? (on ? 'OpenDash will start when you log in' : 'It will no longer start when you log in') : (on ? 'Start server button enabled' : 'Start server button removed'), { kind: 'ok' });
  } catch (e) {
    toast('Not changed: ' + _srvErrText(e), { kind: 'err' });
    _ssInteg = null;
  } finally { _ssIntegBusy = ''; _ssRefresh(); }
}

function _ssStatusCard(el) {
  const s = _ssStatus;
  const card = _settingsCard('This server', 'The program that saves your data and talks to Claude. It runs on this computer only.');
  if (!s) {
    for (let i = 0; i < 3; i++) { const sk = document.createElement('div'); sk.className = 'skeleton skeleton-row'; card.body.appendChild(sk); }
  } else if (s.error) {
    const c = document.createElement('div'); c.className = 'callout warn set-callout';
    c.innerHTML = icon('cloud-off') + `<span>${esc('The server is not answering: ' + s.error)}</span>`;
    card.body.appendChild(c);
  } else {
    const dl = document.createElement('dl'); dl.className = 'kv set-kv srv-kv';
    const stop = s.lastStopReason;
    const rows = [
      ['Status', s.supervised ? 'Running, kept running by the supervisor (restarts it if it crashes)' : 'Running on its own (started with node serve.mjs: not restarted if it crashes)'],
      ['Running since', `${_ssWhen(s.startedAt)} (${_ssDuration(s.uptime)})`],
      ['Process id', String(s.pid)],
      ['Port', String(s.port)],
      ['Version', `${s.version || '?'}${s.build ? ' · build ' + s.build : ''}`],
      ['Data folder', s.dataDir || ''],
      ['Restarts', s.restartCount ? String(s.restartCount) + ' since it was started' : 'none since it was started'],
      ['Last stop', stop ? `${stop.reason}${stop.at ? ' (' + _ssWhen(stop.at) + ')' : ''}` : 'nothing logged before this start'],
    ];
    if (s.lastRebuild) rows.push(['Last rebuild', s.lastRebuild.ok ? `done ${_ssWhen(s.lastRebuild.at)}` : `failed at the ${s.lastRebuild.step} step: ${s.lastRebuild.message || ''}`]);
    dl.innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    card.body.appendChild(dl);
  }
  const btns = document.createElement('div'); btns.className = 'btn-group set-btns';
  const dis = !s || !!s.error || s.canRestart === false;
  const rs = _ssBtn('Restart server', 'refresh-cw', 'btn-secondary', () => srvRestart({ rebuild: false }));
  const rb = _ssBtn('Rebuild & restart', 'hammer', 'btn-secondary', () => srvRestart({ rebuild: true }));
  rs.disabled = rb.disabled = dis;
  rs.setAttribute('data-tip', 'Stops and starts the server. Open tabs reconnect by themselves.');
  rb.setAttribute('data-tip', 'Runs the data migrations and rebuilds the app from its source first. Use after updating the app.');
  const lg = _ssBtn('Open log', 'file-text', 'btn-ghost', () => srvOpenLog());
  const st = _ssBtn('Stop server…', 'circle-x', 'btn-ghost', () => srvStop());
  st.disabled = dis;
  btns.append(rs, rb, lg, st);
  card.body.appendChild(btns);
  el.appendChild(card.card);
}

function _ssStartCard(el) {
  const ig = _ssInteg;
  const card = _settingsCard('Starting the server', 'The server has to be running for OpenDash to save. These are off unless you turn them on, and turning them off removes them again.');
  if (!ig) { const sk = document.createElement('div'); sk.className = 'skeleton skeleton-row'; card.body.appendChild(sk); el.appendChild(card.card); return; }
  if (ig.error) {
    const p = document.createElement('p'); p.className = 'set-h'; p.textContent = 'Could not check: ' + ig.error;
    card.body.appendChild(p); el.appendChild(card.card); return;
  }
  if (!ig.supported) {
    const c = document.createElement('div'); c.className = 'callout set-callout';
    c.innerHTML = icon('info') + '<span>Starting automatically and the Start server button are Windows features. On this computer, do it by hand:</span>';
    card.body.appendChild(c);
    const m = ig.manual || {};
    for (const [t, v] of [['Start it', m.start], ['Start when you log in', m.autostart]]) {
      if (!v) continue;
      const row = _settingsRow(t, null, null); row.classList.add('set-row-stack');
      const pre = document.createElement('pre'); pre.className = 'srv-manual'; pre.textContent = v;
      row.appendChild(pre);
      card.body.appendChild(row);
    }
    el.appendChild(card.card);
    return;
  }
  if (ig.problem) {
    const c = document.createElement('div'); c.className = 'callout warn set-callout';
    c.innerHTML = icon('triangle-alert') + `<span>${esc(ig.problem)}</span>`;
    card.body.appendChild(c);
  }
  const hintFor = (f) => {
    const x = ig[f] || {};
    const base = f === 'autostart'
      ? 'Adds OpenDash to your Windows start-up apps (for your account only). It starts with no window; stop it here with Stop server.'
      : `Lets the “server isn’t running” banner start it (a ${ig.scheme}:// link for your account only). It always runs this app’s start-opendash with no window and ignores anything in the link.`;
    if (_ssIntegBusy === f) return 'Asking Windows…';
    if (x.enabled && !x.current) return base + (!/start-hidden\.mjs/i.test(x.command || '') ? ' Now: on, but with an old launcher that no longer works. Turn it off and on again to fix it.' : ' Now: on, but set up for another copy or folder of the app. Turn it off and on again to point it here.');
    if (f === 'autostart' && x.enabled && x.approved === false) return base + ' Now: on, but switched off in Task Manager › Startup apps. Turn it off and on again here to re-enable it.';
    return base + (x.enabled ? ' Now: on.' : ' Now: off.');
  };
  const sw1 = _settingsSwitch(!!(ig.autostart && ig.autostart.enabled), 'Start automatically when I log in', (on) => _ssToggle('autostart', on), !!_ssIntegBusy);
  card.body.appendChild(_settingsRow('Start automatically when I log in', hintFor('autostart'), sw1));
  const sw2 = _settingsSwitch(!!(ig.protocol && ig.protocol.enabled), 'Enable the Start server button', (on) => _ssToggle('protocol', on), !!_ssIntegBusy);
  card.body.appendChild(_settingsRow('Enable the Start server button', hintFor('protocol'), sw2));
  if (ig.hiddenHost === false) {
    const p = document.createElement('p'); p.className = 'set-h';
    p.textContent = 'This Windows has no hidden console host (conhost.exe), so a console window flashes up briefly when the server is started this way.';
    card.body.appendChild(p);
  }
  const re = _ssBtn('Check again', 'refresh-cw', 'btn-ghost', () => { _ssInteg = null; _ssLoad(); _ssRefresh(); });
  card.body.appendChild(re);
  el.appendChild(card.card);
}

function _ssOfflineCard(el) {
  const card = _settingsCard('Offline page', 'When the server is not running, this browser shows OpenDash with a “server isn’t running” banner and a Start server button, instead of an error page. The copy it keeps is only the app page itself (with basic settings such as your name and time zone), never your tasks or other data.');
  const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && window.isSecureContext;
  const on = srvSwEnabled();
  const hint = !supported ? 'This browser does not support it here.' : (on ? (srvSwActive() ? 'On, and ready.' : 'On. Ready after the next page load.') : 'Off in this browser.') + ' Developers: add ?nosw to the address to turn it off.';
  card.body.appendChild(_settingsRow('Show an offline page', hint, _settingsSwitch(on && supported, 'Show an offline page', async (v) => {
    await srvSetSwEnabled(v); toast(v ? 'Offline page on' : 'Offline page off', { kind: 'ok' }); _ssRefresh();
  }, !supported)));
  el.appendChild(card.card);
}

registerSettingsGroup({
  id: 'server', title: 'Server', icon: 'hard-drive', order: 92,
  description: 'The OpenDash local server: restart it, read its log, and choose how it starts.',
  render(el) {
    _ssLoad();
    _ssStatusCard(el);
    _ssStartCard(el);
    _ssOfflineCard(el);
  },
});

registerCommand({ id: 'server-restart', label: 'Restart server', icon: 'refresh-cw', keywords: 'server restart reboot reload reconnect backend', run: () => srvRestart({ rebuild: false }) });
registerCommand({ id: 'server-rebuild', label: 'Rebuild & restart server', icon: 'hammer', keywords: 'server rebuild build update restart migrate', run: () => srvRestart({ rebuild: true }) });
registerCommand({ id: 'server-log', label: 'Open server log', icon: 'file-text', keywords: 'server log errors debug', run: () => srvOpenLog() });
registerCommand({ id: 'open-server-settings', label: 'Server', icon: 'hard-drive', group: 'Go to', keywords: 'server restart start log login startup', run: () => setView('settings:server') });
