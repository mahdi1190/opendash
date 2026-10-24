  // @part 38-countries.js · NEW (2.16) · OWNER: FUX (Countries section: spending by country)
  // ----- Countries -----
  // User request (24 Oct): "segregate by country money spent". Where each payment
  // was made comes from 25-place-model.js (PL). This section: where you spent
  // (flag + bar, the home currency and the local one), month by month, trips,
  // the top places there, the currencies you paid in, cities. Clicking a country
  // keeps every chart to it (F.country, the bar's "In France" chip; Esc or × clears);
  // clicking a trip makes its dates the range. Re-clicking the current one does nothing.
  // ccRows / ccListEl / ccColor / fmtCcy are shared with My money's widget (39-board-widgets.js).
  SEC_OPTS.countries = { kpis: ['spent', 'avg', 'count'] };

  const CCY_FMT = new Map();
  /** An amount in another currency ("€1,420", "¥18,400"); amounts of 100 or more have no decimals. */
  function fmtCcy(v, ccy) {
    const dp = Math.abs(v) >= 100 ? 0 : 2;
    const k = ccy + dp;
    let f = CCY_FMT.get(k);
    if (!f) { try { f = new Intl.NumberFormat(LOC, { style: 'currency', currency: ccy, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: dp }); } catch (e) { f = null; } CCY_FMT.set(k, f); }
    return f ? f.format(v) : `${nf2.format(v)} ${ccy}`;
  }
  /** The spending rows of the range with every filter but the country (the list shows them all, the chosen one lit). */
  function ccRows(ctx) {
    PL.ensure(ctx.M);
    return ctx.lazy('ccRows', () => { const q = pred({ country: true }); return ctx.M.tx.filter(t => t.kind === 'spend' && t.n >= ctx.rg.from && t.n <= ctx.rg.to && q(t)); });
  }
  /** One colour per country, kept for the model: home is the quiet slate, the rest the palette by all-time spend. */
  function ccColor(cc) {
    const M = R.model; const t = tk();
    if (!M) return t.other;
    if (!M._ccSlot) {
      PL.ensure(M);
      const all = PL.agg(M.tx); M._ccSlot = {}; let i = 0;
      for (const x of all) M._ccSlot[x.cc] = x.abroad ? (i++ % SLOTS) : -1;
    }
    const s = M._ccSlot[cc];
    return s == null ? t.other : s < 0 ? t.uncat : t.pal[s];
  }
  const ccName = cc => PL.label(cc === 'HOME' ? '' : cc);
  function ccLocalText(x) {
    if (!x.abroad) return '';
    const parts = Object.entries(x.lc).filter(e => e[0] !== CUR && Math.abs(e[1]) > 0.004).sort((p, q) => Math.abs(q[1]) - Math.abs(p[1])).slice(0, 2).map(([c, v]) => fmtCcy(v, c));
    return parts.join(' + ');
  }
  /**
   * The flag + bar list (Countries and My money). o: {limit, abroad (leave home out), money (amount text fn),
   * pick (cc), compact}. Rows are buttons: a click keeps everything to that country.
   */
  function ccListEl(list, o) {
    o = o || {};
    const money = o.money || gbp;
    const items = (o.abroad ? list.filter(x => x.abroad) : list).slice(0, o.limit || 50);
    const max = Math.max(0.01, ...items.map(x => x.total));
    const total = Math.max(0.01, sum(list, x => x.total));
    const ul = h('ul', { class: 'fv-list fv-cc-list' + (o.compact ? ' compact' : '') });
    items.forEach((x, i) => {
      const cur = F.country === x.cc;
      const local = ccLocalText(x);
      const subs = [];
      if (!o.compact) {
        subs.push(`${nf0.format(x.n)} payment${x.n === 1 ? '' : 's'}`);
        if (x.trips.size) subs.push(`${x.trips.size} trip${x.trips.size === 1 ? '' : 's'}`);
        const city = [...x.cities.entries()].sort((p, q) => q[1] - p[1])[0];
        if (city && x.abroad) subs.unshift(city[0]);
      }
      const b = h('button', { type: 'button', class: 'fv-row fv-cc-row' + (cur ? ' is-current' : ''), 'aria-current': cur ? 'true' : null, style: { '--i': i, '--c': ccColor(x.cc) },
        title: cur ? 'Showing only ' + x.label + ' (Esc clears)' : 'Only ' + x.label, onclick: () => { if (o.pick) o.pick(x.cc); else setCountry(x.cc); } },
        h('span', { class: 'fv-cc-flag', html: PL.flag(x.cc === 'HOME' ? '' : x.cc) }),
        h('span', { class: 'fv-row-main' },
          h('span', { class: 'fv-cc-top' }, h('span', { class: 'fv-row-t', text: x.label }), h('span', { class: 'fv-cc-pct', text: pct(x.total / total) })),
          h('span', { class: 'fv-cc-bar', 'aria-hidden': 'true' }, h('i', { style: { width: Math.max(2, x.total / max * 100).toFixed(1) + '%' } })),
          subs.length ? h('span', { class: 'fv-row-s', text: subs.join(' · ') }) : null),
        h('span', { class: 'fv-cc-v' }, h('b', { class: 'fv-row-v fv-amt', text: money(x.total) }), local ? h('small', { class: 'fv-amt', text: local }) : null));
      ul.append(h('li', null, b));
    });
    return ul;
  }

  BUILD.countries = g => {
    S.ccHead = h('section', { class: 'fv-card fv-cc-head', style: { '--span': 12, '--span-md': 12 } });
    g.append(S.ccHead);
    S.ccList = card(g, { title: 'Where you spent', span: 8, md: 12 });
    S.ccScope = seg([['all', 'Everywhere'], ['abroad', 'Abroad only']], F.ccScope === 'abroad' ? 'abroad' : 'all', v => { F.ccScope = v; saveF(); S.ccScope.set(v); ccPaintList(R.ctx); }, 'Which countries');
    S.ccList.tools.append(S.ccScope.el);
    S.ccListBox = h('div'); S.ccList.body.append(S.ccListBox);
    S.ccMonths = card(g, { title: 'Month by month', span: 4, md: 12, chart: true, height: 280, fill: true });
    S.ccTrips = card(g, { title: 'Trips', span: 6 });
    S.ccTripT = toggle('Trip dates count', F.boardTripRows !== false, v => { F.boardTripRows = v; saveF(); if (R.model) { R.model._ccSlot = null; PL.ensure(R.model); } changed(); },
      'A payment with no other sign of where (a card that shows only pounds, say) counts in the country of the trip you were on that day');
    S.ccTrips.tools.append(S.ccTripT.el);
    S.ccTripBox = h('div'); S.ccTrips.body.append(S.ccTripBox);
    S.ccMerch = card(g, { title: 'Top places there', span: 6 });
    S.ccMerchBox = h('div'); S.ccMerch.body.append(S.ccMerchBox);
    S.ccCcy = card(g, { title: 'Paid in other currencies', span: 6 });
    S.ccCcyBox = h('div'); S.ccCcy.body.append(S.ccCcyBox);
    S.ccCity = card(g, { title: 'Cities', span: 6 });
    S.ccCityBox = h('div'); S.ccCity.body.append(S.ccCityBox);
    S.onEsc = () => { if (F.trip) { setTrip(null); return true; } return false; };
  };
  UPDATE.countries = ctx => {
    ccPaintHead(ctx);
    ccPaintList(ctx);
    ccMonths(S.ccMonths, ctx);
    ccPaintTrips(ctx);
    ccPaintMerch(ctx);
    ccPaintCcy(ctx);
    ccPaintCities(ctx);
  };
  function ccPaintHead(ctx) {
    const rows = ccRows(ctx);
    const list = PL.agg(rows);
    const abroad = list.filter(x => x.abroad), homeX = list.find(x => !x.abroad);
    const away = sum(abroad, x => x.total), all = sum(list, x => x.total);
    const cov = PL.coverage(rows);
    const el = S.ccHead; el.innerHTML = '';
    const big = abroad.length
      ? [h('b', { class: 'fv-cc-hv fv-amt', text: gbp(away) }), h('span', { text: ` abroad in ${abroad.length} countr${abroad.length === 1 ? 'y' : 'ies'}` }), homeX ? h('span', { class: 'mute' }, ' · ', h('span', { class: 'fv-amt', text: gbp(homeX.total) }), ` at home (${homeX.label})`) : null]
      : [h('b', { class: 'fv-cc-hv', text: 'All at home' }), h('span', { class: 'mute', text: homeX ? ` · ${homeX.label} · ` : ' · ' }), homeX ? h('span', { class: 'fv-amt mute', text: gbp(homeX.total) }) : null];
    const how = PL.SRC.filter(k => cov[k] > 0.004 && cov.total > 0).map(k => `${pct(cov[k] / cov.total)} ${PL.SRC_LABEL[k]}`);
    el.append(h('div', { class: 'fv-cc-hl' }, h('span', { class: 'fv-cc-hic', 'aria-hidden': 'true' }, ic('globe')), h('div', { class: 'fv-cc-ht' }, h('div', { class: 'fv-cc-hbig' }, big),
      h('div', { class: 'fv-cc-hs', text: all > 0 ? `${fRange(ctx.rg.from, ctx.rg.to)} · How we know where: ${how.join(' · ') || '—'}` : 'No spending in these dates.' }))),
      abroad.length ? h('div', { class: 'fv-cc-hflags', 'aria-hidden': 'true', html: abroad.slice(0, 8).map(x => PL.flag(x.cc)).join('') }) : null);
  }
  function ccPaintList(ctx) {
    const cd = S.ccList; if (!cd) return;
    const rows = ccRows(ctx);
    const list = PL.agg(rows);
    S.ccListBox.innerHTML = '';
    const abroadOnly = F.ccScope === 'abroad';
    const shown = abroadOnly ? list.filter(x => x.abroad) : list;
    if (!shown.length) { cd.setEmpty(abroadOnly ? 'Nothing paid abroad in these dates.' : 'No spending in these dates.'); cd.setSub(''); return; }
    cd.setEmpty(null);
    cd.setSub(`${shown.length} place${shown.length === 1 ? '' : 's'} · the local currency under each total` + (F.country ? ' · click another to switch' : ' · click one to see only it'));
    S.ccListBox.append(ccListEl(list, { abroad: abroadOnly }));
  }
  // Month by month: the top countries abroad stacked (home in slate when shown), the rest as "Elsewhere".
  function ccMonths(cd, ctx) {
    const t = tk();
    PL.ensure(ctx.M);
    const q = pred({ country: true });
    const lo = Math.max(ctx.M.minN, monthStart(monthIdx(ctx.rg.to) - 11));
    const from = Math.min(ctx.rg.from, lo);
    const rows = ctx.M.tx.filter(x => x.kind === 'spend' && x.n >= monthStart(monthIdx(from)) && x.n <= ctx.rg.to && q(x));
    const abroadOnly = F.ccScope === 'abroad';
    const list = PL.agg(rows).filter(x => !abroadOnly || x.abroad);
    if (!list.length) { cd.setEmpty('Nothing to show for these dates.'); cd.setSub(''); return; }
    const top = list.filter(x => x.abroad).slice(0, 5);
    const home = abroadOnly ? null : list.find(x => !x.abroad);
    const keys = [...(home ? [home] : []), ...top];
    const m0 = monthIdx(from), m1 = monthIdx(ctx.rg.to);
    const months = []; for (let mi = m0; mi <= m1; mi++) months.push(mi);
    const rest = new Array(months.length).fill(0);
    const keep = new Set(keys.map(x => x.cc));
    for (const x of list) if (!keep.has(x.cc)) for (const [mi, v] of x.months) { const i = mi - m0; if (i >= 0 && i < rest.length) rest[i] += v; }
    const parts = keys.map(x => ({ id: x.cc, name: x.label, color: ccColor(x.cc), data: months.map(mi => round2(Math.max(0, x.months.get(mi) || 0))) }));
    if (rest.some(v => v > 0.004)) parts.push({ id: 'rest', name: 'Elsewhere', color: t.other, data: rest.map(v => round2(Math.max(0, v))) });
    const series = parts.map((x, k) => {
      const s = FX.bars({ id: 'cc:' + x.id, name: x.name, stack: 'all', color: x.color, width: months.length <= 6 ? 22 : 12, lift: false, radius: k === parts.length - 1 ? [3, 3, 0, 0] : 0, data: x.data });
      const lit = !F.country || F.country === x.id;
      s.itemStyle = Object.assign({}, s.itemStyle, { opacity: lit ? 1 : 0.22, borderColor: t.card, borderWidth: 0.75 });
      s.emphasis = { focus: 'series' }; s.blur = { itemStyle: { opacity: 0.22 } };
      return s;
    });
    const multiYear = Math.floor(months[0] / 12) !== Math.floor(months[months.length - 1] / 12);
    cd.setSub(home && !F.country ? 'Home in grey, abroad in colour · the last 12 months' : 'The last 12 months');
    const option = base({
      grid: { left: 2, right: 10, top: 40, bottom: 8, containLabel: true },
      legend: { top: 0, left: 0, right: 0, type: 'plain', icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 12, textStyle: { color: t.muted, fontSize: 11, fontFamily: FONT } },
      tooltip: C1.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => {
        const i = ps[0].dataIndex; const mi = months[i]; if (mi == null) return '';
        const rs = ps.filter(p => +p.value > 0.004).sort((a, b) => b.value - a.value).map(p => ({ c: p.color, key: 'bx', v: gbp2(p.value), k: p.seriesName }));
        return C1.tip(fMonth(mi), rs.length ? rs : [{ key: 'none', v: gbp(0), k: 'nothing', muted: true }], { sub: gbp(sum(ps, p => +p.value || 0)) });
      } }),
      xAxis: C1.xCat(months.map(mi => fMonthS(mi, multiYear)), { pill: true, line: true }),
      yAxis: C1.yOut({ ticks: 3 }),
      series,
    });
    const c = C1.draw(cd, 's:cc-months', option);
    on(c, 'click', p => { const cc = String(p.seriesId || '').slice(3); if (cc && cc !== 'rest') setCountry(cc); });
  }
  /** Trips in (or touching) the range, newest first: [{trip, total, n, days, local, top}] */
  function ccTripTotals(ctx, all) {
    const M = ctx.M; PL.ensure(M);
    const trips = PL.trips(M).filter(t => all || (dnum(t.to || t.from) >= ctx.rg.from && dnum(t.from) <= ctx.rg.to));
    const q = pred({ country: true });
    const out = [];
    for (const tr of trips) {
      const rows = M.tx.filter(x => x.kind === 'spend' && x.ptrip === tr.id && q(x));
      const total = sum(rows, x => x.s);
      const days = Math.max(1, dnum(tr.to || tr.from) - dnum(tr.from) + 1);
      const lc = {}; for (const x of rows) if (x.plc && x.pla > 0 && x.plc !== CUR) lc[x.plc] = (lc[x.plc] || 0) + (x.s < 0 ? -x.pla : x.pla);
      const cats = {}; for (const x of rows) cats[x.c] = (cats[x.c] || 0) + x.s;
      const top = Object.entries(cats).sort((p, r) => r[1] - p[1])[0];
      out.push({ trip: tr, total: round2(total), n: rows.length, days, local: Object.entries(lc).sort((p, r) => r[1] - p[1]).slice(0, 2).map(([c, v]) => fmtCcy(v, c)).join(' + '), top: top ? top[0] : '' });
    }
    return out.sort((a, b) => (a.trip.from < b.trip.from ? 1 : -1));
  }
  function ccTripRowEl(x, o) {
    o = o || {};
    const tr = x.trip;
    const cur = F.trip === tr.id;
    const a = dnum(tr.from), b = dnum(tr.to || tr.from);
    const dates = a === b ? fDay(a) : fRange(a, b);
    const subs = [dates, `${x.days} day${x.days === 1 ? '' : 's'}`];
    if (tr.src === 'payments') subs.push('found in your payments');
    return h('button', { type: 'button', class: 'fv-row fv-cc-row' + (cur ? ' is-current' : ''), 'aria-current': cur ? 'true' : null, title: cur ? 'These dates are the range (Esc goes back)' : 'Use the trip dates as the range',
      onclick: () => setTrip(tr) },
      h('span', { class: 'fv-cc-flag', html: PL.flag(tr.cc) }),
      h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t', text: tr.label || ccName(tr.cc) }), h('span', { class: 'fv-row-s', text: subs.join(' · ') })),
      h('span', { class: 'fv-cc-v' }, h('b', { class: 'fv-row-v fv-amt', text: (o.money || gbp)(x.total) }),
        h('small', { class: 'fv-amt', text: x.n ? (x.local || `${(o.money || gbp)(x.total / x.days)} a day`) : 'nothing spent' })));
  }
  function ccPaintTrips(ctx) {
    const cd = S.ccTrips; if (!cd) return;
    S.ccTripT.set(F.boardTripRows !== false);
    const list = ccTripTotals(ctx).filter(x => !F.country || x.trip.cc === F.country);
    S.ccTripBox.innerHTML = '';
    if (!list.length) {
      cd.setSub('');
      const on2 = typeof TravelStore !== 'undefined' && TravelStore && TravelStore.on && TravelStore.on();
      cd.setEmpty(on2 ? 'No trips in these dates.' : 'No trips in these dates. Runs of payments abroad show here as trips; Travel (Settings > Travel) adds the ones on your calendar.');
      return;
    }
    cd.setEmpty(null);
    cd.setSub(`${list.length} trip${list.length === 1 ? '' : 's'} · click one to make its dates the range`);
    const ul = h('ul', { class: 'fv-list' });
    for (const x of list.slice(0, 12)) ul.append(h('li', null, ccTripRowEl(x)));
    S.ccTripBox.append(ul);
  }
  function ccPaintMerch(ctx) {
    const cd = S.ccMerch; if (!cd) return;
    const rows = ccRows(ctx).filter(x => F.country ? x.pc === F.country : x.pc !== ctx.M._plHome);
    S.ccMerchBox.innerHTML = '';
    const by = new Map();
    for (const x of rows) { const m = by.get(x.m) || { m: x.m, c: x.c, s: 0, n: 0, cc: x.pc, city: x.pcity }; m.s += x.s; m.n++; if (!m.city && x.pcity) m.city = x.pcity; by.set(x.m, m); }
    const list = [...by.values()].filter(m => m.s > 0.004).sort((a, b) => b.s - a.s).slice(0, 10);
    cd.setSub(F.country ? 'In ' + ccName(F.country) : 'Everywhere abroad');
    if (!list.length) { cd.setEmpty(F.country ? 'Nothing spent there in these dates.' : 'Nothing paid abroad in these dates.'); return; }
    cd.setEmpty(null);
    const ul = h('ul', { class: 'fv-list' });
    for (const m of list) {
      ul.append(h('li', null, h('button', { type: 'button', class: 'fv-row fsym-host', onclick: () => openMerchant(m.m) },
        C1.tileEl(m.m, m.c, 'sm'),
        h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t', text: m.m }), h('span', { class: 'fv-row-s', text: [m.city, F.country ? '' : ccName(m.cc), `${m.n} payment${m.n === 1 ? '' : 's'}`].filter(Boolean).join(' · ') })),
        h('span', { class: 'fv-row-v fv-amt', text: gbp2(m.s) }))));
    }
    S.ccMerchBox.append(ul);
  }
  function ccPaintCcy(ctx) {
    const cd = S.ccCcy; if (!cd) return;
    const rows = ccRows(ctx).filter(x => !F.country || x.pc === F.country);
    const list = PL.ccys(rows);
    S.ccCcyBox.innerHTML = '';
    if (!list.length) { cd.setSub(''); cd.setEmpty(`Everything was paid in ${CUR} in these dates (or the bank did not say otherwise).`); return; }
    cd.setEmpty(null);
    const abroadTotal = sum(rows.filter(x => x.pc !== ctx.M._plHome), x => x.s);
    const known = sum(list, x => x.home);
    cd.setSub(abroadTotal > 0 ? `The amount in each currency, what it cost in ${CUR}, and your rate · known for ${pct(clamp(known / abroadTotal, 0, 1))} of the spending abroad` : `What it cost in ${CUR}, and your rate`);
    const ul = h('ul', { class: 'fv-list' });
    for (const x of list) {
      const rate = ccRateText(x.rate, x.ccy);
      const cc = PL.ccyCountry(x.ccy);
      ul.append(h('li', null, h('div', { class: 'fv-row static' },
        h('span', { class: 'fv-cc-flag', html: PL.flag(cc) }),
        h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t fv-amt', text: fmtCcy(x.local, x.ccy) }), h('span', { class: 'fv-row-s', text: [x.ccy, rate, `${x.n} payment${x.n === 1 ? '' : 's'}`].filter(Boolean).join(' · ') })),
        h('span', { class: 'fv-row-v fv-amt', text: gbp2(x.home) }))));
    }
    S.ccCcyBox.append(ul);
  }
  /** "1 € = £0.86", or for a small unit "£1 = ¥189". */
  function ccRateText(rate, ccy) {
    if (!(rate > 0)) return '';
    const sym = (typeof trCurrencyInfo === 'function' && (trCurrencyInfo(ccy) || {}).symbol) || ccy;
    if (rate < 0.1) return `${cur('1')} = ${sym}${nf0.format(1 / rate)}`;
    return `1 ${sym} = ${cur(new Intl.NumberFormat(LOC, { minimumFractionDigits: 2, maximumFractionDigits: rate < 1 ? 3 : 2 }).format(rate))}`;
  }
  function ccPaintCities(ctx) {
    const cd = S.ccCity; if (!cd) return;
    const rows = ccRows(ctx).filter(x => x.pcity && (F.country ? x.pc === F.country : true));
    const by = new Map();
    for (const x of rows) { const k = x.pcity + '|' + x.pc; const c = by.get(k) || { city: x.pcity, cc: x.pc, s: 0, n: 0 }; c.s += x.s; c.n++; by.set(k, c); }
    const list = [...by.values()].filter(c => c.s > 0.004).sort((a, b) => b.s - a.s).slice(0, 12);
    S.ccCityBox.innerHTML = '';
    if (!list.length) { cd.setSub(''); cd.setEmpty('No towns in these dates: only some banks share them (Monzo does).'); return; }
    cd.setEmpty(null);
    cd.setSub('Where the bank gave the town');
    const max = Math.max(0.01, ...list.map(c => c.s));
    const ul = h('ul', { class: 'fv-list fv-cc-list compact' });
    list.forEach((c, i) => ul.append(h('li', null, h('div', { class: 'fv-row static fv-cc-row', style: { '--i': i, '--c': ccColor(c.cc) } },
      h('span', { class: 'fv-cc-flag', html: PL.flag(c.cc === 'HOME' ? '' : c.cc) }),
      h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-cc-top' }, h('span', { class: 'fv-row-t', text: c.city }), h('span', { class: 'fv-cc-pct', text: `${c.n}×` })),
        h('span', { class: 'fv-cc-bar', 'aria-hidden': 'true' }, h('i', { style: { width: Math.max(2, c.s / max * 100).toFixed(1) + '%' } }))),
      h('span', { class: 'fv-row-v fv-amt', text: gbp(c.s) })))));
    S.ccCityBox.append(ul);
  }
