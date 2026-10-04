  // @part 96-money-story-hook.js · NEW (3 Oct 2026) · OWNER: MS (the money story's model and figures, for tests and the console; not an API for other modules)
  // FinanceView._moneyStory.model                          the pure model (MSM, 25-money-story-model.js)
  // FinanceView._moneyStory.story({analysis, period, ref})  the story's figures and lines for an analysis.json,
  //                                                        built the way the page builds them (buildModel, its
  //                                                        recurring list, VK.groups); without analysis: the loaded data
  window.FinanceView._moneyStory = {
    model: MSM,
    story(opts) {
      opts = opts || {};
      const M = opts.analysis ? buildModel(opts.analysis) : R.model;
      if (!M) return null;
      const S = msStory(opts, M);
      const sc = MSM.script(S, mbFmt());
      const pick = x => JSON.parse(JSON.stringify(x));
      return pick({ key: S.key, period: S.period, start: S.start, to: S.to, days: S.days, spent: S.spent, payments: S.payments, usual: S.usual, mood: S.mood, curve: S.curve,
        cats: S.cats.map(x => ({ c: x.c, v: x.v })), topcat: S.topcat && S.topcat.c, merchants: S.merchants.map(x => ({ name: x.name, v: x.v, n: x.n })),
        bills: S.bills.map(b => ({ m: b.m, n: b.n, amount: b.amount })), billsTotal: S.billsTotal, kept: S.kept, big: S.big && { m: S.big.m, a: S.big.a, n: S.big.n },
        facts: { noSpendDays: S.facts.noSpendDays, streak: S.facts.streak && S.facts.streak.len }, lines: sc.lines, beats: MSM.beats(S, sc) });
    },
  };
