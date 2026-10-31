  // @part 37-tax-feeds.js · NEW (2.28) · OWNER: tax edit (what feeds each Tax figure, with a visible Change; "check this" notes)
  // ── Tax: what feeds a number ──────────────────────────────────────────
  // Every figure on the Tax tab that comes from something you told Freeflo has a plain "Change" button: it opens how the number
  // is made up, and each piece can be changed right there (the pieces are the Your answers lines, 36-answers.js). A figure the tax
  // sums produce (tax due, the bands, National Insurance) says "Worked out from these" and lists what it comes from, with a way to
  // change each one. It is never a box to type over.
  const txMoneyS = x => (x < 0 ? '−' : '') + gbp(Math.abs(x));
  /** A visible button with a pencil (an input) or "Worked out from these" (a calculated figure). id: which panel it opens. */
  function txFeedBtn(id, calc) {
    const open = TX.why === id;
    return h('button', { type: 'button', class: 'fv-chg' + (calc ? ' calc' : ''), 'aria-expanded': open ? 'true' : 'false', onclick: () => { TX.why = open ? null : id; txPaint(); } },
      ic(open ? 'chevron-down' : calc ? 'circle-help' : 'pencil'), h('span', { text: open ? 'Close' : calc ? 'Worked out from these' : 'Change' }));
  }
  function txOpenJob(id, o) { TX.edit = { id }; TX.focus = id; TX.why = null; if (o && o.ytd) TX.focusYtd = id; txPaint(); }
  const txStatic = (label, valueKids, note, o) => h('li', { class: 'fv-ans-r fv-tx-fi' + (o && o.total ? ' total' : '') + (o && o.dim ? ' dim' : '') },
    h('div', { class: 'fv-tx-fi-h' }, h('span', { class: 'l' }, label, note ? h('small', { text: note }) : null), h('span', { class: 'v' }, valueKids)),
    o && o.btn ? o.btn : null);
  const txLinesWith = (id, extra) => { const lines = ansLinesFor(id); if (extra && lines[0]) { const v = lines[0].querySelector('.v'); if (v) v.append(h('small', { class: 'fv-ans-x', text: extra })); } return lines; };

  function txFeed(v, key) {
    const p = v.position, a = v.allowance, y = v.yearLabel;
    const ul = [];
    let title = '', lead = '';
    const lineOf = k => v.lines.find(l => l.key === k);
    const jobBtn = (id, label) => h('button', { type: 'button', class: 'fv-link', text: label || 'Open this job', onclick: () => txOpenJob(id) });
    if (!MPL.v) ul.push(h('li', { class: 'fv-pl-mute', text: 'Opening your answers…' }));
    if (key === 'allowance') {
      title = `Your tax-free amount: ${gbp(a.total)}`;
      lead = a.override != null ? `You are using your own figure from HMRC. The pieces below are not used while you do.` : `The part of your income with no tax on it. It is made up like this, and you can change each piece.`;
      const dim = a.override != null;
      ul.push(txStatic('Standard tax-free amount', amt(gbp(a.standard)), `Set by the government for ${y}. Everyone gets it unless their income is very high.`, { dim }));
      if (a.taper) ul.push(txStatic('Reduced for high income', amt(txMoneyS(-a.taper)), `Worked out from your income: 1 pound off for every 2 pounds over ${gbp(a.taperFrom)}.`, { dim }));
      ul.push(...txLinesWith('blind', a.blind ? `adds ${gbp(a.blindAmount)}` : 'adds nothing'));
      ul.push(...txLinesWith('allowances', a.marriage === 'give' ? `takes off ${gbp(a.marriageAmount)}` : a.marriage === 'get' ? `adds ${gbp(a.marriageAmount)} to your tax code` : null));
      ul.push(...txLinesWith('bik', a.bik ? 'taxed like pay, and lowers your tax code' : null));
      ul.push(txStatic(a.override != null ? 'Your own figure from HMRC' : 'Your tax-free amount', amt(gbp(a.total)), a.override != null && a.note ? a.note : a.override == null ? `Worked out: ${gbp(a.workedOut)}. Tax code to match: ${a.code}.` : null, { total: true }));
      ul.push(txAllowanceOwn(v));
    } else if (key === 'income') {
      title = `Total income: ${gbp(p.income)}`;
      lead = `Everything you earned and received in ${y}. Each line comes from a source below: open one to change it.`;
      for (const l of v.lines.filter(x => x.group === 'income' && !x.total)) {
        const job = /^job:/.test(l.key) ? l.key.slice(4) : null;
        const self = /^self-/.test(l.key) && v.sources.self[0] ? v.sources.self[0].id : null;
        ul.push(txStatic(l.label, amt(txMoneyS(l.amount)), l.how, { btn: job ? jobBtn(job) : self ? jobBtn(self, 'Open this work') : null }));
      }
      ul.push(txStatic('Total income', amt(gbp(p.income)), null, { total: true }));
    } else if (key === 'taxDue') {
      title = `Income tax: ${gbp(p.taxDue)}`;
      lead = 'Worked out by the tax sums, so you cannot type over it. It comes from these, so change one of them instead.';
      ul.push(txStatic('Your income', amt(gbp(p.income)), null, { btn: h('button', { type: 'button', class: 'fv-link', text: 'See what makes it up', onclick: () => { TX.why = 'row:income'; txPaint(); } }) }));
      ul.push(txStatic('Your tax-free amount', amt(gbp(p.allowance)), a.override != null ? 'Your own figure from HMRC.' : null, { btn: h('button', { type: 'button', class: 'fv-link', text: 'See what makes it up', onclick: () => { TX.why = 'row:allowance'; txPaint(); } }) }));
      ul.push(...txLinesWith('region', `uses ${v.regionName} rates`));
      for (const l of v.lines.filter(x => x.group === 'tax' && x.sub)) ul.push(txStatic(l.label, amt(txMoneyS(l.amount)), l.how, { dim: true }));
      ul.push(txStatic('Income tax for the year', amt(gbp(p.taxDue)), `Your jobs take ${gbp(p.taxTaken)} of it through payroll.`, { total: true }));
    } else if (key === 'ni') {
      title = `National Insurance from your jobs: ${gbp(p.niTotal)}`;
      lead = 'Worked out job by job, payday by payday, from each job’s pay. Open a job to change its pay or dates.';
      for (const n of p.ni) ul.push(txStatic(n.name || 'Job', amt(gbp(n.amount)), null, { btn: jobBtn(n.id) }));
    } else if (key === 'loan') {
      title = `Student loan: ${gbp(p.loanDue)}`;
      lead = 'Worked out from your pay over the repayment threshold for your plan. It comes from these.';
      ul.push(...txLinesWith('loans', p.loanNames.length ? null : 'none'));
      for (const l of v.lines.filter(x => x.group === 'loan')) ul.push(txStatic(l.label, amt(txMoneyS(l.amount)), l.how, { total: l.total }));
      for (const j of v.sources.jobs) ul.push(txStatic(`Pay from ${j.name}`, amt(gbp(j.year ? j.year.pay : 0)), null, { btn: jobBtn(j.id) }));
    } else if (key === 'class4') {
      title = `National Insurance on your profit: ${gbp(p.class4)}`;
      lead = 'Worked out from your self-employed profit. It comes from your money in and your costs.';
      for (const s of v.sources.self) ul.push(txStatic(s.name, amt(`${gbp(s.income)} in, ${gbp(s.costs + s.capital)} costs`), null, { btn: jobBtn(s.id, 'Open this work') }));
    }
    return h('div', { class: 'fv-tx-why', role: 'region', 'aria-label': title }, h('h4', { text: title }), h('p', { class: 'fv-pl-mute small', text: lead }), h('ul', { class: 'fv-ans-list' }, ul));
  }

  /** "Use my actual figure": the tax-free amount HMRC gave, kept for this tax year only, with one click back to worked out. */
  function txAllowanceOwn(v) {
    const a = v.allowance;
    if (a.override != null) {
      return h('li', { class: 'fv-ans-r fv-tx-own' }, h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', null, `This is your figure, not one Freeflo worked out. The sums use ${gbp(a.override)}. `, h('button', { type: 'button', class: 'fv-link', text: `Go back to worked out (${gbp(a.workedOut)})`, onclick: () => txDo({ action: 'answers.set', fields: { allowanceOverride: null } }, 'Your tax-free amount is worked out again', { close: false }) }))));
    }
    const num = moneyWire(h('input', { type: 'text', inputmode: 'decimal', class: 'fv-tx-in', 'aria-label': 'Tax-free amount from HMRC', placeholder: moneyNice(a.workedOut), autocomplete: 'off' }));
    const note = h('input', { type: 'text', class: 'fv-tx-in', 'aria-label': 'A note about where it came from', placeholder: 'For example: from my coding notice of 3 October', maxlength: '120', autocomplete: 'off' });
    const go = async (e) => {
      e.preventDefault();
      const x = moneyParse(num.value);
      if (x == null || !isFinite(x) || x < 0) { num.classList.add('bad'); num.title = MONEY_HELP; num.focus(); return; }
      await txDo({ action: 'answers.set', fields: { allowanceOverride: x, allowanceNote: note.value.trim() } }, 'Using your tax-free amount from HMRC', { close: false });
    };
    return h('li', { class: 'fv-ans-r fv-tx-own' }, h('details', { class: 'fv-pl-more' }, h('summary', null, h('b', { text: 'Use my actual figure' }), h('span', { class: 'mute', text: 'If HMRC gave you one' })),
      h('form', { class: 'fv-tx-form', onsubmit: go },
        h('p', { class: 'fv-pl-mute small', text: 'HMRC’s coding notice, or your personal tax account, shows “your tax-free amount”. Your tax code has it too: 1257L means 12,570. Type it here and Freeflo uses your figure for this tax year instead of working one out.' }),
        txField('Tax-free amount from HMRC', num), txField('A note for yourself (optional)', note),
        h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Use my figure' })))));
  }

  /* ---------- check this ---------- */
  /** Calm notes about things that look unusual, each with one tap to put it right or "That is right". */
  function txLooksOff(v) {
    const list = v.looksOff || [];
    if (!list.length) return null;
    return txCard('fv-tx-check',
      txHead('Worth a quick look', list.length === 1 ? 'Something may not be right. Freeflo has changed nothing.' : 'Some things may not be right. Freeflo has changed nothing.'),
      h('ul', { class: 'fv-pl-flags-l' }, list.map(n => h('li', { class: 'fv-pl-flag info' }, ic('info'),
        h('div', { class: 'fv-pl-flag-m' }, h('b', { text: n.title }), h('span', { text: n.text }),
          h('div', { class: 'fv-pl-acts' },
            n.fix ? txBtn(n.fix.label, 'check', () => txDo(n.fix.change, n.fix.label, { close: false }), 'small primary') : null,
            n.open ? txBtn('Open it', 'pencil', () => txOpenJob(n.open), 'small') : null,
            txBtn(n.keep, null, () => txDo({ action: 'dismiss', tx: 'check:' + n.id }, 'Thanks. Freeflo will not ask about that again.', { close: false }), 'ghost small')))))));
  }
