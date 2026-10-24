/* ============================================================
   EXPENSES, the page (Money > Expenses, #view=expenses) and its dialogs. Owner: Expenses (2.18.1).
   Template: UX_BLUEPRINT.md section 3. One primary action (Add an expense), everything else in More.
   Sections: To claim, Submitted (by claim), Paid. Status first, then the next step.
   ============================================================ */
function _xe(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
const XP_STATUS = { 'to-claim': ['To claim', 'clock'], submitted: ['Submitted', 'send'], paid: ['Paid', 'circle-check'] };

/* ---------- the page ---------- */
registerPage({
  id: 'expenses', view: 'expenses', match: v => v === 'expenses', label: 'Expenses', icon: 'receipt', area: 'money', tab: true, order: 20, since: '2.18',
  desc: 'What you are owed back, receipts and claims', keywords: 'expenses expense claim reimburse receipt owed paid back employer client mileage',
  available: () => !(APP_CONFIG.features && APP_CONFIG.features.finance === false),
  badge: () => { const o = EXP.data && EXP.data.summary; return o && o.toClaimCount && expPrefs().reminders ? o.toClaimCount : ''; },
});
registerSection('expenses', {
  group: 'finance', hashable: true, match: v => v === 'expenses', title: () => 'Expenses', crumb: () => [], layout: 'page',
  mount(container) { _xpMount(container); },
  unmount() { EXP.picked = new Set(); },
});
registerSidebarBlock('finance', {
  id: 'money-expenses', order: 20, label: 'Expenses',
  render(el) {
    const o = expOwed();
    el.appendChild(sbNavItem({ label: 'Expenses', icon: 'receipt', view: 'expenses', active: state.view === 'expenses', count: o && o.toClaimCount && expPrefs().reminders ? String(o.toClaimCount) : '', title: 'What you are owed back, receipts and claims' }));
    if (!EXP.loaded) expLoad();
  },
});

function _xpMount(container) {
  const root = _xe('div', 'xp'); container.appendChild(root);
  if (!EXP.loaded) { root.innerHTML = '<div class="xp-loading"><span class="spinner" aria-hidden="true"></span> Loading your expenses…</div>'; expLoad(); return; }
  if (EXP.error && !EXP.data) { mountEmptyState(root, { icon: 'circle-alert', title: 'Expenses did not load', text: EXP.error, actions: [{ label: 'Try again', primary: true, run: () => { EXP.loaded = false; render(); } }] }); return; }
  expScan(false);
  const d = EXP.data, items = d.items, sum = d.summary;
  // header: the one action, and More
  const head = _xe('div', 'xp-head');
  head.append(uiButton({ label: 'Add an expense', icon: 'plus', kind: 'primary', run: () => expAddDialog({}) }),
    uiButton({ icon: 'ellipsis', tip: 'More', aria: 'More', run: (e, b) => _xpMore(b) }));
  root.appendChild(head);
  if (!items.length) {
    const box = _xe('div', 'xp-empty'); root.appendChild(box);
    mountEmptyState(box, { icon: 'receipt', title: 'Get paid back, without the chasing',
      text: 'Mark a payment as an expense to start: open Money > Transactions and press Expense on the purchase, or add one by hand. Keep the receipt, send the claim, and OpenDash notices when the money arrives.',
      actions: [{ label: 'Add an expense', icon: 'plus', primary: true, run: () => expAddDialog({}) }, { label: 'Open transactions', icon: 'arrow-right', run: () => { setView('finance'); try { window.FinanceView.setSection('transactions'); } catch (e) { /* later */ } } }] });
    return;
  }
  // status band
  const band = _xe('div', 'xp-band');
  band.innerHTML = `<div class="xp-owed"><span class="xp-big num">${esc(expMoney(sum.total))}</span><span class="xp-sub">${sum.count ? `owed to you · ${sum.toClaimCount} to claim · ${sum.submittedCount} waiting${sum.oldestDays > 1 ? ` · oldest ${esc(String(sum.oldestDays))} days` : ''}` : 'Nothing owed. All paid back.'}</span></div>`;
  const pc = _xe('div', 'xp-payers');
  for (const p of sum.payers.slice(0, 5)) pc.appendChild(_xChip(`${p.payer} · ${expMoney(p.total)}`, 'user', 'xp-chip' + (EXP.payer === p.key ? ' on' : ''), () => { EXP.payer = EXP.payer === p.key ? '' : p.key; render(); }));
  band.appendChild(pc); root.appendChild(band);
  // the one question
  const ask = EXP.asks[0];
  if (ask) root.appendChild(_xpAsk(ask));
  // gentle reminder
  const rem = sum.reminders.find(r => r.kind === 'to-claim');
  if (rem && expPrefs().reminders && rem.deadline) {
    const t = _xe('div', 'xp-remind'); t.innerHTML = icon('bell') + `<span>${rem.count} expense${rem.count === 1 ? '' : 's'} not claimed yet · ${rem.payer ? esc(rem.payer) + ' deadline ' : 'deadline '}${rem.days <= 0 ? 'today' : rem.days === 1 ? 'tomorrow' : `in ${rem.days} days`}</span>`;
    root.appendChild(t);
  }
  // tools
  const tools = _xe('div', 'xp-tools');
  const q = _xe('label', 'input input-sm xp-search', icon('search') + '<input type="search" placeholder="Search expenses" aria-label="Search expenses">');
  const qi = q.querySelector('input'); qi.value = EXP.q;
  let qt = 0; qi.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { EXP.q = qi.value; _xpList(listEl); }, 160); });
  tools.appendChild(q);
  const seg = _xe('div', 'xp-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Status');
  for (const [k, l] of [['all', 'All'], ['to-claim', 'To claim'], ['submitted', 'Submitted'], ['paid', 'Paid']]) seg.appendChild(_xChip(l, '', 'xp-chip' + (EXP.status === k ? ' on' : ''), () => { EXP.status = k; render(); }));
  tools.appendChild(seg);
  if (d.payers.length > 1) {
    const sel = _xe('select', 'xp-in xp-payer-sel'); sel.setAttribute('aria-label', 'Payer');
    sel.innerHTML = '<option value="">Everyone</option>' + d.payers.map(p => `<option value="${escAttr(p.key)}"${EXP.payer === p.key ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
    sel.onchange = () => { EXP.payer = sel.value; render(); };
    tools.appendChild(sel);
  }
  root.appendChild(tools);
  const listEl = _xe('div', 'xp-list'); root.appendChild(listEl);
  _xpList(listEl);
  // a receipt dropped anywhere on the page goes to the expense under it (rows), so nothing here
}
function _xChip(label, ic, cls, run) {
  const b = _xe('button', cls, (ic ? icon(ic, 'i-xs') : '') + `<span>${esc(label)}</span>`); b.type = 'button';
  if (cls.includes(' on')) b.setAttribute('aria-pressed', 'true'); else if (/\bxp-chip\b/.test(cls)) b.setAttribute('aria-pressed', 'false');
  b.onclick = run; return b;
}
function _xpFiltered() {
  const q = expNorm(EXP.q);
  return expItems().filter(e => (EXP.status === 'all' || e.status === EXP.status) && (!EXP.payer || expPayerKey(e.payer) === EXP.payer)
    && (!q || expNorm(`${e.title} ${e.payer} ${e.merchant || ''} ${e.category || ''} ${e.note || ''}`).includes(q)));
}
function _xpList(host) {
  host.innerHTML = '';
  const all = _xpFiltered();
  if (!all.length) { host.appendChild(_xe('div', 'xp-none', 'Nothing matches. <button class="btn-link" type="button">Clear the filters</button>')); host.querySelector('button').onclick = () => { EXP.q = ''; EXP.payer = ''; EXP.status = 'all'; render(); }; return; }
  const groups = [['to-claim', 'To claim', 'Add the receipt, then send the claim.'], ['submitted', 'Submitted', 'Waiting to be paid back. OpenDash looks for the payment.'], ['paid', 'Paid', '']];
  for (const [st, title, hint] of groups) {
    let list = all.filter(e => e.status === st);
    if (!list.length) continue;
    const sec = _xe('section', 'xp-sec');
    const total = list.reduce((s, e) => s + e.amount, 0);
    const h = _xe('div', 'sec-h xp-sec-h'); h.innerHTML = `<h3>${esc(title)}</h3><span class="n">${list.length}</span><span class="xp-sec-t num">${esc(expMoney(total))}</span><span class="spacer"></span>`;
    if (st === 'to-claim') {
      const pick = [...EXP.picked].filter(id => list.some(e => e.id === id));
      h.append(uiButton({ label: pick.length ? `Submit ${pick.length}` : 'Submit all', icon: 'send', kind: 'primary', size: 'sm', run: () => expSubmitDialog(pick.length ? pick : list.map(e => e.id)) }));
    }
    sec.appendChild(h);
    if (hint && st !== 'paid') sec.appendChild(_xe('div', 'xp-hint', esc(hint)));
    if (st === 'paid') { const cap = EXP.status === 'paid' || EXP.q ? 200 : 8; if (list.length > cap) { const more = list.length - cap; list = list.slice(0, cap); sec.dataset.more = more; } }
    if (st === 'submitted') {
      const byClaim = new Map();
      for (const e of list) { const k = e.claimId || e.id; if (!byClaim.has(k)) byClaim.set(k, []); byClaim.get(k).push(e); }
      for (const [cid, es] of byClaim) {
        const c = EXP.data.claims.find(x => x.id === cid);
        if (c && es.length > 1) sec.appendChild(_xe('div', 'xp-claim', `${icon('send', 'i-xs')} Sent ${esc(expAgo(c.submittedAt))}${c.payer ? ' to ' + esc(c.payer) : ''} · ${esc(expMoney(es.reduce((s, e) => s + e.amount, 0)))}`));
        es.forEach(e => sec.appendChild(_xpRow(e)));
      }
    } else list.forEach(e => sec.appendChild(_xpRow(e)));
    if (sec.dataset.more) sec.appendChild(_xe('div', 'xp-hint', `${sec.dataset.more} older paid expenses are hidden. Use the Paid filter to see them all.`));
    host.appendChild(sec);
  }
}
function _xpRow(e) {
  const row = _xe('div', 'xp-row'); row.tabIndex = 0; row.dataset.id = e.id; row.setAttribute('role', 'group'); row.setAttribute('aria-label', `${e.title}, ${expMoney(e.amount, e.currency)}`);
  if (e.status === 'to-claim') {
    const cb = _xe('input', 'xp-cb'); cb.type = 'checkbox'; cb.checked = EXP.picked.has(e.id); cb.setAttribute('aria-label', 'Select ' + e.title);
    cb.onclick = (ev) => ev.stopPropagation(); cb.onchange = () => { if (cb.checked) EXP.picked.add(e.id); else EXP.picked.delete(e.id); _xpList(row.closest('.xp-list')); };
    row.appendChild(cb);
  } else row.appendChild(_xe('span', 'xp-st st-' + e.status, icon(XP_STATUS[e.status][1])));
  const main = _xe('div', 'xp-main');
  const rc = e.receipts.length;
  const chips = [];
  chips.push(rc ? `<span class="xp-tag ok">${icon('paperclip', 'i-xs')}${rc} receipt${rc === 1 ? '' : 's'}</span>` : (e.status === 'to-claim' ? `<span class="xp-tag warn">${icon('paperclip', 'i-xs')}No receipt</span>` : ''));
  if (e.status === 'paid' && e.paidAt) chips.push(`<span class="xp-tag ok">Paid ${esc(expAgo(e.paidAt))}</span>`);
  if (e.status === 'submitted' && e.claimId) { const c = EXP.data.claims.find(x => x.id === e.claimId); if (c) chips.push(`<span class="xp-tag">Sent ${esc(expAgo(c.submittedAt))}</span>`); }
  if (e.kind === 'mileage') chips.push(`<span class="xp-tag">${e.miles} miles</span>`);
  if (e.vat) chips.push(`<span class="xp-tag">VAT ${esc(expMoney(e.vat))}</span>`);
  main.innerHTML = `<div class="xp-t">${esc(e.title)}</div><div class="xp-m"><span>${esc(typeof fmtDateShort === 'function' ? fmtDateShort(e.date) : e.date)}</span>${e.payer ? `<span>· ${esc(e.payer)}</span>` : '<span class="xp-warn">· no payer yet</span>'}${chips.join('')}</div>`;
  row.appendChild(main);
  const am = _xe('div', 'xp-am num', esc(expMoney(e.amount, e.currency)) + (e.foreign ? `<small>${esc(e.foreign.amount.toFixed(2) + ' ' + e.foreign.currency)}</small>` : ''));
  row.appendChild(am);
  row.appendChild(uiButton({ icon: 'paperclip', tip: 'Receipts', aria: 'Receipts for ' + e.title, size: 'sm', run: () => expReceiptsDialog(e.id) }));
  row.appendChild(uiButton({ icon: 'ellipsis', tip: 'More', aria: 'More for ' + e.title, size: 'sm', run: (ev, b) => _xpRowMenu(e, b) }));
  row.addEventListener('click', (ev) => { if (!ev.target.closest('button,input')) expAddDialog({ edit: e.id }); });
  row.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target === row) expAddDialog({ edit: e.id }); });
  expAcceptFiles(row, () => e.id);
  return row;
}
function _xpRowMenu(e, anchor) {
  const items = [{ label: 'Edit', icon: 'pencil', run: () => expAddDialog({ edit: e.id }) }, { label: 'Receipts…', icon: 'paperclip', run: () => expReceiptsDialog(e.id) }];
  if (e.status === 'to-claim') items.push({ label: 'Submit…', icon: 'send', run: () => expSubmitDialog([e.id]) });
  if (e.status !== 'paid') items.push({ label: 'Mark as paid', icon: 'circle-check', run: () => expMarkPaid([e.id]) });
  if (e.status === 'paid') items.push({ label: 'Not paid after all', icon: 'rotate-ccw', run: () => expDo('/unpaid', { ids: [e.id] }, { done: 'Moved back', what: 'change that' }) });
  if (e.status === 'submitted') items.push({ label: 'Not sent after all', icon: 'rotate-ccw', run: () => expDo('/unsubmit', { ids: [e.id] }, { done: 'Moved back to to claim', what: 'change that' }) });
  const linked = (e.taskIds || []).map(id => getItem(id)).filter(Boolean);
  for (const t of linked.slice(0, 2)) items.push({ label: 'Open task: ' + effTitle(t).slice(0, 28), icon: 'list-todo', run: () => (typeof openTask === 'function' ? openTask(t.id) : selectTask(t.id)) });
  items.push('sep', { label: 'Delete', icon: 'trash-2', danger: true, run: () => expDelete([e.id]) });
  openMenu(anchor, items, { align: 'end', width: 230 });
}
function _xpAsk(a) {
  const card = _xe('div', 'xp-ask card'); card.setAttribute('role', 'status');
  const exps = a.expenseIds.map(expItem).filter(Boolean);
  const what = exps.length === 1 ? `“${exps[0].title}”` : `${exps.length} of your expenses`;
  const lead = a.kind === 'partial' ? `${expMoney(a.amount)} from ${a.payer} arrived. Does it cover ${what}?`
    : a.weak ? `${expMoney(a.amount)} arrived${a.memo ? ' (' + a.memo.slice(0, 40) + ')' : ''}. Is that your claim to ${a.payer}: ${what}?`
    : `${expMoney(a.amount)} from ${a.payer} arrived. Is that ${what}?`;
  card.innerHTML = `${icon('circle-help')}<span class="xp-ask-t">${esc(lead)}</span>`;
  card.append(uiButton({ label: 'Yes', kind: 'primary', size: 'sm', run: () => expAnswer(a, true) }), uiButton({ label: 'No', size: 'sm', run: () => expAnswer(a, false) }));
  return card;
}
function _xpMore(anchor) {
  const p = expPrefs();
  openMenu(anchor, [
    { label: 'Add tasks for each expense', icon: 'list-checks', checked: p.autoTasks, hint: 'Submit, then check it was paid', run: () => expDo('/prefs', { patch: { autoTasks: !p.autoTasks } }, { quiet: true }) },
    { label: 'Hint “Expense?” on transactions', icon: 'lightbulb', checked: p.hints, run: () => expDo('/prefs', { patch: { hints: !p.hints } }, { quiet: true }) },
    { label: 'Deadline reminders', icon: 'bell', checked: p.reminders, run: () => expDo('/prefs', { patch: { reminders: !p.reminders } }, { quiet: true }) },
    'sep',
    { label: 'Payers and deadlines…', icon: 'users', run: () => expPayersDialog() },
    { label: 'Check for payments now', icon: 'refresh-cw', run: () => { EXP.scanAt = 0; expScan(true).then(() => toast(EXP.asks.length ? 'There is one thing to confirm' : 'Looked: nothing new arrived', { icon: 'search' })); } },
    { label: 'Download all as CSV', icon: 'download', run: () => expPack({ ids: expItems().map(e => e.id).slice(0, 200) }, 'csv') },
    { label: 'Paid back this year…', icon: 'calendar-check', run: () => expYearDialog() },
  ], { align: 'end', width: 290 });
}

/* ---------- add / edit ---------- */
function _xField(label, input, hint) { const w = _xe('label', 'xp-f'); w.appendChild(_xe('span', 'xp-fl', esc(label))); w.appendChild(input); if (hint) w.appendChild(_xe('span', 'xp-fh', esc(hint))); return w; }
function _xInput(type, value, ph, extra) { const i = _xe('input', 'xp-in'); i.type = type; i.value = value == null ? '' : value; if (ph) i.placeholder = ph; if (extra) Object.assign(i, extra); return i; }
/** Add an expense (prefill from a transaction, a task or nothing) or edit one ({edit: id}). */
function expAddDialog(pre) {
  pre = pre || {};
  const edit = pre.edit ? expItem(pre.edit) : null;
  const v = edit || pre;
  const files = [];
  const title = _xInput('text', v.title || '', 'What was it? e.g. Laptop charger');
  const amount = _xInput('number', v.amount || '', '0.00', { step: '0.01', min: '0', inputMode: 'decimal' });
  const date = _xInput('date', v.date || todayStr());
  const payer = _xInput('text', v.payer || '', 'Who pays you back? e.g. your employer', { autocomplete: 'off' });
  const dl = _xe('datalist'); dl.id = 'xp-payers-dl'; dl.innerHTML = (EXP.data ? EXP.data.payers : []).map(p => `<option value="${escAttr(p.name)}">`).join(''); payer.setAttribute('list', dl.id);
  if (!payer.value && !edit && EXP.data && EXP.data.payers.length) payer.value = EXP.data.payers[0].name;
  const vat = _xInput('number', v.vat || '', 'optional', { step: '0.01', min: '0' });
  const note = _xInput('text', v.note || '', 'optional');
  const drop = _xe('div', 'xp-dz', `${icon('paperclip')}<span>Drop a receipt here, paste one, or <button class="btn-link" type="button">choose a file</button></span><div class="xp-dz-l"></div>`);
  drop.tabIndex = 0;
  const paintFiles = () => { drop.querySelector('.xp-dz-l').innerHTML = files.map(f => `<span class="xp-tag ok">${icon('paperclip', 'i-xs')}${esc(f.name.slice(0, 28))}</span>`).join(''); };
  const addFiles = (fs) => { [...fs].filter(f => /^(image\/|application\/pdf)/.test(f.type) || /\.pdf$/i.test(f.name)).forEach(f => files.push(f)); paintFiles(); if (edit) { files.splice(0).forEach(f => expUploadReceipt(edit.id, f)); } };
  drop.querySelector('button').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,image/*'; i.multiple = true; i.onchange = () => addFiles(i.files); i.click(); };
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('xp-drop'); }); drop.addEventListener('dragleave', () => drop.classList.remove('xp-drop'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('xp-drop'); addFiles(e.dataTransfer.files); });
  drop.addEventListener('paste', (e) => { if (e.clipboardData && e.clipboardData.files.length) { e.preventDefault(); addFiles(e.clipboardData.files); } });
  openDialog({
    title: edit ? 'Edit expense' : pre.source && pre.source.type === 'tx' ? 'Expense this payment' : 'Add an expense', size: 'md',
    body(el) {
      el.className += ' xp-form';
      if (!edit && pre.source && pre.source.type === 'tx') el.appendChild(_xe('p', 'xp-lead', 'Choose who pays you back. The amount and date come from the transaction.'));
      el.append(_xField('What', title), _xe('div', 'xp-two'), _xField('Who pays you back', payer, 'Remembered for next time'), dl);
      const two = el.querySelector('.xp-two'); two.append(_xField('Amount', amount), _xField('Date', date));
      const two2 = _xe('div', 'xp-two'); two2.append(_xField('VAT included', vat), _xField('Note', note)); el.appendChild(two2);
      el.appendChild(drop);
      setTimeout(() => (title.value ? (payer.value ? amount : payer) : title).focus(), 30);
    },
    actions: [{ label: 'Cancel' }, { label: edit ? 'Save' : 'Add expense', primary: true, icon: 'check', run: async (close) => {
      const fields = { title: title.value, amount: Number(amount.value), date: date.value, payer: payer.value, note: note.value, ...(vat.value ? { vat: Number(vat.value) } : {}) };
      if (!fields.title.trim()) { title.focus(); toast('Say what it was.', { kind: 'err' }); return false; }
      if (!(fields.amount > 0)) { amount.focus(); toast('Add the amount.', { kind: 'err' }); return false; }
      if (edit) { const j = await expDo('/update', { id: edit.id, patch: fields }, { done: 'Saved', icon: 'check', what: 'save that' }); return j ? undefined : false; }
      const e = await expCreate({ ...fields, merchant: pre.merchant || '', source: pre.source || { type: 'manual' }, taskIds: pre.taskIds || [] }, { tasks: !pre.fromTask });
      if (!e) return false;
      if (pre.fromTask) await expApi('/update', { id: e.id, patch: { tasks: { submit: pre.fromTask }, taskIds: [pre.fromTask] } }).then(r => expSet(r.data)).catch(() => {});
      for (const f of files) await expUploadReceipt(e.id, f);
      return undefined;
    } }],
  });
}

/* ---------- receipts ---------- */
function expReceiptsDialog(id) {
  openDialog({
    title: 'Receipts', size: 'md', fixed: false,
    body(el) {
      el.className += ' xp-form';
      const paint = async () => {
        const e = expItem(id); el.innerHTML = '';
        if (!e) { el.textContent = 'That expense is gone.'; return; }
        el.appendChild(_xe('p', 'xp-lead', `${esc(e.title)} · ${esc(expMoney(e.amount, e.currency))}`));
        const list = _xe('div', 'xp-rcl');
        for (const r of e.receipts) {
          const row = _xe('div', 'xp-rc');
          const label = r.ref ? `<a href="/api/expenses/receipt/${encodeURIComponent(r.ref)}" target="_blank" rel="noopener">${esc(r.name)}</a>` : (r.mail.link ? `<a href="${escAttr(r.mail.link)}" target="_blank" rel="noopener noreferrer">${esc(r.mail.subject || 'Email')}</a>` : esc(r.mail.subject || 'Email'));
          row.innerHTML = `${icon(r.ref ? 'file-text' : 'mail')}<span>${label}<small>${r.ref ? 'File' : 'Email · ' + esc(r.mail.from || '')}</small></span>`;
          row.appendChild(uiButton({ icon: 'x', tip: 'Remove', aria: 'Remove receipt', size: 'sm', run: () => expDo('/receipt/remove', { id, ref: r.ref || r.mail.id }, { done: 'Receipt removed', what: 'remove it' }).then(paint) }));
          list.appendChild(row);
        }
        if (!e.receipts.length) list.appendChild(_xe('div', 'xp-hint', 'No receipt yet.'));
        el.appendChild(list);
        const dz = _xe('div', 'xp-dz', `${icon('paperclip')}<span>Drop a PDF or photo here, paste one, or <button class="btn-link" type="button">choose a file</button></span>`); dz.tabIndex = 0;
        dz.querySelector('button').onclick = () => expPickFile(id);
        expAcceptFiles(dz, () => id);
        el.appendChild(dz);
        const sug = _xe('div', 'xp-sug'); el.appendChild(sug);
        try {
          const r = await expApi('/receipt-matches?id=' + encodeURIComponent(id));
          if (r.matches.length) {
            sug.innerHTML = '<div class="xp-fl">Receipt emails that look right</div>';
            for (const m of r.matches) {
              const row = _xe('div', 'xp-rc', `${icon('mail')}<span>${esc(m.subject || 'Email')}<small>${esc(m.from)} · ${esc(m.date)} · matches ${esc(m.why)}</small></span>`);
              row.appendChild(uiButton({ label: 'Attach', size: 'sm', run: () => expDo('/receipt/mail', { id, mail: { id: m.id, src: m.src, subject: m.subject, from: m.from, date: m.date, link: m.link } }, { done: 'Email linked as the receipt', icon: 'mail', what: 'attach it' }).then(paint) }));
              sug.appendChild(row);
            }
          } else if (r.connected) sug.appendChild(_xe('div', 'xp-hint', 'No receipt email found in your recent mail.'));
        } catch (err) { /* offline: the rest still works */ }
      };
      paint();
    },
    actions: [{ label: 'Done', primary: true }],
  });
}

/* ---------- submit a claim ---------- */
function expSubmitDialog(ids) {
  const list = ids.map(expItem).filter(e => e && e.status === 'to-claim');
  if (!list.length) { toast('Nothing to submit there.'); return; }
  const payer = _xInput('text', list[0].payer || (EXP.data.payers[0] && EXP.data.payers[0].name) || '', 'Who you are sending it to', { autocomplete: 'off' });
  const date = _xInput('date', todayStr());
  const method = _xe('select', 'xp-in'); method.innerHTML = '<option value="email">By email</option><option value="portal">In their expenses system</option><option value="in-person">In person</option><option value="other">Another way</option>';
  const total = list.reduce((s, e) => s + e.amount, 0), missing = list.filter(e => !e.receipts.length).length;
  openDialog({
    title: `Submit ${list.length} expense${list.length === 1 ? '' : 's'} · ${expMoney(total)}`, size: 'md',
    body(el) {
      el.className += ' xp-form';
      el.appendChild(_xe('div', 'xp-sumlist', list.map(e => `<div><span>${esc(e.title)}</span><b class="num">${esc(expMoney(e.amount, e.currency))}</b></div>`).join('')));
      if (missing) el.appendChild(_xe('div', 'xp-remind', `${icon('triangle-alert')}<span>${missing} ${missing === 1 ? 'has' : 'have'} no receipt yet. You can still mark it, or add them first.</span>`));
      el.append(_xField('Sent to', payer), (() => { const t = _xe('div', 'xp-two'); t.append(_xField('Date sent', date), _xField('How', method)); return t; })());
      const acts = _xe('div', 'xp-pack');
      acts.append(uiButton({ label: 'Copy summary', icon: 'copy', size: 'sm', run: () => expPack({ ids, payer: payer.value }, 'text') }),
        uiButton({ label: 'Download pack', icon: 'download', size: 'sm', run: () => expPack({ ids, payer: payer.value }, 'zip'), tip: 'A summary page, a spreadsheet and the receipts, in one file' }),
        uiButton({ label: 'Print view', icon: 'printer', size: 'sm', run: () => expPack({ ids, payer: payer.value }, 'html'), tip: 'A page you can open and print or save as a PDF' }));
      el.appendChild(acts);
      el.appendChild(_xe('p', 'xp-fh', 'OpenDash never sends anything. Send the pack yourself, then mark it as submitted.'));
    },
    actions: [{ label: 'Cancel' }, { label: 'Mark as submitted', primary: true, icon: 'send', run: async (close) => {
      if (!payer.value.trim()) { payer.focus(); toast('Say who you sent it to.', { kind: 'err' }); return false; }
      const j = await expSubmit(ids, { payer: payer.value, method: method.value, date: date.value });
      if (!j) return false; EXP.picked = new Set(); return undefined;
    } }],
  });
}

/* ---------- payers and the year ---------- */
function expPayersDialog() {
  openDialog({
    title: 'Payers and deadlines', size: 'md',
    body(el) {
      el.className += ' xp-form';
      const ps = EXP.data.payers;
      if (!ps.length) { el.appendChild(_xe('div', 'xp-hint', 'Payers appear here once you have added an expense.')); return; }
      for (const p of ps) {
        const box = _xe('div', 'xp-payer'); box.appendChild(_xe('b', '', esc(p.name)));
        const match = _xInput('text', (p.match || []).join(', '), 'e.g. ACME');
        const mode = _xe('select', 'xp-in'); mode.innerHTML = `<option value="none">No deadline</option><option value="monthEnd">End of each month</option><option value="day">A day each month</option>`; mode.value = p.deadline.mode;
        const day = _xInput('number', p.deadline.day || 25, '', { min: '1', max: '28' }); day.hidden = mode.value !== 'day'; mode.onchange = () => { day.hidden = mode.value !== 'day'; };
        const chk = _xInput('number', p.checkDays || expPrefs().checkDays, '', { min: '1', max: '120' });
        box.append(_xField('Appears in the bank text as', match, 'Words in the payment, so a match is recognised'), (() => { const t = _xe('div', 'xp-two'); t.append(_xField('Claim deadline', mode), _xField('Day', day)); return t; })(), _xField('Check for payment after (days)', chk));
        box.appendChild(uiButton({ label: 'Save ' + p.name, size: 'sm', run: () => expDo('/payer', { name: p.name, patch: { match: match.value.split(',').map(s => s.trim()).filter(Boolean), deadline: { mode: mode.value, day: Number(day.value) }, checkDays: Number(chk.value) } }, { done: 'Saved', what: 'save that' }) }));
        el.appendChild(box);
      }
    },
    actions: [{ label: 'Done', primary: true }],
  });
}
async function expYearDialog() {
  let s; try { s = (await expApi('/year?year=' + todayStr().slice(0, 4))).summary; } catch (e) { toastError('load the summary', e); return; }
  openDialog({
    title: `Expensed and paid back, ${s.year}`, size: 'md',
    body(el) {
      el.className += ' xp-form';
      el.innerHTML = `<div class="xp-year"><div><b class="num">${esc(expMoney(s.expensed))}</b><span>expensed (${s.count})</span></div><div><b class="num">${esc(expMoney(s.paidBack))}</b><span>paid back</span></div><div><b class="num">${esc(expMoney(s.outstanding))}</b><span>still owed</span></div></div>`
        + s.payers.map(p => `<div class="xp-yr"><span>${esc(p.payer)}</span><span class="num">${esc(expMoney(p.paid))} of ${esc(expMoney(p.expensed))}</span></div>`).join('');
    },
    actions: [{ label: 'Done', primary: true }],
  });
}
