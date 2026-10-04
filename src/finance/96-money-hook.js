  // @part 96-money-hook.js · NEW (3 Oct 2026) · OWNER: O (the money brief's model and figures, for tests and the console; not an API for other modules)
  // FinanceView._money.model                     the pure model (MBM, 25-money-model.js)
  // FinanceView._money.brief({analysis, mode})   the brief's figures for an analysis.json, built the way
  //                                              the page builds them (buildModel + its recurring list);
  //                                              without analysis: the loaded data
  window.FinanceView._money = {
    model: MBM,
    state: () => ({ mode: MB.mode, entering: !!MB.entering, reading: !!MB.read, ai: !!MB.ai, built: !!(MB.el && MB.el.hero && MB.el.hero.isConnected) }),
    brief(opts) {
      opts = opts || {};
      const M = opts.analysis ? buildModel(opts.analysis) : R.model;
      if (!M) return null;
      const input = { tx: M.tx, anchor: M.anchor, minN: M.minN, balances: M.a.balances, history: M.a.balance_history, recurring: M.recurring };
      const B = MBM.compute(input, { mode: opts.mode, fmt: mbFmt() });
      const pick = x => JSON.parse(JSON.stringify(x));
      return pick({ mode: B.mode, key: B.key, cycle: B.cycle, spent: B.spent, usual: B.usual, mood: B.mood, projected: B.projected, usualEnd: B.usualEnd, moneyIn: B.moneyIn, net: B.net,
        bills: B.bills.map(b => ({ m: b.m, n: b.n, amount: b.amount })), billsTotal: B.billsTotal, safe: B.safe, movers: B.movers.slice(0, 6).map(x => ({ k: x.k, now: x.now, usual: x.usual, delta: x.delta })),
        sentences: B.sentences.map(s => s.text), insights: B.insights.map(x => x.title) });
    },
  };
