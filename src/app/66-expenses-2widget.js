/* ============================================================
   EXPENSES, the surfaces around the page (2.18.1): the "Owed to you" Home widget, the expense chip in the
   task panel and "Make this an expense" in the task menu, and Finances' Expense button and "Expense?" hint.
   ============================================================ */
registerHomeWidget({
  id: 'owed', title: 'Owed to you', icon: 'receipt', order: 175, group: 'money', page: 'expenses',
  description: 'What you have spent for others and are waiting to be paid back',
  emptyHint: 'Appears when an expense is waiting to be paid back (Money > Expenses)',
  sizes: ['s', 'm'], defaultSize: 's', defaultHidden: false, gate: 'finance',
  aliases: ['expenses', 'owed', 'reimbursement', 'claims', 'paid back'],
  render(el, ctx) { return _xwRender(el, ctx || {}); },
});
function _xwRender(el, ctx) {
  if (ctx.preview) { return _xwCard(el, ctx, { total: 59.99, count: 1, toClaimCount: 1, submittedCount: 0, oldestDays: 3, payers: [{ payer: 'Acme', total: 59.99, count: 1, toClaim: 1, submitted: 0 }] }); }
  if (!EXP.loaded) { expLoad(); return false; }
  const s = EXP.data && EXP.data.summary;
  if (!s || !s.count) return false;
  expScan(false);
  return _xwCard(el, ctx, s);
}
function _xwCard(el, ctx, s) {
  const card = _xe('section', `card home-card xw xw--${ctx.size || 's'}`);
  const h = _xe('div', 'card-h'); h.innerHTML = `${icon('receipt')}<h3 data-hw-title>Owed to you</h3><span class="spacer"></span>`; card.appendChild(h);
  const b = _xe('div', 'card-b xw-b'); card.appendChild(b);
  const money = typeof homeMoney === 'function' ? null : null;
  b.appendChild(_xe('div', 'xw-big num', esc(expMoney(s.total))));
  b.appendChild(_xe('div', 'xw-sub', `${s.count} expense${s.count === 1 ? '' : 's'}${s.toClaimCount ? ` · ${s.toClaimCount} to claim` : ''}${s.submittedCount ? ` · ${s.submittedCount} waiting` : ''}${s.oldestDays > 1 ? ` · oldest ${s.oldestDays} days` : ''}`));
  if (EXP.asks && EXP.asks[0] && !ctx.preview) b.appendChild(_xe('div', 'xw-ask', `${icon('circle-help', 'i-xs')} ${esc(expMoney(EXP.asks[0].amount))} from ${esc(EXP.asks[0].payer)} arrived. <button class="btn-link" type="button">Check</button>`));
  if (b.querySelector('.xw-ask button')) b.querySelector('.xw-ask button').onclick = () => expOpen('expenses');
  if (ctx.size === 'm') {
    const list = _xe('ul', 'xw-list');
    for (const p of s.payers.slice(0, 4)) list.appendChild(_xe('li', '', `<span>${esc(p.payer)}</span><span class="xw-n">${p.toClaim ? p.toClaim + ' to claim' : p.submitted + ' waiting'}</span><b class="num">${esc(expMoney(p.total))}</b>`));
    b.appendChild(list);
  }
  const acts = _xe('div', 'xw-acts');
  if (s.toClaimCount && !ctx.preview) acts.appendChild(uiButton({ label: 'Submit', icon: 'send', kind: 'primary', size: 'sm', run: () => expSubmitDialog(expItems().filter(e => e.status === 'to-claim').map(e => e.id)) }));
  acts.appendChild(uiButton({ label: 'View', icon: 'arrow-right', size: 'sm', run: () => { if (!ctx.preview) expOpen('expenses'); } }));
  b.appendChild(acts);
  el.appendChild(card);
  return true;
}

/* ---------- the task panel and menu ---------- */
function expTaskSection(taskId) {
  if (!EXP.loaded) { expLoad(); return null; }
  const list = expForTask(taskId);
  if (!list.length) return null;
  const sec = _xe('section', 'dp-sec xp-tasksec');
  sec.innerHTML = `<div class="dp-sec-h">${icon('receipt', 'i-sm')}<h4>Expense</h4></div>`;
  for (const e of list) {
    const row = _xe('div', 'xp-trow');
    row.innerHTML = `<span class="xp-tag st-${e.status}">${esc(XP_STATUS[e.status][0])}</span><span class="xp-t">${esc(e.title)}</span><b class="num">${esc(expMoney(e.amount, e.currency))}</b>`;
    row.appendChild(uiButton({ label: 'Open', size: 'sm', run: () => expOpen('expenses') }));
    sec.appendChild(row);
  }
  return sec;
}
function expTaskMenuItem(taskId) {
  const t = getItem(taskId); if (!t) return null;
  if (expForTask(taskId).length) return { label: 'Open its expense', icon: 'receipt', run: () => expOpen('expenses') };
  return { label: 'Make this an expense', icon: 'receipt', run: () => { if (!EXP.loaded) expLoad(); expAddDialog(expPrefillFromTask(taskId)); } };
}

/* ---------- Finances: the button and the hint on a transaction ---------- */
function expTxButton(tx) {
  if (!tx || !(Number(tx.a) < 0)) return null;
  if (!EXP.loaded) expLoad();
  const e = expForTx(tx);
  if (e) return uiButton({ label: `Expense · ${XP_STATUS[e.status][0]}`, icon: 'receipt', cls: 'fv-btn', tip: 'Open this expense', run: () => expAddDialog({ edit: e.id }) });
  return uiButton({ label: 'Expense', icon: 'receipt', cls: 'fv-btn', tip: 'Claim this back from someone', run: () => expAddDialog(expPrefillFromTx(tx)) });
}
function expTxChip(tx) {
  if (!EXP.loaded || !tx) return null;
  const e = expForTx(tx);
  if (e) { const s = _xe('span', 'xp-tag st-' + e.status, icon('receipt', 'i-xs') + esc(XP_STATUS[e.status][0])); s.title = 'Expense: ' + e.title; return s; }
  const hint = expHintFor(tx);
  if (!hint) return null;
  const w = _xe('span', 'xp-hintchip');
  const go = _xe('button', 'xp-hintb', icon('receipt', 'i-xs') + 'Expense?'); go.type = 'button'; go.title = hint === 'trip' ? 'You were on a work trip' : 'You have expensed this merchant before';
  go.onclick = (ev) => { ev.stopPropagation(); expAddDialog(expPrefillFromTx(tx)); };
  const no = _xe('button', 'xp-hintx', icon('x', 'i-xs')); no.type = 'button'; no.title = 'Not an expense'; no.setAttribute('aria-label', 'Dismiss this hint');
  no.onclick = (ev) => { ev.stopPropagation(); w.remove(); expDismissHint(tx); };
  w.append(go, no);
  return w;
}
setTimeout(() => { try { expLoad(); } catch (e) { /* later */ } }, 2500);
