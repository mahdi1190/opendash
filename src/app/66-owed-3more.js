/* ============================================================
   OWED TO ME, around the page: money expected back, part payments, reminders (you send them yourself), settling up, "Who paid
   this?", the Home widget, and Transactions' buttons. Nothing here sends anything to anyone.
   ============================================================ */
/** A refund, a deposit, a loan to a friend, an insurance claim: the same matching, with a date it should have come by. */
function owdExpectDialog(pre) {
  pre = pre || {};
  const edit = pre.edit ? owdThing(pre.edit) : null;
  const v = edit || pre;
  const title = _xInput('text', v.title || '', 'What is it? e.g. Boots refund, flat deposit');
  const from = _xInput('text', edit ? edit.lines[0].name : (v.from || ''), 'Who from? e.g. ASOS, the landlord, Sam', { autocomplete: 'off' });
  const amount = _xInput('number', v.total || '', '0.00', { step: '0.01', min: '0', inputMode: 'decimal' });
  const kind = _xe('select', 'xp-in'); kind.innerHTML = [['refund', 'A refund'], ['deposit', 'A deposit back'], ['loan', 'A loan to someone'], ['claim', 'An insurance claim'], ['other', 'Something else']].map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  kind.value = v.expectKind || 'refund';
  const due = _xInput('date', v.due || expAddDays(todayStr(), 14));
  const note = _xInput('text', v.note || '', 'optional');
  openDialog({
    title: edit ? 'Edit' : 'Expecting money', size: 'sm',
    body(el) {
      el.className += ' xp-form';
      el.append(_xField('What', title), _xField('From', from));
      const row = _xe('div', 'xp-row2'); row.append(_xField('Amount', amount), _xField('Should arrive by', due)); el.appendChild(row);
      el.append(_xField('It is', kind), _xField('Note', note));
      el.appendChild(_xe('p', 'xp-fh', 'Freeflo watches your bank for it, and tells you when it is late.'));
      setTimeout(() => title.focus(), 40);
    },
    actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, icon: 'check', run: async () => {
      if (!title.value.trim()) { title.focus(); toast('Say what it is.', { kind: 'err' }); return false; }
      if (!from.value.trim()) { from.focus(); toast('Say who it is coming from.', { kind: 'err' }); return false; }
      if (!(Number(amount.value) > 0)) { amount.focus(); toast('Put in the amount.', { kind: 'err' }); return false; }
      const thing = { kind: 'expect', title: title.value.trim(), from: from.value.trim(), total: Number(amount.value), date: edit ? edit.date : (pre.date || todayStr()), due: due.value, expectKind: kind.value, note: note.value.trim(), source: edit ? edit.source : (pre.source || { type: 'manual' }) };
      if (edit) { const j = await owdDo('/update', { id: edit.id, thing }, { done: 'Saved', what: 'save that' }); return j ? undefined : false; }
      return (await owdCreate(thing)) ? undefined : false;
    } }],
  });
}
function owdPartDialog(t, l) {
  const amount = _xInput('number', '', owdMoney(l.left), { step: '0.01', min: '0', inputMode: 'decimal' });
  const date = _xInput('date', todayStr());
  openDialog({
    title: `How much has ${owdFirstName(l.name)} paid?`, size: 'sm',
    body(el) { el.className += ' xp-form'; el.append(_xField(`Towards ${t.title} (${owdMoney(l.left)} left)`, amount), _xField('When', date)); setTimeout(() => amount.focus(), 40); },
    actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, icon: 'check', run: async () => {
      if (!(Number(amount.value) > 0)) { amount.focus(); toast('Put in the amount.', { kind: 'err' }); return false; }
      const j = await owdDo('/paid', { refs: [{ id: t.id, key: l.key, amount: Number(amount.value) }], date: date.value }, { done: `Noted ${owdMoney(amount.value)} from ${owdFirstName(l.name)}`, icon: 'circle-check', what: 'save that' });
      return j ? undefined : false;
    } }],
  });
}
/** The saved link with the amount in it, for the two that take one in the address. Any other link stays as it was saved. */
function owdLinkFor(link, amount) {
  let u; try { u = new URL(link); } catch (e) { return link; }
  const seg = u.pathname.split('/').filter(Boolean), host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!(amount > 0) || OWD.currency !== 'GBP' || seg.length !== 1 || u.search || u.hash) return link;
  if (host === 'monzo.me') return `https://monzo.me/${seg[0]}/${Number(amount).toFixed(2)}`;
  if (host === 'paypal.me') return `https://paypal.me/${seg[0]}/${Number(amount).toFixed(2)}GBP`;
  return link;
}
/** How to pay you, for the end of a message: what you saved, when you said to put it in. */
function owdPayWords(amount) {
  const p = owdPrefs();
  if (!p.sendBank) return '';
  const a = [];
  if (p.payLink) a.push(`You can pay me here: ${owdLinkFor(p.payLink, amount)}`);
  if (p.bankDetails) a.push(`My bank details: ${p.bankDetails}`);
  return a.length ? '\n\n' + a.join('\n') : '';
}
/** The friendly message for one person's open lines. */
function owdRemindText(name, lines) {
  const sum = lines.reduce((a, x) => a + x.left, 0);
  // In the money it was paid in as well, when that is another currency.
  const both = (x) => (x.fx ? `${owdMoney(x.left)}, ${owdMoney(x.fx.left, x.fx.cur)}` : owdMoney(x.left));
  const what = lines.length === 1 ? `${lines[0].title}` : lines.map(x => `${x.title} (${both(x)})`).join(', ');
  const amount = lines.length === 1 && lines[0].fx ? `${owdMoney(sum)} (${owdMoney(lines[0].fx.left, lines[0].fx.cur)})` : owdMoney(sum);
  return `Hi ${owdFirstName(name)}, a friendly nudge: you owe me ${amount} for ${what}. No rush, and thanks!${owdPayWords(sum)}`;
}
/** Remind: the wording is yours to change, and you send it (copy, share or your own email). Never sent by itself. */
function owdRemindDialog(refs) {
  const byPerson = new Map();
  for (const r of refs) { const t = owdThing(r.id); const l = t && t.lines.find(x => x.key === r.key); if (!l || !(l.left > 0.004)) continue; const a = byPerson.get(r.key) || { name: l.name, key: r.key, lines: [], refs: [] }; a.lines.push({ title: t.title, left: l.left, ...(t.fx && l.fx ? { fx: { cur: t.fx.cur, left: Math.round(l.fx * (l.left / l.owes) * 100) / 100 } } : {}) }); a.refs.push(r); byPerson.set(r.key, a); }
  if (!byPerson.size) { toast('Nothing left to remind them about.'); return; }
  const noted = (a) => owdApi('/reminded', { refs: a.refs }).then((j) => { owdSet(j); owdRepaint(); }).catch(() => {});
  openDialog({
    title: byPerson.size === 1 ? `Remind ${owdFirstName([...byPerson.values()][0].name)}` : `Remind ${byPerson.size} people`, size: 'md',
    body(el) {
      el.className += ' xp-form';
      for (const a of byPerson.values()) {
        const box = _xe('div', 'owd-remind');
        if (byPerson.size > 1) box.appendChild(_xe('b', '', esc(a.name)));
        const ta = _xe('textarea', 'xp-in owd-ta'); ta.rows = 3; ta.value = owdRemindText(a.name, a.lines); ta.setAttribute('aria-label', 'The message to ' + a.name);
        box.appendChild(ta);
        const acts = _xe('div', 'owd-remind-a');
        acts.appendChild(uiButton({ label: 'Copy', icon: 'copy', size: 'sm', run: async () => { await copyText(ta.value, 'Message'); noted(a); } }));
        const person = (Array.isArray(state.people) ? state.people : []).find(p => p && owdKey(p.name) === a.key);
        const email = person && (person.email || (Array.isArray(person.emails) && person.emails[0]));
        acts.appendChild(uiButton({ label: email ? 'Email' : 'Open in email', icon: 'mail', size: 'sm', run: () => { const m = document.createElement('a'); m.href = `mailto:${email ? String(email).split('@').map(encodeURIComponent).join('@') : ''}?subject=${encodeURIComponent('A friendly nudge')}&body=${encodeURIComponent(ta.value)}`; document.body.appendChild(m); m.click(); m.remove(); noted(a); } }));
        if (navigator.share) acts.appendChild(uiButton({ label: 'Share…', icon: 'send', size: 'sm', run: () => navigator.share({ text: ta.value }).then(() => noted(a)).catch(() => {}) }));
        box.appendChild(acts);
        el.appendChild(box);
      }
      el.appendChild(_xe('p', 'xp-fh', 'Freeflo never sends this by itself. You choose how to send it.'));
      const p = owdPrefs();
      if (!p.payLink && !p.bankDetails) { const n = _xe('p', 'owd-hint', '<span>Want them to pay in one tap?</span>'); n.appendChild(uiButton({ label: 'Add a pay-me link', kind: 'link', run: () => owdBankDialog({ then: () => owdRemindDialog(refs) }) })); el.appendChild(n); }
    },
    actions: [{ label: 'Done', primary: true }],
  });
}
/** A link you can trust to open: the server's rule (lib/owed.mjs cleanPayLink) decides when it is saved; this says so as you type. */
function owdLinkOk(v) {
  const t = String(v || '').trim();
  if (!/^https:\/\/[^\s<>"'`\\]+$/i.test(t) || t.length > 200) return false;
  try { const u = new URL(t); return u.protocol === 'https:' && !u.username && !u.password && !u.port && /\.[a-z]{2,}$/i.test(u.hostname); } catch (e) { return false; }
}
function owdBankDialog(o) {
  o = o || {};
  const p = owdPrefs();
  const link = _xInput('url', p.payLink || '', 'e.g. https://monzo.me/yourname', { autocomplete: 'off', inputMode: 'url' });
  const details = _xInput('text', p.bankDetails || '', 'e.g. M Ahmed, 12-34-56, 12345678');
  // Saving a way to be paid means you want it used, unless you have said otherwise before.
  const on = _xe('label', 'owd-me', `<input type="checkbox"${p.sendBank || (!p.payLink && !p.bankDetails) ? ' checked' : ''}><span>Put them in my reminders</span>`);
  const err = _xe('div', 'owd-err'); err.hidden = true; err.setAttribute('role', 'alert');
  const check = () => { const bad = !!link.value.trim() && !owdLinkOk(link.value); err.textContent = bad ? 'That doesn’t look right. It should start with https://, for example https://monzo.me/yourname.' : ''; err.hidden = !bad; return !bad; };
  link.addEventListener('input', () => { if (!err.hidden) check(); });
  link.addEventListener('change', check);
  openDialog({
    title: 'How people pay you', size: 'sm',
    body(el) {
      el.className += ' xp-form';
      el.appendChild(_xField('A pay-me link (optional)', link, 'From Monzo, PayPal, Revolut or similar. With a Monzo or PayPal link, the amount is filled in for them.'));
      el.appendChild(err);
      const t = uiButton({ label: 'Try the link', kind: 'link', run: () => { if (check() && link.value.trim()) window.open(link.value.trim(), '_blank', 'noopener,noreferrer'); } });
      el.appendChild(t);
      el.append(_xField('Or your bank details (optional)', details, 'Your name, sort code and account number.'), on, _xe('p', 'xp-fh', 'These only go in a message you send yourself, and you can edit it each time. Freeflo never sends them to anyone.'));
    },
    actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, run: async () => {
      if (!check()) { link.focus(); return false; }
      const j = await owdDo('/prefs', { patch: { payLink: link.value.trim(), bankDetails: details.value.trim(), sendBank: on.querySelector('input').checked } }, { done: 'Saved', what: 'save that' });
      if (!j) return false;
      if (o.then) setTimeout(o.then, 60);
      return undefined;
    } }],
  });
}
/** Settling up with someone: both directions, what it comes to, and one step to close it all. */
function owdSettleDialog(p) {
  const owes = p.lines.filter(l => l.kind !== 'iowe'), mine = p.lines.filter(l => l.kind === 'iowe');
  const first = owdFirstName(p.name);
  const text = () => {
    const a = [`${p.name} and me:`];
    for (const l of owes) a.push(`- ${l.title}: you owe me ${owdMoney(l.left)}`);
    for (const l of mine) a.push(`- ${l.title}: I owe you ${owdMoney(l.left)}`);
    if (p.over > 0) a.push(`- You overpaid me by ${owdMoney(p.over)}`);
    a.push(p.net > 0 ? `So you owe me ${owdMoney(p.net)} overall.` : p.net < 0 ? `So I owe you ${owdMoney(-p.net)} overall.` : 'So we are even.');
    return a.join('\n') + (p.net > 0 ? owdPayWords(p.net) : '');
  };
  openDialog({
    title: `Settle up with ${first}`, size: 'sm',
    body(el) {
      const list = _xe('div', 'owd-settle');
      for (const l of owes) list.appendChild(_xe('div', 'owd-move', `<span>${esc(l.title)}</span><b class="num">${esc(owdMoney(l.left))}</b>`));
      for (const l of mine) list.appendChild(_xe('div', 'owd-move is-mine', `<span>${esc(l.title)} <small>you owe</small></span><b class="num">−${esc(owdMoney(l.left))}</b>`));
      if (p.over > 0) list.appendChild(_xe('div', 'owd-move is-mine', `<span>Overpaid you</span><b class="num">−${esc(owdMoney(p.over))}</b>`));
      el.appendChild(list);
      el.appendChild(_xe('div', 'owd-headline', `<b>${p.net > 0 ? `${esc(first)} owes you ${esc(owdMoney(p.net))} overall` : p.net < 0 ? `You owe ${esc(first)} ${esc(owdMoney(-p.net))} overall` : 'You are even'}</b>`));
    },
    actions: [{ label: 'Copy as a message', icon: 'copy', keepOpen: true, run: () => { copyText(text(), 'Summary'); return false; } }, { label: 'We’re settled', primary: true, icon: 'handshake', tip: 'Marks everything between you as paid', run: async () => { const j = await owdDo('/settle', { key: p.key }, { done: `Settled up with ${first}`, what: 'settle that' }); return j ? undefined : false; } }],
  });
}
/** Copy everything as text. */
function owdSummaryText() {
  const d = OWD.data; if (!d) return '';
  const a = [`Owed to me: ${owdMoney(d.summary.owedToMe)}`];
  for (const p of d.persons) { if (p.owes > 0) a.push(`${p.name}: ${owdMoney(p.owes)} (${p.lines.filter(l => l.kind !== 'iowe').map(l => l.title).join(', ')})`); }
  if (d.summary.iOwe > 0) { a.push('', `I owe: ${owdMoney(d.summary.iOwe)}`); for (const p of d.persons) if (p.iowe > 0) a.push(`${p.name}: ${owdMoney(p.iowe)}`); }
  return a.join('\n');
}

/* ---------- Home: Owed to me ---------- */
registerHomeWidget({
  id: 'owed-me', title: 'Owed to me', icon: 'handshake', order: 225, group: 'money', page: 'owed',
  description: 'What friends owe you, and whether the bank shows they paid',
  emptyHint: 'Appears when someone owes you (Money > Owed to me)',
  sizes: ['s', 'm'], defaultSize: 's', defaultHidden: true, gate: 'finance',
  aliases: ['split', 'splits', 'owed to me', 'splitwise', 'who owes me', 'paid me back', 'friends owe'],
  render(el, ctx) {
    ctx = ctx || {};
    if (ctx.preview) return _owCard(el, ctx, { owedToMe: 32, count: 4, oldestDays: 3, iOwe: 0, iOweCount: 0, think: 1 }, []);
    if (!OWD.loaded) { owdLoad(); return false; }
    const s = OWD.data && OWD.data.summary;
    if (!s || !(s.count || s.iOweCount || s.expectedCount)) return false;
    owdScan(false);
    return _owCard(el, ctx, s, OWD.data.persons);
  },
});
function _owCard(el, ctx, s, persons) {
  const card = _xe('section', `card home-card xw xw--${ctx.size || 's'}`);
  const h = _xe('div', 'card-h'); h.innerHTML = `${icon('handshake')}<h3 data-hw-title>Owed to me</h3><span class="spacer"></span>`; card.appendChild(h);
  const b = _xe('div', 'card-b xw-b'); card.appendChild(b);
  b.appendChild(_xe('div', 'xw-big num', owdAmt(s.owedToMe)));
  b.appendChild(_xe('div', 'xw-sub', [`${s.count} to come in`, s.iOweCount ? `you owe ${homeAmtHtml(owdMoney(s.iOwe))}` : '', s.oldestDays >= 14 ? `oldest ${owdAgo(s.oldestDays)}` : ''].filter(Boolean).join(' · ')));
  const q = OWD.suggestions[0];
  if (q && !ctx.preview) { const a = _xe('div', 'xw-ask', `${icon('circle-help', 'i-xs')} ${q.conf === 'low' ? `${owdAmt(q.amount)} arrived.` : `We think ${esc(owdFirstName(q.name))} paid ${owdAmt(q.amount)}.`} `); a.appendChild(uiButton({ label: 'Check', kind: 'link', run: owdOpen })); b.appendChild(a); }
  if (ctx.size === 'm') {
    const list = _xe('ul', 'xw-list');
    for (const p of persons.filter(x => x.owes > 0).slice(0, 4)) list.appendChild(_xe('li', '', `<span>${esc(p.name)}</span><span class="xw-n">${p.things} thing${p.things === 1 ? '' : 's'}</span><b class="num">${owdAmt(p.owes)}</b>`));
    b.appendChild(list);
  }
  const acts = _xe('div', 'xw-acts');
  acts.appendChild(uiButton({ label: 'Split', icon: 'plus', size: 'sm', run: () => { if (!ctx.preview) owdSplitDialog({}); } }));
  acts.appendChild(uiButton({ label: 'View', icon: 'arrow-right', size: 'sm', run: () => { if (!ctx.preview) owdOpen(); } }));
  b.appendChild(acts);
  el.appendChild(card);
  return true;
}
/** A line for the Money brief: what is owed, or the offer to split. Null when there is nothing to say. */
function owdBriefLine(o) {
  if (!OWD.loaded) { owdLoad(); return null; }
  const askOnly = !!(o && o.askOnly);   // a place that shows the total already (My money's widget)
  const s = OWD.data && OWD.data.summary, q = OWD.suggestions[0], offer = OWD.offers[0];
  const nudge = !askOnly && OWD.data && (OWD.data.nudges || [])[0];
  const back = (OWD.data && OWD.data.insights && OWD.data.insights.backMonth) || 0;
  if (!(s && ((s.count && !askOnly) || q)) && !offer && !nudge && !(back > 0 && !askOnly)) return null;
  const n = _xe('div', 'owd-brief');
  if (q) { n.innerHTML = `${icon('circle-help', 'i-sm')}<span>${q.conf === 'low' ? `${owdAmt(q.amount)} arrived. Is it someone paying you back?` : `We think ${esc(owdFirstName(q.name))} paid you ${owdAmt(q.amount)}.`}</span>`; n.appendChild(uiButton({ label: 'Check', kind: 'link', run: owdOpen })); }
  else if (nudge) { n.innerHTML = `${icon('calendar-clock', 'i-sm')}<span>${esc(owdFirstName(nudge.name))} hasn’t paid ${owdAmt(nudge.left)} for ${esc(nudge.title)} yet.</span>`; n.appendChild(uiButton({ label: 'See', kind: 'link', run: owdOpen })); }
  else if (s && s.count && !askOnly) { n.innerHTML = `${icon('handshake', 'i-sm')}<span>${owdAmt(s.owedToMe)} is owed to you.${back > 0 ? ` ${owdAmt(back)} has come back this month.` : ''}</span>`; n.appendChild(uiButton({ label: 'See who', kind: 'link', run: owdOpen })); }
  else if (back > 0 && !askOnly) { n.innerHTML = `${icon('circle-check', 'i-sm')}<span>${owdAmt(back)} has come back to you this month.</span>`; }
  if (offer) { const w = _xe('span', 'owd-brief-o', `<span>${esc(offer.m)}, ${owdAmt(Math.abs(offer.a))}: split this?</span>`); w.appendChild(uiButton({ label: 'Split', kind: 'link', run: () => owdSplitDialog(owdPrefillFromTx(offer)) })); w.appendChild(uiButton({ icon: 'x', size: 'sm', kind: 'ghost', tip: 'Not one to split', run: () => owdDismissOffer(offer) })); n.appendChild(w); }
  return n;
}

/* ---------- A pending payment that changed under a split or a claim (lib/owed.mjs pendingNotices) ---------- */
/** One calm line with the answers. Said until answered; the answer is remembered on all your computers. */
function owdNoticeEl(x) {
  const n = _xe('div', 'xp-remind owd-net owd-pend');
  const said = () => owdDo('/said', { id: x.id }, { quiet: true, what: 'note that' });
  const word = x.what === 'expense' ? 'expense' : 'split';
  const add = (o) => n.appendChild(uiButton({ kind: 'link', ...o }));
  if (x.kind === 'changed') {
    n.innerHTML = `${icon('info')}<span>${esc(x.title)} settled at ${owdAmt(x.now)}, not ${owdAmt(x.was)}.${x.claimed ? ' It is on a claim already, so check that claim.' : ` Update the ${word}?`}</span>`;
    if (x.claimed) { add({ label: 'OK', run: said }); return n; }
    add({ label: 'Update', run: async () => {
      if (x.what === 'expense') { await expDo('/update', { id: x.ref, patch: { amount: x.now } }, { done: 'Expense updated', what: 'update the expense' }); owdScan(true); return; }
      try { const j = await owdApi('/retotal', { id: x.ref, total: x.now }); owdSet(j); toast('Split updated', { icon: 'handshake', timeout: 8000, action: j.undo ? { label: 'Undo', run: () => owdUndo(j.undo) } : undefined }); owdRepaint(); owdMoneyChanged(); }
      catch (e) { owdSplitDialog({ edit: x.ref }); }   // it cannot be worked out by itself (you are not in it): the split opens, to share out the difference
    } });
    add({ label: 'Keep it', run: said });
    return n;
  }
  const gone = `${esc(x.title)} (${owdAmt(x.a)}) did not go through: your bank dropped it.`;
  if (x.what === 'claim') {
    n.innerHTML = `${icon('info')}<span>The ${owdAmt(x.a)} that paid ${esc(x.title)} did not go through: your bank dropped it. Mark it as not paid?</span>`;
    add({ label: 'Not paid', run: () => expDo('/unpaid', { ids: [x.ref] }, { done: 'Marked as not paid', what: 'change that' }).then(() => owdScan(true)) });
  } else if (x.what === 'paid') {
    n.innerHTML = `${icon('info')}<span>${esc(owdFirstName(x.name))}’s payment of ${owdAmt(x.a)} for ${esc(x.title)} did not go through: your bank dropped it. Take it off?</span>`;
    add({ label: 'Take it off', run: () => owdDo('/unassign', { tx: { k: x.k, txKey: x.txKey } }, { done: 'Taken off', what: 'take that off' }) });
  } else {
    n.innerHTML = `${icon('info')}<span>${gone} Delete the ${word}, or keep it?</span>`;
    add({ label: 'Delete it', run: () => (x.what === 'expense' ? expDo('/delete', { ids: [x.ref] }, { done: 'Expense deleted', what: 'delete that' }).then(() => owdScan(true)) : owdDo('/delete', { ids: [x.ref] }, { done: 'Split deleted', what: 'delete that' })) });
  }
  add({ label: 'Keep it', run: said });
  return n;
}
function owdNoticeEls(only) { return (OWD.notices || []).filter(x => !only || x.what === only || (only === 'expense' && x.what === 'claim')).map(owdNoticeEl); }
/** Said once out loud, per computer; after that it waits quietly in Transactions and Owed to me until it is answered. */
function owdNoticeToast() {
  let said = {};
  try { said = JSON.parse(localStorage.getItem('dash-pending-said') || '{}') || {}; } catch (e) { said = {}; }
  const fresh = (OWD.notices || []).find(x => !said[x.id + '|' + x.what]);
  if (!fresh) return;
  for (const x of OWD.notices) said[x.id + '|' + x.what] = 1;
  try { localStorage.setItem('dash-pending-said', JSON.stringify(said)); } catch (e) { /* private mode */ }
  const amt = (v) => (typeof homeAmountsHidden === 'function' && homeAmountsHidden() ? '•••' : owdMoney(v));
  toast(fresh.kind === 'changed' ? `${fresh.title} settled at ${amt(fresh.now)}, not ${amt(fresh.was)}` : `${fresh.title} did not go through`, { icon: 'info', timeout: 12000, action: { label: 'See', run: () => { if (typeof setView === 'function') setView('owed'); } } });
}

/* ---------- Transactions: the button and the chip on a row ---------- */
/** Your note on a payment: a line in the open row. Click it to change it. */
function owdTxNote(tx) {
  const cur = (OWD.data && OWD.data.notes && OWD.data.notes[tx.k]) || '';
  return uiButton({ label: cur || 'Add a note', icon: 'pencil', cls: 'fv-btn ghost', tip: 'Your own note on this payment. Search finds it.', run: async () => {
    const text = await promptDialog({ title: 'A note on this payment', label: 'Note', value: cur, placeholder: 'e.g. Mum’s birthday present', confirmLabel: 'Save' });
    if (text == null || (!text && !cur)) return;   // Cancel, or nothing typed where there was no note
    await owdDo('/note', { k: tx.k, text }, { done: text ? 'Note saved' : 'Note taken off', icon: 'pencil', what: 'save the note' });
  } });
}
/** Sent something back? Watch for the refund: it comes off this payment when it arrives. */
function owdTxRefund(tx) {
  if (!tx || !(Number(tx.a) < 0) || (tx.kind !== 'spend' && tx.kind !== 'off') || owdForTx(tx)) return null;
  return uiButton({ label: 'Expecting a refund', icon: 'wallet', cls: 'fv-btn ghost', tip: 'Freeflo watches for it and tells you if it is late', run: () => owdExpectDialog({ title: `Refund: ${tx.m}`, from: tx.m, total: Math.abs(Number(tx.a)), date: tx.d, expectKind: 'refund', source: { type: 'tx', txKey: expTxKey(tx), k: tx.k } }) });
}
function owdTxButton(tx) {
  if (!tx) return null;
  if (!OWD.loaded) owdLoad();
  if (Number(tx.a) > 0) {
    return uiButton({ label: owdTransferOf(owdTxOf(tx)) ? 'Paid back · Change' : 'Who paid this?', icon: 'handshake', cls: 'fv-btn', tip: 'Say who it was from and what it was for', run: () => owdPayDialog({ tx: owdTxOf(tx) }) });
  }
  if (tx.kind !== 'spend' && tx.kind !== 'off') return null;
  const t = owdForTx(tx);
  if (t) return uiButton({ label: t.kind === 'split' ? `Split · ${t.done} of ${t.count} paid` : t.kind === 'expect' ? 'Expecting a refund' : 'Open', icon: 'handshake', cls: 'fv-btn', tip: 'Open it', run: () => owdSplitDialog({ edit: t.id }) });
  if (typeof expForTx === 'function' && expForTx(tx)) { const e = expForTx(tx); return uiButton({ label: 'Move to Owed to me', icon: 'handshake', cls: 'fv-btn', tip: 'Friends pay you back, not work', run: () => owdSplitDialog({ fromExpense: e }) }); }
  return uiButton({ label: 'Split this', icon: 'handshake', cls: 'fv-btn', tip: 'Share it between people and see who has paid', run: () => owdSplitDialog(owdPrefillFromTx(tx)) });
}
function owdTxChip(tx) {
  if (!OWD.loaded || !tx) return null;
  const used = owdTransferOf(owdTxOf(tx));
  if (Number(tx.a) > 0) {
    if (!used && !tx.sb) return null;
    const s = _xe('span', 'xp-tag owd-tag', icon('handshake', 'i-xs') + esc(tx.sa ? `Paid back ${owdMoney(tx.sa)} of ${owdMoney(tx.a)}` : 'Paid back'));
    s.title = used ? used.lines.map(l => `${l.name} ${owdMoney(l.amount)} (${l.title})`).join(', ') : 'Someone paying you back. Not counted as income.';
    return s;
  }
  if (used) { const s = _xe('span', 'xp-tag owd-tag', icon('handshake', 'i-xs') + esc(`Paid ${owdFirstName(used.lines[0].name)}`)); s.title = used.lines.map(l => `${l.name} ${owdMoney(l.amount)} (${l.title})`).join(', '); return s; }
  const t = owdForTx(tx);
  if (t) {
    const s = _xe('span', 'xp-tag owd-tag', icon('handshake', 'i-xs') + esc(t.kind === 'expect' ? (tx.bk ? `Refunded ${owdMoney(tx.bk)}` : 'Expecting a refund') : tx.bk ? `Your share so far ${owdMoney(Math.abs(tx.a) - tx.bk)}` : t.kind === 'split' ? `Split · ${t.done} of ${t.count} paid` : 'Noted'));
    s.title = `${t.title}: ${t.done} of ${t.count} paid`; return s;
  }
  const o = OWD.offers.find(x => x.k === tx.k);
  if (!o) return null;
  const w = _xe('span', 'xp-hintchip');
  const go = _xe('button', 'xp-hintb', icon('handshake', 'i-xs') + 'Split this?'); go.type = 'button';
  go.onclick = (ev) => { ev.stopPropagation(); owdSplitDialog(owdPrefillFromTx(tx)); };
  const no = _xe('button', 'xp-hintx', icon('x', 'i-xs')); no.type = 'button'; no.title = 'Not one to split'; no.setAttribute('aria-label', 'Dismiss this hint');
  no.onclick = (ev) => { ev.stopPropagation(); w.remove(); owdDismissOffer(o); };
  w.append(go, no);
  return w;
}
