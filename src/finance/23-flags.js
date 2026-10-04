  // @part 23-flags.js · OWNER: C1 (computeFlags, flagList; Overview calls them too)
  function computeFlags(ctx) {
    const M = ctx.M; const out = [];
    for (const f of (Array.isArray(M.a.flags) ? M.a.flags : [])) {
      if (!f) continue;
      out.push({ sev: f.severity === 'warn' ? 'warn' : 'info', kind: String(f.kind || 'Flag'), m: String(f.merchant || ''), n: validIso(f.date) ? dnum(f.date) : null, amt: Math.abs(Number(f.amount) || 0), note: String(f.note || '') });
    }
    const rows = ctx.cur.spend;
    for (const x of rows) {
      const st = M.mstats.get(x.m);
      if (x.s >= 40 && st && st.amts.length >= 3 && x.s > 2.5 * st.med) out.push({ sev: 'warn', kind: 'Unusually large', m: x.m, n: x.n, amt: x.s, note: `about ${(x.s / st.med).toFixed(1)}× your usual ${gbp2(st.med)}` });
      else if (x.s >= 100 && x.s >= M.p99) out.push({ sev: 'info', kind: 'Big purchase', m: x.m, n: x.n, amt: x.s, note: 'in your top 1% of payments' });
    }
    const sorted = rows.filter(x => x.s > 0).slice().sort((p, q) => p.m.localeCompare(q.m) || p.s - q.s || p.n - q.n);
    for (let i = 1; i < sorted.length; i++) {
      const p = sorted[i - 1], q = sorted[i];
      if (p.m === q.m && Math.abs(p.s - q.s) < 0.005 && Math.abs(p.n - q.n) <= 1 && p.k !== q.k && p.s >= 3) out.push({ sev: 'warn', kind: 'Possible duplicate', m: q.m, n: q.n, amt: q.s, note: `two charges of ${gbp2(q.s)} ${p.n === q.n ? 'on the same day' : 'a day apart'}` });
    }
    let nNew = 0;
    for (const x of rows) {
      const st = M.mstats.get(x.m);
      if (st && st.first === x.n && x.n >= ctx.rg.from && x.s >= 25 && nNew < 6 && x.n > M.minN + 14) { out.push({ sev: 'info', kind: 'New merchant', m: x.m, n: x.n, amt: x.s, note: 'first payment here' }); nNew++; }
    }
    if (ctx.hasPrev) {
      const a = ctx.catTotals(rows), b = ctx.catTotals(ctx.prv.spend);
      for (const c of Object.keys(a)) if (a[c] >= 50 && b[c] > 0 && a[c] > 1.6 * b[c]) out.push({ sev: 'info', kind: 'Category up', m: c, n: null, amt: a[c] - b[c], note: `+${Math.round((a[c] / b[c] - 1) * 100)}% on the previous period`, cat: c });
    }
    for (const r of M.recurring) {
      if (r.charges.length < 3 || r.last < ctx.rg.from || r.last > ctx.rg.to) continue;
      const prevMed = median(r.charges.slice(0, -1).map(x => x.s)); const last = r.charges[r.charges.length - 1].s;
      if (prevMed > 0 && Math.abs(last - prevMed) / prevMed > 0.1 && Math.abs(last - prevMed) >= 1) out.push({ sev: last > prevMed ? 'warn' : 'info', kind: last > prevMed ? 'Price rise' : 'Price drop', m: r.m, n: r.last, amt: last, note: `was ${gbp2(prevMed)}` });
    }
    const seen = new Set();
    return out.filter(f => { const k = f.kind + '|' + f.m + '|' + f.n; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((p, q) => (p.sev === q.sev ? 0 : p.sev === 'warn' ? -1 : 1) || (q.n || 0) - (p.n || 0));
  }
  function flagList(cd, ctx, limit) {
    const flags = computeFlags(ctx);
    cd.body.querySelectorAll('.fv-list').forEach(x => x.remove());
    cd.setSub(flags.length ? `${flags.length} item${flags.length === 1 ? '' : 's'} to check` : '');
    if (!flags.length) { cd.setEmpty('Nothing unusual in this range.'); return; }
    cd.setEmpty(null);
    const ul = h('ul', { class: 'fv-list c1-flags' });
    for (const f of flags.slice(0, limit || 50)) {
      // The merchant's tile (or the category's icon) with the flag's kind as a small badge on its corner.
      const st = f.cat ? null : ctx.M.mstats.get(f.m);
      const sym = f.cat ? C1.catIconEl(f.cat, { size: 'sm' }) : C1.tileEl(f.m, st ? st.cat : null, 'sm', { badge: false });
      ul.append(h('li', null, h('button', { type: 'button', class: 'fv-row fsym-host', onclick: () => { if (f.cat) toggleCat(f.cat, true); else if (f.m) openMerchant(f.m); } },
        h('span', { class: 'c1-flag-sym' }, sym, h('span', { class: 'fv-flag ' + f.sev }, ic(f.sev === 'warn' ? 'triangle-alert' : 'info'))),
        h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t' }, h('b', { text: f.kind }), ' · ', f.m), h('span', { class: 'fv-row-s', text: [f.note, f.n != null ? fDayW(f.n) : ''].filter(Boolean).join(' · ') })),
        h('span', { class: 'fv-row-v', text: gbp2(f.amt) }))));
    }
    if (flags.length > (limit || 50)) ul.append(h('li', { class: 'fv-more-note', text: `+${flags.length - limit} more in Spending` }));
    cd.body.append(ul);
  }
