  // @part 10-shell.js · OWNER: C3 (root, paint modes, welcome, page-header actions, CSV import, notices)
  // ── Shell ─────────────────────────────────────────────────────────────
  function buildRoot() {
    const root = h('div', { class: 'fv' });
    R.root = root;
    R.layer = h('div', { class: 'fv-layer' });
    return root;
  }
  function paint() {
    const root = R.root; if (!root) return;
    let mode;
    if (!R.data) mode = R.err ? 'error' : 'loading';
    else if (R.data.meta && R.data.meta.available === false) mode = 'unavailable';
    else if (!R.model) mode = 'empty';
    else mode = 'ready';
    // A skeleton already on show stays put (its fade and shimmer never restart).
    const keepSkel = mode === 'loading' && R.mode === 'loading' && !!root.querySelector(':scope > .fv-skeleton');
    if ((mode !== R.mode || mode !== 'ready') && !keepSkel) {
      R.mode = mode;
      disposeAll(); R.sectionId = null; R.els = {};
      root.innerHTML = '';
      if (mode === 'loading') root.append(buildSkeleton());
      else if (mode === 'error') {
        const retry = h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => { R.err = null; paint(); load(); } }, ic('rotate-ccw'), h('span', { text: 'Try again' }));
        // @p2 one clear sentence: the server-down message already says what to do (no "..again.. The Finances view needs").
        const why = String(R.err || 'Something went wrong').replace(/[.\s]+$/, '');
        root.append(emptyState({ icon: R.errDown ? 'unplug' : 'circle-alert', title: "Couldn't load your finances", text: R.errDown ? `${why}.` : `${why}. If Freeflo isn’t running, start it, then come back.`, actions: [retry] }));
      } else if (mode === 'unavailable') {
        root.append(emptyState({ icon: 'wallet', title: 'Finances are not set up', text: 'Finances isn’t set up on this computer.', actions: [h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => (window.Connections && Connections.open ? Connections.open('money') : setView('connections')) }, ic('plug'), h('span', { text: 'Connections > Money' }))] }));
      } else if (mode === 'empty') {
        root.append(buildTop());
        // Payments are stored but none is counted (Your data): the list, not "connect your bank".
        root.append(R.data.meta && R.data.meta.storeCount > 0 ? ydStandalone() : buildWelcome());
        paintTop(); paintUpdate();
      } else {
        buildReady(root);
      }
    }
    paintHead();
    if (mode === 'ready') updateAll();
  }
  // First load only (no data yet): the final layout in grey, so nothing jumps
  // when the data lands. It fades in after 150 ms and its shimmer starts at
  // 400 ms, so a fast load never flashes (FINANCE_MOTION.md §8).
  function buildSkeleton() {
    const sk = (cls, style) => h('i', { class: 'fv-skel ' + (cls || ''), style: style || null });
    const tile = () => h('div', { class: 'fv-sk-card kpi' }, MK.skeleton(null, { kind: 'kpi' }).el);
    return h('div', { class: 'fv-skeleton', role: 'status', 'aria-label': 'Loading finances' },
      h('div', { class: 'fv-sk-tabs' }, SECTIONS.map(([, l]) => sk('tab', { width: (l.length * 7 + 34) + 'px' }))),
      h('div', { class: 'fv-sk-bar' }, sk('seg'), sk('lbl'), h('span', { class: 'fv-grow' }), sk('seg2')),
      sk('nav'),
      h('div', { class: 'fv-sk-kpis' }, tile(), tile(), tile(), tile()),
      h('div', { class: 'fv-sk-grid' },
        h('div', { class: 'fv-sk-card big' }, sk('line', { width: '32%' }), MK.skeleton(null, { kind: 'chart', bars: 22 }).el),
        h('div', { class: 'fv-sk-card' }, sk('line', { width: '46%' }), MK.skeleton(null, { kind: 'lines', lines: 7 }).el)));
  }
  // First run: nothing imported yet. Two ways in, side by side.
  function buildWelcome() {
    const meta = (R.data && R.data.meta) || {};
    // Another device reads the bank and has not published yet: no "connect", it is on its way.
    const rm = meta.remote;
    if (rm && rm.name && !rm.trial) {
      const ask = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => startUpdate({}) }, ic('refresh-cw'), h('span', { text: `Ask ${rm.name} to update` }));
      return welcomeScene(emptyState({ icon: 'wallet', cls: 'fv-welcome', title: `Finance from ${rm.name}`,
        text: `Your bank is read on ${rm.name}. It shows here after its next update${rm.online ? '.' : ' (it is off right now).'}`, actions: [ask] }));
    }
    const imp = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => pickCsv() }, ic('upload'), h('span', { text: 'Import a CSV' }));
    const sync = h('button', { class: 'btn btn-secondary', type: 'button', 'data-requires': 'bank', 'data-requires-hint': 'Updating needs the bank connection. A CSV import works without it.', onclick: () => startUpdate({}) }, ic('landmark'), h('span', { text: 'Update from your bank' }));
    // Trial mode: another device reads the bank, but its finances only come here once this one takes changes.
    // Preview mode only (Sync > Preview changes first is on): "Use it" turns it off, with Undo (SIMPLIFY_PLAN.md L17).
    const trial = rm && rm.name && rm.trial ? h('div', { class: 'fv-welcome-note' }, ic('landmark'),
      h('span', { text: `${rm.name} reads your bank. Preview changes first is on in Sync, so it isn’t used here yet.` }),
      h('button', { class: 'btn-link', type: 'button', text: 'Use it', onclick: () => useSyncChanges() })) : null;
    const pending = meta.inboxPending ? h('div', { class: 'fv-welcome-note' }, ic('file-up'),
      h('span', { text: `${meta.inboxPending} CSV file${meta.inboxPending === 1 ? ' is' : 's are'} waiting in the finance inbox folder.` }),
      h('button', { class: 'btn-link', type: 'button', text: 'Import now', onclick: () => startUpdate({ bank: false }) })) : null;
    const steps = h('ol', { class: 'fv-welcome-steps' },
      [['download', 'Export', "Download a CSV of your transactions from your bank's website (any date range; overlaps are fine)."],
        ['upload', 'Import', 'Drop it here or press Import a CSV. Duplicates are skipped and every transaction is categorised.'],
        ['chart-column', 'Explore', 'Spending, categories, shops, regular bills and budgets, all on this computer.']]
        .map(([i, t, d]) => h('li', null, h('span', { class: 'fv-step-ic' }, ic(i)), h('b', { text: t }), h('span', { text: d }))));
    const el = emptyState({ icon: 'wallet', cls: 'fv-welcome', title: 'Bring in your transactions',
      text: 'Import a CSV from your bank, or connect your bank (read-only).',
      actions: [imp, sync, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => (window.Connections && Connections.open ? Connections.open('money') : setView('connections')) }, ic('landmark'), h('span', { text: 'Connect a bank or wallet' }))], after: h('div', null, trial, pending, steps) });
    return welcomeScene(el);
  }
  // Sync's "Preview changes first" off on this computer (POST /api/sync/settings {apply: true}), with Undo.
  async function useSyncChanges() {
    const post = async (apply) => {
      const r = await fetch('/api/sync/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apply }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error((j && j.error && (j.error.message || j.error)) || 'HTTP ' + r.status); }
    };
    try { await post(true); } catch (e) { toastErr('turn off Preview changes first', e, () => useSyncChanges()); return; }
    toast('Preview changes first turned off', { kind: 'ok', icon: 'check', action: 'Undo', onAction: async () => { try { await post(false); load(true); } catch (e) { toastErr('undo that', e); } } });
    load(true);
  }
  // One calm animated scene (a coin dropping into a jar) instead of a static icon.
  function welcomeScene(el) {
    try {
      const FS = window.FinSymbols, box = el.querySelector('.es-icon');
      if (FS && typeof FS.categoryIcon === 'function' && box) {
        box.innerHTML = FS.categoryIcon('Savings', { size: 'lg', live: MK.reduced() ? false : 'loop' }); box.classList.add('fv-es-scene');
        if (typeof FS.activate === 'function') requestAnimationFrame(() => FS.activate(el, { max: 2 }));
      }
    } catch (e) { /* the plain icon stays */ }
    return el;
  }

  // Header actions live in the page header (#view-header) beside the
  // "Finances" title; the freshness line is the title's subtitle.
  function buildHead() {
    const H = R.head = {};
    H.file = h('input', { type: 'file', accept: '.csv,text/csv', multiple: true, hidden: true, 'aria-hidden': 'true', tabindex: '-1' });
    H.file.addEventListener('change', () => { const files = [...H.file.files]; H.file.value = ''; if (files.length) importFiles(files); });
    H.imp = h('button', { class: 'btn btn-secondary', type: 'button', 'data-tip': 'Import a CSV export from your bank (works offline)', onclick: () => pickCsv() }, ic('upload'), h('span', { class: 'lbl', text: 'Import CSV' }));
    // The arrows spin while it syncs, then turn into a tick for a moment (syncDone in 04-data.js).
    H.sync = h('button', { class: 'btn btn-primary fv-sync-main', type: 'button', 'data-requires': 'bank', 'data-requires-hint': 'Updating needs the bank connection. A CSV import works without it.', onclick: () => startUpdate({}) },
      h('span', { class: 'fv-sync-icons', 'aria-hidden': 'true' }, ic('refresh-cw', 'fv-sync-ic'), ic('check', 'fv-sync-ok')), h('span', { class: 'lbl', text: 'Update bank' }));
    H.caret = h('button', { class: 'btn btn-primary fv-sync-caret', type: 'button', 'aria-label': 'More update options', 'aria-haspopup': 'menu', onclick: (e) => openUpdateMenu(e.currentTarget) }, ic('chevron-down'));
    H.el = h('div', { class: 'fv-head-actions' }, H.file, H.imp, h('div', { class: 'fv-sync' }, H.sync, H.caret));
    return H;
  }
  function openUpdateMenu(anchor) {
    const meta = (R.data && R.data.meta) || {};
    const items = [
      { label: 'Update new transactions', icon: 'refresh-cw', className: 'fv-req-bank', run: () => startUpdate({}) },
      { label: 'Full refresh', icon: 'history', hint: 'slower', className: 'fv-req-bank', title: 'Reads your whole bank history again', run: () => startUpdate({ full: true }) },
      'sep',
      { label: 'Import a CSV…', icon: 'upload', run: () => pickCsv() },
      { label: 'Import from the Finances folder', icon: 'rotate-ccw', hint: meta.inboxPending ? `${meta.inboxPending} waiting` : '', title: 'Imports new CSV files from the Finances folder', run: () => startUpdate({ bank: false }) },
      { label: 'Export all transactions', icon: 'download', title: 'Every transaction as a CSV file', run: () => exportAll() },
    ];
    if (typeof window.openPopover === 'function' && typeof window.buildMenuItems === 'function') {
      window.openPopover(anchor, (el, close) => {
        window.buildMenuItems(el, items, close);
        for (const b of el.querySelectorAll('.fv-req-bank')) { b.setAttribute('data-requires', 'bank'); b.setAttribute('data-requires-hint', 'Needs the bank connection.'); }
        if (window.Connections && window.Connections.apply) window.Connections.apply(el);
      }, { role: 'menu', align: 'end' });
    } else startUpdate({});
  }
  function paintHead() {
    if (!R.mounted) return;
    const vh = document.getElementById('view-header');
    const show = R.mode === 'ready' || R.mode === 'empty';
    if (!R.head) buildHead();
    paintGroupTabs();
    const H = R.head;
    if (vh && show && H.el.parentElement !== vh) vh.append(H.el);
    // The shared page header draws these actions when it can (65-finance-view.js registerHeaderActions); else this row.
    H.el.hidden = !show || typeof window.headerActionsFor === 'function';
    paintSub();
    paintSyncBtn();
  }
  // The page subtitle: freshness ("Data to Fri 2 Oct · 234 transactions · Imported 0 new, 12 min ago"). The result of the last
  // import or update is a quiet note on this line (R.quiet, set by paintUpdate), not a banner.
  function paintSub() {
    if (!R.mounted) return;
    const sub = document.getElementById('view-subtitle');
    if (sub) {
      sub.textContent = '';
      const a = R.model ? R.model.a : null;
      if (a && R.mode === 'ready') {
        const days = staleness(a).days;
        const meta = (R.data && R.data.meta) || {};
        const fresh = R.syncDoneAt && Date.now() - R.syncDoneAt < 2500;   // new data just landed: the dot rings twice
        // Finances another device reads ("Finance from Home laptop · updated 5 min ago · data to ...";
        // while it is off: "... · last update 2 h ago (it's off) · data to ...", calm, no error).
        const line = remoteLine(meta);
        const via = line ? line.text : '';
        const tip = line ? line.tip : meta.analysisAt ? 'Analysis rebuilt ' + agoText(meta.analysisAt) : null;
        sub.append(h('span', { class: 'fv-fresh' + (line && line.away ? ' is-away' : days > 4 ? ' stale' : '') + (fresh ? ' is-new' : ''), title: tip },
          h('i', { class: 'fv-dot', 'aria-hidden': 'true' }),
          (via ? via + ' · data' : 'Data') + ` to ${validIso(a.latest_transaction) ? fDayW(dnum(a.latest_transaction)) : '—'} · ${nf0.format(R.model.tx.length)} transactions`
          + (R.model.accts.length > 1 ? ` · ${R.model.accts.length} accounts` : '')
          + (R.quiet ? ` · ${R.quiet}` : '')));
      }
    }
  }
  /**
   * "Finance from Home laptop · updated 5 min ago" when another device reads the bank, else null:
   * {text, tip, away} (src/app/65-finance-view.js financeRemoteLine, the same words as Home and Connections).
   */
  function remoteLine(meta) {
    const rm = meta && meta.remote;
    if (!rm || !rm.name) return null;
    if (rm.waiting) return { text: `Finance from ${rm.name} · ${rm.trial ? 'turn on "Use changes from my other computers" to see it' : 'waiting for its first update'}`, tip: null, away: '' };
    if (typeof financeRemoteLine === 'function') { const l = financeRemoteLine(rm); if (l) return l; }
    const ago = rm.updatedAt ? agoText(rm.updatedAt) : '';
    return { text: `Finance from ${rm.name}` + (ago ? ` · updated ${ago}` : ''), tip: null, away: '' };
  }
  function paintSyncBtn() {
    const H = R.head; if (!H) return;
    const meta = (R.data && R.data.meta) || {};
    const job = R.job || meta.job;
    const running = !!(job && job.state === 'running') || !!R.importing || !!R.remoteJob;
    const done = !running && R.syncDoneAt && Date.now() - R.syncDoneAt < 2600;
    // Another device reads the bank: Sync asks it; a CSV is imported there.
    const rm = meta.remote && meta.remote.name && !meta.remote.trial ? meta.remote : null;
    H.imp.setAttribute('data-tip', rm ? `Import a CSV on ${rm.name}: it shows here after that` : 'Import a CSV export from your bank (works offline)');
    if (rm) H.sync.removeAttribute('data-requires'); else H.sync.setAttribute('data-requires', 'bank');
    const away = rm ? (remoteLine(meta) || {}).away : '';
    if (rm) H.sync.setAttribute('data-tip', away === 'off' || away === 'asleep' ? `${rm.name} is ${away} right now: your finances update when it is on again` : `Asks ${rm.name} to update your finances`);
    else H.sync.removeAttribute('data-tip');
    H.sync.disabled = running; H.caret.disabled = running; H.imp.disabled = running || !!rm;
    H.sync.classList.toggle('busy', running);
    H.sync.classList.toggle('done', !!done);
    H.sync.querySelector('.lbl').textContent = R.importing ? 'Importing…' : R.remoteJob ? 'Asking…' : running ? 'Updating…' : done ? 'Up to date' : 'Update bank';
  }
  function exportAll() {
    const a = h('a', { href: '/api/finance/export', download: '' });
    document.body.append(a); a.click(); a.remove();
  }

  // ── CSV import (works with no connection at all) ─────────────────────
  function pickCsv() { if (!R.head) buildHead(); if (!R.head.file.isConnected) document.body.append(R.head.file); R.head.file.click(); }
  function b64(buf) {
    const bytes = new Uint8Array(buf); let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function importFiles(files) {
    if (R.importing) return;
    R.importing = true; R.startErr = null; paintSyncBtn(); paintUpdate();
    const before = txKeySet(R.model) || new Set();
    let added = 0, rows = 0, last = null, newCard = null; const errs = [], left = [];
    try {
      for (const f of files) {
        if (!/\.csv$/i.test(f.name)) { errs.push(`${f.name}: only .csv files can be imported`); continue; }
        if (f.size > 5 * 1024 * 1024) { errs.push(`${f.name}: larger than 5 MB`); continue; }
        const data = b64(await f.arrayBuffer());
        const send = (extra) => api('/api/finance/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.name, data, ...extra }) });
        let r = await send({});
        // It looks like a credit card: which way round are its amounts? Nothing is imported until the person says (45-cards.js).
        let card;
        if (r.ok && r.body.needsCardCheck) {
          card = await cdFileCheck(f.name, r.body.preview);
          if (card === null) { left.push(f.name); continue; }
          r = await send({ card });
        }
        // The file looks like an account already synced: importing it would count it twice. Ask.
        if (r.status === 409 && r.body.code === 'LOOKS_LIKE_DUPLICATE') {
          const go = typeof confirmDialog === 'function'
            ? await confirmDialog({ title: 'Import ' + f.name + ' anyway?', text: r.body.error, confirmLabel: 'Import anyway', danger: true })
            : window.confirm(r.body.error);
          if (!go) { errs.push(`${f.name}: not imported (it looks like an account that is already here)`); continue; }
          r = await send({ force: true, ...(card !== undefined ? { card } : {}) });
        }
        if (!r.ok) { errs.push(`${f.name}: ${netPlainError(r.body.error || 'HTTP ' + r.status)}`); continue; }
        added += Number(r.body.imported) || 0; rows += Number(r.body.rows) || 0; last = r.body;
        if (r.body.card && r.body.card.isNew) newCard = r.body.card;
        for (const e of r.body.errors || []) errs.push(e);
      }
    } catch (e) { errs.push('Could not reach the Freeflo server. Is it still running?'); }
    R.importing = false;
    if (last && last.analysis) {
      R.lastImport = { at: new Date(Date.now()).toISOString(), added, rows, errs };   // an instant
      if (!R.data) R.data = { status: 'ok', meta: {} };
      if (R.data.meta) { R.data.meta.storeCount = last.total; R.data.meta.analysisAt = new Date(Date.now()).toISOString(); }   // an instant
      applyAnalysis(last.analysis);
    } else if (errs.length) R.startErr = errs.join(' · ');
    if (last) syncDone(); else paintSyncBtn();
    paintUpdate();
    if (last) syncToast(syncDiff(before, R.model ? R.model.tx : []), added, 'import');
    else if (errs.length) toast(errs[0], { bad: true });
    else if (left.length) toast('Left out. Nothing was imported.', { icon: 'circle-check' });
    YD.loadedFor = 0;
    if (newCard) cdOweDialog({ key: newCard.key, name: newCard.name, owed: newCard.balance ? newCard.balance.amount : null, asOf: newCard.balance ? newCard.balance.date : null, from: newCard.balance ? newCard.balance.from : null, pay: newCard.pay, typed: newCard.balance }, { after: true });
  }
  // Drop a CSV anywhere on the Finances page.
  function wireDrop(root) {
    if (root._fvDrop) return; root._fvDrop = true;
    const has = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
    root.addEventListener('dragover', e => { if (!has(e)) return; e.preventDefault(); root.classList.add('fv-drop'); });
    root.addEventListener('dragleave', e => { if (e.target === root || !root.contains(e.relatedTarget)) root.classList.remove('fv-drop'); });
    root.addEventListener('drop', e => {
      if (!has(e)) return; e.preventDefault(); root.classList.remove('fv-drop');
      const files = [...e.dataTransfer.files].filter(f => /\.csv$/i.test(f.name));
      if (files.length) importFiles(files); else toast('Only .csv files can be imported.', { bad: true });
    });
  }

  /**
   * How old the data is. A connected bank is judged by when it last fetched (analysis.fetches, counted from
   * now so it keeps ticking between rebuilds): a quiet account is not stale. CSV-only setups use stale_days.
   */
  function staleness(a) {
    const f = Array.isArray(a && a.fetches) ? a.fetches : [];
    if (!f.length) return { days: Number(a && a.stale_days) || 0, late: [] };
    const rows = f.map(x => { const t = Date.parse(x && x.at || ''); return { label: String(x.label || 'Your bank'), t: t || 0, days: t ? Math.max(0, Math.floor((Date.now() - t) / 864e5)) : null }; });
    const late = rows.filter(x => x.days == null || x.days > 4);
    return { days: Math.max(0, ...rows.map(x => x.days || 0), rows.some(x => x.days == null) ? Number(a.stale_days) || 0 : 0), late };
  }
  /** "Tuesday" within the last week, else "12 Oct". */
  function sinceText(t) {
    const d = new Date(t);
    return Date.now() - t < 6 * 864e5 ? d.toLocaleDateString(LOC, { weekday: 'long' }) : d.toLocaleDateString(LOC, { day: 'numeric', month: 'short' });
  }
  function lateText(late) {
    const bit = x => x.t ? `${x.label} since ${sinceText(x.t)}` : `${x.label} yet`;
    return late.length === 1 ? (late[0].t ? `${late[0].label} hasn't synced since ${sinceText(late[0].t)}.` : `${late[0].label} hasn't synced yet.`)
      : late.map(bit).join(', ').replace(/, ([^,]*)$/, ' and $1').replace(/^/, 'Not synced: ') + '.';
  }
  function buildTop() {
    const E = R.els;
    E.progress = h('div', { class: 'fv-progress', 'aria-live': 'polite', hidden: true });
    E.banner = h('div', { class: 'callout warn fv-banner', hidden: true });
    return h('div', { class: 'fv-top' }, E.progress, E.banner);
  }
  function paintTop() {
    const E = R.els; if (!E.banner) return;
    const a = R.model ? R.model.a : null;
    E.banner.innerHTML = '';
    let msg = null;
    if (a) {
      const st = staleness(a), days = st.days;
      const rm = R.data && R.data.meta && R.data.meta.remote && R.data.meta.remote.name && !R.data.meta.remote.trial ? R.data.meta.remote : null;
      msg = a.sample ? ['info', 'Sample data.', 'These figures are made up to show the layout.', h('button', { class: 'btn-link', type: 'button', text: 'Import a CSV from your bank', onclick: () => pickCsv() })]
        : days > 4 && rm ? ['triangle-alert', st.late.length ? lateText(st.late) : `Your data is ${days} days old.`, `Update bank asks ${rm.name} to update it${rm.online ? '' : ' when it is on'}.`]
          : st.late.length && bankOk() ? ['triangle-alert', lateText(st.late), '', h('button', { class: 'btn-link', type: 'button', text: 'Update now', onclick: () => startUpdate({}) })]
            : days > 4 && !(a.fetches && a.fetches.length) ? ['triangle-alert', `Your data is ${days} days old.`, bankOk() ? 'Sync your bank, or import a recent CSV export.' : 'Import a recent CSV export from your bank, or connect your bank to sync it.']
              : st.late.length ? ['triangle-alert', lateText(st.late), 'Import a recent CSV export, or check the connection under Connections.'] : null;
    }
    // A direct bank connection that needs (or soon needs) a new sign-in (56-fin-connect.js).
    if (!msg && a && !a.sample && typeof window.finConnectReauthNotice === 'function') { try { const n = window.finConnectReauthNotice(); if (n) msg = ['triangle-alert', n[1], n[2]]; } catch (e) { /* no notice */ } }
    E.banner.hidden = !msg;
    E.banner.className = 'callout fv-banner' + (msg && msg[0] === 'triangle-alert' ? ' warn' : '');
    if (msg) E.banner.append(ic(msg[0]), h('div', null, h('b', { text: msg[1] }), msg[2] ? ' ' + msg[2] : '', msg[3] ? h('span', null, ' ', msg[3]) : null));
  }
  const STEPS = [['starting', 'Start'], ['bank', 'Bank'], ['csv', 'Save'], ['spend', 'Analyse']];
  function callout(kind, iconName, title, rest, closable) {
    const P = R.els.progress;
    P.className = 'fv-progress callout' + (kind ? ' ' + kind : '');
    P.append(ic(iconName), h('div', { class: 'fv-callout-b' }, h('b', { text: title }), rest));
    if (closable) P.append(h('button', { type: 'button', class: 'btn-icon btn-sm fv-callout-x', 'aria-label': 'Dismiss', onclick: () => { R.dismissed = closable; P.hidden = true; } }, ic('x')));
  }
  // A routine result (an import or update that went well) is a quiet note on the page's status line; a callout is only for
  // what is happening now or needs you (progress, a problem, a warning).
  function paintUpdate() {
    R.quiet = '';
    paintUpdateBody();
    paintSub();
  }
  function paintUpdateBody() {
    const E = R.els; paintSyncBtn(); if (!E.progress) return;
    const meta = (R.data && R.data.meta) || {};
    const job = R.job || meta.job;
    const running = !!(job && job.state === 'running');
    const P = E.progress; P.innerHTML = ''; P.hidden = false;
    if (R.startErr) { callout('danger', 'circle-x', "That didn't work.", ' ' + netPlainError(R.startErr), 'err:' + R.startErr); return; }
    // The finance computer is off (04-data.js waitRemote): said calmly, the last copy stays on show.
    if (R.startNote && meta.remote && meta.remote.online) R.startNote = null;   // it is back
    if (R.startNote && R.dismissed !== 'away:' + R.startNote.at) {
      callout('', 'moon', `${R.startNote.who} is off right now.`, h('span', { class: 'mute', text: ` This is what it last sent. Your finances update by themselves when ${R.startNote.who} is on again.` }), 'away:' + R.startNote.at);
      return;
    }
    if (R.importing) { callout('', 'loader-circle', 'Importing…', h('span', { class: 'mute', text: ' Reading the file, skipping anything already imported, then rebuilding the analysis.' })); P.querySelector('.i').classList.add('fv-spin'); return; }
    if (R.remoteJob) {   // another device reads the bank and was asked to update (04-data.js waitRemote)
      const x = R.remoteJob, who = x.runsOn || 'your other computer';
      callout('fv-run', 'loader-circle', x.state === 'running' ? `${who} is updating your finances…` : `Asking ${who}…`,
        h('span', { class: 'mute', text: ` ${x.at ? durText(new Date(x.at).toISOString()) + ' · ' : ''}They show here as soon as it has finished.` }));
      P.querySelector('.i').classList.add('fv-spin');
      return;
    }
    if (running && R.lostServer) {   // @p2 the server stopped answering mid-sync (04-data.js startPolling)
      callout('warn', 'unplug', "Lost touch with the Freeflo server.", h('span', { text: " The sync may still be running. This updates by itself when the server answers again; if Freeflo was closed, start it again (the Freeflo shortcut)." }));
      return;
    }
    if (running) {
      const si = Math.max(0, STEPS.findIndex(s => s[0] === job.step));
      callout('fv-run', 'loader-circle', (job.stepLabel || 'Working') + '…', [
        h('span', { class: 'mute', text: ` ${durText(job.startedAt)}${job.detail ? ' · ' + job.detail : ''}` }),
        h('div', { class: 'fv-steps' }, STEPS.map(([k, l], i) => h('span', { class: 'fv-step' + (i < si ? ' done' : i === si ? ' cur' : '') }, h('i', { 'aria-hidden': 'true' }), l))),
        h('div', { class: 'fv-prog-bar' }, h('i'))]);
      P.querySelector('.i').classList.add('fv-spin');
      return;
    }
    if (R.lastImport && (!meta.lastUpdate || !meta.lastUpdate.at || R.lastImport.at > meta.lastUpdate.at) && !(job && job.finishedAt > R.lastImport.at)) {
      const L = R.lastImport;
      if (R.dismissed === 'imp:' + L.at || Date.now() - Date.parse(L.at) > 30 * 60e3) { P.hidden = true; return; }
      if (!L.errs.length) { R.quiet = `Imported ${nf0.format(L.added)} new${L.rows - L.added > 0 ? `, ${nf0.format(L.rows - L.added)} already here` : ''} · ${agoText(L.at)}`; P.hidden = true; return; }
      callout('warn', 'triangle-alert', `Imported ${nf0.format(L.added)} new transaction${L.added === 1 ? '' : 's'}.`,
        [h('span', { class: 'mute', text: L.rows - L.added > 0 ? ` ${nf0.format(L.rows - L.added)} were already there.` : '' }), L.errs.length ? h('ul', { class: 'fv-warn-list' }, L.errs.map(e => h('li', { text: e }))) : null], 'imp:' + L.at);
      return;
    }
    const last = job ? { state: job.state, result: job.result, error: job.error, at: job.finishedAt } : meta.lastUpdate;
    if (!last || !last.state) { P.hidden = true; return; }
    const r = last.result || {};
    const key = 'job:' + (last.at || '');
    // A routine success fades after half an hour; problems stay until dismissed.
    if (R.dismissed === key || (last.state === 'ok' && last.at && Date.now() - Date.parse(last.at) > 30 * 60e3)) { P.hidden = true; return; }
    const when = last.at ? ` · ${agoText(last.at)}` : '';
    const imported = r.imported != null ? `Imported ${nf0.format(r.imported)} new transaction${r.imported === 1 ? '' : 's'}` : '';
    const upto = validIso(r.latest) ? `data up to ${fDayW(dnum(r.latest))}` : '';
    const warns = (r.warnings || []).length ? h('ul', { class: 'fv-warn-list' }, r.warnings.map(w => h('li', { text: w }))) : null;
    if (last.state === 'ok' && !warns) { R.quiet = (r.imported != null ? `Imported ${nf0.format(r.imported)} new` : 'Updated') + (last.at ? ` · ${agoText(last.at)}` : ''); P.hidden = true; return; }
    if (last.state === 'ok') callout('warn', 'triangle-alert', (imported || 'Updated') + (upto ? ', ' + upto : '') + '.', [h('span', { class: 'mute', text: when }), warns], key);
    else if (last.state === 'warning') callout('warn', 'triangle-alert', "Couldn't fetch from your bank.", [' ' + netPlainError(last.error || ''), imported ? h('div', { text: `${imported} from CSVs in the inbox folder${upto ? ', ' + upto : ''}.` }) : null, h('span', { class: 'mute', text: when }), warns], key);
    else callout('danger', 'circle-x', 'The update didn’t finish.', [' ' + netPlainError(last.error || 'Something went wrong. Try again.'), h('span', { class: 'mute', text: when }), warns], key);
  }

