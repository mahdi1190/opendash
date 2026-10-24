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
  return uiButton({ label, icon: ic, kind: cls || 'secondary', size: 'sm', run: (e, b) => run(b) });
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
  if (typeof srvIsOffline === 'function' && srvIsOffline()) { toast('OpenDash isn’t running. Use Start on the banner.', { kind: 'err' }); return false; }
  _ssRestarting = true;
  const label = (opts && opts.label) || (rebuild ? 'Rebuilding and restarting…' : 'Restarting the server…');
  _ssOverlay(label, 'Saving your changes first');
  try {
    await _ssFlush();
    const before = await srvProbe(5000);
    let r;
    // An update (opts.post) first downloads and checks the release: say so, with the seconds going by.
    const post = !!(opts && opts.post);
    let tick = null;
    if (post) {
      const t1 = Date.now();
      const step = () => _ssOverlay(label, `Step 1 of 2 · Downloading the release and checking it (${Math.round((Date.now() - t1) / 1000)} s)`);
      step(); tick = setInterval(step, 1000);
    }
    try { r = await (post ? _ssPost(opts.post[0], opts.post[1]) : _ssPost('/api/server/restart', { rebuild })); }
    catch (e) { _ssOverlayOff(); toastError(post ? 'finish the update' : 'restart OpenDash', e, () => srvRestart(opts)); return false; }
    finally { if (tick) clearInterval(tick); }
    if (typeof _srvLink !== 'undefined') _srvLink.state = 'restarting';
    const oldPid = (r && r.pid) || (before && before.pid);
    if (r && r.updated) { try { sessionStorage.setItem('dashboard-updated', JSON.stringify({ from: r.updated.from, to: r.updated.to })); } catch (e) { /* fine */ } }
    const budget = (rebuild ? 90 : 30) * 1000;
    const t0 = Date.now();
    let h = null;
    while (Date.now() - t0 < budget) {
      const secs = Math.round((Date.now() - t0) / 1000);
      _ssOverlay(label, post ? `Step 2 of 2 · Installing, building and restarting (${secs} s)` : rebuild ? `Migrations, check and build, then start (${secs} s)` : `Waiting for the new server (${secs} s)`);
      await new Promise(res => setTimeout(res, 600));
      const x = await srvProbe(2500);
      if (x && x.pid && x.pid !== oldPid) { h = x; break; }
    }
    if (!h) {
      _ssOverlayOff();
      if (typeof _srvLink !== 'undefined') _srvLink.state = 'unknown';
      if (typeof srvGoOffline === 'function') srvGoOffline('restart');
      toast(`OpenDash didn’t come back within ${Math.round(budget / 1000)} s.`, { kind: 'err', action: { label: 'How to start it', run: () => srvShowStartHelp() }, timeout: 10000 });
      return false;
    }
    if (typeof _srvLink !== 'undefined') _srvLink.state = 'online';
    const versionChanged = !!(before && before.version && h.version && before.version !== h.version);
    const failed = h.lastRebuild && h.lastRebuild.ok === false;
    if (failed) {
      _ssOverlayOff();
      toast('The update didn’t build, so the previous version is running again.', { kind: 'err', action: { label: 'Open log', run: () => srvOpenLog() }, timeout: 12000 });
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
    title: 'Stop OpenDash?',
    text: 'Changes wait in this browser until it starts again (your OpenDash shortcut' + (srvStartScheme() ? ', or Start on the banner).' : ').'),
    confirmLabel: 'Stop OpenDash', danger: true,
  });
  if (!ok) return;
  try { await _ssFlush(); await _ssPost('/api/server/stop', {}); }
  catch (e) { toastError('stop OpenDash', e, () => srvStop()); return; }
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
    title: 'Server log (last 200 lines)', size: 'xl', fixed: true,
    body: (el) => {
      info = document.createElement('div'); info.className = 'set-h srv-log-file';
      pre = document.createElement('pre'); pre.className = 'srv-log'; pre.tabIndex = 0;
      pre.setAttribute('aria-label', 'Server log');
      el.append(info, pre);
      load();
    },
    actions: [
      { label: 'Copy', icon: 'copy', run: () => { copyText(pre ? pre.textContent : '', 'log'); return false; } },
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
    if (now !== on) toast('Windows didn’t keep the change. Check the log.', { kind: 'err', action: { label: 'Open log', run: () => srvOpenLog() } });
    else toast(feature === 'autostart' ? (on ? 'OpenDash will start when you log in' : 'It will no longer start when you log in') : (on ? 'Start button turned on' : 'Start button turned off'), { kind: 'ok' });
  } catch (e) {
    toastError('change that', e, () => _ssToggle(feature, on));
    _ssInteg = null;
  } finally { _ssIntegBusy = ''; _ssRefresh(); }
}

function _ssStatusCard(el) {
  const s = _ssStatus;
  const card = _settingsCard('OpenDash on this computer');
  const dis = !s || !!s.error || s.canRestart === false;
  const failedBuild = s && !s.error && s.lastRebuild && s.lastRebuild.ok === false;
  if (!s) card.body.appendChild(setStatusLine('idle', 'Checking', ''));
  else if (s.error) card.body.appendChild(setStatusLine('warn', 'Not answering', s.error));
  else if (failedBuild) card.body.appendChild(setStatusLine('warn', 'Needs you', "The last update didn't build"));
  else card.body.appendChild(setStatusLine('ok', 'Running', `since ${_ssWhen(s.startedAt)} · ` + (s.supervised ? 'restarts by itself if it stops' : "won't restart by itself (started by hand)")));
  if (!s) for (let i = 0; i < 2; i++) { const sk = document.createElement('div'); sk.className = 'skeleton skeleton-row'; card.body.appendChild(sk); }
  else if (!s.error) card.body.appendChild(_settingsRow('Version', '', Object.assign(document.createElement('span'), { textContent: s.version || '?' })));
  const rs = setAction(card, 'Restart', () => srvRestart({ rebuild: false }), { icon: 'refresh-cw', kind: 'secondary', disabled: dis, tip: 'Open tabs reconnect by themselves.' });
  if (failedBuild) setAction(card, 'Open log', () => srvOpenLog(), { icon: 'file-text', kind: 'primary' });
  setFold(card, 'server-card-more', 'More', ({ body }) => {
    if (s && !s.error) {
      const dl = document.createElement('dl'); dl.className = 'kv set-kv srv-kv';
      const stop = s.lastStopReason;
      const rows = [
        ['Running since', `${_ssWhen(s.startedAt)} (${_ssDuration(s.uptime)})`],
        ['Process id', String(s.pid)],
        ['Port', String(s.port)],
        ['Build', s.build ? String(s.build) : ''],
        ['Data folder', s.dataDir || ''],
        ['Restarts', s.restartCount ? String(s.restartCount) + ' since it was started' : 'none since it was started'],
        ['Last stop', stop ? `${stop.reason}${stop.at ? ' (' + _ssWhen(stop.at) + ')' : ''}` : 'nothing logged before this start'],
      ].filter(r => r[1]);
      if (s.lastRebuild) rows.push(['Last update', s.lastRebuild.ok ? `done ${_ssWhen(s.lastRebuild.at)}` : `failed at the ${s.lastRebuild.step} step: ${s.lastRebuild.message || ''}`]);
      dl.innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
      body.appendChild(_settingsRow('Details', '', dl));
    }
    const g = document.createElement('div'); g.className = 'btn-group set-btns';
    const st = _ssBtn('Stop…', 'circle-x', 'btn-ghost', () => srvStop());
    st.disabled = dis;
    g.append(_ssBtn('Open log', 'file-text', 'btn-ghost', () => srvOpenLog()), st);
    body.appendChild(g);
  });
  setFold(card, 'server-card-adv', 'Advanced', ({ body }) => {
    const rb = _ssBtn('Rebuild & restart', 'hammer', 'btn-secondary', () => srvRestart({ rebuild: true }));
    rb.disabled = dis;
    rb.setAttribute('data-tip', 'Use after updating the app by hand.');
    body.appendChild(_settingsRow('Rebuild & restart', 'Use after updating the app by hand.', rb));
  }, { advanced: true });
  el.appendChild(card.card);
}

function _ssStartCard(el) {
  const ig = _ssInteg;
  const card = _settingsCard('Starting OpenDash');
  if (!ig) { const sk = document.createElement('div'); sk.className = 'skeleton skeleton-row'; card.body.appendChild(sk); el.appendChild(card.card); return; }
  if (ig.error) {
    const p = document.createElement('p'); p.className = 'set-h'; p.textContent = 'Couldn’t check: ' + ig.error;
    card.body.appendChild(p); el.appendChild(card.card); return;
  }
  if (!ig.supported) {
    const c = document.createElement('div'); c.className = 'callout set-callout';
    c.innerHTML = icon('info') + '<span>Starting automatically and the Start button are Windows features. On this computer, do it by hand:</span>';
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
      ? 'Starts OpenDash, with no window, when you sign in to Windows.'
      : 'Lets the banner start OpenDash for you.';
    if (_ssIntegBusy === f) return 'Asking Windows…';
    if (x.enabled && !x.current) return base + (!/start-hidden\.mjs/i.test(x.command || '') ? ' Now: on, but with an old launcher that no longer works. Turn it off and on again to fix it.' : ' Now: on, but set up for another copy or folder of the app. Turn it off and on again to point it here.');
    if (f === 'autostart' && x.enabled && x.approved === false) return base + ' Now: on, but switched off in Task Manager › Startup apps. Turn it off and on again here to re-enable it.';
    return base + (x.enabled ? ' Now: on.' : ' Now: off.');
  };
  const sw1 = _settingsSwitch(!!(ig.autostart && ig.autostart.enabled), 'Start automatically when I log in', (on) => _ssToggle('autostart', on), !!_ssIntegBusy);
  card.body.appendChild(_settingsRow('Start automatically when I log in', hintFor('autostart'), sw1));
  const sw2 = _settingsSwitch(!!(ig.protocol && ig.protocol.enabled), 'Start button on the “not running” banner', (on) => _ssToggle('protocol', on), !!_ssIntegBusy);
  card.body.appendChild(_settingsRow('Start button on the “not running” banner', hintFor('protocol'), sw2));
  if (ig.hiddenHost === false) {
    const p = document.createElement('p'); p.className = 'set-h';
    p.textContent = 'A window may flash up briefly when it starts.';
    setFold(card, 'server-start-more', 'More', ({ body }) => body.appendChild(p));
  }
  const re = _ssBtn('Check again', 'refresh-cw', 'btn-ghost', () => { _ssInteg = null; _ssLoad(); _ssRefresh(); });
  card.body.appendChild(re);
  el.appendChild(card.card);
}

function _ssOfflineCard(el) {
  const card = _settingsCard('Offline page');
  const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && window.isSecureContext;
  const on = srvSwEnabled();
  const hint = !supported ? 'This browser does not support it here.' : (on ? (srvSwActive() ? 'On, and ready.' : 'On. Ready after the next page load.') : 'Off in this browser.');
  card.body.appendChild(_settingsRow('Show an offline page', 'When OpenDash isn’t running, this browser shows a page with a Start button instead of an error. ' + hint, _settingsSwitch(on && supported, 'Show an offline page', async (v) => {
    await srvSetSwEnabled(v); toast(v ? 'Offline page on' : 'Offline page off', { kind: 'ok' }); _ssRefresh();
  }, !supported)));
  el.appendChild(card.card);
}

registerSettingsGroup({
  id: 'server', title: 'Server', icon: 'hard-drive', order: 92,
  description: 'Restart OpenDash and choose how it starts.',
  search: [
    { label: 'OpenDash on this computer', target: 'OpenDash on this computer', description: 'Status, version, restart, open the log or stop it.', keywords: 'this server restart rebuild stop log port process uptime backend' },
    { label: 'Start automatically when I log in', target: 'Start automatically when I log in', description: 'Start OpenDash when you sign in to Windows.', keywords: 'autostart startup login windows' },
    { label: 'Start button on the “not running” banner', target: 'Start button on the “not running” banner', description: 'Let the banner start OpenDash for you.', keywords: 'enable start server button protocol offline banner' },
    { label: 'Offline page', target: 'Show an offline page', description: 'Show a page with a Start button when OpenDash isn’t running.', keywords: 'show an offline page service worker cache nosw developers' },
    { label: 'Rebuild & restart', target: 'Rebuild & restart', description: 'Use after updating the app by hand.', keywords: 'rebuild build migrate update restart server' },
  ],
  render(el) {
    _ssLoad();
    _ssStatusCard(el);
    _ssStartCard(el);
    _ssOfflineCard(el);
  },
});

registerCommand({ id: 'server-restart', label: 'Restart OpenDash', icon: 'refresh-cw', keywords: 'server restart reboot reload reconnect backend', run: () => srvRestart({ rebuild: false }) });
registerCommand({ id: 'server-rebuild', label: 'Rebuild & restart OpenDash', icon: 'hammer', keywords: 'server rebuild build update restart migrate', run: () => srvRestart({ rebuild: true }) });
registerCommand({ id: 'server-log', label: 'Open the OpenDash log', icon: 'file-text', keywords: 'server log errors debug', run: () => srvOpenLog() });
registerCommand({ id: 'open-server-settings', label: 'Server', icon: 'hard-drive', group: 'Go to', keywords: 'server restart start log login startup', run: () => setView('settings:server') });
