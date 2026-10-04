  // @part 02-model.js · OWNER: C3 (shared core: buildModel, recurring detection)
  // ── Data model ────────────────────────────────────────────────────────
  function buildModel(a) {
    const raw = Array.isArray(a.transactions) ? a.transactions : [];
    const exclude = Array.isArray(a.exclude_from_spending) && a.exclude_from_spending.length
      ? a.exclude_from_spending.map(String) : ['Income', 'Internal transfers'];
    const tx = [];
    raw.forEach((r, idx) => {
      if (!r || !validIso(r.d)) return;
      const amt = Number(r.a); if (!isFinite(amt)) return;
      const c = String(r.c || 'Uncategorised');
      const kind = exclude.includes(c) ? (c === 'Income' ? 'income' : 'transfer') : 'spend';
      tx.push({
        i: idx, d: r.d.slice(0, 10), n: dnum(r.d), m: String(r.m || 'Unknown'), c, a: amt,
        acct: r.acct ? String(r.acct) : '', memo: r.memo ? String(r.memo) : '', how: r.how ? String(r.how) : '',
        bc: r.bc ? String(r.bc) : null, k: r.k ? String(r.k) : 'i' + idx, kind,
        s: kind === 'spend' ? -amt : 0, inc: kind === 'income' && amt > 0 ? amt : 0, abs: Math.abs(amt),
      });
    });
    tx.sort((p, q) => q.n - p.n || p.i - q.i);
    const today = validIso(a.today) ? dnum(a.today) : localToday();
    const maxN = tx.length ? tx[0].n : today;
    const anchor = Math.max(today, maxN);
    const minN = tx.length ? Math.min(tx[tx.length - 1].n, anchor) : anchor - 90;

    const catSet = new Set(['Uncategorised', 'Income', 'Internal transfers']);
    (Array.isArray(a.categories) ? a.categories : []).forEach(c => c && catSet.add(String(c)));
    tx.forEach(t => catSet.add(t.c));
    exclude.forEach(c => catSet.add(c));
    if (a.budgets && typeof a.budgets === 'object') Object.keys(a.budgets).forEach(c => catSet.add(c));
    const categories = [...catSet].sort((p, q) => p.localeCompare(q));
    const spendCats = categories.filter(c => !exclude.includes(c));

    const accts = [...new Set(tx.map(t => t.acct).filter(Boolean))].sort();
    const acctNames = {};
    (Array.isArray(a.balances) ? a.balances : []).forEach(b => { if (b && b.acct) acctNames[b.acct] = b.name || b.acct; });
    // Sources (GET /api/finance meta.accounts): each account's name, source and colour.
    const acctInfo = {};
    const metaAcc = R.data && R.data.meta && Array.isArray(R.data.meta.accounts) ? R.data.meta.accounts : [];
    for (const x of metaAcc) if (x && typeof x.key === 'string') { acctInfo[x.key] = x; if (x.name) acctNames[x.key] = String(x.name); }
    // Transaction account ids are the bank's opaque ids (they don't match the
    // balance asset ids); show a short, readable label instead of the raw id.
    accts.forEach(ac => { if (!acctNames[ac]) acctNames[ac] = ac.length > 6 ? 'Account …' + ac.slice(-4) : ac; });
    // Sources that have transactions here, in a stable order: [{id, label, colour, accts}]
    const sourceMap = new Map();
    for (const ac of accts) {
      const info = acctInfo[ac] || {};
      const id = info.sourceId || '_other';
      if (!sourceMap.has(id)) sourceMap.set(id, { id, label: info.sourceLabel || 'Other', colour: info.sourceColour || 'slate', accts: [] });
      sourceMap.get(id).accts.push(ac);
    }
    const sources = [...sourceMap.values()];

    // Per-merchant stats over all time (for typical amounts and first-seen).
    const mstats = new Map();
    for (const t of tx) {
      if (t.kind !== 'spend') continue;
      let s = mstats.get(t.m);
      if (!s) { s = { m: t.m, count: 0, total: 0, amts: [], first: t.n, last: t.n, cats: {} }; mstats.set(t.m, s); }
      s.count++; s.total += t.s; if (t.s > 0) s.amts.push(t.s);
      s.first = Math.min(s.first, t.n); s.last = Math.max(s.last, t.n);
      s.cats[t.c] = (s.cats[t.c] || 0) + 1;
    }
    for (const s of mstats.values()) {
      s.med = median(s.amts);
      s.cat = Object.entries(s.cats).sort((p, q) => q[1] - p[1])[0][0];
    }
    const spendAmts = tx.filter(t => t.s > 0).map(t => t.s);
    const M = {
      a, tx, exclude, categories, spendCats, accts, acctNames, acctInfo, sources, minN, maxN, anchor, today, mstats,
      p99: quantile(spendAmts, 0.99), maxAmt: Math.max(10, ...spendAmts, ...tx.map(t => t.abs)),
      slots: {},
    };
    // Stable colour slots: the 7 biggest named categories get a hue; a
    // category keeps its hue across reloads for as long as it stays top-7.
    const allTime = {};
    tx.forEach(t => { if (t.kind === 'spend') allTime[t.c] = (allTime[t.c] || 0) + t.s; });
    const ranked = Object.keys(allTime).filter(c => c !== 'Uncategorised' && allTime[c] > 0).sort((p, q) => allTime[q] - allTime[p]).slice(0, SLOTS);
    const prev = F.slots || {}; const used = new Set(); const slots = {};
    for (const c of ranked) { const s = prev[c]; if (Number.isInteger(s) && s >= 0 && s < SLOTS && !used.has(s)) { slots[c] = s; used.add(s); } }
    for (const c of ranked) if (slots[c] == null) { let s = 0; while (used.has(s)) s++; slots[c] = s; used.add(s); }
    M.slots = slots; F.slots = slots; saveF();
    M.recurring = detectRecurring(M);
    M.recurringMonthly = sum(M.recurring.filter(r => r.active), r => r.monthly);
    return M;
  }

  const FREQS = [
    { p: 7, tol: 1.5, label: 'Weekly', min: 3 }, { p: 14, tol: 2, label: 'Fortnightly', min: 3 },
    { p: 30.44, tol: 4, label: 'Monthly', min: 2 }, { p: 91, tol: 10, label: 'Quarterly', min: 2 },
    { p: 365, tol: 25, label: 'Yearly', min: 2 },
  ];
  function periodFromText(s) {
    s = String(s || '').toLowerCase();
    if (/fortnight|2.?week|bi.?week/.test(s)) return FREQS[1];
    if (/week/.test(s)) return FREQS[0];
    if (/quarter/.test(s)) return FREQS[3];
    if (/year|annual/.test(s)) return FREQS[4];
    return FREQS[2];
  }
  // Client-side recurring detection, merged with the pipeline's list.
  function detectRecurring(M) {
    const byM = new Map();
    for (const t of M.tx) {
      if (t.kind !== 'spend' || t.s <= 0) continue;
      if (!byM.has(t.m)) byM.set(t.m, []);
      byM.get(t.m).push(t);
    }
    const out = new Map();
    for (const [m, list] of byM) {
      if (list.length < 2) continue;
      const days = new Map();
      list.forEach(t => days.set(t.n, (days.get(t.n) || 0) + t.s));
      const ds = [...days.keys()].sort((p, q) => p - q);
      if (ds.length < 2) continue;
      const iv = []; for (let i = 1; i < ds.length; i++) iv.push(ds[i] - ds[i - 1]);
      const med = median(iv);
      const f = FREQS.find(x => Math.abs(med - x.p) <= x.tol);
      if (!f || ds.length < f.min) continue;
      const okIv = iv.filter(x => Math.abs(x - f.p) <= f.tol * 1.6).length / iv.length;
      const amts = ds.map(n => days.get(n)); const ma = median(amts);
      const okAmt = amts.filter(x => Math.abs(x - ma) / ma <= 0.35).length / amts.length;
      if (okIv < 0.6 || okAmt < 0.6) continue;
      out.set(m, mkRec(M, m, list, f, 'detected'));
    }
    for (const r of (Array.isArray(M.a.recurring) ? M.a.recurring : [])) {
      if (!r || !r.merchant) continue;
      const m = String(r.merchant);
      const f = periodFromText(r.frequency);
      const list = byM.get(m) || [];
      const rec = out.get(m) || mkRec(M, m, list, f, 'pipeline');
      rec.source = out.has(m) ? 'both' : 'pipeline';
      if (r.frequency) rec.freq = String(r.frequency).replace(/^./, c => c.toUpperCase());
      if (isFinite(+r.monthly_cost) && +r.monthly_cost > 0) rec.monthly = +r.monthly_cost;
      if (r.category && !rec.cat) rec.cat = String(r.category);
      if (!list.length && validIso(r.last_seen)) { rec.last = dnum(r.last_seen); rec.next = rec.last + Math.round(f.p); rec.lastAmt = +r.last_amount || 0; rec.typical = rec.lastAmt; rec.active = M.anchor - rec.last <= f.p * 2 + f.tol; }
      if (r.amount_varies) rec.varies = true;
      out.set(m, rec);
    }
    return [...out.values()].sort((p, q) => (q.active - p.active) || (q.monthly - p.monthly));
  }
  function mkRec(M, m, list, f, source) {
    const days = new Map(); list.forEach(t => days.set(t.n, (days.get(t.n) || 0) + t.s));
    const ds = [...days.keys()].sort((p, q) => p - q);
    const amts = ds.map(n => days.get(n));
    const typical = median(amts);
    const last = ds.length ? ds[ds.length - 1] : M.anchor;
    const st = M.mstats.get(m);
    let next = last + Math.round(f.p);
    while (next < M.anchor - f.tol && ds.length) next += Math.round(f.p);   // roll forward past missed charges
    return {
      m, cat: st ? st.cat : 'Uncategorised', freq: f.label, period: f.p, count: ds.length, first: ds[0] != null ? ds[0] : last, last,
      lastAmt: amts.length ? amts[amts.length - 1] : 0, typical, monthly: typical * 30.44 / f.p,
      next, charges: ds.map(n => ({ n, s: days.get(n) })), varies: amts.length > 1 && Math.max(...amts) / Math.max(0.01, Math.min(...amts)) > 1.15,
      active: M.anchor - last <= f.p * 2 + f.tol, source,
    };
  }

