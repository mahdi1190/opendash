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
  if (!items.length) {
    const box = _xe('div', 'xp-empty'); root.appendChild(box);
    mountEmptyState(box, { icon: 'receipt', title: 'Get paid back, without the chasing',
      text: 'Mark a payment as an expense to start: open Money > Transactions and press Expense on the purchase, or add one by hand. Keep the receipt, send the claim, and OpenDash notices when the money arrives.',
      actions: [{ label: 'Add an expense', icon: 'plus', primary: true, run: () => expAddDialog({}) }, { label: 'Open transactions', icon: 'arrow-right', run: () => { setView('finance'); try { window.FinanceView.setSection('transactions'); } catch (e) { /* later */ } } }] });
    return;
  }
  // The owed summary on top: the total, the status and payer filters in one band (2.19: lean).
  root.appendChild(_xpBand(d, sum));
  const ask = EXP.asks[0];
  if (ask) root.appendChild(_xpAsk(ask));
  const rem = sum.reminders.find(r => r.kind === 'to-claim');
  if (rem && expPrefs().reminders && rem.deadline) {
    const t = _xe('div', 'xp-remind'); t.innerHTML = icon('bell') + `<span>${rem.count} expense${rem.count === 1 ? '' : 's'} not claimed yet · ${rem.payer ? esc(rem.payer) + ' deadline ' : 'deadline '}${rem.days <= 0 ? 'today' : rem.days === 1 ? 'tomorrow' : `in ${rem.days} days`}</span>`;
    root.appendChild(t);
  }
  // The list beside the picked expense: its details, actions and receipts.
  const all = _xpFiltered();
  const sel = all.find(e => e.id === EXP.sel) || all[0] || null;
  EXP.sel = sel ? sel.id : '';
  const md = masterDetail({
    label: 'Expenses', listWidth: 340, cls: 'xp-md',
    list: (host) => _xpListInto(host, all, sel, (e) => _xpSelect(md, e)),
    detail: sel ? _xpDetail(sel) : null,
    empty: () => { const b = _xe('div', 'xp-none', 'Nothing matches. <button class="btn-link" type="button">Clear the filters</button>'); b.querySelector('button').onclick = () => { EXP.q = ''; EXP.payer = ''; EXP.status = 'all'; render(); }; return b; },
  });
  root.appendChild(md);
}
/** "12 Oct" (and the year when it is not this one). */
function _xpDate(iso) {
  const d = new Date(String(iso) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return String(iso || '');
  return d.toLocaleDateString(undefined, d.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}
function _xChip(label, ic, cls, run) {
  const b = _xe('button', cls, (ic ? icon(ic, 'i-xs') : '') + `<span>${esc(label)}</span>`); b.type = 'button';
  if (cls.includes(' on')) b.setAttribute('aria-pressed', 'true'); else if (/\bxp-chip\b/.test(cls)) b.setAttribute('aria-pressed', 'false');
  b.onclick = run; return b;
}
/** The band: what you are owed, then one row of status chips (with counts) and the payers. */
function _xpBand(d, sum) {
  const band = _xe('div', 'xp-band');
  band.innerHTML = `<div class="xp-owed"><span class="xp-big num">${esc(expMoney(sum.total))}</span><span class="xp-sub">${sum.count ? `owed to you${sum.oldestDays > 1 ? ` · oldest ${esc(String(sum.oldestDays))} days` : ''}` : 'Nothing owed. All paid back.'}</span></div>`;
  const chips = _xe('div', 'xp-chips');
  const seg = _xe('div', 'xp-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Status');
  for (const [k, l] of [['all', 'All'], ['to-claim', 'To claim'], ['submitted', 'Waiting'], ['paid', 'Paid']]) seg.appendChild(_xChip(l, '', 'xp-chip' + (EXP.status === k ? ' on' : ''), () => { EXP.status = k; render(); }));
  chips.appendChild(seg);
  if (d.payers.length > 1) {   // 2.19.1: one select for who, not a chip per payer with its total again
    const pc = _xe('div', 'xp-payers');
    const sel = _xe('select', 'xp-in xp-payer-sel'); sel.setAttribute('aria-label', 'Payer');
    sel.innerHTML = '<option value="">Everyone</option>' + d.payers.map(p => `<option value="${escAttr(p.key)}"${EXP.payer === p.key ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
    sel.onchange = () => { EXP.payer = sel.value; render(); };
    pc.appendChild(sel);
    chips.appendChild(pc);
  }
  band.appendChild(chips);
  return band;
}
function _xpFiltered() {
  const q = expNorm(EXP.q);
  return expItems().filter(e => (EXP.status === 'all' || e.status === EXP.status) && (!EXP.payer || expPayerKey(e.payer) === EXP.payer)
    && (!q || expNorm(`${e.title} ${e.payer} ${e.merchant || ''} ${e.category || ''} ${e.note || ''}`).includes(q)));
}
/** The list column: search, then To claim / Waiting / Paid, each a page at a time (paid ones fold to 8). */
function _xpListInto(host, all, sel, pick) {
  const q = _xe('label', 'input input-sm xp-search', icon('search') + '<input type="search" placeholder="Search expenses" aria-label="Search expenses">');
  const qi = q.querySelector('input'); qi.value = EXP.q;
  let qt = 0;
  qi.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { EXP.q = qi.value; const at = qi.selectionStart; render(); const again = document.querySelector('.xp-search input'); if (again) { again.focus(); try { again.setSelectionRange(at, at); } catch (e) { /* fine */ } } }, 260); });
  host.appendChild(q);
  const groups = [['to-claim', 'To claim', 'Add the receipt, then send the claim.'], ['submitted', 'Waiting', 'Sent and waiting to be paid back. OpenDash looks for the payment.'], ['paid', 'Paid', '']];
  for (const [st, title, hint] of groups) {
    const list = all.filter(e => e.status === st);
    if (!list.length) continue;
    const total = list.reduce((s, e) => s + e.amount, 0);
    const h = secHead({ title, count: list.length, sub: expMoney(total) });
    if (hint) h.title = hint;
    if (st === 'to-claim') {
      const pickd = () => [...EXP.picked].filter(id => list.some(e => e.id === id));
      const btn = uiButton({ label: 'Submit all', icon: 'send', kind: 'ghost', size: 'sm', run: () => { const p = pickd(); expSubmitDialog(p.length ? p : list.map(e => e.id)); } });
      h.appendChild(uiButton({ label: 'Make expense report', icon: 'file-text', kind: 'ghost', size: 'sm', tip: 'A filled-in expense form (PDF) and a zip of the receipts, saved in Documents', run: () => { const p = pickd(); expReportDialog(p.length ? p : list.map(e => e.id)); } }));
      h.appendChild(btn);
      h._upd = () => { const p = pickd(); const s = btn.querySelector('span:not(.i)') || btn; s.textContent = p.length ? `Submit ${p.length}` : 'Submit all'; };
      h._upd();
    }
    host.appendChild(h);
    const at = sel ? list.findIndex(e => e.id === sel.id) : -1;
    host.appendChild(pagedList({ items: list, pageSize: st === 'paid' && !EXP.q && EXP.status !== 'paid' ? 8 : 15, start: at + 1,
      render: (e) => _xpListRow(e, sel && e.id === sel.id, pick, h) }));
  }
}
function _xpListRow(e, active, pick, head) {
  let lead;
  if (e.status === 'to-claim') {
    lead = _xe('input', 'xp-cb'); lead.type = 'checkbox'; lead.checked = EXP.picked.has(e.id); lead.setAttribute('aria-label', 'Select ' + e.title);
    lead.onclick = (ev) => ev.stopPropagation();
    lead.onchange = () => { if (lead.checked) EXP.picked.add(e.id); else EXP.picked.delete(e.id); if (head && head._upd) head._upd(); };
  } else lead = _xe('span', 'xp-st st-' + e.status, icon(XP_STATUS[e.status][1]));
  const rc = e.receipts.length;
  const when = _xpDate(e.date);
  const sub = [when, e.payer || 'no payer yet', e.status === 'to-claim' && !rc ? 'no receipt' : ''].filter(Boolean).join(' · ');
  const row = mdRow({ title: e.title, sub, avatar: lead, badge: expMoney(e.amount, e.currency), active, tip: `${e.title}, ${expMoney(e.amount, e.currency)}`, run: () => pick(e) });
  row.dataset.id = e.id;
  expAcceptFiles(row, () => e.id);
  return row;
}
/** Pick an expense: the right side changes, the list (scroll, checkboxes) stays. */
function _xpSelect(md, e) {
  EXP.sel = e.id;
  for (const r of md.mdList.querySelectorAll('.md-row')) { const on = r.dataset.id === e.id; r.classList.toggle('on', on); if (on) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current'); }
  md.mdSet(_xpDetail(e));
}
/** The picked expense: what it is, the next step, the receipts. */
function _xpDetail(e) {
  const box = _xe('div', 'xp-d');
  const head = _xe('div', 'xp-d-head');
  head.append(_xe('h2', 'xp-d-t', esc(e.title)), _xe('div', 'xp-d-am num', esc(expMoney(e.amount, e.currency)) + (e.foreign ? `<small>${esc(e.foreign.amount.toFixed(2) + ' ' + e.foreign.currency)}</small>` : '')));
  box.appendChild(head);
  const meta = _xe('div', 'xp-m');
  const chips = [`<span>${esc(_xpDate(e.date))}</span>`];   // the status is the list's heading and icon: not said a third time
  chips.push(e.payer ? `<span>${esc(e.payer)}</span>` : '<span class="xp-warn">no payer yet</span>');
  if (e.merchant) chips.push(`<span>${esc(e.merchant)}</span>`);
  if (e.category) chips.push(`<span>${esc(e.category)}</span>`);
  if (e.status === 'paid' && e.paidAt) chips.push(`<span class="xp-tag ok">Paid ${esc(expAgo(e.paidAt))}</span>`);
  if (e.status === 'submitted' && e.claimId) {
    const c = EXP.data.claims.find(x => x.id === e.claimId);
    if (c) {
      const mates = expItems().filter(x => x.claimId === e.claimId);
      chips.push(`<span class="xp-tag">Sent ${esc(expAgo(c.submittedAt))}${mates.length > 1 ? ` with ${mates.length - 1} more · ${esc(expMoney(mates.reduce((s, x) => s + x.amount, 0)))}` : ''}</span>`);
    }
  }
  if (e.kind === 'mileage') chips.push(`<span class="xp-tag">${e.miles} miles</span>`);
  if (e.vat) chips.push(`<span class="xp-tag">VAT ${esc(expMoney(e.vat))}</span>`);
  meta.innerHTML = chips.join('');
  box.appendChild(meta);
  if (e.note) box.appendChild(_xe('p', 'xp-d-note', esc(e.note)));
  const acts = _xe('div', 'xp-d-acts');
  if (e.status === 'to-claim') acts.appendChild(uiButton({ label: 'Submit', icon: 'send', size: 'sm', run: () => expSubmitDialog([e.id]) }));
  else if (e.status === 'submitted') acts.appendChild(uiButton({ label: 'Mark as paid', icon: 'circle-check', size: 'sm', run: () => expMarkPaid([e.id]) }));
  acts.append(uiButton({ label: 'Edit', icon: 'pencil', size: 'sm', run: () => expAddDialog({ edit: e.id }) }),
    uiButton({ icon: 'ellipsis', tip: 'More', aria: 'More for ' + e.title, size: 'sm', run: (ev, b) => _xpRowMenu(e, b) }));
  box.appendChild(acts);
  const rs = _xe('section', 'xp-d-sec'); rs.appendChild(secHead({ title: 'Receipts', count: e.receipts.length || '' }));
  const rb = _xe('div', 'xp-form'); rs.appendChild(rb); box.appendChild(rs);
  _xpReceiptsBody(rb, e.id, false);
  const linked = (e.taskIds || []).map(id => getItem(id)).filter(Boolean);
  if (linked.length) {
    const ts = _xe('section', 'xp-d-sec'); ts.appendChild(secHead({ title: 'Tasks', count: linked.length }));
    for (const t of linked.slice(0, 4)) ts.appendChild(uiButton({ label: effTitle(t).slice(0, 60), icon: 'list-todo', kind: 'ghost', size: 'sm', run: () => (typeof openTask === 'function' ? openTask(t.id) : selectTask(t.id)) }));
    box.appendChild(ts);
  }
  expAcceptFiles(box, () => e.id);
  return box;
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
/** The page header's More menu (registerHeaderActions below): settings, payers, a check now, CSV, the year. */
function _xpMoreItems() {
  const p = expPrefs();
  return [
    { label: 'Add tasks for each expense', icon: 'list-checks', checked: p.autoTasks, hint: 'Submit, then check it was paid', run: () => expDo('/prefs', { patch: { autoTasks: !p.autoTasks } }, { quiet: true }) },
    { label: 'Hint “Expense?” on transactions', icon: 'lightbulb', checked: p.hints, run: () => expDo('/prefs', { patch: { hints: !p.hints } }, { quiet: true }) },
    { label: 'Deadline reminders', icon: 'bell', checked: p.reminders, run: () => expDo('/prefs', { patch: { reminders: !p.reminders } }, { quiet: true }) },
    'sep',
    { label: 'Payers and deadlines…', icon: 'users', run: () => expPayersDialog() },
    { label: 'Check for payments now', icon: 'refresh-cw', run: () => { EXP.scanAt = 0; expScan(true).then(() => toast(EXP.asks.length ? 'There is one thing to confirm' : 'Looked: nothing new arrived', { icon: 'search' })); } },
    { label: 'Your signature…', icon: 'pen-line', run: () => expSignatureDialog() },
    { label: 'Download all as CSV', icon: 'download', run: () => expPack({ ids: expItems().map(e => e.id).slice(0, 200) }, 'csv') },
    { label: 'Paid back this year…', icon: 'calendar-check', run: () => expYearDialog() },
  ];
}
// One primary action in the page header (UX_BLUEPRINT.md 3), the rest under More.
if (typeof registerHeaderActions === 'function') registerHeaderActions(v => v === 'expenses', () => ({
  primary: { label: 'Add an expense', icon: 'plus', run: () => expAddDialog({}) },
  more: _xpMoreItems(),
}));

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
/** The receipts of one expense (files, emails, the drop zone, receipt emails that look right) into el; repaints itself. */
function _xpReceiptsBody(el, id, lead) {
  const paint = async () => {
    const e = expItem(id); el.innerHTML = '';
    if (!e) { el.textContent = 'That expense is gone.'; return; }
    if (lead) el.appendChild(_xe('p', 'xp-lead', `${esc(e.title)} · ${esc(expMoney(e.amount, e.currency))}`));
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
}
function expReceiptsDialog(id) {
  openDialog({
    title: 'Receipts', size: 'md', fixed: false,
    body(el) { el.className += ' xp-form'; _xpReceiptsBody(el, id, true); },
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

/* ---------- the expense report (2.19.6) ---------- */
async function expSignatureRead(file) {
  if (file.size > 2 * 1024 * 1024) { toast('That picture is over 2 MB. Try a smaller one.', { kind: 'err' }); return null; }
  try { return await expReadFile(file); } catch (e) { toast(e.message, { kind: 'err' }); return null; }
}
/** Your signature for the report: upload a PNG or JPEG, see it, replace or remove it. Kept in your data folder, never shared. */
function expSignatureDialog(after) {
  let box;
  const paint = async () => {
    let set = false; try { set = (await expApi('/signature?info=1')).signature.set; } catch (e) { /* none */ }
    box.innerHTML = '';
    if (set) {
      const img = _xe('img', 'xp-sig'); img.alt = 'Your signature'; img.src = '/api/expenses/signature?t=' + Date.now();
      img.style.cssText = 'max-width:100%;max-height:120px;background:#fff;border:1px solid var(--border);border-radius:8px;padding:8px';
      box.appendChild(img);
    } else box.appendChild(_xe('p', 'xp-fh', 'No signature yet. The report leaves the line blank.'));
    const acts = _xe('div', 'xp-pack');
    acts.append(uiButton({ label: set ? 'Replace' : 'Add a signature', icon: 'upload', size: 'sm', run: () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        const data = await expSignatureRead(f); if (!data) return;
        try { await expApi('/signature', { data }); toast('Signature saved', { icon: 'pen-line' }); if (typeof after === 'function') after(); } catch (e) { toast(netErrorMessage(e), { kind: 'err' }); }
        paint();
      };
      inp.click();
    } }));
    if (set) acts.append(uiButton({ label: 'Remove', icon: 'trash-2', size: 'sm', run: async () => {
      try { await expApi('/signature/remove', {}); toast('Signature removed', { icon: 'trash-2' }); if (typeof after === 'function') after(); } catch (e) { toast(netErrorMessage(e), { kind: 'err' }); }
      paint();
    } }));
    box.appendChild(acts);
  };
  openDialog({
    title: 'Your signature', size: 'sm',
    body(el) {
      el.className += ' xp-form';
      el.appendChild(_xe('p', 'xp-fh', 'A PNG or JPEG picture of your signature (2 MB at most). It goes on the Claimant line of the expense report. It stays in your data folder and is never shared with friends.'));
      box = _xe('div', 'xp-form'); el.appendChild(box); paint();
    },
    actions: [{ label: 'Done', primary: true }],
  });
}
const _XR_COLS = [['hotel', 'Hotel'], ['transport', 'Transport'], ['fuel', 'Fuel'], ['meals', 'Meals'], ['phone', 'Phone'], ['entertainment', 'Entertainment'], ['misc', 'Misc.']];
/** Make expense report: each row is placed in a column of the form for you (a small click on the column name changes one); Generate does the rest. */
async function expReportDialog(ids) {
  const list = ids.map(expItem).filter(Boolean);
  if (!list.length) { toast('Nothing to put in a report.'); return; }
  let plan;
  try { plan = await expApi('/report/plan', { ids }); } catch (e) { if (typeof toastError === 'function') toastError('get the report ready', e); else toast(netErrorMessage(e), { kind: 'err' }); return; }
  const cols = {};
  const total = list.reduce((s, e) => s + e.amount, 0);
  const noReceipt = plan.rows.filter(r => !r.hasReceipt);
  const payer = _xInput('text', plan.payer || '', 'Who the report is for', { autocomplete: 'off' });
  const name = _xInput('text', plan.name || '', 'Your name');
  const adv = _xInput('number', '0.00', '0.00', { min: '0', step: '0.01' });
  let body, sigNote;
  const sigPaint = () => {
    expApi('/signature?info=1').then((j) => {
      sigNote.innerHTML = '';
      sigNote.appendChild(_xe('span', 'xp-fh', j.signature.set ? 'Your signature will be on the form.' : 'You have not added your signature, so that line will be blank.'));
      if (!j.signature.set) sigNote.appendChild(uiButton({ label: 'Add a signature', icon: 'pen-line', size: 'sm', run: () => expSignatureDialog(sigPaint) }));
    }).catch(() => {});
  };
  const colName = (r) => (_XR_COLS.find(c => c[0] === (cols[r.id] || r.col)) || _XR_COLS[6])[1];
  const colCell = (r) => {
    const b = _xe('button', 'btn-link', esc(colName(r)));
    b.type = 'button'; b.title = 'Change the column (optional)';
    b.onclick = () => {
      const sel = _xe('select', 'xp-in');
      sel.innerHTML = _XR_COLS.map(c => `<option value="${c[0]}"${c[0] === (cols[r.id] || r.col) ? ' selected' : ''}>${esc(c[1])}</option>`).join('');
      sel.onchange = () => { cols[r.id] = sel.value; sel.onblur = null; sel.replaceWith(colCell(r)); };
      sel.onblur = () => { sel.replaceWith(colCell(r)); };
      b.replaceWith(sel); sel.focus();
    };
    return b;
  };
  const saved = (res) => {
    body.innerHTML = '';
    body.appendChild(_xe('div', 'xp-remind', `${icon('circle-check')}<span>Saved to ${esc(res.dir)}</span>`));
    body.appendChild(_xe('p', 'xp-fh', `${res.count} expense${res.count === 1 ? '' : 's'} on the form${res.receipts ? ', ' + res.receipts + ' receipt' + (res.receipts === 1 ? '' : 's') + ' in Receipts.zip' : ', no receipts to zip'}. The folder should have opened. Print or send the PDF yourself.`));
    const acts = _xe('div', 'xp-pack');
    acts.append(uiButton({ label: 'Open folder', icon: 'folder-open', kind: 'primary', size: 'sm', run: () => expApi('/report/open', { dir: res.dir }).catch(e => toast(netErrorMessage(e), { kind: 'err' })) }));
    body.appendChild(acts);
  };
  openDialog({
    title: `Make expense report · ${list.length} expense${list.length === 1 ? '' : 's'} · ${expMoney(total)}`, size: 'lg',
    body(el) {
      el.className += ' xp-form';
      body = el;
      const rows = _xe('div', 'xp-sumlist'); rows.style.maxHeight = '260px';
      for (const r of plan.rows) {
        const d = _xe('div', '');
        const left = _xe('span', '', `${esc(r.date.slice(8, 10) + '/' + r.date.slice(5, 7))} · ${esc(r.description)} · `);
        left.appendChild(colCell(r));
        d.appendChild(left); d.appendChild(_xe('b', 'num', esc(expMoney(r.amount))));
        rows.appendChild(d);
      }
      el.appendChild(rows);
      el.appendChild(_xe('p', 'xp-fh', 'Each row goes in the column that fits it best. Click a column name only if you want to change one.'));
      if (noReceipt.length) el.appendChild(_xe('div', 'xp-remind', `${icon('triangle-alert')}<span>No receipt for: ${noReceipt.map(r => esc(r.description)).join(', ')}. You can still make the report.</span>`));
      const two = _xe('div', 'xp-two'); two.append(_xField('Name on the form', name), _xField('Advances (£)', adv)); el.appendChild(two);
      el.appendChild(_xField('For (names the folder)', payer));
      sigNote = _xe('div', 'xp-pack'); el.appendChild(sigNote); sigPaint();
      const go = uiButton({ label: 'Generate', icon: 'file-text', kind: 'primary', wait: true, run: async () => {
        let res;
        try { res = await expApi('/report', { ids, cols, advances: Number(adv.value) || 0, payer: payer.value, name: name.value }); }
        catch (e) { if (typeof toastError === 'function') toastError('make the report', e); else toast(netErrorMessage(e), { kind: 'err' }); return; }
        saved(res);
        const open = ids.map(expItem).filter(e => e && e.status === 'to-claim').map(e => e.id);
        if (open.length) { await expSubmit(open, { payer: payer.value || undefined, method: 'other' }); EXP.picked = new Set(); }
      } });
      const bar = _xe('div', 'xp-pack'); bar.appendChild(go); el.appendChild(bar);
    },
    actions: [{ label: 'Close' }],
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
