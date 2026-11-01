/* ============================================================
   SETTINGS > SYNC > CHECK-UP (the old Health), WHAT CHANGED, REVIEW (owner: Sync)
   Tabs at the top of Settings > Sync (syncTabsBar): Sync | What changed |
   Check-up | Review. Server: GET /api/sync/health (lib/sync/health.mjs: the
   checklist, each problem with ONE fix), POST /api/sync/fix (the fix buttons,
   lib/sync/node-health.mjs), GET /api/sync/changes ("What changed",
   lib/sync/changes.mjs), GET /api/sync/conflicts + POST /api/sync/conflicts/resolve
   (the Review list: keep mine / keep theirs).
   The top bar's sync dot (56-presence.js) opens Health from "Needs attention"
   (syncOpenHealth) and shows the newest changes (syncPanelExtrasHtml).
   Every wait has a way out (the user's rule, 23 Oct 2026): a request in
   flight shows Cancel (it stops waiting at once), and a failure shows the
   reason in one line with Try again. docs/dev/MULTI_DEVICE.md "When something
   goes wrong" lists every check.
   ============================================================ */
let _syncTab = 'setup';          // setup | health | changes | review
let _shHealth = null, _shHealthErr = '', _shHealthAt = 0;
let _shChanges = null, _shReview = null;
let _shBusy = null;              // {key, abort}: the one request in flight on these pages
let _shTicker = null;
let _syncFocusJoin = false;      // Health's "Type the 4-letter code": focus the code box on the Sync tab
let _shRestOpen = false;         // Check-up's "Everything else is fine" unfolded

/** "3 changes from MacBook Pro · 2 min ago" (the first part of a feed line). */
function syncFeedHead(e, nowMs) {
  const n = (e && e.count) || 0;
  const from = (e && e.from && e.from.length) ? e.from.join(', ') : 'your other computer';
  return n + ' change' + (n === 1 ? '' : 's') + ' from ' + from + ' · ' + syncAgo(e.until || e.at, nowMs);
}
/** A whole line: "3 changes from Mac · 2 min ago: renamed a task, changed a budget and hid a calendar". */
function syncFeedLine(e, nowMs) { return syncFeedHead(e, nowMs) + (e && e.text ? ': ' + e.text : ''); }

/** fetch with a way out: {signal} from an AbortController the page keeps (Cancel), and a fallback timeout. */
async function _shFetch(url, body, key, timeoutMs) {
  if (_shBusy && _shBusy.abort) _shBusy.abort.abort('replaced');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort('timeout'), timeoutMs || 60000);
  _shBusy = { key, abort: ac };
  try {
    const r = await fetch(url, body === undefined ? { cache: 'no-store', signal: ac.signal } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j && (j.error && (j.error.message || j.error))) || ('HTTP ' + r.status));
    return j;
  } catch (e) {
    if (ac.signal.aborted) {
      const why = ac.signal.reason;
      const err = new Error(why === 'timeout' ? 'No answer within a minute. It may still finish: this page shows it when it does.' : 'Stopped waiting. If it finishes anyway, this page shows it.');
      err.cancelled = why !== 'timeout';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
    if (_shBusy && _shBusy.abort === ac) _shBusy = null;
  }
}
function _shCancel() { if (_shBusy && _shBusy.abort) _shBusy.abort.abort('cancel'); _shBusy = null; _syncRefresh(); }
function _shErrText(e) { return (e && e.cancelled) || (e && /Stopped waiting|No answer within/.test(e.message)) ? e.message : netErrorMessage(e); }

let _shHealthTried = 0;
async function syncHealthLoad(fresh) {
  _shHealthTried = Date.now();
  try { _shHealth = await _shFetch('/api/sync/health' + (fresh ? '?fresh=1' : ''), undefined, 'health'); _shHealthErr = ''; _shHealthAt = Date.now(); }
  catch (e) { if (!(e && e.cancelled)) _shHealthErr = _shErrText(e); }
  _syncRefresh();
  if (typeof presenceRender === 'function') { try { presenceRender(); } catch (e) { /* the dot repaints on its own */ } }
  return _shHealth;
}
async function syncChangesLoad() {
  try { const j = await fetch('/api/sync/changes', { cache: 'no-store' }).then(r => r.json()); _shChanges = Array.isArray(j && j.entries) ? j.entries : []; }
  catch (e) { _shChanges = _shChanges || []; }
  return _shChanges;
}
async function syncReviewLoad() {
  try { _shReview = await fetch('/api/sync/conflicts', { cache: 'no-store' }).then(r => r.json()); }
  catch (e) { _shReview = _shReview || { items: [], open: 0, error: netErrorMessage(e) }; }
  _syncRefresh();
  return _shReview;
}

/** Open Settings > Sync > Check-up (the sync dot's "Needs you"). */
function syncOpenHealth() { _syncTab = 'health'; syncHealthLoad(false); if (state.view === 'settings:sync') renderMain(); else setView('settings:sync'); }
function syncOpenChanges() { _syncTab = 'changes'; syncChangesLoad().then(_syncRefresh); if (state.view === 'settings:sync') renderMain(); else setView('settings:sync'); }

/** The tab strip at the top of Settings > Sync (only while sync is on). */
function syncTabsBar(el, st) {
  if (!st || !st.enabled) { _syncTab = 'setup'; return; }
  const h = _shHealth;
  const att = h && h.attention ? ' (' + h.attention + ')' : '';
  const open = (st.health && st.health.conflictsOpen) || 0;
  // Sync · What changed · Check-up (n) · Review (n); the count is only what needs you (needsUser).
  const tabs = [['setup', 'Sync', 'refresh-cw'], ['changes', 'What changed', 'history'], ['health', 'Check-up' + att, h && h.overall === 'err' ? 'circle-alert' : 'stethoscope']];
  if (open) tabs.push(['review', 'Review (' + open + ')', 'git-merge']);
  else if (_syncTab === 'review') tabs.push(['review', 'Review', 'git-merge']);
  const seg = _settingsSeg(tabs, _syncTab, (k) => {
    if (k === _syncTab) return;                      // re-selecting is a no-op
    _syncTab = k;
    if (k === 'health') syncHealthLoad(false);
    if (k === 'changes') syncChangesLoad().then(_syncRefresh);
    if (k === 'review') syncReviewLoad();
    _syncRefresh();
  });
  seg.classList.add('sync-tabs');
  seg.setAttribute('aria-label', 'Sync pages');
  el.appendChild(seg);
}

/* ---------- Health ---------- */
const _SH_ICON = { err: 'circle-x', warn: 'triangle-alert', info: 'info', ok: 'circle-check' };
/** Run one fix (lib/sync/health.mjs fix shape). */
async function syncRunFix(fix) {
  if (!fix) return;
  if (fix.view) {
    if (fix.view === 'updates') { setView('settings:updates'); return; }
    _syncTab = fix.view === 'review' ? 'review' : 'setup';
    if (fix.view === 'sync' && typeof _syncFolds !== 'undefined') _syncFolds.advanced = true;
    if (fix.view === 'join') _syncFocusJoin = true;
    if (fix.view === 'review') syncReviewLoad();
    _syncRefresh();
    return;
  }
  if (fix.confirm) {
    const ok = await confirmDialog({ title: fix.label, text: fix.confirm, confirmLabel: fix.label, danger: fix.action === 'remove-device' || fix.action === 'fresh' || fix.action === 'sync-off' });
    if (!ok) return;
  }
  let url = '/api/sync/fix', body = { fix: fix.action }, done = null;
  if (fix.action === 'live-retry') { url = '/api/sync/live'; body = { retry: fix.id || 'all' }; done = 'Trying again now'; }
  else if (fix.action === 'live-hold') { url = '/api/sync/live'; body = { hold: fix.id }; done = 'Stopped trying: changes go through the sync folder'; }
  else if (fix.action === 'remove-device') { url = '/api/sync/devices/remove'; body = { id: fix.id }; done = 'Removed. Your other computers carry on as usual.'; }
  else if (fix.action === 'apply-on') { url = '/api/sync/settings'; body = { apply: true }; done = 'Changes from your other computers will be used'; }
  else if (fix.action === 'sync-off') { url = '/api/sync/settings'; body = { enabled: false }; done = 'Sync is off on this computer. Nothing was deleted.'; }
  else if (fix.action === 'relay-on') { url = '/api/sync/settings'; body = { relay: true }; done = 'This computer syncs through your connection to friends now'; }
  else if (fix.action === 'relay-check') { url = '/api/sync/relay/check'; body = {}; done = 'Looked for your connection to friends again'; }
  else if (fix.folder) body.folder = fix.folder;
  _shHealthErr = '';
  _syncRefresh();
  try {
    const j = await _shFetch(url, body, 'fix:' + fix.action, fix.action === 'compact' || fix.action === 'keep-offline' ? 120000 : 60000);
    if (j && j.health) { _shHealth = j.health; _shHealthAt = Date.now(); }
    if (j && j.enabled !== undefined) _syncSt = j; else syncLoad();
    toast((j && j.message) || done || 'Done', { kind: j && j.ok === false ? 'info' : 'ok' });
    if (!(j && j.health)) syncHealthLoad(false);
  } catch (e) { _shHealthErr = _shErrText(e); }
  _syncRefresh();
}
function _shFixButtons(c) {
  const row = _syncEl('div', 'sync-actions');
  const mk = (f, primary) => {
    const busy = _shBusy && _shBusy.key === 'fix:' + f.action;
    const b = _syncEl('button', 'btn ' + (primary ? 'btn-primary' : 'btn-secondary') + ' btn-sm', busy ? 'Working…' : f.label);
    b.type = 'button';
    b.disabled = !!(_shBusy && !busy);
    if (busy) b.disabled = true;
    b.onclick = () => syncRunFix(f);
    return b;
  };
  if (c.fix && (c.fix.action || c.fix.view)) row.appendChild(mk(c.fix, c.tone === 'err' || c.tone === 'warn'));
  if (c.alt && (c.alt.action || c.alt.view)) row.appendChild(mk(c.alt, false));
  if (_shBusy && String(_shBusy.key).startsWith('fix:') && ((c.fix && _shBusy.key === 'fix:' + c.fix.action) || (c.alt && _shBusy.key === 'fix:' + c.alt.action))) {
    const x = _syncEl('button', 'btn btn-ghost btn-sm', 'Cancel'); x.type = 'button'; x.onclick = _shCancel; row.appendChild(x);
  }
  return row.childNodes.length ? row : null;
}
function _shCheckEl(c) {
  const box = _syncEl('div', 'sh-check sh-' + c.tone);
  box.dataset.check = c.id;
  const ic = document.createElement('span'); ic.className = 'sh-ic'; ic.innerHTML = icon(_SH_ICON[c.tone] || 'info'); ic.setAttribute('aria-hidden', 'true');
  const main = _syncEl('div', 'sh-main');
  main.appendChild(_syncEl('div', 'sh-title', c.title));
  if (c.text) main.appendChild(_syncEl('div', 'set-h', c.text));
  if (c.progress && c.progress.total > 0) {
    const bar = _syncEl('div', 'sh-bar'); bar.setAttribute('role', 'progressbar');
    const pct = Math.max(0, Math.min(100, Math.round((c.progress.done / c.progress.total) * 100)));
    bar.setAttribute('aria-valuenow', String(pct)); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
    const fill = _syncEl('span'); fill.style.width = pct + '%'; bar.appendChild(fill);
    main.appendChild(bar);
  }
  const steps = (c.fix && c.fix.steps) || null;
  if (steps && steps.length && c.tone !== 'ok') {
    const ol = _syncEl('ol', 'sh-steps');
    for (const s of steps) ol.appendChild(_syncEl('li', null, s));
    main.appendChild(ol);
  }
  const btns = _shFixButtons(c);
  if (btns) main.appendChild(btns);
  box.append(ic, main);
  return box;
}
function syncHealthPage(el) {
  const card = _settingsCard('Check-up', 'Problems that need you, each with one fix.');
  const h = _shHealth;
  const head = _syncEl('div', 'sh-head sh-' + (h ? h.overall : 'idle'));
  head.setAttribute('role', 'status');
  head.appendChild(_syncEl('span', 'dot'));
  head.appendChild(_syncEl('span', 'sh-head-t', h ? h.title : (_shHealthErr ? 'Could not check' : 'Checking…')));
  const again = _syncEl('button', 'btn btn-secondary btn-sm', _shBusy && _shBusy.key === 'health' ? 'Checking…' : 'Check again');
  again.type = 'button'; again.disabled = !!(_shBusy && _shBusy.key === 'health');
  again.onclick = () => syncHealthLoad(true);
  head.appendChild(again);
  if (_shBusy && _shBusy.key === 'health') { const x = _syncEl('button', 'btn btn-ghost btn-sm', 'Cancel'); x.type = 'button'; x.onclick = _shCancel; head.appendChild(x); }
  card.body.appendChild(head);
  if (_shHealthErr) {
    const e = _syncEl('div', 'sync-status sync-err sync-fail');
    e.appendChild(_syncEl('span', null, _shHealthErr));
    const t = _syncEl('button', 'btn btn-secondary btn-sm', 'Try again'); t.type = 'button'; t.onclick = () => { _shHealthErr = ''; syncHealthLoad(true); };
    e.appendChild(t);
    card.body.appendChild(e);
  }
  if (h && Array.isArray(h.checks)) {
    // 2.17.1: what needs you first (and anything still moving, with its bar); everything else folded.
    const first = h.checks.filter(c => c.tone === 'err' || c.tone === 'warn' || (c.progress && c.progress.total > 0));
    const rest = h.checks.filter(c => !first.includes(c));
    const listOf = (cs) => { const list = _syncEl('div', 'sh-list'); list.setAttribute('role', 'list'); for (const c of cs) { const x = _shCheckEl(c); x.setAttribute('role', 'listitem'); list.appendChild(x); } return list; };
    if (first.length) card.body.appendChild(listOf(first));
    if (rest.length) {
      const det = document.createElement('details'); det.className = 'sh-fold';
      det.open = !!_shRestOpen; det.ontoggle = () => { _shRestOpen = det.open; };
      det.appendChild(_syncEl('summary', null, 'Everything else is fine (' + rest.length + ')'));
      det.appendChild(listOf(rest));
      card.body.appendChild(det);
    }
    if (_shHealthAt) card.body.appendChild(_syncEl('div', 'set-h sh-at', 'Checked ' + syncAgo(_shHealthAt, Date.now()) + '.'));
  }
  el.appendChild(card.card);
  if (!h && !_shBusy && Date.now() - _shHealthTried > 10000) syncHealthLoad(false);
  _shKeepFresh(card.card, 'health');
}

/** While Health or What changed is on screen: refresh every few seconds (server-side checks are cached). */
function _shKeepFresh(node, tab) {
  clearInterval(_shTicker);
  _shTicker = setInterval(() => {
    if (!document.body.contains(node) || _syncTab !== tab) { clearInterval(_shTicker); _shTicker = null; return; }
    if (_shBusy) return;
    if (tab === 'health') syncHealthLoad(false);
    else if (tab === 'changes') syncChangesLoad().then(_syncRefresh);
  }, tab === 'health' ? 6000 : 8000);
}

/* ---------- What changed ---------- */
function _shFeedList(entries, max) {
  const list = _syncEl('div', 'sh-feed'); list.setAttribute('role', 'list');
  const now = Date.now();
  for (const e of (entries || []).slice(0, max || 100)) {
    const row = _syncEl('div', 'sh-feed-row'); row.setAttribute('role', 'listitem');
    const t = _syncEl('div', 'sh-feed-t');
    t.appendChild(_syncEl('span', 'sh-feed-head', syncFeedHead(e, now)));
    if (e.live) t.appendChild(_syncEl('span', 'sh-live', 'live'));
    row.appendChild(t);
    if (e.text) row.appendChild(_syncEl('div', 'sh-feed-what', e.text));
    const names = [];
    for (const g of e.groups || []) for (const n of g.names || []) if (names.length < 4 && !names.includes(n)) names.push(n);
    if (names.length) row.appendChild(_syncEl('div', 'set-h sh-feed-names', names.map(n => '"' + n + '"').join(', ')));
    list.appendChild(row);
  }
  return list;
}
function syncChangesPage(el) {
  const card = _settingsCard('What changed', 'What your other computers changed here, newest first.');
  if (_shChanges === null) { card.body.appendChild(_syncEl('div', 'set-h', 'Reading…')); syncChangesLoad().then(_syncRefresh); }
  else if (!_shChanges.length) card.body.appendChild(_syncEl('div', 'set-h', 'Nothing from your other computers yet. Their changes show here as they arrive.'));
  else card.body.appendChild(_shFeedList(_shChanges, 100));
  el.appendChild(card.card);
  _shKeepFresh(card.card, 'changes');
}
/** The newest few lines for the Sync tab (from the status: st.changes). */
function syncChangesRow(card, st) {
  const entries = (st && st.changes) || [];
  if (!entries.length) return;
  const box = _syncEl('div');
  box.appendChild(_shFeedList(entries, 3));
  const more = _syncEl('button', 'btn btn-ghost btn-sm', 'See all'); more.type = 'button'; more.onclick = () => syncOpenChanges();
  box.appendChild(more);
  card.body.appendChild(_settingsRow('What changed', 'The latest changes from your other computers.', box));
}

/* ---------- Review (clashes) ---------- */
/** The two buttons of a clash: [[keep, label, primary]]. */
function syncReviewChoices(c) {
  if (c.kind === 'edit-after-delete') return [['kept', 'Keep it deleted'], ['lost', 'Bring it back']];
  if (c.kept.mine) return [['kept', 'Keep mine'], ['lost', 'Keep ' + c.lost.by + "'s"]];
  if (c.lost.mine) return [['lost', 'Keep mine'], ['kept', 'Keep ' + c.kept.by + "'s"]];
  return [['kept', 'Keep ' + c.kept.by + "'s"], ['lost', 'Use ' + c.lost.by + "'s"]];
}
async function _shResolve(c, keep) {
  try {
    const j = await _shFetch('/api/sync/conflicts/resolve', { id: c.id, keep }, 'review:' + c.id, 30000);
    if (j && j.enabled !== undefined) { const { ok, stale, ...s } = j; _syncSt = s; }
    toast(j && j.stale ? 'That was changed again since: nothing to do.' : keep === 'kept' ? 'Kept as it is' : 'Done: the other version is used everywhere', { kind: 'ok' });
  } catch (e) { toast(_shErrText(e), { kind: 'err' }); }
  syncReviewLoad();
}
async function _shResolveMany(ids, keep) {
  try {
    const j = await _shFetch('/api/sync/conflicts/resolve-many', { ids, keep }, 'review:many', 60000);
    if (j && j.enabled !== undefined) { const { ok, done, stale, failed, ...s } = j; _syncSt = s; }
    const n = (j && j.done) || 0, st = (j && j.stale) || 0, bad = (j && j.failed) || [];
    if (n) toast(keep === 'kept' ? `${n} kept as they are` : `${n} changed to the other version, everywhere`, { kind: 'ok' });
    if (st) toast(`${st} had changed again since: nothing to do for ${st === 1 ? 'that one' : 'those'}.`, { icon: 'info' });
    if (bad.length) toast(`${bad.length} could not be changed: ${bad[0]}`, { kind: 'err' });
  } catch (e) { toast(_shErrText(e), { kind: 'err' }); return syncReviewLoad().then(() => false); }
  return syncReviewLoad();
}
function syncReviewPage(el) {
  const card = _settingsCard('Review', 'Something of yours changed on two computers at once. The later change was kept; pick the other one here if you want it.');
  const r = _shReview;
  if (!r) { card.body.appendChild(_syncEl('div', 'set-h', 'Reading…')); syncReviewLoad(); }
  else if (r.error) card.body.appendChild(_syncEl('div', 'sync-status sync-err', r.error));
  else if (!r.items.length) card.body.appendChild(_syncEl('div', 'set-h', 'Nothing to review.'));
  else {
    const list = _syncEl('div', 'sh-review'); list.setAttribute('role', 'list');
    for (const c of r.items) {
      const row = _syncEl('div', 'sh-rev'); row.setAttribute('role', 'listitem'); row.dataset.pickId = c.id;
      // 2.17.2: the server's plain sentence ("On Mahdi Work you changed the task "X" after this computer deleted it.")
      const what = c.text || ((c.what ? c.what.charAt(0).toUpperCase() + c.what.slice(1) : 'Item') + (c.name ? ' "' + c.name + '"' : '') + (c.field ? ' · ' + c.field : ''));
      row.appendChild(_syncEl('div', 'sh-rev-t', what));
      const sides = _syncEl('div', 'sh-rev-sides');
      const side = (s, kept) => { const d = _syncEl('div', 'sh-rev-side' + (kept ? ' is-kept' : '')); d.appendChild(_syncEl('div', 'sh-rev-by', (s.mine ? 'This computer' : s.by) + (kept ? ' · kept now' : ''))); d.appendChild(_syncEl('div', 'sh-rev-v', s.value)); return d; };
      sides.append(side(c.kept, true), side(c.lost, false));
      row.appendChild(sides);
      const acts = _syncEl('div', 'sync-actions');
      const busy = _shBusy && _shBusy.key === 'review:' + c.id;
      for (const [keep, label] of syncReviewChoices(c)) {
        const b = _syncEl('button', 'btn ' + (keep === 'lost' ? 'btn-secondary' : 'btn-secondary') + ' btn-sm', label);
        b.type = 'button'; b.disabled = !!_shBusy; b.onclick = () => _shResolve(c, keep);
        acts.appendChild(b);
      }
      if (busy) { const x = _syncEl('button', 'btn btn-ghost btn-sm', 'Cancel'); x.type = 'button'; x.onclick = _shCancel; acts.appendChild(x); }
      row.appendChild(acts);
      row.appendChild(_syncEl('div', 'set-h', syncAgo(Date.parse(c.at), Date.now())));
      list.appendChild(row);
    }
    card.body.appendChild(list);
    // Several at once, one request (POST /api/sync/conflicts/resolve-many). 11-ui-pick.js.
    if (r.items.length > 1) {
      const tools = _syncEl('div', 'pk-list-tools');
      tools.appendChild(multiPick(list, { key: 'sync-review', rows: '.sh-rev', noun: ['edit', 'edits'],
        nameOf: (x) => (x.querySelector('.sh-rev-t') || {}).textContent || '',
        exists: (id) => !!(_shReview && _shReview.items && _shReview.items.some(c => c.id === id)),
        actions: () => [
          { label: 'Keep as they are', icon: 'check', run: (ids) => _shResolveMany(ids, 'kept') },
          { label: 'Use the other version', icon: 'git-merge', tip: 'Use the version that was not kept, on every computer', run: (ids) => _shResolveMany(ids, 'lost') },
        ] }).button());
      card.body.insertBefore(tools, list);
    }
    if (r.open > r.items.length) card.body.appendChild(_syncEl('div', 'set-h', (r.open - r.items.length) + ' more after these.'));
  }
  el.appendChild(card.card);
}

/* ---------- The top bar's sync panel (56-presence.js) ---------- */
/** Extra HTML for the sync dot's panel: the newest changes, and Health. */
function syncPanelExtrasHtml(attention) {
  const entries = (_shChanges || (_syncSt && _syncSt.changes) || []).slice(0, 3);
  const now = Date.now();
  const lines = entries.map(e => `<div class="pr-feed-row"><span class="pr-feed-head">${esc(syncFeedHead(e, now))}</span>${e.text ? `<span class="pr-feed-what">${esc(e.text)}</span>` : ''}</div>`).join('');
  return `${lines ? `<div class="pr-feed" aria-label="What changed">${lines}<button type="button" class="btn btn-ghost btn-sm" data-act="changes">What changed</button></div>` : ''}`
    + `<div class="pr-health"><button type="button" class="btn ${attention ? 'btn-primary' : 'btn-secondary'} btn-sm" data-act="health">Check-up</button></div>`;
}
/** Wire the buttons syncPanelExtrasHtml made (close: the panel's own close). */
function syncPanelExtrasWire(el, close) {
  const h = el.querySelector('[data-act="health"]'); if (h) h.onclick = () => { close(); syncOpenHealth(); };
  const c = el.querySelector('[data-act="changes"]'); if (c) c.onclick = () => { close(); syncOpenChanges(); };
}
