/* ============================================================
   OWED TO ME, a receipt. Read a photo or PDF for who had what, or type the items in. Reading is the same safe route as a payslip
   (lib/owed-receipt.mjs): only on your press, it says what is sent first, and everything comes back to this screen to check
   before anything is saved. Tap items to give them to people; tax, tip and service are shared out by what each person had.
   ============================================================ */
function owdFileData(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('That file could not be read.')); r.readAsDataURL(file); }); }
/** A photo is made smaller before it goes, and that also leaves out where it was taken. A PDF goes as it is. */
async function owdShrinkPhoto(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.86));
    return blob && blob.size ? blob : file;
  } catch (e) { return file; }
}
/** Choose the file, then say what is sent. Sends only when you press Read it. */
function owdReceiptStart(pre) {
  pre = pre || {};
  const inp = _xe('input'); inp.type = 'file'; inp.accept = 'application/pdf,image/*'; inp.hidden = true;
  inp.onchange = () => { const f = inp.files && inp.files[0]; inp.remove(); if (f) owdReceiptAsk(f, pre); };
  document.body.appendChild(inp); inp.click();
  setTimeout(() => inp.remove(), 120000);
}
function owdReceiptAsk(file, pre) {
  if (file.size > 20 * 1024 * 1024) { toast('That file is too big. Try a smaller photo.', { kind: 'err' }); return; }
  let ctl = null, body, url = /^image\//.test(file.type) ? URL.createObjectURL(file) : '';
  const manual = () => owdReceiptDialog({ pre, token: '', receipt: { merchant: pre.merchant || pre.title || '', date: pre.date || null, currency: null, items: [], tax: null, tip: null, service: null, discount: null, total: null, unclear: [] }, checks: [] });
  const go = async () => {
    ctl = new AbortController();
    paint('busy');
    let j = null, err = '';
    try {
      const small = await owdShrinkPhoto(file);
      if (small.size > 8 * 1024 * 1024) throw Object.assign(new Error('That file is too big (8 MB at most). Try a smaller copy.'), { plain: true });
      const data = await owdFileData(small);
      const r = await fetch('/api/owed/receipt/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, data }), signal: ctl.signal });
      j = await r.json().catch(() => null);
      if (!r.ok || !j || j.ok === false) { err = (j && j.error) || 'Claude could not read that just now.'; j = null; }
    } catch (e) {
      if (e && e.name === 'AbortError') { if (close) close(); return; }
      err = e && e.plain ? e.message : 'Freeflo isn’t answering. Try again in a moment.';
    }
    if (j) { if (close) close(); owdReceiptDialog({ pre, token: j.token, receipt: j.receipt, checks: j.checks || [] }); return; }
    paint('err', err);
  };
  const paint = (st, err) => {
    body.innerHTML = '';
    if (url && st !== 'busy') { const im = _xe('img', 'owd-rc-thumb'); im.src = url; im.alt = 'Your receipt'; body.appendChild(im); }
    const acts = _xe('div', 'owd-rc-acts');
    if (st === 'ask') {
      body.appendChild(_xe('p', 'xp-fh', 'The whole picture goes to Claude to read, including anything printed on it such as the last digits of your card. It is held only for this and removed straight after. You check every item before anything is saved.'));
      acts.append(uiButton({ label: 'Read it', icon: 'sparkles', kind: 'primary', run: go }), uiButton({ label: 'Type it in myself', run: () => { if (close) close(); manual(); } }), uiButton({ label: 'Cancel', kind: 'ghost', run: () => { if (close) close(); } }));
    } else if (st === 'busy') {
      body.appendChild(_xe('div', 'xp-loading', '<span class="spinner" aria-hidden="true"></span> Reading your receipt…'));
      acts.append(uiButton({ label: 'Cancel', run: () => { if (ctl) ctl.abort(); } }));
    } else {
      body.appendChild(_xe('div', 'owd-err', esc(err)));
      acts.append(uiButton({ label: 'Try again', icon: 'refresh-cw', kind: 'primary', run: go }), uiButton({ label: 'Type it in myself', run: () => { if (close) close(); manual(); } }), uiButton({ label: 'Close', kind: 'ghost', run: () => { if (close) close(); } }));
    }
    body.appendChild(acts);
  };
  let close = null;
  close = openDialog({ title: 'Read this receipt with Claude?', size: 'sm', className: 'owd-dlg', body(el) { body = el; el.className += ' owd-rc-ask'; paint('ask'); }, onClose() { if (ctl) ctl.abort(); if (url) URL.revokeObjectURL(url); } });
}
/** The same sum as lib/owed.mjs shareReceipt, for the live preview. -> {shares: Map key -> pence, total: pence} or {error}. */
function owdReceiptShares(R) {
  const P = (v) => Math.round((Number(v) || 0) * 100 + (Number(v) < 0 ? -1e-9 : 1e-9));
  const has = new Map();
  for (const it of R.items) {
    if (!it.who.size) return { error: `Say who had “${it.n || 'that item'}”.`, shares: new Map(), total: 0 };
    const p = P(it.p), who = [...it.who], base = Math.trunc(p / who.length);
    let rem = p - base * who.length;
    for (const k of who) has.set(k, (has.get(k) || 0) + base);
    const to = it.who.has('_me') ? '_me' : who[0];
    has.set(to, has.get(to) + rem); rem = 0;
  }
  const sub = [...has.values()].reduce((a, x) => a + x, 0);
  if (sub <= 0) return { error: 'Add what was on the receipt.', shares: new Map(), total: 0 };
  const extras = P(R.tax) + P(R.tip) + P(R.service) - P(R.discount);
  let given = 0;
  const shares = new Map();
  for (const [k, v] of has) { const x = Math.trunc(extras * v / sub); shares.set(k, v + x); given += x; }
  const to = has.has('_me') ? '_me' : [...has.entries()].sort((a, b) => b[1] - a[1])[0][0];
  shares.set(to, shares.get(to) + (extras - given));
  if ([...shares.values()].some(v => v < 0)) return { error: 'That leaves someone owing less than nothing. Check the discount.', shares, total: sub + extras };
  return { shares, total: sub + extras };
}
/** The confirmation screen. Everything can be changed; nothing is saved until Save. */
function owdReceiptDialog(o) {
  const pre = o.pre || {}, rc = o.receipt || {};
  const home = OWD.currency;
  const people = (pre.people || []).map(p => ({ ...p, key: p.key || owdKey(p.name) }));
  const R = { items: (rc.items || []).map(x => ({ n: x.name, p: x.price, who: new Set() })), tax: rc.tax, tip: rc.tip, service: rc.service, discount: rc.discount };
  const printed = rc.total;
  const title = _xInput('text', pre.title || rc.merchant || '', 'What was it? e.g. Dinner at Tasca');
  const date = _xInput('date', pre.date || rc.date || todayStr());
  const curIn = _xInput('text', rc.currency && rc.currency !== home ? rc.currency : '', home, { maxLength: 3, autocomplete: 'off' }); curIn.className += ' owd-fx-cur'; curIn.setAttribute('aria-label', 'The currency on the receipt');
  const rateIn = _xInput('number', '', '', { step: '0.0001', min: '0', inputMode: 'decimal' }); rateIn.className += ' owd-fx-rate'; rateIn.setAttribute('aria-label', 'How much of that currency for one of yours');
  const FX = { source: 'typed', at: '', note: '', bank: pre.source && pre.source.k && Number(pre.total) > 0 ? Number(pre.total) : 0 };
  const keep = _xe('label', 'owd-me', `<input type="checkbox"${o.token ? ' checked' : ''}><span>Keep the picture with this split</span>`);
  let listEl, sumEl, errEl, fxNote, fxRow;
  const cur = () => { const c = curIn.value.trim().toUpperCase(); return /^[A-Z]{3}$/.test(c) && c !== home ? c : ''; };
  const rate = () => Number(rateIn.value) || 0;
  const M = (p) => (cur() ? owdMoney(p / 100, cur()) : owdMoney(p / 100));
  const both = (p) => (cur() && rate() > 0 ? `${M(p)} (${owdMoney(p / 100 / rate())})` : M(p));
  const everyone = () => [{ key: '_me', name: 'You' }, ...people];
  const lookup = async () => {
    const c = cur(); fxRow.classList.toggle('is-on', !!c);
    if (!c) { paintSum(); return; }
    FX.note = 'Looking for a rate…'; paintSum();
    const r = await owdFxRate(c, date.value);
    if (c !== cur()) return;
    if (r && r.rate > 0) { rateIn.value = r.rate; FX.source = r.source === 'online' ? 'online' : 'own'; FX.at = r.date || date.value; FX.note = r.source === 'online' ? `Online rate, ${_xpDate(FX.at)}. You can change it.` : `From your last payment in ${c}, ${_xpDate(FX.at)}. You can change it.`; }
    else { rateIn.value = ''; FX.source = 'typed'; FX.at = date.value; FX.note = `We don’t have a rate for ${c} yet. Type it in, or turn on online rates in Settings > Travel.`; }
    paintSum();
  };
  const paintSum = () => {
    const r = owdReceiptShares(R);
    errEl.textContent = R.items.length && r.error ? r.error : ''; errEl.hidden = !errEl.textContent;
    sumEl.innerHTML = '';
    if (r.total > 0) {
      const off = printed != null && Math.abs(r.total - Math.round(printed * 100)) > 1;
      sumEl.appendChild(_xe('div', 'owd-headline', `<b>${esc(both(r.total))} in all</b>${off ? `<small class="owd-old">The receipt says ${esc(M(Math.round(printed * 100)))}.</small>` : ''}`));
      if (FX.bank > 0 && !cur() && Math.abs(r.total - Math.round(FX.bank * 100)) > 1) sumEl.appendChild(_xe('small', 'xp-fh', `Your bank shows ${esc(owdMoney(FX.bank))} for this payment.`));
    }
    const list = _xe('div', 'owd-sum-list');
    for (const p of everyone()) { const v = r.shares.get(p.key); if (!v) continue; const row = _xe('div', 'owd-sr' + (p.key === '_me' ? ' is-me' : '')); row.append(_xe('span', 'owd-sr-n', esc(p.name)), _xe('span', 'owd-sr-sp'), _xe('b', 'owd-sr-am num', esc(both(v)))); list.appendChild(row); }
    sumEl.appendChild(list);
    fxNote.textContent = FX.note;
  };
  const chip = (it, p, row) => {
    const on = it.who.has(p.key);
    const b = _xChip(p.key === '_me' ? 'You' : owdFirstName(p.name), '', 'xp-chip owd-rc-chip' + (on ? ' on' : ''), () => {
      if (it.who.has(p.key)) it.who.delete(p.key); else it.who.add(p.key);
      paintRow(row, it); paintSum();
    });
    return b;
  };
  const paintRow = (row, it) => {
    const wrap = row.querySelector('.owd-rc-who'); wrap.innerHTML = '';
    for (const p of everyone()) wrap.appendChild(chip(it, p, row));
    if (people.length) { const all = everyone().every(p => it.who.has(p.key)); wrap.appendChild(_xChip(all ? 'Nobody' : 'Everyone', 'users', 'xp-chip owd-rc-all', () => { if (all) it.who.clear(); else for (const p of everyone()) it.who.add(p.key); paintRow(row, it); paintSum(); })); }
  };
  const paintList = () => {
    listEl.innerHTML = '';
    for (const it of R.items) {
      const row = _xe('div', 'owd-rc-row');
      const n = _xInput('text', it.n || '', 'Item'); n.className += ' owd-rc-n'; n.setAttribute('aria-label', 'Item'); n.oninput = () => { it.n = n.value; };
      const pr = _xInput('number', it.p == null ? '' : it.p, '0.00', { step: '0.01', inputMode: 'decimal' }); pr.className += ' owd-rc-p'; pr.setAttribute('aria-label', `Price of ${it.n || 'this item'}`); pr.oninput = () => { it.p = pr.value; paintSum(); };
      const x = _xe('button', 'owd-fx-off', icon('x', 'i-xs')); x.type = 'button'; x.setAttribute('aria-label', `Take ${it.n || 'this item'} off`); x.onclick = () => { R.items.splice(R.items.indexOf(it), 1); paintList(); paintSum(); };
      const top = _xe('div', 'owd-rc-top'); top.append(n, pr, x);
      row.append(top, _xe('div', 'owd-rc-who'));
      paintRow(row, it);
      listEl.appendChild(row);
    }
    if (!R.items.length) listEl.appendChild(_xe('p', 'xp-fh', 'Nothing here yet. Add what was on the receipt.'));
  };
  const extra = (key, label) => { const i = _xInput('number', R[key] == null ? '' : R[key], '0.00', { step: '0.01', min: '0', inputMode: 'decimal' }); i.oninput = () => { R[key] = i.value; paintSum(); }; return _xField(label, i); };
  const picker = owdPeoplePicker(people, () => { paintList(); paintSum(); });
  const done = async () => {
    picker.commit();
    if (!title.value.trim()) { title.focus(); toast('Say what it was for.', { kind: 'err' }); return false; }
    if (!R.items.length) { toast('Add what was on the receipt.', { kind: 'err' }); return false; }
    if (!people.length) { picker.focus(); toast('Add who was there.', { kind: 'err' }); return false; }
    const r = owdReceiptShares(R);
    if (r.error) { toast(r.error, { kind: 'err' }); return false; }
    if (![...r.shares.keys()].some(k => k !== '_me')) { toast('Give something to someone else, or there is nothing to split.', { kind: 'err' }); return false; }
    if (cur() && !(rate() > 0)) { rateIn.focus(); toast(`Put in the rate: how much ${cur()} for 1 of yours.`, { kind: 'err' }); return false; }
    const totalThere = r.total / 100, c = cur();
    const homeTotal = c ? (FX.bank > 0 ? FX.bank : Math.round(totalThere / rate() * 100) / 100) : totalThere;
    const thing = { kind: 'split', title: title.value.trim(), total: homeTotal, date: date.value, merchant: pre.merchant || rc.merchant || '', source: pre.source || { type: 'manual' }, tripName: pre.tripName || '', method: 'exact', meIn: true,
      people: people.map(p => ({ name: p.name, pid: p.pid })), receipt: { items: R.items.map(it => ({ n: String(it.n || 'Item'), p: Number(it.p) || 0, w: [...it.who] })), tax: Number(R.tax) || 0, tip: Number(R.tip) || 0, service: Number(R.service) || 0, discount: Number(R.discount) || 0 },
      ...(c ? { fx: { cur: c, amount: totalThere, rate: FX.bank > 0 ? Math.round(totalThere / FX.bank * 1e4) / 1e4 : rate(), at: FX.at || date.value, source: FX.bank > 0 ? 'bank' : FX.source } } : {}) };
    const t = await owdCreate(thing, { receiptToken: o.token && keep.querySelector('input').checked ? o.token : '' });
    if (!t) return false;
    if (typeof pre.after === 'function') pre.after();
    return undefined;
  };
  openDialog({
    title: o.token ? 'Is this right?' : 'Who had what', size: 'md', className: 'owd-dlg owd-rc', keepOnOutside: true,
    body(el) {
      el.className += ' xp-form owd-form';
      for (const c of o.checks || []) el.appendChild(_xe('p', 'owd-rc-note ' + esc(c.level), `${icon(c.level === 'warn' ? 'triangle-alert' : 'info', 'i-sm')}<span>${esc(c.text)}</span>`));
      if ((rc.unclear || []).length) el.appendChild(_xe('p', 'owd-rc-note warn', `${icon('triangle-alert', 'i-sm')}<span>Claude was not sure about: ${esc(rc.unclear.join(', '))}.</span>`));
      const top = _xe('div', 'xp-row2'); top.append(_xField('What for', title), _xField('Date', date)); el.appendChild(top);
      const pl = _xe('div', 'xp-f'); pl.append(_xe('span', 'xp-fl', 'Who was there, besides you'), picker); el.appendChild(pl);
      fxRow = _xe('div', 'owd-fx owd-rc-fx');
      const row = _xe('div', 'owd-rc-curs');
      row.append(_xe('span', 'owd-fx-w', 'Currency'), curIn);
      const rw = _xe('span', 'owd-rc-rate'); rw.append(_xe('span', 'owd-fx-w', `at ${esc(owdMoney(1).replace(/[\d.,\s]+/g, ''))}1 =`), rateIn); row.appendChild(rw);
      fxNote = _xe('small', 'owd-fx-note'); fxRow.append(row, fxNote); el.appendChild(fxRow);
      curIn.oninput = () => { const c = curIn.value.trim().toUpperCase(); if (/^[A-Z]{3}$/.test(c) || !c) { curIn.value = c; lookup(); } };
      rateIn.oninput = () => { FX.source = 'typed'; FX.at = date.value; FX.note = ''; paintSum(); };
      el.appendChild(_xe('b', 'owd-rc-h', 'Tap who had each thing'));
      listEl = _xe('div', 'owd-rc-list'); el.appendChild(listEl);
      const add = _xe('div', 'owd-more'); add.appendChild(uiButton({ label: 'Add an item', icon: 'plus', kind: 'link', run: () => { R.items.push({ n: '', p: null, who: new Set() }); paintList(); paintSum(); const all = listEl.querySelectorAll('.owd-rc-n'); if (all.length) all[all.length - 1].focus(); } })); el.appendChild(add);
      const ex = _xe('div', 'owd-rc-extras'); ex.append(extra('tax', 'Tax added on top'), extra('tip', 'Tip'), extra('service', 'Service charge'), extra('discount', 'Discount')); el.appendChild(ex);
      el.appendChild(_xe('p', 'xp-fh', 'These are shared out by what each person had. Pennies that don’t divide fall to you.'));
      errEl = _xe('div', 'owd-err'); errEl.hidden = true; errEl.setAttribute('role', 'alert'); el.appendChild(errEl);
      sumEl = _xe('div', 'owd-rc-sum'); el.appendChild(sumEl);
      if (o.token) el.appendChild(keep);
      paintList(); lookup(); paintSum();
    },
    // However it closes, the server stops holding the file (a kept one has moved by then).
    onClose() { if (o.token) owdApi('/receipt/cancel', { token: o.token }).catch(() => {}); },
    actions: [{ label: 'Cancel' }, { label: 'Yes, save it', primary: true, icon: 'check', run: done }],
  });
}
