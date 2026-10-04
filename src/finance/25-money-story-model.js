  // @part 25-money-story-model.js · NEW (3 Oct 2026) · OWNER: MS (the money story's pure model; no DOM and no other part's helpers except MBM, because lib/finance/money-story.mjs evaluates this file with 25-money-model.js in Node)
  // ── Money story model (MSM) ───────────────────────────────────────────
  // The full-screen "money story" (28-money-story.js, played by the Story
  // engine): a month or week recap in beats, Monzo-style. Every figure comes
  // from the money brief's model (MBM, 25-money-model.js) run over the same
  // rows, so the story says what Finances shows: spending is rows of kind
  // 'spend' (refunds count against it), the usual pace is MBM.bands over up to
  // six earlier periods, bills ahead are MBM.billsBetween (the Overview's
  // "Coming up"), and kept is money in minus spending (the Cash flow card).
  //
  //   MSM.defaultPeriod(anchor)        {period: 'month', ref}: last month on the first 3 days, else this month
  //   MSM.periodOf(period, ref, anchor, minN, weekStart)   the period as an MBM cycle {mode, start, next, len, day, daysLeft, prev}
  //   MSM.build(input, opts)           S: everything the story shows (input as MBM.compute takes it)
  //   MSM.beats(S)                     the beat ids that have something to show, in order
  //   MSM.script(S, fmt)               the deterministic narration {headline, theme, lines: {beatId: text}, source}
  //   MSM.facts(S, fmt)                what an AI may see: aggregates only (never a single transaction)
  //   MSM.validate(ai, S, fmt)         an AI's lines checked number by number -> {lines, replaced, dropped}
  //   MSM.key(S)                       short key of the headline numbers
  // opts for build: {period: 'month' | 'week', ref (a day number in the period; default the anchor),
  //   fmt (MBM.makeFmt or the page's), weekStart ('Mon' | 'Sun'), groups ({keyOf, label, primary}: merchant
  //   name variants as one; default each raw name alone), isCoffee(m, c) -> bool, top (merchants, 5)}.
  const MSM = (function () {
    'use strict';
    const U = MBM.util;
    const r2 = U.r2, med = U.med;
    const bump = (map, k, v) => map.set(k, (map.get(k) || 0) + v);
    const sumBy = (a, f) => { let s = 0; for (const x of a) s += f(x); return s; };
    const MAX_PERIODS = 6;
    const COFFEE_RE = /\bcoffee|\bcaf[eé]\b|\bespresso|\bbarista|\broasters?\b|\bcosta\b|\bstarbucks\b|\bcaff?[eè] nero\b|\bpret\b/i;
    // The beats in order; ids are stable (an AI line replaces the template line of the same id).
    const BEATS = ['intro', 'spent', 'topcat', 'race', 'big', 'bills', 'kept', 'facts', 'close'];
    // Beats an AI may reword: every one except the biggest purchase (that is one transaction).
    const AI_BEATS = BEATS.filter(b => b !== 'big');

    /* ---------- the period ---------- */
    function weekStartOf(n, weekStart) {
      const sun = String(weekStart || 'Mon').toLowerCase().startsWith('sun');
      return n - (sun ? (U.dowOf(n) + 1) % 7 : U.dowOf(n));
    }
    // The story of a month is told from its 1st: in the first three days the
    // month just gone is the one worth telling; after that, this month so far.
    function defaultPeriod(anchor) {
      const dom = U.domOf(anchor);
      return dom <= 3 ? { period: 'month', ref: anchor - dom } : { period: 'month', ref: anchor };
    }
    // The period holding `ref`, up to the anchor, as an MBM cycle. A month is
    // exactly MBM.cycleOf(to, 'month'), the Overview's month mode.
    function periodOf(period, ref, anchor, minN, weekStart) {
      ref = Math.min(Number.isFinite(ref) ? ref : anchor, anchor);
      if (period !== 'week') {
        const next = U.mStart(U.mIdx(ref) + 1);
        return MBM.cycleOf(Math.min(next - 1, anchor), 'month', null, minN);
      }
      const start = weekStartOf(ref, weekStart), next = start + 7;
      const to = Math.min(next - 1, anchor);
      const prev = [];
      for (let k = MAX_PERIODS; k >= 1; k--) if (start - 7 * k >= minN) prev.push({ start: start - 7 * k, next: start - 7 * k + 7 });
      return { mode: 'week', start, next, len: 7, day: to - start, daysLeft: next - to, late: false, prev };
    }

    /* ---------- everything the story shows ---------- */
    function build(input, opts) {
      opts = opts || {};
      const fmt = opts.fmt || MBM.makeFmt();
      const tx = input.tx || [], A = input.anchor, minN = input.minN;
      const period = opts.period === 'week' ? 'week' : 'month';
      const cyc = periodOf(period, opts.ref, A, minN, opts.weekStart);
      const to = cyc.start + cyc.day;
      const days = cyc.day + 1;
      // Spent against usual: the same calls MBM.compute makes for its month mode.
      const curve = MBM.curve(tx, cyc.start, cyc.len, cyc.day);
      const spent = curve.length ? curve[curve.length - 1] : 0;
      const pace = MBM.bands(tx, cyc);
      const usual = pace ? pace.med[Math.min(cyc.day, pace.med.length - 1)] : null;
      const usualEnd = pace ? pace.med[pace.med.length - 1] : null;
      const mood = MBM.moodOf(spent, usual, usualEnd);
      const complete = to >= cyc.next - 1;
      // Merchant groups (name variants as one) and their display names.
      const G = opts.groups && typeof opts.groups.keyOf === 'function' ? opts.groups : null;
      const keyOf = m => { if (!G) return m; try { return G.keyOf(m) || m; } catch (e) { return m; } };
      const recM = new Set((input.recurring || []).filter(r => r && r.active).map(r => keyOf(r.m)));
      const rows = tx.filter(t => t.n >= cyc.start && t.n <= to);
      const spend = rows.filter(t => t.kind === 'spend');
      const payments = spend.filter(t => t.s > 0).length;
      // Merchants: spending and visits per group.
      const mer = new Map();
      for (const t of spend) {
        const k = keyOf(t.m);
        let g = mer.get(k); if (!g) { g = { k, v: 0, n: 0, raw: new Map(), cat: new Map() }; mer.set(k, g); }
        g.v += t.s; if (t.s > 0) g.n++;
        bump(g.raw, t.m, Math.abs(t.s)); bump(g.cat, t.c, Math.abs(t.s));
      }
      const top1 = map => [...map.entries()].sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1))[0][0];
      const labelOf = (k, raw) => { if (G && typeof G.label === 'function') { try { const s = G.label(k); if (s) return String(s); } catch (e) { /* the raw name */ } } return nameOf(fmt, raw); };
      const merAll = [...mer.values()].map(g => { const raw = top1(g.raw); return { k: g.k, m: raw, name: labelOf(g.k, raw), c: top1(g.cat), v: r2(g.v), n: g.n }; });
      const merBy = new Map(merAll.map(x => [x.k, x]));
      // Categories (as MBM.compute's cats) and who leads each.
      const catNow = new Map(), leadAmt = new Map();
      for (const t of spend) { bump(catNow, t.c, t.s); bump(leadAmt, t.c + '\u0000' + keyOf(t.m), t.s); }
      const lead = {};
      for (const [k, v] of [...leadAmt.entries()].sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1))) { const i = k.indexOf('\u0000'); const c = k.slice(0, i); if (!lead[c] && v > 0) lead[c] = k.slice(i + 1); }
      const cats = [...catNow.entries()].filter(e => e[1] > 0.004).sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1))
        .map(([c, v]) => { const lk = lead[c] || null, lm = lk ? merBy.get(lk) : null; return { c, v: r2(v), share: spent > 0 ? v / spent : 0, fixed: MBM.isFixed(c), lead: lk, leadName: lm ? lm.name : null, leadM: lm ? lm.m : null }; });
      // The top category people choose day to day (rent and bills don't move with habits), else the top one.
      const topcat = cats.find(x => !x.fixed) || cats[0] || null;
      if (topcat) topcat.everyday = !topcat.fixed && cats[0] !== topcat;
      // The top places are where the spending was chosen: rent, bills and regular payments sit out.
      const merchants = merAll.filter(x => x.v > 0.004 && !MBM.isFixed(x.c) && !recM.has(x.k)).sort((p, q) => q.v - p.v || (p.k < q.k ? -1 : 1)).slice(0, opts.top || 5);
      // The race: running spend per top merchant at the end of each day.
      const race = (() => {
        const keys = merchants.map(x => x.k), at = new Map(keys.map((k, i) => [k, i]));
        const per = keys.map(() => new Array(days).fill(0));
        for (const t of spend) { const i = at.get(keyOf(t.m)); if (i != null) per[i][t.n - cyc.start] += t.s; }
        const run = keys.map(() => 0);
        const frames = [];
        for (let d = 0; d < days; d++) { per.forEach((a, i) => { run[i] = r2(run[i] + a[d]); }); frames.push({ n: cyc.start + d, values: run.slice() }); }
        return { keys, frames };
      })();
      // The biggest purchase: the largest one-off (not a regular payment, not rent or a bill), else the largest.
      let big = null, bigAny = null;
      for (const t of spend) {
        if (!(t.s > 0)) continue;
        if (!bigAny || t.s > bigAny.s) bigAny = t;
        if (!recM.has(keyOf(t.m)) && !MBM.isFixed(t.c) && (!big || t.s > big.s)) big = t;
      }
      big = big || bigAny;
      const bigOut = big ? { m: big.m, k: keyOf(big.m), name: labelOf(keyOf(big.m), big.m), c: big.c, a: r2(big.s), n: big.n, oneOff: !recM.has(keyOf(big.m)) } : null;
      // Bills ahead: the Overview's "Coming up" (the next 30 days from today).
      const bills = MBM.billsBetween(input.recurring || [], A, A + 31).map(b => ({ m: b.m, name: nameOf(fmt, b.m), c: b.c, n: b.n, due: b.due, amount: b.amount, freq: b.freq }));
      const billsTotal = r2(sumBy(bills, b => b.amount));
      // Kept: money in minus spending (the Cash flow section's Kept card and its sankey).
      const inc = r2(sumBy(rows, t => (t.kind === 'income' ? t.inc : 0)));
      const out = r2(sumBy(spend, t => t.s));
      const kept = r2(inc - out);
      const rate = inc > 0 ? kept / inc : null;
      // Fun facts: coffees, the regular, the quietest day, the longest no-spend run.
      // A coffee: the name or category says so, or opts.isCoffee does (FinSymbols' coffee scene on page and server).
      const isCoffee = (m, c, t) => COFFEE_RE.test(String(m || '')) || /coffee|caf[eé]/i.test(String(c || '')) || (typeof opts.isCoffee === 'function' && !!opts.isCoffee(m, c, t));
      let coffees = 0, coffeeV = 0;
      for (const t of spend) { if (t.s > 0) { let yes = false; try { yes = !!isCoffee(t.m, t.c, t); } catch (e) { yes = false; } if (yes) { coffees++; coffeeV += t.s; } } }
      const regular = merAll.filter(x => x.n >= 2 && !recM.has(x.k) && !MBM.isFixed(x.c)).sort((p, q) => q.n - p.n || q.v - p.v || (p.k < q.k ? -1 : 1))[0] || null;
      const daily = new Array(days).fill(0);
      for (const t of spend) daily[t.n - cyc.start] += t.s;
      const dayV = daily.map(r2);
      const quiet = (v) => v <= 0.004;
      let qi = 0, bi = 0;
      dayV.forEach((v, i) => { if (v < dayV[qi]) qi = i; if (v > dayV[bi]) bi = i; });
      let best = { len: 0, from: null, to: null }, cur = 0;
      dayV.forEach((v, i) => { if (quiet(v)) { cur++; if (cur > best.len) best = { len: cur, from: cyc.start + i - cur + 1, to: cyc.start + i }; } else cur = 0; });
      const noSpendDays = dayV.filter(quiet).length;
      const facts = {
        coffees: coffees ? { n: coffees, v: r2(coffeeV) } : null,
        regular: regular ? { k: regular.k, m: regular.m, name: regular.name, c: regular.c, n: regular.n, v: regular.v, coffee: (() => { try { return isCoffee(regular.m, regular.c); } catch (e) { return false; } })() } : null,
        quietest: days ? { n: cyc.start + qi, v: dayV[qi] } : null,
        busiest: days && dayV[bi] > 0 ? { n: cyc.start + bi, v: dayV[bi] } : null,
        streak: best.len >= 2 ? best : null,
        noSpendDays,
      };
      const S = {
        v: 1, period, anchor: A, start: cyc.start, next: cyc.next, to, len: cyc.len, day: cyc.day, days, complete,
        thisPeriod: cyc.next > A, cycle: cyc,
        spent, payments, perDay: r2(spent / Math.max(1, days)), curve, pace, usual, usualEnd, mood,
        cats, topcat, merchants, race, big: bigOut, bills, billsTotal,
        kept: { inc, out, kept, rate }, facts,
      };
      S.key = key(S);
      return S;
    }

    /* ---------- words ---------- */
    const nameOf = (fmt, m) => { if (fmt && typeof fmt.name === 'function') { try { const s = fmt.name(m); if (s) return String(s); } catch (e) { /* the raw name */ } } return String(m); };
    const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
    const list = a => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
    const pctOf = x => Math.round(Math.abs(x) * 100);
    // Pence only when there are some ("£19", "£10.99").
    const moneyExact = (fmt, v) => (Math.abs(r2(v) - Math.round(v)) < 0.005 ? fmt.money(v) : fmt.money2(v));
    const dayRef = (n, anchor, fmt) => (n === anchor ? 'today' : n === anchor + 1 ? 'tomorrow' : n > anchor && n - anchor < 7 ? 'on ' + fmt.weekday(n) : 'on ' + fmt.short(n));
    // How the period is named in a sentence.
    function words(S, fmt) {
      const mon = fmt.month(S.start);
      if (S.period === 'month') return S.thisPeriod
        ? { when: 'so far this month', in: 'this month', name: mon, unit: 'month', usual: 'your usual pace', headline: `${mon} so far`, intro: `Here's ${mon} so far, in money.`, close: `That's ${mon} so far. Check back when the month is done.` }
        : { when: `in ${mon}`, in: `in ${mon}`, name: mon, unit: 'month', usual: 'a usual month', headline: `${mon} in money`, intro: `Here's your ${mon} in money.`, close: `That's ${mon}. See you next month.` };
      const wk = `the week of ${fmt.short(S.start)}`;
      // "last week" only for the week just gone; an older one is named by its first day.
      const last = S.anchor - S.next >= 0 && S.anchor - S.next < 7;
      if (S.thisPeriod) return { when: 'so far this week', in: 'this week', name: wk, unit: 'week', usual: 'your usual pace', headline: 'Your week so far', intro: "Here's your week so far, in money.", close: "That's your week so far. See you next week." };
      return last
        ? { when: 'last week', in: 'last week', name: wk, unit: 'week', usual: 'a usual week', headline: 'Your week in money', intro: "Here's last week in money.", close: "That's your week. See you next week." }
        : { when: `in ${wk}`, in: `in ${wk}`, name: wk, unit: 'week', usual: 'a usual week', headline: 'Your week in money', intro: `Here's ${wk} in money.`, close: `That's ${wk}.` };
    }
    function script(S, fmt) {
      fmt = fmt || MBM.makeFmt();
      const W = words(S, fmt), M = v => fmt.money(v);
      const L = {};
      L.intro = W.intro;
      // Spent against usual.
      const past = !S.thisPeriod;
      if (S.spent <= 0.004) L.spent = `Nothing spent ${W.when}.`;
      else if (S.mood.known) {
        const d = S.mood.diff;
        if (Math.abs(d) < 1) L.spent = past ? `You spent ${M(S.spent)} ${W.when}, about the same as ${W.usual}.` : `You've spent ${M(S.spent)} ${W.when}, right on ${W.usual}.`;
        else if (past) L.spent = `You spent ${M(S.spent)} ${W.when}, ${M(Math.abs(d))} ${d < 0 ? 'less' : 'more'} than ${W.usual}.`;
        else L.spent = `You've spent ${M(S.spent)} ${W.when}, ${M(Math.abs(d))} ${d < 0 ? 'under' : 'over'} ${W.usual}.`;
      } else L.spent = `${past ? 'You spent' : "You've spent"} ${M(S.spent)} ${W.when}, about ${M(S.perDay)} a day.`;
      // The top category.
      const tc = S.topcat;
      if (tc) {
        const leadName = tc.leadName || '';
        const mostly = leadName && leadName !== tc.c && leadName.length <= 26 ? `, mostly at ${leadName}` : '';
        L.topcat = `${tc.c} was your biggest ${tc.everyday ? 'everyday ' : ''}category at ${M(tc.v)}, ${pctOf(tc.share)}% of all your spending${mostly}.`;
      }
      // The top places.
      const ms = S.merchants;
      if (ms.length >= 3) L.race = `${ms[0].name} took the top spot at ${M(ms[0].v)}, ahead of ${ms[1].name} and ${ms[2].name}.`;
      else if (ms.length === 2) L.race = `${ms[0].name} took the top spot at ${M(ms[0].v)}, ahead of ${ms[1].name}.`;
      // The biggest purchase (template only: it is one transaction).
      if (S.big) L.big = `Your biggest ${S.big.oneOff ? 'one-off ' : ''}purchase was ${moneyExact(fmt, S.big.a)} at ${S.big.name}, on ${fmt.long(S.big.n)}.`;
      // Bills ahead.
      const b = S.bills;
      if (b.length >= 2) L.bills = `Coming up: ${b.length} bills worth ${M(S.billsTotal)} in the next 30 days, starting with ${b[0].name} ${b[0].due ? 'now' : dayRef(b[0].n, S.anchor, fmt)}.`;
      else if (b.length === 1) L.bills = `Coming up: ${b[0].name}, ${moneyExact(fmt, b[0].amount)} ${b[0].due ? 'now' : dayRef(b[0].n, S.anchor, fmt)}, is the only bill in the next 30 days.`;
      // Kept.
      const K = S.kept, lead = W.in.charAt(0).toUpperCase() + W.in.slice(1);
      if (K.inc > 0.004) L.kept = K.kept >= 0 ? `${lead}, ${M(K.inc)} came in and you kept ${M(K.kept)} of it: a savings rate of ${pctOf(K.rate)}%.` : `${lead}, ${M(K.inc)} came in and you spent ${M(-K.kept)} more than that.`;
      else if (K.out > 0.004) L.kept = `Nothing came in ${W.in}, so there's no savings rate: ${M(K.out)} went out.`;
      // Fun facts.
      const f = S.facts, bits = [];
      // The regular is often the coffee shop: one clause then ("20 coffees, 18 of them at Bean There").
      if (f.coffees && f.regular && f.regular.coffee && f.regular.n <= f.coffees.n) bits.push(`${plural(f.coffees.n, 'coffee')}, ${f.regular.n === f.coffees.n ? 'all' : f.regular.n} of them at ${f.regular.name}`);
      else {
        if (f.coffees) bits.push(plural(f.coffees.n, 'coffee'));
        if (f.regular) bits.push(`${plural(f.regular.n, 'visit')} to ${f.regular.name}`);
      }
      if (f.streak) bits.push(`a ${f.streak.len}-day no-spend streak`);
      else if (f.noSpendDays) bits.push(plural(f.noSpendDays, 'no-spend day'));
      if (bits.length) L.facts = `A few fun facts: ${list(bits)}.`;
      L.close = W.close;
      const theme = `${M(S.spent)} spent · ${plural(S.payments, 'payment')}`;
      return { headline: W.headline, theme, lines: L, source: 'template' };
    }
    // The beats with something to show, in order (the template has a line for each).
    function beats(S, sc) {
      const L = (sc && sc.lines) || {};
      return BEATS.filter(id => {
        if (id === 'intro' || id === 'close' || id === 'spent') return true;
        if (id === 'topcat') return !!S.topcat;
        if (id === 'race') return S.merchants.length >= 2;
        if (id === 'big') return !!S.big;
        if (id === 'bills') return S.bills.length > 0;
        if (id === 'kept') return S.kept.inc > 0.004 || S.kept.out > 0.004;
        if (id === 'facts') return !!L.facts;
        return false;
      });
    }

    /* ---------- what an AI may see: aggregates only ---------- */
    function facts(S, fmt) {
      fmt = fmt || MBM.makeFmt();
      const W = words(S, fmt);
      const M = v => (v == null ? null : fmt.money(v)), M2 = v => (v == null ? null : fmt.money2(v));
      const f = S.facts, K = S.kept;
      return {
        period: { kind: S.period === 'week' ? 'week' : 'calendar month', name: W.name, from: fmt.long(S.start), to: fmt.long(S.to), finished: !S.thisPeriod, daysCovered: S.days, earlierPeriodsCompared: S.pace ? S.pace.n : 0 },
        spending: { total: M(S.spent), payments: S.payments, perDay: M(S.perDay), usual: M(S.usual), difference: S.mood.known ? M(Math.abs(S.mood.diff)) : null,
          direction: S.mood.known ? (S.mood.diff < -0.5 ? 'less than usual' : S.mood.diff > 0.5 ? 'more than usual' : 'about usual') : 'no usual yet' },
        topCategory: S.topcat ? { name: S.topcat.c, total: M(S.topcat.v), percentOfAllSpending: pctOf(S.topcat.share), everydayOnly: !!S.topcat.everyday, mostlyAt: S.topcat.leadName || null } : null,
        categories: S.cats.slice(0, 6).map(x => ({ name: x.c, total: M(x.v) })),
        // Places with one visit would be one transaction: only regulars (2+ visits) are sent.
        topPlaces: S.merchants.filter(x => x.n >= 2).map(x => ({ name: x.name, total: M(x.v), visits: x.n })),
        billsNext30Days: { count: S.bills.length, total: M(S.billsTotal), next: S.bills.slice(0, 6).map(b => ({ merchant: b.name, amount: M2(b.amount), due: b.due ? 'now' : fmt.long(b.n) })) },
        kept: K.inc > 0.004 ? { moneyIn: M(K.inc), spent: M(K.out), result: K.kept >= 0 ? 'kept' : 'spent more than came in', amount: M(Math.abs(K.kept)), savingsRatePercent: K.rate == null ? null : (K.kept >= 0 ? pctOf(K.rate) : null) } : { moneyIn: M(0), spent: M(K.out) },
        funFacts: { coffees: f.coffees ? f.coffees.n : 0, regular: f.regular ? { name: f.regular.name, visits: f.regular.n } : null,
          longestNoSpendStreakDays: f.streak ? f.streak.len : 0, noSpendDays: f.noSpendDays },
      };
    }
    // Merchant groups are left out: the page merges name variants with a few more rules than the server.
    function key(S) {
      return [S.period, S.start, S.to, S.anchor, Math.round(S.spent), S.usual == null ? '-' : Math.round(S.usual), S.topcat ? S.topcat.c : '-', Math.round(S.kept.inc), Math.round(S.kept.out), S.bills.length, Math.round(S.billsTotal)].join('|');
    }

    /* ---------- checking an AI's lines against the numbers ---------- */
    function allowed(S) {
      const money = new Set(), counts = new Set(), pcts = new Set();
      const addM = v => { if (v == null || !isFinite(v)) return; money.add(r2(Math.abs(v))); };
      [S.spent, S.usual, S.perDay, S.billsTotal, S.kept.inc, S.kept.out, S.kept.kept].forEach(addM);
      if (S.mood.known) addM(S.mood.diff);
      S.cats.slice(0, 6).forEach(x => addM(x.v));
      S.merchants.forEach(x => { addM(x.v); counts.add(x.n); });
      S.bills.slice(0, 6).forEach(b => addM(b.amount));
      if (S.topcat) pcts.add(pctOf(S.topcat.share));
      if (S.kept.rate != null && S.kept.kept >= 0) pcts.add(pctOf(S.kept.rate));
      const f = S.facts;
      [S.payments, S.days, S.bills.length, S.pace ? S.pace.n : 0, 30, f.coffees ? f.coffees.n : 0, f.regular ? f.regular.n : 0, f.streak ? f.streak.len : 0, f.noSpendDays].forEach(v => counts.add(v));
      for (const n of [S.start, S.to, S.anchor, ...S.bills.slice(0, 6).map(b => b.n)]) { counts.add(U.domOf(n)); counts.add(new Date(n * 864e5).getUTCFullYear()); }
      return { money, counts, pcts };
    }
    function okNumber(x, A) {
      if (x.vague || !isFinite(x.v)) return false;
      if (x.pct) return [...A.pcts].some(p => Math.abs(p - x.v) <= 1);
      const near = (v, tol) => [...A.money].some(m => Math.abs(m - v) <= tol);
      if (x.money) return x.k ? near(x.v, 50) : x.dp ? near(x.v, 0.006) : near(x.v, 0.5);
      if ((x.word || Number.isInteger(x.v)) && A.counts.has(x.v)) return true;
      return x.v >= 32 && near(x.v, x.dp ? 0.006 : 0.5);   // an amount written without its symbol
    }
    const UPW = /\b(over|above|more|higher|ahead|up|extra)\b/i;
    const DOWNW = /\b(under|below|less|lower|behind|down|saved)\b/i;
    // A clause that pairs the gap from usual with the opposite direction fails ("£87 more" when it was less).
    function wrongWay(text, S, fmt) {
      if (!S.mood.known || Math.abs(S.mood.diff) < 1) return false;
      const gap = Math.abs(S.mood.diff), sign = Math.sign(S.mood.diff);
      const cuts = [0, text.length]; const cr = /[,;:.!?]|\s(?:while|but|and|whereas)\s/gi; let c;
      while ((c = cr.exec(text))) cuts.push(c.index, c.index + c[0].length);
      cuts.sort((p, q) => p - q);
      const clauseAt = at => { let a = 0, b = text.length; for (const x of cuts) { if (x <= at) a = x; else { b = x; break; } } return text.slice(a, b); };
      for (const x of MBM.numbersIn(text, fmt)) {
        if (!x.money || Math.abs(x.v - gap) > 0.5) continue;
        const cl = clauseAt(x.at); const up = UPW.test(cl), down = DOWNW.test(cl);
        if (up !== down && (up ? 1 : -1) !== sign) return true;
      }
      return false;
    }
    // ai: {lines: {beatId: text}} or [{beat, text}]. Returns the lines to play: every AI line whose
    // numbers all check out, else the template's line for that beat. The biggest purchase is never reworded.
    function validate(ai, S, fmt) {
      fmt = fmt || MBM.makeFmt();
      const tpl = script(S, fmt).lines;
      const A = allowed(S);
      let raw = {};
      if (ai && Array.isArray(ai.lines)) for (const x of ai.lines) { if (x && typeof x.beat === 'string' && typeof x.text === 'string') raw[x.beat] = x.text; }
      else if (ai && ai.lines && typeof ai.lines === 'object') raw = ai.lines;
      const out = {}; let replaced = 0, dropped = 0, used = 0;
      for (const id of Object.keys(tpl)) {
        const t = raw[id];
        if (!AI_BEATS.includes(id) || typeof t !== 'string') { out[id] = tpl[id]; if (typeof t === 'string') dropped++; continue; }
        const text = t.replace(/\s+/g, ' ').trim();
        const bad = !text || text.length > 220 || /[<>{}[\]]|https?:|www\./i.test(text) || MBM.numbersIn(text, fmt).some(x => !okNumber(x, A)) || (id === 'spent' && wrongWay(text, S, fmt));
        if (bad) { out[id] = tpl[id]; replaced++; continue; }
        out[id] = text; used++;
      }
      for (const id of Object.keys(raw)) if (!(id in tpl)) dropped++;
      return { lines: out, replaced, dropped, used };
    }

    return { BEATS, AI_BEATS, defaultPeriod, periodOf, weekStartOf, build, beats, script, facts, key, allowed, validate, words };
  })();
