  // @part 37-tax.js · NEW (2.21) · OWNER: tax page (the Tax tab: position, keep-aside, deadlines, sources)
  // ── Tax ───────────────────────────────────────────────────────────────
  // For people with income nobody takes tax from. One tax year at a time, in plain words. Every number comes from the server
  // (GET /api/finance/tax -> {plan, doc, view, finder, comeIn, hmrc, ids}: lib/finance/uk-tax.mjs, tax-tab.mjs); this file only draws
  // and sends one change at a time (POST /api/finance/tax/change), each with Undo. UTR and NI number stay masked until tapped.
  const TX = { host: null, d: null, year: null, err: null, busy: false, open: new Set(), edit: null, paste: null, walk: null, slip: null, shelf: false, seq: 0, answers: false, why: null, focus: null, drafts: {}, focusYtd: null };
  const txCard = (cls, ...kids) => h('section', { class: 'fv-card fv-tx-c ' + (cls || '') }, ...kids);
  const txHead = (title, sub, right) => h('header', { class: 'fv-pl-h row' }, h('div', null, h('h3', { text: title }), sub ? h('p', { text: sub }) : null), right || null);
  const txBtn = (label, icon, fn, cls, more) => h('button', Object.assign({ type: 'button', class: 'fv-btn ' + (cls || ''), onclick: fn }, more || {}), icon ? ic(icon) : null, h('span', { text: label }));
  const txLong = (iso) => { try { return fd(dnum(iso), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return iso; } };
  const txShort = (iso) => { try { return fd(dnum(iso), { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return iso; } };
  /** "Ask about this": the line goes to the chat, the figures come from the engine (get_money part tax). */
  function txAsk(what, cls, where) {
    return h('button', { type: 'button', class: 'fv-tx-ask ' + (cls || ''), title: 'Ask about this', 'aria-label': `Ask the assistant about ${what}`, onclick: (e) => { e.preventDefault(); e.stopPropagation(); txAskNow(what, where); } }, ic('sparkles'));
  }
  function txAskNow(what, where) {
    const yr = TX.d && TX.d.view ? ` for the ${TX.d.view.yearLabel} tax year` : '';
    const msg = where ? `In my ${where}: explain "${what}" in plain words, using my real numbers.` : `On my Tax tab${yr}: explain "${what}" in plain words, using my real numbers.`;
    try { window.Assistant.open({ message: msg, send: true }); } catch (e) { toast('The assistant is not available right now.', { bad: true }); }
  }

  /* ---------- talking to the server ---------- */
  function txTake(body) {
    if (body && body.view) TX.d = body;
    // The plan follows: safe to spend and the Budgets tab see the change at once.
    if (body && body.plan) { const first = !MPL.v; MPL.plan = body.plan; planLoad().then(() => { if (R.sectionId === 'budgets') planPaint(); else if (first && R.sectionId === 'tax') txPaint(); }); }
  }
  async function txLoad(year) {
    TX.err = null; const my = ++TX.seq;
    try {
      const r = await api('/api/finance/tax' + (year ? `?year=${encodeURIComponent(year)}` : ''));
      if (my !== TX.seq) return;
      if (r.ok && r.body && r.body.view) { txTake(r.body); TX.year = r.body.view.year; }
      else TX.err = r.status === 404 ? 'Restart Freeflo to use the Tax tab.' : ((r.body && r.body.error) || 'The Tax tab could not be read.');
    } catch (e) { if (my === TX.seq) TX.err = 'Freeflo isn’t answering. Your figures are safe.'; }
  }
  /** One change or a list, with Undo. Half-typed input stays open when it fails. */
  async function txDo(change, say, o) {
    o = o || {};
    if (TX.busy) return false;
    TX.busy = true;
    if (o.form) o.form.dataset.sending = '1';   // what is on its way is no longer a draft
    try {
      const body = Array.isArray(change) ? { changes: change, say, year: TX.year } : { change, year: TX.year };
      const r = await api('/api/finance/tax/change', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok || !r.body.view) {
        const text = (r.body && r.body.error) || 'That could not be saved.';
        // A form says it next to what was typed, and keeps all of it.
        if (o.form && o.form.isConnected) { txSayClear(o.form); txSay(o.form, null, text + ' What you typed is still here.'); }
        else toast(text, { bad: true, action: 'Try again', onAction: () => txDo(change, say, o) });
        return false;
      }
      const wasBill = TX.d && TX.d.view && TX.d.view.bill ? TX.d.view.bill.balance : null;
      txTake(r.body);
      if (o.close !== false) TX.edit = null;
      txPaint();
      const undo = r.body.undo;
      const moved = txBillChange(wasBill, r.body.view.bill ? r.body.view.bill.balance : null);
      if (!o.quiet) toast([say || r.body.said || 'Saved', moved].filter(Boolean).join('. '), { action: 'Undo', onAction: () => txUndo(undo) });
      return true;
    } catch (e) {
      if (o.form && o.form.isConnected) { txSayClear(o.form); txSay(o.form, null, 'Freeflo isn’t answering, so that was not saved. What you typed is still here. Press Save again in a moment.'); }
      else toast('Freeflo isn’t answering, so that was not saved.', { bad: true, action: 'Try again', onAction: () => txDo(change, say, o) });
      return false;
    } finally { TX.busy = false; if (o.form) delete o.form.dataset.sending; }
  }
  async function txUndo(token) {
    const r = await api('/api/finance/tax/undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ undo: token, year: TX.year }) });
    if (r.ok && r.body.view) { txTake(r.body); txPaint(); toast('Put back'); }
    else toast((r.body && r.body.error) || 'That could not be undone.', { bad: true });
  }
  async function txPost(path, body, then) {
    try {
      const r = await api('/api/finance/tax' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ year: TX.year }, body || {})) });
      if (!r.ok) { toast((r.body && r.body.error) || 'That did not work. Try again.', { bad: true }); return null; }
      if (r.body && r.body.view) { txTake(r.body); txPaint(); }
      if (then) then(r.body);
      return r.body;
    } catch (e) { toast('Freeflo isn’t answering. Try again in a moment.', { bad: true }); return null; }
  }

  /* ---------- the section's hooks ---------- */
  SEC_OPTS.tax = Object.assign({ filters: false, kpis: false }, SEC_OPTS.tax || {});
  BUILD.tax = (g) => {
    TX.host = h('div', { class: 'fv-pl fv-tx', style: { '--span': 12, '--span-md': 12 } });
    // Enter saves, from any box in a form.
    TX.host.addEventListener('keydown', (e) => { if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type === 'checkbox') return; const form = e.target.form; if (form) { e.preventDefault(); form.requestSubmit(); } });
    g.append(TX.host);
    txPaint();
    txLoad(TX.year).then(() => { if (R.sectionId === 'tax') txPaint(); });
  };
  // A repaint from elsewhere (new bank data, live sync) never takes half-typed input away: this tab only follows new bank data.
  UPDATE.tax = () => {
    if (!TX.d) { txPaint(); return; }
    if (TX.seenLoad === R.loadedAt) return;
    TX.seenLoad = R.loadedAt;
    txLoad(TX.year).then(() => { if (R.sectionId === 'tax' && !(TX.host && TX.host.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) txPaint(); });
  };
  function txPaint() {
    const host = TX.host; if (!host || !host.isConnected) return;
    const keep = host.parentElement ? scrollerTop() : null;
    host.textContent = '';
    if (TX.err && !TX.d) { host.append(h('section', { class: 'fv-card fv-pl-invite' }, h('p', { text: TX.err }), txBtn('Try again', 'refresh-cw', () => { TX.err = null; txLoad(TX.year).then(txPaint); }))); return; }
    if (!TX.d) { host.append(h('section', { class: 'fv-card fv-pl-invite' }, h('p', { class: 'fv-pl-mute', text: 'Opening your tax year…' }))); return; }
    const v = TX.d.view;
    if (!v.uk) { host.append(txNotUk(v)); return; }
    if (TX.walk) { host.append(txWalkScreen(v)); restoreScroll(keep); return; }
    if (TX.answers) { host.append(ansPage(() => { TX.answers = false; ANS.edit = null; txPaint(); })); restoreScroll(keep); return; }
    host.append(txTop(v));
    if (TX.d.rolledFrom) host.append(txRolled(v));
    if (v.yearState === 'past' && v.carried && !v.confirmed) host.append(txCarried(v));
    if (v.yearState === 'future') host.append(h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: `A look ahead at ${v.yearLabel}, worked out from this year's list of income${v.figuresFromLabel ? ` and the ${v.figuresFromLabel} tax rates, because the new ones are not out yet` : ''}. Change anything on this year's page.${v.codedOut ? ` It includes ${gbp2(v.codedOut.amount)} of tax from ${v.codedOut.fromLabel}, taken through your tax code.` : ''}` })));
    if (TX.paste) host.append(txPasteCard(v));
    if (TX.slip) host.append(txSlipCard(v));
    const lo = txLooksOff(v); if (lo) host.append(lo);
    const ak = txAskNowCard(v); if (ak) host.append(ak);
    const pr = txPrompts(v); if (pr) host.append(pr);
    const nothing = !v.sources.jobs.length && !v.sources.self.length && !v.sources.other.length;
    if (nothing) { host.append(txSources(v)); host.append(txMore(v)); restoreScroll(keep); return; }
    host.append(txPosition(v));
    host.append(txSources(v));
    const asideCard = txAside(v); if (asideCard) host.append(asideCard);
    host.append(txDeadlines(v));
    const fi = txFinder(v); if (fi) host.append(fi);
    const filing = txFiling(v); if (filing) host.append(filing);
    host.append(txMore(v));
    restoreScroll(keep);
    if (TX.focus) { const f = TX.focus; TX.focus = null; setTimeout(() => { const el = host.querySelector('[data-src="' + String(f).replace(/[^\w-]/g, '') + '"]'); if (el) el.scrollIntoView({ block: 'start' }); }, 30); }
  }
  const scrollerTop = () => { try { const s = scroller(); return s ? s.scrollTop : null; } catch (e) { return null; } };
  const restoreScroll = (y) => { if (y == null) return; try { const s = scroller(); if (s && Math.abs(s.scrollTop - y) > 1) s.scrollTop = y; } catch (e) { /* no scroller */ } };

  function txNotUk(v) {
    if (v.country === 'other') return h('section', { class: 'fv-card fv-pl-invite' }, h('h2', { text: 'The Tax tab is for the UK' }), h('p', { text: 'You told Freeflo you pay tax somewhere else, so there is nothing to work out here.' }));
    return h('section', { class: 'fv-card fv-pl-invite' }, h('h2', { text: 'Do you pay tax in the UK?' }), h('p', { text: 'Freeflo works out how much tax you owe, when to file and pay, and what you can claim. Start with a few easy questions in your money plan.' }),
      h('div', { class: 'fv-pl-acts' }, txBtn('Set up my money plan', 'arrow-right', () => { setSection('budgets'); setTimeout(() => { try { pqStart('country'); } catch (e) { /* the plan opens by itself */ } }, 120); }, 'primary big')));
  }

  /* ---------- the top: which year, and the main actions ---------- */
  function txTop(v) {
    const years = seg(v.years.map(y => [y.id, y.label + (y.state === 'current' ? ' (now)' : '')]), v.year, (id) => { TX.year = id; TX.edit = null; TX.d = TX.d; txLoad(id).then(txPaint); }, 'Tax year');
    years.set(v.year);
    const drop = (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) { e.preventDefault(); txReadSlip(f); } };
    return h('section', { class: 'fv-card fv-tx-c fv-tx-top', ondragover: (e) => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); }, ondrop: drop },
      h('div', { class: 'fv-tx-top-r' }, h('h2', { class: 'fv-tx-t', text: 'Your tax' }), years.el),
      h('p', { class: 'fv-pl-mute', text: `An estimate from official ${v.regionName} rates and what you tell Freeflo. You file on GOV.UK yourself.` }),
      v.estimated ? h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: `The ${v.yearLabel} figures are not in Freeflo yet, so this uses the ${v.figuresFromLabel} ones as an estimate. An update brings the real ones.` })) : null,
      h('div', { class: 'fv-pl-acts fv-tx-acts' },
        v.yearState !== 'future' && (v.filing.answer !== 'no' || v.yearState === 'past') ? txBtn('File my return', 'send', () => txOpenWalk(), 'primary') : null,
        txBtn('Add a payslip', 'file-up', () => { TX.slip = TX.slip && TX.slip.choose ? null : { choose: true }; txPaint(); }),
        txBtn('Your answers', 'pencil', () => ansOpen()),
        txBtn('Tell Freeflo in one go', 'sparkles', () => { TX.paste = TX.paste ? null : { text: '' }; txPaint(); }, 'ghost')));
  }
  function txRolled(v) {
    return txCard('fv-tx-note', h('h3', { text: 'A new tax year has started' }), h('p', { text: `We kept your ${TX.d.rolledFrom} sources and carried them over. New year, new figures: check your jobs below, and the tax code on your first payslip.` }),
      h('div', { class: 'fv-pl-acts' }, txBtn('They look right', 'check', () => txDo({ action: 'year.confirm' }, 'Thanks. Your sources are confirmed.'), 'primary')));
  }
  function txCarried(v) {
    return txCard('fv-tx-note', h('h3', { text: `Is this what you had in ${v.yearLabel}?` }), h('p', { text: 'We filled this year in from your money plan, by date. Check the sources below and change anything that is different.' }),
      h('div', { class: 'fv-pl-acts' }, txBtn('Yes, this is right', 'check', () => txDo({ action: 'year.confirm' }, 'Thanks. Your sources are confirmed.'), 'primary')));
  }

  /* ---------- the running question, asked at the time ---------- */
  function txAskNowCard(v) {
    const f = TX.d.finder;
    const list = (f && f.ask) || [];
    if (!list.length || !v.sources.self.length) return null;
    return txCard('fv-tx-comein-c', h('div', { class: 'fv-tx-comein' }, h('h4', { text: 'Is this for your work?' }), h('p', { class: 'fv-pl-mute small', text: 'Recent payments that look like work costs. Better to say now than at the end of the year.' }),
      h('ul', null, list.map(s => h('li', null, h('span', { class: 'n' }, h('b', { class: 'fv-amt', text: s.merchant }), h('small', { text: `${txShort(s.date)}. ${s.what}.` })), amt(gbp2(s.amount)),
        h('div', { class: 'fv-pl-acts' }, txBtn('Yes', null, () => txDo({ action: 'claim.add', claim: { item: s.period, tx: s.tx, date: s.date, what: s.merchant, amount: s.amount, pct: s.pct, cat: s.cat, rule: s.rule } }, 'Claimed', { close: false }), 'small'), txBtn('No', null, () => txDo({ action: 'dismiss', tx: s.tx }, 'Hidden', { close: false }), 'ghost small')))))));
  }

  /* ---------- the year's position ---------- */
  function txBigLine(v) {
    const b = v.bill;
    if (b.noReturn) {
      if (b.balance > 0.5 && b.balance < 10) return { big: gbp(b.balance), word: 'difference', tone: 'good', say: 'Nothing to do. Tax codes round a little, so payroll and the year’s tax end a few pounds apart.' };
      if (b.viaCode && b.balance > 0.5) return { big: gbp(b.balance), word: 'collected through your tax code', tone: 'good', say: 'You do not need a tax return for this, and it is not a bill to pay. HMRC normally writes to you after the tax year ends, then collects it through your tax code in ' + b.collectIn + ', so your pay will be a little lower then. Nothing is kept aside for it.' };
      if (b.balance > 0.5) return { big: gbp(b.balance), word: 'tax not yet taken', tone: 'owe', say: 'You do not need a tax return for this, but it is too much to collect through a tax code. HMRC writes to you about how to pay it, so it is kept aside.' };
      if (b.balance < -0.5) return { big: gbp(-b.balance), word: 'paid too much', tone: 'good', say: 'You may be due a refund. HMRC usually writes to you after the tax year ends, in a letter called a P800.' };
      return { big: gbp(0), word: 'left to pay', tone: 'good', say: 'What your jobs take through payroll covers the year.' };
    }
    if (b.viaCode) return { big: gbp(b.balance), word: 'collected through your tax code', tone: 'good', say: 'This is not a January bill. HMRC takes it through your pay in ' + b.collectIn + ', so your pay will be a little lower then. Nothing is kept aside for it.' };
    // (nothing paid yet: the advance payments last year's return will ask for are more than this year's bill)
    if ((b.parts.poaToCome || 0) > 0.5 && b.balance < -0.5 && b.balance + b.parts.poaToCome > -0.5) return { big: gbp(-b.balance), word: 'should come back after your advance payments', tone: 'good', say: `Because of last year\u2019s return, HMRC will ask for ${gbp(b.parts.poaToCome)} in advance next January and July. That is more than this year\u2019s bill, so the difference should come back. You have not paid it yet. If your income has dropped, you can ask HMRC to lower those payments.` };
    if (b.parts.paidOnAccount + (b.parts.poaToCome || 0) > 0.5 && b.balance < -0.5) return { big: gbp(-b.balance), word: 'to come back', tone: 'good', say: 'The payments you made in advance were more than the year\'s bill. HMRC refunds it, or takes it off your next payment.' };
    if (b.balance > 0.5) return { big: gbp(b.balance), word: 'still to pay for this year', tone: 'owe', say: b.poa.applies ? 'This goes on your tax return. With payments on account, your January bill is higher: see below.' : 'This goes on your tax return. Nobody takes it before the money reaches you.' };
    if (b.balance < -0.5) return { big: gbp(-b.balance), word: 'paid too much', tone: 'good', say: 'Your jobs took more than your whole-year bill. You may be due a refund, usually paid after the year ends.' };
    return { big: gbp(0), word: 'left to pay', tone: 'good', say: 'What your jobs take through payroll covers the year.' };
  }
  /** One line of the year's position. o.feed: what feeds it (a visible Change, or "Worked out from these" when o.calc). */
  function txPosRow(label, val, help, o) {
    o = o || {};
    const id = o.feed ? 'row:' + o.feed : null;
    const row = h('div', { class: 'fv-tx-row' + (o.total ? ' total' : '') + (o.sub ? ' sub' : '') },
      h('span', { class: 'l' }, label, help ? h('small', { text: help }) : null, id ? txFeedBtn(id, o.calc) : null),
      h('span', { class: 'v' }, val == null ? null : amt(val), o.ask !== false ? txAsk(typeof label === 'string' ? label : o.ask || 'this line') : null));
    return id && TX.why === id && TX.d ? [row, txFeed(TX.d.view, o.feed)] : row;
  }
  function txPosition(v) {
    const p = v.position, b = v.bill, big = txBigLine(v);
    const money = (x) => (x < 0 ? '−' : '') + gbp(Math.abs(x));
    const rows = [
      txPosRow('Total income', gbp(p.income), null, { feed: 'income' }),
      txPosRow('Tax-free amount', gbp(p.allowance), (v.allowance.override != null ? 'Your own figure from HMRC. ' : '') + (p.allowanceLeft > 0.5 ? `You used ${gbp(p.allowanceUsed)}. ${gbp(p.allowanceLeft)} is unused.` : 'All of it is used, across your jobs and other income.'), { feed: 'allowance' }),
      txPosRow('Income tax due', gbp(p.taxDue), `Your jobs take ${gbp(p.taxTaken)} of this through payroll.`, { feed: 'taxDue', calc: true }),
      p.taxLeft > 0.5 ? txPosRow('Income tax still to pay', gbp(p.taxLeft), null, { sub: true }) : p.taxLeft < -0.5 ? txPosRow('Income tax paid too much', gbp(-p.taxLeft), 'You may be due a refund.', { sub: true }) : null,
    ];
    if (p.hasLoan) {
      rows.push(txPosRow(`Student loan (${p.loanNames.join(' and ')})`, gbp(p.loanDue), `Your jobs take ${gbp(p.loanTaken)}. Each job looks only at its own pay, so the rest is collected through your tax return.`, { feed: 'loan', calc: true }));
      if (p.unearned > 0) rows.push(h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', null, p.unearnedCounted ? `Your other income (${gbp(p.unearned)}) is over ${gbp(p.unearnedLimit)}, so all of it counts towards your student loan.` : `Your other income (${gbp(p.unearned)}) is ${gbp(p.unearnedLimit)} or less, so it does not count towards your student loan.`)));
      if (p.loanLeft > 0.5) rows.push(txPosRow('Student loan still to pay', gbp(p.loanLeft), b.noReturn ? 'Only collected if you send a tax return.' : null, { sub: true }));
      if (p.loanOver > 0.5) rows.push(h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: `Your jobs take ${gbp(p.loanOver)} more than the year's repayment. That does not reduce your tax bill; the Student Loans Company can refund it.` })));
    }
    rows.push(txPosRow('National Insurance from your jobs', gbp(p.niTotal), p.ni.length > 1 ? p.ni.map(n => `${n.name || 'Job'}: ${gbp(n.amount)}`).join('. ') + '.' : null, { feed: 'ni', calc: true }));
    if (v.trade) rows.push(txPosRow('National Insurance on your profit', gbp(p.class4), 'Called Class 4. It starts once your profit is over £12,570.', { feed: 'class4', calc: true }));
    if (p.class2 && p.class2.voluntary) rows.push(h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: `Your profit is under ${gbp(p.class2.spt)}, so you do not have to pay any Class 2 National Insurance. You can choose to, at ${gbp2(p.class2.week)} a week (${gbp(p.class2.year)} a year), to keep your record going. A job that pays enough usually does that already.` })));
    if (p.cgt) rows.push(txPosRow('Capital Gains Tax', gbp(p.cgt), `On ${gbp(p.gains)} of gains.`));
    if (b.parts.paidOnAccount) rows.push(txPosRow('Payments on account already made', '−' + gbp(b.parts.paidOnAccount), 'What you paid in advance last January and July.'));
    if (b.parts.poaToCome) rows.push(txPosRow('Payments on account still to make', '−' + gbp(b.parts.poaToCome), 'Set by last year’s return, and due this coming January and July. They count towards this year, so they come off here. Not paid yet.'));
    rows.push(txPosRow(b.viaCode ? 'Collected through your tax code' : b.balance >= 0 ? 'Still to pay' : 'Too much paid', gbp(Math.abs(b.balance)), null, { total: true }));

    const poa = !b.poa.applies && b.noReturn ? null : h('div', { class: 'fv-tx-poa' },
      h('h4', { text: 'Payments on account' }), h('p', { class: 'fv-pl-mute' }, amt(b.poa.why)),
      b.poa.applies ? h('div', { class: 'fv-tx-cash' },
        h('div', null, h('span', { class: 'fv-tx-k', text: `January after this tax year` }), amt(gbp(b.january), 'fv-tx-v'), h('small', { text: b.viaCode ? `The first ${gbp(b.poa.first)} in advance. The rest comes through your tax code.` : `Still to pay, plus the first ${gbp(b.poa.first)} in advance.` })),
        h('div', null, h('span', { class: 'fv-tx-k', text: `The July after` }), amt(gbp(b.july), 'fv-tx-v'), h('small', { text: 'The second payment in advance.' }))) : null,
      txAsk('payments on account'));
    const trade = v.trade ? h('div', { class: 'fv-tx-trade' },
      h('h4', { text: v.trade.used === 'allowance' ? 'Trading allowance used' : 'Your actual costs used' }), h('p', { class: 'fv-pl-mute' }, amt(v.trade.why)),
      v.trade.available ? (() => {
        const s = seg([['auto', 'Whichever saves more'], ['allowance', 'The allowance'], ['actual', 'My actual costs']], v.trade.choice, (x) => txDo({ action: 'extras.set', fields: { tradeChoice: x } }, 'Changed'), 'Trading allowance or costs');
        s.set(v.trade.choice); return s.el;
      })() : null,
      v.trade.billWithAllowance != null ? h('p', { class: 'fv-pl-mute small' }, 'Still to pay with the allowance: ', amt(gbp(v.trade.billWithAllowance)), '. With your actual costs: ', amt(gbp(v.trade.billWithCosts)), '.') : null,
      v.trade.fullRelief ? h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: 'Your self-employed income is £1,000 or less and covered by the allowance, so you do not need to tell HMRC about it. Keep a record.' })) : null) : null;

    const how = h('details', { class: 'fv-pl-more fv-tx-how', open: TX.open.has('how') ? true : null, ontoggle: (e) => { if (e.target.open) TX.open.add('how'); else TX.open.delete('how'); } },
      h('summary', null, h('b', { text: 'How this was worked out' }), h('span', { class: 'mute', text: 'Line by line' })),
      h('div', { class: 'fv-tx-lines' }, v.lines.map(l => txLine(l, v, money))));
    const cmp = v.compare ? h('p', { class: 'fv-pl-mute fv-tx-cmp' }, `Last year (${v.compare.label}): income `, amt(gbp(v.compare.income)), ', income tax ', amt(gbp(v.compare.tax)), v.compare.loan ? ', student loan ' : '', v.compare.loan ? amt(gbp(v.compare.loan)) : '', '.') : null;
    return txCard('fv-tx-pos',
      h('div', { class: 'fv-pl-big' }, amt(big.big, 'fv-pl-big-v'), h('span', { text: big.word })),
      h('p', { class: 'fv-pl-say', text: big.say }),
      h('div', { class: 'fv-tx-rows' }, rows),
      (v.notes || []).filter(n => n.uncovered).map(n => h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: n.text }))),
      poa, trade, how, cmp);
  }

  /** The feed behind a line of "How this was worked out": a job or piece of work to open, or a panel (Change / Worked out from these). */
  function txLineFeed(l, v) {
    if (/^job:/.test(l.key)) return { open: l.key.slice(4), label: 'Open this job' };
    if (/^self-/.test(l.key) && v.sources.self[0]) return { open: v.sources.self[0].id, label: 'Open this work' };
    if (l.key === 'allowance' || l.key === 'bik') return { feed: 'allowance' };
    if (l.key === 'income') return { feed: 'income' };
    if (l.key === 'tax-due' || /^band:/.test(l.key)) return { feed: 'taxDue', calc: true };
    if (l.key === 'loan-due') return { feed: 'loan', calc: true };
    if (l.key === 'class4') return { feed: 'class4', calc: true };
    return null;
  }
  function txLine(l, v, money) {
    const f = txLineFeed(l, v), id = f && f.feed ? 'line:' + f.feed + ':' + l.key : null;
    const btn = !f ? null : f.open ? h('button', { type: 'button', class: 'fv-chg', onclick: () => txOpenJob(f.open) }, ic('pencil'), h('span', { text: f.label })) : txFeedBtn(id, f.calc);
    const row = h('div', { class: 'fv-tx-line' + (l.total ? ' total' : '') + (l.sub ? ' sub' : '') }, h('span', { class: 'l' }, l.label, l.how ? h('small', { text: l.how }) : null, btn), h('span', { class: 'v' }, amt(money(l.amount)), txAsk(l.label)));
    return id && TX.why === id ? [row, txFeed(v, f.feed)] : row;
  }

  /* ---------- keep aside ---------- */
  function txAside(v) {
    const a = v.aside;
    const off = a.mode === 'off';
    if (a.pot < 10 && !v.trade && !off && !a.bills.length) return null;
    const each = Math.round(a.keepShare * 100);
    const say = a.pot > 0.5 ? (a.lastUnpaid > 0.5 && a.owedThisYear > 0.5 ? `${gbp(a.lastUnpaid)} for your last return, and ${gbp(a.owedThisYear)} so far this year.` : a.lastUnpaid > 0.5 ? 'For your last return.' : 'What you have earned so far this year will owe this.') : 'Nothing to keep aside right now.';
    return txCard('fv-tx-aside',
      txHead('Keep this aside', 'So the bill is never a shock.', txAsk('how much to keep aside')),
      h('div', { class: 'fv-tx-cash' },
        h('div', null, h('span', { class: 'fv-tx-k', text: 'Right now' }), amt(gbp(a.pot), 'fv-tx-v'), h('small', { text: say + (a.owedThisYear > 0.5 && a.thisYearDue ? ` This year's is due by ${txShort(a.thisYearDue)}.` : '') })),
        v.trade || a.keepPer1000 > 0 ? h('div', null, h('span', { class: 'fv-tx-k', text: 'Of each new payment' }), amt(`${each}%`, 'fv-tx-v'), h('small', null, 'Keep ', amt(gbp(a.keepPer1000)), ' of every £1,000 a client pays you.')) : null,
        a.monthly != null && a.monthly > 0 ? h('div', null, h('span', { class: 'fv-tx-k', text: 'In your money plan' }), amt(gbp(a.monthly), 'fv-tx-v'), h('small', { text: 'Held back each month.' })) : null),
      a.bills.length ? h('ul', { class: 'fv-tx-bills' }, a.bills.map(x => h('li', null, h('span', { text: x.overdue ? `${x.label}, was due ${txShort(x.date)}. It stays here until you tell us it is paid.` : `${x.label}, by ${txShort(x.date)}` }), amt(gbp(x.amount)), x.overdue ? txBtn('I have paid this', 'check', () => txPost('/tick', { id: x.id, done: true, year: x.year, brief: true }, () => { toast('Marked as paid'); txLoad(TX.year).then(txPaint); }), 'ghost small') : null))) : null,
      a.short ? h('p', { class: 'fv-pl-note warn' }, ic('triangle-alert'), h('span', null, 'You have ', amt(gbp(a.have)), ' across your accounts and savings, less than the ', amt(gbp(a.pot)), ' to keep aside. Try to build it back up before the bill is due.')) : null,
      h('div', { class: 'fv-tx-aside-m' }, h('label', null, h('input', { type: 'checkbox', checked: off ? null : true, onchange: (e) => txSetAside(e.target.checked) }), h('span', { text: 'Show this in my money plan and safe to spend' }))));
  }
  async function txSetAside(on) {
    const next = pqClone(TX.d.plan); next.taxAside = { mode: on ? 'auto' : 'off' };
    const r = await api('/api/finance/tax', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: next, doc: TX.d.doc, year: TX.year }) });
    if (r.ok && r.body.view) { txTake(r.body); txPaint(); toast(on ? 'Your plan keeps it aside' : 'Your plan no longer keeps it aside'); }
    else toast('That could not be saved.', { bad: true });
  }

  /* ---------- do I need to file, and when ---------- */
  function txDeadlines(v) {
    const f = v.filing;
    const tone = { must: 'warn', may: 'info', no: 'good' }[f.answer];
    // The bill, spotted in the bank: one tap to say that was it.
    const hits = (TX.d.hmrc || []);
    const paidTick = (d) => {
      if (d.state === 'done' || !hits.length || (d.id !== 'pay' && d.id !== 'poa2')) return null;
      const near = hits.filter(x => Math.abs(dnum(x.date) - dnum(d.date)) <= 45 && !(v.filed && v.filed.paidAt === x.date));
      if (!near.length) return null;
      const x = near[near.length - 1];
      const fields = d.id === 'pay' ? { paid: x.amount, paidAt: x.date } : { poaSecondPaid: x.date };
      return h('small', { class: 'on' }, 'Your bank shows ', amt(gbp2(x.amount)), ` to HMRC on ${txShort(x.date)}. `, h('button', { type: 'button', class: 'fv-link', text: 'Yes, that was this', onclick: () => txDo({ action: 'filed.record', fields }, 'Recorded') }));
    };
    const need = h('div', { class: 'fv-tx-need ' + tone }, ic(f.answer === 'no' ? 'circle-check' : f.answer === 'may' ? 'circle-help' : 'file-text'),
      h('div', null, h('b', { text: `Do I need to file for ${v.yearLabel}? ` }), h('span', { text: f.say }), h('ul', null, f.reasons.concat(f.maybes).map(t => h('li', { class: 'fv-amt', text: t }))), f.answer === 'may' ? h('a', { href: 'https://www.gov.uk/check-if-you-need-tax-return', target: '_blank', rel: 'noopener noreferrer', class: 'fv-link', text: 'Check on GOV.UK' }) : null));
    const list = v.deadlines;
    const open = list.filter(d => d.state !== 'done' && d.days >= 0);
    const hasTasks = list.some(d => d.task);
    const allTasks = open.length && open.every(d => d.task);
    const rows = list.map(d => h('li', { class: 'fv-tx-dl ' + d.state },
      d.viaCode ? h('span', { class: 'fv-tx-tick' }) : h('label', { class: 'fv-tx-tick', title: 'I have done this' }, h('input', { type: 'checkbox', 'aria-label': `I've done this: ${d.title}`, checked: d.state === 'done' ? true : null, onchange: (e) => txPost('/tick', { id: d.id, done: e.target.checked }) })),
      h('div', { class: 'fv-tx-dl-m' }, h('b', { text: d.title }), h('small', null, d.text), d.amount ? h('small', null, 'About ', amt(gbp(d.amount))) : null, d.task ? h('small', { class: 'on', text: 'On your task list' }) : null, paidTick(d)),
      h('time', { datetime: d.date, text: d.viaCode ? 'Nothing to pay' : d.state === 'done' ? 'Done' : txShort(d.date) + (d.state === 'overdue' ? ' (passed)' : d.days <= 30 && d.days >= 0 ? ` (${d.days === 0 ? 'today' : d.days + ' days'})` : '') })));
    return txCard('fv-tx-dls',
      txHead('Dates to remember', 'Each reminder goes on your task list a little ahead of its date.', list.length ? (allTasks ? h('span', { class: 'mute small', text: 'All on your task list' }) : txBtn('Remind me', 'bell', () => txPost('/reminders', { always: true }, (b) => { if (b && b.made) toast(`${b.made} reminder${b.made === 1 ? '' : 's'} added to your tasks and calendar, each a little ahead of its date.`); }))) : null),
      need,
      list.length ? h('ul', { class: 'fv-tx-dl-list' }, rows) : null,
      list.length ? h('p', { class: 'fv-pl-mute small', text: v.penaltyLine }) : null,
      !list.length && v.yearState === 'current' ? h('p', { class: 'fv-pl-mute small' }, 'If that changes, the dates appear here. ', h('button', { type: 'button', class: 'fv-link', text: 'Make the figures pack anyway', onclick: () => txMakePack(v) })) : null,
      v.upcoming.filter(d => d.year !== v.year && d.days >= 0).slice(0, 3).length ? h('div', { class: 'fv-tx-other' }, h('h4', { text: 'Also coming up' }), h('ul', null, v.upcoming.filter(d => d.year !== v.year && d.days >= 0).slice(0, 3).map(d => h('li', null, h('button', { type: 'button', class: 'fv-link', text: `${d.title}, ${txShort(d.date)}`, onclick: () => { TX.year = d.year; txLoad(d.year).then(txPaint); } })))) ) : null);
  }
  function txPrompts(v) {
    const list = (v.prompts || []);
    const rev = v.review || [];
    if (!list.length && !rev.length) return null;
    const row = (p) => h('li', { class: 'fv-pl-flag info' }, ic('calendar-check'), h('div', { class: 'fv-pl-flag-m' }, h('b', { text: p.title }), h('span', { text: p.text })),
      h('div', { class: 'fv-pl-acts' }, txBtn('Make a task', 'plus', () => txPost('/prompt', { id: p.id, action: 'task', title: p.title, text: p.text, due: p.due }, () => toast('Added to your tasks')), 'ghost small'), h('button', { type: 'button', class: 'fv-btn ghost', title: 'Not now', 'aria-label': 'Dismiss', onclick: () => txPost('/prompt', { id: p.id, action: 'dismiss' }) }, ic('x'))));
    return txCard('fv-tx-prompts fv-pl-flags',
      list.length ? h('header', { class: 'fv-pl-h' }, h('h3', { text: 'For this time of year' })) : null,
      list.length ? h('ul', null, list.map(row)) : null,
      rev.length ? h('div', { class: 'fv-tx-review' }, h('h4', { text: 'Before 5 April, these could save you tax' }), h('ul', null, rev.map(s => h('li', null, h('div', null, h('b', { text: s.title }), h('small', { text: s.text }), s.note ? h('small', { text: s.note }) : null), amt(s.saves > 0.5 ? `saves about ${gbp(s.saves)}` : 'helps next year', 'fv-tx-saves'))))) : null);
  }
