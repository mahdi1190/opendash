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
      if (t === 'job') box.append(txField('Employer', txInput('name')), txField('Pay, before tax', txInput('annual', '', 'money')), txField('Is that', txPayPer()), txField('Tax code', txInput('taxCode', '', 'text', { upper: true, placeholder: 'On your payslip, e.g. BR' })), txField('Paid every', h('select', { name: 'every', class: 'fv-tx-in' }, TX_EVERY.map(([k, l]) => h('option', { value: k, text: l })))), txField('First day', txInput('start', '', 'date')), txField('Last day, if it ended', txInput('end', '', 'date')));
      else if (t === 'self') box.append(txField('What is the work?', txInput('name')), txField('From', txInput('start', '', 'date')), txField('To', txInput('end', '', 'date')), txField('Money in, if you know the total', txInput('amount', '', 'money'), 'You can list each payment later instead.'));
      else box.append(txField('Name', txInput('name')), txField('Amount', txInput('amount', '', 'money')), txField('Every', h('select', { name: 'per', class: 'fv-tx-in' }, TX_PER.map(([k, l]) => h('option', { value: k, text: l })))));
    };
    paintFields();
    const form = h('form', { class: 'fv-tx-form', onsubmit: async (e) => { e.preventDefault(); const f = txPayYearly(txRead(form)); await txDo({ action: 'source.add', source: f }, 'Added'); } },
      txField('What is it?', typeSel), box,
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Add it' }), txBtn('Cancel', null, () => { TX.edit = null; txPaint(); }, 'ghost')));
    return form;
  }
  /** "£5,760.65 so far + £3,150 on 30 Nov = £8,910.65 this year": what this job adds up to, before tax. */
  const txPayPer = () => h('select', { name: 'payPer', class: 'fv-tx-in', 'aria-label': 'Is that a year or a month?' }, [['year', 'a year'], ['month', 'a month']].map(([k, l]) => h('option', { value: k, text: l })));
  /** Pay typed by the month is kept as its yearly figure. */
  const txPayYearly = (f) => { if (f.payPer === 'month' && f.annual > 0) f.annual = Math.round(f.annual * 1200) / 100; delete f.payPer; return f; };
  function txJobLine(j) {
    const s = j.summary;
    if (!s || !(s.total > 0)) return null;
    const c = s.coming || [];
    let more = '';
    if (c.length && c.length <= 3) more = c.map(p => ` + ${gbp2(p.gross)} on ${fDay(dnum(p.date))}`).join('');
    else if (c.length) { const first = c[0].gross, same = c.every(p => Math.abs(p.gross - first) < 0.01); more = same ? ` + ${c.length} more payments of ${gbp2(first)}` : ` + ${c.length} more payments, ${gbp2(c.reduce((t, p) => t + p.gross, 0))} in all`; }
    return `${gbp2(s.soFar)} so far${s.soFarFrom === 'estimate' ? ' (our estimate)' : ''}${more} = ${gbp2(s.total)} this year${s.before ? `, plus ${gbp2(s.before)} from an earlier job` : ''}. All before tax.`;
  }
  function txJobRow(j, v) {
    const editing = TX.edit && TX.edit.id === j.id;
    const y = j.year || {};
    const line = txJobLine(j);
    const head = h('button', { type: 'button', class: 'fv-tx-src-h', 'aria-expanded': editing ? 'true' : 'false', onclick: () => { TX.edit = editing ? null : { id: j.id }; txPaint(); } },
      h('span', { class: 'n' }, h('b', { text: j.name }), j.main ? h('em', { text: 'main job' }) : null, j.ended ? h('em', { text: 'ended' }) : null, h('small', { class: 'fv-amt', text: `${j.codeText}: ${j.codeLabel}` })),
      h('span', { class: 'v' }, amt(gbp(y.pay || j.annual)), h('small', { text: 'pay this year' }), h('span', { class: 'fv-chg' }, ic(editing ? 'chevron-down' : 'pencil'), h('span', { text: editing ? 'Close' : 'Change' }))));
    const notes = (j.notes || []).map(n => h('p', { class: 'fv-pl-note ' + n.level }, ic(n.level === 'warn' ? 'triangle-alert' : 'info'), h('span', { text: n.text })));
    const dates = j.start || j.end ? h('small', { class: 'fv-tx-dates', text: [j.start ? `From ${txShort(j.start)}` : '', j.end ? `${j.ended ? 'ended' : 'to'} ${txShort(j.end)}` : ''].filter(Boolean).join(' ') }) : null;
    const summary = y.pay != null ? h('p', { class: 'fv-pl-mute small' }, 'Tax ', amt(gbp(y.tax)), ', National Insurance ', amt(gbp(y.ni)), (y.plan + y.pg) ? ', student loan ' : '', (y.plan + y.pg) ? amt(gbp(y.plan + y.pg)) : '', ' over the year.', j.ytd ? ` Using your payslip of ${txShort(j.ytd.asOf)}.` : '') : null;
    const sum = line ? h('p', { class: 'fv-tx-sumline' }, ic('calculator'), h('span', { class: 'fv-amt', text: line })) : null;
    const last = j.ended || ((j.payments || []).length && j.end);
    const next = j.next && v.yearState === 'current' ? h('p', { class: 'fv-pl-mute small' }, last ? 'Last payslip' : 'Next payslip', ': about ', amt(gbp2(j.next.takeHome)), ` on ${txShort(j.next.date)}.`) : null;
    return h('li', { class: 'fv-tx-src-i' + (editing ? ' open' : ''), 'data-src': j.id }, head, dates, sum, summary, next, notes, editing ? txJobForm(j, v) : null);
  }
  /** The job in plain words: each part says what it is for, in one line. */
  function txJobForm(j, v) {
    const yt = j.ytd || {};
    const pays = (j.payments || []).map(p => ({ date: p.date, amount: p.amount }));
    let exact = pays.length > 0;
    let steadyBits = [];
    const showSteady = () => { for (const el of steadyBits) el.hidden = exact; };
    const payBox = h('div', { class: 'fv-tx-pays-ed' });
    const paintPays = () => {
      payBox.textContent = '';
      if (!exact) return;
      payBox.append(h('p', { class: 'fv-pl-mute small', text: 'Type each payment before tax and the day it is paid. From your pay-so-far date Freeflo uses exactly these, instead of the yearly pay. Nothing is paid on any other date.' }));
      pays.forEach((p, i) => {
        const d = h('input', { type: 'date', class: 'fv-tx-in', 'aria-label': 'Payment date', value: p.date || '' });
        const a = h('input', { type: 'text', inputmode: 'decimal', class: 'fv-tx-in', 'aria-label': 'Payment amount before tax', placeholder: 'Amount before tax', autocomplete: 'off', value: p.amount != null ? String(p.amount) : '' });
        d.addEventListener('change', () => { p.date = d.value || null; });
        a.addEventListener('input', () => { const raw = a.value.replace(/[£,\s]/g, ''); p.amount = raw === '' ? null : Number(raw); });
        payBox.append(h('div', { class: 'fv-tx-payrow' }, d, a, h('button', { type: 'button', class: 'fv-btn ghost', 'aria-label': 'Remove this payment', onclick: () => { pays.splice(i, 1); paintPays(); } }, ic('x'))));
      });
      payBox.append(txBtn('Add a payment', 'plus', () => { pays.push({ date: null, amount: null }); paintPays(); }, 'ghost small'));
    };
    const modeSeg = seg([['steady', 'Steady pay, as usual'], ['exact', 'Exact amounts on dates']], exact ? 'exact' : 'steady', (x) => { exact = x === 'exact'; if (exact && !pays.length) pays.push({ date: null, amount: null }); modeSeg.set(x); paintPays(); showSteady(); }, 'How the rest of the pay comes');
    modeSeg.set(exact ? 'exact' : 'steady');
    const endBox = h('div', { class: 'fv-tx-endbox' });
    const ended = h('input', { type: 'checkbox', name: 'ended', checked: j.end ? true : null, onchange: () => { endBox.hidden = !ended.checked; } });
    endBox.hidden = !j.end;
    endBox.append(txField('Last day', txInput('end', j.end, 'date'), 'The last day you work, or worked, there.'));
    const payField = txField('Pay, before tax', txInput('annual', j.annual, 'money'), 'Leave it empty if you only know your payslips.');
    const perField = txField('Is that', txPayPer());
    const everyField = txField('Paid every', h('select', { name: 'every', class: 'fv-tx-in' }, TX_EVERY.map(([k, l]) => h('option', { value: k, text: l, selected: k === j.freq ? true : null }))));
    steadyBits = [payField, perField, everyField];
    const form = h('form', { class: 'fv-tx-form', onsubmit: async (e) => {
      e.preventDefault();
      const f = txPayYearly(txRead(form));
      const good = pays.filter(p => p.date || p.amount);
      if (exact && good.some(p => !p.date || !(p.amount > 0))) { toast('Each payment needs a date and an amount.', { bad: true }); return; }
      const fields = { name: f.name, annual: f.annual, taxCode: f.taxCode, every: f.every, start: f.start, end: ended.checked ? f.end : null, prevPay: f.prevPay, prevTax: f.prevTax,
        payments: exact ? good.map(p => ({ date: p.date, amount: p.amount })) : [], bonus: f.bonus, bonusOn: f.bonus ? f.bonusOn : null };
      fields.ytd = f.asOf ? { asOf: f.asOf, pay: f.ytdPay, taxablePay: f.ytdTaxable, tax: f.ytdTax, ni: f.ytdNi, plan: f.ytdPlan, pg: f.ytdPg } : null;
      await txDo({ action: 'source.update', id: j.id, fields }, 'Changed');
    } },
      h('div', { class: 'fv-tx-grid' },
        txField('Employer', txInput('name', j.name)),
        payField, perField, everyField,
        txField('Tax code', txInput('taxCode', j.codeGiven ? j.codeText : '', 'text', { upper: true, placeholder: j.codeText }), `On your payslip, like 1257L. Leave it empty and Freeflo uses ${j.codeText}.`),
        txField('First day', txInput('start', j.start, 'date'), 'Leave it empty if you have had the job all year.')),
      h('label', { class: 'fv-tx-check' }, ended, h('span', null, 'This job has ended, or I know when it will end', h('small', { text: 'Pay stops after the last day. Any last payments go just below.' }))), endBox,
      h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'The rest of the pay' }), h('p', { class: 'fv-pl-mute small', text: 'Choose exact amounts for one or more last payments (for example £3,150 next month and then nothing), or if you are paid a different amount each time.' }),
        modeSeg.el, payBox),
      h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'Pay so far this tax year' }), h('p', { class: 'fv-pl-mute small', text: 'From your latest payslip: the figures called “year to date” or “YTD”. Freeflo uses them instead of its own guess up to that date.' }),
        h('div', { class: 'fv-tx-grid' }, txField('Payslip date', txInput('asOf', yt.asOf, 'date')), txField('Pay so far, before tax', txInput('ytdPay', yt.pay, 'money')), txField('Tax taken so far', txInput('ytdTax', yt.tax, 'money'))),
        h('details', { class: 'fv-pl-more' }, h('summary', null, h('b', { text: 'More from the payslip' }), h('span', { class: 'mute', text: 'National Insurance, student loan' })),
          h('div', { class: 'fv-tx-grid' }, txField('National Insurance so far', txInput('ytdNi', yt.ni, 'money')), txField('Student loan so far', txInput('ytdPlan', yt.plan, 'money')), txField('Postgraduate loan so far', txInput('ytdPg', yt.pg, 'money')), txField('Taxable pay so far', txInput('ytdTaxable', yt.taxablePay, 'money'), 'Only if it is different from pay.')))),
      h('details', { class: 'fv-pl-more', open: j.prevPay || j.prevTax || j.bonus ? true : null }, h('summary', null, h('b', { text: 'Less common' }), h('span', { class: 'mute', text: 'Pay from an earlier job, a bonus' })),
      h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'Pay before this job this tax year' }), h('p', { class: 'fv-pl-mute small', text: 'Only if you started this job after April and were paid elsewhere earlier this tax year. The P45 from that job shows both. It also needs the first day above.' }),
        h('div', { class: 'fv-tx-grid' }, txField('Pay before this job', txInput('prevPay', j.prevPay, 'money')), txField('Tax taken on it', txInput('prevTax', j.prevTax, 'money')))),
      h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'A bonus' }), h('p', { class: 'fv-pl-mute small', text: 'A one-off payment on top, before tax. Leave it empty if there is none.' }),
        h('div', { class: 'fv-tx-grid' }, txField('Bonus, before tax', txInput('bonus', j.bonus, 'money')), txField('Paid on', txInput('bonusOn', j.bonusOn, 'date'))))),
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Save' }), txBtn('Cancel', null, () => { TX.edit = null; txPaint(); }, 'ghost'), h('span', { class: 'fv-grow' }), txBtn('Remove this job', 'trash-2', () => txDo({ action: 'source.remove', id: j.id }, 'Removed'), 'ghost danger')));
    paintPays(); showSteady();
    return form;
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
