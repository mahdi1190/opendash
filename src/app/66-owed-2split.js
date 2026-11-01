/* ============================================================
   OWED TO ME, the split screen: everything on one screen, no steps. Who, then how (equally by default), with who owes what
   worked out live as you type. Used from Transactions (a row, or several at once), the brief, the board, or by hand.
   ============================================================ */
function owdPrefillFromTx(tx) {
  const amount = Math.abs(Number(tx.a));
  return { title: tx.m || '', total: amount, date: tx.d, merchant: tx.m || '', source: { type: 'tx', txKey: tx.txKey || expTxKey(tx), k: tx.k } };
}
/** "I paid £40 for bowling" -> {title: 'Bowling', total: 40}. */
function owdParseWords(text) {
  const m = /[£$€]\s?(\d+(?:[.,]\d{1,2})?)/.exec(text);
  if (!m) return null;
  const total = Number(m[1].replace(',', '.'));
  const title = text.replace(m[0], ' ').replace(/^\s*(i\s+)?(paid|spent|got|bought)\b/i, ' ').replace(/^\s*(for|on|at)\b/i, ' ').replace(/\s+(for|on|at)\s*$/i, ' ').replace(/\s{2,}/g, ' ').trim();
  return { total, title: title ? title[0].toUpperCase() + title.slice(1) : '' };
}
/** A rate from the app's own data: your own payments in that currency, or online if you turned that on (Settings > Travel). -> {rate, date, source} or null. */
async function owdFxRate(cur, date) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) ? date : todayStr();
  try {
    const r = await fetch(`/api/finance/travel?from=${expAddDays(d, -1)}&to=${d}&ccy=${encodeURIComponent(cur)}`, { headers: { Accept: 'application/json' } });
    const j = await r.json();
    return (r.ok && j && j.rates && j.rates[cur]) || null;
  } catch (e) { return null; }
}
/** What a bank payment was in its own currency, when the statement says. -> {ccy, amt, rate} or null. */
async function owdFxOfTx(k, date) {
  if (!k || !date) return null;
  try {
    const r = await fetch(`/api/finance/travel?from=${date}&to=${date}`, { headers: { Accept: 'application/json' } });
    const j = await r.json();
    const row = r.ok && j && Array.isArray(j.rows) ? j.rows.find(x => x.id === k) : null;
    return row && row.fx && row.fx.ccy && Number(row.fx.amt) > 0 ? row.fx : null;
  } catch (e) { return null; }
}
const OWD_CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'HKD', 'HUF', 'INR', 'ISK', 'MXN', 'NOK', 'NZD', 'PLN', 'SEK', 'SGD', 'THB', 'TRY', 'ZAR'];
/** Both monies for one amount: "€20.00 (£17.24)". */
function owdBoth(home, t, fx) { return t && t.fx && Number(fx) > 0 ? `${owdMoney(fx, t.fx.cur)} (${owdMoney(home)})` : owdMoney(home); }
const OWD_METHODS = [['equal', 'Equally'], ['exact', 'Exact amounts'], ['shares', 'Shares'], ['percent', 'Percent'], ['items', 'Plus extras']];
function owdSplitDialog(pre) {
  pre = pre || {};
  const edit = pre.edit ? owdThing(pre.edit) : null;
  if (edit && edit.kind === 'expect') return owdExpectDialog({ edit: edit.id });
  const fx = pre.fromExpense || null;
  const v = edit || (fx ? { title: fx.title, total: fx.amount, date: fx.date, merchant: fx.merchant, note: fx.note, source: fx.source && fx.source.k ? fx.source : { type: 'expense' } } : pre);
  const S = { method: edit ? edit.method : 'equal', meIn: edit ? edit.meIn : true, myWeight: edit && edit.myWeight != null ? edit.myWeight : 1, myExtra: edit && edit.myExtra || 0, people: [], paidBy: '', source: v.source || { type: 'manual' }, merchant: v.merchant || '' };
  if (edit) {
    if (edit.kind === 'iowe') { S.paidBy = edit.lines[0].name; S.people = (edit.others || []).map(o => ({ name: owdPersonName(o.key), key: o.key })); }
    else S.people = edit.lines.map(l => ({ name: l.name, key: l.key, weight: l.weight, pct: l.pct, exact: l.exact, extra: l.extra, what: l.what }));
  }
  if (fx && fx.payer) S.people.push({ name: fx.payer, key: owdKey(fx.payer) });
  let summary, listEl, chipsEl, sugEl, errEl, moneyHint, nameIn, whoRow, withLabel, everyTime = null;
  const title = _xInput('text', v.title || '', 'What was it? e.g. Bowling, or “I paid £40 for bowling”');
  const amount = _xInput('number', edit && edit.fx ? edit.fx.amount : (v.total || ''), '0.00', { step: '0.01', min: '0', inputMode: 'decimal' });
  const date = _xInput('date', v.date || todayStr());
  // Paid in another currency. The amount box is then in that currency; a linked bank payment fixes what it was in yours.
  const FX = { on: !!(edit && edit.fx), cur: edit && edit.fx ? edit.fx.cur : '', rate: edit && edit.fx ? edit.fx.rate : 0, source: edit && edit.fx ? edit.fx.source : 'typed', at: edit && edit.fx ? edit.fx.at : '', home: S.source && S.source.k ? Number(edit ? edit.total : v.total) || 0 : 0, note: '' };
  const fxCurIn = _xInput('text', FX.cur, 'e.g. EUR', { maxLength: 3, autocomplete: 'off' }); fxCurIn.className += ' owd-fx-cur'; fxCurIn.setAttribute('aria-label', 'The currency it was paid in');
  const fxRateIn = _xInput('number', FX.rate || '', '', { step: '0.0001', min: '0', inputMode: 'decimal' }); fxRateIn.className += ' owd-fx-rate'; fxRateIn.setAttribute('aria-label', 'How much of that currency for one of yours');
  let fxBox, fxNoteEl, fxOutEl, amountLabel;
  const fxReady = () => FX.on && /^[A-Z]{3}$/.test(FX.cur) && Number(FX.rate) > 0;
  const fxHomeTotal = () => (FX.home > 0 ? FX.home : (fxReady() ? Math.round(Number(amount.value) / Number(FX.rate) * 100) / 100 : 0));
  /** Pence of what is being split, in its money and, when it is another currency, in yours too. */
  const fmtP = (p) => (fxReady() ? `${owdMoney(p / 100, FX.cur)} (${owdMoney(p / 100 / Number(FX.rate))})` : owdMoney(p / 100));
  const fmtT = (n) => owdMoney(n, fxReady() ? FX.cur : undefined);
  const payerIn = _xInput('text', S.paidBy, 'Who paid? e.g. Sam', { autocomplete: 'off' });
  const groupIn = _xInput('text', '', 'Name this group to use it again, e.g. Bowling lot');
  const tripIn = _xInput('text', pre.tripName || (edit && edit.tripId && OWD.data.trips.find(x => x.id === edit.tripId) || {}).name || '', 'optional: a trip or event, e.g. Lisbon');
  const dl = _xe('datalist'); dl.id = 'owd-trips-dl'; dl.innerHTML = (OWD.data ? OWD.data.trips : []).map(p => `<option value="${escAttr(p.name)}">`).join(''); tripIn.setAttribute('list', dl.id);
  const note = _xInput('text', v.note || '', 'optional');
  let someone = !!(pre.someoneElse || S.paidBy);
  const total = () => Number(amount.value) || 0;
  const addPerson = (p) => {
    const name = String(p.name || '').trim(); if (!name) return;
    const key = p.key || owdKey(name); if (!key || S.people.some(x => x.key === key)) return;
    S.people.push({ name, pid: p.pid || '', key });
    paint();
  };
  const paintChips = () => {
    chipsEl.querySelectorAll('.owd-pchip').forEach(n => n.remove());
    for (const p of S.people) {
      const c = _xe('span', 'owd-pchip', `<span>${esc(p.name)}</span>`);
      const x = _xe('button', 'owd-pchip-x', icon('x', 'i-xs')); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + p.name);
      x.onclick = () => { S.people = S.people.filter(y => y !== p); paint(); nameIn.focus(); };
      c.appendChild(x); chipsEl.insertBefore(c, nameIn);
    }
  };
  const paintSug = () => {
    sugEl.innerHTML = '';
    const q = nameIn.value.trim().toLowerCase();
    const chosen = new Set(S.people.map(p => p.key));
    const groups = (OWD.data ? OWD.data.groups : []).filter(g => !q || g.name.toLowerCase().includes(q)).slice(0, 3);
    for (const g of groups) {
      const b = _xe('button', 'xp-chip owd-gchip', `${icon('users', 'i-xs')}<span>${esc(g.name)}</span>`); b.type = 'button';
      b.onclick = () => { S.groupId = g.id; for (const k of g.keys) addPerson({ key: k, name: owdPersonName(k) }); };
      sugEl.appendChild(b);
    }
    const cands = owdCandidates().filter(c => !chosen.has(c.key) && (!q || c.name.toLowerCase().includes(q))).slice(0, q ? 8 : 7);
    for (const c of cands) {
      const b = _xe('button', 'xp-chip', `<span>${esc(c.name)}</span>`); b.type = 'button';
      b.onclick = () => { addPerson(c); nameIn.value = ''; paintSug(); nameIn.focus(); };
      sugEl.appendChild(b);
    }
    if (q && !owdCandidates().some(c => c.name.toLowerCase() === q)) {
      const b = _xe('button', 'xp-chip on', `${icon('plus', 'i-xs')}<span>Add ${esc(nameIn.value.trim())}</span>`); b.type = 'button';
      b.onclick = () => { addPerson({ name: nameIn.value }); nameIn.value = ''; paintSug(); nameIn.focus(); };
      sugEl.appendChild(b);
    }
  };
  /** The sum, as it stands: a row each, the headline and where the pennies went. */
  const paintList = () => {
    const payKey = someone ? owdKey(payerIn.value) : '';
    const everyone = payKey && !S.people.some(p => p.key === payKey) ? [...S.people, { name: payerIn.value.trim(), key: payKey, isPayer: true, weight: 1 }] : S.people;
    const r = owdSplit(total(), everyone, { method: S.method, meIn: someone ? true : S.meIn, myWeight: S.myWeight, myExtra: S.myExtra, cur: fxReady() ? FX.cur : undefined });
    errEl.textContent = total() > 0 && r.error ? r.error : '';
    errEl.hidden = !errEl.textContent;
    listEl.innerHTML = '';
    const showRow = (who, key, inp, valP, cls) => {
      const row = _xe('div', 'owd-sr' + (cls ? ' ' + cls : ''));
      row.appendChild(_xe('span', 'owd-sr-n', who));
      if (inp) row.appendChild(inp); else row.appendChild(_xe('span', 'owd-sr-sp'));
      const out = _xe('b', 'owd-sr-am num', esc(fmtP(valP || 0))); out.dataset.key = key;
      row.appendChild(out);
      return row;
    };
    const field = (p, k, ph, lbl) => {
      const i = _xInput('number', p[k] == null ? '' : p[k], ph, { step: k === 'weight' ? '0.5' : '0.01', min: '0', inputMode: 'decimal' }); i.className += ' owd-sr-in'; i.setAttribute('aria-label', lbl);
      i.oninput = () => { p[k] = i.value; paintAmounts(); };
      return i;
    };
    const inputFor = (p, me) => {
      if (S.method === 'shares') return field(me ? { get weight() { return S.myWeight; }, set weight(x) { S.myWeight = x; } } : p, 'weight', '1', 'Shares');
      if (S.method === 'percent' && !me) return field(p, 'pct', '%', 'Percent');
      if (S.method === 'exact' && !me) return field(p, 'exact', '0.00', 'Amount');
      if (S.method === 'items') return field(me ? { get extra() { return S.myExtra; }, set extra(x) { S.myExtra = x; } } : p, 'extra', 'extra', 'Extra on top');
      return null;
    };
    for (const p of everyone) {
      const row = showRow(esc(p.name) + (p.isPayer ? ' <small>paid</small>' : ''), p.key, inputFor(p), r.lines.get(p.key));
      if (S.method === 'items' && !p.isPayer) { const w = _xInput('text', p.what || '', 'what for? e.g. the extra game'); w.className += ' owd-sr-what'; w.oninput = () => { p.what = w.value; }; row.appendChild(w); }
      listEl.appendChild(row);
    }
    if (!someone) {
      const tog = _xe('label', 'owd-me'); tog.innerHTML = `<input type="checkbox"${S.meIn ? ' checked' : ''}><span>I’m in it too</span>`;
      tog.querySelector('input').onchange = (e) => { S.meIn = e.target.checked; paint(); };
      listEl.appendChild(showRow('', '_me', S.meIn ? inputFor({}, true) : null, r.me, 'is-me')).firstChild.appendChild(tog);
    } else listEl.appendChild(showRow('<span class="owd-me-w">Your share</span>', '_me', inputFor({}, true), r.me, 'is-me'));
    paintAmounts();
  };
  /** Only the sums change while typing: inputs keep their focus. */
  const paintAmounts = () => {
    const payKey = someone ? owdKey(payerIn.value) : '';
    const everyone = payKey && !S.people.some(p => p.key === payKey) ? [...S.people, { name: payerIn.value.trim(), key: payKey, weight: 1 }] : S.people;
    const r = owdSplit(total(), everyone, { method: S.method, meIn: someone ? true : S.meIn, myWeight: S.myWeight, myExtra: S.myExtra, cur: fxReady() ? FX.cur : undefined });
    errEl.textContent = total() > 0 && r.error ? r.error : ''; errEl.hidden = !errEl.textContent;
    for (const o of listEl.querySelectorAll('.owd-sr-am')) { const k = o.dataset.key; o.textContent = fmtP(k === '_me' ? r.me : (r.lines.get(k) || 0)); }
    const T = total(), n = everyone.length + (someone || S.meIn ? 1 : 0);
    let head = 'Put in the amount and who it was with';
    if (T > 0 && everyone.length && !r.error) {
      const others = [...r.lines.values()].reduce((a, x) => a + x, 0) / 100;
      if (S.method === 'equal') head = `${fmtT(T)} ÷ ${n} = ${fmtP([...r.lines.values()][0])} each`;
      else head = `${fmtT(T)} between ${n}`;
      if (someone) head += ` · you owe ${owdFirstName(payerIn.value) || 'them'} ${fmtP(r.me)}`;
      else head += ` · they owe you ${fmtP(Math.round(others * 100))}`;
    }
    summary.innerHTML = `<b>${esc(head)}</b>${r.rounding > 0 && !r.error && T > 0 ? `<small>${esc(fmtT(r.rounding / 100))} that doesn’t divide falls to you</small>` : ''}`;
    paintFx();
  };
  const paint = () => { paintChips(); paintSug(); paintList(); whoRow.hidden = !someone; withLabel.textContent = someone ? 'Who else was in it (if anyone)' : 'With'; };
  /** The line under the currency row: what it comes to in your money, and where the rate came from. */
  const paintFx = () => {
    if (!fxBox) return;
    fxBox.classList.toggle('is-on', FX.on);
    if (amountLabel) amountLabel.textContent = FX.on && /^[A-Z]{3}$/.test(FX.cur) ? `Amount in ${FX.cur}` : 'Amount';
    if (!FX.on) return;
    const hm = fxHomeTotal();
    fxOutEl.textContent = hm > 0 ? `That’s ${owdMoney(hm)}${FX.home > 0 ? ' from your bank' : ''}` : '';
    fxNoteEl.textContent = FX.note;
  };
  const fxLookup = async () => {
    if (!/^[A-Z]{3}$/.test(FX.cur)) return;
    if (FX.cur === OWD.currency) { FX.note = `That’s your own money. Turn this off to split it normally.`; FX.rate = 0; fxRateIn.value = ''; paintAmounts(); return; }
    FX.note = 'Looking for a rate…'; paintFx();
    const asked = FX.cur;
    const r = await owdFxRate(asked, date.value);
    if (asked !== FX.cur || !FX.on) return;
    if (r && r.rate > 0) {
      FX.rate = r.rate; fxRateIn.value = r.rate;
      FX.source = r.source === 'online' ? 'online' : 'own'; FX.at = r.date || date.value;
      FX.note = r.source === 'online' ? `Online rate, ${_xpDate(FX.at)}. You can change it.` : `From your last payment in ${asked}, ${_xpDate(FX.at)}. You can change it.`;
      // The bank says what it was in yours: this is only a first guess at what it was in theirs.
      if (FX.home > 0) { amount.value = Math.round(FX.home * r.rate * 100) / 100; FX.note = `About that, going by ${FX.source === 'online' ? 'the online rate' : 'your last payment'}. Change the amount to what the bill said.`; }
    } else {
      // No rate for this one: nothing may be left over from the last currency tried.
      FX.rate = 0; fxRateIn.value = ''; FX.source = 'typed'; FX.at = date.value;
      if (FX.home > 0) { amount.value = ''; FX.note = `Type what it was in ${asked}, and we’ll work out the rate from what left your bank.`; }
      else FX.note = `We don’t have a rate for ${asked} yet. Type it in, or turn on online rates in Settings > Travel.`;
    }
    paintAmounts();
  };
  const fxOnChange = () => {
    if (FX.home > 0 && Number(amount.value) > 0) { FX.rate = Math.round(Number(amount.value) / FX.home * 1e4) / 1e4; fxRateIn.value = FX.rate; FX.source = 'bank'; FX.at = date.value; FX.note = 'Worked out from what really left your bank.'; }
  };
  // Hand-written: is it a payment the bank already has?
  let findT = 0;
  const lookForPayment = () => {
    clearTimeout(findT);
    const lookFor = FX.on ? fxHomeTotal() : total();
    if (edit || (S.source && S.source.k) || !(lookFor > 0)) { moneyHint.innerHTML = ''; return; }
    findT = setTimeout(async () => {
      let j; try { j = await owdApi('/find-payment', { amount: lookFor }); } catch (e) { return; }
      moneyHint.innerHTML = '';
      const row = (j.rows || [])[0]; if (!row || (S.source && S.source.k)) return;
      moneyHint.appendChild(_xe('span', '', `${esc(row.merchant)} on ${esc(_xpDate(row.date))} was ${esc(owdMoney(row.amount))}. Is this it?`));
      moneyHint.appendChild(uiButton({ label: 'Yes, that one', kind: 'link', run: () => { S.source = { type: 'tx', txKey: row.txKey, k: row.k }; S.merchant = row.merchant; if (FX.on) { FX.home = row.amount; fxOnChange(); paintAmounts(); } if (!title.value.trim()) title.value = row.merchant; date.value = row.date; moneyHint.innerHTML = ''; moneyHint.appendChild(_xe('span', '', `${icon('check', 'i-xs')} Linked to ${esc(row.merchant)}, so what comes back comes off it`)); } }));
    }, 350);
  };
  const dialogTitle = edit ? 'Edit' : fx ? 'Move to Owed to me' : someone ? 'Someone else paid' : 'Split a payment';
  openDialog({
    title: dialogTitle, size: 'md', className: 'owd-dlg',
    body(el) {
      el.className += ' xp-form owd-form';
      const top = _xe('div', 'owd-top');
      const amountF = _xField('Amount', amount); amountLabel = amountF.querySelector('.xp-fl');
      top.append(_xField('What for', title), amountF, _xField('Date', date));
      el.appendChild(top);
      // Another currency: a quiet link until it is wanted.
      fxBox = _xe('div', 'owd-fx');
      const open = _xe('button', 'owd-fx-open', `${icon('globe', 'i-xs')}<span>Paid in another currency?</span>`); open.type = 'button';
      open.onclick = () => { FX.on = true; if (!FX.cur) { FX.cur = 'EUR'; fxCurIn.value = 'EUR'; } paintAmounts(); fxLookup(); setTimeout(() => fxCurIn.select(), 30); };
      const row = _xe('div', 'owd-fx-row');
      const curDl = _xe('datalist'); curDl.id = 'owd-cur-dl'; curDl.innerHTML = OWD_CURRENCIES.filter(c => c !== OWD.currency).map(c => `<option value="${c}">`).join(''); fxCurIn.setAttribute('list', curDl.id);
      const off = _xe('button', 'owd-fx-off', icon('x', 'i-xs')); off.type = 'button'; off.setAttribute('aria-label', 'It was in my own money'); off.title = 'It was in my own money';
      off.onclick = () => { FX.on = false; if (FX.home > 0) amount.value = FX.home; paint(); paintFx(); };
      row.append(_xe('span', 'owd-fx-w', 'Paid in'), fxCurIn, curDl, _xe('span', 'owd-fx-w', `at ${esc(owdMoney(1).replace(/[\d.,\s]+/g, ''))}1 =`), fxRateIn, off);
      fxOutEl = _xe('b', 'owd-fx-out num'); fxNoteEl = _xe('small', 'owd-fx-note');
      fxBox.append(open, row, fxOutEl, fxNoteEl);
      el.appendChild(fxBox);
      fxCurIn.oninput = () => { FX.cur = fxCurIn.value.trim().toUpperCase(); if (/^[A-Z]{3}$/.test(FX.cur)) { fxCurIn.value = FX.cur; fxLookup(); } paintAmounts(); };
      fxRateIn.oninput = () => { FX.rate = Number(fxRateIn.value) || 0; FX.source = 'typed'; FX.at = date.value; FX.note = ''; if (FX.home > 0 && FX.rate > 0) amount.value = Math.round(FX.home * FX.rate * 100) / 100; paintAmounts(); };
      if (!edit && !fx) {
        const rd = _xe('button', 'owd-fx-open', `${icon('receipt', 'i-xs')}<span>Split it item by item from a receipt?</span>`); rd.type = 'button';
        rd.onclick = () => owdReceiptStart({ title: title.value.trim(), merchant: S.merchant, date: date.value, total: S.source && S.source.k ? Number(FX.home || amount.value) : 0, source: S.source, tripName: tripIn.value.trim(), people: S.people.map(p => ({ name: p.name, pid: p.pid, key: p.key })), after: pre.after });
        el.appendChild(rd);
      }
      moneyHint = _xe('div', 'owd-hint');
      whoRow = _xField('Who paid', payerIn); el.appendChild(whoRow);
      const pl = _xe('div', 'xp-f'); withLabel = _xe('span', 'xp-fl', 'With'); pl.appendChild(withLabel);
      chipsEl = _xe('div', 'owd-pick');
      nameIn = _xInput('text', '', 'Type a name'); nameIn.className = 'owd-name'; nameIn.autocomplete = 'off'; nameIn.setAttribute('aria-label', 'Add a person');
      chipsEl.appendChild(nameIn);
      nameIn.oninput = () => paintSug();
      nameIn.onkeydown = (e) => {
        if ((e.key === 'Enter' || e.key === ',') && nameIn.value.trim()) { e.preventDefault(); e.stopPropagation(); addPerson({ name: nameIn.value, pid: (owdCandidates().find(c => c.name.toLowerCase() === nameIn.value.trim().toLowerCase()) || {}).pid }); nameIn.value = ''; paintSug(); nameIn.focus(); }
        else if (e.key === 'Backspace' && !nameIn.value && S.people.length) { S.people.pop(); paint(); nameIn.focus(); }
      };
      pl.appendChild(chipsEl); sugEl = _xe('div', 'owd-sug'); pl.appendChild(sugEl); el.appendChild(pl);
      const seg = _xe('div', 'xp-seg owd-methods'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'How to split it');
      const paintSeg = () => { seg.innerHTML = ''; for (const [k, l] of OWD_METHODS) seg.appendChild(_xChip(l, '', 'xp-chip' + (S.method === k ? ' on' : ''), () => { S.method = k; paintSeg(); paintList(); })); };
      paintSeg(); el.appendChild(seg);
      summary = _xe('div', 'owd-headline'); summary.setAttribute('aria-live', 'polite'); el.appendChild(summary);
      errEl = _xe('div', 'owd-err'); errEl.hidden = true; errEl.setAttribute('role', 'alert'); el.appendChild(errEl);
      listEl = _xe('div', 'owd-sum-list'); el.appendChild(listEl);
      el.appendChild(moneyHint);   // below the people, so that nothing you are about to click moves when it arrives
      const opts = _xe('details', 'owd-opts'); opts.innerHTML = '<summary>More: who paid, a trip, a group, a note</summary>';
      if (tripIn.value) opts.open = true;
      const w = _xe('label', 'owd-me owd-else', `<input type="checkbox"${someone ? ' checked' : ''}><span>Someone else paid, not me</span>`);
      w.querySelector('input').onchange = (e) => { someone = e.target.checked; paint(); };
      payerIn.oninput = () => paintList();
      const dlp = _xe('datalist'); dlp.id = 'owd-people-dl'; dlp.innerHTML = owdCandidates().map(c => `<option value="${escAttr(c.name)}">`).join(''); payerIn.setAttribute('list', dlp.id);
      opts.append(w, dlp, _xField('Trip or event', tripIn), dl, _xField('Save these people as a group', groupIn), _xField('Note', note));
      if (!edit && S.merchant) { everyTime = _xe('label', 'owd-me', `<input type="checkbox"><span>Do this every time ${esc(S.merchant)} leaves the bank</span>`); opts.appendChild(everyTime); }
      el.appendChild(opts);
      title.addEventListener('change', () => { if (amount.value) return; const p = owdParseWords(title.value); if (p) { amount.value = p.total; title.value = p.title; paintAmounts(); lookForPayment(); } });
      amount.addEventListener('input', () => { if (FX.on) fxOnChange(); paintAmounts(); lookForPayment(); });
      paint();
      paintFx();
      lookForPayment();
      // A payment the statement says was in another currency: start there.
      if (!edit && S.source && S.source.k) owdFxOfTx(S.source.k, date.value).then((f) => {
        if (!f || f.ccy === OWD.currency || FX.on || !fxBox.isConnected) return;
        FX.on = true; FX.cur = f.ccy; fxCurIn.value = f.ccy; amount.value = f.amt; fxOnChange(); paint(); paintFx();
      });
      setTimeout(() => (someone && title.value ? payerIn : title.value ? nameIn : title).focus(), 40);
    },
    actions: [{ label: 'Cancel' }, { label: edit ? 'Save' : 'Save', primary: true, icon: 'check', run: async () => {
      const parsed = !amount.value ? owdParseWords(title.value) : null; if (parsed) { amount.value = parsed.total; title.value = parsed.title; }
      if (nameIn.value.trim()) { addPerson({ name: nameIn.value }); nameIn.value = ''; }
      if (!title.value.trim()) { title.focus(); toast('Say what it was for.', { kind: 'err' }); return false; }
      if (!(total() > 0)) { amount.focus(); toast('Put in the amount.', { kind: 'err' }); return false; }
      if (someone && !payerIn.value.trim()) { payerIn.focus(); toast('Say who paid.', { kind: 'err' }); return false; }
      if (FX.on && !/^[A-Z]{3}$/.test(FX.cur)) { fxCurIn.focus(); toast('Say which currency, for example EUR.', { kind: 'err' }); return false; }
      if (FX.on && !(Number(FX.rate) > 0)) { fxRateIn.focus(); toast(`Put in the rate: how much ${FX.cur} for 1 of yours.`, { kind: 'err' }); return false; }
      const thing = { kind: 'split', title: title.value.trim(), total: FX.on ? fxHomeTotal() : total(), date: date.value, ...(FX.on ? { fx: { cur: FX.cur, amount: total(), rate: Number(FX.rate), at: FX.at || date.value, source: FX.source } } : {}), method: S.method, meIn: someone ? true : S.meIn, myWeight: S.myWeight, myExtra: S.myExtra, merchant: S.merchant, note: note.value.trim(), source: S.source,
        people: S.people.map(p => ({ name: p.name, pid: p.pid, weight: p.weight, pct: p.pct, exact: p.exact, extra: p.extra, what: p.what })), tripName: tripIn.value.trim(), saveGroup: groupIn.value.trim(), groupId: S.groupId, fromExpense: fx || undefined };
      if (someone) thing.paidBy = payerIn.value.trim();
      if (edit) {
        const j = await owdDo('/update', { id: edit.id, thing }, { done: 'Saved', what: 'save that' });
        return j ? undefined : false;
      }
      const t = await owdCreate(thing, { fromExpense: fx });
      if (t && everyTime && everyTime.querySelector('input').checked && !someone) {
        await owdDo('/repeat/save', { repeat: { title: thing.title, match: { m: S.merchant, near: thing.total }, amount: thing.total, method: S.method === 'items' ? 'equal' : S.method, meIn: S.meIn, myWeight: S.myWeight, from: thing.date,
          people: thing.people.map(p => ({ name: p.name, pid: p.pid, weight: p.weight, pct: p.pct, exact: p.exact })), seen: { k: S.source && S.source.k, txKey: S.source && S.source.txKey, date: thing.date } } }, { done: `${thing.title} will split by itself each time it leaves the bank.`, icon: 'repeat', what: 'set that up' });
      }
      if (t && typeof pre.after === 'function') pre.after();
      return t ? undefined : false;
    } }],
  });
  return undefined;
}
/** Several payments selected in Transactions: one is the normal screen; several are each split the same way. */
function owdSplitRows(rows, after) {
  const fresh = (rows || []).filter(x => x && x.a < 0 && !owdForTx(x) && !(typeof expForTx === 'function' && expForTx(x)));
  if (!fresh.length) { toast('Those are split already, or are not payments out.'); return; }
  if (fresh.length === 1) { owdSplitDialog({ ...owdPrefillFromTx(fresh[0]), after }); return; }
  let nameIn;
  const chosen = [];
  openDialog({
    title: `Split ${fresh.length} payments the same way`, size: 'sm',
    body(el) {
      el.className += ' xp-form owd-form';
      el.appendChild(_xe('p', 'xp-fh', `Each one is split equally between you and these people. ${fresh.length} payments, ${esc(owdMoney(fresh.reduce((a, x) => a + Math.abs(x.a), 0)))} in all.`));
      const chips = _xe('div', 'owd-pick'); const sug = _xe('div', 'owd-sug');
      nameIn = _xInput('text', '', 'Type a name'); nameIn.className = 'owd-name'; nameIn.autocomplete = 'off'; nameIn.setAttribute('aria-label', 'Add a person');
      chips.appendChild(nameIn);
      const paint = () => {
        chips.querySelectorAll('.owd-pchip').forEach(n => n.remove());
        for (const p of chosen) { const c = _xe('span', 'owd-pchip', `<span>${esc(p.name)}</span>`); const x = _xe('button', 'owd-pchip-x', icon('x', 'i-xs')); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + p.name); x.onclick = () => { chosen.splice(chosen.indexOf(p), 1); paint(); nameIn.focus(); }; c.appendChild(x); chips.insertBefore(c, nameIn); }
        sug.innerHTML = '';
        const q = nameIn.value.trim().toLowerCase();
        for (const c of owdCandidates().filter(c2 => !chosen.some(x => x.key === c2.key) && (!q || c2.name.toLowerCase().includes(q))).slice(0, 7)) { const b = _xe('button', 'xp-chip', `<span>${esc(c.name)}</span>`); b.type = 'button'; b.onclick = () => { chosen.push(c); nameIn.value = ''; paint(); nameIn.focus(); }; sug.appendChild(b); }
      };
      nameIn.oninput = paint;
      nameIn.onkeydown = (e) => { if (e.key === 'Enter' && nameIn.value.trim()) { e.preventDefault(); e.stopPropagation(); chosen.push({ name: nameIn.value.trim(), key: owdKey(nameIn.value) }); nameIn.value = ''; paint(); nameIn.focus(); } };
      el.append(chips, sug);
      paint();
      setTimeout(() => nameIn.focus(), 40);
    },
    actions: [{ label: 'Cancel' }, { label: 'Split them', primary: true, icon: 'check', run: async () => {
      if (nameIn.value.trim()) chosen.push({ name: nameIn.value.trim(), key: owdKey(nameIn.value) });
      if (!chosen.length) { nameIn.focus(); toast('Add at least one person.', { kind: 'err' }); return false; }
      const things = fresh.map(x => { const p = owdPrefillFromTx(x); return { kind: 'split', title: p.title || 'Payment', total: p.total, date: p.date, merchant: p.merchant, source: p.source, method: 'equal', meIn: true, people: chosen.map(c => ({ name: c.name, pid: c.pid })) }; });
      const j = await owdCreateMany(things);
      if (!j) return false;
      if (typeof after === 'function') after();
      return undefined;
    } }],
  });
}
