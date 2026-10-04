  // @part 37-transactions.js · OWNER: C2 (Transactions section: day-grouped list, toolbar, row detail, CSV export)
  // ----- Transactions -----
  // Grouped by day under sticky headers (the day's money in and spending,
  // and the balance that evening when the bank reported it). Each row: the
  // merchant tile, the category and how the money moved, the amount. A row
  // opens in place (FLIP, transform only) to show the bank's description,
  // the category picker, the type and the merchant's last months. Rows are
  // added as you scroll, 150 at a time. Rows that came in since the last
  // visit carry a soft highlight.
  const TX_CHUNK = 150;
  const TX_SEEN_KEY = 'dash-finance-seen-v1';
  BUILD.transactions = g => {
    S.tx = card(g, { title: 'Transactions', span: 12, cls: 'fv-tx-card' });
    S.txFirst = true;
  };
  UPDATE.transactions = ctx => txTable(S.tx, ctx);
  function txRows(ctx) {
    const rows = ctx.cur.spend.concat(F.inc ? ctx.cur.income : [], F.xfer ? ctx.cur.xfer : []);
    const { key, dir } = F.sort;
    const val = { d: x => x.n, m: x => x.m.toLowerCase(), c: x => x.c, acct: x => x.acct, a: x => x.a };
    const f = val[key] || val.d;
    return rows.sort((p, q) => { const a = f(p), b = f(q); return (a < b ? -1 : a > b ? 1 : 0) * dir || q.n - p.n || p.i - q.i; });
  }
  // The list as shown: txRows plus this view's own Money in / out and type filters.
  function txVisible(ctx) {
    let rows = txRows(ctx);
    if (R.txFlow === 'in') rows = rows.filter(x => x.a > 0);
    else if (R.txFlow === 'out') rows = rows.filter(x => x.a < 0);
    if (R.txKinds && R.txKinds.size) rows = rows.filter(x => R.txKinds.has(VK.kind(x)));
    return rows;
  }
  const TX_SORTS = [['d-1', 'Newest first', { key: 'd', dir: -1 }], ['d1', 'Oldest first', { key: 'd', dir: 1 }], ['a1', 'Largest out', { key: 'a', dir: 1 }], ['a-1', 'Largest in', { key: 'a', dir: -1 }], ['m1', 'Merchant A–Z', { key: 'm', dir: 1 }], ['c1', 'Category A–Z', { key: 'c', dir: 1 }]];
  function txBuildBar(cd) {
    S.txSearch = h('input', { type: 'search', class: 'fv-input', placeholder: 'Search merchants, descriptions, categories…', 'aria-label': 'Search transactions' });
    let qt = 0;
    S.txSearch.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { F.q = S.txSearch.value; R.page = 0; changed(); }, 220); });
    S.txFlowSeg = seg([['all', 'All'], ['in', 'Money in'], ['out', 'Money out']], R.txFlow || 'all', v => { R.txFlow = v; S.txFlowSeg.set(v); txTable(cd, R.ctx); }, 'Money in or out');
    S.txCatBtn = h('button', { type: 'button', class: 'fv-btn fv-menu-btn', 'aria-haspopup': 'true', onclick: e => txCatMenu(e.currentTarget) }, ic('layout-grid'), h('span', { class: 'l', text: 'Category' }), ic('chevron-down'));
    S.txKindBtn = h('button', { type: 'button', class: 'fv-btn fv-menu-btn', 'aria-haspopup': 'true', onclick: e => txKindMenu(e.currentTarget) }, ic('credit-card'), h('span', { class: 'l', text: 'Type' }), ic('chevron-down'));
    S.txSortBtn = h('button', { type: 'button', class: 'fv-btn fv-menu-btn', 'aria-haspopup': 'true', onclick: e => txSortMenu(e.currentTarget) }, ic('arrow-up-down'), h('span', { class: 'l' }), ic('chevron-down'));
    S.txCount = h('span', { class: 'fv-tx-count' });
    S.txExport = h('button', { type: 'button', class: 'fv-btn ghost', 'data-tip': 'The transactions shown, as a CSV file', onclick: () => exportCsv(txVisible(R.ctx), R.ctx) }, ic('download'), h('span', { text: 'CSV' }));
    S.txBar = h('div', { class: 'fv-tx-tools' },
      h('div', { class: 'fv-tx-search' }, ic('search'), S.txSearch),
      h('div', { class: 'fv-tx-ctl' }, S.txFlowSeg.el, S.txCatBtn, S.txKindBtn, S.txSortBtn, h('span', { class: 'fv-grow' }), S.txCount, S.txExport));
    S.txList = h('div', { class: 'fv-txl', role: 'list', 'aria-label': 'Transactions' });
    S.txMore = h('div', { class: 'fv-tx-more', 'aria-hidden': 'true' });
    cd.body.append(S.txBar, S.txList, S.txMore);
    S.txList.addEventListener('click', e => {
      if (e.target.closest('select,button,input,a,.fv-txx')) return;
      const row = e.target.closest('.fv-txr'); if (row) txToggle(row);
    });
    S.txList.addEventListener('keydown', e => {
      const row = e.target.closest && e.target.closest('.fv-txr'); if (!row || e.target !== row) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); txToggle(row); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const all = [...S.txList.querySelectorAll('.fv-txr')]; const i = all.indexOf(row);
        const nx = all[i + (e.key === 'ArrowDown' ? 1 : -1)]; if (nx) nx.focus();
      } else if (e.key === 'Escape' && row.getAttribute('aria-expanded') === 'true') { e.stopPropagation(); txToggle(row); }
    });
    txStickyTop();
  }
  // The day headers stick just under the Finances bar, whatever its height.
  function txStickyTop() {
    const st = R.els && R.els.sticky; if (!st || !R.root) return;
    const set = () => { const top = parseFloat(getComputedStyle(st).top) || 0; const pos = getComputedStyle(st).position; R.root.style.setProperty('--fv-stick', (pos === 'sticky' ? Math.max(0, st.offsetHeight + top) : 0) + 'px'); };
    set();
    if (typeof ResizeObserver !== 'undefined' && R.c2StickRo !== st) { R.c2StickRo = st; new ResizeObserver(set).observe(st); }
  }
  // Rows that arrived since the last visit to this list (first visit: none).
  function txNewSet(M) {
    if (M._vkNew) return M._vkNew;
    let seen = null;
    try { seen = JSON.parse(localStorage.getItem(TX_SEEN_KEY) || 'null'); } catch (e) { seen = null; }
    M._vkNew = VL.unseen(M.tx, seen);
    const since = M.anchor - 60;
    try { localStorage.setItem(TX_SEEN_KEY, JSON.stringify({ since, keys: M.tx.filter(x => x.n >= since).map(x => x.k), at: new Date(Date.now()).toISOString() })); } catch (e) { /* quota or private mode */ }
    return M._vkNew;
  }
  function txBalances(M) {
    if (!M._vkBal) { M._vkBal = new Map(); for (const b of Array.isArray(M.a.balance_history) ? M.a.balance_history : []) if (b && validIso(b.date) && isFinite(+b.total)) M._vkBal.set(dnum(b.date), +b.total); }
    return M._vkBal;
  }
  function txTable(cd, ctx) {
    const M = ctx.M;
    if (!S.txBar) txBuildBar(cd);
    if (document.activeElement !== S.txSearch) S.txSearch.value = F.q;
    const rows = txVisible(ctx);
    const out = sum(rows.filter(x => x.a < 0), x => -x.a), inn = sum(rows.filter(x => x.a > 0), x => x.a);
    cd.setSub(`${nf0.format(rows.length)} shown · ${gbp2(out)} out · ${gbp2(inn)} in`);
    S.txCount.textContent = `${nf0.format(rows.length)} transaction${rows.length === 1 ? '' : 's'}`;
    // Toolbar state
    const sk = (TX_SORTS.find(s => s[2].key === F.sort.key && s[2].dir === F.sort.dir) || TX_SORTS[0]);
    S.txSortBtn.querySelector('.l').textContent = sk[1];
    const nc = F.cats.length, nk = R.txKinds ? R.txKinds.size : 0;
    S.txCatBtn.querySelector('.l').textContent = nc === 1 ? F.cats[0] : nc ? `${nc} categories` : 'Category';
    S.txCatBtn.classList.toggle('on', !!nc);
    S.txKindBtn.querySelector('.l').textContent = nk === 1 ? VK.kindInfo([...R.txKinds][0]).label : nk ? `${nk} types` : 'Type';
    S.txKindBtn.classList.toggle('on', !!nk);
    S.txFlowSeg.set(R.txFlow || 'all');
    // List
    const first = S.txFirst && !MK.reduced(); S.txFirst = false;
    S.txAll = rows; S.txShown = 0; S.txByDate = F.sort.key === 'd';
    S.txDays = new Map(S.txByDate ? VL.dayGroups(rows).map(d => [d.n, d]) : []);
    S.txNew = txNewSet(M);
    S.txEnter = first;
    S.txList.innerHTML = ''; S.txGroupEl = null;
    S.txList.classList.toggle('flat', !S.txByDate);
    if (!rows.length) { cd.setEmpty('No transactions match these filters.'); S.txMore.hidden = true; return; }
    cd.setEmpty(null);
    txRenderMore(TX_CHUNK);
    if (!first && typeof S.txList.animate === 'function' && !MK.reduced()) S.txList.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    // An open row stays open across updates (if it is still listed).
    if (R.expanded) { const row = S.txList.querySelector(`.fv-txr[data-k="${cssKey(R.expanded)}"]`); if (row) txOpen(row, true); else R.expanded = null; }
    txWatchMore();
  }
  const cssKey = k => String(k).replace(/["\\]/g, '');
  function txDayLabel(n, anchor) {
    if (n === anchor) return 'Today';
    if (n === anchor - 1) return 'Yesterday';
    if (anchor - n < 7 && n < anchor) return fd(n, { weekday: 'long' });
    return fd(n, { weekday: 'long' });
  }
  function txRenderMore(count) {
    const rows = S.txAll; if (!rows) return;
    const M = R.model; const G = VK.groups(M); const bal = txBalances(M);
    const start = S.txShown, end = Math.min(rows.length, start + count);
    const yr = dobj(M.anchor).getUTCFullYear();
    const showAcct = M.accts.length > 1;
    let gi = S.txList.children.length;
    for (let i = start; i < end; i++) {
      const x = rows[i];
      if (S.txByDate && (!S.txGroupEl || S.txGroupEl._n !== x.n)) {
        const d = S.txDays.get(x.n) || { spent: 0, inc: 0 };
        const b = bal.get(x.n);
        const head = h('div', { class: 'fv-dg-h', role: 'presentation' },
          h('span', { class: 'dn', text: txDayLabel(x.n, M.anchor) }),
          h('span', { class: 'dd', text: fd(x.n, dobj(x.n).getUTCFullYear() === yr ? { weekday: 'short', day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }),
          h('span', { class: 'sp' }),
          h('span', { class: 'dt' }, d.inc > 0.004 ? [h('b', { class: 'in', text: '+' + gbp2(d.inc) }), ' in · '] : null, h('b', { text: gbp2(Math.max(0, d.spent)) }), ' spent'),
          b != null ? h('span', { class: 'bal', title: 'Balance across your accounts that day', text: 'balance ' + gbp2(b) }) : null);
        S.txGroupEl = h('div', { class: 'fv-dg' + (S.txEnter && gi < 8 ? ' enter' : ''), role: 'group', 'aria-label': fDayLong(x.n), style: { '--i': Math.min(gi, 8) } }, head);
        S.txGroupEl._n = x.n;
        S.txList.append(S.txGroupEl); gi++;
      } else if (!S.txByDate && !S.txGroupEl) {
        S.txGroupEl = h('div', { class: 'fv-dg flat' }); S.txList.append(S.txGroupEl);
      }
      S.txGroupEl.append(txRow(x, G, showAcct, !S.txByDate));
    }
    S.txShown = end;
    // Days added while scrolling rise into view (once each); the first page has its own entrance.
    if (start > 0) MK.inView(S.txList, { sel: ':scope > .fv-dg', step: 40, max: 240, distance: 10 });
    else S.txList.querySelectorAll(':scope > .fv-dg').forEach(el => MK.once(el, 'iv'));
    S.txMore.hidden = end >= rows.length;
    S.txMore.textContent = end >= rows.length ? '' : `${nf0.format(rows.length - end)} more`;
  }
  function txRow(x, G, showAcct, withDate) {
    const M = R.model;
    const kind = VK.kind(x);
    const isNew = S.txNew && S.txNew.has(x.k);
    const sel = isSelMerchant(x.m);
    const name = G.label(G.keyOf(x.m));
    const row = h('div', { class: 'fv-txr fsym-host' + (x.kind !== 'spend' ? ' alt' : '') + (isNew ? ' is-new' : '') + (sel ? ' is-current' : ''), role: 'listitem', tabindex: '0', 'aria-expanded': 'false', 'data-k': x.k,
      'aria-label': `${name}, ${sgbp2(x.a)}, ${fDayW(x.n)}${isNew ? ', new' : ''}` },
      VK.tile(x.m, x.c, { size: 'md', bc: x.bc }),
      h('div', { class: 'fv-txr-main' },
        h('div', { class: 'nm' }, h('span', { class: 'n', text: name }), isNew ? h('span', { class: 'fv-new-dot', title: 'New since your last visit' }, 'New') : null),
        h('div', { class: 'meta' },
          withDate ? h('span', { class: 'dt', text: fDay(x.n) + (dobj(x.n).getUTCFullYear() !== dobj(M.anchor).getUTCFullYear() ? ' ' + dobj(x.n).getUTCFullYear() : '') }) : null,
          h('i', { class: 'cd', style: { background: catColor(x.c) } }), h('span', { class: 'c', text: x.c }),
          // "Payment" says nothing (the bank gave no method), so it is left out.
          kind !== 'payment' ? [h('span', { class: 'sep', text: '·' }), VK.badge(kind, { size: 'sm' })] : null,
          showAcct ? h('span', { class: 'ac', text: M.acctNames[x.acct] || x.acct || '' }) : null)),
      h('span', { class: 'fv-txr-am' + (x.a > 0 ? ' in' : ''), text: x.a > 0 ? sgbp2(x.a) : gbp2(x.a) }));
    row._x = x;
    return row;
  }
  function txWatchMore() {
    if (typeof IntersectionObserver === 'undefined') return;
    if (!S.txIo) {
      S.txIo = new IntersectionObserver(es => {
        for (const en of es) if (en.isIntersecting && S.txAll && S.txShown < S.txAll.length && S.txMore.isConnected) {
          txRenderMore(TX_CHUNK);
          // Still in view (a tall screen): keep going on the next frame.
          requestAnimationFrame(() => { if (S.txIo && S.txMore.isConnected) { S.txIo.unobserve(S.txMore); S.txIo.observe(S.txMore); } });
        }
      }, { rootMargin: '0px 0px 900px 0px' });
    }
    S.txIo.unobserve(S.txMore); S.txIo.observe(S.txMore);
  }

  // ── Row detail (open in place) ────────────────────────────────────────
  function txToggle(row) {
    if (row.getAttribute('aria-expanded') === 'true') txClose(row);
    else {
      const open = S.txList.querySelector('.fv-txr[aria-expanded="true"]');
      if (open) txClose(open, true);
      txOpen(row);
    }
  }
  // Everything after `el` in the list, up to the bottom of the viewport.
  function txFollowing(el) {
    const out = []; const vh = window.innerHeight || 900;
    for (let n = el.nextElementSibling; n; n = n.nextElementSibling) { out.push(n); if (n.getBoundingClientRect().top > vh) return out; }
    const grp = el.parentElement;
    if (grp && grp.parentElement === S.txList) for (let g2 = grp.nextElementSibling; g2; g2 = g2.nextElementSibling) { out.push(g2); if (g2.getBoundingClientRect().top > vh) return out; }
    if (S.txMore) out.push(S.txMore);
    return out;
  }
  function txSlide(els, dy, ms, ease) {
    if (!dy || MK.reduced()) return;
    for (const e of els) if (typeof e.animate === 'function') e.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: ms, easing: ease });
  }
  function txOpen(row, quiet) {
    const x = row._x; if (!x) return;
    R.expanded = x.k;
    row.setAttribute('aria-expanded', 'true');
    const det = txDetail(x);
    row.after(det);
    if (quiet || MK.reduced()) return;
    const hgt = det.offsetHeight;
    txSlide(txFollowing(det), -hgt, 240, 'cubic-bezier(0.22, 1, 0.36, 1)');
    if (typeof det.animate === 'function') det.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }
  function txClose(row, instant) {
    const det = row.nextElementSibling && row.nextElementSibling.classList.contains('fv-txx') ? row.nextElementSibling : null;
    row.setAttribute('aria-expanded', 'false');
    if (R.expanded === (row._x && row._x.k)) R.expanded = null;
    if (!det) return;
    if (instant || MK.reduced() || typeof det.animate !== 'function') { det.remove(); return; }
    const hgt = det.offsetHeight; const after = txFollowing(det);
    det.remove();
    txSlide(after, hgt, 200, 'cubic-bezier(0.4, 0, 1, 1)');
  }
  function txHowText(x, kind) {
    const memo = String(x.memo || '').toUpperCase().trim();
    const code = (memo.match(/(?:^|\s)([A-Z]{2,4})$/) || [])[1];
    const raw = R.model.a.transactions[x.i] || {};
    if (raw.ty) return 'from the bank’s type ' + String(raw.ty);
    if (code && /^(CPM|CLP|BCC|DEB|VIS|POS|DDR|DD|STO|SO|FT|FPI|FPO|TFR|BP|BGC|CRE|ATM|CPT|CHG|INT)$/.test(code)) return 'from the bank code ' + code;
    if (kind === 'payment') return 'no payment method in the description';
    return 'from the description and category';
  }
  function txDetail(x) {
    const M = R.model; const G = VK.groups(M);
    const kind = VK.kind(x);
    const key = G.keyOf(x.m); const label = G.label(key);
    const members = G.members.get(key) || new Set([x.m]);
    const all = M.tx.filter(y => members.has(y.m) && y.kind === 'spend');
    const tot = sum(all, y => y.s); const visits = all.filter(y => y.s > 0).length;
    // Monthly spend at this merchant, the last 6 full months (12 when there is
    // history); the month in progress is left out so it never reads as a dip.
    const endMi = monthIdx(M.anchor) - (M.anchor === monthEnd(monthIdx(M.anchor)) ? 0 : 1);
    const nM = all.length && monthIdx(Math.min(...all.map(y => y.n))) <= endMi - 11 ? 12 : 6;
    const mons = new Array(nM).fill(0);
    for (const y of all) { const k = monthIdx(y.n) - (endMi - nM + 1); if (k >= 0 && k < nM) mons[k] += y.s; }
    const how = { override: 'your rule', rule: 'a keyword rule', bank: 'the bank’s category', default: 'the default', unmatched: 'nothing matched', 'own-transfer': 'a matching payment into another of your accounts' }[x.how] || (x.how || 'the import');
    const counts = x.kind === 'spend' ? 'Spending' : x.kind === 'income' ? 'Money in' : 'A transfer (not spending)';
    const filt = isSelMerchant(x.m);
    const det = h('div', { class: 'fv-txx', role: 'region', 'aria-label': 'Details' },
      h('dl', null,
        h('dt', { text: 'Description' }), h('dd', null, x.memo ? h('code', { text: x.memo }) : h('span', { class: 'mute', text: '—' })),
        h('dt', { text: 'Category' }), h('dd', null, VK.cat(x.c, { size: 'xs', plain: false }), catSelect(x.c, x.m, x.how), h('span', { class: 'mute fv-txx-how', text: 'by ' + how })),
        h('dt', { text: 'Type' }), h('dd', null, VK.badge(kind, { size: 'md' }), h('span', { class: 'mute fv-txx-how', text: txHowText(x, kind) })),
        x.bc ? [h('dt', { text: 'Bank category' }), h('dd', { text: x.bc.replace(/_/g, ' ') })] : null,
        h('dt', { text: 'Account' }), h('dd', { text: M.acctNames[x.acct] || x.acct || '—' }),
        h('dt', { text: 'Counts as' }), h('dd', { text: counts })),
      h('div', { class: 'fv-txx-side' },
        h('div', { class: 'fv-txx-h' }, h('b', { text: label }), visits ? ` · ${nf0.format(visits)} visit${visits === 1 ? '' : 's'} · ${gbp(tot)} in total · avg ${gbp2(tot / Math.max(1, visits))}` : ' · no spending'),
        visits ? h('div', { class: 'fv-txx-spk' }, VK.spark(mons.map(round2), { color: catColor(x.c), h: 46, enter: !MK.reduced() })) : null,
        visits ? h('div', { class: 'fv-txx-ax' }, h('span', { text: fMonthS(endMi - nM + 1) }), h('span', { text: fMonthS(endMi) })) : null,
        h('div', { class: 'fv-txx-acts' },
          h('button', { type: 'button', class: 'fv-btn', onclick: () => setMerchant(filt ? '' : G.primary(key)) }, ic(filt ? 'x' : 'filter'), filt ? 'Clear merchant filter' : 'Only this merchant'),
          h('button', { type: 'button', class: 'fv-btn', onclick: () => openDay(x.n) }, ic('calendar'), 'This day'),
          x.how === 'override' ? h('button', { type: 'button', class: 'fv-btn ghost', onclick: () => categorise(x.m, null, x.c, 'override') }, ic('rotate-ccw'), 'Remove my rule') : null,
          h('button', { type: 'button', class: 'fv-btn ghost fv-txx-all', onclick: () => openMerchant(x.m) }, `All at ${label}`, ic('arrow-right')))));
    return det;
  }

  // ── Toolbar menus ─────────────────────────────────────────────────────
  function txCatMenu(anchor) {
    const M = R.model; const ctx = R.ctx;
    const counts = {}; for (const x of txRows(ctx)) counts[x.c] = (counts[x.c] || 0) + 1;
    const allT = {}; M.tx.forEach(t => { if (t.kind === 'spend') allT[t.c] = (allT[t.c] || 0) + t.s; });
    const cats = M.spendCats.filter(c => allT[c] > 0 || F.cats.includes(c)).sort((p, q) => (allT[q] || 0) - (allT[p] || 0));
    fvMenu(anchor, {
      label: 'Categories', all: 'All categories', allOn: !F.cats.length,
      items: cats.map(c => ({ key: c, label: c, icon: VK.cat(c, { size: 'xs', plain: false }), count: counts[c] || 0, on: F.cats.includes(c) })),
      onAll: () => setCats([]), onPick: c => toggleCat(c), onOnly: c => setCats([c]),
      note: 'Spending categories · this filters every section',
    });
  }
  function txKindMenu(anchor) {
    const counts = {}; for (const x of txRows(R.ctx)) { const k = VK.kind(x); counts[k] = (counts[k] || 0) + 1; }
    const kinds = Object.keys(counts).sort((p, q) => counts[q] - counts[p]);
    const cur = R.txKinds || new Set();
    fvMenu(anchor, {
      label: 'Payment types', all: 'All types', allOn: !cur.size,
      items: kinds.map(k => ({ key: k, label: VK.kindInfo(k).title, icon: VK.badge(k, { compact: true }), count: counts[k], on: cur.has(k) })),
      onAll: () => { R.txKinds = new Set(); txTable(S.tx, R.ctx); },
      onPick: k => { const s = new Set(R.txKinds || []); if (s.has(k)) s.delete(k); else s.add(k); R.txKinds = s; txTable(S.tx, R.ctx); },
      onOnly: k => { R.txKinds = new Set([k]); txTable(S.tx, R.ctx); },
    });
  }
  function txSortMenu(anchor) {
    fvMenu(anchor, {
      label: 'Sort', single: true,
      items: TX_SORTS.map(([k, l, s]) => ({ key: k, label: l, on: F.sort.key === s.key && F.sort.dir === s.dir })),
      onPick: k => { const s = TX_SORTS.find(x => x[0] === k); if (!s) return; F.sort = Object.assign({}, s[2]); saveF(); txTable(S.tx, R.ctx); },
      note: 'Grouped by day when sorted by date',
    });
  }

  function exportCsv(rows, ctx) {
    const cell = v => {
      let s = String(v == null ? '' : v);
      if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = "'" + s;   // spreadsheet formula injection
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [['Date', 'Merchant', 'Category', 'Account', 'Amount', 'Description', 'Categorised by', 'Type'].join(',')];
    for (const x of rows) lines.push([x.d, cell(x.m), cell(x.c), cell(ctx.M.acctNames[x.acct] || x.acct), x.a.toFixed(2), cell(x.memo), cell(x.how), cell(VK.kindInfo(VK.kind(x)).label)].join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `finances-${diso(ctx.rg.from)}-to-${diso(ctx.rg.to)}.csv` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(`Exported ${nf0.format(rows.length)} transactions`);
  }
