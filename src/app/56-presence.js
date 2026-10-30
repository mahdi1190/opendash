/* ============================================================
   PRESENCE: IS MY OTHER COMPUTER THERE? (window.Presence). Owner: Sync.
   The server knows, for each of your other devices, one state
   (lib/sync/presence.mjs): open (its dashboard is open), running (on, no
   page), asleep, off, or outdated (an older OpenDash). GET /api/sync/presence
   answers {enabled, me, devices, summary, notices}; the live event 'presence'
   (86-live-sync.js) brings a change at once, and the page asks again every
   PR_POLL_MS while it is visible (that also tells the server a page is open
   here, which the other devices see).

   CALM, NOT ERRORS. Anything that needs another device asks the server, and
   the server checks presence first: while the other one is asleep or off it
   starts nothing that can only time out and answers with a calm line instead
   (`calm: true`: "Mac is off. Your changes reach it when it's back."). Those
   lines pass through here:
     presenceCalm(text)        remember a calm line (remoteFetch / remoteWait do it)
     presenceCalmMatch(msg)    toast() asks: is this "error" only a device being away?
     presenceNote(text)        show a calm line once (an info toast, never red),
                               the same line again within PR_CALM_REPEAT_MS only
                               pulses the top bar's sync dot: never a stream of popups
     presenceFor(nameOrId)     a device's row, or null
   ============================================================ */
const PR_POLL_MS = 30000;
const PR_CALM_KEEP_MS = 2 * 60 * 1000;
const PR_CALM_REPEAT_MS = 5 * 60 * 1000;
const _pr = { view: null, at: 0, loading: null, timer: 0, calm: new Map(), shown: new Map(), busyAt: 0, lastShown: null };

/** Ask the server (at most once in flight); repaints what shows presence. */
function presenceLoad(force) {
  if (_pr.loading) return _pr.loading;
  if (!force && _pr.view && Date.now() - _pr.at < 5000) return Promise.resolve(_pr.view);
  if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) return Promise.resolve(_pr.view);
  _pr.loading = fetch('/api/sync/presence', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then((v) => { if (v && typeof v === 'object') { _pr.view = v; _pr.at = Date.now(); } return _pr.view; })
    .catch(() => _pr.view)
    .finally(() => { _pr.loading = null; presenceRender(); });
  return _pr.loading;
}
/** The live event 'presence': a device's state changed. */
function presenceOnEvent(v) {
  if (!v || typeof v !== 'object') return;
  _pr.view = v; _pr.at = Date.now();
  presenceRender();
}
/** A device's row by name or id, or null. */
function presenceFor(key) {
  const v = _pr.view;
  if (!v || !Array.isArray(v.devices) || !key) return null;
  const k = String(key).toLowerCase();
  return v.devices.find(d => d.id === key || String(d.name || '').toLowerCase() === k) || null;
}

/* ---------- calm lines ---------- */
function _prNorm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
/** Remember a calm line from the server (a device is away), so a toast of it is shown calmly. */
function presenceCalm(text) {
  const t = _prNorm(text);
  if (!t) return;
  _pr.calm.set(t, Date.now());
  if (_pr.calm.size > 30) _pr.calm.delete(_pr.calm.keys().next().value);
  presenceLoad(true);
}
/** The calm line `msg` carries (it may be wrapped: "Couldn't sync: Mac is off..."), or null. */
function presenceCalmMatch(msg) {
  const m = _prNorm(msg);
  if (!m) return null;
  const now = Date.now();
  for (const [t, at] of _pr.calm) {
    if (now - at > PR_CALM_KEEP_MS) { _pr.calm.delete(t); continue; }
    if (m.includes(t)) return t;
  }
  // A line made elsewhere that names one of your devices as asleep or off.
  const v = _pr.view;
  if (v && Array.isArray(v.devices)) {
    for (const d of v.devices) {
      if (!d || !d.name || d.reachable) continue;
      if (m.includes(`${d.name} is asleep`) || m.includes(`${d.name} is off`) || m.includes(`${d.name} is not answering yet`)) return m;
    }
  }
  return null;
}
/** May this calm line show now? Once per PR_CALM_REPEAT_MS; a repeat pulses the sync dot instead. */
function presenceCalmShowOk(text) {
  const t = _prNorm(text), now = Date.now();
  const at = _pr.shown.get(t);
  if (at && now - at < PR_CALM_REPEAT_MS) { _prPulse(); return false; }
  _pr.shown.set(t, now);
  if (_pr.shown.size > 30) _pr.shown.delete(_pr.shown.keys().next().value);
  return true;
}
/** Show a calm line once (an info toast with a moon, never red); a repeat only pulses the sync dot. */
function presenceNote(text, opts) {
  const t = _prNorm(text);
  if (!t) return;
  presenceCalm(t);
  if (!presenceCalmShowOk(t)) return;
  if (typeof toast === 'function') toast(t, Object.assign({ icon: 'moon', timeout: 6000, calm: true }, opts || {}));
}
function _prPulse() {
  const b = document.getElementById('presence-btn');
  if (!b || b.hidden) return;
  b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
}

/* ---------- the top bar's sync dot (#presence-btn) and its panel ----------
   Hidden while sync is off. Its tones (lib/sync/presence.mjs summarize):
     ok         green  "Up to date"
     off        grey   "Mac asleep"                   (nothing is wrong: it catches up when it wakes)
     attention  amber  "Needs you"                    something only you can fix, or a version notice
                                                      not dismissed yet; the click opens the details
     busy       spins  "Syncing…"                     changes on their way over a direct link
   A click opens the panel: every device with its state, last seen, version and
   the way it is reached (live on the same network / over the internet, or the
   sync folder). */
const _PR_ICON = { open: 'laptop', running: 'laptop', outdated: 'laptop', asleep: 'moon', off: 'cloud-off' };
const _PR_CHIP = { open: 'Up to date', running: 'Up to date', outdated: 'Needs an update', asleep: 'Asleep', off: 'Off' };
/** Version notices not dismissed yet (56-presence-notice.js), or []. */
function _prNotices(v) { return typeof presenceFreshNotices === 'function' ? presenceFreshNotices(v) : []; }
function _prSummary(v) {
  const s = Object.assign({ tone: 'none', text: '', tip: '' }, v && v.summary);
  const fresh = _prNotices(v);
  if (fresh.length && s.tone !== 'attention') return { tone: 'attention', text: 'Needs you', tip: fresh[0].text };
  return s;
}
function presenceRender() {
  const b = document.getElementById('presence-btn');
  if (!b) return;
  const v = _pr.view;
  let s = v && v.enabled ? _prSummary(v) : null;
  if (!s || s.tone === 'none') { b.hidden = true; if (b._popClose) b._popClose(); return; }
  // "Sending…" only once it lasts a moment: a change that arrives within a second never flickers the dot.
  if (s.tone === 'busy') {
    if (!_pr.busyAt) { _pr.busyAt = Date.now(); setTimeout(presenceRender, 900); }
    if (Date.now() - _pr.busyAt < 800) s = _pr.lastShown || { tone: 'ok', text: 'Up to date', tip: '' };
  } else _pr.busyAt = 0;
  _pr.lastShown = s.tone === 'busy' ? _pr.lastShown : s;
  b.hidden = false;
  for (const k of ['ok', 'off', 'attention', 'busy']) b.classList.toggle('pr-' + k, s.tone === k);
  const lbl = b.querySelector('.sync-lbl');
  if (lbl && lbl.textContent !== s.text) lbl.textContent = s.text;
  b.setAttribute('aria-label', 'Your computers: ' + s.text + (s.tip ? '. ' + s.tip : ''));
  b.setAttribute('data-tip', s.tip || s.text);
  if (!b._prWired) { b._prWired = true; b.onclick = () => presenceOpenPanel(b); }
  if (b._prPaint) b._prPaint();
  if (typeof presenceShowNotices === 'function') presenceShowNotices(v);
}
function _prAgo(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  const d = Math.round(h / 24);
  return d <= 1 ? 'yesterday' : d + ' days ago';
}
/** The way a computer is reached now, in the Sync page's words: direct, via your relay, via OneDrive. */
function _prWay(d) {
  if (d.path === 'live' || d.path === 'direct') return 'direct';
  if (d.path === 'relay') return 'via your relay';
  if (d.path === 'folder') {
    const st = typeof _syncSt !== 'undefined' ? _syncSt : null;
    const cloud = st && typeof syncCloudName === 'function' ? syncCloudName(st) : null;
    return 'via ' + (cloud || 'your cloud folder');
  }
  return '';
}
function _prDeviceHtml(d) {
  const st = d.checking ? 'checking' : d.state;
  const chip = d.checking ? 'Checking…' : d.reachable && d.state !== 'outdated' && d.behind > 0 ? 'Catching up' + (d.pct != null ? ' ' + d.pct + '%' : '') : (_PR_CHIP[d.state] || d.state);
  const bits = [];
  if (d.version) bits.push('Freeflo ' + d.version);
  const way = _prWay(d);
  if (way) bits.push(way);
  if (!d.reachable && Number.isFinite(d.ago)) bits.push('seen ' + _prAgo(d.ago + Math.max(0, Date.now() - _pr.at)));
  if (d.behind && d.pct == null) bits.push(d.behind + ' change' + (d.behind === 1 ? '' : 's') + ' to go');
  return `<div class="pr-dev pr-${esc(st)}" role="listitem">
    <span class="pr-dev-ic">${icon(d.checking ? 'loader-circle' : (_PR_ICON[d.state] || 'laptop'))}</span>
    <span class="pr-dev-main"><span class="pr-dev-name">${esc(d.name)}</span><span class="pr-dev-text">${esc(d.text || '')}</span>${bits.length ? `<span class="pr-dev-meta">${esc(bits.join(' · '))}</span>` : ''}</span>
    <span class="pr-chip">${esc(chip)}</span>
  </div>`;
}
/** The panel under the sync dot. */
function presenceOpenPanel(anchor) {
  if (typeof openPopover !== 'function') return;
  presenceLoad(true);
  openPopover(anchor, (el, close) => {
    const paint = () => {
      const v = _pr.view || {};
      const s = _prSummary(v);
      const devs = Array.isArray(v.devices) ? v.devices : [];
      const notes = _prNotices(v);
      const me = v.me || null;
      el.innerHTML = `
        <div class="pr-head pr-${esc(s.tone)}"><span class="dot"></span><span><b>${esc(s.text || 'Sync')}</b>${s.tip ? `<span class="pr-tip">${esc(s.tip)}</span>` : ''}</span></div>
        ${notes.map(n => `<div class="pr-note" data-id="${escAttr(n.id)}">${icon('info')}<span>${esc(n.text)}</span><button type="button" class="btn btn-ghost btn-sm" data-act="dismiss">Dismiss</button></div>`).join('')}
        <div class="pr-list" role="list" aria-label="Your computers">${devs.length ? devs.map(_prDeviceHtml).join('') : '<div class="pr-empty mute">No other computer yet.</div>'}</div>
        ${me ? `<div class="pr-me mute">${icon('monitor')}<span>This computer: ${esc(me.name || 'This computer')}${me.version ? ' · Freeflo ' + esc(me.version) : ''}</span></div>` : ''}
        ${typeof syncPanelExtrasHtml === 'function' ? syncPanelExtrasHtml(s.tone === 'attention') : ''}
        <div class="pr-foot"><button type="button" class="btn btn-secondary btn-sm" data-act="settings">Sync settings</button></div>`;
      el.querySelector('[data-act="settings"]').onclick = () => { close(); if (typeof setView === 'function') setView('settings:sync'); };
      // What changed, and Check-up ("Needs you" opens it): 58-settings-sync-health.js
      if (typeof syncPanelExtrasWire === 'function') syncPanelExtrasWire(el, close);
      el.querySelectorAll('.pr-note [data-act="dismiss"]').forEach(btn => { btn.onclick = () => { if (typeof presenceDismissNotice === 'function') presenceDismissNotice(btn.closest('.pr-note').getAttribute('data-id')); paint(); presenceRender(); }; });
    };
    anchor._prPaint = paint;
    paint();
    if (typeof syncChangesLoad === 'function') syncChangesLoad().then(() => { if (anchor._prPaint) anchor._prPaint(); }).catch(() => {});
  }, { className: 'pr-pop', width: 340, align: 'end', onClose: () => { anchor._prPaint = null; } });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Poll while the page is visible; a hidden tab still counts as open through its event stream.
  const tick = () => { if (!document.hidden) presenceLoad(false); };
  setTimeout(tick, 1500);
  _pr.timer = setInterval(tick, PR_POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) presenceLoad(true); });
}

window.Presence = { load: presenceLoad, view: () => _pr.view, of: presenceFor, calm: presenceCalm, note: presenceNote, match: presenceCalmMatch, onEvent: presenceOnEvent };
