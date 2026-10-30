/* ============================================================
   OWED TO ME, the payment picker: say what one bank payment was for. "Sam sent £16: £8 for himself, £8 for Alex." Tick people,
   change any amount, and say what happens to what is left. Reached from any payment in Transactions, from a suggestion
   (Choose…), from a line and from the page (Match a payment). A payment out works the same way against what you owe,
   and can also be attached to a split written by hand, an expense or a trip. All of it can be changed later here.
   ============================================================ */
function owdTxOf(tx) { return { k: tx.k || '', txKey: expTxKey(tx), date: tx.d, amount: Math.abs(Number(tx.a)), memo: tx.memo || '', merchant: tx.m || '', dir: Number(tx.a) < 0 ? 'out' : 'in' }; }
function owdTransferOf(o) { const list = (OWD.data && OWD.data.transfers) || []; return list.find(x => (o.k && x.k === o.k) || (o.txKey && x.txKey === o.txKey)) || null; }
const owdPn = (n) => Math.round((Number(n) || 0) * 100 + 1e-9);

function owdPayDialog(o) {
  o = o || {};
  const tx = o.tx || {}, out = tx.dir === 'out', A = owdPn(tx.amount);
  const cur = owdTransferOf(tx);
  const curAmt = new Map((cur ? cur.lines : []).map(l => [l.id + '|' + l.key, owdPn(l.amount)]));
  const sel = new Map();   // 'thing|person' -> what you typed, in pounds
  for (const a of (cur ? cur.lines : (o.preset || []))) sel.set(a.id + '|' + a.key, Math.min(Number(a.amount), A / 100).toFixed(2));
  const expSel = new Set(); let linkSel = '';
  let payer = o.payer || (cur && cur.by) || '';
  let rest = cur ? (cur.over > 0 ? 'credit' : cur.gift > 0 ? 'gift' : 'none') : '';
  let q = '', trip = '';
  let listEl, barEl, restEl, payerSel, errEl;
  const canHave = (l, t) => l.left + (curAmt.get(t.id + '|' + l.key) || 0) / 100;
  const things = () => owdThings().filter(t => (out ? t.kind === 'iowe' : t.kind !== 'iowe') && t.lines.some(l => canHave(l, t) > 0.004)).slice().reverse();   // the most recent first
  const usedP = () => [...sel.values()].reduce((a, v) => a + owdPn(v), 0) + (out ? 0 : expItems().filter(e => expSel.has(e.id)).reduce((a, e) => a + owdPn(e.amount), 0));
  const payerName = () => { const p = OWD.data.people.find(x => x.key === payer); return p ? owdFirstName(p.name) : ''; };
  const hints = () => { const p = OWD.data.people.find(x => x.key === payer); return (p && p.paysFor) || {}; };

  const paintBar = () => {
    const used = usedP(), left = A - used;
    barEl.innerHTML = `<div class="owd-used-t"><b class="num">${esc(owdMoney(used / 100))} of ${esc(owdMoney(A / 100))} used</b></div><span class="owd-bar" role="progressbar" aria-valuenow="${Math.min(100, Math.round(used / A * 100))}" aria-valuemin="0" aria-valuemax="100"><i class="${used > A + 1 ? 'is-over' : ''}" style="width:${Math.min(100, Math.round(used / A * 100))}%"></i></span>`;
    errEl.textContent = used > A + 1 ? `That is ${owdMoney((used - A) / 100)} more than the payment. Bring one down.` : '';
    errEl.hidden = !errEl.textContent;
    restEl.innerHTML = '';
    if (left <= 1 || !(sel.size || expSel.size)) return;
    if (out) { restEl.appendChild(_xe('small', 'owd-hint', `The other ${esc(owdMoney(left / 100))} stays as it is.`)); return; }
    const name = payerName();
    if (!rest) rest = name ? 'credit' : 'none';
    if (rest === 'credit' && !name) rest = 'none';
    restEl.appendChild(_xe('span', 'owd-rest-t', `The other ${esc(owdMoney(left / 100))}:`));
    const seg = _xe('div', 'xp-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'What the rest is');
    const opts = [['none', 'Not related'], ['gift', 'A gift']];
    if (name) opts.unshift(['credit', `Credit with ${name}`]);
    for (const [k, l] of opts) seg.appendChild(_xChip(l, '', 'xp-chip' + (rest === k ? ' on' : ''), () => { rest = k; paintBar(); }));
    restEl.appendChild(seg);
  };
  const lineRow = (t, l) => {
    const ref = t.id + '|' + l.key, on = sel.has(ref), max = canHave(l, t);
    const row = _xe('div', 'owd-pl' + (on ? ' on' : ''));
    const lab = _xe('label', 'owd-pl-l');
    const cb = _xe('input'); cb.type = 'checkbox'; cb.checked = on; cb.setAttribute('aria-label', `${l.name}, ${t.title}`);
    cb.onchange = () => {
      if (cb.checked) { const room = Math.max(0, A - usedP()) / 100; sel.set(ref, Math.min(max, room > 0.004 ? room : max).toFixed(2)); if (!payer && !out) payer = l.key; }
      else sel.delete(ref);
      paintList(); paintBar();
    };
    const by = on && payer && payer !== l.key && !out ? `Paid by ${esc(payerName())} for ${esc(owdFirstName(l.name))}` : '';
    const hint = !by && !on && !out && hints()[l.key] ? `${esc(payerName())} often pays for ${esc(owdFirstName(l.name))}` : '';
    const sub = [by, hint, !on ? `${esc(owdMoney(max))} left` : (Number(sel.get(ref)) < max - 0.004 ? `of ${esc(owdMoney(max))}` : '')].filter(Boolean).join(' · ');
    lab.append(cb, _xe('span', 'owd-pl-n', `${esc(l.name)}${sub ? `<small>${sub}</small>` : ''}`));
    row.appendChild(lab);
    if (on) {
      const am = _xInput('number', sel.get(ref), '', { step: '0.01', min: '0', inputMode: 'decimal' }); am.className += ' owd-pl-am'; am.setAttribute('aria-label', `Amount for ${l.name}`);
      am.oninput = () => { sel.set(ref, am.value); paintBar(); };
      am.onchange = () => { if (Number(am.value) > max + 0.004) { am.value = max.toFixed(2); sel.set(ref, am.value); paintBar(); toast(`${owdFirstName(l.name)} only has ${owdMoney(max)} left on this.`, { icon: 'info' }); } };
      row.appendChild(am);
    }
    return row;
  };
  const paintList = () => {
    const top = listEl.scrollTop;
    listEl.innerHTML = '';
    const nq = expNorm(q);
    const tripName = (t) => { const tr = t.tripId && OWD.data.trips.find(x => x.id === t.tripId); return tr ? tr.name : ''; };
    let shown = 0;
    for (const t of things()) {
      if (trip && t.tripId !== trip) continue;
      const open = t.lines.filter(l => canHave(l, t) > 0.004);
      const hit = !nq || expNorm(`${t.title} ${t.merchant || ''} ${tripName(t)} ${open.map(l => l.name).join(' ')}`).includes(nq);
      if (!hit) continue;
      shown++;
      const g = _xe('section', 'owd-pg');
      const head = _xe('div', 'owd-pg-h', `<span class="owd-pg-t"><b>${esc(t.title)}</b><small>${esc(_xpDate(t.date))}${tripName(t) ? ' · ' + esc(tripName(t)) : ''}</small></span>`);
      if (open.length > 1) {
        const all = open.every(l => sel.has(t.id + '|' + l.key));
        const ev = _xe('label', 'owd-me owd-pg-all', `<input type="checkbox"${all ? ' checked' : ''}><span>Everyone on this</span>`);
        ev.querySelector('input').onchange = (e) => {
          for (const l of open) { const ref = t.id + '|' + l.key; if (e.target.checked) { if (!sel.has(ref)) sel.set(ref, canHave(l, t).toFixed(2)); } else sel.delete(ref); }
          paintList(); paintBar();
        };
        head.appendChild(ev);
      }
      g.appendChild(head);
      const lines = [...open].sort((a, b) => (hints()[b.key] || 0) - (hints()[a.key] || 0));
      for (const l of lines) g.appendChild(lineRow(t, l));
      listEl.appendChild(g);
    }
    if (!shown) listEl.appendChild(_xe('div', 'xp-none', nq || trip ? 'Nothing matches.' : (out ? 'You don’t owe anyone anything right now.' : 'Nobody owes you anything right now.')));
    // An expense it paid back, or a payment you made for one.
    const exps = expItems().filter(e => (out ? !(e.source && e.source.txKey) : e.status !== 'paid') && (!nq || expNorm(`${e.title} ${e.payer}`).includes(nq)));
    if (exps.length && !trip) {
      const d = _xe('details', 'owd-pg owd-pg-x'); d.open = expSel.size > 0 || !!nq;
      d.appendChild(_xe('summary', '', `An expense (${exps.length})`));
      for (const e of exps.slice(0, 30)) {
        const lab = _xe('label', 'owd-pl-l owd-pl', `<input type="checkbox"${expSel.has(e.id) ? ' checked' : ''} aria-label="${escAttr(e.title)}"><span class="owd-pl-n">${esc(e.title)}<small>${esc(e.payer || 'no payer yet')} · ${esc(_xpDate(e.date))}</small></span><b class="num">${esc(owdMoney(e.amount))}</b>`);
        lab.querySelector('input').onchange = (ev) => { if (ev.target.checked) expSel.add(e.id); else expSel.delete(e.id); paintBar(); };
        d.appendChild(lab);
      }
      listEl.appendChild(d);
    }
    // A payment out: the one you made for a split or a refund you wrote in by hand; or a trip.
    if (out) {
      const free = owdThings().filter(t => t.kind !== 'iowe' && !(t.source && t.source.k) && (!nq || expNorm(t.title).includes(nq))).slice().reverse();
      if (free.length) {
        const d = _xe('details', 'owd-pg owd-pg-x'); d.open = !!linkSel || !!nq;
        d.appendChild(_xe('summary', '', `A split you wrote in by hand (${free.length})`));
        for (const t of free.slice(0, 30)) {
          const lab = _xe('label', 'owd-pl-l owd-pl', `<input type="radio" name="owd-link"${linkSel === t.id ? ' checked' : ''} aria-label="${escAttr(t.title)}"><span class="owd-pl-n">${esc(t.title)}<small>${esc(_xpDate(t.date))}</small></span><b class="num">${esc(owdMoney(t.total))}</b>`);
          lab.querySelector('input').onchange = () => { linkSel = t.id; };
          d.appendChild(lab);
        }
        listEl.appendChild(d);
      }
      const trips = OWD.data.trips;
      if (trips.length && !nq) {
        const d = _xe('details', 'owd-pg owd-pg-x');
        d.appendChild(_xe('summary', '', `A trip or event (${trips.length})`));
        for (const tr of trips.slice(0, 12)) {
          const row = _xe('div', 'owd-pl', `<span class="owd-pl-n">${esc(tr.name)}<small>${tr.count} payment${tr.count === 1 ? '' : 's'}</small></span>`);
          row.appendChild(uiButton({ label: 'Add to it', size: 'sm', run: () => owdSplitDialog({ title: tx.merchant || '', total: A / 100, date: tx.date, merchant: tx.merchant || '', tripName: tr.name, source: { type: 'tx', txKey: tx.txKey, k: tx.k } }) }));
          d.appendChild(row);
        }
        listEl.appendChild(d);
      }
    }
    listEl.scrollTop = top;
  };
  const paintPayer = () => {
    if (!payerSel) return;
    const seen = new Set(), opts = [];
    const add = (k, n) => { if (k && !seen.has(k)) { seen.add(k); opts.push(`<option value="${escAttr(k)}"${k === payer ? ' selected' : ''}>${esc(n)}</option>`); } };
    for (const t of owdThings()) if (t.kind !== 'iowe') for (const l of t.lines) add(l.key, l.name);
    for (const p of OWD.data.people) add(p.key, p.name);
    payerSel.innerHTML = `<option value=""${payer ? '' : ' selected'}>Not sure</option>` + opts.join('');
  };
  const memoLine = [tx.merchant && !String(tx.memo || '').toUpperCase().includes(String(tx.merchant).toUpperCase()) ? tx.merchant : '', tx.memo].filter(Boolean).join(' · ');
  openDialog({
    title: `What was this ${owdMoney(A / 100)} for?`, size: 'md', className: 'owd-pay',
    body(el) {
      el.className += ' xp-form owd-form';
      el.appendChild(_xe('p', 'owd-pay-m', `${esc(_xpDate(tx.date))}${memoLine ? ' · ' + esc(memoLine) : ''}`));
      if (!out) {
        payerSel = _xe('select', 'xp-in'); payerSel.setAttribute('aria-label', 'Who sent it');
        payerSel.onchange = () => { payer = payerSel.value; paintList(); paintBar(); };
        const w = _xe('label', 'xp-f owd-pay-who'); w.append(_xe('span', 'xp-fl', 'Sent by'), payerSel); el.appendChild(w);
        paintPayer();
        if (!payer) owdApi('/pick-info', { tx }).then((j) => { if (j.payer && !payer) { payer = j.payer; paintPayer(); paintList(); paintBar(); } }).catch(() => {});
      }
      barEl = _xe('div', 'owd-used'); barEl.setAttribute('aria-live', 'polite'); el.appendChild(barEl);
      restEl = _xe('div', 'owd-rest'); el.appendChild(restEl);
      errEl = _xe('div', 'owd-err'); errEl.hidden = true; errEl.setAttribute('role', 'alert'); el.appendChild(errEl);
      const tools = _xe('div', 'owd-pay-tools');
      const si = _xe('label', 'input input-sm xp-search', icon('search') + '<input type="search" placeholder="Search names and things" aria-label="Search">');
      si.querySelector('input').oninput = (e) => { q = e.target.value; paintList(); };
      tools.appendChild(si);
      const tripsAll = OWD.data.trips;
      if (tripsAll.length && !out) {
        const ts = _xe('select', 'xp-in owd-pay-trip'); ts.setAttribute('aria-label', 'Only one trip');
        ts.innerHTML = '<option value="">All trips and things</option>' + tripsAll.map(t => `<option value="${escAttr(t.id)}">${esc(t.name)}</option>`).join('');
        ts.onchange = () => { trip = ts.value; paintList(); };
        tools.appendChild(ts);
      }
      el.appendChild(tools);
      listEl = _xe('div', 'owd-pay-list'); el.appendChild(listEl);
      paintList(); paintBar();
    },
    actions: [
      cur ? { label: 'Take it off', icon: 'rotate-ccw', tip: 'This payment was not for any of these', run: async () => { const j = await owdDo('/unassign', { tx }, { done: 'Taken off. It can be matched again.', icon: 'rotate-ccw', what: 'take that off' }); return j ? undefined : false; } } : null,
      'spacer',
      { label: 'Cancel' },
      { label: 'Save', primary: true, icon: 'check', run: async () => {
        const allocs = [...sel].filter(([, v]) => Number(v) > 0).map(([ref, v]) => { const i = ref.indexOf('|'); return { id: ref.slice(0, i), key: ref.slice(i + 1), amount: Number(v) }; });
        if (!allocs.length && !expSel.size && !linkSel) { toast(out ? 'Tick what it was for.' : 'Tick who it was for.', { kind: 'err' }); return false; }
        if (usedP() > A + 1) { toast(`That is ${owdMoney((usedP() - A) / 100)} more than the payment.`, { kind: 'err' }); return false; }
        const undo = [];
        if (allocs.length) {
          const j = await owdDo('/assign', { tx, allocs, payer: out ? '' : payer, rest: out ? 'none' : (rest || 'none'), replace: !!cur }, { quiet: true, what: 'save that' });
          if (!j) return false;
          if (j.undo) undo.push(() => owdUndo(j.undo));
        } else if (cur) {
          const j = await owdDo('/unassign', { tx }, { quiet: true, what: 'save that' });
          if (!j) return false;
          if (j.undo) undo.push(() => owdUndo(j.undo));
        }
        if (linkSel) {
          const j = await owdDo('/link', { id: linkSel, tx }, { quiet: true, what: 'link that' });
          if (!j) return false;
          if (j.undo) undo.push(() => owdUndo(j.undo));
        }
        if (expSel.size) {
          const ids = [...expSel];
          const j = out ? await expDo('/update', { id: ids[0], patch: { source: { type: 'tx', txKey: tx.txKey, k: tx.k } } }, { quiet: true, what: 'attach that' })
            : await expDo('/paid', { ids, date: tx.date, txKey: tx.txKey, memo: tx.memo }, { quiet: true, what: 'mark that as paid' });
          if (!j) return false;
          if (j.undo) undo.push(() => expUndo(j.undo));
        }
        const names = allocs.map(a => { const t = owdThing(a.id); const l = t && t.lines.find(x => x.key === a.key); return l ? `${owdFirstName(l.name)} ${owdMoney(a.amount)}` : ''; }).filter(Boolean).slice(0, 4).join(', ');
        toast(names ? `${owdMoney(A / 100)} used: ${names}` : 'Attached', { icon: 'circle-check', timeout: 9000, action: undo.length ? { label: 'Undo', run: async () => { for (const u of undo.reverse()) await u(); } } : undefined });
        owdRepaint();
        return undefined;
      } },
    ],
  });
}
/** Choose a bank payment first: from the page ("Match a payment"), or from a line ("Find the bank payment"). */
async function owdPickPayment(o) {
  o = o || {};
  let dir = o.dir === 'out' ? 'out' : 'in', rows = [], q = '', listEl, wait;
  const preset = o.line ? [o.line] : [];
  const load = async () => {
    listEl.innerHTML = '<div class="xp-loading"><span class="spinner" aria-hidden="true"></span> Looking…</div>';
    try { const j = await owdApi('/recent', { dir }); rows = j.rows || []; wait = j.connected === false; }
    catch (e) { listEl.innerHTML = ''; listEl.appendChild(_xe('div', 'xp-none', esc(netErrorMessage(e)))); listEl.appendChild(uiButton({ label: 'Try again', size: 'sm', run: load })); return; }
    paint();
  };
  const paint = () => {
    listEl.innerHTML = '';
    const nq = expNorm(q);
    const list = rows.filter(r => !nq || expNorm(`${r.memo} ${r.merchant} ${Number(r.amount).toFixed(2)}`).includes(nq));
    if (!list.length) { listEl.appendChild(_xe('div', 'xp-none', wait ? 'No bank data yet. Connect a bank or import a statement in Money.' : nq ? 'Nothing matches.' : 'No payments left to match.')); return; }
    for (const r of list.slice(0, 40)) {
      const b = _xe('button', 'owd-pp', `<span class="owd-pl-n">${esc(r.merchant || r.memo || 'Payment')}<small>${esc(_xpDate(r.date))}${r.memo && r.memo !== r.merchant ? ' · ' + esc(r.memo.slice(0, 48)) : ''}</small></span><b class="num">${esc(owdMoney(r.amount))}</b>`); b.type = 'button';
      b.onclick = () => owdPayDialog({ tx: r, preset });
      listEl.appendChild(b);
    }
  };
  openDialog({
    title: 'Which bank payment?', size: 'sm', className: 'owd-pay',
    body(el) {
      el.className += ' xp-form owd-form';
      if (!o.line) {
        const seg = _xe('div', 'xp-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Money in or out');
        const paintSeg = () => { seg.innerHTML = ''; for (const [k, l] of [['in', 'Money in'], ['out', 'Money out']]) seg.appendChild(_xChip(l, '', 'xp-chip' + (dir === k ? ' on' : ''), () => { dir = k; paintSeg(); load(); })); };
        paintSeg(); el.appendChild(seg);
      }
      const si = _xe('label', 'input input-sm xp-search', icon('search') + '<input type="search" placeholder="Search names and amounts" aria-label="Search">');
      si.querySelector('input').oninput = (e) => { q = e.target.value; paint(); };
      el.appendChild(si);
      listEl = _xe('div', 'owd-pay-list'); el.appendChild(listEl);
      load();
    },
    actions: [{ label: 'Cancel' }],
  });
}
/** A payment out: attach it to what you owe, a split written by hand, an expense or a trip. */
function owdTxAttach(tx) {
  if (!tx || !(Number(tx.a) < 0) || tx.kind !== 'spend') return null;
  const used = owdTransferOf(owdTxOf(tx));
  return uiButton({ label: used ? 'Attached · Change' : 'Attach…', icon: 'link', cls: 'fv-btn ghost', tip: 'To something you owe, a split, an expense or a trip', run: () => owdPayDialog({ tx: owdTxOf(tx) }) });
}
