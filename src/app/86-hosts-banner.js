/* ============================================================
   TWO COMPUTERS: banners for a data folder shared through OneDrive
   ============================================================
   Server side: lib/hosts.mjs, server/routes/hosts.mjs (GET /api/hosts).
   - Paused: another computer had OpenDash open when this server started, so
     saves answer 423 and edits stay in this browser. "OpenDash is open on X
     (seen 1 min ago). Changes here are paused so the two computers don't
     overwrite each other." [Use here anyway] (POST /api/hosts/override) sends
     what is waiting. Also shown at once when a save gets a 423 (hostsOnPaused).
   - Also open: a computer that appears later. A warning only (writes are never
     paused mid-edit); dismissible for this tab.
   - OneDrive: "Your data is in OneDrive: use OpenDash on one computer at a
     time." Dismissed for good in this browser. In a WORK OR SCHOOL OneDrive
     (oneDriveWork, lib/onedrive.mjs) a warning instead: personal data in an
     employer's cloud, with the way out (Settings > Data > Move); dismissible
     for this tab only.
   - OneDrive kept a second copy from <DEVICE> (<date>) [Keep as a backup]:
     moves it into state/backups/ (Settings > Data can open a state copy).
     Nothing is ever merged automatically.
   Checks at load, every minute and when the tab comes back. hostsBannerModel()
   is pure (tests/hosts-banner.test.mjs runs it in a VM). Text goes in with
   textContent only.
   ============================================================ */
// The OneDrive notice, once dismissed: state.seen.once.onedriveBannerOff (synced, 06-core-seen.js).
const _HB_POLL_MS = 60000;
const _hb = { status: null, els: new Map(), timer: null, dismissed: new Set(), busy: false };

const _HB_KIND_TEXT = {
  state: 'your tasks and notes', journal: 'the change history', config: 'your settings',
  sources: 'your list of connected sources', connections: 'the connection status',
};

/** "23 Oct" in the page clock's zone (Clock, 07-core-clock.js: where a traveller is), or '' when the date is unreadable. */
function _hbDate(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  if (typeof Clock !== 'undefined' && Clock && typeof Clock.fmtDate === 'function') return Clock.fmtDate(t, { day: 'numeric', month: 'short' });
  try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch (e) { return ''; }
}

/**
 * The banners to show for a GET /api/hosts answer:
 * [{key, kind: 'paused'|'also-open'|'onedrive'|'onedrive-work'|'conflict', tone, title, sub, actions:[{id, label, primary}], dismissible}]
 * opts: {dismissed: Set of keys, oneDriveOff: bool}
 */
function hostsBannerModel(st, opts) {
  const o = opts || {};
  const dismissed = o.dismissed || new Set();
  const out = [];
  if (!st || typeof st !== 'object') return out;
  if (st.paused && st.by) {
    out.push({
      key: 'paused', kind: 'paused', tone: 'warning',
      title: `Freeflo is open on ${st.by.hostname}, so changes here are paused.`,
      sub: '',
      actions: [{ id: 'override', label: 'Use it here', primary: true }], dismissible: false,
    });
  } else {
    for (const h of (Array.isArray(st.others) ? st.others : []).slice(0, 2)) {
      const key = 'also:' + h.hostId;
      if (dismissed.has(key)) continue;
      out.push({
        key, kind: 'also-open', tone: 'warning',
        title: `Freeflo is also open on ${h.hostname}. Use one at a time.`,
        sub: '',
        actions: [], dismissible: true,
      });
    }
  }
  for (const c of (Array.isArray(st.conflicts) ? st.conflicts : []).slice(0, 3)) {
    const key = 'copy:' + c.rel;
    if (dismissed.has(key)) continue;
    const when = _hbDate(c.at);
    out.push({
      key, kind: 'conflict', tone: 'warning', rel: c.rel,
      title: `OneDrive kept a second copy from ${c.device}${when ? ` (${when})` : ''}.`,
      sub: `A copy of ${_HB_KIND_TEXT[c.kind] || 'a data file'} that was saved on two computers. Nothing was merged.`,
      actions: [{ id: 'keep', label: 'Keep as a backup', primary: false }], dismissible: true,
    });
  }
  if (st.oneDriveWork && !dismissed.has('onedrive-work')) {
    const org = st.oneDriveWork.org ? String(st.oneDriveWork.org).slice(0, 60) : '';
    out.push({
      key: 'onedrive-work', kind: 'onedrive-work', tone: 'warning',
      title: `Your data is in your work OneDrive${org ? ` (${org})` : ''}, which your employer can see.`,
      sub: '',
      actions: [{ id: 'move', label: 'Move it', primary: true }], dismissible: true,
    });
  } else if (st.oneDrive && !o.oneDriveOff && !dismissed.has('onedrive')) {
    out.push({
      key: 'onedrive', kind: 'onedrive', tone: 'info',
      title: 'Your data is in OneDrive: use Freeflo on one computer at a time.',
      sub: '', actions: [{ id: 'move', label: 'Move it', primary: false }], dismissible: true,
    });
  }
  return out;
}

function _hbOneDriveOff() { try { return seenOnce('onedriveBannerOff'); } catch (e) { return false; } }   // dismissed on any computer (06-core-seen.js)

async function hostsRefresh() {
  if (typeof fetch !== 'function' || typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return null;
  try {
    const r = await fetch('/api/hosts', { cache: 'no-store' });
    if (!r.ok) return null;
    const st = await r.json();
    const wasPaused = !!(_hb.status && _hb.status.paused);
    _hb.status = st;
    _hbRender();
    // The other computer went away (or the user resumed elsewhere): send what waited here.
    if (wasPaused && !st.paused) _hbResumed();
    return st;
  } catch (e) { return null; }
}

/** A save answered 423 (04-core-persistence.js): show the paused banner at once. */
function hostsOnPaused(body) {
  const b = body || {};
  const prev = _hb.status || {};
  _hb.status = Object.assign({}, prev, { paused: true, by: { hostname: b.host || (prev.by && prev.by.hostname) || 'another computer', seen: (prev.by && prev.by.seen) || 'just now' } });
  _hbRender();
  hostsRefresh();
}

function _hbResumed() {
  if (typeof state !== 'undefined' && state && (state._localDirty || (typeof _persistTimer !== 'undefined' && _persistTimer))) {
    if (typeof _persistFire === 'function') _persistFire();
  }
}

async function _hbAction(item, act, btn) {
  if (_hb.busy) return;
  _hb.busy = true;
  if (btn) btn.disabled = true;
  try {
    if (act.id === 'move') {
      if (typeof setView === 'function') setView('settings:data');
    } else if (act.id === 'override') {
      const r = await fetch('/api/hosts/override', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!r.ok) throw new Error('Freeflo didn’t accept it');
      _hb.status = await r.json();
      _hbRender();
      _hbResumed();
      if (typeof toast === 'function') toast('Changes are saved on this computer again', { kind: 'ok' });
    } else if (act.id === 'keep') {
      const r = await fetch('/api/hosts/conflicts/keep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rel: item.rel }) });
      let j = null; try { j = await r.json(); } catch (e) { j = null; }
      if (!r.ok) throw new Error((j && (typeof j.error === 'string' ? j.error : j.error && j.error.message)) || 'it could not be kept');
      if (_hb.status) _hb.status.conflicts = j.conflicts || [];
      _hbRender();
      if (typeof toast === 'function') toast(item.rel.indexOf('dashboard-state') >= 0 ? 'Kept as a backup (Settings > Data)' : 'Kept as a backup (Settings > Data)', { kind: 'ok' });
    }
  } catch (e) {
    const msg = typeof netErrorMessage === 'function' ? netErrorMessage(e) : String((e && e.message) || e);
    if (typeof toast === 'function') toast(msg, { kind: 'err' }); else console.warn('[hosts]', msg);
  } finally {
    _hb.busy = false;
    if (btn && document.body.contains(btn)) btn.disabled = false;
  }
}

function _hbDismiss(item) {
  if (item.kind === 'onedrive') { try { seenMarkOnce('onedriveBannerOff'); } catch (e) { /* this tab only */ } }
  _hb.dismissed.add(item.key);
  _hbRender();
}

function _hbEl(item) {
  const el = document.createElement('div');
  el.className = 'hb-banner on is-' + item.tone;
  el.setAttribute('role', item.kind === 'paused' ? 'alert' : 'status');
  el.dataset.key = item.key;
  const ic = document.createElement('span'); ic.className = 'hb-ic';
  if (typeof icon === 'function') ic.innerHTML = icon(/^onedrive/.test(item.kind) ? 'cloud' : item.kind === 'conflict' ? 'copy' : 'laptop');
  const msg = document.createElement('div'); msg.className = 'hb-msg';
  const t = document.createElement('div'); t.className = 'hb-title'; t.textContent = item.title;
  msg.appendChild(t);
  if (item.sub) { const s = document.createElement('div'); s.className = 'hb-sub'; s.textContent = item.sub; msg.appendChild(s); }
  const acts = document.createElement('div'); acts.className = 'hb-acts';
  for (const a of item.actions) {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'btn btn-sm ' + (a.primary ? 'btn-primary' : 'btn-secondary');
    b.textContent = a.label;
    b.addEventListener('click', () => _hbAction(item, a, b));
    acts.appendChild(b);
  }
  if (item.dismissible) {
    const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm hb-x'; x.setAttribute('aria-label', 'Dismiss');
    if (typeof icon === 'function') x.innerHTML = icon('x'); else x.textContent = '×';
    x.addEventListener('click', () => _hbDismiss(item));
    acts.appendChild(x);
  }
  el.append(ic, msg, acts);
  return el;
}

function _hbRender() {
  if (typeof document === 'undefined' || !document.body) return;
  const items = hostsBannerModel(_hb.status, { dismissed: _hb.dismissed, oneDriveOff: _hbOneDriveOff() });
  const want = new Map(items.map(i => [i.key + '|' + i.title + '|' + (i.sub || ''), i]));
  // Re-selecting is a no-op: a banner whose text did not change stays as it is (no replayed animation).
  for (const [k, el] of _hb.els) if (!want.has(k)) { el.remove(); _hb.els.delete(k); }
  const content = document.getElementById('content');
  for (const [k, item] of want) {
    if (_hb.els.has(k)) continue;
    const el = _hbEl(item);
    if (content && content.parentNode) content.parentNode.insertBefore(el, content);
    else { el.classList.add('is-floating'); document.body.appendChild(el); }
    _hb.els.set(k, el);
  }
  document.body.classList.toggle('hosts-paused', !!(_hb.status && _hb.status.paused));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => {
    if (!/^https?:$/.test(location.protocol)) return;
    setTimeout(hostsRefresh, 700);
    _hb.timer = setInterval(() => { if (!document.hidden) hostsRefresh(); }, _HB_POLL_MS);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && _hb.status) hostsRefresh(); });
}
