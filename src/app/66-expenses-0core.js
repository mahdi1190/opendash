/* ============================================================
   EXPENSES, the core (2.18.1). Money you spent for someone else (an employer, a client, a friend) and are
   waiting to be paid back: label a transaction or add one by hand, keep the receipt, send a claim, and
   OpenDash notices when the money arrives. Server side: lib/expenses.mjs + server/routes/expenses.mjs
   (<data>/expenses/expenses.json, private, synced end-to-end only, never shown to friends).
   Files: 66-expenses-0core.js (this: data, API, tasks, paid-back scan, hooks), 66-expenses-1page.js (the
   Money > Expenses page and its dialogs), 66-expenses-2widget.js (the Owed to you widget, the task panel, hints).

     window.Expenses = { load, data, owed(), open(view), add(prefill), fromTransaction(tx), fromTask(id),
                         txAction(tx) -> button, txChip(tx) -> chip, financeUpdated(), forTask(id) }
   Hooks into other files are all guarded (typeof ... === 'function'): setStatus (20-task-model.js), the task
   menu (32-tasks-ui.js), the task panel (60-task-detail.js), Finances' transaction rows (src/finance/37),
   syncedFilesChanged (56-remote-jobs.js).
   ============================================================ */
const EXP = { data: null, loaded: false, loading: null, at: 0, asks: [], error: '', currency: 'GBP', scanAt: 0, scanSig: '', q: '', payer: '', status: 'all', picked: new Set(), tab: 'all', sel: '' };

/* ---------- API ---------- */
async function expApi(path, body, o) {
  const r = await fetch('/api/expenses' + path, body === undefined ? { headers: { Accept: 'application/json' } } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) { /* not JSON */ }
  if (!r.ok || !j || j.ok === false) { const e = new Error((j && (j.error || j.message)) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
  return j;
}
function expSet(data) {
  if (!data) return;
  EXP.data = data; EXP.loaded = true; EXP.at = Date.now(); EXP.error = '';
}
async function expLoad(force) {
  if (EXP.loading) return EXP.loading;
  if (!force && EXP.loaded && Date.now() - EXP.at < 20000) return EXP.data;
  EXP.loading = expApi('').then((j) => { expSet(j.data); EXP.currency = j.currency || EXP.currency; return EXP.data; })
    .catch((e) => { EXP.error = netErrorReason(e, 'Expenses could not load'); EXP.loaded = true; return EXP.data; })
    .finally(() => { EXP.loading = null; expRepaint(); });
  return EXP.loading;
}
/** Repaint what shows expenses: the page, Home, the open task. */
function expRepaint() {
  try {
    if (state.view === 'expenses' || state.view === 'home' || state.selectedTaskId) { if (typeof render === 'function') render(); }
    else if (state.view === 'finance' && window.FinanceView && typeof FinanceView.repaintTabs === 'function') FinanceView.repaintTabs();   // the count on Money's Expenses tab
  } catch (e) { console.error('[expenses] repaint', e); }
}
/**
 * One change: call the server, keep the new data, and say what happened with an Undo.
 * o: {done: 'text', quiet: true, after(res), undoExtra()} - undoExtra runs after the server's undo (tasks).
 */
async function expDo(path, body, o) {
  o = o || {};
  let j;
  try { j = await expApi(path, body); }
  catch (e) { if (typeof toastError === 'function') toastError(o.what || 'save that', e, o.retry); else toast(netErrorMessage(e), { kind: 'err' }); return null; }
  expSet(j.data);
  if (!o.quiet && o.done) toast(o.done, { icon: o.icon || 'receipt', action: j.undo ? { label: 'Undo', run: () => expUndo(j.undo, o.undoExtra) } : undefined });
  expRepaint();
  return j;
}
async function expUndo(token, extra) {
  try { const j = await expApi('/undo', { undo: token }); expSet(j.data); if (typeof extra === 'function') extra(); toast('Undone', { icon: 'undo-2' }); }
  catch (e) { toast(netErrorMessage(e, 'That cannot be undone any more.'), { kind: 'err' }); }
  expRepaint();
}

/* ---------- small helpers ---------- */
function expMoney(n, cur) {
  const c = cur || EXP.currency || 'GBP';
  try { return new Intl.NumberFormat((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || 'en-GB', { style: 'currency', currency: c }).format(Number(n) || 0); } catch (e) { return (Number(n) || 0).toFixed(2); }
}
function expItems() { return EXP.data ? EXP.data.items : []; }
function expItem(id) { return expItems().find(e => e.id === id) || null; }
function expPrefs() { return (EXP.data && EXP.data.prefs) || { autoTasks: true, hints: true, reminders: true, mileageRate: 0.45, checkDays: 14, windowDays: 60 }; }
function expPayerKey(n) { return String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function expPayer(name) { const k = expPayerKey(name); return (EXP.data && EXP.data.payers.find(p => p.key === k)) || null; }
function expForTask(taskId) { return expItems().filter(e => (e.taskIds || []).includes(taskId) || (e.tasks && (e.tasks.submit === taskId || e.tasks.check === taskId))); }
function expForTx(tx) {
  if (!tx) return null;
  const key = expTxKey(tx);
  return expItems().find(e => e.source && ((e.source.txKey && e.source.txKey === key) || (tx.k && e.source.k === tx.k))) || null;
}
/** The finance de-dup key of a transaction row of the Finances view ({d, a, acct, memo}); lib/expenses.mjs txKeyOf. */
function expTxKey(tx) { return `${tx.d}|${Number(tx.a).toFixed(2)}|${tx.acct == null ? '' : tx.acct}|${String(tx.memo == null ? '' : tx.memo).toUpperCase()}`.slice(0, 300); }
function expAgo(iso) {
  if (!iso) return '';
  const n = Math.max(0, Math.round((Date.parse(todayStr() + 'T12:00:00Z') - Date.parse(iso + 'T12:00:00Z')) / 86400000));
  return n === 0 ? 'today' : n === 1 ? 'yesterday' : n < 14 ? `${n} days ago` : n < 60 ? `${Math.round(n / 7)} weeks ago` : `${Math.round(n / 30)} months ago`;
}
function expAddDays(iso, n) { return new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
/** The next claim deadline of a payer on or after today (lib/expenses.mjs nextDeadline). */
function expDeadline(payerName) {
  const p = expPayer(payerName); const today = todayStr();
  if (!p || !p.deadline) return null;
  const [y, m] = today.split('-').map(Number);
  if (p.deadline.mode === 'monthEnd') return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  if (p.deadline.mode === 'day') { const here = `${y}-${String(m).padStart(2, '0')}-${String(p.deadline.day).padStart(2, '0')}`; return here >= today ? here : new Date(Date.UTC(y, m, p.deadline.day)).toISOString().slice(0, 10); }
  return null;
}
/** Owed to you: {total, count, toClaim, submitted, oldest, oldestDays, payers[]} from the loaded data (nothing loaded: null). */
function expOwed() { return EXP.data ? EXP.data.summary : null; }
function expTitleFromTask(title) {
  // "Expense the Anker 140W charger £59.99" -> {title, amount}
  const t = String(title || '').trim();
  const m = /[£$€]\s?(\d+(?:[.,]\d{1,2})?)|(\d+(?:\.\d{2}))\s?(?:gbp|pounds|quid)\b/i.exec(t);
  const amount = m ? Number((m[1] || m[2]).replace(',', '.')) : null;
  let name = t.replace(/[£$€]\s?\d+(?:[.,]\d{1,2})?/g, '').replace(/\b\d+\.\d{2}\s?(?:gbp|pounds|quid)?\b/gi, '')
    .replace(/^\s*(?:to\s+)?(?:expense|claim|submit expense|reimburse(?:ment)?(?: for)?)[:\s-]*(?:the|my|a)?\s*/i, '').replace(/\s*\b(?:to|from|on|with)\s+[A-Z][\w-]+\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  return { title: name || t, amount };
}

/* ---------- tasks (Submit expense / Check paid) ---------- */
function expMakeTasks(e) {
  if (typeof addCustomTask !== 'function') return null;
  const prefs = expPrefs(), today = todayStr();
  const dl = expDeadline(e.payer);
  const submitDue = dl ? (expAddDays(dl, -2) < today ? today : expAddDays(dl, -2)) : expAddDays(today, 3);
  const checkDue = expAddDays(submitDue, (expPayer(e.payer) && expPayer(e.payer).checkDays) || prefs.checkDays || 14);
  const who = e.payer || 'they';
  const submit = addCustomTask('Submit expense: ' + e.title, submitDue, 'p0', [], null, 'none', {});
  const check = addCustomTask(`Check ${who} paid: ${e.title}`, checkDue, 'p0', [], null, 'none', {});
  return { submit, check };
}
function expCloseTask(id, done) {
  try { if (id && getItem(id) && typeof setStatus === 'function' && (statusOf(id) === 'done') !== done) setStatus(id, done ? 'done' : 'todo'); } catch (e) { console.error('[expenses] task', e); }
}
/** The task hook (setStatus in 20-task-model.js): finishing "Submit expense" offers to mark the expense submitted. */
function expensesOnTaskDone(taskId) {
  if (!EXP.loaded) return;
  const e = expItems().find(x => x.status === 'to-claim' && x.tasks && x.tasks.submit === taskId);
  if (!e) return;
  setTimeout(() => toast(`Mark “${e.title}” as submitted?`, { icon: 'send', timeout: 9000, action: { label: 'Mark submitted', run: () => expSubmit([e.id], { payer: e.payer, method: 'other', fromTask: true }) } }), 400);
}

/* ---------- create / change ---------- */
/** Make an expense (fields as lib/expenses.mjs cleanExpense) and, when the setting is on, its two tasks. */
async function expCreate(fields, o) {
  o = o || {};
  const j = await expDo('/create', { expense: fields }, { quiet: true, what: 'add the expense' });
  if (!j) return null;
  let made = null;
  if (expPrefs().autoTasks && o.tasks !== false && j.expense) {
    made = expMakeTasks(j.expense);
    if (made && made.submit) await expApi('/update', { id: j.id, patch: { tasks: { submit: made.submit, check: made.check }, taskIds: [made.submit, made.check].filter(Boolean) } }).then(r => expSet(r.data)).catch(() => {});
  }
  toast(`Added ${expMoney(j.expense.amount, j.expense.currency)} to claim${j.expense.payer ? ' from ' + j.expense.payer : ''}`, { icon: 'receipt', timeout: 7000,
    action: { label: 'Undo', run: () => expUndo(j.undo, () => { if (made) { if (made.submit) deleteTask(made.submit, { quiet: true }); if (made.check) deleteTask(made.check, { quiet: true }); } }) } });
  expRepaint();
  return j.expense;
}
async function expSubmit(ids, o) {
  o = o || {};
  const list = ids.map(expItem).filter(Boolean);
  const j = await expDo('/submit', { ids, payer: o.payer, method: o.method || 'other', date: o.date, note: o.note }, { quiet: true, what: 'mark that as submitted' });
  if (!j) return null;
  const back = expSubmitTasks(list, o);
  toast(`Marked ${list.length} as submitted · ${expMoney(j.claim.total)}`, { icon: 'send', action: { label: 'Undo', run: () => expUndo(j.undo, back) } });
  return j;
}
/** Expenses went to submitted: their "Submit" tasks are done, their "Check it was paid" tasks count from now. -> a function that puts that back. */
function expSubmitTasks(list, o) {
  o = o || {};
  const closed = [], moved = [];
  for (const e of list) {
    if (e.tasks && e.tasks.submit && getItem(e.tasks.submit) && statusOf(e.tasks.submit) !== 'done') { closed.push(e.tasks.submit); expCloseTask(e.tasks.submit, true); }
    const ck = e.tasks && e.tasks.check && getItem(e.tasks.check);
    if (ck) { moved.push([ck.id, ck.dueDate]); ck.dueDate = expAddDays(o.date || todayStr(), (expPayer(o.payer || e.payer) && expPayer(o.payer || e.payer).checkDays) || expPrefs().checkDays || 14); }
  }
  if (moved.length && typeof saveData === 'function') saveData();
  return () => { closed.forEach(id => expCloseTask(id, false)); moved.forEach(([id, d]) => { const t = getItem(id); if (t) t.dueDate = d; }); if (typeof saveData === 'function') saveData(); };
}
/** After money arrived: the Check tasks of those expenses are done. */
function expCompleteChecks(ids) {
  const reopened = [];
  for (const id of ids || []) { const e = expItem(id); const t = e && e.tasks && e.tasks.check; if (t && getItem(t) && statusOf(t) !== 'done') { expCloseTask(t, true); reopened.push(t); } }
  return () => reopened.forEach(t => expCloseTask(t, false));
}
async function expMarkPaid(ids, date) {
  const j = await expDo('/paid', { ids, date }, { quiet: true, what: 'mark that as paid' });
  if (!j) return null;
  const back = expCompleteChecks(ids);
  toast(`Marked ${ids.length === 1 ? 'it' : ids.length} as paid`, { icon: 'circle-check', action: { label: 'Undo', run: () => expUndo(j.undo, back) } });
  return j;
}
async function expDelete(ids) {
  const list = ids.map(expItem).filter(Boolean);
  const taskIds = list.flatMap(e => [e.tasks && e.tasks.submit, e.tasks && e.tasks.check].filter(Boolean)).filter(id => getItem(id) && statusOf(id) !== 'done');
  const j = await expDo('/delete', { ids }, { quiet: true, what: 'delete that' });
  if (!j) return null;
  const bin = []; for (const id of taskIds) { const t = getItem(id); if (t) { bin.push(Date.now()); deleteTask(id, { quiet: true }); } }
  toast(list.length === 1 ? `Deleted “${list[0].title}”` : `Deleted ${list.length} expenses`, { icon: 'trash-2', action: { label: 'Undo', run: () => expUndo(j.undo, () => {
    const last = (state.bin && state.bin.tasks) || []; for (const id of taskIds) { const b = last.find(x => x.id === id); if (b && typeof restoreTask === 'function') restoreTask(b.binTs, { quiet: true }); } }) } });
  return j;
}

/* ---------- expense reports (2.21: undo in one go, at any time, even after a restart) ---------- */
/** Undo a report: its expenses go back to To claim. Its folder stays until Delete report. */
async function expReportUndo(id) {
  const j = await expDo('/report/undo', { id }, { quiet: true, what: 'undo the report' });
  if (!j) return null;
  const reopened = [];
  for (const eid of j.ids || []) {
    const e = expItem(eid); if (!e || !e.tasks) continue;
    for (const t of [e.tasks.submit, e.tasks.check]) if (t && getItem(t) && statusOf(t) === 'done') { expCloseTask(t, false); reopened.push(t); }
  }
  const n = j.changed || 0;
  toast(n ? `${n} expense${n === 1 ? ' is' : 's are'} back in To claim` : 'Report undone', { icon: 'undo-2', timeout: 9000, action: j.undo ? { label: 'Undo', run: () => expUndo(j.undo, () => reopened.forEach(t => expCloseTask(t, true))) } : undefined });
  return j;
}
/** Delete a report for good, after asking: its PDF and zip go from the computer. The expenses stay as they are. */
async function expReportDelete(r) {
  const yes = await confirmDialog({ title: 'Delete this report?',
    text: `This deletes the PDF and the receipts zip from your computer, and it cannot be undone. Your expenses stay as they are.${r.undoneAt ? '' : ' If you only made it by accident, choose Undo instead.'}`,
    confirmLabel: 'Delete report', cancelLabel: 'Keep it', danger: true });
  if (!yes) return null;
  const j = await expDo('/report/delete', { id: r.id }, { quiet: true, what: 'delete the report' });
  if (j) toast(j.gone ? 'Taken off the list. The folder was not on this computer.' : j.kept ? 'Report deleted. Other files you put in its folder are still there.' : 'Report deleted', { icon: 'trash-2' });
  return j;
}
function expReportOpen(id) { return expApi('/report/open', { id }).catch(e => toast(e.message || netErrorMessage(e), { kind: 'err' })); }

/* ---------- receipts ---------- */
function expReadFile(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('That file could not be read.')); r.readAsDataURL(file); });
}
async function expUploadReceipt(id, file) {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) { toast('That file is over 5 MB. Try a smaller photo or a PDF.', { kind: 'err' }); return null; }
  let data; try { data = await expReadFile(file); } catch (e) { toast(e.message, { kind: 'err' }); return null; }
  return expDo('/receipt', { id, name: file.name, data }, { done: 'Receipt added', icon: 'paperclip', what: 'add the receipt' });
}
/** Files dropped or pasted onto an element: PDFs and pictures go to expense `getId()`. */
function expAcceptFiles(el, getId) {
  const take = (files) => { const id = getId(); if (!id) return; [...files].filter(f => /^(image\/|application\/pdf)/.test(f.type) || /\.pdf$/i.test(f.name)).slice(0, 6).forEach(f => expUploadReceipt(id, f)); };
  el.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); el.classList.add('xp-drop'); } });
  el.addEventListener('dragleave', () => el.classList.remove('xp-drop'));
  el.addEventListener('drop', (e) => { el.classList.remove('xp-drop'); if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); take(e.dataTransfer.files); } });
  el.addEventListener('paste', (e) => { const fs = e.clipboardData && e.clipboardData.files; if (fs && fs.length) { e.preventDefault(); take(fs); } });
}
function expPickFile(id) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf,image/*'; inp.multiple = true;
  inp.onchange = () => [...inp.files].forEach(f => expUploadReceipt(id, f));
  inp.click();
}

/* ---------- the claim pack ---------- */
async function expPack(body, format) {
  try {
    if (format === 'text') { const j = await expApi('/pack', { ...body, format }); return copyText(j.text, 'Summary'); }
    const r = await fetch('/api/expenses/pack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, format }) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).error; } catch (e) { /* no body */ } throw new Error(m || 'HTTP ' + r.status); }
    const blob = await r.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = { zip: 'expense-claim.zip', html: 'expense-claim.html', csv: 'expenses.csv' }[format] || 'expenses';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(format === 'zip' ? 'Claim pack downloaded' : 'Downloaded', { icon: 'download' });
    return true;
  } catch (e) { if (typeof toastError === 'function') toastError('make the pack', e); else toast(netErrorMessage(e), { kind: 'err' }); return false; }
}

/* ---------- paid back? (the scan) ---------- */
/** Ask the server to match money in to open claims. Confident matches are marked paid (with Undo); doubtful ones become one question. */
async function expScan(force) {
  if (!EXP.loaded || !expItems().some(e => e.status === 'submitted')) { EXP.asks = []; return; }
  if (!force && Date.now() - EXP.scanAt < 60000) return;
  EXP.scanAt = Date.now();
  let j; try { j = await expApi('/scan', {}); } catch (e) { return; }
  expSet(j.data);
  EXP.asks = j.ask || [];
  if (j.auto && j.auto.length) {
    const ids = j.auto.flatMap(a => a.expenseIds);
    const back = expCompleteChecks(ids);
    const a = j.auto[0];
    toast(`${expMoney(j.auto.reduce((s, x) => s + x.amount, 0))} from ${a.payer} arrived: marked as paid`, { icon: 'circle-check', timeout: 12000, action: { label: 'Undo', run: () => expUndo(j.undo, back) } });
  }
  expRepaint();
}
function expAnswer(ask, yes) {
  EXP.asks = EXP.asks.filter(a => a.askId !== ask.askId);
  return expDo('/answer', { ask, yes }, { quiet: !yes, done: yes ? 'Marked as paid' : '', icon: 'circle-check', what: 'save your answer' }).then((j) => {
    if (j && yes) { const back = expCompleteChecks(ask.expenseIds); if (j.undo) toast('Marked as paid', { icon: 'circle-check', action: { label: 'Undo', run: () => expUndo(j.undo, back) } }); }
    return j;
  });
}
/** Finances loaded new data (src/finance/04-data.js) or another computer sent some: look for the payment. */
function expFinanceUpdated() { if (!EXP.loaded) return; EXP.scanAt = 0; expScan(true); }

/* ---------- hints (Expense? on a transaction) ---------- */
function expNorm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
/** 'merchant' (expensed before), 'trip' (a work trip in the calendar that day) or '' for a spending row {k, m, d, a}. */
function expHintFor(tx) {
  const p = expPrefs();
  if (!EXP.loaded || !p.hints || !tx || !(Number(tx.a) < 0) || tx.kind === 'income' || tx.kind === 'transfer') return '';
  if (expForTx(tx)) return '';
  const hints = (EXP.data && EXP.data.hints) || {};
  const m = expNorm(tx.m);
  if (hints['tx:' + tx.k] || (m && hints['m:' + m])) return '';
  if (m && expItems().some(e => e.merchant && expNorm(e.merchant) === m)) return 'merchant';
  try {
    if (typeof calEventsOn === 'function' && /^\d{4}-\d{2}-\d{2}$/.test(tx.d || '')) {
      for (const d of [tx.d, expAddDays(tx.d, -1)]) if (calEventsOn(d).some(ev => /\b(trip|business trip|conference|offsite|off-site|client visit|site visit|work travel|away day)\b/i.test(String(ev.title || ev.summary || '')))) return 'trip';
    }
  } catch (e) { /* no calendar */ }
  return '';
}
function expDismissHint(tx) {
  const m = expNorm(tx.m);
  return expApi('/hint', { key: 'tx:' + tx.k }).then(j => { expSet(j.data); expRepaint(); }).catch(() => {});
}

/* ---------- entry points ---------- */
function expOpen(view) { if (typeof setView === 'function') setView(view || 'expenses'); }
window.Expenses = {
  load: expLoad, get data() { return EXP.data; }, owed: expOwed, open: expOpen,
  add: (prefill) => (typeof expAddDialog === 'function' ? expAddDialog(prefill) : null),
  fromTransaction: (tx) => (typeof expAddDialog === 'function' ? expAddDialog(expPrefillFromTx(tx)) : null),
  fromTransactions: expFromTransactions,
  fromTask: (id) => (typeof expAddDialog === 'function' ? expAddDialog(expPrefillFromTask(id)) : null),
  txAction: (tx) => (typeof expTxButton === 'function' ? expTxButton(tx) : null),
  txChip: (tx) => (typeof expTxChip === 'function' ? expTxChip(tx) : null),
  financeUpdated: expFinanceUpdated, forTask: expForTask,
};
/** Mark several transactions as expenses: one question (who pays you back), one request, one Undo (POST /create-batch). */
function expFromTransactions(rows, after) {
  const fresh = rows.filter(x => x && x.a < 0 && !expForTx(x));
  if (!fresh.length) { toast('Those are expenses already, or are not payments out.'); return; }
  let payer;
  openDialog({
    title: `Expense ${fresh.length} payment${fresh.length === 1 ? '' : 's'}`, size: 'sm',
    body(el) {
      el.className += ' xp-form';
      const w = document.createElement('label'); w.className = 'xp-f';
      const l = document.createElement('span'); l.className = 'xp-fl'; l.textContent = 'Who pays you back?';
      payer = document.createElement('input'); payer.className = 'xp-in'; payer.type = 'text'; payer.placeholder = 'e.g. your employer'; payer.autocomplete = 'off';
      if (EXP.data && EXP.data.payers.length) payer.value = EXP.data.payers[0].name;
      w.append(l, payer); el.appendChild(w);
      if (fresh.length < rows.length) { const n = document.createElement('p'); n.className = 'xp-fh'; n.textContent = `${rows.length - fresh.length} of what you selected ${rows.length - fresh.length === 1 ? 'is' : 'are'} left out: already an expense, or money in.`; el.appendChild(n); }
      setTimeout(() => payer.focus(), 30);
    },
    actions: [{ label: 'Cancel' }, { label: 'Add expenses', primary: true, icon: 'check', run: async () => {
      if (!payer.value.trim()) { payer.focus(); toast('Say who pays you back.', { kind: 'err' }); return false; }
      const who = payer.value.trim();
      const expenses = fresh.map(x => Object.assign(expPrefillFromTx(x), { payer: who }));
      // The two tasks of each, when that setting is on: made first, so they go in with the one request.
      const made = [];
      if (expPrefs().autoTasks) for (const f of expenses) { const m = expMakeTasks(f); if (m && m.submit) { made.push(m.submit, m.check); f.tasks = { submit: m.submit, check: m.check }; f.taskIds = [m.submit, m.check].filter(Boolean); } }
      const dropTasks = () => { for (const id of made) if (id && getItem(id)) deleteTask(id, { noSave: true }); if (made.length) { saveData(); render(); } };
      const j = await expDo('/create-batch', { expenses }, { quiet: true, what: 'add the expenses' });
      if (!j) { dropTasks(); return false; }
      const n = (j.ids || []).length;
      toast(`Added ${n} expense${n === 1 ? '' : 's'} to claim from ${who}`, { icon: 'receipt', timeout: 7000, action: { label: 'Undo', run: () => expUndo(j.undo, dropTasks) } });
      expRepaint();
      if (typeof after === 'function') after();
      return undefined;
    } }],
  });
}
function expPrefillFromTx(tx) {
  return { title: tx.m || 'Expense', merchant: tx.m || '', amount: Math.abs(Number(tx.a)), date: tx.d, source: { type: 'tx', txKey: expTxKey(tx), k: tx.k }, note: '' };
}
function expPrefillFromTask(id) {
  const t = getItem(id); if (!t) return {};
  const p = expTitleFromTask(effTitle(t));
  return { title: p.title, amount: p.amount || '', date: todayStr(), source: { type: 'task' }, taskIds: [id], fromTask: id };
}
/** Another computer changed the expenses or a receipt arrived (56-remote-jobs.js syncedFilesChanged). */
function expensesFilesChanged(rels) {
  if (!EXP.loaded) return;
  if ((rels || []).some(r => r === 'expenses/expenses.json')) expLoad(true); else expRepaint();
}
window.addEventListener('focus', () => { if (EXP.loaded && Date.now() - EXP.at > 60000) expLoad(true); });
