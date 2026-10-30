/* ============================================================
   OWED TO ME, the page (Money > Owed to me, #view=owed). One primary action (Split a payment); the bank's questions first,
   then who owes what by person (with settling up), by thing (with a progress bar) or by trip. Oldest first.
   ============================================================ */
registerPage({
  id: 'owed', view: 'owed', match: v => v === 'owed', label: 'Owed to me', icon: 'handshake', area: 'money', tab: true, order: 21, discover: true,
  desc: 'Split a payment, see who has paid you back, and what you owe', keywords: 'owed split splitwise share bill friend pay back paid iou refund deposit loan expecting settle up remind',
  available: () => !(APP_CONFIG.features && APP_CONFIG.features.finance === false),
  badge: () => (OWD.suggestions.length || ''),
});
registerSection('owed', {
  group: 'finance', hashable: true, match: v => v === 'owed', title: () => 'Money', crumb: () => [], layout: 'page',
  mount(container) { _owMount(container); },
  unmount() { OWD.picked = new Set(); },
});
registerSidebarBlock('finance', {
  id: 'money-owed', order: 21, label: 'Owed to me',
  render(el) {
    el.appendChild(sbNavItem({ label: 'Owed to me', icon: 'handshake', view: 'owed', active: state.view === 'owed', count: OWD.suggestions.length ? String(OWD.suggestions.length) : '', title: 'Split a payment, see who has paid you back' }));
    if (!OWD.loaded) owdLoad();
  },
});
if (typeof registerHeaderActions === 'function') registerHeaderActions(v => v === 'owed', () => ({
  primary: { label: 'Split a payment', icon: 'plus', run: () => owdSplitDialog({}) },
  more: _owMoreItems(),
}));
function _owMoreItems() {
  const p = owdPrefs();
  const flip = (k, on, off) => owdDo('/prefs', { patch: { [k]: !p[k] } }, { done: p[k] ? off : on, icon: 'circle-check' });
  return [
    { label: 'Someone else paid', icon: 'users', hint: 'Keep track of what you owe them', run: () => owdSplitDialog({ someoneElse: true }) },
    { label: 'Expecting money', icon: 'wallet', hint: 'A refund, a deposit, a loan, a claim', run: () => owdExpectDialog({}) },
    'sep',
    { label: 'Check the bank now', icon: 'refresh-cw', run: () => { OWD.scanAt = 0; owdScan(true).then(() => toast(OWD.connected === false ? 'No bank data yet. Connect a bank or import a statement in Money.' : OWD.suggestions.length ? `${OWD.suggestions.length} to check` : 'Looked: nothing new has arrived', { icon: 'search' })); } },
    { label: 'Take paid-back money off my spending', icon: 'wallet', checked: p.netSpending, hint: 'Bowling counts as your £8, not £40', run: () => flip('netSpending', 'Paid-back money now comes off your spending', 'Spending now shows what left your account in full') },
    { label: 'Mark sure matches as paid by itself', icon: 'circle-check', checked: p.autoMark, hint: 'Only an exact amount with their name. You can Undo', run: () => flip('autoMark', 'Sure matches will be marked as paid, with Undo', 'Every match will ask you first') },
    { label: 'Offer “Split this?” on big payments', icon: 'lightbulb', checked: p.offers, run: () => flip('offers', 'Offers are on', 'Offers are off') },
    { label: 'Add a “Chase” task for each person', icon: 'list-checks', checked: p.chaseTasks, hint: `After ${p.chaseDays || 7} days`, run: () => flip('chaseTasks', 'New splits get a Chase task', 'No more Chase tasks') },
    { label: 'Bank details for reminders…', icon: 'landmark', run: () => owdBankDialog() },
    'sep',
    { label: 'Download as CSV', icon: 'download', run: () => { const a = document.createElement('a'); a.href = '/api/owed/export.csv'; a.download = 'owed-to-me.csv'; document.body.appendChild(a); a.click(); a.remove(); } },
    { label: 'Copy the summary as a message', icon: 'copy', run: () => copyText(owdSummaryText(), 'Summary') },
  ];
}
function _owMoneyTabs(tries) {
  if (state.view !== 'owed') return;
  const FV = window.FinanceView;
  if (FV && typeof FV.groupTabs === 'function') { headerSubTabs(FV.groupTabs('owed'), FV.tabsFor()); return; }
  if ((tries || 0) < 40) setTimeout(() => _owMoneyTabs((tries || 0) + 1), 50);
}
function _owMount(container) {
  _owMoneyTabs();
  const sub = document.getElementById('view-subtitle'); if (sub) { sub.textContent = ''; const t = _xe('span', 'fv-fresh'); t.textContent = 'Who owes you, who has paid, and what you owe'; sub.appendChild(t); }
  const root = _xe('div', 'xp owd'); container.appendChild(root);
  if (!OWD.loaded) { root.innerHTML = '<div class="xp-loading"><span class="spinner" aria-hidden="true"></span> Loading…</div>'; owdLoad(); return; }
  if (OWD.error && !OWD.data) { mountEmptyState(root, { icon: 'circle-alert', title: 'This did not load', text: OWD.error, actions: [{ label: 'Try again', primary: true, run: () => { OWD.loaded = false; render(); } }] }); return; }
  owdScan(false);
  const d = OWD.data;
  if (!d.things.length) {
    const box = _xe('div', 'xp-empty'); root.appendChild(box);
    mountEmptyState(box, { icon: 'handshake', title: 'Paid for everyone? Get it back without the chasing',
      text: 'Split a payment between people, and OpenDash looks in your bank for the money coming back and asks you to confirm it.',
      actions: [{ label: 'Split a payment', icon: 'plus', primary: true, run: () => owdSplitDialog({}) }] });
    for (const n of _owOffers()) root.appendChild(n);
    return;
  }
  root.appendChild(_owBand(d));
  for (const n of _owQuestions()) root.appendChild(n);
  for (const n of _owOffers()) root.appendChild(n);
  const note = _owNetNote(d); if (note) root.appendChild(note);
  if (OWD.leftOut.length) root.appendChild(_xe('div', 'xp-remind', `${icon('info')}<span>Money into ${esc(OWD.leftOut.join(', '))} is not checked, because ${OWD.leftOut.length === 1 ? 'it is' : 'they are'} left out in Your data.</span>`));
  const tools = _xe('div', 'xp-tools owd-tools');
  const seg = _xe('div', 'xp-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Show');
  const views = [['people', 'By person'], ['things', 'By thing']]; if (d.trips.length) views.push(['trips', 'Trips and events']);
  if (!views.some(v => v[0] === OWD.view)) OWD.view = 'people';
  for (const [k, l] of views) seg.appendChild(_xChip(l, '', 'xp-chip' + (OWD.view === k ? ' on' : ''), () => { OWD.view = k; render(); }));
  tools.appendChild(seg);
  const q = _xe('label', 'input input-sm xp-search', icon('search') + '<input type="search" placeholder="Search names and things" aria-label="Search">');
  const qi = q.querySelector('input'); qi.value = OWD.q;
  let qt = 0;
  qi.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { OWD.q = qi.value; const at = qi.selectionStart; render(); const again = document.querySelector('.owd-tools .xp-search input'); if (again) { again.focus(); try { again.setSelectionRange(at, at); } catch (e) { /* fine */ } } }, 260); });
  tools.appendChild(q);
  root.appendChild(tools);
  const list = _xe('div', 'owd-list'); root.appendChild(list);
  if (OWD.view === 'trips') _owTrips(list, d);
  else if (OWD.view === 'things') _owByThing(list, d);
  else _owByPerson(list, d);
  tools.appendChild(uiButton({ label: 'Match a payment', icon: 'landmark', kind: 'ghost', size: 'sm', tip: 'Say who a bank payment was from and what it was for', run: () => owdPickPayment({ dir: 'in' }) }));
  if (OWD.view !== 'trips') tools.appendChild(_owPick(list).button());
  _owTransfers(list, d);
}
function _owBand(d) {
  const s = d.summary, band = _xe('div', 'xp-band owd-band');
  band.innerHTML = `<div class="xp-owed"><span class="xp-big num">${owdAmt(s.owedToMe)}</span><span class="xp-sub">${s.count ? `owed to you${s.oldestDays >= 14 ? ` · oldest ${esc(owdAgo(s.oldestDays))}` : ''}` : 'Nobody owes you anything right now'}</span></div>`;
  const more = _xe('div', 'owd-sums');
  if (s.iOweCount) more.appendChild(_xe('div', 'owd-sum', `<b class="num">${owdAmt(s.iOwe)}</b><span>you owe</span>`));
  if (s.expectedCount) more.appendChild(_xe('div', 'owd-sum' + (s.late ? ' is-late' : ''), `<b class="num">${owdAmt(s.expected)}</b><span>${s.late ? `expected, ${s.late} late` : 'expected back'}</span>`));
  if (s.paidBack) more.appendChild(_xe('div', 'owd-sum', `<b class="num">${owdAmt(s.paidBack)}</b><span>paid back so far</span>`));
  band.appendChild(more);
  return band;
}
/** The bank's questions, the surest first. */
function _owQuestions() {
  const out = [], list = OWD.suggestions;
  const propos = Object.entries((OWD.data && OWD.data.proposed) || {});
  for (const [id, p] of propos.slice(0, 2)) {
    const t = owdThing(p.id); if (!t) continue;
    const c = _xe('div', 'xp-ask card owd-ask');
    c.innerHTML = `${icon('circle-help')}<span class="xp-ask-t">The assistant thinks ${esc(owdFirstName(owdPersonName(p.key)))} paid ${owdAmt(p.amount)} for ${esc(t.title)}${p.note ? `: <em>${esc(p.note)}</em>` : ''}</span>`;
    c.append(uiButton({ label: 'Yes', kind: 'primary', size: 'sm', run: () => owdDo('/proposal', { id, yes: true }, { done: 'Marked as paid', icon: 'circle-check', what: 'save your answer' }) }), uiButton({ label: 'Not this', size: 'sm', run: () => owdDo('/proposal', { id, yes: false }, { quiet: true, what: 'save your answer' }) }));
    out.push(c);
  }
  const shown = OWD.showAllSug ? list : list.slice(0, 3);
  for (const s of shown) out.push(_owAsk(s));
  if (list.length > shown.length) { const b = _xe('div', 'owd-more'); b.appendChild(uiButton({ label: `Show ${list.length - shown.length} more to check`, kind: 'link', run: () => { OWD.showAllSug = true; render(); } })); out.push(b); }
  return out;
}
function _owAskText(s) {
  const who = owdFirstName(s.name), when = _xpDate(s.date), memo = s.memo ? ` from ${esc(s.memo.slice(0, 48))}` : '';
  const what = s.allocs.length > 1 ? `${s.allocs.length} things (${s.allocs.map(a => esc(a.title)).slice(0, 3).join(', ')})` : esc(s.allocs[0].title);
  if (s.dir === 'out') return `We think you paid ${esc(who)}: ${owdAmt(s.amount)} on ${esc(when)} for ${what}`;
  if (s.kind === 'same') return `${owdAmt(s.amount)} arrived on ${esc(when)}${memo}. It could be several people. Who was it?`;
  if (s.kind === 'maybe') return `${owdAmt(s.amount)} arrived on ${esc(when)}${memo}. Is that ${esc(who)} for ${what}?`;
  if (s.kind === 'part') return `We think ${esc(who)} paid part: ${owdAmt(s.amount)} on ${esc(when)}${memo}, towards ${what}`;
  if (s.kind === 'over') return `We think ${esc(who)} paid ${owdAmt(s.amount)} on ${esc(when)}${memo}: that covers ${what} and ${owdAmt(s.over)} over`;
  if (s.kind === 'cover') {
    const others = s.allocs.filter(a => a.key !== s.key).length, own = s.allocs.some(a => a.key === s.key);
    if (s.everyone) return `${esc(who)} paid ${owdAmt(s.amount)} on ${esc(when)}${memo}: for everyone on ${esc(s.title || s.allocs[0].title)}?`;
    return `${esc(who)} paid ${owdAmt(s.amount)} on ${esc(when)}${memo}: ${own ? `for themselves and ${others === 1 ? 'one other' : others + ' others'}` : 'for someone else'}? Who?`;
  }
  if (s.kind === 'several') return `We think ${esc(who)} paid for ${what}: ${owdAmt(s.amount)} on ${esc(when)}${memo}`;
  return `We think ${esc(who)} paid: ${owdAmt(s.amount)} on ${esc(when)}${memo}, for ${what}`;
}
function _owAsk(s) {
  const c = _xe('div', 'xp-ask card owd-ask conf-' + s.conf + (s.top ? ' is-top' : '')); c.setAttribute('role', 'status');
  c.innerHTML = `${icon(s.conf === 'low' ? 'circle-help' : 'circle-check')}<span class="xp-ask-t">${_owAskText(s)}${s.why ? `<small>${esc(s.why[0].toUpperCase() + s.why.slice(1))}</small>` : ''}</span>`;
  const answer = (yes, pick) => owdDo('/answer', { suggestion: s, yes, pick }, { done: yes ? `Marked as paid` : '', quiet: !yes, icon: 'circle-check', what: 'save your answer' });
  const acts = _xe('div', 'owd-ask-a');
  if (s.kind === 'cover' && s.options && s.options.length) {
    // Everyone still open on it: tap to change who it was for. Yes works when it adds up.
    const picked = new Set(s.allocs.map(a => a.id + '|' + a.key));
    const who = _xe('div', 'owd-ask-who');
    const yes = uiButton({ label: 'Yes', kind: 'primary', size: 'sm', run: () => owdDo('/answer', { suggestion: { ...s, allocs: s.options.filter(o => picked.has(o.id + '|' + o.key)).map(o => ({ id: o.id, key: o.key, amount: o.left, title: o.title })) }, yes: true }, { done: 'Marked as paid', icon: 'circle-check', what: 'save your answer' }) });
    const sumNote = _xe('small', 'owd-ask-sum');
    const check = () => {
      const sum = s.options.filter(o => picked.has(o.id + '|' + o.key)).reduce((a, o) => a + Math.round(o.left * 100), 0);
      const fits = Math.abs(sum - Math.round(s.amount * 100)) <= 1;
      yes.disabled = !fits;
      sumNote.textContent = fits ? '' : `${owdMoney(sum / 100)} of ${owdMoney(s.amount)} chosen`;
    };
    for (const o of s.options) {
      const ref = o.id + '|' + o.key, multi = new Set(s.options.map(x => x.id)).size > 1;
      const b = _xChip(`${o.own ? owdFirstName(o.name) + ' (themselves)' : owdFirstName(o.name)} ${owdMoney(o.left)}${multi ? ' · ' + o.title : ''}`, o.hint ? 'users' : '', 'xp-chip' + (picked.has(ref) ? ' on' : ''), () => {
        if (picked.has(ref)) picked.delete(ref); else picked.add(ref);
        b.classList.toggle('on', picked.has(ref)); b.setAttribute('aria-pressed', picked.has(ref) ? 'true' : 'false'); check();
      });
      if (o.hint) b.title = `${owdFirstName(s.name)} has paid for ${owdFirstName(o.name)} before`;
      who.appendChild(b);
    }
    who.appendChild(sumNote);
    c.appendChild(who);
    check();
    acts.appendChild(yes);
  } else if (s.alts && s.alts.length) for (const a of s.alts.slice(0, 5)) acts.appendChild(uiButton({ label: owdFirstName(a.name), kind: 'secondary', size: 'sm', run: () => answer(true, a.key) }));
  else acts.appendChild(uiButton({ label: 'Yes', kind: 'primary', size: 'sm', run: () => answer(true) }));
  acts.appendChild(uiButton({ label: s.alts && s.alts.length ? 'None of them' : 'Not this', size: 'sm', run: () => answer(false) }));
  acts.appendChild(uiButton({ label: 'Choose…', size: 'sm', kind: 'ghost', tip: 'Say who it was for, in any amounts', run: () => owdPayDialog({ tx: { k: s.k, txKey: s.txKey, date: s.date, amount: s.amount, memo: s.memo, dir: s.dir }, preset: s.allocs, payer: s.kind === 'same' || s.kind === 'maybe' ? '' : s.key }) }));
  c.appendChild(acts);
  return c;
}
/** The quiet offer: a big payment at a restaurant, bar or activity. Dismissing it is learnt. */
function _owOffers() {
  return OWD.offers.slice(0, 2).map(o => {
    const c = _xe('div', 'owd-offer');
    c.innerHTML = `${icon('lightbulb', 'i-sm')}<span class="owd-offer-t">${esc(o.m)}, ${owdAmt(Math.abs(o.a))} on ${esc(_xpDate(o.d))}. Split this?</span>`;
    c.append(uiButton({ label: 'Split', size: 'sm', run: () => owdSplitDialog(owdPrefillFromTx(o)) }), uiButton({ icon: 'x', size: 'sm', kind: 'ghost', tip: 'Not one to split', run: () => owdDismissOffer(o) }));
    return c;
  });
}
function owdDismissOffer(o) { OWD.offers = OWD.offers.filter(x => x.k !== o.k); owdRepaint(); return owdApi('/offer', { offer: { k: o.k, m: o.m } }).then(owdSet).catch(() => {}); }
/** Says plainly what net spending does, with the way to turn it off. */
function _owNetNote(d) {
  const p = owdPrefs();
  const t = d.things.find(x => x.back > 0 && x.source && x.source.k);
  if (!t && p.netSpending) return null;
  const n = _xe('div', 'xp-remind owd-net');
  if (p.netSpending) {
    n.innerHTML = `${icon('info')}<span>Paid-back money comes off your spending and is not counted as income: ${esc(t.title)} counts as ${owdAmt(Math.max(0, t.total - t.back))} so far, not ${owdAmt(t.total)}.</span>`;
    n.appendChild(uiButton({ label: 'Count it in full', kind: 'link', run: () => owdDo('/prefs', { patch: { netSpending: false } }, { done: 'Spending now shows what left your account in full' }) }));
  } else {
    n.innerHTML = `${icon('info')}<span>Paid-back money counts as income, and your spending shows what left your account in full.</span>`;
    n.appendChild(uiButton({ label: 'Take it off my spending', kind: 'link', run: () => owdDo('/prefs', { patch: { netSpending: true } }, { done: 'Paid-back money now comes off your spending' }) }));
  }
  return n;
}
function _owMatches(t, l) { const q = expNorm(OWD.q); return !q || expNorm(`${t.title} ${t.merchant || ''} ${t.note || ''} ${l ? l.name : t.lines.map(x => x.name).join(' ')}`).includes(q); }
function _owStatusChip(st) { return `<span class="xp-tag owd-st st-${st}">${icon(OWD_STATUS[st][1], 'i-xs')}${esc(OWD_STATUS[st][0])}</span>`; }
/** One person on one thing: a row you can tick; its menu has what can happen next. */
function _owLine(t, l, showWho) {
  const row = _xe('div', 'owd-line st-' + l.status);
  row.dataset.ref = t.id + '|' + l.key; row.dataset.pickId = row.dataset.ref;
  const main = showWho ? esc(l.name) : esc(t.title);
  const friend = showWho && owdFriend(l.name) ? '<span class="owd-friend" title="Also on OpenDash. Nothing is sent to them.">On OpenDash</span>' : '';
  const dirWord = t.kind === 'iowe' ? (showWho ? 'you owe' : `you owe ${esc(owdFirstName(l.name))}`) : t.kind === 'expect' ? 'expecting' : '';
  const viaWord = l.via && l.via.length ? `paid by ${esc(l.via.map(owdFirstName).join(', '))}` : '';
  const sub = [showWho ? '' : esc(_xpDate(t.date)), dirWord, viaWord, l.paid > 0 && l.left > 0 ? `${owdMoney(l.paid)} of ${owdMoney(l.owes)} paid` : '', l.old ? `<span class="owd-old">${esc(owdAgo(l.age))}</span>` : '', l.remindedAt ? `reminded ${esc(_xpDate(l.remindedAt))}` : '', t.late ? '<span class="owd-old">late</span>' : ''].filter(Boolean).join(' · ');
  row.innerHTML = `<span class="owd-line-m"><span class="owd-line-t">${main}${friend}</span>${sub ? `<small>${sub}</small>` : ''}</span>${_owStatusChip(l.status)}<b class="num owd-line-am">${owdAmt(l.status === 'paid' ? l.owes : l.status === 'off' ? l.owes : l.left)}</b>`;
  row.appendChild(uiButton({ icon: 'ellipsis', size: 'sm', kind: 'ghost', tip: 'More', aria: `More for ${l.name}, ${t.title}`, run: (ev, b) => _owLineMenu(t, l, b) }));
  return row;
}
function _owLineMenu(t, l, anchor) {
  const ref = [{ id: t.id, key: l.key }];
  const items = [];
  const open = l.left > 0.004;
  if (open) {
    items.push({ label: t.kind === 'iowe' ? 'I paid it' : 'Mark as paid', icon: 'circle-check', run: () => owdDo('/paid', { refs: ref }, { done: 'Marked as paid', icon: 'circle-check', what: 'mark that as paid' }) });
    items.push({ label: 'Part paid…', icon: 'circle-dot', run: () => owdPartDialog(t, l) });
    if (t.kind !== 'iowe') items.push({ label: `Remind ${owdFirstName(l.name)}…`, icon: 'mail', run: () => owdRemindDialog(ref) });
    if (t.kind !== 'iowe') items.push({ label: 'Write it off', icon: 'x', run: () => owdDo('/write-off', { refs: ref }, { done: `Written off ${owdMoney(l.left)}`, what: 'write that off' }) });
  }
  if (l.paid > 0 || l.off) items.push({ label: 'Not paid after all', icon: 'rotate-ccw', hint: l.payments.some(p => p.how === 'bank') ? 'The bank payment can be matched again' : '', run: () => owdDo('/unpaid', { refs: ref }, { done: 'Moved back', what: 'change that' }) });
  if (open) items.push({ label: 'Find the bank payment…', icon: 'landmark', hint: 'Someone may have paid for them', run: () => owdPickPayment({ dir: t.kind === 'iowe' ? 'out' : 'in', line: { id: t.id, key: l.key, amount: l.left } }) });
  if (l.payments.length) {
    items.push('sep');
    for (const p of l.payments.slice(-3)) {
      const via = p.by ? ` from ${owdFirstName(owdPersonName(p.by))}` : '';
      if (p.how === 'bank') items.push({ label: `${owdMoney(p.amount)} on ${_xpDate(p.date)}${via}: change…`, icon: 'landmark', hint: p.memo || '', run: () => owdPayDialog({ tx: { k: p.k, txKey: p.txKey, date: p.date, amount: p.txa || p.amount, memo: p.memo || '', dir: t.kind === 'iowe' ? 'out' : 'in' } }) });
      else items.push({ label: `${owdMoney(p.amount)} on ${_xpDate(p.date)}`, icon: 'pencil', hint: p.note || 'marked by hand', disabled: true });
    }
  }
  items.push('sep', { label: 'Open the whole thing…', icon: 'pencil', run: () => owdSplitDialog({ edit: t.id }) });
  openMenu(anchor, items, { align: 'end', width: 240 });
}
function _owThingMenu(t, anchor) {
  const open = t.lines.filter(l => l.left > 0.004).map(l => ({ id: t.id, key: l.key }));
  const items = [{ label: 'Edit', icon: 'pencil', run: () => (t.kind === 'expect' ? owdExpectDialog({ edit: t.id }) : owdSplitDialog({ edit: t.id })) }];
  if (open.length) items.push({ label: 'Everyone has paid', icon: 'circle-check', run: () => owdDo('/paid', { refs: open }, { done: 'Marked as paid', icon: 'circle-check', what: 'mark that as paid' }) });
  if (open.length && t.kind !== 'iowe') items.push({ label: 'Remind everyone…', icon: 'mail', run: () => owdRemindDialog(open) });
  if (t.source && t.source.k && t.kind !== 'iowe') items.push({ label: 'Unlink the bank payment', icon: 'landmark', hint: 'What comes back stops coming off it', run: () => owdDo('/unlink', { id: t.id }, { done: 'Unlinked', what: 'unlink that' }) });
  if (t.kind === 'split') items.push({ label: 'Move to Expenses', icon: 'receipt', hint: 'Work pays you back, not friends', run: () => owdToExpense(t) });
  items.push('sep', { label: 'Delete', icon: 'trash-2', danger: true, run: () => owdDeleteThing(t) });
  openMenu(anchor, items, { align: 'end', width: 230 });
}
function _owByPerson(host, d) {
  const q = expNorm(OWD.q);
  const people = d.persons.filter(p => !q || expNorm(p.name + ' ' + p.lines.map(l => l.title).join(' ')).includes(q));
  if (!people.length) { host.appendChild(_xe('div', 'xp-none', q ? 'Nothing matches.' : 'Everyone has paid. Nothing to chase.')); }
  for (const p of people) {
    const card = _xe('section', 'owd-card');
    const friend = owdFriend(p.name) ? '<span class="owd-friend" title="Also on OpenDash. Nothing is sent to them.">On OpenDash</span>' : '';
    const words = [];
    if (p.owes > 0) words.push(`owes you ${owdAmt(p.owes)}`);
    if (p.iowe > 0) words.push(`you owe ${owdAmt(p.iowe)}`);
    if (p.over > 0) words.push(`paid ${owdAmt(p.over)} too much`);
    const n = p.lines.length;
    const net = p.iowe > 0 || p.over > 0 ? (p.net > 0 ? ` · overall they owe you ${owdAmt(p.net)}` : p.net < 0 ? ` · overall you owe ${owdAmt(-p.net)}` : ' · overall you are even') : '';
    const head = _xe('div', 'owd-card-h');
    head.innerHTML = `<span class="owd-av" aria-hidden="true">${esc(owdFirstName(p.name)[0] || '?').toUpperCase()}</span><span class="owd-card-m"><b>${esc(p.name)}</b>${friend}<small>${words.join(' · ')}${n ? ` across ${n} thing${n === 1 ? '' : 's'}` : ''}${net}</small></span>`;
    const acts = _xe('span', 'owd-card-a');
    if (p.owes > 0) acts.appendChild(uiButton({ label: 'Remind', icon: 'mail', size: 'sm', kind: 'ghost', tip: `A friendly message to ${owdFirstName(p.name)}. You send it yourself.`, run: () => owdRemindDialog(p.lines.filter(l => l.kind !== 'iowe').map(l => ({ id: l.id, key: p.key }))) }));
    acts.appendChild(uiButton({ label: 'Settle up', icon: 'handshake', size: 'sm', kind: 'ghost', run: () => owdSettleDialog(p) }));
    head.appendChild(acts);
    card.appendChild(head);
    const list = _xe('div', 'owd-lines');
    for (const l of p.lines) { const t = owdThing(l.id); const tl = t && t.lines.find(x => x.key === p.key); if (tl) list.appendChild(_owLine(t, tl, false)); }
    card.appendChild(list);
    host.appendChild(card);
  }
  _owDoneFold(host, d);
}
function _owThingCard(t) {
  const card = _xe('section', 'owd-card');
  const head = _xe('div', 'owd-card-h');
  const pct = t.count ? Math.round(t.done / t.count * 100) : 0;
  const word = t.kind === 'iowe' ? `You owe ${esc(owdFirstName(t.lines[0].name))} ${owdAmt(t.lines[0].left)}` : t.kind === 'expect' ? `${t.late ? `Due ${esc(_xpDate(t.due))}, late` : t.due ? `Due ${esc(_xpDate(t.due))}` : 'Expecting'}` : `${t.done} of ${t.count} paid`;
  const sub = [esc(_xpDate(t.date)), t.merchant && t.merchant !== t.title ? esc(t.merchant) : '', t.kind === 'split' ? `your share ${owdAmt(t.myShare)}` : ''].filter(Boolean).join(' · ');
  head.innerHTML = `<span class="owd-card-m"><b>${esc(t.title)}</b><small>${sub}</small></span><b class="num owd-card-am">${owdAmt(t.total)}</b>`;
  head.appendChild(uiButton({ icon: 'ellipsis', size: 'sm', kind: 'ghost', tip: 'More', aria: `More for ${t.title}`, run: (ev, b) => _owThingMenu(t, b) }));
  card.appendChild(head);
  const bar = _xe('div', 'owd-prog', `<span class="owd-prog-w">${word}</span>${t.kind === 'split' ? `<span class="owd-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></span>` : ''}`);
  card.appendChild(bar);
  const list = _xe('div', 'owd-lines');
  for (const l of t.lines) list.appendChild(_owLine(t, l, true));
  card.appendChild(list);
  return card;
}
function _owByThing(host, d) {
  const open = d.things.filter(t => t.status !== 'paid' && t.status !== 'off' && _owMatches(t));
  if (!open.length) host.appendChild(_xe('div', 'xp-none', OWD.q ? 'Nothing matches.' : 'Everyone has paid. Nothing to chase.'));
  for (const t of open) host.appendChild(_owThingCard(t));
  _owDoneFold(host, d);
}
/** Every bank payment in use, whole: "£16 from Sam: Sam £8, Alex £8". Change or take off from here. */
function _owTransfers(host, d) {
  const q = expNorm(OWD.q);
  const list = (d.transfers || []).filter(x => !q || expNorm(`${x.byName} ${x.memo} ${x.lines.map(l => l.name + ' ' + l.title).join(' ')}`).includes(q));
  if (!list.length) return;
  const b = _xe('div', 'owd-more');
  b.appendChild(uiButton({ label: OWD.showTx ? 'Hide the bank payments' : `Show the bank payments (${list.length})`, kind: 'link', run: () => { OWD.showTx = !OWD.showTx; render(); } }));
  host.appendChild(b);
  if (!OWD.showTx) return;
  const box = _xe('section', 'owd-card');
  for (const x of list.slice(0, 40)) {
    const row = _xe('div', 'owd-line owd-tr');
    const parts = x.lines.map(l => `${esc(owdFirstName(l.name))} ${esc(owdMoney(l.amount))} (${esc(l.title)})`);
    if (x.over > 0) parts.push(`${esc(owdMoney(x.over))} kept as credit`);
    if (x.gift > 0) parts.push(`${esc(owdMoney(x.gift))} a gift`);
    if (x.left > 0) parts.push(`${esc(owdMoney(x.left))} not related`);
    row.innerHTML = `<span class="owd-line-m"><span class="owd-line-t">${x.dir === 'out' ? 'You paid' : esc(x.byName ? owdFirstName(x.byName) + ' paid' : 'Paid')} ${owdAmt(x.amount)} on ${esc(_xpDate(x.date))}</span><small>${parts.join(' · ')}</small></span>`;
    row.appendChild(uiButton({ label: 'Change', size: 'sm', kind: 'ghost', run: () => owdPayDialog({ tx: { k: x.k, txKey: x.txKey, date: x.date, amount: x.amount, memo: x.memo, dir: x.dir } }) }));
    box.appendChild(row);
  }
  host.appendChild(box);
}
/** Finished things, folded. */
function _owDoneFold(host, d) {
  const done = d.things.filter(t => (t.status === 'paid' || t.status === 'off') && _owMatches(t)).reverse();
  if (!done.length) return;
  const b = _xe('div', 'owd-more');
  b.appendChild(uiButton({ label: OWD.showDone ? 'Hide what is finished' : `Show what is finished (${done.length})`, kind: 'link', run: () => { OWD.showDone = !OWD.showDone; render(); } }));
  host.appendChild(b);
  if (OWD.showDone) for (const t of done.slice(0, 40)) host.appendChild(_owThingCard(t));
}
function _owTrips(host, d) {
  for (const tr of d.trips) {
    const card = _xe('section', 'owd-card');
    const head = _xe('div', 'owd-card-h');
    head.innerHTML = `<span class="owd-card-m"><b>${esc(tr.name)}</b><small>${tr.count} payment${tr.count === 1 ? '' : 's'}</small></span><b class="num owd-card-am">${owdAmt(tr.total)}</b>`;
    const text = () => [`${tr.name}: ${owdMoney(tr.total)}`, ...tr.moves.map(m => `${m.fromName} ${m.from === '_me' ? 'pay' : 'pays'} ${m.toName} ${owdMoney(m.amount)}`)].join('\n');
    head.appendChild(uiButton({ label: 'Copy', icon: 'copy', size: 'sm', kind: 'ghost', tip: 'Copy who pays whom as a message', run: () => copyText(text(), 'Who pays whom') }));
    head.appendChild(uiButton({ label: 'Add a payment', icon: 'plus', size: 'sm', kind: 'ghost', run: () => owdSplitDialog({ tripName: tr.name }) }));
    card.appendChild(head);
    const list = _xe('div', 'owd-lines');
    if (!tr.moves.length) list.appendChild(_xe('div', 'xp-none', 'All square.'));
    for (const m of tr.moves) list.appendChild(_xe('div', 'owd-move', `<span>${esc(m.fromName)}</span>${icon('arrow-right', 'i-sm')}<span>${esc(m.toName)}</span><b class="num">${owdAmt(m.amount)}</b>`));
    card.appendChild(list);
    host.appendChild(card);
  }
}
/** Several at once: mark paid, write off, remind. One request, one Undo (11-ui-pick.js). */
function _owPick(list) {
  const refOf = (id) => { const i = id.indexOf('|'); return { id: id.slice(0, i), key: id.slice(i + 1) }; };
  const lineOf = (r) => { const t = owdThing(r.id); return t && t.lines.find(l => l.key === r.key); };
  return multiPick(list, { key: 'owed', rows: '.owd-line', idOf: (r) => r.dataset.ref, set: () => OWD.picked, noun: ['payment', 'payments'],
    nameOf: (r) => (r.querySelector('.owd-line-t') || {}).textContent || '',
    exists: (id) => { const r = refOf(id); return !!lineOf(r); },
    actions: (ids) => {
      const refs = ids.map(refOf);
      const open = refs.filter(r => { const l = lineOf(r); return l && l.left > 0.004; });
      const owed = open.filter(r => owdThing(r.id).kind !== 'iowe');
      const done = refs.filter(r => { const l = lineOf(r); return l && (l.paid > 0 || l.off); });
      const nOf = (a, w) => (a.length === refs.length ? w : `${w} (${a.length})`);
      return [
        open.length ? { label: nOf(open, 'Mark as paid'), icon: 'circle-check', run: async () => { const j = await owdDo('/paid', { refs: open }, { done: `Marked ${open.length} as paid`, icon: 'circle-check', what: 'mark those as paid' }); return j ? undefined : false; } } : null,
        owed.length ? { label: nOf(owed, 'Remind'), icon: 'mail', keep: true, run: () => owdRemindDialog(owed) } : null,
        owed.length ? { label: nOf(owed, 'Write off'), icon: 'x', run: async () => { const j = await owdDo('/write-off', { refs: owed }, { done: `Wrote off ${owed.length}`, what: 'write those off' }); return j ? undefined : false; } } : null,
        done.length ? { label: nOf(done, 'Not paid'), icon: 'rotate-ccw', run: async () => { const j = await owdDo('/unpaid', { refs: done }, { done: `${done.length} moved back`, what: 'change that' }); return j ? undefined : false; } } : null,
      ];
    } });
}
