  // @part 25-board-model.js · NEW (2.16) · OWNER: FUX (My money: the widget catalogue, presets and the layout)
  // ── My money: what can go on it, the presets, the saved layout (BD) ───
  // User request (24 Oct): Finances "easier and more customisable like the home
  // screen ... very very useful information we can use every day ... lots of
  // options for simpler finance people and complex finance people". My money
  // is a board of widgets on the Finances grid (12 columns, shelves like Home's:
  // 12-home-grid.js), each with its own small settings.
  //
  // The layout is a synced preference (F.board -> state.uiPrefs.finance.board,
  // 00-core.js SHARED_F), so it follows the person to every device:
  //   {v: 1, preset: 'simple' | 'detailed' | 'scratch' | 'custom', style: 'simple' | 'detailed',
  //    strip: true (the everyday strip on top), w: [{i: uid, t: type, s: size, o: {settings}, c?: columns, h?: rows}]}
  // Sizes are Home's: s (a third), m (half), l (two thirds), xl (full width). 2.19.5 (free sizing, the board engine
  // of 12-home-board.js is shared with Home): a widget may also have its own width c (1-12 columns of 12) and height
  // h (rows, HOME_ROW_PX each; none = as tall as its content); s is then the allowed size nearest c. A layout saved
  // before has neither and keeps its sizes.
  // Nothing about money goes in: types, sizes and choices only.
  //
  //   BW_DEFS / bwDef(t)        the catalogue: {t, title, icon, group, desc, sizes, size, opts: [{k, label, choices, def}
  //                             | {k, label, input: 'money' | 'text' | 'date' | 'acct', def}]}
  //   The 'fun' group (no-spend days, a savings goal, best weeks) is where the gamification
  //   work hooks in: their numbers come from bdFun() (39-board-widgets.js, FinanceView.fun()).
  //   BD_PRESETS                 simple | detailed | scratch: (style) -> widgets
  //   boardClean(b) / boardGet() / boardSave(next, say) / boardUndo()
  //   bwOpt(w, k)                a widget's setting (its own, else the default)
  const BD_SIZES = ['s', 'm', 'l', 'xl'];
  const BD_SIZE_COLS = { s: 4, m: 6, l: 8, xl: 12 };
  const BD_SIZE_LABEL = { s: 'S', m: 'M', l: 'L', xl: 'XL' };
  const BD_SIZE_LONG = { s: 'Small · a third', m: 'Medium · half', l: 'Large · two thirds', xl: 'Full width' };
  const BD_MAX = 40;
  // A widget that follows the dates can keep its own period instead.
  const BD_PERIOD = { k: 'period', label: 'Dates', choices: [['filter', 'Follow the filter'], ['TW', 'This week'], ['TM', 'This month'], ['1M', 'Last 30 days'], ['3M', '3 months'], ['YTD', 'This year']], def: 'filter' };
  const BW_GROUPS = [['everyday', 'Everyday'], ['spending', 'Where it goes'], ['plan', 'Bills and budgets'], ['accounts', 'Accounts'], ['travel', 'Travel'], ['fun', 'Goals and streaks'], ['insight', 'Insight']];
  const BW_DEFS = [
    { t: 'payday', title: 'Payday countdown', icon: 'calendar-clock', group: 'everyday', size: 's', sizes: ['s', 'm', 'l'], now: true,
      desc: 'Days to payday as a ring, how far through the pay cycle you are, and spending so far against a usual cycle.',
      opts: [{ k: 'pace', label: 'Spending so far', choices: [['on', 'Show'], ['off', 'Hide']], def: 'on' }] },
    { t: 'safe', title: 'Safe to spend', icon: 'wallet', group: 'everyday', size: 'm', sizes: ['s', 'm', 'l'], now: true,
      desc: 'What you can spend until payday after the bills that are still to come and a little kept back.',
      opts: [{ k: 'show', label: 'Show', choices: [['day', 'A day'], ['total', 'In total']], def: 'day' },
        { k: 'cushion', label: 'Keep back', choices: [[0, 'Nothing'], [50, '50'], [100, '100'], [250, '250'], [500, '500']], def: 100, money: true }] },
    { t: 'vsmonth', title: 'This month vs last', icon: 'calendar-days', group: 'everyday', size: 'm', sizes: ['s', 'm', 'l', 'xl'], now: true,
      desc: 'Spent so far this month against the same day last month, and where the month is heading.',
      opts: [{ k: 'chart', label: 'Chart', choices: [['on', 'Show'], ['off', 'Hide']], def: 'on' },
        { k: 'cmp', label: 'Compare with', choices: [['day', 'Same day last month'], ['full', 'All of last month']], def: 'day' }] },
    { t: 'cats', title: 'Spending by category', icon: 'chart-pie', group: 'spending', size: 'm', sizes: ['s', 'm', 'l', 'xl'],
      desc: 'Where the money went, with the change on the period before. Click one to see only it everywhere.',
      opts: [{ k: 'view', label: 'Show as', choices: [['list', 'List'], ['donut', 'Donut'], ['bars', 'Bars']], def: 'list' },
        { k: 'top', label: 'How many', choices: [[5, '5'], [8, '8'], [12, '12']], def: 8 }, BD_PERIOD] },
    { t: 'countries', title: 'Spending by country', icon: 'globe', group: 'travel', size: 'm', sizes: ['s', 'm', 'l', 'xl'],
      desc: 'Each country with its flag, what it cost at home and in the local money. Click one to see only it.',
      opts: [{ k: 'scope', label: 'Countries', choices: [['all', 'Everywhere'], ['abroad', 'Abroad only']], def: 'all' },
        { k: 'top', label: 'How many', choices: [[5, '5'], [8, '8'], [12, '12']], def: 5 }, BD_PERIOD] },
    { t: 'merchants', title: 'Spending by shop', icon: 'building-2', group: 'spending', size: 's', sizes: ['s', 'm', 'l'],
      desc: 'The shops and services you spent the most at, or went to most often.',
      opts: [{ k: 'sort', label: 'Sort by', choices: [['spend', 'Amount'], ['visits', 'Payments']], def: 'spend' },
        { k: 'top', label: 'How many', choices: [[5, '5'], [8, '8'], [12, '12']], def: 5 }, BD_PERIOD] },
    { t: 'budgets', title: 'Budgets', icon: 'piggy-bank', group: 'plan', size: 'm', sizes: ['s', 'm', 'l', 'xl'], now: true,
      desc: 'Each monthly budget: spent, left and whether it is on pace for the month.',
      opts: [{ k: 'show', label: 'Show', choices: [['all', 'All budgets'], ['watch', 'Only ones to watch']], def: 'all' },
        { k: 'top', label: 'How many', choices: [[4, '4'], [5, '5'], [8, '8'], [20, 'All']], def: 5 }] },
    { t: 'moneyplan', title: 'Your money plan', icon: 'piggy-bank', group: 'plan', size: 'm', sizes: ['s', 'm', 'l', 'xl'], now: true,
      desc: 'What is left a month, and what looks off against your bank this month.',
      opts: [{ k: 'top', label: 'How many things to show', choices: [[2, '2'], [4, '4'], [6, '6']], def: 2 }] },
    { t: 'bills', title: 'Bills and subscriptions', icon: 'repeat', group: 'plan', size: 'm', sizes: ['s', 'm', 'l', 'xl'], now: true,
      desc: 'What is due next and what you pay every month, with cancel reminders you can note on any subscription.',
      opts: [{ k: 'days', label: 'Coming up in', choices: [[7, '7 days'], [14, '14 days'], [30, '30 days'], [60, '60 days']], def: 30 },
        { k: 'kind', label: 'Show', choices: [['all', 'Everything'], ['bills', 'Bills'], ['subs', 'Subscriptions']], def: 'all' },
        { k: 'top', label: 'How many', choices: [[4, '4'], [5, '5'], [8, '8'], [12, '12']], def: 5 }] },
    { t: 'balances', title: 'Balances and pots', icon: 'landmark', group: 'accounts', size: 's', sizes: ['s', 'm', 'l'], now: true,
      desc: 'Every account and pot with its latest balance, and the total.',
      opts: [{ k: 'pots', label: 'Pots', choices: [['show', 'Show'], ['hide', 'Hide']], def: 'show' },
        { k: 'sort', label: 'Sort by', choices: [['bal', 'Balance'], ['name', 'Name']], def: 'bal' }] },
    { t: 'networth', title: 'Net worth trend', icon: 'chart-line', group: 'accounts', size: 'm', sizes: ['m', 'l', 'xl'], now: true,
      desc: 'All your balances added up over time, and how much that moved.',
      opts: [{ k: 'span', label: 'Over', choices: [['3M', '3 months'], ['6M', '6 months'], ['1Y', 'A year'], ['All', 'All']], def: '6M' }] },
    { t: 'cashflow', title: 'Cash flow', icon: 'arrow-up-down', group: 'accounts', size: 'l', sizes: ['m', 'l', 'xl'], now: true,
      desc: 'Money in and out each month, and what was left over.',
      opts: [{ k: 'months', label: 'Months', choices: [[3, '3'], [6, '6'], [12, '12']], def: 6 }] },
    { t: 'income', title: 'Income', icon: 'coins', group: 'accounts', size: 's', sizes: ['s', 'm', 'l'], now: true,
      desc: 'Money in this month against usual, the next payday and where it came from.',
      opts: [{ k: 'sources', label: 'Sources', choices: [['on', 'Show'], ['off', 'Hide']], def: 'on' }] },
    { t: 'big', title: 'Big or unusual payments', icon: 'triangle-alert', group: 'spending', size: 'm', sizes: ['s', 'm', 'l', 'xl'],
      desc: 'Large payments, a shop charging much more than usual, and big first-time places.',
      opts: [{ k: 'min', label: 'Big means over', choices: [[50, '50'], [100, '100'], [250, '250'], [500, '500']], def: 100, money: true }, BD_PERIOD] },
    { t: 'passport', title: 'Travel passport', icon: 'ticket', group: 'travel', size: 'm', sizes: ['s', 'm', 'l', 'xl'], now: true,
      desc: 'A stamp for every country you have paid in: when you first did, how many trips and what it all cost.',
      opts: [{ k: 'sort', label: 'Order', choices: [['first', 'First visit'], ['last', 'Latest visit'], ['spend', 'Most spent']], def: 'first' }] },
    { t: 'trips', title: 'Spend per trip', icon: 'plane', group: 'travel', size: 'm', sizes: ['s', 'm', 'l', 'xl'],
      desc: 'What each trip cost, a day and in the local money. Click one to make its dates the range.',
      opts: [{ k: 'which', label: 'Trips', choices: [['all', 'Latest'], ['range', 'In the dates']], def: 'all' },
        { k: 'top', label: 'How many', choices: [[3, '3'], [6, '6'], [12, '12']], def: 6 }] },
    { t: 'heatmap', title: 'Daily spend calendar', icon: 'calendar-range', group: 'spending', size: 'l', sizes: ['m', 'l', 'xl'],
      desc: 'Every day as a square, darker on bigger days. Click a day to see what you bought.',
      opts: [{ k: 'weeks', label: 'Weeks', choices: [[8, '8'], [13, '13'], [26, '26'], [52, '52']], def: 13 }] },
    { t: 'insights', title: 'Money insights', icon: 'sparkles', group: 'insight', size: 'm', sizes: ['s', 'm', 'l', 'xl'], now: true,
      desc: 'Your money in three sentences and what is worth a look, from the money brief (Claude can reword it).',
      opts: [{ k: 'cards', label: 'Insight cards', choices: [['on', 'Show'], ['off', 'Hide']], def: 'on' }] },
    { t: 'streak', title: 'No-spend days', icon: 'flame', group: 'fun', size: 's', sizes: ['s', 'm', 'l'], now: true,
      desc: 'Days in a row without day-to-day spending, your best run this year and how many this month. Bills and transfers never break it.',
      opts: [{ k: 'bills', label: 'Bills and subscriptions', choices: [['ignore', "Don't break it"], ['count', 'Break it']], def: 'ignore' },
        { k: 'small', label: 'Small buys under', choices: [[0, 'All count'], [2, '2'], [5, '5']], def: 0, money: true }] },
    { t: 'owed', title: 'Owed to me', icon: 'handshake', group: 'everyday', size: 's', sizes: ['s', 'm', 'l'], now: true,
      desc: 'What people owe you and whether the bank shows they paid. Split a payment from here.', opts: [] },
    { t: 'goal', title: 'Savings goal', icon: 'target', group: 'fun', size: 's', sizes: ['s', 'm', 'l'], now: true,
      desc: 'A target for a pot, an account or everything you have, how far along you are and what it takes each month.',
      opts: [{ k: 'name', label: 'Name', input: 'text', def: '' }, { k: 'target', label: 'Target', input: 'money', def: 1000 },
        { k: 'acct', label: 'What counts', input: 'acct', def: 'all' }, { k: 'by', label: 'By (optional)', input: 'date', def: '' }] },
    { t: 'weeks', title: 'Best weeks', icon: 'trophy', group: 'fun', size: 's', sizes: ['s', 'm', 'l'], now: true,
      desc: 'Your cheapest week this year, how this week is going against it, and your lowest-spending month.',
      opts: [{ k: 'what', label: 'Counts', choices: [['day', 'Day-to-day'], ['all', 'Everything']], def: 'day' }] },
    { t: 'roundup', title: 'Spare change', icon: 'coins', group: 'fun', size: 's', sizes: ['s', 'm', 'l'], now: true,
      desc: 'What rounding every card payment up would have put aside this year, and month by month.',
      opts: [{ k: 'to', label: 'Round up to', choices: [[1, '1'], [5, '5'], [10, '10']], def: 1, money: true }] },
    { t: 'whatif', title: 'What if I cut…', icon: 'wand-sparkles', group: 'insight', size: 's', sizes: ['s', 'm', 'l'], now: true,
      desc: 'Pick a category and a cut: what it would save a month and a year, from what you really spend there.',
      opts: [{ k: 'cat', label: 'Category', input: 'cat', def: 'auto' }, { k: 'cut', label: 'Cut it by', choices: [[10, '10%'], [25, '25%'], [50, 'Half'], [100, 'All of it']], def: 25 }] },
    { t: 'recent', title: 'Recent transactions', icon: 'receipt', group: 'everyday', size: 'xl', sizes: ['s', 'm', 'l', 'xl'],
      desc: 'The latest payments, following the filters above (a trip, a country, a category).',
      opts: [{ k: 'n', label: 'How many', choices: [[5, '5'], [10, '10'], [20, '20']], def: 10 },
        { k: 'kind', label: 'Show', choices: [['spend', 'Spending'], ['all', 'Everything'], ['income', 'Money in']], def: 'spend' }, BD_PERIOD] },
  ];
  const BW_BY = new Map(BW_DEFS.map(d => [d.t, d]));
  const bwDef = t => BW_BY.get(t) || null;
  /** A free setting's value made safe (a goal's name, target, account, date), or undefined. */
  function bwInput(o, v) {
    if (o.input === 'money') { const n = Number(v); return Number.isFinite(n) && n > 0 && n < 1e9 ? round2(n) : undefined; }
    if (o.input === 'text') { const s = typeof v === 'string' ? v.replace(/[\x00-\x1f]/g, ' ').trim().slice(0, 40) : ''; return s || undefined; }
    if (o.input === 'date') return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
    if (o.input === 'acct') return typeof v === 'string' && v.length <= 80 && /^[\w.:-]+$/.test(v) ? v : undefined;
    if (o.input === 'cat') return typeof v === 'string' && (v === 'auto' || CAT_RE.test(v)) ? v : undefined;
    return undefined;
  }
  /** A widget's setting: its own choice when it is one of the def's, else the default. */
  function bwOpt(w, k) {
    const d = bwDef(w.t); const o = d && d.opts.find(x => x.k === k);
    if (!o) return w.o ? w.o[k] : undefined;
    const v = w.o ? w.o[k] : undefined;
    if (o.input) { const x = bwInput(o, v); return x === undefined ? o.def : x; }
    return o.choices.some(c => c[0] === v) ? v : o.def;
  }

  // ── Presets ──
  // Simple: the everyday five, big numbers and plain words. Detailed: everything, with charts.
  // Start from scratch: an empty board and the gallery.
  const BD_PRESETS = {
    simple: () => [
      ['vsmonth', 'm', { chart: 'off' }], ['budgets', 'm', { top: 4 }], ['bills', 'm', { days: 14, top: 4 }], ['recent', 'xl', { n: 5 }],
    ],
    detailed: () => [
      ['safe', 's'], ['vsmonth', 'm'], ['payday', 's'],
      ['cats', 'm', { view: 'donut' }], ['countries', 'm'],
      ['cashflow', 'l'], ['income', 's'],
      ['merchants', 's'], ['budgets', 's'], ['bills', 's'],
      ['networth', 'm'], ['balances', 'm'],
      ['big', 'm'], ['trips', 'm'],
      ['passport', 'l'], ['whatif', 's'],
      ['heatmap', 'l'],
      ['streak', 's'], ['weeks', 's'], ['goal', 's'],
      ['roundup', 's'],
      ['recent', 'xl', { n: 20, kind: 'all' }],
    ],
    scratch: () => [],
  };
  const BD_PRESET_INFO = {
    simple: { label: 'Simple', icon: 'circle-check', desc: 'The everyday four: this month, budgets, bills and the latest payments. Big numbers, plain words.' },
    detailed: { label: 'Detailed', icon: 'layout-grid', desc: 'Everything: charts, countries, trips, cash flow, net worth, streaks and goals, filters and drill-downs.' },
    scratch: { label: 'Start from scratch', icon: 'circle-plus', desc: 'An empty page: add only the widgets you want.' },
  };
  let bdUidN = 0;
  function bdUid(t) { bdUidN = (bdUidN + 1) % 1e6; return (t + '-' + Date.now().toString(36).slice(-5) + bdUidN.toString(36)).slice(0, 24); }
  function bdPreset(name) {
    const style = name === 'simple' ? 'simple' : 'detailed';
    const w = (BD_PRESETS[name] || BD_PRESETS.simple)().map(([t, s, o], i) => ({ i: t + '-' + i, t, s, o: o || {} }));
    return { v: 1, preset: BD_PRESETS[name] ? name : 'simple', style, strip: false, w };   // 2.19.1: the strip repeated the widgets below it; it is one menu tick away (Everyday strip)
  }
  /** A saved layout made safe: known widgets, known sizes and choices, unique ids, at most 40. null = none saved. */
  function boardClean(b) {
    if (!b || typeof b !== 'object' || !Array.isArray(b.w)) return null;
    const seen = new Set(), w = [];
    for (const x of b.w) {
      if (!x || typeof x !== 'object' || !bwDef(x.t) || w.length >= BD_MAX) continue;
      const d = bwDef(x.t);
      let id = typeof x.i === 'string' && /^[a-z0-9-]{1,24}$/i.test(x.i) ? x.i : bdUid(x.t);
      while (seen.has(id)) id = bdUid(x.t);
      seen.add(id);
      const o = {};
      if (x.o && typeof x.o === 'object') for (const opt of d.opts) {
        if (opt.input) { const v = bwInput(opt, x.o[opt.k]); if (v !== undefined) o[opt.k] = v; }
        else if (opt.choices.some(c => c[0] === x.o[opt.k])) o[opt.k] = x.o[opt.k];
      }
      // A free width (c) wins over the size; c is kept only when it is not exactly that size's columns.
      const c0 = Number.isInteger(x.c) && x.c >= 1 && x.c <= 12 ? x.c : undefined;
      const s = c0 ? boardNearestSize(c0, d.sizes, BD_SIZE_COLS) : (d.sizes.includes(x.s) ? x.s : d.size);
      const hr = Number.isInteger(x.h) && x.h >= HOME_H_MIN && x.h <= HOME_H_MAX ? x.h : undefined;
      w.push({ i: id, t: x.t, s, o, ...(c0 && c0 !== BD_SIZE_COLS[s] ? { c: c0 } : {}), ...(hr ? { h: hr } : {}) });
    }
    return {
      v: 1, preset: ['simple', 'detailed', 'scratch', 'custom'].includes(b.preset) ? b.preset : 'custom',
      style: b.style === 'simple' ? 'simple' : 'detailed', strip: b.strip !== false, w,
    };
  }
  /** The layout on show: the saved one, else Simple. */
  function boardGet() { return boardClean(F.board) || bdPreset('simple'); }
  // Customise's own Undo (and every toast's Undo): the layouts before each change, this page only.
  const BD_UNDO = [];
  /** Save a new layout (one synced preference). say: the toast ("Budgets removed") with Undo. */
  function boardSave(next, say, o) {
    o = o || {};
    const prev = boardGet();
    const clean = boardClean(next);
    // The same as on show is no change, except the first save (until then the board is the default, unsaved).
    if (!clean || (sameJ(clean, prev) && boardClean(F.board))) return false;
    if (!o.noUndo) { BD_UNDO.push(prev); if (BD_UNDO.length > 50) BD_UNDO.shift(); }
    F.board = clean; saveF();
    if (typeof bdApply === 'function') bdApply(o);
    if (say && !o.quiet) toast(say, { kind: 'ok', icon: o.icon || 'layout-template', action: 'Undo', onAction: () => boardUndo() });
    return true;
  }
  function boardUndo() {
    const p = BD_UNDO.pop();
    if (!p) { toast('Nothing to undo', { icon: 'undo-2' }); return; }
    F.board = p; saveF();
    if (typeof bdApply === 'function') bdApply({});
    toast('Undone', { kind: 'ok', icon: 'undo-2' });
  }
  /** Mark the layout as the user's own once they change it (the preset menu then says "Your own"). */
  function bdCustom(b) { return Object.assign({}, b, { preset: b.w.length || b.preset !== 'scratch' ? 'custom' : 'scratch' }); }
