  // @part 44-your-data.js · NEW (2.21.1) · Money > Your data: where every payment comes from, and what counts.
  // GET /api/finance/data (lib/finance-data.mjs). A tick here is the same switch as Connections' Show in Finances
  // (or the choices file for an imported file); the page filter on Transactions stays a view, this changes the analysis.
  // Unticking keeps every row. Nothing is applied until "Update my money", which shows the difference first.
  // Styles: 44-your-data.css. No inline handlers (strict CSP).
  SEC_OPTS.data = { kpis: false, filters: false };
  const YD = { doc: null, loading: false, err: null, off: null, until: null, dups: {}, open: new Set(), loadedFor: 0, prev: null };
  async function ydPost(path, body, signal) {
    const r = await fetch('/api/finance/data' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), cache: 'no-store', signal });
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (!r.ok) { const e = new Error((j && j.error) || 'Freeflo did not answer properly'); e.code = j && j.code; throw e; }
    return j || {};
  }
  function ydTakeDraft(doc) {
    YD.off = new Set((doc.rows || []).filter(r => !r.counted).map(r => r.key));
    YD.until = {};
    for (const r of doc.rows || []) if (r.until) YD.until[r.key] = r.until;
    YD.dups = {};
  }
  function ydDirty() {
    const doc = YD.doc; if (!doc || !YD.off) return 0;
    let n = 0;
    for (const r of doc.rows || []) {
      if (r.counted === YD.off.has(r.key)) n++;
      else if ((r.until || '') !== (YD.until[r.key] || '')) n++;
    }
    return n;
  }
  async function ydLoad(quiet) {
    if (YD.loading) return;
    YD.loading = true;
    if (!quiet) ydPaint();
    try {
      const r = await fetch('/api/finance/data', { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 404 ? 'Restart Freeflo to use this page' : 'Freeflo did not answer properly');
      const doc = await r.json();
      const keep = YD.doc && ydDirty() > 0;
      YD.doc = doc; YD.err = null;
      if (!keep || !YD.off) ydTakeDraft(doc);
    } catch (e) { YD.err = (e && e.message) || 'Freeflo is not answering'; }
    YD.loading = false;
    ydPaint();
  }

  // ── Words ─────────────────────────────────────────────────────────────
  const ydDate = (iso, year) => (iso ? (year ? fDayY(dnum(iso)) : fDay(dnum(iso))) : '');
  function ydWhen(iso) {
    if (!iso) return 'none yet';
    const d = (YD.doc && YD.doc.today ? dnum(YD.doc.today) : localToday()) - dnum(iso);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    return d > 300 ? fDayY(dnum(iso)) : fDay(dnum(iso));
  }
  function ydChip(r) {
    const s = r.status || {};
    const last = `last new payment ${ydWhen(r.to)}`;
    if (s.kind === 'updating') return { tone: 'good', icon: 'refresh-cw', text: r.balanceOnly ? 'Updating' : `Updating: ${last}` };
    if (s.kind === 'file') return { tone: 'plain', icon: 'file-spreadsheet', text: 'One-off file' };
    if (s.kind === 'demo') return { tone: 'plain', icon: 'sparkles', text: 'Example data' };
    if (s.kind === 'reconnect') return { tone: 'warn', icon: 'plug', text: 'Needs you to reconnect' };
    return { tone: 'quiet', icon: 'pause', text: r.count ? `Stopped updating: ${last}` : 'Stopped updating' };
  }
  function ydNext(r) {
    const s = r.status || {};
    const conn = (label) => h('button', { type: 'button', class: 'fv-link', text: label, onclick: () => { if (window.Connections && Connections.open) Connections.open('money'); else setView('connections'); } });
    if (s.kind === 'reconnect') return [s.message || 'Your bank asks you to sign in again every so often.', ' ', conn('Reconnect')];
    if (s.kind !== 'stopped') return null;
    if (s.reason === 'unticked') return ['You unticked this, so Freeflo no longer asks the bank for it. Tick it to start again.'];
    if (s.reason === 'sourceoff') return ['It is switched off. ', conn('Turn it on in Connections')];
    if (s.reason === 'gone') return ['It is not connected any more. ', conn('Connect it again'), ' if you still use it, or leave it as history.'];
    return [s.message ? s.message + ' ' : 'Freeflo has not heard from this bank for a while. ', h('button', { type: 'button', class: 'fv-link', text: 'Update bank', onclick: () => startUpdate({}) })];
  }
  const ydOrigin = (r) => {
    if (r.origin === 'connected') return `Connected to ${r.bank === 'Other banks' ? (r.sourceLabel || 'your bank') : r.bank}`;
    if (r.origin === 'gone') return 'Used to be connected';
    const f = r.files || [];
    if (f.length <= 1) return `From a file you imported${f[0] ? ': ' + f[0] : ''}`;
    return `From ${f.length} files you imported: ${f.slice(0, 3).join(', ')}${f.length > 3 ? ' and more' : ''}`;
  };
  const ydRange = (r) => {
    if (!r.count) return r.balanceOnly ? 'Balance only, no payments' : 'No payments yet';
    const n = `${nf0.format(r.count)} ${r.count === 1 ? 'payment' : 'payments'}`;
    return r.from === r.to ? `${ydDate(r.from, true)} · ${n}` : `${ydDate(r.from, true)} to ${ydDate(r.to, true)} · ${n}`;
  };
  const BANK_TINT = { monzo: '#e8503f', barclays: '#0a84c6', hsbc: '#c8102e', lloyds: '#00733e', natwest: '#5a287d', santander: '#d71920', starling: '#6935d3', revolut: '#23262b', nationwide: '#00338d', halifax: '#0a5aa8', files: 'var(--fg-subtle)', other: 'var(--accent)' };
  const ydTile = (id, label) => h('span', { class: 'yd-tile', style: { background: BANK_TINT[id] || 'var(--accent)' }, 'aria-hidden': 'true' }, id === 'files' ? ic('file-spreadsheet') : id === 'other' ? ic('landmark') : String(label || '?').charAt(0).toUpperCase());
  // An amount that blurs with Hide amounts: on the page by the page's own switch (.fv-amt), in a dialog (outside the page) by Home's.
  const ydAmt = (x) => h('span', { class: 'fv-amt', text: gbp2(x) });
  const ydDlgAmt = (x) => h('span', { class: 'hg-amt' + (bdHidden() ? ' is-hidden' : ''), tabindex: bdHidden() ? '0' : null, text: gbp2(x) });

  // ── The page ──────────────────────────────────────────────────────────
  BUILD.data = (grid) => {
    S.ydHost = h('div', { class: 'yd' });
    grid.append(S.ydHost);
  };
  UPDATE.data = () => {
    if (YD.loadedFor !== R.loadedAt || !YD.doc) { YD.loadedFor = R.loadedAt; ydLoad(!!YD.doc); }
    ydPaint();
  };
  /** Nothing is counted (every source unticked, or the last counted one deleted): Money shows this instead of its welcome. */
  function ydStandalone() {
    S.ydHost = h('div', { class: 'yd yd-alone' });
    F.section = 'data';   // tick something and Money opens back here
    ydLoad();
    return S.ydHost;
  }
  function ydAfterChange() { YD.loadedFor = 0; return load(true).then(() => { if (!R.model || R.sectionId !== 'data') ydLoad(true); }); }
  function ydPaint() {
    const host = S.ydHost; if (!host) return;
    if (host.contains(document.activeElement) && document.activeElement.matches('input,select')) { ydPaintBar(); return; }   // never pull a field from under the typing hand
    if (R.mounted && YD.err && !YD.doc) {
      host.replaceChildren(emptyState({ icon: 'circle-alert', title: 'Couldn’t read your data list', text: `${YD.err}.`, actions: [h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => ydLoad() }, ic('rotate-ccw'), h('span', { text: 'Try again' }))] }));
      return;
    }
    if (!YD.doc) { host.replaceChildren(emptyState({ spinner: true, title: 'Looking at your data', text: 'This takes a moment.' })); return; }
    const d = YD.doc;
    if (d.status === 'waiting') { host.replaceChildren(emptyState({ icon: 'monitor', title: `Your data list comes from ${d.remote.name}`, text: `It appears here once ${d.remote.name} has updated.` })); return; }
    if (d.status === 'empty' || !(d.rows || []).length && !(d.gone || []).length) {
      host.replaceChildren(emptyState({
        icon: 'database', title: 'No money data yet', text: 'Connect your bank, or import a file you downloaded from it. Everything you add is listed here, with where it came from.',
        actions: [
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { if (window.Connections && Connections.open) Connections.open('money'); else setView('connections'); } }, ic('plug'), h('span', { text: 'Connect a bank' })),
          h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => pickCsv() }, ic('upload'), h('span', { text: 'Import a file' })),
        ],
      }));
      return;
    }
    const main = h('div', { class: 'yd-main' });
    const start = h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => ydStartFresh() }, ic('sparkles'), h('span', { text: 'Start fresh' }));
    const list = h('div', { class: 'yd-list' });
    const head = typeof secHead === 'function'
      ? secHead({ title: 'Your data', sub: 'Everything your money figures are worked out from. Untick what should not count.', icon: 'database', actions: [start] })
      : h('h2', { text: 'Your data' });
    main.append(head);
    const fresh = ydFreshness(d); if (fresh) main.append(fresh);
    for (const el of ydBanners(d)) main.append(el);
    S.ydBar = h('div', { class: 'yd-bar', role: 'status', hidden: true });
    main.append(S.ydBar);
    const ov = ydOverlaps(d); if (ov) main.append(ov);
    const notes = ydNotes(d.notes); if (notes) main.append(notes);
    const groups = new Map();
    for (const r of d.rows) { if (!groups.has(r.bankId)) groups.set(r.bankId, { id: r.bankId, label: r.bank, rows: [] }); groups.get(r.bankId).rows.push(r); }
    const order = [...groups.values()].sort((a, b) => ydGroupRank(a) - ydGroupRank(b) || a.label.localeCompare(b.label));
    for (const g of order) {
      list.append(h('section', { class: 'yd-group', 'aria-label': g.label },
        h('h3', { class: 'yd-group-h' }, ydTile(g.id, g.label), h('span', { text: g.label }), h('small', { text: `${nf0.format(g.rows.reduce((t, r) => t + r.count, 0))} payments` })),
        g.rows.map(ydRow)));
    }
    main.append(list);
    const gone = ydGone(d); if (gone) main.append(gone);
    if (d.paths) {
      main.append(h('details', { class: 'yd-where' }, h('summary', { text: 'Where the files live' }),
        h('p', { text: `Everything stays on this computer, in ${d.paths.folder}.` }),
        h('p', { text: `All payments: ${d.paths.store}` }),
        h('p', { text: `Safety copies, kept for 30 days: ${d.paths.copies}` })));
    }
    const side = h('div', { class: 'yd-side' }, ydSummary(d), ydHow(d));
    const layout = typeof pageLayout === 'function' ? pageLayout({ main, side, sideWidth: 300, sticky: true, cls: 'yd-layout' }) : h('div', {}, main, side);
    host.replaceChildren(layout);
    if (typeof multiPick === 'function') {
      S.ydPick = multiPick(list, {
        key: 'fin-data', rows: '.yd-row', idOf: (x) => x.dataset.key, nameOf: (x) => x.dataset.name, noun: ['source', 'sources'],
        actions: () => [
          { label: 'Don’t count these', icon: 'eye-off', run: (ids) => { ids.forEach(k => YD.off.add(k)); ydPaint(); } },
          { label: 'Count these', icon: 'eye', run: (ids) => { ids.forEach(k => YD.off.delete(k)); ydPaint(); } },
        ],
      });
      if (start.parentElement) start.parentElement.insertBefore(S.ydPick.button({ cls: 'btn btn-ghost' }), start);
    }
    ydPaintBar();
  }
  const ydGroupRank = (g) => (g.rows.some(r => r.status && r.status.kind === 'updating') ? 0 : g.id === 'files' ? 3 : g.id === 'other' ? 2 : 1);

  function ydRow(r) {
    const off = YD.off.has(r.key);
    const chip = ydChip(r);
    const next = ydNext(r);
    const untilOpen = YD.open.has(r.key);
    const tick = h('input', { type: 'checkbox', class: 'yd-check' });
    tick.checked = !off;
    tick.addEventListener('change', () => {
      if (tick.checked) YD.off.delete(r.key); else YD.off.add(r.key);
      delete YD.dups[r.key];
      row.classList.toggle('is-off', !tick.checked);
      ydPaintBar();
    });
    const until = YD.until[r.key];
    const row = h('article', { class: 'yd-row' + (off ? ' is-off' : ''), 'data-key': r.key, 'data-name': r.name },
      h('div', { class: 'yd-row-top' },
        h('div', { class: 'yd-row-t' }, h('strong', { text: r.name }), h('span', { class: 'yd-origin', text: ydOrigin(r) })),
        h('span', { class: 'yd-chip ' + chip.tone }, ic(chip.icon), h('span', { text: chip.text }))),
      h('div', { class: 'yd-meta' }, h('span', { text: ydRange(r) }), r.balance != null ? h('span', {}, 'Balance ', ydAmt(r.balance)) : null),
      next ? h('p', { class: 'yd-next' }, next) : null,
      until ? h('p', { class: 'yd-until-note' }, ic('calendar-days'), `Counted up to ${ydDate(until, true)}. Older payments stay in your long-term trends.`) : null,
      h('div', { class: 'yd-acts' },
        h('label', { class: 'yd-tick' }, tick, h('span', { text: 'Count this in my money' })),
        h('span', { class: 'yd-acts-gap' }),
        R.model && R.model.accts.includes(r.key) ? h('button', { type: 'button', class: 'fv-link', text: 'See its payments', onclick: () => { F.accts = [r.key]; F.preset = 'All'; saveF(); setSection('transactions'); } }) : null,
        r.count ? h('button', { type: 'button', class: 'fv-link', 'aria-expanded': String(untilOpen), text: 'Only count up to a date', onclick: () => { if (YD.open.has(r.key)) YD.open.delete(r.key); else YD.open.add(r.key); ydPaint(); } }) : null,
        h('button', { type: 'button', class: 'btn-icon yd-more', 'aria-label': `More for ${r.name}`, onclick: (e) => ydMore(e.currentTarget, r) }, ic('ellipsis'))),
      untilOpen ? ydUntil(r) : null);
    return row;
  }
  function ydUntil(r) {
    const input = h('input', { type: 'date', class: 'input yd-date', 'aria-label': `Last day to count for ${r.name}`, value: YD.until[r.key] || '', min: r.from || null, max: r.to || null });
    input.addEventListener('change', () => { if (input.value) YD.until[r.key] = input.value; else delete YD.until[r.key]; ydPaintBar(); });
    // The day the bank you moved to starts: the first payment on a source of another bank that still counts.
    const others = (YD.doc.rows || []).filter(x => x.bankId !== r.bankId && x.count && !YD.off.has(x.key) && x.from && x.from > (r.from || ''));
    const pick = others.filter(x => x.status && x.status.kind === 'updating').concat(others)[0];
    return h('div', { class: 'yd-until' },
      h('p', { text: 'Payments up to this day stay in your long-term trends. Later ones, and this account’s balance, stop counting, so nothing is counted twice after you move banks.' }),
      h('div', { class: 'yd-until-c' },
        h('label', {}, 'Only count up to ', input),
        pick ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: `Stop counting from the day ${pick.bank === 'Files you imported' ? pick.name : pick.bank} starts`, onclick: () => { YD.until[r.key] = diso(dnum(pick.from) - 1); ydPaint(); } }) : null,
        YD.until[r.key] ? h('button', { type: 'button', class: 'fv-link', text: 'Count everything', onclick: () => { delete YD.until[r.key]; ydPaint(); } }) : null));
  }
  function ydMore(anchor, r) {
    const items = [];
    if (r.count && !(YD.doc && YD.doc.remote)) items.push({ label: 'Download its payments', icon: 'download', run: () => ydDownload(r) });
    items.push({ label: 'Delete this data for good', icon: 'trash-2', danger: true, run: () => ydDelete(r) });
    if (typeof openMenu === 'function') openMenu(anchor, items, { align: 'end' });
    else items[0].run();
  }
  function ydDownload(r) {
    const a = h('a', { href: '/api/finance/data/download?key=' + encodeURIComponent(r.key), download: '' });
    document.body.append(a); a.click(); a.remove();
  }
  function ydFreshness(d) {
    if (!d.newest) return null;
    const today = d.today ? dnum(d.today) : localToday();
    const days = today - dnum(d.newest);
    if (days < 7) return null;
    return h('p', { class: 'yd-fresh', role: 'status' }, ic('clock'), `Your newest payment is from ${ydDate(d.newest, days > 300)}, ${nf0.format(days)} days ago. `,
      d.hasBank ? h('button', { type: 'button', class: 'fv-link', text: 'Update bank', onclick: () => startUpdate({}) }) : h('button', { type: 'button', class: 'fv-link', text: 'Import a newer file', onclick: () => pickCsv() }));
  }
  function ydBanners(d) {
    const out = [];
    if (d.lastDelete) {
      const g = d.lastDelete;
      out.push(h('div', { class: 'yd-undo' }, ic('trash-2'),
        h('span', { text: `Deleted ${g.name}: ${nf0.format(g.count || 0)} payments. A safety copy stays for 30 days, then it goes too.` }),
        h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Undo', onclick: (e) => ydRestore({ token: g.token }, e.currentTarget) }),
        h('button', { type: 'button', class: 'fv-link', text: 'Delete the copy now', onclick: async () => { try { await ydPost('/purge', { token: g.token }); toast('The safety copy is gone.', { kind: 'ok', icon: 'circle-check' }); ydLoad(true); } catch (e) { toastErr('delete the copy', e); } } })));
    }
    if (d.undo) {
      out.push(h('div', { class: 'yd-undo' }, ic('undo-2'),
        h('span', { text: 'Your money was just updated with these ticks. Nothing was deleted.' }),
        h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Undo', onclick: (e) => ydUndo(e.currentTarget) })));
    }
    return out;
  }
  function ydNoteText(n) {
    const on = n.stillOn && n.stillOn !== n.bank ? n.stillOn : 'your other bank';
    return n.kind === 'pay'
      ? `Your salary (${n.name}) was only seen on ${n.bank}: is it on ${on} now?`
      : `${n.name} was only seen on ${n.bank}. If you pay it from ${on} now, it shows up by itself after a payment or two.`;
  }
  function ydNotes(notes) {
    if (!Array.isArray(notes) || !notes.length) return null;
    return h('ul', { class: 'yd-notes' }, notes.map(n => h('li', {}, ic(n.kind === 'pay' ? 'wallet' : 'receipt'), h('span', { text: ydNoteText(n) }))));
  }
  function ydOverlaps(d) {
    const list = d.overlaps || [];
    if (!list.length) return null;
    return h('div', { class: 'yd-dups' },
      h('h3', { text: 'The same payments, twice' }),
      list.map(o => h('div', { class: 'yd-dup' },
        h('p', { text: `${o.a.name} and ${o.b.name} share ${Math.round(o.share * 100)}% of their payments (same day, same amount), so they are probably one account counted twice. Which should stay?` }),
        h('div', { class: 'yd-dup-c' },
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: `Keep ${o.a.name}`, onclick: () => ydKeep(o.a.key, o.b.key) }),
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: `Keep ${o.b.name}`, onclick: () => ydKeep(o.b.key, o.a.key) })))));
  }
  function ydKeep(keep, drop) {
    YD.off.add(drop); YD.off.delete(keep); YD.dups[drop] = keep;
    ydReview('Keep one copy');
  }
  function ydSummary(d) {
    const on = (d.rows || []).filter(r => r.counted);
    const n = on.reduce((t, r) => t + r.count, 0);
    return h('div', { class: 'yd-sum' },
      h('b', { text: nf0.format(n) }), h('span', { text: n === 1 ? 'payment counted' : 'payments counted' }),
      h('small', { text: `from ${on.length} of your ${(d.rows || []).length} sources` }),
      d.other && d.other.count ? h('small', { text: `${nf0.format(d.other.count)} marked as money between your accounts` }) : null);
  }
  function ydHow(d) {
    const rm = d.remote;
    return h('div', { class: 'yd-how' },
      h('h3', { text: 'How this works' }),
      h('ul', {},
        h('li', { text: 'Untick something and press Update my money. Everything, from Home to the brief, then counts only what is ticked.' }),
        h('li', { text: 'Unticking never deletes. Tick it again any time.' }),
        h('li', { text: 'Your rules, categories and budgets stay as they are.' }),
        h('li', { text: rm ? `${rm.name} keeps your payments and does the updating. Your ticks reach it by themselves.` : 'Your ticks follow you to your other computers, and they show the same numbers.' })));
  }
  function ydGone(d) {
    if (!(d.gone || []).length) return null;
    return h('div', { class: 'yd-gone' }, h('h3', { text: 'Deleted, and staying deleted' }),
      d.gone.map(g => h('p', {}, h('span', { text: `${g.name}${g.bank ? ' (' + g.bank + ')' : ''}: ${g.disconnected ? 'disconnected too.' : 'Freeflo ignores it, even if the bank still sends it.'} ` }),
        d.remote ? null : h('button', { type: 'button', class: 'fv-link', text: 'Bring it back', onclick: (e) => ydRestore({ key: g.key }, e.currentTarget) }))));
  }

  // ── The bar: what you changed, and the one button ─────────────────────
  function ydPaintBar() {
    const bar = S.ydBar; if (!bar) return;
    const n = ydDirty();
    bar.hidden = !n;
    if (!n) { bar.replaceChildren(); return; }
    bar.replaceChildren(
      h('span', { text: n === 1 ? 'You changed one thing.' : `You changed ${n} things.` }),
      h('button', { type: 'button', class: 'btn btn-primary', text: 'Update my money', onclick: () => ydReview() }),
      h('button', { type: 'button', class: 'fv-link', text: 'Put it back', onclick: () => { ydTakeDraft(YD.doc); ydPaint(); } }));
  }
  const ydChoice = (label) => ({ off: [...YD.off], until: { ...YD.until }, dups: { ...YD.dups }, label: label || null });
  /** "Your money will show 412 fewer payments...": the same check for every change. */
  function ydReview(label) {
    const ac = typeof AbortController === 'function' ? new AbortController() : null;
    const choice = ydChoice(label);
    let box = null, foot = null, closeIt = null, gone = false;
    const lay = (kids, btns) => { box.replaceChildren(...kids.flat().filter(Boolean)); foot.replaceChildren(...btns.filter(Boolean)); };
    const wait = (text, onCancel) => lay([h('p', { class: 'yd-wait' }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), text)], [h('button', { type: 'button', class: 'btn btn-secondary', text: 'Cancel', onclick: onCancel })]);
    openDialog({
      title: 'Check before updating', size: 'md', className: 'yd-dialog',
      onClose: () => { gone = true; if (ac) ac.abort(); },
      body: (el, close) => { box = h('div', { class: 'yd-review' }); foot = h('div', { class: 'modal-f' }); el.append(box, foot); closeIt = close; },
    });
    const fail = (e) => lay([h('p', { class: 'yd-err', text: `That didn’t work: ${(e && e.message) || 'Freeflo is not answering'}. Nothing has changed.` })],
      [h('button', { type: 'button', class: 'btn btn-secondary', text: 'Close', onclick: () => closeIt() }), h('button', { type: 'button', class: 'btn btn-primary', text: 'Try again', onclick: () => { closeIt(); ydReview(label); } })]);
    wait('Working out the difference…', () => closeIt());
    ydPost('/preview', choice, ac ? ac.signal : undefined).then((p) => {
      if (gone) return;
      const lines = ydReviewLines(p);
      lay(lines, [
        h('button', { type: 'button', class: 'btn btn-secondary', text: 'Not now', onclick: () => closeIt() }),
        h('button', { type: 'button', class: 'btn btn-primary', disabled: !!p.empty, text: p.approx ? 'Send the change' : 'Update my money', onclick: () => run(p) }),
      ]);
    }).catch((e) => { if (!gone) fail(e); });
    async function run(p) {
      let cancelled = false;
      wait(p.approx ? 'Sending it to your other computer…' : 'Updating your money…', () => { cancelled = true; wait('Putting it back…', () => {}); foot.querySelector('button').disabled = true; });
      const prev = { off: (YD.doc.rows || []).filter(r => !r.counted).map(r => r.key), until: Object.fromEntries((YD.doc.rows || []).filter(r => r.until).map(r => [r.key, r.until])), dups: {} };
      try {
        const r = await ydPost('/apply', choice);
        if (cancelled && !r.remote) {
          await ydPost('/undo');
          YD.off = null;   // back to what is saved: the ticks too
          await ydAfterChange();
          if (!gone) closeIt();
          toast('Left as it was.', { kind: 'ok', icon: 'circle-check' });
          return;
        }
        if (r.remote) {
          YD.prev = prev;
          if (!gone) closeIt();
          toast(`Sent to ${r.remote.name}. Your money changes as soon as it has updated.`, { kind: 'ok', icon: 'send', action: 'Undo', onAction: () => { const q = YD.prev; ydPost('/apply', q).then(() => { ydLoad(true); }).catch(e => toastErr('undo that', e)); } });
          await ydLoad(true);
          return;
        }
        await ydAfterChange();
        if (!gone) closeIt();
        toast('Your money is updated.', { kind: 'ok', icon: 'circle-check', action: 'Undo', onAction: () => ydUndo() });
      } catch (e) {
        if (e.code === 'BUSY') lay([h('p', { class: 'yd-err', text: e.message + ' Nothing has changed.' })], [h('button', { type: 'button', class: 'btn btn-secondary', text: 'Close', onclick: () => closeIt() }), h('button', { type: 'button', class: 'btn btn-primary', text: 'Try again', onclick: () => run(p) })]);
        else fail(e);
      }
    }
  }
  function ydReviewLines(p) {
    if (p.approx) {
      return [
        h('p', { class: 'yd-big', text: p.fewer > 0 ? `Your money will show ${nf0.format(p.fewer)} fewer payments.` : p.fewer < 0 ? `Your money will show ${nf0.format(-p.fewer)} more payments.` : 'Your ticks will change.' }),
        h('p', { text: `${p.host} keeps your payments, so it does the sums. The other numbers change here as soon as it has updated, the next time it is on.` }),
        h('p', { class: 'yd-safe' }, ic('shield-check'), 'Nothing is deleted. You can tick it again any time.'),
      ];
    }
    if (p.empty) return [h('p', { class: 'yd-big', text: 'That would leave nothing to count.' }), h('p', { text: 'Keep at least one thing ticked. To remove everything for good, delete each one from its More menu.' })];
    const a = p.before, b = p.after, out = [];
    const f = p.fewer;
    out.push(h('p', { class: 'yd-big', text: f > 0 ? `Your money will show ${nf0.format(f)} fewer ${f === 1 ? 'payment' : 'payments'}.` : f < 0 ? `Your money will show ${nf0.format(-f)} more ${f === -1 ? 'payment' : 'payments'}.` : 'The same payments stay; what they count as changes.' }));
    const move = (label, x, y) => (Math.abs(x - y) < 0.005 ? h('li', {}, `${label} stays at `, ydDlgAmt(x), '.') : h('li', {}, `${label} goes from `, ydDlgAmt(x), ' to ', ydDlgAmt(y), '.'));
    out.push(h('ul', { class: 'yd-moves' },
      move('This month’s spending', a.monthSpend, b.monthSpend),
      move('Money in this month', a.monthIncome, b.monthIncome),
      a.balance != null || b.balance != null ? move('Your total balance', a.balance || 0, b.balance || 0) : null,
      a.bills !== b.bills ? h('li', { text: `Regular bills found: ${nf0.format(a.bills)} becomes ${nf0.format(b.bills)}.` }) : null));
    if (p.otherAccount && p.otherAccount.count) {
      out.push(h('p', { class: 'yd-transfers' }, ic('repeat'), h('span', {}, `${nf0.format(p.otherAccount.count)} ${p.otherAccount.count === 1 ? 'payment moved' : 'payments moved'} money between your own accounts. They stay marked as “Money from your other account”, not income or spending.`)));
    }
    if ((p.notes || []).length) out.push(ydNotes(p.notes));
    out.push(h('p', { class: 'yd-safe' }, ic('shield-check'), 'Nothing is deleted. You can tick it again any time, and press Undo straight after.'));
    return out;
  }
  async function ydUndo(btn) {
    if (btn) btn.disabled = true;
    try { await ydPost('/undo'); YD.off = null; await ydAfterChange(); toast('Back as it was.', { kind: 'ok', icon: 'undo-2' }); }
    catch (e) { toastErr('undo that', e, () => ydUndo()); if (btn) btn.disabled = false; }
  }
  async function ydRestore(body, btn) {
    if (btn) btn.disabled = true;
    try {
      const r = await ydPost('/restore', body);
      YD.off = null;
      await ydAfterChange();
      toast(r.restored ? `${nf0.format(r.restored)} payments are back.` : 'It can come in again. Press Update bank to fetch it.', { kind: 'ok', icon: 'undo-2' });
    } catch (e) { toastErr('bring it back', e); if (btn) btn.disabled = false; }
  }

  // ── Start fresh ───────────────────────────────────────────────────────
  function ydStartFresh() {
    const d = YD.doc;
    const banks = new Map();
    for (const r of d.rows) { if (!banks.has(r.bankId)) banks.set(r.bankId, { id: r.bankId, label: r.bank, rows: [] }); banks.get(r.bankId).rows.push(r); }
    const boxes = new Map();
    let keepOld = null;
    openDialog({
      title: 'Start fresh', size: 'sm', className: 'yd-dialog',
      body: (el, close) => {
        const go = h('button', { type: 'button', class: 'btn btn-primary', text: 'See what changes', onclick: () => {
          const kept = [...banks.values()].filter(b => boxes.get(b.id).checked);
          if (!kept.length) { toast('Tick at least one bank.', { bad: true }); return; }
          const firstKept = kept.flatMap(b => b.rows).map(r => r.from).filter(Boolean).sort()[0];
          const keepKeys = new Set(kept.flatMap(b => b.rows).map(r => r.key));
          YD.off = new Set(); YD.until = {};
          for (const r of d.rows) {
            if (keepKeys.has(r.key)) continue;
            if (keepOld.checked && r.count && firstKept && r.from && r.from < firstKept) YD.until[r.key] = diso(dnum(firstKept) - 1);
            else YD.off.add(r.key);
          }
          close();
          ydPaint();
          ydReview('Start fresh');
        } });
        el.append(
          h('p', { class: 'yd-big', text: 'Which banks do you still use?' }),
          h('div', { class: 'yd-fresh-list' }, [...banks.values()].map(b => {
            const box = h('input', { type: 'checkbox', class: 'yd-check' });
            box.checked = b.rows.some(r => r.status && r.status.kind === 'updating');
            boxes.set(b.id, box);
            return h('label', { class: 'yd-fresh-row' }, box, ydTile(b.id, b.label), h('span', {}, h('b', { text: b.label }), h('small', { text: `${nf0.format(b.rows.reduce((t, r) => t + r.count, 0))} payments` })));
          })),
          h('label', { class: 'yd-tick yd-keep-old' }, (keepOld = h('input', { type: 'checkbox', class: 'yd-check' })), h('span', { text: 'Keep the others’ older payments in my long-term trends, up to the day these start' })),
          h('p', { class: 'yd-safe' }, ic('shield-check'), 'Nothing is deleted. Everything else is just unticked, and you see the difference first.'),
          h('div', { class: 'modal-f' }, h('button', { type: 'button', class: 'btn btn-secondary', text: 'Cancel', onclick: () => close() }), go));
      },
    });
  }

  // ── Delete for good ───────────────────────────────────────────────────
  function ydDelete(r) {
    if (YD.doc && YD.doc.remote) { toast(`Your payments are kept on ${YD.doc.remote.name}. Open Freeflo there to delete them.`, {}); return; }
    let disc = null;
    openDialog({
      title: `Delete ${r.name} for good?`, size: 'sm', className: 'yd-dialog',
      body: (el, close) => {
        const del = h('button', { type: 'button', class: 'btn btn-danger', text: 'Delete for good', onclick: async () => {
          del.disabled = true; del.textContent = 'Deleting…';
          try {
            const out = await ydPost('/delete', { key: r.key, disconnect: !!(disc && disc.checked) });
            YD.off = null;
            close();
            await ydAfterChange();
            toast(`${r.name} is deleted.`, { kind: 'ok', icon: 'trash-2', action: 'Undo', onAction: () => ydRestore({ token: out.token }) });
          } catch (e) {
            del.disabled = false; del.textContent = 'Delete for good';
            box.replaceChildren(h('p', { class: 'yd-err', text: `It was not deleted: ${e.message}` }));
          }
        } });
        const box = h('div');
        el.append(
          h('p', { text: 'This removes it from Freeflo. Unticking is usually enough, because that keeps it safe in case you want it back.' }),
          h('h4', { class: 'yd-h4', text: 'What goes' }),
          h('ul', { class: 'yd-moves' },
            h('li', { text: ydRange(r) + '.' }),
            r.balance != null ? h('li', {}, 'Its balance of ', ydDlgAmt(r.balance), '.') : null,
            h('li', { text: 'The bank’s own categories and places for these payments.' })),
          h('h4', { class: 'yd-h4', text: 'What stays' }),
          h('p', { text: 'Your rules, categories, budgets and everything from your other banks. A safety copy is saved first and kept for 30 days, then it goes too.' }),
          r.count ? h('p', {}, h('button', { type: 'button', class: 'fv-link', onclick: () => ydDownload(r) }, ic('download'), ' Download its payments first')) : null,
          r.origin === 'connected' ? h('label', { class: 'yd-tick yd-disc' }, (disc = h('input', { type: 'checkbox', class: 'yd-check' })), h('span', { text: `Disconnect ${r.bank === 'Other banks' ? 'this bank' : r.bank} too, so it stops updating` })) : null,
          r.origin === 'connected' ? h('p', { class: 'yd-small', text: 'Either way it won’t come back by itself: Freeflo ignores it until you bring it back here or connect it again.' }) : null,
          box,
          h('div', { class: 'modal-f' }, h('button', { type: 'button', class: 'btn btn-secondary', text: 'Keep it', onclick: () => close() }), del));
        if (disc) disc.checked = true;
      },
    });
  }
