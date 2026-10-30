  // @part 36-plan.js · NEW (2.21) · OWNER: budget plan (the Budgets tab's plan: one calm page)
  // ── Your money plan ───────────────────────────────────────────────────
  // The Budgets tab opens on the plan: what comes in, what is left, what looks off this month, take-home in plain
  // words, every planned item against the bank, what is coming up, What if?, then the quieter things (bills calendar,
  // debts, goals, net worth, the year). The numbers are worked out on the server (GET /api/finance/plan -> {plan, view},
  // lib/finance/money-plan.mjs); this file draws them and sends back whole-plan saves. Every change has Undo.
  // Category spending limits (36-budgets.js) stay, below the plan.
  const MPL = { host: null, plan: null, v: null, err: null, saveErr: null, open: new Set(), per: 'month', edit: null, adding: null, limits: null };

  async function planLoad() {
    try {
      const r = await api('/api/finance/plan');
      if (r.ok && r.body && r.body.view) { planTake(r.body); MPL.err = null; }
      else MPL.err = r.status === 404 ? 'Restart Freeflo to use your money plan.' : ((r.body && r.body.error) || 'Your money plan could not be read.');
    } catch (e) { MPL.err = 'Freeflo isn’t answering. Your plan is safe.'; }
  }
  function planTake(body) {
    MPL.plan = body.plan; MPL.v = body.view;
    R.planBrief = body.view && body.view.has ? body.view.forBrief : null;
    if (typeof MB !== 'undefined') MB.B = null;   // safe to spend and the pay cycle follow the plan (26-money-ui.js)
  }
  /** Save the whole plan; o.say: the toast (with Undo unless quiet). -> true when saved. */
  async function planSave(next, o) {
    o = o || {};
    const before = MPL.plan;
    MPL.saveErr = null;
    try {
      const r = await api('/api/finance/plan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: next }) });
      if (!r.ok || !r.body || !r.body.view) { MPL.saveErr = (r.body && r.body.error) ? r.body.error + '.' : 'That could not be saved.'; if (!o.quiet) toast(MPL.saveErr, { bad: true, action: 'Try again', onAction: () => planSave(next, o) }); return false; }
      planTake(r.body);
      if (!o.quiet) { if (!o.noPaint) planPaint(); toast(o.say || 'Saved', o.noUndo ? { icon: o.icon } : { action: 'Undo', icon: o.icon, onAction: () => planSave(before, { say: 'Put back', noUndo: true }) }); }
      return true;
    } catch (e) {
      MPL.saveErr = 'Freeflo isn’t answering, so that was not saved.';
      if (!o.quiet) toast(MPL.saveErr, { bad: true, action: 'Try again', onAction: () => planSave(next, o) });
      return false;
    }
  }
  const plChange = (fn, say, o) => { const next = pqClone(MPL.plan); fn(next); return planSave(next, Object.assign({ say }, o || {})); };
  const plItem = (plan, id) => plan.items.find(i => i.id === id);

  /* ---------- the section's hooks (36-budgets.js) ---------- */
  function planBuild(g) {
    MPL.host = h('div', { class: 'fv-pl', style: { '--span': 12, '--span-md': 12 } });
    g.append(MPL.host);
    MPW.el = null;
    if (!MPL.v && !MPL.err) planLoad().then(() => { if (R.sectionId === 'budgets') planPaint(); });
  }
  function planUpdate() { planPaint(); }
  function planLimitsOpen() { return MPL.limits == null ? !(MPL.v && MPL.v.has && MPL.v.done) : MPL.limits; }
  function planPaint() {
    const host = MPL.host; if (!host || !host.isConnected) return;
    const keep = MPW.el;
    host.textContent = '';
    if (MPL.err && !MPL.v) { host.append(h('section', { class: 'fv-card fv-pl-invite' }, h('p', { text: MPL.err }), h('button', { type: 'button', class: 'fv-btn', text: 'Try again', onclick: () => { MPL.err = null; planLoad().then(planPaint); } }))); return; }
    if (!MPL.v) { host.append(h('section', { class: 'fv-card fv-pl-invite' }, h('p', { class: 'fv-pl-mute', text: 'Opening your plan…' }))); return; }
    if (MPQ.open) { pqPaint(host); plLimits(false); return; }
    const v = MPL.v;
    if (!v.has || !v.done) host.append(plInvite(v));
    if (v.has && (v.done || v.budget.income > 0 || v.budget.groups.some(g => g.rows.length))) {
      host.append(plHero(v));
      const fl = plFlags(v); if (fl) host.append(fl);
      if (v.calc) host.append(plTake(v));
      host.append(plBudget(v));
      const cu = plComing(v); if (cu) host.append(cu);
      MPW.el = null; host.append(pwSection());
      host.append(plExtras(v));
    }
    plLimits(true);
    void keep;
  }
  /** The category limits below the plan: folded away once there is a plan. */
  function plLimits(show) {
    const items = [S.bBar, S.hero, S.bGrid, S.hist && S.hist.el, S.ed && S.ed.el];
    const open = show && planLimitsOpen();
    for (const el of items) if (el) el.classList.toggle('fv-pl-off', !open);
    if (!S.plBar) return;
    S.plBar.hidden = !show;
    const n = Object.keys(R.budgets || {}).filter(c => R.budgets[c] > 0).length;
    S.plBar.textContent = '';
    S.plBar.append(h('button', { type: 'button', class: 'fv-pl-fold', 'aria-expanded': open ? 'true' : 'false', onclick: () => { MPL.limits = !open; if (!open && R.ctx) UPDATE.budgets(R.ctx); else plLimits(true); } },
      ic(open ? 'chevron-down' : 'chevron-right'), h('b', { text: 'Spending limits by category' }), h('span', { class: 'mute', text: n ? `${n} set` : 'Set a monthly limit on any category' })));
  }

  /* ---------- start ---------- */
  function plInvite(v) {
    const started = v.has;
    return h('section', { class: 'fv-card fv-pl-invite' },
      h('h2', { text: started ? 'Carry on with your money plan' : 'Your money plan' }),
      h('p', { text: started ? 'You stopped part way through. Your answers are saved.' : 'A few easy questions, one at a time. We work out what you take home, build a budget, and check it against your bank. Skip anything you like.' }),
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'button', class: 'fv-btn primary big', onclick: () => pqStart() }, h('span', { text: started ? 'Carry on' : 'Start' }), ic('arrow-right'))));
  }

  /* ---------- the big picture ---------- */
  function plHero(v) {
    const b = v.budget;
    const out = b.groups.reduce((t, g) => t + g.total, 0) + b.aside;
    const seg = (w, cls, label) => (w > 0 ? h('i', { class: cls, style: { flexGrow: String(w) }, title: label }) : null);
    return h('section', { class: 'fv-card fv-pl-hero' },
      h('div', { class: 'fv-pl-hero-top' },
        h('div', null, h('div', { class: 'fv-pl-big' }, amt(gbp(b.left), 'fv-pl-big-v' + (b.left < 0 ? ' neg' : '')), h('span', { text: b.left >= 0 ? 'left over a month' : 'short a month' })),
          h('p', { class: 'fv-pl-say' }, amt(gbp(b.income)), ' comes in. ', amt(gbp(out)), ' is planned to go out.', v.paydays.next[0] ? ` Next payday: ${fd(dnum(v.paydays.next[0].date), { weekday: 'long', day: 'numeric', month: 'long' })}.` : '')),
        h('div', { class: 'fv-pl-acts' }, h('button', { type: 'button', class: 'fv-btn', onclick: () => pqStart('country') }, ic('pencil'), h('span', { text: 'Change my answers' })))),
      h('div', { class: 'fv-pl-split', role: 'img', 'aria-label': 'Where your money goes' },
        b.groups.map(g => seg(g.total, 'g-' + g.id, g.label)), seg(b.aside, 'g-aside', 'Tax to keep aside'), seg(Math.max(0, b.left), 'g-left', 'Left over')),
      h('ul', { class: 'fv-pl-key' }, b.groups.filter(g => g.total > 0).map(g => h('li', null, h('i', { class: 'g-' + g.id }), g.label + ' ', amt(gbp(g.total)))),
        b.aside > 0 ? h('li', null, h('i', { class: 'g-aside' }), 'Tax to keep aside ', amt(gbp(b.aside))) : null,
        b.left > 0 ? h('li', null, h('i', { class: 'g-left' }), 'Left over ', amt(gbp(b.left))) : null));
  }

  /* ---------- worth a look ---------- */
  function plFlags(v) {
    if (!v.flags.length) return null;
    const tone = { bad: 'bad', warn: 'warn', good: 'good', info: 'info' };
    return h('section', { class: 'fv-card fv-pl-flags' }, h('header', { class: 'fv-pl-h' }, h('h3', { text: 'Worth a look' }), h('p', { text: v.cycle.mode === 'cycle' ? 'Your plan against your bank, since payday.' : 'Your plan against your bank, this month.' })),
      h('ul', null, v.flags.map(f => h('li', { class: 'fv-pl-flag ' + (tone[f.tone] || 'info') },
        ic(f.tone === 'bad' ? 'circle-alert' : f.tone === 'warn' ? 'triangle-alert' : f.tone === 'good' ? 'circle-check' : 'info'),
        h('div', { class: 'fv-pl-flag-m' }, h('b', { class: 'fv-amt', text: f.title }, ' ', txAsk(f.title, '', 'money plan')), h('span', { class: 'fv-amt', text: f.text }), f.why && f.why.length ? h('details', { class: 'fv-pl-why' }, h('summary', { text: 'What could cause this?' }), h('ul', null, f.why.map(w => h('li', { text: w })))) : null),
        h('button', { type: 'button', class: 'fv-btn ghost', title: 'Stop showing this', 'aria-label': 'Stop showing this', onclick: () => plChange(p => { p.dismissed = p.dismissed || {}; p.dismissed[f.id] = v.today; }, 'Hidden') }, ic('x'))))));
  }

  /* ---------- take-home ---------- */
  function plTake(v) {
    const c = v.calc;
    const per = c.steps[MPL.per] && c.steps[MPL.per].length ? MPL.per : 'month';
    const fmtv = per === 'payslip' ? gbp2 : gbp;
    const s = seg([['year', 'A year'], ['month', 'A month']].concat(c.steps.payslip.length ? [['payslip', 'A payslip']] : []), per, x => { MPL.per = x; planPaint(); }, 'Show amounts for');
    s.set(per);
    const rows = c.steps[per].map(r => h('div', { class: 'fv-pl-step' + (r.total ? ' total' : '') + (r.k === 'aside' ? ' aside' : '') },
      h('span', null, r.label, r.help ? h('small', { text: r.help }) : null),
      h('span', { class: 'fv-pl-step-v' }, amt((r.amount < 0 ? '−' : '') + fmtv(Math.abs(r.amount)), 'v'), txAsk(r.label, '', 'money plan')))).concat([]);
    const kids = [h('header', { class: 'fv-pl-h row' }, h('div', null, h('h3', { text: 'What you take home' }), h('p', { text: c.kind === 'estimate' ? `An estimate for the ${c.yearLabel} tax year, using official ${c.regionName} rates. Your payslip has the final word.` : 'From what you told us.' })), s.el), h('div', { class: 'fv-pl-steps' }, rows)];
    if (c.code) kids.push(h('p', { class: 'fv-pl-code' }, h('b', { text: `Your tax code: ${c.code.text}. ` }), h('span', { class: 'fv-amt', text: c.code.label + '. ' }), h('button', { type: 'button', class: 'fv-link', text: c.code.given ? 'Change it' : 'Use the one on my payslip', onclick: () => pqStart('taxcode') })));
    const jobs = Object.entries(c.jobs || {});
    if (jobs.length > 1) kids.push(h('div', { class: 'fv-pl-jobs' }, jobs.map(([id, j]) => h('div', { class: 'fv-pl-job' }, h('b', { text: j.name || 'Your job' }), h('span', { class: 'fv-amt', text: `${j.codeText}: ${j.codeLabel}` }), j.payslip ? h('span', null, amt(gbp(j.payslip.takeHome)), ` each payday. Tax ${''}`, amt(gbp(j.payslip.tax)), ', National Insurance ', amt(gbp(j.payslip.ni)), j.payslip.loans ? ', loan ' : '', j.payslip.loans ? amt(gbp(j.payslip.loans)) : '', '.') : null))));
    for (const w of c.warnings || []) kids.push(h('p', { class: 'fv-pl-note ' + w.level }, ic(w.level === 'warn' ? 'triangle-alert' : 'info'), h('span', { text: w.text })));
    for (const n of c.notes || []) kids.push(h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { class: 'fv-amt', text: n })));
    if (c.stillToPay > 0.5) kids.push(h('p', { class: 'fv-pl-note warn' }, ic('triangle-alert'), h('span', null, 'No tax is taken from some of your income before it reaches you. About ', amt(gbp(c.stillToPay)), ' is still to pay for this tax year. Your plan keeps ', amt(gbp(v.budget.aside)), ' a month aside for it. '), h('button', { type: 'button', class: 'fv-link', text: 'See your tax', onclick: () => setSection('tax') })));
    if (c.soFar) kids.push(plSoFar(c));
    return h('section', { class: 'fv-card fv-pl-take' }, kids);
  }
  function plSoFar(c) {
    const t = c.soFar;
    const rows = [['Pay so far', t.pay], ['Tax taken', t.tax], ['National Insurance', t.ni]].concat(t.loans ? [['Student loan', t.loans]] : []).concat([['Reached your bank', t.takeHome]]);
    const d = plDisclosure('sofar', 'So far this tax year', `${t.periods} of ${t.ofYear} paydays`,
      h('div', { class: 'fv-pl-mini' }, rows.map(([l, a]) => h('div', null, h('span', { text: l }), amt(gbp(a), 'v')))),
      h('p', { class: 'fv-pl-mute' }, 'Tax-free amount used so far: ', amt(gbp(t.allowanceUsed)), ' of ', amt(gbp(t.allowanceYear)), '. PAYE, the way your employer takes tax, spreads it evenly over the year, so a bonus, a new job or a change of pay evens out on later paydays.'),
      t.nextDate ? h('p', { class: 'fv-pl-mute' }, `Next payday, ${fd(dnum(t.nextDate), { weekday: 'long', day: 'numeric', month: 'long' })}: about `, amt(gbp(t.expectedNext)), '.') : null);
    return d;
  }
  function plDisclosure(id, title, sub, ...kids) {
    const d = h('details', { class: 'fv-pl-more' }, h('summary', null, h('b', { text: title }), sub ? h('span', { class: 'mute fv-amt', text: sub }) : null), h('div', { class: 'fv-pl-more-b' }, kids));
    d.open = MPL.open.has(id);
    d.addEventListener('toggle', () => { if (d.open) MPL.open.add(id); else MPL.open.delete(id); });
    return d;
  }

  /* ---------- the plan against the bank ---------- */
  const PL_STATUS = { paid: ['Paid', 'good', 'circle-check'], coming: ['Coming up', 'sched', 'calendar-check'], due: ['Due now', 'sched', 'clock'], late: ['Not seen yet', 'warn', 'triangle-alert'], unmatched: ['Not matched yet', 'none', 'link'], ok: ['On track', 'good', 'circle-check'], over: ['Over', 'bad', 'circle-alert'] };
  function plAmountInput(val, label, onCommit) {
    const n = h('input', { type: 'text', inputmode: 'decimal', class: 'fv-input fv-pl-amt fv-amt', 'aria-label': label });
    n.value = val != null ? String(val) : '';
    n.addEventListener('change', () => { const raw = n.value.replace(/[£$€,\s]/g, ''); const x = raw === '' ? null : Number(raw); if (x != null && (!isFinite(x) || x < 0)) { n.classList.add('bad'); return; } n.classList.remove('bad'); onCommit(x); });
    n.addEventListener('keydown', e => { if (e.key === 'Enter') n.blur(); });
    return h('span', { class: 'fv-plq-unit' }, h('i', { text: SYM }), n);
  }
  function plBudget(v) {
    const b = v.budget;
    const inRows = b.incomeRows.map(r => plRow(r, v));
    const body = [h('div', { class: 'fv-pl-group in' }, h('div', { class: 'fv-pl-group-h' }, h('b', { text: 'Coming in' }), amt(gbp(b.income), 'v'), plAddBtn('income', 'Add money in')), inRows.length ? inRows : h('p', { class: 'fv-pl-mute', text: 'Nothing yet.' }), plAddForm('income'))];
    for (const g of b.groups) {
      const grp = h('div', { class: 'fv-pl-group', 'data-g': g.id }, h('div', { class: 'fv-pl-group-h' }, h('b', { text: g.label }), amt(gbp(g.total), 'v'), plAddBtn(g.id, { bills: 'Add a bill', everyday: 'Add', savings: 'Add a goal', debts: 'Add a debt' }[g.id])), g.rows.length ? g.rows.map(r => plRow(r, v)) : h('p', { class: 'fv-pl-mute fv-amt', text: { bills: 'No bills yet.', everyday: 'Nothing planned yet.', savings: b.suggestedSaving ? `You could put aside about ${gbp(b.suggestedSaving)} a month: half of what is left.` : 'Nothing set aside yet.', debts: 'No debts. Nice.' }[g.id] }), g.id === 'everyday' ? plEverydayHelp(v, g) : null, plAddForm(g.id));
      // Drag a row to another group (bills, everyday): the phone's way is the row's own panel.
      grp.addEventListener('dragover', e => { if (e.dataTransfer && e.dataTransfer.types.includes('text/x-plan-row') && (g.id === 'bills' || g.id === 'everyday')) { e.preventDefault(); grp.classList.add('drop'); } });
      grp.addEventListener('dragleave', () => grp.classList.remove('drop'));
      grp.addEventListener('drop', e => { grp.classList.remove('drop'); const id = e.dataTransfer && e.dataTransfer.getData('text/x-plan-row'); if (id) plMoveTo(id, g.id); });
      body.push(grp);
    }
    if (b.aside > 0) body.push(h('div', { class: 'fv-pl-group' }, h('div', { class: 'fv-pl-group-h' }, h('b', { text: 'Tax to keep aside' }), amt(gbp(b.aside), 'v')), h('p', { class: 'fv-pl-mute', text: 'For tax still to pay on money with no tax taken.' })));
    body.push(h('div', { class: 'fv-pl-leftline' + (b.left < 0 ? ' neg' : '') }, h('b', { text: 'Left over a month' }), amt(gbp(b.left), 'v')));
    return h('section', { class: 'fv-card fv-pl-plan' }, h('header', { class: 'fv-pl-h' }, h('h3', { text: 'Your plan' }), h('p', { text: `Amounts are a month. “So far” is ${v.cycle.mode === 'cycle' ? 'since payday' : 'this month'}. Tap any row to change it.` })), body);
  }
  // A sensible start: what you usually spend, one click; and the plan's Everyday as category limits.
  function plEverydayHelp(v, g) {
    const kids = [];
    const s = v.budget.suggestEveryday || [];
    if (s.length) kids.push(h('button', { type: 'button', class: 'fv-link', onclick: () => plChange(p => { for (const x of s) p.items.push({ id: x.type, kind: 'everyday', type: x.type, name: x.label, amount: x.amount, per: 'month', status: 'now' }); }, 'Added what you usually spend') }, 'Add what you usually spend: ', amt(s.map(x => `${x.label} ${gbp(x.amount)}`).join(', '))));
    const withCat = g.rows.filter(r => r.link && r.link.c && r.amount > 0 && r.state === 'active' && !((R.budgets || {})[r.link.c] > 0));
    if (withCat.length) kids.push(h('button', { type: 'button', class: 'fv-link', onclick: () => plUseLimits(withCat) }, `Warn me if I go over these (${withCat.length})`));
    return kids.length ? h('div', { class: 'fv-pl-help' }, kids) : null;
  }
  async function plUseLimits(rows) {
    const was = cleanBudgets(R.budgets || {}), next = Object.assign({}, was);
    for (const r of rows) next[r.link.c] = round2(r.monthly);
    const put = async (b, base) => { const res = await api('/api/finance/budgets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ budgets: b, base }) }); if (res.ok && res.body && res.body.budgets) { R.budgets = cleanBudgets(res.body.budgets); if (R.sectionId === 'budgets' && R.ctx) UPDATE.budgets(R.ctx); return true; } toast('Those limits could not be saved. Try again in a moment.', { bad: true }); return false; };
    try { if (await put(next, was)) toast('Spending limits set', { action: 'Undo', onAction: () => put(was, next).catch(() => {}) }); }
    catch (e) { toast('Freeflo isn’t answering, so those limits were not saved.', { bad: true }); }
  }
  function plMoveTo(id, g) {
    const kind = g === 'bills' ? 'bill' : 'everyday';
    plChange(p => { const it = plItem(p, id); if (it && (it.kind === 'bill' || it.kind === 'everyday')) it.kind = kind; }, g === 'bills' ? 'Moved to Bills' : 'Moved to Everyday');
  }
  function plAddBtn(group, label) {
    return h('button', { type: 'button', class: 'fv-btn ghost fv-pl-add', onclick: () => { MPL.adding = MPL.adding === group ? null : group; planPaint(); const inp = MPL.host.querySelector('.fv-pl-addf input'); if (inp) inp.focus(); } }, ic('plus'), h('span', { text: label }));
  }
  function plAddForm(group) {
    if (MPL.adding !== group) return null;
    const name = h('input', { type: 'text', class: 'fv-input', placeholder: { income: 'For example, side income', bills: 'For example, car insurance', everyday: 'For example, eating out', savings: 'For example, a holiday', debts: 'For example, credit card' }[group], maxlength: '60', 'aria-label': 'Name' });
    const amount = h('input', { type: 'text', inputmode: 'decimal', class: 'fv-input fv-pl-amt', placeholder: group === 'savings' ? 'Target' : group === 'debts' ? 'Owed now' : 'A month', 'aria-label': 'Amount' });
    const later = h('input', { type: 'date', class: 'fv-input', 'aria-label': 'Starts on (leave empty for now)' });
    const go = () => {
      const a = Number(amount.value.replace(/[£$€,\s]/g, ''));
      const nm = name.value.trim();
      if (!nm) { name.focus(); name.classList.add('bad'); return; }
      const base = { id: PL_NEW_ID(group), name: nm, status: later.value ? 'later' : 'now' };
      if (later.value) base.starts = later.value;
      const it = group === 'income' ? { ...base, kind: 'income', incomeType: 'side', amount: isFinite(a) ? a : 0, per: 'month' }
        : group === 'bills' ? { ...base, kind: 'bill', amount: isFinite(a) ? a : 0, per: 'month', when: { t: 'day', day: 1, adjust: 'next' } }
          : group === 'everyday' ? { ...base, kind: 'everyday', amount: isFinite(a) ? a : 0, per: 'month' }
            : group === 'savings' ? { ...base, kind: 'saving', target: isFinite(a) ? a : 0 } : { ...base, kind: 'debt', balance: isFinite(a) ? a : 0 };
      MPL.adding = null;
      plChange(p => { p.items.push(it); }, `Added ${nm}`);
    };
    for (const el of [name, amount, later]) el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } if (e.key === 'Escape') { MPL.adding = null; planPaint(); } });
    return h('div', { class: 'fv-pl-addf' }, name, amount, h('label', { class: 'fv-pl-startl' }, h('span', { text: 'Starts on (optional)' }), later), h('button', { type: 'button', class: 'fv-btn primary', text: 'Add', onclick: go }), h('button', { type: 'button', class: 'fv-btn ghost', text: 'Cancel', onclick: () => { MPL.adding = null; planPaint(); } }));
  }
  function plRowSub(r) {
    const bits = [];
    if (r.state === 'future') bits.push(r.starts ? `Starts ${fDayY(dnum(r.starts))}` : 'Starts later');
    else if (r.state === 'paused') bits.push('Paused');
    else if (r.state === 'ended') bits.push(`Ended ${fDayY(dnum(r.ends))}`);
    else if (r.next && r.next[0]) bits.push(`Next ${fd(dnum(r.next[0].date), { weekday: 'short', day: 'numeric', month: 'short' })}`);
    if (r.ends && r.state === 'active') bits.push(`until ${fDayY(dnum(r.ends))}`);
    if (!bdHidden() && r.amount != null && r.per && r.per !== 'month' && r.per !== 'total') bits.push(`${gbp(r.amount)} ${{ week: 'a week', fortnight: 'a fortnight', '4weeks': 'every 4 weeks', quarter: 'a quarter', year: 'a year' }[r.per] || ''}`);
    if (r.incomeType === 'self') bits.push('no tax taken');
    if (r.codeText) bits.push(`tax code ${r.codeText}`);
    if (r.linkLabel) bits.push(r.link && r.link.m ? `matched to ${r.linkLabel}` : `from ${r.linkLabel}`);
    if (r.splitWith) bits.push(`split with ${r.splitWith}`);
    return bits.join(' · ');
  }
  function plRow(r, v) {
    const st = PL_STATUS[r.statusKey];
    const monthlyAmount = !r.per || r.per === 'month';
    const editable = monthlyAmount && (r.kind === 'bill' || r.kind === 'everyday' || (r.kind === 'income' && r.incomeType !== 'job'));
    const isOpen = MPL.edit === r.id;
    const planned = r.kind === 'income' && r.incomeType === 'job' ? amt(gbp(r.monthly), 'fv-pl-planned')
      : editable ? plAmountInput(r.amount, `Amount for ${r.name}`, x => plChange(p => { const it = plItem(p, r.id); if (it) { if (x == null) delete it.amount; else it.amount = x; } }, 'Saved'))
        : amt(gbp(r.monthly), 'fv-pl-planned');
    const el = h('div', { class: 'fv-pl-row' + (r.state !== 'active' ? ' dim' : '') + (isOpen ? ' open' : ''), draggable: r.kind === 'bill' || r.kind === 'everyday' ? 'true' : null, 'data-id': r.id },
      h('button', { type: 'button', class: 'fv-pl-row-main', 'aria-expanded': isOpen ? 'true' : 'false', onclick: () => { MPL.edit = isOpen ? null : r.id; planPaint(); } },
        h('b', { text: r.name }), h('span', { class: 'fv-pl-row-sub', text: plRowSub(r) })),
      h('div', { class: 'fv-pl-row-n' }, planned, r.actual != null && r.state === 'active' ? h('span', { class: 'fv-pl-row-act' }, 'so far ', amt(gbp(r.actual))) : null),
      st ? h('span', { class: 'fv-bst ' + st[1] }, ic(st[2]), st[0]) : h('span', { class: 'fv-pl-row-gap' }),
      h('button', { type: 'button', class: 'fv-btn ghost fv-pl-row-x', 'aria-label': (isOpen ? 'Close ' : 'Open ') + r.name, onclick: () => { MPL.edit = isOpen ? null : r.id; planPaint(); } }, ic(isOpen ? 'chevron-down' : 'chevron-right')));
    if (el.draggable) el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/x-plan-row', r.id); e.dataTransfer.effectAllowed = 'move'; });
    return isOpen ? [el, plRowPanel(r, v)] : el;
  }
  function plRowPanel(r, v) {
    const dateF = (label, key) => {
      const d = h('input', { type: 'date', class: 'fv-input' });
      if (r[key]) d.value = r[key];
      d.addEventListener('change', () => plChange(p => {
        const it = plItem(p, r.id); if (!it) return;
        if (d.value) it[key] = d.value; else delete it[key];
        if (key === 'starts') it.status = d.value ? (d.value > v.today ? 'later' : 'now') : 'now';
      }, 'Saved'));
      return h('label', { class: 'fv-pl-pf' }, h('span', { text: label }), d);
    };
    const kids = [];
    const nameIn = h('input', { type: 'text', class: 'fv-input', maxlength: '60', 'aria-label': 'Name' });
    nameIn.value = r.name;
    nameIn.addEventListener('change', () => { const t = nameIn.value.trim(); if (t) plChange(p => { const it = plItem(p, r.id); if (it) it.name = t; }, 'Saved'); });
    kids.push(h('label', { class: 'fv-pl-pf' }, h('span', { text: 'Name' }), nameIn), dateF('Starts on', 'starts'), dateF('Ends on', 'ends'));
    if (r.kind === 'debt') {
      for (const [k, l] of [['balance', 'Owed now'], ['minimum', 'Least you pay a month']]) kids.push(h('label', { class: 'fv-pl-pf' }, h('span', { text: l }), plAmountInput(r[k], l, x => plChange(p => { const it = plItem(p, r.id); if (it) { if (x == null) delete it[k]; else it[k] = x; } }, 'Saved'))));
      const apr = h('input', { type: 'text', inputmode: 'decimal', class: 'fv-input fv-pl-amt fv-amt', 'aria-label': 'Yearly interest %' });
      apr.value = r.apr != null ? String(r.apr) : '';
      apr.addEventListener('change', () => { const x = Number(apr.value); if (isFinite(x) && x >= 0 && x <= 100) plChange(p => { const it = plItem(p, r.id); if (it) it.apr = x; }, 'Saved'); });
      kids.push(h('label', { class: 'fv-pl-pf' }, h('span', { text: 'Yearly interest (APR %)' }), apr));
    }
    if (r.kind === 'saving') {
      kids.push(h('label', { class: 'fv-pl-pf' }, h('span', { text: 'Target' }), plAmountInput(r.target, 'Target', x => plChange(p => { const it = plItem(p, r.id); if (it) it.target = x || 0; }, 'Saved'))));
      kids.push(h('label', { class: 'fv-pl-pf' }, h('span', { text: 'Saved so far' }), plAmountInput(r.saved, 'Saved so far', x => plChange(p => { const it = plItem(p, r.id); if (it) it.saved = x || 0; }, 'Saved'))));
      const by = h('input', { type: 'date', class: 'fv-input' }); if (r.by) by.value = r.by;
      by.addEventListener('change', () => plChange(p => { const it = plItem(p, r.id); if (it) { if (by.value) it.by = by.value; else delete it.by; } }, 'Saved'));
      kids.push(h('label', { class: 'fv-pl-pf' }, h('span', { text: 'By' }), by));
    }
    if (r.per !== 'total' && (r.kind === 'bill' || r.kind === 'everyday' || r.kind === 'fund' || (r.kind === 'income' && r.incomeType !== 'job'))) {
      kids.push(h('label', { class: 'fv-pl-pf' }, h('span', { text: 'How much' }), plAmountInput(r.amount, `How much for ${r.name}`, x => plChange(p => { const it = plItem(p, r.id); if (it) { if (x == null) delete it.amount; else it.amount = x; } }, 'Saved'))));
      const per = h('select', { class: 'fv-input', 'aria-label': 'How often' }, [['month', 'A month'], ['4weeks', 'Every 4 weeks'], ['fortnight', 'A fortnight'], ['week', 'A week'], ['quarter', 'A quarter'], ['year', 'A year']].map(([x, l]) => h('option', { value: x, text: l })));
      per.value = r.per || (r.kind === 'fund' ? 'year' : 'month');
      per.addEventListener('change', () => plChange(p => { const it = plItem(p, r.id); if (it) it.per = per.value; }, 'Saved'));
      kids.push(h('label', { class: 'fv-pl-pf' }, h('span', { text: 'How often' }), per));
    }
    if (r.per === 'total') kids.push(h('label', { class: 'fv-pl-pf' }, h('span', { text: 'Money in, total' }), plAmountInput(r.amount, 'Money in, total', x => plChange(p => { const it = plItem(p, r.id); if (it) it.amount = x || 0; }, 'Saved'))));
    if (r.kind === 'income' && r.incomeType === 'job') kids.push(h('button', { type: 'button', class: 'fv-btn', onclick: () => pqStart(r.main ? 'salary' : 'jobs') }, ic('pencil'), h('span', { text: r.main ? 'Change my pay' : 'Change this job' })));
    if (r.kind === 'bill' || r.kind === 'everyday') {
      // Names here make it a split that repeats (Owed to me): each time it leaves the bank, they owe you their share.
      const sw = h('input', { type: 'text', class: 'fv-input', maxlength: '120', placeholder: 'For example, Sam and Alex', 'aria-label': `Who you split ${r.name} with` });
      sw.value = r.splitWith || '';
      sw.addEventListener('change', () => {
        const t = sw.value.trim();
        plChange(p => { const it = plItem(p, r.id); if (it) { if (t) it.splitWith = t; else delete it.splitWith; } }, t ? `Each time it leaves the bank, ${r.name} splits with ${t}` : 'Saved');
        setTimeout(() => { if (window.Owed && window.Owed.planChanged) window.Owed.planChanged(); }, 700);
      });
      kids.push(h('label', { class: 'fv-pl-pf' }, h('span', { text: 'Split with (optional)' }), sw));
    }
    const panel = h('div', { class: 'fv-pl-panel' }, h('div', { class: 'fv-pl-pgrid' }, kids));
    // When.
    if (r.kind !== 'saving' && r.kind !== 'everyday') {
      panel.append(h('div', { class: 'fv-pl-pwhen' }, h('b', { text: r.kind === 'income' ? 'When it arrives' : 'When it goes out' }), r.ruleAuto ? h('span', { class: 'mute', text: ' (from your bank)' }) : null,
        plRuleEditor(r.rule, x => { clearTimeout(plRowTimer); plRowTimer = setTimeout(() => plChange(p => { const it = plItem(p, r.id); if (it) it.when = x; }, 'Saved', { noPaint: true }), 500); }, { kind: r.kind === 'income' ? 'pay' : 'bill', showNext: true }),
        h('label', { class: 'fv-pl-pf tol' }, h('span', { text: 'Allow this many days either side before we say it is late' }), plTolInput(r))));
    }
    // Which payment it is.
    const ch = v.choices || {};
    if (r.kind !== 'saving') {
      const opts = [h('option', { value: '', text: r.link ? 'Not matched' : 'Choose a payment' })];
      const pays = r.kind === 'income' ? ch.payers || [] : ch.payments || [];
      if (pays.length) opts.push(h('optgroup', { label: r.kind === 'income' ? 'Who pays you' : 'Regular payments' }, pays.map(x => h('option', { value: 'm:' + x.m, text: bdHidden() ? x.m : `${x.m} (about ${gbp(x.amount)})` }))));
      if (r.kind !== 'income' && (ch.categories || []).length) opts.push(h('optgroup', { label: 'A whole category' }, ch.categories.map(c => h('option', { value: 'c:' + c, text: c }))));
      const sel = h('select', { class: 'fv-input', 'aria-label': `Match ${r.name} to a payment` }, opts);
      sel.value = r.link ? (r.link.m ? 'm:' + r.link.m : 'c:' + r.link.c) : '';
      sel.addEventListener('change', () => plChange(p => {
        const it = plItem(p, r.id); if (!it) return;
        const was = r.link && r.link.m;
        delete it.link;
        if (sel.value.startsWith('m:')) it.link = { m: sel.value.slice(2) };
        else if (sel.value.startsWith('c:')) it.link = { c: sel.value.slice(2) };
        else if (was) it.notM = [...new Set([...(it.notM || []), was])];
      }, 'We’ll remember that'));
      panel.append(h('label', { class: 'fv-pl-pf match' }, h('span', { text: r.link && r.link.by === 'guess' ? 'We matched this by name, amount and date. Is it right?' : 'Matched to' }), sel));
    }
    panel.append(h('div', { class: 'fv-pl-pacts' },
      r.kind === 'bill' || r.kind === 'everyday' ? h('button', { type: 'button', class: 'fv-btn ghost', onclick: () => plMoveTo(r.id, r.kind === 'bill' ? 'everyday' : 'bills') }, h('span', { text: r.kind === 'bill' ? 'Move to Everyday' : 'Move to Bills' })) : null,
      h('span', { class: 'fv-grow' }),
      h('button', { type: 'button', class: 'fv-btn', onclick: () => plChange(p => { const it = plItem(p, r.id); if (it) { if (r.paused) delete it.paused; else it.paused = true; } }, r.paused ? `${r.name} is back on` : `${r.name} paused`) }, ic(r.paused ? 'play' : 'pause'), h('span', { text: r.paused ? 'Carry on' : 'Pause' })),
      r.main ? null : h('button', { type: 'button', class: 'fv-btn', onclick: () => { MPL.edit = null; plChange(p => { p.items = p.items.filter(i => i.id !== r.id); }, `${r.name} removed`); } }, ic('trash-2'), h('span', { text: 'Remove' }))));
    return panel;
  }
  let plRowTimer = 0;
  function plTolInput(r) {
    const n = h('input', { type: 'number', min: '0', max: '15', class: 'fv-input fv-plr-day', 'aria-label': 'Days either side' });
    n.value = String(r.tol != null ? r.tol : 4);
    n.addEventListener('change', () => { const x = clamp(Math.floor(Number(n.value) || 0), 0, 15); plChange(p => { const it = plItem(p, r.id); if (it) it.tol = x; }, 'Saved'); });
    return n;
  }

  /* ---------- coming up ---------- */
  function plComing(v) {
    if (!v.comingUp.length) return null;
    const row = x => h('li', null,
      h('div', null, h('b', { text: x.name }), h('span', { class: 'mute' }, x.from ? ' from ' + fd(dnum(x.from), { day: 'numeric', month: 'long', year: 'numeric' }) : ' from a date you choose', x.amount ? ' · ' : '', x.amount ? amt(gbp(x.amount)) : '', x.amount ? ' a month' : '')),
      x.leftAfter != null
        ? h('p', { class: 'fv-pl-mute' }, 'From ' + fd(dnum(x.from), { month: 'long' }) + ' you would have ', amt(gbp(x.leftAfter), x.leftAfter < 0 ? 'neg' : ''), x.leftAfter < 0 ? ' short a month.' : ' left a month.')
        : h('p', { class: 'fv-pl-mute' }, h('button', { type: 'button', class: 'fv-link', text: 'Add a date', onclick: () => { MPL.edit = x.id; planPaint(); } })));
    return h('section', { class: 'fv-card fv-pl-coming' },
      h('header', { class: 'fv-pl-h' }, h('h3', { text: 'Coming up' }), h('p', { text: 'Not counted yet. Nothing here is flagged as missing until it starts.' })),
      h('ul', null, v.comingUp.map(row)));
  }

  /* ---------- the quieter things ---------- */
  function plExtras(v) {
    const wrap = h('section', { class: 'fv-card fv-pl-extras' });
    const add = (id, title, sub, ...kids) => wrap.append(plDisclosure(id, title, sub, ...kids));
    // The bills calendar.
    const cal = v.calendar;
    add('calendar', `${fd(dnum(cal.month), { month: 'long' })}’s bills`, `${gbp(cal.still)} still to go`,
      cal.rows.length ? h('ul', { class: 'fv-pl-cal' }, cal.rows.map(x => h('li', { class: x.state === 'late' ? 'late' : x.state === 'paid' ? 'paid' : '' },
        h('span', { class: 'd', text: fd(dnum(x.date), { weekday: 'short', day: 'numeric' }) }), h('span', { class: 'n' }, x.name, x.moved && x.why ? h('small', { text: ` moved for ${x.why}` }) : null), h('span', { class: 's', text: x.state === 'paid' ? 'Paid' : x.state === 'late' ? 'Not seen yet' : '' }),
        amt((x.kind === 'income' ? '+' : '') + gbp(x.amount), 'v' + (x.kind === 'income' ? ' in' : ''))))) : h('p', { class: 'fv-pl-mute', text: 'No dates this month yet. Give a bill a date and it shows here.' }),
      h('p', { class: 'fv-pl-mute' }, 'After all this month’s bills: ', amt(gbp(cal.leftAfter)), ' left.'));
    // Debts.
    if (v.debts) add('debts', 'Your debts', `${gbp(v.debts.total)} owed`, plDebts(v.debts));
    // Goals and yearly bills.
    if (v.goals.length || v.funds.length) add('goals', 'Goals and yearly bills', null,
      v.goals.map(g => h('div', { class: 'fv-pl-goal' }, h('div', { class: 'fv-pl-goal-h' }, h('b', { text: g.name }), amt(`${gbp(g.saved)} of ${gbp(g.target)}`)), h('div', { class: 'fv-pl-bar' }, h('i', { style: { width: (g.frac * 100).toFixed(1) + '%' } })),
        g.perMonth != null ? h('p', { class: 'fv-pl-mute' }, 'That takes ', amt(gbp(g.perMonth)), ` a month to reach by ${fDayY(dnum(g.by))}.`) : h('p', { class: 'fv-pl-mute', text: 'Give it a date and we will say how much a month it takes.' }))),
      v.funds.map(f => h('div', { class: 'fv-pl-goal' }, h('div', { class: 'fv-pl-goal-h' }, h('b', { text: f.name }), amt(`${gbp(f.perMonth)} a month`)), f.nextDate ? h('p', { class: 'fv-pl-mute' }, `Next due ${fDayY(dnum(f.nextDate))}: `, amt(gbp(f.amount)), '. By now you would want about ', amt(gbp(f.shouldHave)), ' put by.') : null)));
    // Net worth.
    const nw = v.netWorth;
    add('networth', 'What you own and owe', null,
      h('div', { class: 'fv-pl-big small' }, amt(gbp(nw.total), 'fv-pl-big-v' + (nw.total < 0 ? ' neg' : '')), h('span', { text: 'net worth' })),
      nw.series.length > 2 ? h('div', { class: 'fv-pl-spark', html: sparkSvg(nw.series, 'var(--accent)', { w: 240, h: 44 }) }) : null,
      h('div', { class: 'fv-pl-mini' }, h('div', null, h('span', { text: 'In your accounts' }), amt(gbp(nw.accounts), 'v')), nw.assets.map(a => h('div', null, h('span', { text: a.name }), amt(gbp(a.amount), 'v'))), h('div', null, h('span', { text: 'What you owe' }), amt('−' + gbp(nw.owed), 'v'))),
      h('button', { type: 'button', class: 'fv-link', text: 'Add savings, an ISA or a pension pot', onclick: () => pqStart('assets') }));
    // The year.
    const an = v.annual;
    const top = Math.max(1, ...an.months.map(m => Math.max(m.income, m.spent)));
    add('year', 'Your year', an.full ? `${gbp(an.yearIn)} in, ${gbp(an.yearOut)} out` : null,
      h('table', { class: 'fv-pl-year' }, h('thead', null, h('tr', null, h('th', { text: 'Month' }), h('th', { class: 'r', text: 'In' }), h('th', { class: 'r', text: 'Out' }), h('th', { class: 'r', text: 'Left' }), h('th', { class: 'bars', 'aria-hidden': 'true' }))),
        h('tbody', null, an.months.map(m => h('tr', { class: m.part ? 'part' : '' }, h('td', { text: fd(dnum(m.month), { month: 'short', year: '2-digit' }) + (m.part ? ' so far' : '') }), h('td', { class: 'r' }, amt(gbp(m.income))), h('td', { class: 'r' }, amt(gbp(m.spent))), h('td', { class: 'r' }, amt(gbp(m.income - m.spent))),
          h('td', { class: 'bars', 'aria-hidden': 'true' }, h('i', { class: 'in', style: { width: (m.income / top * 100).toFixed(1) + '%' } }), h('i', { class: 'out', style: { width: (m.spent / top * 100).toFixed(1) + '%' } })))))),
      h('p', { class: 'fv-pl-mute' }, 'Your plan expects ', amt(gbp(an.plannedIn)), ' in and ', amt(gbp(an.plannedOut)), ' out a month.'));
    // End of the tax year.
    if (v.checks.length) add('checks', 'Things to check before 5 April', null, h('ul', { class: 'fv-pl-checks' }, v.checks.map(c => h('li', { class: c.soon ? 'soon' : '' }, ic(c.soon ? 'calendar-clock' : 'circle-check'), h('span', { text: c.text })))));
    return wrap;
  }
  function plDebts(d) {
    const sel = MPL.debtExtra != null ? MPL.debtExtra : 2;
    const e = d.extras[sel] || d.extras[0];
    const mon = iso => (iso ? fd(dnum(iso + '-01'), { month: 'long', year: 'numeric' }) : 'never, at this rate');
    const box = h('div', null,
      h('ul', { class: 'fv-pl-debts' }, d.rows.map(r => h('li', null, h('div', null, h('b', { text: r.name }), h('span', { class: 'mute' }, ' ', amt(gbp(r.balance)), r.apr ? ` at ${r.apr}%` : '')), h('div', { class: 'fv-pl-mute' }, 'Interest about ', amt(gbp2(r.monthlyInterest)), ' a month. Paid off by ', amt(r.stuck ? 'never: the payment does not cover the interest' : mon(r.payoff)), '.')))),
      h('p', null, 'All together, interest costs you about ', amt(gbp(d.monthlyInterest)), ' a month. At what you pay now you are debt-free by ', amt(d.base.stuck ? 'never' : mon(d.base.date)), '.'));
    const pick = h('select', { class: 'fv-input', 'aria-label': 'How much more a month' }, d.extras.map((x, i) => h('option', { value: String(i), text: gbp(x.extra) })));
    pick.value = String(sel);
    pick.addEventListener('change', () => { MPL.debtExtra = Number(pick.value); planPaint(); });
    box.append(...[h('div', { class: 'fv-pl-more-q' }, h('span', { text: 'If you paid ' }), pick, h('span', { text: ' more a month:' })),
      e.sooner != null ? h('p', null, h('b', { class: 'fv-amt', text: e.sooner > 0 ? `Debt-free ${e.sooner} month${e.sooner === 1 ? '' : 's'} sooner.` : 'About the same date.' })) : null,
      d.rows.length < 2 ? null : h('div', { class: 'fv-pl-compare' },
        h('div', null, h('b', { text: 'Highest interest first' }), h('span', { class: 'mute', text: 'Costs the least.' }), h('span', null, 'Done by ', amt(mon(e.avalanche.date))), h('span', null, 'Interest ', amt(gbp(e.avalanche.interest)))),
        h('div', null, h('b', { text: 'Smallest debt first' }), h('span', { class: 'mute', text: 'Quick wins keep you going.' }), h('span', null, 'Done by ', amt(mon(e.snowball.date))), h('span', null, 'Interest ', amt(gbp(e.snowball.interest)))))].filter(Boolean));
    return box;
  }
