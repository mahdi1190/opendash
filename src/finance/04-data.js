  // @part 04-data.js · OWNER: C3 (shared core: /api/finance load, budgets load, bank update + polling)
  // ── Networking ────────────────────────────────────────────────────────
  async function api(path, opts) {
    const r = await fetch(path, Object.assign({ cache: 'no-store' }, opts || {}));
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    return { ok: r.ok, status: r.status, body: j || {} };
  }
  async function load(quiet) {
    if (R.loading) return;
    R.loading = true;
    if (R.root) R.root.classList.toggle('fv-refreshing', !!R.model);
    if (!quiet && !R.data) paint();
    try {
      const r = await fetch('/api/finance', { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 404 ? 'this server has no finance support — restart OpenDash' : 'HTTP ' + r.status);
      const j = await r.json();
      R.data = j; R.err = null; R.loadedAt = Date.now();
      const job = j.meta && j.meta.job;
      if (job) { R.job = job; if (job.state === 'running') startPolling(); }
      R.model = (j.status === 'ok' && j.analysis) ? buildModel(j.analysis) : null;
      if (R.model) await loadBudgets(j.analysis);
    } catch (e) {
      R.err = (e && e.message) || String(e);
      R.errDown = typeof netIsDown === 'function' ? netIsDown(e) : /failed to fetch|network/i.test(R.err);   // @p2 the server is not running
    } finally {
      R.loading = false;
      if (R.root) R.root.classList.remove('fv-refreshing');
    }
    if (R.mounted) paint();
  }
  async function loadBudgets(a) {
    if (a && a.budgets && typeof a.budgets === 'object') { R.budgets = cleanBudgets(a.budgets); R.budgetsLocal = false; return; }
    try {
      const r = await api('/api/finance/budgets');
      if (r.ok && r.body && r.body.budgets) { R.budgets = cleanBudgets(r.body.budgets); R.budgetsLocal = false; return; }
    } catch (e) { /* fall through */ }
    R.budgets = cleanBudgets(F.localBudgets || {}); R.budgetsLocal = true;
  }
  function cleanBudgets(b) {
    const o = {};
    for (const [k, v] of Object.entries(b || {})) { const n = Number(v); if (k && isFinite(n) && n >= 0) o[k] = round2(n); }
    return o;
  }
  function applyAnalysis(analysis) {
    if (!analysis || !R.data) return;
    R.data.analysis = analysis; R.data.status = 'ok';
    R.model = buildModel(analysis);
    if (analysis.budgets && typeof analysis.budgets === 'object') { R.budgets = cleanBudgets(analysis.budgets); R.budgetsLocal = false; }
    if (R.mounted) paint();
  }

  // opts: {} = sync new transactions from the bank; {full:true} = re-read the
  // whole history; {bank:false} = only import inbox CSVs and rebuild.
  async function startUpdate(opts) {
    opts = opts && typeof opts === 'object' ? opts : (opts ? { full: true } : {});
    R.startErr = null; R.dismissed = null;
    try {
      const body = opts.bank === false ? { bank: false } : opts.full ? { full: true } : {};
      const r = await api('/api/finance/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 202 || r.status === 409) { if (r.body.job) R.job = r.body.job; startPolling(); }
      else R.startErr = r.body.error || ('Could not start the update (HTTP ' + r.status + ')');
    } catch (e) { R.startErr = 'Could not reach the OpenDash server. Is it still running?'; }
    paintUpdate();
  }
  function startPolling() {
    if (R.poll) return;
    R.pollFails = 0; R.lostServer = false;
    R.poll = setInterval(async () => {
      if (document.hidden && R.lostServer) return;   // @p2 no point knocking while nobody is looking
      try {
        const r = await fetch('/api/finance/status', { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const s = await r.json();
        if (R.lostServer) { R.lostServer = false; R.pollFails = 0; paintUpdate(); }   // @p2 the server answers again
        R.pollFails = 0;
        const wasRunning = R.job && R.job.state === 'running';
        R.job = s.job || null;
        if (!R.job || R.job.state !== 'running') {
          clearInterval(R.poll); R.poll = null;
          if (R.data && R.data.meta) R.data.meta.lastUpdate = s.lastUpdate || R.data.meta.lastUpdate;
          const before = txKeySet(R.model);
          await load(true);
          if (wasRunning && R.job) {
            const res = R.job.result || {};
            if (R.job.state === 'ok') { syncDone(); syncToast(syncDiff(before, R.model ? R.model.tx : []), res.imported); }
            else if (R.job.state === 'warning') toast("Couldn't reach your bank; inbox CSVs were imported", { bad: true });
            else toast('Update failed. See the message at the top.', { bad: true });
          }
          // A bank run tells Connections what it learned (connected / needs sign-in).
          try { if (window.Connections && window.Connections.refresh) window.Connections.refresh({ force: true }); } catch (e) { /* ignore */ }
          return;
        }
      } catch (e) {
        // @p2 Transient: keep polling. After three misses in a row (about 6 s) say so, in words, instead
        // of a "Syncing…" that never ends; the sync picks up again when the server answers.
        R.pollFails = (R.pollFails || 0) + 1;
        if (R.pollFails === 3) { R.lostServer = true; toast("Lost touch with the OpenDash server during the sync. It picks up again when the server is back.", { bad: true }); }
      }
      paintUpdate();
    }, 2000);
    paintUpdate();
  }
  // @c3-begin "new since last sync" (C3, 3 Oct 2026)
  // A transaction's identity across rebuilds: the pipeline's key when it has
  // one, else its date, amount, merchant and account.
  const txKeyOf = t => (t.k && !/^i\d+$/.test(t.k) ? t.k : [t.d, t.a, t.m, t.acct].join('|'));
  const txKeySet = M => (M && Array.isArray(M.tx) ? new Set(M.tx.map(txKeyOf)) : null);
  // What a sync or import brought in, counted against the keys from before it.
  // Pure (tests/finance-shell.test.mjs): { n, spend: { n, total }, income: { n, total }, other, latest, keys }.
  function syncDiff(beforeKeys, tx) {
    const out = { n: 0, spend: { n: 0, total: 0 }, income: { n: 0, total: 0 }, other: 0, latest: null, keys: [] };
    if (!beforeKeys) return out;
    for (const t of tx || []) {
      const k = txKeyOf(t); if (beforeKeys.has(k)) continue;
      out.n++; out.keys.push(k);
      if (t.kind === 'spend') { out.spend.n++; out.spend.total += t.s; }
      else if (t.kind === 'income') { out.income.n++; out.income.total += t.inc; }
      else out.other++;
      if (out.latest == null || t.n > out.latest) out.latest = t.n;
    }
    out.spend.total = round2(out.spend.total); out.income.total = round2(out.income.total);
    return out;
  }
  // The toast after a sync or an import: counts, what went out and came in, and a way to see them.
  // The new rows stay in R.newKeys for ten minutes (Transactions can mark them).
  function syncToast(diff, imported, via) {
    const since = via === 'import' ? 'from this import' : 'since your last sync';
    if (!diff || !diff.n) { toast(via === 'import' ? 'Imported · nothing new (every row was already here)' : 'Up to date · nothing new since your last sync', { kind: 'ok', icon: 'circle-check' }); return; }
    R.newKeys = new Set(diff.keys); R.newAt = Date.now();
    const bits = [];
    if (diff.spend.n) bits.push(`${nf0.format(diff.spend.n)} out · ${gbp(diff.spend.total)}`);
    if (diff.income.n) bits.push(`${nf0.format(diff.income.n)} in · ${gbp(diff.income.total)}`);
    if (diff.other) bits.push(`${nf0.format(diff.other)} between accounts`);
    toast(`${nf0.format(diff.n)} new ${since}` + (bits.length ? `: ${bits.join(', ')}` : ''), {
      kind: 'ok', icon: 'sparkles', action: 'Show', onAction: () => { if (R.mounted) { F.sort = { key: 'd', dir: -1 }; R.page = 0; setSection('transactions'); } },
    });
  }
  // The sync button's tick: the spinning arrows turn into a check for a moment.
  function syncDone() {
    R.syncDoneAt = Date.now();
    paintHead();   // the button (via paintSyncBtn) and the freshness dot
    clearTimeout(R.syncDoneT);
    R.syncDoneT = setTimeout(() => paintSyncBtn(), 2700);
  }
  // @c3-end

