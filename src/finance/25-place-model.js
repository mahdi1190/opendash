  // @part 25-place-model.js · NEW (2.16) · OWNER: FUX (Finances redesign: Spending by country)
  // ── Where each payment was made (PL) ──────────────────────────────────
  // User request (24 Oct): "segregate by country money spent". Every row gets a
  // country from the best source there is, in this order:
  //   1. the merchant's country (t.cc: Monzo's merchant address, a bank's
  //      counterparty address; lib/finance/place.mjs), unless it is an online shop;
  //   2. the memo's own country ("CAFE DE FLORE PARIS FR"), read with the travel
  //      rules (trFxSignal, src/app/69-travel-logic.js); online billers sit out;
  //   3. the currency it was paid in (t.lc from the provider, or the memo's
  //      "12.00 JPY") -> that currency's country. EUR stays 'EZ' (the Eurozone)
  //      unless a trip on that day says which eurozone country; a currency many
  //      countries share stays 'X:<CCY>' ("Paid in XOF");
  //   4. a trip (Travel's trips, decided trips, and runs of payments abroad found
  //      here): a payment dated within one -> the trip's country. Bills,
  //      subscriptions, transfers, income and online shops sit out;
  //   5. else the home country (config location, the home zone's country, the
  //      currency's country).
  // Each row then has t.pc (country), t.ps (source: merchant | memo | currency |
  // trip | home) and t.pcity, plus t.plc / t.pla (the local currency and amount,
  // when known). PL.ensure(M) fills them once per model and trips; nothing here
  // runs at load, and nothing is stored (the facts come with the analysis, so the
  // other devices work it out the same way from the published copy).
  //
  //   PL.ensure(M)            fills the rows (cheap when nothing changed)
  //   PL.home()               the home country code ('GB'), '' when unknown
  //   PL.label(cc) / PL.flag(cc, o)   'France' / 'Eurozone' / 'Paid in XOF'; the flag chip (SVG, never emoji)
  //   PL.trips(M)             [{id, label, cc, from, to, src: travel | decided | payments}] (oldest first)
  //   PL.agg(rows, o)         per country: [{cc, label, total, n, lc: {CCY: amount}, lcCover, months, trips,
  //                           merchants, cities, src, first, last, abroad}], biggest first
  //   PL.ccys(rows)           per currency paid in: [{ccy, local, home, n, rate}]
  //   PL.coverage(rows)       {merchant, memo, currency, trip, home, total}: how each total is known
  const PL = (function () {
    const SRC = ['merchant', 'memo', 'currency', 'trip', 'home'];
    const FX_NOTE = /\((\d+(?:\.\d+)?) ([A-Z]{3}) @ \d+(?:\.\d+)?\)\s*$/;
    let memo = new Map();             // memo|merchant -> trFxSignal result
    let done = { M: null, key: '' };
    let ccyMap = null;                // ccy -> [cc] from the travel tables
    const g = (name) => { try { return typeof window[name] === 'function' ? window[name] : null; } catch (e) { return null; } };

    function places() {
      try { return typeof TravelStore !== 'undefined' && TravelStore && typeof TravelStore.places === 'function' ? TravelStore.places() : null; } catch (e) { return null; }
    }
    function home() {
      const loc = CFG.location;
      if (loc && /^[A-Z]{2}$/.test(String(loc.countryCode || ''))) return loc.countryCode;
      try {
        const zc = g('trZoneCountry');
        if (zc && typeof Clock !== 'undefined') { const c = zc(Clock.home()); if (c) return c; }
      } catch (e) { /* no travel tables */ }
      const c = ccyCountry(CUR, true);
      return /^[A-Z]{2}$/.test(c) ? c : '';
    }
    // The countries that pay in a currency (the travel tables; their first is the main one).
    function ccyCountries(ccy) {
      if (typeof TRL_CCY_OF !== 'undefined' && TRL_CCY_OF[ccy]) return TRL_CCY_OF[ccy];
      if (!ccyMap) {
        ccyMap = new Map();
        try {
          const T = typeof trPlaceTables === 'function' ? trPlaceTables() : null;
          for (const [cc, c] of Object.entries((T && T.countries) || {})) { if (!c || !/^[A-Z]{3}$/.test(c.ccy || '')) continue; if (!ccyMap.has(c.ccy)) ccyMap.set(c.ccy, []); ccyMap.get(c.ccy).push(cc); }
        } catch (e) { /* no tables */ }
      }
      return ccyMap.get(ccy) || [];
    }
    /** A currency -> its country: EUR = 'EZ'; one of many = 'X:<CCY>' (unless o.loose: the first). */
    function ccyCountry(ccy, loose) {
      ccy = String(ccy || '').toUpperCase();
      if (!/^[A-Z]{3}$/.test(ccy)) return '';
      if (ccy === 'EUR') return 'EZ';
      const list = ccyCountries(ccy);
      if (typeof TRL_CCY_OF !== 'undefined' && TRL_CCY_OF[ccy]) return list[0];   // the main country (USD: US, CHF: CH)
      if (list.length === 1 || (loose && list.length)) return list[0];
      return 'X:' + ccy;
    }
    const isEuro = (cc) => cc === 'EZ' || ccyCountries('EUR').includes(cc);
    function label(cc) {
      if (!cc) return 'Unknown';
      if (cc === 'EZ') return 'Eurozone';
      if (cc.startsWith('X:')) {
        const info = g('trCurrencyInfo') ? g('trCurrencyInfo')(cc.slice(2)) : null;
        return 'Paid in ' + (info && info.name && info.name !== info.code ? info.name : cc.slice(2));
      }
      const f = g('trCountryLabel');
      if (f) { const n = f(cc); if (n) return n; }
      try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || cc; } catch (e) { return cc; }
    }
    /** The flag chip: the travel module's SVG flags (Windows draws emoji flags as letters), else letters. */
    function flag(cc, o) {
      o = o || {};
      const cls = 'fv-ccflag' + (o.cls ? ' ' + o.cls : '');
      if (cc === 'EZ') return `<span class="tr-flag is-cc ${cls}" role="img" aria-label="Eurozone">EU</span>`;
      if (!cc || cc.startsWith('X:')) return `<span class="tr-flag is-cc ${cls}" role="img" aria-label="${esc(label(cc))}">${esc(cc ? cc.slice(2, 4) : '?')}</span>`;
      const f = g('trFlagHtml');
      if (f) { try { return f(cc, { cls }); } catch (e) { /* letters */ } }
      return `<span class="tr-flag is-cc ${cls}" role="img" aria-label="${esc(label(cc))}">${esc(cc)}</span>`;
    }

    /* ---------- trips ---------- */
    function travelTrips(M) {
      const out = [], seen = new Set();
      const end = diso(M.anchor);
      try {
        if (typeof TravelStore !== 'undefined' && TravelStore && TravelStore.on()) {
          for (const t of TravelStore.trips() || []) {
            if (!t || !validIso(t.from) || !t.dest || !/^[A-Z]{2}$/.test(t.dest.cc || '')) continue;
            if (t.candidate && !t.confirmed) continue;          // a guess from payments: ours below say the same
            out.push({ id: t.id, label: t.label || label(t.dest.cc), cc: t.dest.cc, from: t.from, to: validIso(t.to) ? t.to : end, src: 'travel', stops: (t.stops || []).map(s => s && s.cc).filter(Boolean) });
            for (const x of t.ids || [t.id]) seen.add(x);
          }
        }
      } catch (e) { /* travel not loaded */ }
      // Trips the user confirmed (state.travel), even with travel features off or the inputs gone.
      const dec = typeof state !== 'undefined' && state && state.travel && state.travel.trips;
      for (const [id, d] of Object.entries(dec && typeof dec === 'object' ? dec : {})) {
        if (seen.has(id) || !d || !d.confirmed || !d.dest || !/^[A-Z]{2}$/.test(d.dest.cc || '') || !validIso(d.from)) continue;
        out.push({ id, label: (typeof d.name === 'string' && d.name.trim()) || d.dest.label || label(d.dest.cc), cc: d.dest.cc, from: d.from, to: validIso(d.to) ? d.to : d.from, src: 'decided', stops: [] });
      }
      return out;
    }
    function tripKey(list) { return list.map(t => [t.id, t.cc, t.from, t.to].join(':')).join('|'); }

    /* ---------- one row ---------- */
    function signalOf(t, ctx) {
      const k = t.memo + '\u0001' + t.m;
      let s = memo.get(k);
      if (s === undefined) {
        s = null;
        const f = g('trFxSignal');
        if (f && t.memo) { try { s = f(t.memo, { homeCcy: CUR, homeCc: ctx.home, recurring: ctx.recFold, P: ctx.P, merchant: t.m }); } catch (e) { s = null; } }
        memo.set(k, s);
      }
      return s;
    }
    // Steps 1-3 (what the row itself says).
    function own(t, ctx) {
      const info = ctx.M.acctInfo[t.acct] || {};
      const wallet = info.provider === 'plasma';              // a stablecoin wallet's USD says nothing about where
      const online = !!t.ol || ctx.recM.has(t.m);
      const s = online ? null : signalOf(t, ctx);
      const shop = online || !!(s && s.online);
      t.pcity = t.city || '';
      // Local currency and amount: the provider's, else the memo's (not our own conversion note on a wallet).
      t.plc = ''; t.pla = null;
      if (t.lc && t.la > 0) { t.plc = t.lc; t.pla = t.la; }
      else if (s && s.ccy && s.amt > 0 && !(wallet && FX_NOTE.test(t.memo))) { t.plc = s.ccy; t.pla = s.amt; }
      if (t.cc && !t.ol) return ['merchant', t.cc];
      if (!shop && s && s.cc) return ['memo', s.cc];
      if (!shop && t.plc && t.plc !== CUR) return ['currency', ccyCountry(t.plc)];
      return null;
    }
    // Runs of payments abroad (2+ days, or 3+ payments within 3 days of each other) as trips.
    function payTrips(M, rows, known) {
      const by = new Map();
      for (const t of rows) {
        if (t.kind !== 'spend' || !t._own || t._own[1] === M._plHome || t._own[1] === 'EZ' || String(t._own[1]).startsWith('X:')) continue;
        if (t._own[0] === 'merchant' && !t.lc && !t.plc && t.ol) continue;
        const cc = t._own[1];
        if (!by.has(cc)) by.set(cc, []);
        by.get(cc).push(t.n);
      }
      const out = [];
      for (const [cc, ns] of by) {
        ns.sort((a, b) => a - b);
        let cur = null;
        const close = () => { if (cur && (cur.days.size >= 2 || cur.n >= 3)) out.push(cur); };
        for (const n of ns) {
          if (cur && n - cur.to <= 3) { cur.to = n; cur.days.add(n); cur.n++; continue; }
          close();
          cur = { cc, from: n, to: n, days: new Set([n]), n: 1 };
        }
        close();
      }
      return out.filter(e => !known.some(t => t.cc === e.cc && dnum(t.from) <= e.to + 3 && e.from <= dnum(t.to) + 3))
        .map(e => ({ id: 'pay:' + e.cc + ':' + diso(e.from), label: label(e.cc), cc: e.cc, from: diso(e.from), to: diso(e.to), src: 'payments', stops: [] }));
    }

    /** Fill every row's country (t.pc, t.ps, t.pcity, t.plc, t.pla) for model M. */
    function ensure(M) {
      if (!M) return;
      const trips0 = travelTrips(M);
      const key = tripKey(trips0) + '#' + home();
      if (done.M === M && done.key === key) return;
      if (done.M !== M) memo = new Map();
      const ctx = { M, home: home(), P: places(), recM: new Set(M.recurring.filter(r => r.active).map(r => r.m)), recFold: null };
      const fold = g('_trlFold');
      if (fold) ctx.recFold = new Set([...ctx.recM].map(m => fold(m)).filter(Boolean));
      M._plHome = ctx.home;
      for (const t of M.tx) t._own = own(t, ctx);
      const trips = trips0.concat(payTrips(M, M.tx, trips0)).sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
      const spans = trips.map(t => ({ t, a: dnum(t.from), b: dnum(t.to || t.from) }));
      const tripOn = (n) => { let best = null; for (const s of spans) if (n >= s.a && n <= s.b && (!best || s.t.src !== 'payments')) best = s.t; return best; };
      for (const t of M.tx) {
        const o = t._own;
        const tr = t.kind === 'spend' ? tripOn(t.n) : null;
        // Only a trip you really took (Travel's, or one you confirmed) speaks for a row with no sign of
        // its own; a run of payments abroad found here is a trip of those payments only.
        const real = tr && tr.src !== 'payments';
        if (o) {
          // The Eurozone made precise by a eurozone trip on that day.
          if (o[1] === 'EZ' && tr && isEuro(tr.cc)) { t.pc = tr.cc; t.ps = 'currency'; }
          else { t.pc = o[1]; t.ps = o[0]; }
        } else if (real && !t.ol && !ctx.recM.has(t.m) && F.boardTripRows !== false) { t.pc = tr.cc; t.ps = 'trip'; }
        else { t.pc = ctx.home || 'HOME'; t.ps = 'home'; }
        // A trip's spending: what was paid in its countries on its days (bills at home stay out).
        t.ptrip = tr && (t.pc === tr.cc || (tr.stops || []).includes(t.pc) || t.ps === 'trip') ? tr.id : '';
        delete t._own;
      }
      M._plTrips = trips;
      done = { M, key };
    }
    function trips(M) { ensure(M); return M ? M._plTrips || [] : []; }

    /* ---------- totals ---------- */
    function agg(rows, o) {
      o = o || {};
      const by = new Map();
      const homeCc = R.model ? R.model._plHome : home();
      for (const t of rows) {
        if (t.kind !== 'spend' || !t.pc) continue;
        let x = by.get(t.pc);
        if (!x) {
          x = { cc: t.pc, label: label(t.pc === 'HOME' ? '' : t.pc), total: 0, n: 0, lc: {}, lcHome: 0, months: new Map(), trips: new Map(), merchants: new Map(), cities: new Map(), src: {}, first: t.n, last: t.n, abroad: t.pc !== homeCc && t.pc !== 'HOME' };
          if (t.pc === 'HOME') x.label = 'Home';
          by.set(t.pc, x);
        }
        x.total += t.s; x.n++;
        x.first = Math.min(x.first, t.n); x.last = Math.max(x.last, t.n);
        if (t.plc && t.pla > 0) { x.lc[t.plc] = (x.lc[t.plc] || 0) + (t.s < 0 ? -t.pla : t.pla); x.lcHome += t.s; }
        const mi = monthIdx(t.n); x.months.set(mi, (x.months.get(mi) || 0) + t.s);
        if (t.ptrip) x.trips.set(t.ptrip, (x.trips.get(t.ptrip) || 0) + t.s);
        const mm = x.merchants.get(t.m) || { m: t.m, s: 0, n: 0, c: t.c }; mm.s += t.s; mm.n++; x.merchants.set(t.m, mm);
        if (t.pcity) x.cities.set(t.pcity, (x.cities.get(t.pcity) || 0) + t.s);
        x.src[t.ps] = (x.src[t.ps] || 0) + t.s;
      }
      const out = [...by.values()].filter(x => x.total > 0.004 || o.all);
      for (const x of out) {
        x.total = round2(x.total);
        x.lcCover = x.total > 0 ? clamp(x.lcHome / x.total, 0, 1) : 0;
        if (!x.abroad) { x.lc = { [CUR]: x.total }; x.lcCover = 1; }
        for (const k of Object.keys(x.lc)) x.lc[k] = round2(x.lc[k]);
      }
      return out.sort((a, b) => b.total - a.total);
    }
    function ccys(rows) {
      const by = new Map();
      for (const t of rows) {
        if (t.kind !== 'spend' || !t.plc || !(t.pla > 0) || t.plc === CUR) continue;
        const x = by.get(t.plc) || { ccy: t.plc, local: 0, home: 0, n: 0 };
        const sg = t.s < 0 ? -1 : 1;
        x.local += sg * t.pla; x.home += t.s; x.n++;
        by.set(t.plc, x);
      }
      return [...by.values()].map(x => Object.assign(x, { local: round2(x.local), home: round2(x.home), rate: x.local > 0 ? x.home / x.local : null })).sort((a, b) => b.home - a.home);
    }
    function coverage(rows) {
      const o = { total: 0 }; for (const k of SRC) o[k] = 0;
      for (const t of rows) if (t.kind === 'spend' && t.ps && t.s > 0) { o[t.ps] = (o[t.ps] || 0) + t.s; o.total += t.s; }
      return o;
    }
    const SRC_LABEL = { merchant: "the shop's address", memo: 'the description', currency: 'the currency', trip: 'trip dates', home: 'home (no other sign)' };
    return { ensure, home, label, flag, trips, agg, ccys, coverage, ccyCountry, isEuro, SRC, SRC_LABEL };
  })();
