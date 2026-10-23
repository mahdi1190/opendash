/* ============================================================
   REMOTE JOBS (window.RemoteJobs). Owner: Connections.
   Connect once, use everywhere (docs/dev/MULTI_DEVICE.md): something this
   computer cannot do (no Claude here) but another of your devices can is
   asked there. The server answers 202 {remote: {id, runsOn, message}}
   (lib/remote-jobs.mjs); remoteFetch() shows "Asking Home laptop…", waits
   for the answer (GET /api/requests/:id, woken at once by the live event
   'synced-files') and hands it back as if the server had answered itself:
   callers keep their own error handling.

     remoteFetch(url, init, {quiet, onState})  -> Response (fetch's shape)
     RemoteJobs.wait(remote, opts)            -> Response, for a 202 already read
     syncedFilesChanged(rels)                  the live event: reload what changed
                                               (the calendar, the inbox, the day
                                               adviser's review, a request's answer)
   ============================================================ */
const _rjWaiters = new Map();
function _rjResponse(status, body) {
  return new Response(JSON.stringify(body || {}), { status, headers: { 'Content-Type': 'application/json' } });
}
async function remoteFetch(url, init, opts) {
  const r = await fetch(url, init);
  if (r.status !== 202) return r;
  let j = null;
  try { j = await r.clone().json(); } catch (e) { return r; }
  if (!j || !j.remote || !j.remote.id) return r;
  return remoteWait(j.remote, opts);
}
async function remoteWait(remote, opts) {
  opts = opts || {};
  const id = String(remote.id);
  const url = '/api/requests/' + encodeURIComponent(id);
  let cancelled = false;
  const close = opts.quiet ? () => {} : toast(remote.message || ('Asking ' + (remote.runsOn || 'your other computer') + '…'), {
    icon: 'loader-circle', timeout: 15 * 60000,
    action: { label: 'Cancel', run: () => { cancelled = true; remoteWake(); fetch(url + '/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {}); } },
  });
  const tell = (x) => { if (typeof opts.onState === 'function') { try { opts.onState(x); } catch (e) { console.error('[remote]', e); } } };
  tell(remote);
  const t0 = Date.now();
  try {
    for (;;) {
      if (cancelled) return _rjResponse(499, { error: 'Cancelled.', code: 'CANCELLED' });
      await new Promise((res) => { const t = setTimeout(res, Date.now() - t0 < 30000 ? 1000 : 3000); _rjWaiters.set(id, () => { clearTimeout(t); res(); }); });
      _rjWaiters.delete(id);
      if (cancelled) return _rjResponse(499, { error: 'Cancelled.', code: 'CANCELLED' });
      let x = null;
      try {
        const r = await fetch(url, { cache: 'no-store' });
        x = await r.json();
        if (!r.ok) throw new Error((x && x.error) || ('HTTP ' + r.status));
      } catch (e) {
        if (Date.now() - t0 > 20 * 60000) return _rjResponse(504, { error: 'No answer from ' + (remote.runsOn || 'your other computer') + '.', code: 'NO_ANSWER' });
        continue;
      }
      tell(x);
      // The answer of the route it ran there, exactly (an error from there too).
      if ((x.status === 'done' || x.status === 'error') && x.result) return _rjResponse(x.result.status || 200, x.result.body || { ok: true });
      if (['error', 'cancelled', 'expired'].includes(x.status)) {
        return _rjResponse(x.state === 'offline' ? 503 : 502, { error: x.message || 'It did not work.', code: (x.error && x.error.code) || String(x.status).toUpperCase(), runsOn: x.runsOn || null });
      }
    }
  } finally { close(); }
}
function remoteWake() { for (const fn of [..._rjWaiters.values()]) { try { fn(); } catch (e) { /* fine */ } } }

/** Another device published something this page shows: reload just that. */
function syncedFilesChanged(rels) {
  const list = Array.isArray(rels) ? rels : [];
  if (list.includes('requests.json')) remoteWake();
  const any = (prefix) => list.some(r => typeof r === 'string' && r.startsWith(prefix));
  try { if (typeof CalStore !== 'undefined' && CalStore && CalStore.st && CalStore.st.loaded && (any('calendar/'))) CalStore.load(true); } catch (e) { /* not loaded yet */ }
  try { if (typeof InboxStore !== 'undefined' && InboxStore && InboxStore.st && InboxStore.st.loaded && any('inbox/')) InboxStore.load(true); } catch (e) { /* not loaded yet */ }
  if (list.includes('brief/day-advice.json') && typeof homeAdvisorRefresh === 'function') homeAdvisorRefresh();
  if ((list.includes('profile.json') || any('briefs/')) && typeof render === 'function') { try { render(); } catch (e) { /* fine */ } }
  // A proposal applied or dismissed on another computer (state/proposals.json): the assistant's cards follow (70-ai-chats.js).
  if (list.includes('state/proposals.json') && typeof chatProposalsChanged === 'function') chatProposalsChanged();
}

window.RemoteJobs = { fetch: remoteFetch, wait: remoteWait, wake: remoteWake, filesChanged: syncedFilesChanged };
