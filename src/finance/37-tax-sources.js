  // @part 37-tax-sources.js · NEW (2.21) · OWNER: tax page (income sources, inline: jobs with code, dates and year-to-date; self-employed periods; other income)
  // ── Tax: where your money comes from ─────────────────────────────────
  // Each row opens in place. A second job's code or dates, and a payslip's year-to-date, are edited here rather than on a list screen.
  const TX_EVERY = [['monthly', 'Month'], ['fourweekly', 'Four weeks'], ['fortnightly', 'Fortnight'], ['weekly', 'Week']];
  const TX_PER = [['year', 'A year'], ['month', 'A month'], ['week', 'A week'], ['total', 'In total']];
  const TX_TYPES = [['job', 'A job with a payslip'], ['self', 'Self-employed work'], ['interest', 'Savings interest'], ['dividend', 'Dividends'], ['rental', 'Rent'], ['side', 'Side income'], ['other', 'Other income']];
  function txField(label, input, help) { return h('label', { class: 'fv-tx-f' }, h('span', { text: label }), input, help ? h('small', { text: help }) : null); }
  function txInput(name, value, type, o) {
    o = o || {};
    const el = h('input', Object.assign({ name, type: type === 'money' ? 'text' : (type || 'text'), inputmode: type === 'money' ? 'decimal' : null, class: 'fv-tx-in', value: value == null ? '' : type === 'money' ? moneyNice(value) : String(value), placeholder: o.placeholder || null, autocomplete: 'off' }, o.upper ? { style: { textTransform: 'uppercase' } } : {}));
    return type === 'money' ? moneyWire(el) : el;
  }
  /** A form's values by name. Money is read the way people type it ("£1,250.50", "3k"); anything else comes back as NaN. */
  function txRead(form) {
    const out = {};
    for (const el of form.querySelectorAll('input[name], select[name]')) {
      if (el.type === 'checkbox') { out[el.name] = el.checked; continue; }
      const v = el.value.trim();
      out[el.name] = el.inputMode === 'decimal' ? moneyParse(v) : (v === '' ? null : v);
    }
    return out;
  }
  /* ---------- saying what is wrong, in the form, next to the box ---------- */
  function txSayClear(form) {
    for (const el of form.querySelectorAll('.fv-tx-say')) el.remove();
    for (const el of form.querySelectorAll('.fv-tx-in.said')) el.classList.remove('bad', 'said');
  }
  /** name: a field, a data-say place, or null for the foot of the form. soft: a note that does not stop the save. */
  function txSay(form, name, text, soft) {
    const el = name ? form.querySelector('[name="' + name + '"], [data-say="' + name + '"]') : null;
    const line = h('small', { class: 'fv-tx-say' + (soft ? ' soft' : ''), role: soft ? null : 'alert' }, ic(soft ? 'info' : 'triangle-alert'), h('span', { text }));
    if (el) {
      const field = el.closest('.fv-tx-f') || el;
      field.append(line);
      if (!soft && el.matches('.fv-tx-in')) el.classList.add('bad', 'said');
      if (!soft) { let d = el.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } }
    } else (form.querySelector('.fv-tx-foot') || form).append(line);
  }
  /** The values, or null after saying what is wrong. checks(values): more to say; a check that is not soft stops the save. */
  function txSayAll(form, checks, f) {
    txSayClear(form);
    const list = [];
    for (const el of form.querySelectorAll('input[name]')) if (el.inputMode === 'decimal' && (Number.isNaN(f[el.name]) || f[el.name] < 0)) list.push({ name: el.name, text: MONEY_HELP });
    if (!list.length && checks) list.push(...checks(f));
    for (const c of list) txSay(form, c.name, c.text, c.soft);
    return list;
  }
  function txGet(form, checks) {
    const f = txRead(form);
    const stop = txSayAll(form, checks, f).find(c => !c.soft);
    if (stop) { const el = stop.name ? form.querySelector('[name="' + stop.name + '"]') : null; if (el) try { el.focus(); } catch (e) { /* no focus */ } return null; }
    return f;
  }
  /** Tax year dates from its id ("2026-27"). */
  const txYearSpan = (v) => { const y = Number(String(v.year).slice(0, 4)); return { start: y + '-04-06', end: (y + 1) + '-04-05' }; };
  /** The payday box: the day of the month, for a job paid monthly. Empty: not known, and Freeflo keeps its usual guess. */
  function txPaydayField(value, other) {
    return h('div', { 'data-payday': '1' }, txField('Payday', txInput('payday', value == null ? '' : value, 'number', { placeholder: 'Day of the month' }), other ? 'Your plan already has a payday, such as the last working day. Type a day to use that instead.' : 'The day of the month your pay arrives, such as 28. Not sure? Leave it empty.'));
  }
  /** A payday only means something for pay that comes each month. */
  function txPaydayFollow(form) {
    const every = form.querySelector('[name=every]'), box = form.querySelector('[data-payday]');
    if (!every || !box) return;
    const show = () => { box.hidden = every.value !== 'monthly'; };
    every.addEventListener('change', show); show();
  }
  const txOkCode = (c) => !c || /^[SC]?(\d{1,4}[LMNTP]?|K\d+|BR|D[0-8]|NT|0T)( ?(W1|M1|X))?$/i.test(String(c).trim());

  /* ---------- nothing typed is lost ---------- */
  // Each open form keeps what has been typed here, by tax year and row: closing it by accident, an error or a repaint takes nothing away.
  const txDraftKey = (id) => TX.year + ':' + id;
  const txFormVals = (form) => { const vals = {}; for (const el of form.querySelectorAll('input[name], select[name]')) vals[el.name] = el.type === 'checkbox' ? el.checked : el.value; return vals; };
  function txDraftFill(form, key) {
    const d = TX.drafts[key]; if (!d) return null;
    for (const el of form.querySelectorAll('input[name], select[name]')) if (Object.hasOwn(d.vals, el.name)) { if (el.type === 'checkbox') el.checked = d.vals[el.name]; else el.value = d.vals[el.name]; }
    return d;
  }
  /** Follow a form as it is typed in. after(): runs a moment after each change (checks, the effect line). extra(): anything not in a named box. */
  function txFollow(form, key, base, after, extra) {
    let t = 0;
    const run = () => {
      if (!form.isConnected || form.dataset.sending) return;
      const vals = txFormVals(form), more = extra ? extra() : null;
      if (JSON.stringify([vals, more]) === base) delete TX.drafts[key]; else TX.drafts[key] = { vals, extra: more };
      if (after) after();
    };
    const soon = () => { clearTimeout(t); t = setTimeout(run, 280); };
    form.addEventListener('input', soon); form.addEventListener('change', soon);
    // Leaving straight after the last key press must not lose it.
    form.addEventListener('focusout', () => { if (form.dataset.sending) return; const vals = txFormVals(form), more = extra ? extra() : null; if (JSON.stringify([vals, more]) !== base) TX.drafts[key] = { vals, extra: more }; });
    return soon;
  }
  /** Cancel drops what was typed, with Undo in place of a question. */
  function txDropDraft(key, reopen) {
    const d = TX.drafts[key];
    delete TX.drafts[key]; TX.edit = null; txPaint();
    if (d) toast('What you typed was not saved', { action: 'Undo', onAction: () => { TX.drafts[key] = d; reopen(); } });
  }
  const txNotSaved = (id) => (TX.drafts[txDraftKey(id)] ? h('em', { class: 'fv-tx-unsaved', text: 'Not saved yet' }) : null);

  /* ---------- what the answer does to your numbers ---------- */
  const txBillWords = (b) => (b >= 0.5 ? gbp(b) + ' to pay' : b <= -0.5 ? gbp(-b) + ' back' : 'nothing to pay');
  function txBillChange(was, now) {
    if (was == null || now == null || Math.abs(was - now) < 0.5) return '';
    return 'Your tax bill goes from ' + txBillWords(was) + ' to ' + txBillWords(now) + '.';
  }
  /** A line that says, before saving, what a change would do. build(): the change, or null while the form cannot be saved. */
  function txEffectLine(build, payOf) {
    const box = h('p', { class: 'fv-tx-effect', 'aria-live': 'polite', hidden: true });
    let seq = 0, ctl = null;
    const clear = () => { box.hidden = true; box.textContent = ''; };
    const run = async () => {
      const change = build(), me = ++seq;
      if (ctl) ctl.abort();
      if (!change) { clear(); return; }
      ctl = new AbortController();
      try {
        const r = await api('/api/finance/tax/change', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ change, year: TX.year, preview: true }), signal: ctl.signal });
        if (me !== seq) return;
        if (!r.ok || !r.body || !r.body.preview) { clear(); return; }
        const p = r.body.preview, v0 = TX.d.view, bits = [];
        if (payOf) { const w = payOf(p, v0); if (w) bits.push(w); }
        const bill = txBillChange(v0.bill && v0.bill.balance, p.balance);
        if (bill) bits.push(bill);
        else if (bits.length) bits.push('Your tax bill stays at ' + txBillWords(p.balance) + '.');
        if (!bits.length) { clear(); return; }
        box.textContent = ''; box.append(ic('circle-help'), h('span', { class: 'fv-amt', text: 'If you save: ' + bits.join(' ') }));
        box.hidden = false;
      } catch (e) { if (me === seq) clear(); }
    };
    return { box, run };
  }
  function txSources(v) {
    const S0 = v.sources;
    const none = !S0.jobs.length && !S0.self.length && !S0.other.length;
    const adding = TX.edit && TX.edit.add;
    const kids = [txHead('Where your money comes from', none ? null : v.yearState === 'current' ? 'The same list as your money plan: a change here moves both.' : `Your sources for ${v.yearLabel}.`, none && !adding ? null : txBtn('Add', 'plus', () => { TX.edit = adding ? null : { add: true }; txPaint(); }, 'ghost'))];
    if (adding) kids.push(txAddForm(v));
    if (none && !adding) kids.push(txStart());
    if (S0.jobs.length) kids.push(h('h4', { class: 'fv-tx-sub', text: 'Jobs' }), h('ul', { class: 'fv-tx-src' }, S0.jobs.map(j => txJobRow(j, v))));
    if (S0.self.length) kids.push(h('h4', { class: 'fv-tx-sub', text: 'Self-employed' }), h('ul', { class: 'fv-tx-src' }, S0.self.map(s => txSelfRow(s, v))));
    const ask = (TX.d.comeIn || []);
    if (S0.self.length && ask.length) kids.push(txComeIn(ask));
    if (S0.other.length) kids.push(h('h4', { class: 'fv-tx-sub', text: 'Other income' }), h('ul', { class: 'fv-tx-src' }, S0.other.map(o => txOtherRow(o))));
    if (!none) kids.push(txExtras(v));
    return txCard('fv-tx-sources', kids);
  }
  /** Nothing here yet: one question, one tap, and the rest of the page waits. */
  function txStart() {
    const pick = (type) => () => { TX.edit = { add: true, type }; txPaint(); };
    return h('div', { class: 'fv-tx-start' },
      h('p', { class: 'fv-plq-help', text: 'Start with your money. What do you have?' }),
      h('div', { class: 'fv-plq-opts' },
        h('button', { type: 'button', class: 'fv-plq-opt', onclick: pick('job') }, h('b', { text: 'A job with a payslip' }), h('span', { text: 'Your employer takes tax off before paying you.' })),
        h('button', { type: 'button', class: 'fv-plq-opt', onclick: pick('self') }, h('b', { text: 'Self-employed work' }), h('span', { text: 'Freelance, consulting or a small business.' })),
        h('button', { type: 'button', class: 'fv-plq-opt', onclick: pick('side') }, h('b', { text: 'Something else' }), h('span', { text: 'Rent, savings interest, dividends.' }))));
  }
  /** The checks shared by a new job and a job being changed. Each says what is wrong and how to put it right. */
  function txJobChecks(f, v, o) {
    o = o || {};
    const out = [], stop = (name, text) => out.push({ name, text }), note = (name, text) => out.push({ name, text, soft: true });
    const end = o.ended === false ? null : f.end, yr = txYearSpan(v), others = (v.sources.jobs || []).filter(j => j.id !== o.id);
    if (f.start && end && end < f.start) stop('end', `The last day, ${txShort(end)}, is before the first day, ${txShort(f.start)}. Change one of them.`);
    if (f.annual > 0 && f.payPer !== 'month' && f.annual < 6000) note('annual', `${gbp(f.annual)} a year is about ${gbp(f.annual / 12)} a month. If ${gbp(f.annual)} is what you get each month, choose “a month” next to it.`);
    if (f.annual >= 10000 && f.payPer === 'month') note('annual', `${gbp(f.annual)} a month would be ${gbp(f.annual * 12)} a year. If ${gbp(f.annual)} is your yearly pay, choose “a year” next to it.`);
    if (f.payday != null && f.every === 'monthly' && !(Number.isInteger(Number(f.payday)) && Number(f.payday) >= 1 && Number(f.payday) <= 31)) stop('payday', 'A payday is a day of the month, 1 to 31. For example 28.');
    if (f.taxCode && !txOkCode(f.taxCode)) note('taxCode', 'A tax code looks like 1257L or BR. If that is an amount, it belongs in a money box.');
    if (!f.taxCode && f.start && others.length && others.every(j => j.end && j.end < f.start)) note('taxCode', 'Your other job ended before this one starts, so your code is probably not BR. It is often 1257L or the code on your P45 (the form you get when you leave a job). Check your payslip and type it here.');
    const anyYtd = f.ytdPay != null || f.ytdTax != null || f.ytdNi != null || f.ytdPlan != null || f.ytdPg != null || f.ytdTaxable != null;
    if (anyYtd && !f.asOf) stop('asOf', 'Add the date on that payslip, so Freeflo knows how far these figures go.');
    if (f.asOf) {
      if (f.asOf > v.today) stop('asOf', 'That date is in the future. Use the date on your latest payslip.');
      else if (f.asOf < yr.start || f.asOf > yr.end) stop('asOf', `That date is outside the ${v.yearLabel} tax year, and pay so far starts again each 6 April. Use a payslip from this tax year.`);
      else if (f.start && f.asOf < f.start) stop('asOf', `That payslip is from before this job started, on ${txShort(f.start)}. Check the two dates.`);
      else if (!anyYtd) note('ytdPay', 'Add the pay so far from that payslip. The date alone changes nothing.');
    }
    if (f.ytdPay != null && f.ytdTax != null && f.ytdTax > f.ytdPay) stop('ytdTax', 'The tax taken is more than the pay so far. They may be in each other’s boxes.');
    const yearly = f.payPer === 'month' ? f.annual * 12 : f.annual;
    if (f.ytdPay > 0 && yearly > 0 && f.asOf && f.asOf > yr.start.slice(0, 4) + '-06-06' && Math.abs(f.ytdPay - yearly / 12) < yearly / 12 * 0.02) note('ytdPay', 'That looks like one payslip’s pay. This box is for the total so far this tax year, often labelled “year to date”.');
    if (f.prevPay != null && !f.start) stop('start', 'Pay from before this job needs the first day of this job, so Freeflo knows when it stopped.');
    if (f.prevPay != null && f.prevTax != null && f.prevTax > f.prevPay) stop('prevTax', 'The tax is more than the pay. They may be in each other’s boxes.');
    if (f.prevPay > 0 && f.start) { const had = others.find(j => j.end && j.end <= f.start); if (had) note('prevPay', `${had.name} is already on your list, so its pay is counted. Only type pay from a job that is not on the list.`); }
    if (f.bonusOn && !f.bonus) note('bonus', 'Add the bonus amount, or clear its date.');
    if (f.bonusOn && end && f.bonusOn > end) note('bonusOn', `That is after the last day, ${txShort(end)}. Fine if it is really paid then. If not, change the date.`);
    if ((o.pays || []).some(p => p.date && p.amount > 0) && !f.asOf && !end && f.annual > 0) note('pays', 'Your usual pay still counts on each payday before the first of these. If your usual pay stopped sooner, add the last day above, or your latest figures under “Type in a payslip”.');
    for (const p of o.pays || []) {
      if (!p.date && !p.amount && !Number.isNaN(p.amount)) continue;
      if (Number.isNaN(p.amount)) { stop('pays', MONEY_HELP); continue; }
      if (!p.date || !(p.amount > 0)) { stop('pays', 'Each payment needs both a date and an amount. Fill it in, or remove that line with its ×.'); continue; }
      const word = `${gbp2(p.amount)} on ${txShort(p.date)}`;
      if (f.start && p.date < f.start) stop('pays', `${word} is before the first day. Change the date, or the first day.`);
      else if (p.date < yr.start || p.date > yr.end) note('pays', `${word} is outside the ${v.yearLabel} tax year, so it does not count here.`);
      else if (f.asOf && p.date <= f.asOf) note('pays', `${word} is before your payslip date, so it is already inside your pay so far and is left out.`);
      else if (end && p.date > end) note('pays', `${word} is after the last day, ${txShort(end)}. That is fine if your last pay comes after you finish. If not, change the date.`);
    }
    return out;
  }
  function txAddForm(v) {
    const typeSel = h('select', { name: 'type', class: 'fv-tx-in', onchange: () => { paintFields(); } }, TX_TYPES.map(([k, l]) => h('option', { value: k, text: l, selected: (TX.edit.type || 'job') === k ? true : null })));
    const box = h('div', { class: 'fv-tx-grid' });
    const key = txDraftKey('add');
    let echo = null;
    const paintFields = () => {
      // Changing the kind keeps what is already typed in the boxes the new kind also has.
      const keep = box.childElementCount ? txFormVals(box) : null;
      box.textContent = ''; echo = null;
      const t = typeSel.value, other = (v.sources.jobs || []).length > 0;
      if (t === 'job') {
        const pay = txPayField('', 'year');
        echo = pay.echo;
        box.append(txField('Employer', txInput('name')), pay.field, pay.per, txField('Paid every', h('select', { name: 'every', class: 'fv-tx-in' }, TX_EVERY.map(([k, l]) => h('option', { value: k, text: l })))), txPaydayField(), txField('Tax code', txInput('taxCode', '', 'text', { upper: true, placeholder: other ? 'BR' : '1257L' }), `A short code on your payslip that says how much of your pay is tax-free. Not sure? Leave it empty and Freeflo uses ${other ? 'BR, the usual code for a second job' : '1257L, the most common one'}.`), txField('First day', txInput('start', '', 'date'), 'Empty if you have had the job all year.'), txField('Last day', txInput('end', '', 'date'), 'Only if it has ended, or you know when it will.'));
      } else if (t === 'self') box.append(txField('What is the work?', txInput('name')), txField('From', txInput('start', '', 'date')), txField('To', txInput('end', '', 'date'), 'Empty if it is still going.'), txField('Money in, if you know the total', txInput('amount', '', 'money'), 'You can list each payment later instead.'));
      else box.append(txField('Name', txInput('name')), txField('Amount', txInput('amount', '', 'money')), txField('Every', h('select', { name: 'per', class: 'fv-tx-in' }, TX_PER.map(([k, l]) => h('option', { value: k, text: l })))));
      if (keep) for (const el of box.querySelectorAll('input[name], select[name]')) if (keep[el.name] != null && keep[el.name] !== '') el.value = keep[el.name];
      if (echo) echo();
      txPaydayFollow(box);
    };
    paintFields();
    const checks = (f) => {
      if (f.type === 'job') return txJobChecks(f, v);
      if (f.type === 'self' && f.start && f.end && f.end < f.start) return [{ name: 'end', text: 'The “To” date is before the “From” date. Change one of them.' }];
      return [];
    };
    const sourceOf = (f0) => { const f = txPayYearly(Object.assign({}, f0)); if (f.every !== 'monthly') delete f.payday; return f; };
    const build = () => { const f = txRead(form); if (Object.values(f).some(x => Number.isNaN(x)) || checks(f).some(c => !c.soft)) return null; if (!(f.annual > 0 || f.amount > 0)) return null; return { action: 'source.add', source: sourceOf(f) }; };
    const effect = txEffectLine(build, (p, v0) => { const was = v0.position.income, now = p.income; return Math.abs(now - was) >= 0.5 ? `This adds ${gbp(now - was)} to your income this tax year.` : ''; });
    const form = h('form', { class: 'fv-tx-form', onsubmit: async (e) => { e.preventDefault(); const f0 = txGet(form, checks); if (!f0) return; delete TX.drafts[key]; const ok = await txDo({ action: 'source.add', source: sourceOf(f0) }, 'Added', { form }); if (!ok) TX.drafts[key] = { vals: txFormVals(form), extra: null }; } },
      txField('What is it?', typeSel), box, effect.box,
      h('div', { class: 'fv-tx-foot' }),
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Add it' }), txBtn('Cancel', null, () => txDropDraft(key, () => { TX.edit = { add: true }; txPaint(); }), 'ghost')));
    const base = JSON.stringify([txFormVals(form), null]);
    const filled = TX.drafts[key];
    if (filled && filled.vals.type) { typeSel.value = filled.vals.type; paintFields(); txDraftFill(form, key); }
    if (echo) echo();
    txFollow(form, key, base, () => { txSayAll(form, checks, txRead(form)); if (echo) echo(); effect.run(); });
    setTimeout(() => { const first = box.querySelector('input'); if (first && form.isConnected) try { first.focus({ preventScroll: true }); } catch (e) { /* no focus */ } }, 0);
    return form;
  }
  /** Pay is typed the way it is known, by the year or the month, and the other one is said straight away. */
  const txPerOf = (id) => ((F.txPer && id && F.txPer[id]) || 'year');
  function txPayField(value, per) {
    const given = value === '' || value == null ? null : Number(value);
    const inp = txInput('annual', given == null ? '' : per === 'month' ? Math.round(given / 12 * 100) / 100 : given, 'money');
    const say = h('small', { class: 'fv-tx-echo fv-amt', 'aria-live': 'polite' });
    const sel = h('select', { name: 'payPer', class: 'fv-tx-in', 'aria-label': 'Is that a year or a month?' }, [['year', 'a year'], ['month', 'a month']].map(([k, l]) => h('option', { value: k, text: l, selected: k === per ? true : null })));
    let typed = false;
    const echo = () => {
      const x = moneyParse(inp.value);
      say.textContent = x > 0 ? (sel.value === 'month' ? `That is ${gbp(x * 12)} a year if it runs all year.` : `That is about ${gbp(x / 12)} a month.`) : '';
    };
    inp.addEventListener('input', () => { typed = true; echo(); });
    // Saved pay stays the same when you only switch how it is shown; a figure you just typed is taken to be in the new unit.
    sel.addEventListener('change', () => {
      const x = moneyParse(inp.value);
      if (!typed && x > 0) inp.value = moneyNice(sel.value === 'month' ? Math.round(x / 12 * 100) / 100 : Math.round(x * 1200) / 100);
      echo();
    });
    echo();
    return { field: h('label', { class: 'fv-tx-f' }, h('span', { text: 'Pay, before tax' }), inp, say), per: txField('Is that', sel), echo };
  }
  /** Pay typed by the month is kept as its yearly figure. */
  const txPayYearly = (f) => { if (f.payPer === 'month' && f.annual > 0) f.annual = Math.round(f.annual * 1200) / 100; delete f.payPer; return f; };
  /** "£4,000 so far + £2,500 on 30 Nov = £6,500 this year": what this job adds up to, before tax. */
  function txJobLine(j) {
    const s = j.summary;
    if (!s || !(s.total > 0 || (s.later || []).length)) return null;
    const c = s.coming || [];
    let more = '';
    if (c.length && c.length <= 3) more = c.map(p => ` + ${gbp2(p.gross)} on ${fDay(dnum(p.date))}`).join('');
    else if (c.length) { const first = c[0].gross, same = c.every(p => Math.abs(p.gross - first) < 0.01); more = same ? ` + ${c.length} more payments of ${gbp2(first)}` : ` + ${c.length} more payments, ${gbp2(c.reduce((t, p) => t + p.gross, 0))} in all`; }
    const after = (s.later || []).map(p => ` ${gbp2(p.gross)} on ${fDay(dnum(p.date))} counts in ${p.yearLabel}.`).join('');
    return `${gbp2(s.soFar)} so far${s.soFarFrom === 'estimate' ? ' (our estimate)' : ''}${more} = ${gbp2(s.total)} this year${s.before ? `, plus ${gbp2(s.before)} from an earlier job` : ''}. All before tax.${after}`;
  }
  /** "ended 31 Aug 2026", "ends 30 Nov 2026", "starts 1 Dec 2026": a job that is not an ongoing salary says so at once. */
  function txJobTag(j, v) {
    const bits = [];
    if (j.main && v.sources.jobs.length > 1) bits.push('main job');
    if (j.start && j.start > v.today) bits.push('starts ' + txShort(j.start));
    else if (j.start) bits.push('from ' + txShort(j.start));
    if (j.end) bits.push((j.ended ? 'ended ' : 'ends ') + txShort(j.end));
    return bits.length ? h('em', { class: j.end || (j.start && j.start > v.today) ? 'fv-tx-tag' : null, text: bits.join(' · ') }) : null;
  }
  function txJobRow(j, v) {
    const editing = TX.edit && TX.edit.id === j.id;
    const y = j.year || {};
    const line = txJobLine(j);
    const head = h('button', { type: 'button', class: 'fv-tx-src-h', 'aria-expanded': editing ? 'true' : 'false', onclick: () => { TX.edit = editing ? null : { id: j.id }; txPaint(); } },
      h('span', { class: 'n' }, h('b', { text: j.name }), txJobTag(j, v), txNotSaved(j.id), h('small', { class: 'fv-amt', text: `Tax code ${j.codeText}: ${j.codeLabel}` })),
      h('span', { class: 'v' }, amt(gbp(y.pay || j.annual)), h('small', { text: 'pay this year' }), h('span', { class: 'fv-chg' }, ic(editing ? 'chevron-down' : 'pencil'), h('span', { text: editing ? 'Close' : 'Change' }))));
    const notes = (j.notes || []).map(n => h('p', { class: 'fv-pl-note ' + n.level }, ic(n.level === 'warn' ? 'triangle-alert' : 'info'), h('span', { text: n.text })));
    const summary = y.pay != null ? h('p', { class: 'fv-pl-mute small' }, 'Tax ', amt(gbp(y.tax)), ', National Insurance ', amt(gbp(y.ni)), (y.plan + y.pg) ? ', student loan ' : '', (y.plan + y.pg) ? amt(gbp(y.plan + y.pg)) : '', ' over the year.', j.ytd ? ` Using your payslip of ${txShort(j.ytd.asOf)}.` : '') : null;
    const sum = line ? h('p', { class: 'fv-tx-sumline' }, ic('circle-help'), h('span', { class: 'fv-amt', text: line })) : null;
    const coming = (j.summary && j.summary.coming) || [];
    const last = j.ended || (j.end && coming.length <= 1);
    // With no payday known the date is a guess, so ask: the box is on this job's form.
    const paydayAsk = !j.paydayKnown && j.freq === 'monthly' && !(j.payments || []).length && !editing ? h('button', { type: 'button', class: 'fv-link', text: 'Tell us your payday', onclick: () => { TX.edit = { id: j.id, payday: true }; txPaint(); } }) : null;
    const next = j.next && v.yearState === 'current' ? h('p', { class: 'fv-pl-mute small' }, last ? 'Last payslip' : 'Next payslip', ': about ', amt(gbp2(j.next.takeHome)), ` on ${txShort(j.next.date)}. `, paydayAsk) : null;
    const lastAsk = j.end && !j.ended && !(j.payments || []).length && !editing ? h('button', { type: 'button', class: 'fv-link fv-tx-lastask', text: 'Know your last payment? Add the exact amount', onclick: () => { TX.edit = { id: j.id, exact: true }; txPaint(); } }) : null;
    return h('li', { class: 'fv-tx-src-i' + (editing ? ' open' : ''), 'data-src': j.id }, head, sum, summary, next, lastAsk, notes, editing ? txJobForm(j, v) : null);
  }
  /** The job in plain words: each part says what it is for, in one line. Only what applies is open; a box with something in it is never folded away. */
  function txJobForm(j, v) {
    const yt = j.ytd || {};
    const key = txDraftKey(j.id);
    const per = txPerOf(j.id);
    const held = TX.drafts[key] && TX.drafts[key].extra;
    const pays = held ? held.pays.map(p => Object.assign({}, p)) : (j.payments || []).map(p => ({ date: p.date, amount: p.amount }));
    const askExact = !!(TX.edit && TX.edit.exact);
    let exact = held ? held.exact : (pays.length > 0 || askExact);
    if (askExact && !pays.length) pays.push({ date: null, amount: null });
    const payBox = h('div', { class: 'fv-tx-pays-ed', 'data-say': 'pays' });
    let onChange = () => {};
    const paintPays = () => {
      payBox.textContent = '';
      if (!exact) return;
      payBox.append(h('p', { class: 'fv-pl-mute small', text: 'Type each payment before tax and the day it is paid. Up to the first one Freeflo uses the pay above, or your pay so far if you add it. After that, nothing is paid on any other date.' }));
      pays.forEach((p, i) => {
        const d = h('input', { type: 'date', class: 'fv-tx-in', 'aria-label': 'Payment date', value: p.date || '' });
        const a = moneyWire(h('input', { type: 'text', inputmode: 'decimal', class: 'fv-tx-in', 'aria-label': 'Payment amount before tax', placeholder: 'Amount before tax', autocomplete: 'off', value: p.amount != null ? moneyNice(p.amount) : '' }));
        d.addEventListener('change', () => { p.date = d.value || null; onChange(); });
        a.addEventListener('input', () => { p.amount = moneyParse(a.value); onChange(); });
        payBox.append(h('div', { class: 'fv-tx-payrow' }, d, a, h('button', { type: 'button', class: 'fv-btn ghost', 'aria-label': 'Remove this payment', onclick: () => { pays.splice(i, 1); paintPays(); onChange(); } }, ic('x'))));
      });
      payBox.append(txBtn('Add another payment', 'plus', () => { pays.push({ date: null, amount: null }); paintPays(); onChange(); }, 'ghost small'));
    };
    const setExact = (on) => { exact = on; if (exact && !pays.length) pays.push({ date: null, amount: null }); modeSeg.set(on ? 'exact' : 'steady'); paintPays(); showLast(); onChange(); };
    const modeSeg = seg([['steady', 'Steady pay until then'], ['exact', 'I know the exact amounts']], exact ? 'exact' : 'steady', (x) => setExact(x === 'exact'), 'How the rest of the pay comes');
    modeSeg.set(exact ? 'exact' : 'steady');
    const endBox = h('div', { class: 'fv-tx-endbox' });
    const ended = h('input', { type: 'checkbox', name: 'ended', checked: j.end ? true : null, onchange: () => { endBox.hidden = !ended.checked; showLast(); } });
    endBox.hidden = !j.end;
    endBox.append(txField('Last day', txInput('end', j.end, 'date'), 'The last day you work, or worked, there.'));
    const lastBox = h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'The last pay' }), h('p', { class: 'fv-pl-mute small', text: 'For one or more last payments (for example £2,500 next month and then nothing).' }), modeSeg.el, payBox);
    const showLast = () => { lastBox.hidden = !(ended.checked || exact); };
    const pay = txPayField(j.annual, per);
    const everyField = txField('Paid every', h('select', { name: 'every', class: 'fv-tx-in' }, TX_EVERY.map(([k, l]) => h('option', { value: k, text: l, selected: k === j.freq ? true : null }))));
    const hasYtd = yt.asOf || yt.pay != null || yt.tax != null;
    const ytdWanted = TX.focusYtd === j.id;
    const checks = (f) => txJobChecks(f, v, { id: j.id, ended: ended.checked, pays: exact ? pays : [] });
    const fieldsOf = (f0) => {
      const f = txPayYearly(f0);
      const good = pays.filter(p => p.date || p.amount);
      // An empty box leaves a payday set some other way (the last working day) as it is.
      const fields = { name: f.name, annual: f.annual, taxCode: f.taxCode, every: f.every, ...(f.every === 'monthly' ? { payday: f.payday == null ? null : Number(f.payday) } : {}), start: f.start, end: ended.checked ? f.end : null, prevPay: f.prevPay, prevTax: f.prevTax,
        payments: exact ? good.map(p => ({ date: p.date, amount: p.amount })) : [], bonus: f.bonus, bonusOn: f.bonus ? f.bonusOn : null };
      fields.ytd = f.asOf ? { asOf: f.asOf, pay: f.ytdPay, taxablePay: f.ytdTaxable, tax: f.ytdTax, ni: f.ytdNi, plan: f.ytdPlan, pg: f.ytdPg } : null;
      return fields;
    };
    const build = () => { const f = txRead(form); if (Object.values(f).some(x => Number.isNaN(x)) || checks(f).some(c => !c.soft)) return null; return { action: 'source.update', id: j.id, fields: fieldsOf(f) }; };
    const effect = txEffectLine(build, (p) => {
      const now = (p.jobs || []).find(x => x.id === j.id), was = j.year && j.year.pay;
      return now && now.pay != null && was != null && Math.abs(now.pay - was) >= 0.5 ? `Pay from this job this tax year goes from ${gbp(was)} to ${gbp(now.pay)}.` : '';
    });
    const form = h('form', { class: 'fv-tx-form', onsubmit: async (e) => {
      e.preventDefault();
      const f = txGet(form, checks); if (!f) return;
      const perNow = f.payPer, keepDraft = TX.drafts[key];
      delete TX.drafts[key];
      const ok = await txDo({ action: 'source.update', id: j.id, fields: fieldsOf(f) }, 'Changed', { form });
      if (ok) { F.txPer = Object.assign({}, F.txPer, { [j.id]: perNow }); saveF(); } else if (keepDraft) TX.drafts[key] = keepDraft;
    } },
      h('div', { class: 'fv-tx-grid' },
        txField('Employer', txInput('name', j.name)),
        pay.field, pay.per, everyField, txPaydayField(j.payday, j.paydayOther),
        txField('Tax code', txInput('taxCode', j.codeGiven ? j.codeText : '', 'text', { upper: true, placeholder: j.codeText }), `A short code on your payslip that says how much of your pay is tax-free. Leave it empty and Freeflo uses ${j.codeText}.`),
        txField('First day', txInput('start', j.start, 'date'), 'Empty if you have had the job all year.')),
      h('label', { class: 'fv-tx-check' }, ended, h('span', null, 'This job has ended, or I know when it will end', h('small', { text: 'Pay stops after the last day.' }))), endBox,
      lastBox,
      h('details', { class: 'fv-pl-more', open: hasYtd || ytdWanted ? true : null }, h('summary', null, h('b', { text: 'Type in a payslip' }), h('span', { class: 'mute', text: 'Makes your figures exact' })),
        h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'Pay so far this tax year' }), h('p', { class: 'fv-pl-mute small', text: 'From your latest payslip: the figures labelled “year to date” or “YTD”, meaning the total since 6 April. Freeflo uses them in place of its own guess up to that date.' }),
          h('div', { class: 'fv-tx-grid' }, txField('Payslip date', txInput('asOf', yt.asOf, 'date')), txField('Pay so far, before tax', txInput('ytdPay', yt.pay, 'money')), txField('Tax taken so far', txInput('ytdTax', yt.tax, 'money'))),
          h('details', { class: 'fv-pl-more', open: yt.ni != null || yt.plan != null || yt.pg != null || yt.taxablePay != null ? true : null }, h('summary', null, h('b', { text: 'More from the payslip' }), h('span', { class: 'mute', text: 'National Insurance, student loan' })),
            h('div', { class: 'fv-tx-grid' }, txField('National Insurance so far', txInput('ytdNi', yt.ni, 'money')), txField('Student loan so far', txInput('ytdPlan', yt.plan, 'money')), txField('Postgraduate loan so far', txInput('ytdPg', yt.pg, 'money')), txField('Taxable pay so far', txInput('ytdTaxable', yt.taxablePay, 'money'), 'Only if it is different from pay.'))))),
      h('details', { class: 'fv-pl-more', open: j.prevPay || j.prevTax || j.bonus ? true : null }, h('summary', null, h('b', { text: 'Less common' }), h('span', { class: 'mute', text: 'Pay from an earlier job, a bonus, different pay each time' })),
        h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'Pay before this job this tax year' }), h('p', { class: 'fv-pl-mute small', text: 'Only if you started this job after April, were paid elsewhere earlier this tax year, and that job is not on your list. The P45 from that job shows both figures (a P45 is the form you get when you leave a job).' }),
          h('div', { class: 'fv-tx-grid' }, txField('Pay before this job', txInput('prevPay', j.prevPay, 'money')), txField('Tax taken on it', txInput('prevTax', j.prevTax, 'money')))),
        h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'A bonus' }), h('p', { class: 'fv-pl-mute small', text: 'A one-off payment on top, before tax. It is counted once, not as extra salary.' }),
          h('div', { class: 'fv-tx-grid' }, txField('Bonus, before tax', txInput('bonus', j.bonus, 'money')), txField('Paid on', txInput('bonusOn', j.bonusOn, 'date')))),
        h('button', { type: 'button', class: 'fv-link', text: 'I am paid a different amount each time', onclick: () => setExact(true) })),
      effect.box,
      h('div', { class: 'fv-tx-foot' }),
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Save' }), txBtn('Cancel', null, () => txDropDraft(key, () => { TX.edit = { id: j.id }; TX.focus = j.id; txPaint(); }), 'ghost'), h('span', { class: 'fv-grow' }), txBtn('Remove this job', 'trash-2', () => { delete TX.drafts[key]; txDo({ action: 'source.remove', id: j.id }, 'Removed'); }, 'ghost danger')));
    const extra = () => ({ exact, pays: pays.map(p => ({ date: p.date, amount: Number.isNaN(p.amount) ? null : p.amount })) });
    const base = JSON.stringify([txFormVals(form), { exact: (j.payments || []).length > 0, pays: (j.payments || []).map(p => ({ date: p.date, amount: p.amount })) }]);
    const filled = txDraftFill(form, key);
    if (filled) endBox.hidden = !ended.checked;
    paintPays(); showLast(); pay.echo(); txPaydayFollow(form);
    if (TX.edit && TX.edit.payday) { TX.edit = { id: j.id }; setTimeout(() => { const el = form.querySelector('[name=payday]'); if (el) try { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); } catch (e) { /* no focus */ } }, 40); }
    if (askExact) { TX.edit = { id: j.id }; setTimeout(() => { try { lastBox.scrollIntoView({ block: 'nearest' }); const first = lastBox.querySelector('input'); if (first) first.focus({ preventScroll: true }); } catch (e) { /* no scroll */ } }, 40); }
    const after = () => { txSayAll(form, checks, txRead(form)); pay.echo(); effect.run(); };
    const soon = txFollow(form, key, base, after, extra);
    onChange = soon;
    if (filled) { form.prepend(h('p', { class: 'fv-tx-note-draft' }, ic('info'), h('span', { text: 'You started changing this. What you typed is still here, not saved yet.' }))); soon(); }
    if (ytdWanted) { TX.focusYtd = null; setTimeout(() => { const el = form.querySelector('[name=asOf]'); if (el) try { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); } catch (e) { /* no focus */ } }, 60); }
    return form;
  }
  function txSelfRow(s, v) {
    const editing = TX.edit && TX.edit.id === s.id;
    const head = h('button', { type: 'button', class: 'fv-tx-src-h', 'aria-expanded': editing ? 'true' : 'false', onclick: () => { TX.edit = editing ? null : { id: s.id }; txPaint(); } },
      h('span', { class: 'n' }, h('b', { text: s.name }), s.connected ? h('em', { text: 'from your employer or a connected business' }) : null, txNotSaved(s.id), s.from || s.to ? h('small', { text: [s.from ? txShort(s.from) : 'Start', s.to ? txShort(s.to) : 'now'].join(' to ') }) : null),
      h('span', { class: 'v' }, amt(gbp(s.income)), h('small', { text: 'money in' }), h('span', { class: 'fv-chg' }, ic(editing ? 'chevron-down' : 'pencil'), h('span', { text: editing ? 'Close' : 'Change' }))));
    const costsLine = h('p', { class: 'fv-pl-mute small' }, 'Costs: ', amt(gbp(s.costs + s.capital)), s.claims ? `, from ${s.claims} claim${s.claims === 1 ? '' : 's'}` : '', s.payments.length ? `. ${s.payments.length} payment${s.payments.length === 1 ? '' : 's'} listed.` : '.');
    let form = null;
    if (editing) {
      const yr = txYearSpan(v), key = txDraftKey(s.id);
      const checks = (f) => (f.start && f.end && f.end < f.start ? [{ name: 'end', text: 'The “To” date is before the “From” date. Change one of them.' }] : []);
      const fieldsOf = (f) => ({ name: f.name, start: f.start, end: f.end, amount: f.amount, expenses: f.expenses, connected: f.connected });
      const effect = txEffectLine(() => { const f = txRead(fm); if (Object.values(f).some(x => Number.isNaN(x)) || checks(f).length) return null; return { action: 'source.update', id: s.id, fields: fieldsOf(f) }; });
      const fm = h('form', { onsubmit: async (e) => { e.preventDefault(); const f = txGet(fm, checks); if (!f) return; const held = TX.drafts[key]; delete TX.drafts[key]; const ok = await txDo({ action: 'source.update', id: s.id, fields: fieldsOf(f) }, 'Changed', { close: false, form: fm }); if (!ok && held) TX.drafts[key] = held; } },
        h('div', { class: 'fv-tx-grid' }, txField('What is the work?', txInput('name', s.name)), txField('From', txInput('start', s.from, 'date')), txField('To', txInput('end', s.to, 'date'), 'Empty if it is still going.'),
          s.payments.length ? null : txField('Money in, total', txInput('amount', s.typedIncome, 'money'), 'Or list each payment below.'), txField('Other costs, as one total', txInput('expenses', s.typedCosts || '', 'money'), 'Costs you are not listing one by one.')),
        h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', name: 'connected', checked: s.connected ? true : null }), h('span', null, 'Some of this comes from my employer (or my spouse\'s), or from a business I or my family own or control.', h('small', { text: 'If so, the £1,000 trading allowance cannot be used this year.' }))),
        effect.box, h('div', { class: 'fv-tx-foot' }),
        h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Save' }), txBtn('Cancel', null, () => txDropDraft(key, () => { TX.edit = { id: s.id }; txPaint(); }), 'ghost'), h('span', { class: 'fv-grow' }), txBtn('Remove', 'trash-2', () => { delete TX.drafts[key]; txDo({ action: 'source.remove', id: s.id }, 'Removed'); }, 'ghost danger')));
      const base = JSON.stringify([txFormVals(fm), null]);
      txDraftFill(fm, key);
      txFollow(fm, key, base, () => { txSayAll(fm, checks, txRead(fm)); effect.run(); });
      const payChecks = (f) => {
        const out = [];
        if (!(f.amount > 0)) out.push({ name: 'amount', text: 'Add how much came in.' });
        if (!f.date) out.push({ name: 'date', text: 'Add the day it came in.' });
        else if (f.date < yr.start || f.date > yr.end) out.push({ name: 'date', text: `That date is outside the ${v.yearLabel} tax year. Use a date in this tax year, or switch year at the top.` });
        else if (f.date > v.today) out.push({ name: 'date', text: 'That date is in the future. Is it money you have not had yet? Wait until it arrives, or check the date.', soft: true });
        return out;
      };
      const pf = h('form', { class: 'fv-tx-inline', onsubmit: async (e) => { e.preventDefault(); const f = txGet(pf, payChecks); if (!f) return; await txDo({ action: 'payment.add', payment: { item: s.id, date: f.date, amount: f.amount, client: f.client } }, 'Added', { close: false, form: pf }); } },
        txField('Date', txInput('date', v.today, 'date')), txField('Amount', txInput('amount', '', 'money')), txField('From', txInput('client')), h('button', { type: 'submit', class: 'fv-btn', text: 'Add payment' }));
      form = h('div', { class: 'fv-tx-form' }, fm,
        h('h4', { class: 'fv-tx-sub', text: 'Payments from clients' }),
        s.payments.length ? h('ul', { class: 'fv-tx-pays' }, s.payments.map(p => h('li', null, h('span', { text: `${txShort(p.date)}${p.client ? ', ' + p.client : ''}` }), amt(gbp2(p.amount)), h('button', { type: 'button', class: 'fv-btn ghost', 'aria-label': 'Remove this payment', onclick: () => txDo({ action: 'payment.remove', id: p.id }, 'Removed', { close: false }) }, ic('x'))))) : null,
        pf);
    }
    return h('li', { class: 'fv-tx-src-i' + (editing ? ' open' : ''), 'data-src': s.id }, head, costsLine, form);
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
      h('span', { class: 'n' }, h('b', { text: o.name }), txNotSaved(o.id), h('small', { text: o.typeLabel })), h('span', { class: 'v' }, amt(gbp(o.amount)), h('small', { text: ({ year: 'a year', month: 'a month', week: 'a week', total: 'in total' })[o.per] || '' }), h('span', { class: 'fv-chg' }, ic(editing ? 'chevron-down' : 'pencil'), h('span', { text: editing ? 'Close' : 'Change' }))));
    let form = null;
    if (editing) {
      const key = txDraftKey(o.id);
      const effect = txEffectLine(() => { const f = txRead(form); return Number.isNaN(f.amount) ? null : { action: 'source.update', id: o.id, fields: { name: f.name, amount: f.amount, per: f.per } }; });
      form = h('form', { class: 'fv-tx-form', onsubmit: async (e) => { e.preventDefault(); const f = txGet(form); if (!f) return; const held = TX.drafts[key]; delete TX.drafts[key]; const ok = await txDo({ action: 'source.update', id: o.id, fields: { name: f.name, amount: f.amount, per: f.per } }, 'Changed', { form }); if (!ok && held) TX.drafts[key] = held; } },
        h('div', { class: 'fv-tx-grid' }, txField('Name', txInput('name', o.name)), txField('Amount', txInput('amount', o.amount, 'money')), txField('Every', h('select', { name: 'per', class: 'fv-tx-in' }, TX_PER.map(([k, l]) => h('option', { value: k, text: l, selected: k === o.per ? true : null }))))),
        effect.box, h('div', { class: 'fv-tx-foot' }),
        h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Save' }), txBtn('Cancel', null, () => txDropDraft(key, () => { TX.edit = { id: o.id }; txPaint(); }), 'ghost'), h('span', { class: 'fv-grow' }), txBtn('Remove', 'trash-2', () => { delete TX.drafts[key]; txDo({ action: 'source.remove', id: o.id }, 'Removed'); }, 'ghost danger')));
      const base = JSON.stringify([txFormVals(form), null]);
      txDraftFill(form, key);
      txFollow(form, key, base, () => { effect.run(); });
    }
    return h('li', { class: 'fv-tx-src-i' + (editing ? ' open' : '') }, head, form);
  }
  /** Sales of shares or crypto, Gift Aid, pension you paid yourself, Child Benefit, ISA used: only what applies. */
  function txExtras(v) {
    const e = v.extras || {};
    const fm = h('form', { class: 'fv-tx-form', onsubmit: async (ev) => { ev.preventDefault(); const f = txGet(fm); if (!f) return; await txDo({ action: 'extras.set', fields: { giftAid: f.giftAid, pensionPaid: f.pensionPaid, childBenefit: f.childBenefit, cbChildren: f.cbChildren, isaUsed: f.isaUsed, lisaUsed: f.lisaUsed, hasEmi: f.hasEmi ? true : undefined } }, 'Saved', { close: false, form: fm }); } },
      h('div', { class: 'fv-tx-grid' },
        txField('Gift Aid you gave', txInput('giftAid', e.giftAid, 'money'), 'What you actually gave to charity.'),
        txField('Pension you paid yourself', txInput('pensionPaid', e.pensionPaid, 'money'), 'Into a personal pension, not through your job.'),
        txField('Child Benefit received', txInput('childBenefit', e.childBenefit, 'money'), 'You and your partner, for the year. Matters if either of you earns over £60,000.'),
        txField('Number of children', txInput('cbChildren', e.cbChildren, 'number')),
        txField('Paid into ISAs this year', txInput('isaUsed', e.isaUsed, 'money'), 'An ISA is a tax-free savings account.'),
        txField('Of that, a Lifetime ISA', txInput('lisaUsed', e.lisaUsed, 'money'))),
      h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', name: 'hasEmi', checked: e.hasEmi ? true : null }), h('span', { text: 'I have share options from work (such as EMI options)' })),
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn', text: 'Save these' })));
    const gains = v.gains || [];
    const gf = h('form', { class: 'fv-tx-inline', onsubmit: async (ev) => { ev.preventDefault(); const f = txGet(gf); if (!f) return; await txDo({ action: 'gain.add', gain: { what: f.what, date: f.date, proceeds: f.proceeds, cost: f.cost, isa: f.isa } }, 'Added', { close: false, form: gf }); } },
      txField('What did you sell?', txInput('what', '', 'text', { placeholder: 'Shares, crypto…' })), txField('Date', txInput('date', '', 'date')), txField('Sold for', txInput('proceeds', '', 'money')), txField('Cost you', txInput('cost', '', 'money')), h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', name: 'isa' }), h('span', { text: 'In an ISA' })), h('button', { type: 'submit', class: 'fv-btn', text: 'Add' }));
    return h('details', { class: 'fv-pl-more', open: TX.open.has('extras') ? true : null, ontoggle: (x) => { if (x.target.open) TX.open.add('extras'); else TX.open.delete('extras'); } },
      h('summary', null, h('b', { text: 'Anything else' }), h('span', { class: 'mute', text: 'Charity, pensions, Child Benefit, ISAs, selling shares or crypto' })),
      h('div', { class: 'fv-pl-more-b' }, fm, h('h4', { class: 'fv-tx-sub', text: 'Shares or crypto you sold' }),
        gains.length ? h('ul', { class: 'fv-tx-pays' }, gains.map(g => h('li', null, h('span', { text: `${g.what}${g.date ? ', ' + txShort(g.date) : ''}${g.isa ? ' (in an ISA, tax-free)' : ''}` }), amt((g.gain < 0 ? '−' : '') + gbp(Math.abs(g.gain))), h('button', { type: 'button', class: 'fv-btn ghost', 'aria-label': 'Remove', onclick: () => txDo({ action: 'gain.remove', id: g.id }, 'Removed', { close: false }) }, ic('x'))))) : null, gf));
  }
