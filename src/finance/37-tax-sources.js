  // @part 37-tax-sources.js · NEW (2.21) · OWNER: tax page (income sources, inline: jobs with code, dates and year-to-date; self-employed periods; other income)
  // ── Tax: where your money comes from ─────────────────────────────────
  // Each row opens in place. A second job's code or dates, and a payslip's year-to-date, are edited here rather than on a list screen.
  const TX_EVERY = [['monthly', 'Month'], ['fourweekly', 'Four weeks'], ['fortnightly', 'Fortnight'], ['weekly', 'Week']];
  const TX_PER = [['year', 'A year'], ['month', 'A month'], ['week', 'A week'], ['total', 'In total']];
  const TX_TYPES = [['job', 'A job with a payslip'], ['self', 'Self-employed work'], ['interest', 'Savings interest'], ['dividend', 'Dividends'], ['rental', 'Rent'], ['side', 'Side income'], ['other', 'Other income']];
  function txField(label, input, help) { return h('label', { class: 'fv-tx-f' }, h('span', { text: label }), input, help ? h('small', { text: help }) : null); }
  function txInput(name, value, type, o) {
    o = o || {};
    return h('input', Object.assign({ name, type: type === 'money' ? 'text' : (type || 'text'), inputmode: type === 'money' ? 'decimal' : null, class: 'fv-tx-in', value: value == null ? '' : String(value), placeholder: o.placeholder || null, autocomplete: 'off' }, o.upper ? { style: { textTransform: 'uppercase' } } : {}));
  }
  /** A form's values by name. Money loses its pound sign and commas. */
  function txRead(form) {
    const out = {};
    for (const el of form.querySelectorAll('input[name], select[name]')) {
      if (el.type === 'checkbox') { out[el.name] = el.checked; continue; }
      const v = el.value.trim();
      out[el.name] = el.inputMode === 'decimal' ? (v === '' ? null : v.replace(/[£,\s]/g, '')) : (v === '' ? null : v);
    }
    return out;
  }
  function txSources(v) {
    const S0 = v.sources;
    const kids = [txHead('Where your money comes from', v.yearState === 'current' ? 'The same list as your money plan: a change here moves both.' : `Your sources for ${v.yearLabel}.`, txBtn('Add', 'plus', () => { TX.edit = { add: true }; txPaint(); }, 'ghost'))];
    if (TX.edit && TX.edit.add) kids.push(txAddForm(v));
    if (!S0.jobs.length && !S0.self.length && !S0.other.length && !(TX.edit && TX.edit.add)) kids.push(h('p', { class: 'fv-pl-mute', text: 'Nothing here yet. Add your jobs and any self-employed work, or use Tell Freeflo in one go at the top.' }));
    if (S0.jobs.length) kids.push(h('h4', { class: 'fv-tx-sub', text: 'Jobs' }), h('ul', { class: 'fv-tx-src' }, S0.jobs.map(j => txJobRow(j, v))));
    if (S0.self.length) kids.push(h('h4', { class: 'fv-tx-sub', text: 'Self-employed' }), h('ul', { class: 'fv-tx-src' }, S0.self.map(s => txSelfRow(s, v))));
    const ask = (TX.d.comeIn || []);
    if (S0.self.length && ask.length) kids.push(txComeIn(ask));
    if (S0.other.length) kids.push(h('h4', { class: 'fv-tx-sub', text: 'Other income' }), h('ul', { class: 'fv-tx-src' }, S0.other.map(o => txOtherRow(o))));
    kids.push(txExtras(v));
    return txCard('fv-tx-sources', kids);
  }
  function txAddForm(v) {
    const typeSel = h('select', { name: 'type', class: 'fv-tx-in', onchange: () => { paintFields(); } }, TX_TYPES.map(([k, l]) => h('option', { value: k, text: l, selected: (TX.edit.type || 'job') === k ? true : null })));
    const box = h('div', { class: 'fv-tx-grid' });
    const paintFields = () => {
      box.textContent = '';
      const t = typeSel.value;
      if (t === 'job') box.append(txField('Employer', txInput('name')), txField('Pay a year, before tax', txInput('annual', '', 'money')), txField('Tax code', txInput('taxCode', '', 'text', { upper: true, placeholder: 'On your payslip, e.g. BR' })), txField('Paid every', h('select', { name: 'every', class: 'fv-tx-in' }, TX_EVERY.map(([k, l]) => h('option', { value: k, text: l })))), txField('First day', txInput('start', '', 'date')), txField('Last day, if it ended', txInput('end', '', 'date')));
      else if (t === 'self') box.append(txField('What is the work?', txInput('name')), txField('From', txInput('start', '', 'date')), txField('To', txInput('end', '', 'date')), txField('Money in, if you know the total', txInput('amount', '', 'money'), 'You can list each payment later instead.'));
      else box.append(txField('Name', txInput('name')), txField('Amount', txInput('amount', '', 'money')), txField('Every', h('select', { name: 'per', class: 'fv-tx-in' }, TX_PER.map(([k, l]) => h('option', { value: k, text: l })))));
    };
    paintFields();
    const form = h('form', { class: 'fv-tx-form', onsubmit: async (e) => { e.preventDefault(); const f = txRead(form); await txDo({ action: 'source.add', source: f }, 'Added'); } },
      txField('What is it?', typeSel), box,
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Add it' }), txBtn('Cancel', null, () => { TX.edit = null; txPaint(); }, 'ghost')));
    return form;
  }
  function txJobRow(j, v) {
    const editing = TX.edit && TX.edit.id === j.id;
    const y = j.year || {};
    const head = h('button', { type: 'button', class: 'fv-tx-src-h', 'aria-expanded': editing ? 'true' : 'false', onclick: () => { TX.edit = editing ? null : { id: j.id }; txPaint(); } },
      h('span', { class: 'n' }, h('b', { text: j.name }), j.main ? h('em', { text: 'main job' }) : null, h('small', { class: 'fv-amt', text: `${j.codeText}: ${j.codeLabel}` })),
      h('span', { class: 'v' }, amt(gbp(y.pay || j.annual)), h('small', { text: 'pay this year' })));
    const notes = (j.notes || []).map(n => h('p', { class: 'fv-pl-note ' + n.level }, ic(n.level === 'warn' ? 'triangle-alert' : 'info'), h('span', { text: n.text })));
    const dates = j.start || j.end ? h('small', { class: 'fv-tx-dates', text: [j.start ? `From ${txShort(j.start)}` : '', j.end ? `to ${txShort(j.end)}` : ''].filter(Boolean).join(' ') }) : null;
    const summary = y.pay != null ? h('p', { class: 'fv-pl-mute small' }, 'Tax ', amt(gbp(y.tax)), ', National Insurance ', amt(gbp(y.ni)), (y.plan + y.pg) ? ', student loan ' : '', (y.plan + y.pg) ? amt(gbp(y.plan + y.pg)) : '', ' over the year.', j.ytd ? ` Using your payslip of ${txShort(j.ytd.asOf)}.` : '') : null;
    let form = null;
    if (editing) {
      const yt = j.ytd || {};
      form = h('form', { class: 'fv-tx-form', onsubmit: async (e) => {
        e.preventDefault();
        const f = txRead(form);
        const fields = { name: f.name, annual: f.annual, taxCode: f.taxCode, every: f.every, start: f.start, end: f.end, prevPay: f.prevPay, prevTax: f.prevTax };
        fields.ytd = f.asOf ? { asOf: f.asOf, pay: f.ytdPay, taxablePay: f.ytdTaxable, tax: f.ytdTax, ni: f.ytdNi, plan: f.ytdPlan, pg: f.ytdPg } : null;
        await txDo({ action: 'source.update', id: j.id, fields }, 'Changed');
      } },
        h('div', { class: 'fv-tx-grid' },
          txField('Employer', txInput('name', j.name)), txField('Pay a year, before tax', txInput('annual', j.annual, 'money')),
          txField('Tax code', txInput('taxCode', j.codeGiven ? j.codeText : '', 'text', { upper: true, placeholder: j.codeText }), 'A short code on your payslip. Leave empty and we use ' + j.codeText + '.'),
          txField('Paid every', h('select', { name: 'every', class: 'fv-tx-in' }, TX_EVERY.map(([k, l]) => h('option', { value: k, text: l, selected: k === j.freq ? true : null })))),
          txField('First day', txInput('start', j.start, 'date')), txField('Last day, if it ended', txInput('end', j.end, 'date'))),
        h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'So far this tax year, from your latest payslip' }), h('p', { class: 'fv-pl-mute small', text: 'Payslips show these as "year to date" or "YTD". Fill in what you can: they replace our estimates up to that date.' }),
          h('div', { class: 'fv-tx-grid' }, txField('Payslip date', txInput('asOf', yt.asOf, 'date')), txField('Pay so far', txInput('ytdPay', yt.pay, 'money')), txField('Taxable pay so far', txInput('ytdTaxable', yt.taxablePay, 'money'), 'Only if it is different.'), txField('Tax so far', txInput('ytdTax', yt.tax, 'money')), txField('National Insurance so far', txInput('ytdNi', yt.ni, 'money')), txField('Student loan so far', txInput('ytdPlan', yt.plan, 'money')), txField('Postgraduate loan so far', txInput('ytdPg', yt.pg, 'money')))),
        h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'From a job earlier this tax year' }), h('p', { class: 'fv-pl-mute small', text: 'A P45 (the form you get when you leave) shows these. Leave empty if you listed that job here too.' }),
          h('div', { class: 'fv-tx-grid' }, txField('Pay to date', txInput('prevPay', j.prevPay, 'money')), txField('Tax to date', txInput('prevTax', j.prevTax, 'money')))),
        h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Save' }), txBtn('Cancel', null, () => { TX.edit = null; txPaint(); }, 'ghost'), h('span', { class: 'fv-grow' }), txBtn('Remove this job', 'trash-2', () => txDo({ action: 'source.remove', id: j.id }, 'Removed'), 'ghost danger')));
    }
    return h('li', { class: 'fv-tx-src-i' + (editing ? ' open' : '') }, head, dates, summary, notes, form);
  }
  function txSelfRow(s, v) {
    const editing = TX.edit && TX.edit.id === s.id;
    const head = h('button', { type: 'button', class: 'fv-tx-src-h', 'aria-expanded': editing ? 'true' : 'false', onclick: () => { TX.edit = editing ? null : { id: s.id }; txPaint(); } },
      h('span', { class: 'n' }, h('b', { text: s.name }), s.connected ? h('em', { text: 'from your employer or a connected business' }) : null, s.from || s.to ? h('small', { text: [s.from ? txShort(s.from) : 'Start', s.to ? txShort(s.to) : 'now'].join(' to ') }) : null),
      h('span', { class: 'v' }, amt(gbp(s.income)), h('small', { text: 'money in' })));
    const costsLine = h('p', { class: 'fv-pl-mute small' }, 'Costs: ', amt(gbp(s.costs + s.capital)), s.claims ? `, from ${s.claims} claim${s.claims === 1 ? '' : 's'}` : '', s.payments.length ? `. ${s.payments.length} payment${s.payments.length === 1 ? '' : 's'} listed.` : '.');
    let form = null;
    if (editing) {
      form = h('div', { class: 'fv-tx-form' },
        (() => { const fm = h('form', { onsubmit: async (e) => { e.preventDefault(); const f = txRead(fm); await txDo({ action: 'source.update', id: s.id, fields: { name: f.name, start: f.start, end: f.end, amount: f.amount, expenses: f.expenses, connected: f.connected } }, 'Changed', { close: false }); } },
          h('div', { class: 'fv-tx-grid' }, txField('What is the work?', txInput('name', s.name)), txField('From', txInput('start', s.from, 'date')), txField('To', txInput('end', s.to, 'date')),
            s.payments.length ? null : txField('Money in, total', txInput('amount', s.typedIncome, 'money'), 'Or list each payment below.'), txField('Other costs, as one total', txInput('expenses', s.typedCosts || '', 'money'), 'Costs you are not listing one by one.')),
          h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', name: 'connected', checked: s.connected ? true : null }), h('span', null, 'Some of this comes from my employer (or my spouse\'s), or from a business I or my family own or control.', h('small', { text: 'If so, the £1,000 trading allowance cannot be used this year.' }))),
          h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Save' }), txBtn('Close', null, () => { TX.edit = null; txPaint(); }, 'ghost'), h('span', { class: 'fv-grow' }), txBtn('Remove', 'trash-2', () => txDo({ action: 'source.remove', id: s.id }, 'Removed'), 'ghost danger'))); return fm; })(),
        h('h4', { class: 'fv-tx-sub', text: 'Payments from clients' }),
        s.payments.length ? h('ul', { class: 'fv-tx-pays' }, s.payments.map(p => h('li', null, h('span', { text: `${txShort(p.date)}${p.client ? ', ' + p.client : ''}` }), amt(gbp2(p.amount)), h('button', { type: 'button', class: 'fv-btn ghost', 'aria-label': 'Remove this payment', onclick: () => txDo({ action: 'payment.remove', id: p.id }, 'Removed', { close: false }) }, ic('x'))))) : null,
        (() => { const fm = h('form', { class: 'fv-tx-inline', onsubmit: async (e) => { e.preventDefault(); const f = txRead(fm); const ok = await txDo({ action: 'payment.add', payment: { item: s.id, date: f.date, amount: f.amount, client: f.client } }, 'Added', { close: false }); void ok; } },
          txField('Date', txInput('date', v.today, 'date')), txField('Amount', txInput('amount', '', 'money')), txField('From', txInput('client')), h('button', { type: 'submit', class: 'fv-btn', text: 'Add payment' })); return fm; })());
    }
    return h('li', { class: 'fv-tx-src-i' + (editing ? ' open' : '') }, head, costsLine, form);
  }
  /** The running list: money that came in during a self-employed period. */
  function txComeIn(rows) {
    return h('div', { class: 'fv-tx-comein' }, h('h4', { text: 'Is this for your work?' }), h('p', { class: 'fv-pl-mute small', text: 'Money that came in during your self-employed period, and is not your pay.' }),
      h('ul', null, rows.slice(0, 6).map(r => h('li', null, h('span', { class: 'n' }, h('b', { class: 'fv-amt', text: r.from }), h('small', { text: txShort(r.date) })), amt(gbp2(r.amount)),
        h('div', { class: 'fv-pl-acts' }, txBtn('Yes', null, () => txDo({ action: 'payment.add', payment: { item: r.period, date: r.date, amount: r.amount, client: r.from, tx: r.tx } }, 'Added', { close: false }), 'small'), txBtn('No', null, () => txDo({ action: 'dismiss', tx: r.tx }, 'Hidden', { close: false }), 'ghost small'))))));
  }
  function txOtherRow(o) {
    const editing = TX.edit && TX.edit.id === o.id;
    const head = h('button', { type: 'button', class: 'fv-tx-src-h', 'aria-expanded': editing ? 'true' : 'false', onclick: () => { TX.edit = editing ? null : { id: o.id }; txPaint(); } },
      h('span', { class: 'n' }, h('b', { text: o.name }), h('small', { text: o.typeLabel })), h('span', { class: 'v' }, amt(gbp(o.amount)), h('small', { text: ({ year: 'a year', month: 'a month', week: 'a week', total: 'in total' })[o.per] || '' })));
    let form = null;
    if (editing) {
      form = h('form', { class: 'fv-tx-form', onsubmit: async (e) => { e.preventDefault(); const f = txRead(form); await txDo({ action: 'source.update', id: o.id, fields: { name: f.name, amount: f.amount, per: f.per } }, 'Changed'); } },
        h('div', { class: 'fv-tx-grid' }, txField('Name', txInput('name', o.name)), txField('Amount', txInput('amount', o.amount, 'money')), txField('Every', h('select', { name: 'per', class: 'fv-tx-in' }, TX_PER.map(([k, l]) => h('option', { value: k, text: l, selected: k === o.per ? true : null }))))),
        h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Save' }), txBtn('Cancel', null, () => { TX.edit = null; txPaint(); }, 'ghost'), h('span', { class: 'fv-grow' }), txBtn('Remove', 'trash-2', () => txDo({ action: 'source.remove', id: o.id }, 'Removed'), 'ghost danger')));
    }
    return h('li', { class: 'fv-tx-src-i' + (editing ? ' open' : '') }, head, form);
  }
  /** Sales of shares or crypto, Gift Aid, pension you paid yourself, Child Benefit, ISA used: only what applies. */
  function txExtras(v) {
    const e = v.extras || {};
    const fm = h('form', { class: 'fv-tx-form', onsubmit: async (ev) => { ev.preventDefault(); const f = txRead(fm); await txDo({ action: 'extras.set', fields: { giftAid: f.giftAid, pensionPaid: f.pensionPaid, childBenefit: f.childBenefit, cbChildren: f.cbChildren, isaUsed: f.isaUsed, lisaUsed: f.lisaUsed, hasEmi: f.hasEmi ? true : undefined } }, 'Saved', { close: false }); } },
      h('div', { class: 'fv-tx-grid' },
        txField('Gift Aid you gave', txInput('giftAid', e.giftAid, 'money'), 'What you actually gave to charity.'),
        txField('Pension you paid yourself', txInput('pensionPaid', e.pensionPaid, 'money'), 'Into a personal pension, not through your job.'),
        txField('Child Benefit received', txInput('childBenefit', e.childBenefit, 'money'), 'You and your partner, for the year. Matters if either of you earns over £60,000.'),
        txField('Number of children', txInput('cbChildren', e.cbChildren, 'money')),
        txField('Paid into ISAs this year', txInput('isaUsed', e.isaUsed, 'money'), 'An ISA is a tax-free savings account.'),
        txField('Of that, a Lifetime ISA', txInput('lisaUsed', e.lisaUsed, 'money'))),
      h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', name: 'hasEmi', checked: e.hasEmi ? true : null }), h('span', { text: 'I have share options from work (such as EMI options)' })),
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn', text: 'Save these' })));
    const gains = v.gains || [];
    const gf = h('form', { class: 'fv-tx-inline', onsubmit: async (ev) => { ev.preventDefault(); const f = txRead(gf); await txDo({ action: 'gain.add', gain: { what: f.what, date: f.date, proceeds: f.proceeds, cost: f.cost, isa: f.isa } }, 'Added', { close: false }); } },
      txField('What did you sell?', txInput('what', '', 'text', { placeholder: 'Shares, crypto…' })), txField('Date', txInput('date', '', 'date')), txField('Sold for', txInput('proceeds', '', 'money')), txField('Cost you', txInput('cost', '', 'money')), h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', name: 'isa' }), h('span', { text: 'In an ISA' })), h('button', { type: 'submit', class: 'fv-btn', text: 'Add' }));
    return h('details', { class: 'fv-pl-more', open: TX.open.has('extras') ? true : null, ontoggle: (x) => { if (x.target.open) TX.open.add('extras'); else TX.open.delete('extras'); } },
      h('summary', null, h('b', { text: 'Anything else' }), h('span', { class: 'mute', text: 'Charity, pensions, Child Benefit, ISAs, selling shares or crypto' })),
      h('div', { class: 'fv-pl-more-b' }, fm, h('h4', { class: 'fv-tx-sub', text: 'Shares or crypto you sold' }),
        gains.length ? h('ul', { class: 'fv-tx-pays' }, gains.map(g => h('li', null, h('span', { text: `${g.what}${g.date ? ', ' + txShort(g.date) : ''}${g.isa ? ' (in an ISA, tax-free)' : ''}` }), amt((g.gain < 0 ? '−' : '') + gbp(Math.abs(g.gain))), h('button', { type: 'button', class: 'fv-btn ghost', 'aria-label': 'Remove', onclick: () => txDo({ action: 'gain.remove', id: g.id }, 'Removed', { close: false }) }, ic('x'))))) : null, gf));
  }
