  // @part 96-board-hooks.js · NEW (2.16) · OWNER: FUX (spend by place and the finance fun numbers, for other parts of the app)
  // ── FinanceView.placeSpend / fun / board: read-only, for other modules ──
  // Both load Finances quietly when the view has not been opened yet (the same
  // GET /api/finance, so on a device that shows another computer's finances they
  // read the published copy, places included). Nothing is written.
  //
  //   FinanceView.placeSpend({from?, to?}) -> Promise<null | {
  //     home, currency, from, to, remote: bool,
  //     countries: [{cc ('FR' | 'EZ' Eurozone | 'X:XOF' a shared currency | the home country), label, abroad,
  //                  total (home currency), n, local: {CCY: amount}, localCover (0-1: the share of total with a
  //                  local amount), first, last ('YYYY-MM-DD'), months: {'YYYY-MM': total},
  //                  cities: [{city, total}], trips: [trip id], how: {merchant|memo|currency|trip|home: total}}],
  //     trips: [{id, label, cc, from, to, src (travel | decided | payments), total, n, days, local: {CCY: amount}}]}>
  //   (Locations, 2.16: fun facts per place; the rules are 25-place-model.js.)
  //   FinanceView.fun(o) -> Promise<null | bdFun()>   no-spend days, best weeks (39-board-widgets.js): the
  //     gamification work reads these; o = {bills: 'ignore'|'count', small, what: 'day'|'all'}
  //   FinanceView.board() -> the My money layout (types, sizes and settings; no money)
  async function bdReady() {
    if (R.model) return R.model;
    if (!R.loading) await load(true);
    for (let i = 0; i < 100 && R.loading; i++) await new Promise(r => setTimeout(r, 100));
    return R.model;
  }
  async function finPlaceSpend(o) {
    o = o || {};
    const M = await bdReady(); if (!M) return null;
    PL.ensure(M);
    const from = validIso(o.from) ? dnum(o.from) : M.minN, to = validIso(o.to) ? dnum(o.to) : M.anchor;
    const rows = M.tx.filter(t => t.kind === 'spend' && t.n >= from && t.n <= to);
    const ym = mi => `${Math.floor(mi / 12)}-${String(mi % 12 + 1).padStart(2, '0')}`;
    const countries = PL.agg(rows).map(x => ({
      cc: x.cc, label: x.label, abroad: x.abroad, total: x.total, n: x.n, local: Object.assign({}, x.lc), localCover: round2(x.lcCover),
      first: diso(x.first), last: diso(x.last),
      months: Object.fromEntries([...x.months.entries()].sort((a, b) => a[0] - b[0]).map(([mi, v]) => [ym(mi), round2(v)])),
      cities: [...x.cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, v]) => ({ city, total: round2(v) })),
      trips: [...x.trips.keys()], how: Object.fromEntries(Object.entries(x.src).map(([k, v]) => [k, round2(v)])),
    }));
    const trips = PL.trips(M).filter(t => dnum(t.to || t.from) >= from && dnum(t.from) <= to).map(t => {
      const tr = rows.filter(x => x.ptrip === t.id);
      const local = {}; for (const x of tr) if (x.plc && x.pla > 0 && x.plc !== CUR) local[x.plc] = round2((local[x.plc] || 0) + (x.s < 0 ? -x.pla : x.pla));
      return { id: t.id, label: t.label, cc: t.cc, from: t.from, to: t.to, src: t.src, total: round2(sum(tr, x => x.s)), n: tr.length, days: dnum(t.to || t.from) - dnum(t.from) + 1, local };
    });
    return { home: M._plHome || '', currency: CUR, from: diso(from), to: diso(to), remote: !!(R.data && R.data.meta && R.data.meta.remote && R.data.meta.remote.name), countries, trips };
  }
  async function finFun(o) { const M = await bdReady(); return M ? bdFun(M, o || {}) : null; }
  Object.assign(window.FinanceView, {
    placeSpend: finPlaceSpend,
    fun: finFun,
    board: () => JSON.parse(JSON.stringify(boardGet())),
  });
