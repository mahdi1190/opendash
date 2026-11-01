/* ============================================================
   OWED TO ME, the core. You paid for bowling: split it, see who owes what, and OpenDash watches the bank for the
   money and asks ("We think Sam paid"). It never marks anything by itself unless you turn that on, and sends nothing unless
   you press Send (66-owed-6friends.js). Also: what you owe, money you expect back, trips, settling up.
   Server side: lib/owed.mjs + server/routes/owed.mjs (<data>/expenses/owed.json, private, synced end-to-end only).
   Files: 66-owed-0core.js (this: data, API, the sum, hooks), 66-owed-1page.js (Money > Owed to me),
   66-owed-2split.js (the split screen), 66-owed-3more.js (reminders, settling up, money expected, the widget),
   66-owed-4pay.js (what one bank payment was for: in any amounts, for anyone, changed later),
   66-owed-5repeat.js (rent and bills: a regular payment that splits by itself),
   66-owed-6friends.js (one person's part, shared with them on Freeflo, on your press),
   66-owed-7receipt.js (a receipt: read it or type it in, tap who had what),
   66-owed-8extras.js (quiet notes from your own splits, and the settle-up card as a picture).

     window.Owed = { load, summary(), open(), split(prefill), fromTransactions(rows, after), txAction(tx), txChip(tx),
                     financeUpdated(), briefLine() }
   Hooks into other files are guarded: Money's tabs (src/finance/12-bar.js), Transactions (src/finance/37), Expenses'
   row menu (66-expenses-1page.js), syncedFilesChanged (56-remote-jobs.js), My money's widget (src/finance/39-board-widgets.js).
   ============================================================ */
const OWD = { chased: new Set(), data: null, loaded: false, loading: null, at: 0, error: '', currency: 'GBP', suggestions: [], offers: [], leftOut: [], connected: null, scanAt: 0, view: 'people', q: '', picked: new Set(), showAllSug: false, showDone: false };

/* ---------- API ---------- */
async function owdApi(path, body) {
  const r = await fetch('/api/owed' + path, body === undefined ? { headers: { Accept: 'application/json' } } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) { /* not JSON */ }
  if (!r.ok || !j || j.ok === false) { const e = new Error((j && (j.error || j.message)) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
  return j;
}
function owdSet(j) {
  if (!j) return;
  if (j.data) { OWD.data = j.data; OWD.loaded = true; OWD.at = Date.now(); OWD.error = ''; owdCloseChaseTasks(); }
  if (Array.isArray(j.suggestions)) OWD.suggestions = j.suggestions;
  if (Array.isArray(j.offers)) OWD.offers = j.offers;
  if (Array.isArray(j.notices)) OWD.notices = j.notices;
  if (Array.isArray(j.leftOut)) OWD.leftOut = j.leftOut;
  if (j.connected != null) OWD.connected = j.connected;
  // What is matched changed: the analysis was built again, so what Money shows moves too.
  if (j.rebuilt) { OWD.scanAt = Date.now(); try { if (window.FinanceView && window.FinanceView.refresh) window.FinanceView.refresh(); } catch (e) { /* not loaded yet */ } }
}
async function owdLoad(force) {
  if (OWD.loading) return OWD.loading;
  if (!force && OWD.loaded && Date.now() - OWD.at < 20000) return OWD.data;
  OWD.loading = owdApi('').then((j) => { owdSet(j); OWD.currency = j.currency || OWD.currency; return OWD.data; })
    .catch((e) => { OWD.error = netErrorReason(e, 'This could not load'); OWD.loaded = true; return OWD.data; })
    .finally(() => { OWD.loading = null; owdRepaint(true); });
  return OWD.loading;
}
function owdRepaint(background) {
  if (background && document.querySelector('.modal')) { clearTimeout(OWD.repaintT); OWD.repaintT = setTimeout(() => owdRepaint(true), 1000); return; }
  try {
    if (state.view === 'owed' || state.view === 'home') { if (typeof render === 'function') render(); }
    else if (state.view === 'finance' && window.FinanceView && window.FinanceView.repaintTabs) window.FinanceView.repaintTabs();
  } catch (e) { console.error('[owed] repaint', e); }
}
/** One change: call the server, keep the answer, say what happened with an Undo. o: {done, icon, what, quiet, undoExtra()}. */
async function owdDo(path, body, o) {
  o = o || {};
  let j;
  try { j = await owdApi(path, body); }
  catch (e) { if (typeof toastError === 'function') toastError(o.what || 'save that', e, o.retry); else toast(netErrorMessage(e), { kind: 'err' }); return null; }
  owdSet(j);
  if (!o.quiet && o.done) toast(o.done, { icon: o.icon || 'handshake', timeout: 8000, action: j.undo ? { label: 'Undo', run: () => owdUndo(j.undo, o.undoExtra) } : undefined });
  owdRepaint();
  owdMoneyChanged();
  return j;
}
async function owdUndo(token, extra) {
  try { const j = await owdApi('/undo', { undo: token }); owdSet(j); if (typeof extra === 'function') await extra(); toast('Undone', { icon: 'undo-2' }); }
  catch (e) { toast(netErrorMessage(e, 'That cannot be undone any more.'), { kind: 'err' }); }
  owdRepaint();
  owdMoneyChanged();
}
/** Look at the bank: what arrived, what could be split. The page, Home and each finance update ask. */
async function owdScan(force) {
  if (!force && Date.now() - OWD.scanAt < 60000) return;
  OWD.scanAt = Date.now();
  let j; try { j = await owdApi('/scan', {}); } catch (e) { return; }
  owdSet(j);
  owdRepeatsMade(j);
  owdNoticeToast();
  try { if (state.view === 'finance' && window.FinanceView && window.FinanceView.pendingNotices) window.FinanceView.pendingNotices(); } catch (e) { /* not loaded yet */ }
  if (j.auto && j.auto.length) {
    const a = j.auto[0];
    toast(j.auto.length === 1 ? `${owdMoney(a.amount)} from ${a.name} arrived: marked as paid` : `${j.auto.length} payments arrived and were marked as paid`, { icon: 'circle-check', timeout: 12000, action: j.undo ? { label: 'Undo', run: () => owdUndo(j.undo) } : undefined });
  }
  owdRepaint(true);
}
function owdFinanceUpdated() { if (Date.now() - OWD.scanAt > 1500) owdScan(true); }

/* ---------- small helpers ---------- */
function owdMoney(n, cur) { return expMoney(n, cur || OWD.currency); }
/** An amount that Hide amounts blurs. */
function owdAmt(n, cur) { return homeAmtHtml(owdMoney(n, cur)); }
function owdThings() { return OWD.data ? OWD.data.things : []; }
function owdThing(id) { return owdThings().find(t => t.id === id) || null; }
function owdPrefs() { return (OWD.data && OWD.data.prefs) || { autoMark: false, netSpending: true, offers: true, chaseTasks: false, chaseDays: 7, oldDays: 30, offerMin: 30, bankDetails: '', sendBank: false, payLink: '' }; }
function owdKey(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
function owdForTx(tx) { return tx ? owdThings().find(t => t.source && ((tx.k && t.source.k === tx.k) || (t.source.txKey && t.source.txKey === expTxKey(tx)))) || null : null; }
function owdFirstName(n) { return String(n || '').trim().split(/\s+/)[0] || 'them'; }
const OWD_STATUS = { wait: ['Waiting', 'clock'], think: ['We think they paid', 'circle-help'], paid: ['Paid', 'circle-check'], part: ['Part paid', 'circle-dot'], off: ['Written off', 'x'] };
function owdAgo(days) { return days <= 1 ? (days ? 'yesterday' : 'today') : days < 14 ? `${days} days ago` : days < 60 ? `${Math.round(days / 7)} weeks ago` : `${Math.round(days / 30)} months ago`; }
/** Someone on OpenDash too (by the name you know them by): marked on the row. Nothing is sent to them unless you share it. */
function owdFriend(name) {
  try {
    const list = (typeof _fr !== 'undefined' && _fr.data && _fr.data.friends) || [];
    const n = String(name || '').trim().toLowerCase();
    return !!n && list.some(f => friendName(f).trim().toLowerCase() === n);
  } catch (e) { return false; }
}
/** The people to offer: those you split with lately, then People. [{name, pid, key}] */
function owdCandidates() {
  const seen = new Set(), out = [];
  const shops = new Set(), friends = new Set();
  for (const t of owdThings()) for (const l of t.lines) (t.kind === 'expect' ? shops : friends).add(l.key);
  for (const p of (OWD.data ? OWD.data.people : []).filter(x => friends.has(x.key) || !shops.has(x.key))) { if (!seen.has(p.key)) { seen.add(p.key); out.push({ name: p.name, pid: p.pid || '', key: p.key, recent: true }); } }
  const ppl = (typeof state !== 'undefined' && Array.isArray(state.people) ? state.people : []).filter(p => p && p.name && !p.self && !p.inactive && (!p.kind || p.kind === 'person')).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  for (const p of ppl) { const key = owdKey(p.name); if (!seen.has(key)) { seen.add(key); out.push({ name: p.name, pid: p.id, key }); } }
  return out;
}

/**
 * The sum, for the live preview (lib/owed.mjs computeSplit is the one that counts; keep them the same).
 * people [{key, weight, pct, exact, extra}], o {method, meIn, myWeight, myExtra} -> {lines: Map key -> pence, me, rounding, error}, in pence.
 */
function owdSplit(total, people, o) {
  const T = Math.round(Number(total) * 100 + 1e-9);
  if (!(T > 0)) return { error: 'Put in the amount.', lines: new Map(), me: 0, rounding: 0 };
  if (!people.length) return { error: 'Add at least one person.', lines: new Map(), me: T, rounding: 0 };
  const num = (v, d) => (v !== '' && v != null && Number(v) >= 0 ? Number(v) : (d || 0));
  const p100 = (v) => Math.round(num(v) * 100 + 1e-9);
  const pounds = (p) => owdMoney(p / 100, o.cur);
  const meIn = o.meIn !== false, lines = new Map();
  let me = 0, rounding = 0;
  if (o.method === 'shares') {
    const myW = meIn ? num(o.myWeight, 1) : 0, W = people.reduce((a, p) => a + num(p.weight, 1), myW);
    if (W <= 0) return { error: 'Give someone at least one share.', lines, me: T, rounding: 0 };
    let s = 0; for (const p of people) { const v = Math.floor(T * num(p.weight, 1) / W); lines.set(p.key, v); s += v; }
    me = T - s; rounding = me - Math.floor(T * myW / W);
  } else if (o.method === 'percent') {
    const pcts = people.reduce((a, p) => a + num(p.pct), 0);
    if (pcts > 100.001) return { error: `That adds up to ${Math.round(pcts * 10) / 10}%. Bring it down to 100%.`, lines, me: 0, rounding: 0 };
    if (!meIn && pcts < 99.999) return { error: `That adds up to ${Math.round(pcts * 10) / 10}%. Share out the other ${Math.round((100 - pcts) * 10) / 10}%, or turn on “I’m in it too”.`, lines, me: 0, rounding: 0 };
    let s = 0; for (const p of people) { const v = Math.floor(T * num(p.pct) / 100); lines.set(p.key, v); s += v; }
    me = T - s; rounding = meIn ? me - Math.floor(T * (100 - pcts) / 100) : me;
  } else if (o.method === 'exact') {
    let s = 0; for (const p of people) { const v = p100(p.exact); lines.set(p.key, v); s += v; }
    if (s > T) return { error: `That is ${pounds(s - T)} too much.`, lines, me: 0, rounding: 0 };
    me = T - s;
    if (!meIn && me > 0) return { error: `${pounds(me)} is not shared out yet. Add it to someone, or turn on “I’m in it too”.`, lines, me, rounding: 0 };
  } else if (o.method === 'items') {
    const E = people.reduce((a, p) => a + p100(p.extra), p100(o.myExtra));
    if (E > T) return { error: `The extras come to ${pounds(E - T)} more than the total.`, lines, me: 0, rounding: 0 };
    const rest = T - E, n = people.length + (meIn ? 1 : 0), base = Math.floor(rest / n);
    for (const p of people) lines.set(p.key, base + p100(p.extra));
    rounding = rest - base * n; me = (meIn ? base : 0) + rounding + p100(o.myExtra);
  } else {
    const n = people.length + (meIn ? 1 : 0), base = Math.floor(T / n);
    for (const p of people) lines.set(p.key, base);
    rounding = T - base * n; me = (meIn ? base : 0) + rounding;
  }
  return { lines, me, rounding };
}

/* ---------- reminder tasks (off unless asked for) ---------- */
function owdMakeChaseTasks(t) {
  if (typeof addCustomTask !== 'function' || !owdPrefs().chaseTasks || t.kind !== 'split') return null;
  const due = expAddDays(todayStr(), owdPrefs().chaseDays || 7), map = {};
  for (const l of t.lines) { const id = addCustomTask(`Chase ${owdFirstName(owdPersonName(l.key))}: ${owdMoney(l.owes)} for ${t.title}`, due, 'p0', [], null, 'none', {}); if (id) map[l.key] = id; }
  return Object.keys(map).length ? map : null;
}
function owdPersonName(key) { const p = OWD.data && OWD.data.people.find(x => x.key === key); return p ? p.name : key; }
/** A person paid: their "Chase" task is done. Not paid after all (or Undo): it comes back. */
function owdCloseChaseTasks() {
  if (typeof expCloseTask !== 'function') return;
  for (const t of owdThings()) for (const l of t.lines) {
    if (!l.taskId) continue;
    if (l.status === 'paid' || l.status === 'off') { if (!OWD.chased.has(l.taskId) && getItem(l.taskId) && statusOf(l.taskId) !== 'done') { OWD.chased.add(l.taskId); expCloseTask(l.taskId, true); } }
    else if (OWD.chased.delete(l.taskId)) expCloseTask(l.taskId, false);
  }
}
/** The thing goes, so its Chase tasks are done. -> a function that brings them back. */
function owdCloseTasksOf(t) {
  const ids = t.lines.map(l => l.taskId).filter(id => id && typeof getItem === 'function' && getItem(id) && statusOf(id) !== 'done');
  ids.forEach(id => expCloseTask(id, true));
  return () => ids.forEach(id => expCloseTask(id, false));
}
async function owdDeleteThing(t) {
  const j = await owdDo('/delete', { ids: [t.id] }, { quiet: true, what: 'delete that' });
  if (!j) return;
  const back = owdCloseTasksOf(t);
  toast(`Deleted “${t.title}”`, { icon: 'trash-2', timeout: 8000, action: { label: 'Undo', run: () => owdUndo(j.undo, back) } });
}
/** Open on Money: what a row says (its split, its note) changed, so the list is drawn again. */
function owdMoneyChanged() { if (state.view === 'finance' && window.FinanceView && window.FinanceView.refresh) window.FinanceView.refresh(); }

/* ---------- saving a split ---------- */
async function owdCreate(thing, o) {
  o = o || {};
  const j = await owdDo('/create', { thing, ...(o.receiptToken ? { receiptToken: o.receiptToken } : {}) }, { quiet: true, what: 'save that' });
  if (!j) return null;
  const t = owdThing(j.id) || j.thing;
  const tasks = owdMakeChaseTasks(t);
  if (tasks) await owdApi('/tasks', { id: j.id, map: tasks }).then(owdSet).catch(() => {});
  const dropTasks = () => { if (tasks) { for (const id of Object.values(tasks)) if (getItem(id)) deleteTask(id, { noSave: true }); saveData(); } };
  // Moved from Expenses: the expense goes, and Undo brings it back as well.
  let back = null;
  if (o.fromExpense) back = await owdExpenseGone(o.fromExpense);
  const left = t.lines.reduce((a, l) => a + l.owes, 0);
  toast(t.kind === 'iowe' ? `Noted: you owe ${t.lines[0].name || owdPersonName(t.lines[0].key)} ${owdMoney(left)}` : t.kind === 'expect' ? `Watching for ${owdMoney(t.total)}` : `Saved: ${owdMoney(left)} owed to you`, { icon: 'handshake', timeout: 9000,
    action: { label: 'Undo', run: () => owdUndo(j.undo, async () => { dropTasks(); if (back) await back(); }) } });
  owdRepaint();
  owdScan(true);
  return t;
}
/** Several payments split the same way (the bulk bar): one request, one Undo. */
async function owdCreateMany(things) {
  const j = await owdDo('/create-batch', { things }, { quiet: true, what: 'save those' });
  if (!j) return null;
  toast(`Split ${j.ids.length} payment${j.ids.length === 1 ? '' : 's'}${j.skipped ? ` (${j.skipped} left out: split already)` : ''}`, { icon: 'handshake', timeout: 9000, action: { label: 'Undo', run: () => owdUndo(j.undo) } });
  owdRepaint();
  owdScan(true);
  return j;
}
/** The expense has moved here: it and its open tasks go. -> a function that brings them back. */
async function owdExpenseGone(e) {
  const taskIds = [e.tasks && e.tasks.submit, e.tasks && e.tasks.check].filter(id => id && getItem(id) && statusOf(id) !== 'done');
  const r = await expDo('/delete', { ids: [e.id] }, { quiet: true, what: 'move that' });
  if (!r) return null;
  for (const id of taskIds) deleteTask(id, { quiet: true });
  return async () => {
    await expUndo(r.undo, () => { const bin = (state.bin && state.bin.tasks) || []; for (const id of taskIds) { const b = bin.find(x => x.id === id); if (b && typeof restoreTask === 'function') restoreTask(b.binTs, { quiet: true }); } });
  };
}
/** Back to Expenses: a split with nothing paid yet becomes the expense it was (or a new one). */
async function owdToExpense(t) {
  if (t.lines.some(l => l.paid > 0)) { toast('Someone has already paid towards this, so it stays here.', { kind: 'err' }); return; }
  const fields = t.fromExpense && t.fromExpense.id ? { ...t.fromExpense, status: undefined, claimId: undefined } : { title: t.title, amount: t.total, date: t.date, merchant: t.merchant || '', payer: t.lines.length === 1 ? t.lines[0].name : '', note: t.note || '', source: t.source && t.source.txKey ? { type: 'tx', txKey: t.source.txKey, k: t.source.k } : { type: 'manual' } };
  const made = await expDo('/create', { expense: fields }, { quiet: true, what: 'move that' });
  if (!made) return;
  const j = await owdDo('/delete', { ids: [t.id] }, { quiet: true, what: 'move that' });
  if (!j) return;
  const back = owdCloseTasksOf(t);
  toast(`Moved “${t.title}” to Expenses`, { icon: 'receipt', timeout: 9000, action: { label: 'Undo', run: () => owdUndo(j.undo, () => { back(); return expUndo(made.undo); }) } });
}

/* ---------- entry points ---------- */
function owdOpen() { if (typeof setView === 'function') setView('owed'); }
window.Owed = {
  load: owdLoad, summary: () => (OWD.data ? OWD.data.summary : null), open: owdOpen,
  split: (pre) => owdSplitDialog(pre || {}),
  fromTransactions: (rows, after) => owdSplitRows(rows, after),
  txAction: (tx) => owdTxButton(tx), txChip: (tx) => owdTxChip(tx),
  financeUpdated: owdFinanceUpdated, briefLine: (o) => owdBriefLine(o),
  noteOf: (k) => (OWD.data && OWD.data.notes && OWD.data.notes[k]) || '',
  noteHas: (k, q) => { const n = OWD.data && OWD.data.notes && OWD.data.notes[k]; return !!n && n.toLowerCase().includes(q); },
  txNote: (tx) => owdTxNote(tx), txRefund: (tx) => owdTxRefund(tx), txAttach: (tx) => owdTxAttach(tx),
  repeat: (pre) => owdRepeatDialog(pre || {}), repeatFor: (m) => ((OWD.data && OWD.data.repeats) || []).find(r => r.match && r.match.m === m) || null,
  planChanged: () => { OWD.scanAt = 0; owdScan(true); },
  pendingNoticeEls: () => owdNoticeEls(),
};
/** Another computer changed it (56-remote-jobs.js syncedFilesChanged). */
function owedFilesChanged(rels) {
  if ((rels || []).some(r => r === 'expenses/owed.json')) { OWD.scanAt = 0; owdLoad(true).then(() => owdScan(true)); }
}
window.addEventListener('focus', () => { if (OWD.loaded && Date.now() - OWD.at > 60000) owdLoad(true); });
setTimeout(() => { try { owdLoad().then(() => owdScan(false)); } catch (e) { /* later */ } }, 2800);
