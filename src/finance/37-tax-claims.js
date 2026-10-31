  // @part 37-tax-claims.js · NEW (2.21) · OWNER: tax page (expense finder, flat rates, claims and their receipts)
  // ── Tax: what you can claim ───────────────────────────────────────────
  // Suggestions from the bank (lib/finance/tax-expenses.mjs): tick to claim, one Undo; each says why, with the tax it would save.
  const TX_CONF = { high: 'Likely', medium: 'Possibly', low: 'Only if it was for work' };
  function txFinder(v) {
    const f = TX.d.finder;
    if (!v.sources.self.length) return null;
    const usesAllowance = v.trade && v.trade.used === 'allowance' && v.trade.choice !== 'actual';
    const kids = [txHead('What you can claim', 'Costs for your self-employed work lower your tax and your student loan.')];
    if (usesAllowance && v.claims.length + (f ? f.suggestions.length : 0) > 0) kids.push(h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: `You are on the £${v.rates.trading.toLocaleString('en-GB')} trading allowance, which is worth more than your costs so far, so claims do not change the bill yet. Tick them anyway: if they pass the allowance, Freeflo switches to them.` })));
    if (f && f.suggestions.length) {
      const list = h('ul', { class: 'fv-tx-finder' }, f.suggestions.slice(0, 40).map(s => {
        const pct = h('input', { type: 'number', min: 0, max: 100, step: 5, value: s.pct, class: 'fv-tx-in pct', 'aria-label': 'Work share, per cent', 'data-pct': s.tx, onclick: (e) => e.stopPropagation() });
        return h('li', { class: 'fv-tx-find', 'data-sel-id': s.tx, 'data-label': s.merchant },
          h('div', { class: 'fv-tx-find-m' }, h('b', { class: 'fv-amt', text: `${s.merchant}` }), h('span', { class: 'fv-tx-chip ' + s.confidence, text: TX_CONF[s.confidence] }), h('small', { class: 'fv-amt', text: `${txShort(s.date)}. ${s.what}.` }), h('small', { text: s.why })),
          h('div', { class: 'fv-tx-find-v' }, amt(gbp2(s.amount)), h('label', { class: 'fv-tx-pct' }, pct, h('span', { text: '% for work' })), s.saves > 0.005 ? h('small', null, 'saves about ', amt(gbp2(s.saves))) : s.savesIfCosts > 0.005 ? h('small', { class: 'later' }, 'worth about ', amt(gbp2(s.savesIfCosts)), ' once your costs pass the allowance') : null, txAsk(`can I claim ${s.merchant}?`)));
      }));
      kids.push(list);
      const byTx = new Map(f.suggestions.map(s => [s.tx, s]));
      setTimeout(() => {
        if (!list.isConnected || typeof selectList !== 'function') return;
        selectList(list, {
          key: 'tax-finder', defaultOn: false, rowClick: false, label: 'Possible claims',
          apply: { label: 'Claim selected', icon: 'check', run: async (ids) => {
            const ch = ids.map(id => { const s = byTx.get(id); const box = list.querySelector(`input[data-pct="${CSS.escape(id)}"]`); return s ? { action: 'claim.add', claim: { item: s.period, tx: s.tx, date: s.date, what: s.merchant, amount: s.amount, pct: box ? Number(box.value) : s.pct, cat: s.cat, rule: s.rule } } : null; }).filter(Boolean);
            await txDo(ch, ch.length === 1 ? 'Claimed' : `${ch.length} claimed`, { close: false });
            return { done: ids };
          } },
          dismiss: { label: 'Not for work', icon: 'x', run: async (ids) => { await txDo({ action: 'dismiss', txs: ids }, 'Hidden', { close: false }); return { done: ids }; } },
        });
      }, 0);
    } else if (f) kids.push(h('p', { class: 'fv-pl-mute', text: TX.d.view && (R.model && R.model.tx && R.model.tx.length) ? 'Nothing new in your bank looks like a work cost during this period. You can add one by hand below.' : 'Connect your bank, and Freeflo looks through your payments for you. You can add costs by hand below.' }));
    // Costs by hand, and what is claimed so far.
    const hand = h('form', { class: 'fv-tx-inline', onsubmit: async (e) => { e.preventDefault(); const x = txGet(hand); if (!x) return; await txDo({ action: 'claim.add', claim: { what: x.what, amount: x.amount, pct: x.pct, date: x.date, cat: x.cat } }, 'Claimed', { close: false }); } },
      txField('What was it?', txInput('what')), txField('Date', txInput('date', '', 'date')), txField('Cost', txInput('amount', '', 'money')), txField('% for work', txInput('pct', '100', 'number')),
      txField('Kind', h('select', { name: 'cat', class: 'fv-tx-in' }, [['office', 'Software, phone, office'], ['travel', 'Travel'], ['repairs', 'Equipment or repairs'], ['fees', 'Accountant or legal fees'], ['ads', 'Advertising, website'], ['premises', 'Rent, power, insurance'], ['goods', 'Goods to resell'], ['other', 'Something else']].map(([k, l]) => h('option', { value: k, text: l })))),
      h('button', { type: 'submit', class: 'fv-btn', text: 'Add' }));
    kids.push(h('details', { class: 'fv-pl-more', open: TX.open.has('hand') ? true : null, ontoggle: (e) => { if (e.target.open) TX.open.add('hand'); else TX.open.delete('hand'); } }, h('summary', null, h('b', { text: 'Add a cost by hand' })), h('div', { class: 'fv-pl-more-b' }, hand)));
    kids.push(txFlat(v));
    if (v.claims.length) kids.push(txClaimed(v));
    if (f && (f.cannot.length || f.never.length)) kids.push(h('details', { class: 'fv-pl-more' }, h('summary', null, h('b', { text: 'What you cannot claim' }), h('span', { class: 'mute', text: f.cannot.length ? `${f.cannot.length} seen in your bank` : 'And why' })),
      h('div', { class: 'fv-pl-more-b' }, h('ul', { class: 'fv-tx-never' }, f.cannot.map(c => h('li', null, h('b', { text: c.title }), ' ', amt(`(${gbp(c.total)} in this period)`), h('small', { text: c.why }))), f.never.filter(n => !f.cannot.some(c => c.title === n.title)).map(n => h('li', null, h('b', { text: n.title }), h('small', { text: n.why })))))));
    return txCard('fv-tx-claims', kids);
  }
  function txFlat(v) {
    const r = v.rates, s = v.simplified || {}, miles = s.miles || {}, wfh = (s.wfh && s.wfh[0]) || {};
    const fm = h('form', { class: 'fv-tx-form', onsubmit: async (e) => {
      e.preventDefault(); const f = txGet(fm); if (!f) return;
      await txDo({ action: 'simplified.set', miles: { car: f.car, motorcycle: f.bike }, wfh: f.hours && f.months ? [{ hours: f.hours, months: f.months }] : [] }, 'Saved', { close: false });
    } },
      h('p', { class: 'fv-pl-mute small', text: `Instead of adding up real costs, you can use flat rates. Business miles by car or van: ${Math.round(r.mileage.first * 100)}p for the first ${r.mileage.firstMiles.toLocaleString('en-GB')} miles, then ${Math.round(r.mileage.after * 100)}p. Motorbike: ${Math.round(r.mileage.motorcycle * 100)}p. Your ordinary commute does not count.` }),
      h('div', { class: 'fv-tx-grid' }, txField('Business miles by car or van', txInput('car', miles.car, 'money')), txField('Business miles by motorbike', txInput('bike', miles.motorcycle, 'money')),
        txField('Hours a month working from home', txInput('hours', wfh.hours, 'money'), `${r.wfh.map(([h0, a]) => `${h0}+ hours £${a}`).join(', ')} a month.`), txField('For how many months', txInput('months', wfh.months, 'money'))),
      v.simpleCosts.total > 0 ? h('p', { class: 'fv-pl-mute small' }, 'Worth ', amt(gbp2(v.simpleCosts.total)), ' this year.') : null,
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn', text: 'Save flat rates' })));
    return h('details', { class: 'fv-pl-more', open: TX.open.has('flat') ? true : null, ontoggle: (e) => { if (e.target.open) TX.open.add('flat'); else TX.open.delete('flat'); } }, h('summary', null, h('b', { text: 'Mileage and working from home' }), h('span', { class: 'mute', text: 'Flat rates' })), h('div', { class: 'fv-pl-more-b' }, fm));
  }
  function txClaimed(v) {
    const total = v.claims.reduce((t, c) => t + c.amount * (c.pct != null ? c.pct : 100) / 100, 0);
    const pick = (c) => {
      const inp = h('input', { type: 'file', accept: 'application/pdf,image/*', hidden: true, onchange: async () => {
        const file = inp.files && inp.files[0]; if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast('That file is too big: 5 MB at most.', { bad: true }); return; }
        const data = await txFileData(file);
        const r = await txPost('/receipt', { name: file.name, data });
        if (r && r.ref) txDo({ action: 'claim.update', id: c.id, fields: { receipts: (c.receipts || []).concat(r.ref) } }, 'Receipt attached', { close: false });
      } });
      document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
    };
    return h('div', { class: 'fv-tx-claimed' }, h('h4', { class: 'fv-tx-sub' }, 'Claimed so far: ', amt(gbp2(total))),
      h('ul', { class: 'fv-tx-pays' }, v.claims.map(c => h('li', null,
        h('span', { class: 'n' }, h('b', { class: 'fv-amt', text: c.what }), h('small', { text: [c.date ? txShort(c.date) : '', c.pct != null && c.pct !== 100 ? `${c.pct}% for work` : ''].filter(Boolean).join(', ') })),
        amt(gbp2(c.amount * (c.pct != null ? c.pct : 100) / 100)),
        (c.receipts || []).length ? h('a', { class: 'fv-link', href: `/api/expenses/receipt/${encodeURIComponent(c.receipts[0])}`, target: '_blank', rel: 'noopener', text: 'Receipt' }) : h('button', { type: 'button', class: 'fv-link', text: 'Add receipt', onclick: () => pick(c) }),
        h('button', { type: 'button', class: 'fv-btn ghost', 'aria-label': `Stop claiming ${c.what}`, onclick: () => txDo({ action: 'claim.remove', id: c.id }, 'Removed', { close: false }) }, ic('x'))))));
  }
  const txFileData = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => rej(new Error('read')); fr.readAsDataURL(file); });
