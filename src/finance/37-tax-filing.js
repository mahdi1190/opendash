  // @part 37-tax-filing.js · NEW (2.21) · OWNER: tax page (File my return, the pack, recording a return, your details, documents, memory, paste, payslips)
  // ── Tax: filing, and the things that go with it ───────────────────────
  function txCopy(text, what) {
    const done = () => toast(`${what || 'Copied'}`, { icon: 'check' });
    try { navigator.clipboard.writeText(String(text)).then(done, () => toast('Could not copy. Select it and copy by hand.', { bad: true })); }
    catch (e) { toast('Could not copy. Select it and copy by hand.', { bad: true }); }
  }
  /* ---------- File my return: one screen at a time ---------- */
  async function txOpenWalk() {
    const r = await api(`/api/finance/tax/pack?year=${encodeURIComponent(TX.year)}`);
    if (!r.ok) { toast((r.body && r.body.error) || 'That could not be opened.', { bad: true }); return; }
    TX.walk = { steps: r.body.steps, pack: r.body.pack, i: 0 };
    txPaint();
    try { TX.host.scrollIntoView({ block: 'start' }); } catch (e) { /* no scroll */ }
  }
  function txWalkScreen(v) {
    const W = TX.walk, s = W.steps[W.i], tick = v.walk || {};
    const rowTick = (k) => !!tick[k];
    const setTick = (k, on) => { const next = pqClone(TX.d.doc); const y = next.years[TX.year] = next.years[TX.year] || {}; y.walk = y.walk || {}; if (on) y.walk[k] = v.today; else delete y.walk[k]; api('/api/finance/tax', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc: next, plan: TX.d.plan, year: TX.year }) }).then(res => { if (res.ok && res.body.view) { TX.d = res.body; } }); };
    const rows = (s.rows || []).map(r => h('li', { class: 'fv-tx-w-row' },
      h('label', { class: 'fv-tx-tick' }, h('input', { type: 'checkbox', checked: rowTick(r.key) ? true : null, 'aria-label': `Done: ${r.label}`, onchange: (e) => setTick(r.key, e.target.checked) })),
      h('div', { class: 'fv-tx-w-m' }, r.box ? h('span', { class: 'fv-tx-box', text: `Box ${r.box}` }) : null, h('span', { class: 'l', text: r.label })),
      h('b', { class: 'fv-amt fv-tx-w-v', text: r.value }),
      /^[£\d]/.test(r.value) ? txBtn('Copy', 'copy', () => txCopy(r.value.replace(/[£,]/g, ''), `Copied ${r.value}`), 'ghost small') : null));
    const body = [];
    if (s.link) body.push(h('a', { class: 'fv-btn primary big', href: s.link.href, target: '_blank', rel: 'noopener noreferrer' }, ic('external-link'), h('span', { text: s.link.label })));
    if (s.needsUtr && !TX.d.ids.utr.set) body.push(h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: 'Your UTR is on letters from HMRC. Add it under Your details and it is here when you need it. If your sign-in is not working, sort that out first: Freeflo never asks for that password.' })));
    if (s.ids) body.push(txIds(v));
    if (s.rows && s.rows.length) body.push(h('ul', { class: 'fv-tx-w-rows' }, rows));
    if (s.compare) body.push(txCompare(v, s.ours));
    if (s.record) body.push(txRecord(v));
    return txCard('fv-tx-walk',
      h('div', { class: 'fv-plq-top' }, h('span', { class: 'fv-plq-group', text: `File my return: ${v.yearLabel}` }), h('span', { class: 'fv-grow' }), h('button', { type: 'button', class: 'fv-link', text: 'Back to my tax', onclick: () => { TX.walk = null; txPaint(); } })),
      h('div', { class: 'fv-plq-prog', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(W.steps.length), 'aria-valuenow': String(W.i + 1), 'aria-label': 'How far through' }, h('i', { style: { width: ((W.i + 1) / W.steps.length * 100).toFixed(1) + '%' } })),
      h('h2', { class: 'fv-plq-t', text: s.title }), h('p', { class: 'fv-plq-help', text: s.text }),
      W.pack.flags.map(fl => h('p', { class: 'fv-pl-note warn' }, ic('triangle-alert'), h('span', { text: fl }))),
      body,
      h('footer', { class: 'fv-plq-foot' }, h('button', { type: 'button', class: 'fv-btn ghost', disabled: W.i === 0 ? true : null, onclick: () => { W.i--; txPaint(); } }, ic('arrow-left'), h('span', { text: 'Back' })), h('span', { class: 'fv-grow' }),
        W.i < W.steps.length - 1 ? h('button', { type: 'button', class: 'fv-btn primary', onclick: () => { W.i++; txPaint(); } }, h('span', { text: 'Next' }), ic('arrow-right')) : h('button', { type: 'button', class: 'fv-btn primary', text: 'Finish', onclick: () => { TX.walk = null; txPaint(); } })));
  }
  function txCompare(v, ours) {
    const out = h('div');
    const inp = txInput('total', v.hmrc ? v.hmrc.total : '', 'money');
    const fm = h('form', { class: 'fv-tx-inline', onsubmit: async (e) => {
      e.preventDefault(); const val = moneyParse(inp.value); if (Number.isNaN(val) || val == null) { inp.classList.add('bad'); inp.title = MONEY_HELP; inp.focus(); return; } inp.classList.remove('bad');
      const r = await txPost('/compare', { total: val });
      if (!r) return;
      out.textContent = '';
      out.append(h('p', { class: 'fv-pl-note ' + (r.same ? 'good' : 'warn') }, ic(r.same ? 'circle-check' : 'triangle-alert'), h('span', { class: 'fv-amt', text: r.say })), r.tips ? h('ul', { class: 'fv-tx-tips' }, r.tips.map(t => h('li', { class: 'fv-amt', text: t }))) : null);
    } }, txField('HMRC\'s total', inp), h('button', { type: 'submit', class: 'fv-btn', text: 'Compare' }));
    return h('div', { class: 'fv-tx-compare' }, h('p', null, 'Our figure: ', amt(gbp2(ours.owed), 'fv-tx-b'), ours.poaEach ? ', plus a payment on account of ' : '', ours.poaEach ? amt(gbp2(ours.poaEach), 'fv-tx-b') : '', ours.poaEach ? ` (${gbp(ours.january)} in January).` : '.'), fm, out);
  }
  function txRecord(v) {
    const f = v.filed || {};
    const b = v.bill;
    const hits = TX.d.hmrc || [];
    const fm = h('form', { class: 'fv-tx-form', onsubmit: async (e) => { e.preventDefault(); const x = txGet(fm); if (!x) return; await txDo({ action: 'filed.record', fields: { at: x.at, total: x.total, paid: x.paid, paidAt: x.paidAt, poaFirst: x.poaFirst, poaSecond: x.poaSecond, poaFirstPaid: x.poaFirstPaid, poaSecondPaid: x.poaSecondPaid } }, 'Recorded', { close: false }); } },
      h('div', { class: 'fv-tx-grid' },
        txField('Date you sent it', txInput('at', f.at || v.today, 'date')), txField('Total HMRC worked out', txInput('total', f.total != null ? f.total : b.owed, 'money')),
        txField('First payment on account', txInput('poaFirst', f.poaFirst != null ? f.poaFirst : b.poa.first || '', 'money'), 'Towards next year. Feeds next year\'s bill.'), txField('Second payment on account', txInput('poaSecond', f.poaSecond != null ? f.poaSecond : b.poa.second || '', 'money')),
        txField('Amount you paid', txInput('paid', f.paid, 'money')), txField('Date you paid', txInput('paidAt', f.paidAt, 'date')), txField('First payment on account paid on', txInput('poaFirstPaid', f.poaFirstPaid, 'date')), txField('Second payment on account paid on', txInput('poaSecondPaid', f.poaSecondPaid, 'date'))),
      hits.length ? h('p', { class: 'fv-pl-note good' }, ic('circle-check'), h('span', null, 'Your bank shows ', amt(hits.map(x => `${gbp2(x.amount)} on ${txShort(x.date)}`).join(', ')), ' to HMRC.', h('button', { type: 'button', class: 'fv-link', text: ' Use this', onclick: () => { fm.querySelector('[name=paid]').value = hits.reduce((t, x) => t + x.amount, 0).toFixed(2); fm.querySelector('[name=paidAt]').value = hits[hits.length - 1].date; } }))) : null,
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Save' })));
    return fm;
  }
  /* ---------- the card on the page ---------- */
  function txFiling(v) {
    if (v.filing.answer === 'no' && !v.filed) return v.yearState !== 'past' ? null : txCard('fv-tx-file', txHead('Your tax return', v.filing.say), h('div', { class: 'fv-pl-acts' }, txBtn('Make the figures pack anyway', 'file-down', () => txMakePack(v), 'ghost')));
    const fileIt = h('div', { class: 'fv-pl-acts' }, txBtn('File my return', 'send', () => txOpenWalk(), 'primary'), txBtn('Make the return pack', 'file-down', () => txMakePack(v)));
    const withIds = h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', id: 'tx-pack-ids' }), h('span', null, 'Put my UTR and National Insurance number on the pack', h('small', { text: 'Off by default. Only tick this if you are giving it to your accountant.' })));
    return txCard('fv-tx-file',
      txHead('Your tax return', 'You send it on GOV.UK. Freeflo gives you each figure, box by box, in about 20 minutes.', txAsk('filing my tax return')),
      v.filed ? h('p', { class: 'fv-pl-note good' }, ic('circle-check'), h('span', null, `Filed on ${v.filed.at ? txShort(v.filed.at) : 'a date you noted'}`, v.filed.total != null ? '. Total ' : '', v.filed.total != null ? amt(gbp2(v.filed.total)) : '', v.filed.paid != null ? '. Paid ' : '', v.filed.paid != null ? amt(gbp2(v.filed.paid)) : '', '.')) : null,
      fileIt, withIds,
      h('details', { class: 'fv-pl-more', open: TX.open.has('record') ? true : null, ontoggle: (e) => { if (e.target.open) TX.open.add('record'); else TX.open.delete('record'); } }, h('summary', null, h('b', { text: 'After you have filed' }), h('span', { class: 'mute', text: 'Record it, and plan next year' })), h('div', { class: 'fv-pl-more-b' }, txRecord(v))),
      h('p', { class: 'fv-pl-mute small' }, `Keep your records until at least ${txShort(v.rates.keepUntil)}. Freeflo keeps your claims, receipts and payslips for that long too.`));
  }
  async function txMakePack(v) {
    const box = document.getElementById('tx-pack-ids');
    const r = await txPost('/pack', { withIds: !!(box && box.checked) });
    if (r && r.dir) toast(r.missing && r.missing.length ? `Saved in Documents/Tax returns. ${r.missing.length} claim${r.missing.length === 1 ? ' has' : 's have'} no receipt.` : 'Saved in Documents/Tax returns.', { kind: 'ok', icon: 'circle-check' });
  }

  /* ---------- identifiers: masked, tap to reveal or copy ---------- */
  function txIds(v) {
    const ids = TX.d.ids;
    const row = (kind, title, help, placeholder) => {
      const it = ids[kind] || {};
      const val = h('b', { class: 'fv-tx-id', text: it.set ? it.masked : 'Not added yet' });
      let shown = false;
      const reveal = async () => {
        if (shown) { val.textContent = it.masked; shown = false; btn.querySelector('span').textContent = 'Show'; return; }
        const r = await api('/api/finance/tax/ids/reveal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) });
        if (r.ok && r.body.value) { val.textContent = r.body.value; shown = true; btn.querySelector('span').textContent = 'Hide'; setTimeout(() => { if (shown && val.isConnected) reveal(); }, 20000); }
      };
      const copy = async () => { const r = await api('/api/finance/tax/ids/reveal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) }); if (r.ok && r.body.value) txCopy(r.body.value, 'Copied'); };
      const btn = txBtn('Show', 'eye', reveal, 'ghost small');
      const editKey = 'id-' + kind;
      const editing = TX.edit && TX.edit.id === editKey;
      const inp = txInput('value', '', 'text', { placeholder });
      const fm = h('form', { class: 'fv-tx-inline', onsubmit: async (e) => { e.preventDefault(); const res = await api('/api/finance/tax/ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, value: inp.value }) }); if (!res.ok) { toast((res.body && res.body.error) || 'That does not look right.', { bad: true }); return; } TX.d.ids = res.body.ids; TX.edit = null; txPaint(); toast('Saved on this computer only'); } }, txField(title, inp, help), h('button', { type: 'submit', class: 'fv-btn primary', text: 'Save' }), txBtn('Cancel', null, () => { TX.edit = null; txPaint(); }, 'ghost'));
      return h('div', { class: 'fv-tx-id-row' }, h('span', { class: 'k', text: title }), val, it.set ? btn : null, it.set ? txBtn('Copy', 'copy', copy, 'ghost small') : null, txBtn(it.set ? 'Change' : 'Add', null, () => { TX.edit = { id: editKey }; txPaint(); }, 'ghost small'), it.set ? txBtn('Remove', null, async () => { const res = await api('/api/finance/tax/ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, value: null }) }); if (res.ok) { TX.d.ids = res.body.ids; txPaint(); } }, 'ghost small') : null, editing ? fm : null);
    };
    return h('div', { class: 'fv-tx-ids' }, row('utr', 'Your UTR', '10 digits, on letters from HMRC.', '1234567890'), row('nino', 'National Insurance number', 'On your payslip or P60.', 'AB 12 34 56 C'),
      h('p', { class: 'fv-pl-mute small', text: 'Kept on this computer only. Never sent to Claude or friends, never in exports unless you ask. Freeflo never asks for your Government Gateway password.' }));
  }

  /* ---------- the quieter things ---------- */
  function txMore(v) {
    const secs = [];
    secs.push(h('details', { class: 'fv-pl-more', open: TX.open.has('ids') || (TX.edit && String(TX.edit.id || '').startsWith('id-')) ? true : null, ontoggle: (e) => { if (e.target.open) TX.open.add('ids'); else TX.open.delete('ids'); } }, h('summary', null, h('b', { text: 'Your details' }), h('span', { class: 'mute', text: TX.d.ids.utr.set ? `UTR ${TX.d.ids.utr.masked}` : 'Your tax reference (UTR) and National Insurance number' })), h('div', { class: 'fv-pl-more-b' }, txIds(v))));
    if (v.notes && v.notes.some(n => !n.uncovered)) secs.push(h('details', { class: 'fv-pl-more', open: TX.open.has('notes') ? true : null, ontoggle: (e) => { if (e.target.open) TX.open.add('notes'); else TX.open.delete('notes'); } }, h('summary', null, h('b', { text: 'Worth knowing' }), h('span', { class: 'mute', text: `${v.notes.length} note${v.notes.length === 1 ? '' : 's'} for you` })), h('div', { class: 'fv-pl-more-b' }, h('ul', { class: 'fv-tx-tips' }, v.notes.map(n => h('li', { class: 'fv-amt', text: n.text }))))));
    secs.push(txMemory(v), txShelf(v), txChecklists(v));
    secs.push(h('p', { class: 'fv-pl-mute small fv-tx-wi' }, 'Thinking of a change? ', h('button', { type: 'button', class: 'fv-link', text: 'Try it in What if?', onclick: () => { try { window.FinanceView.openWhatIf([]); } catch (e) { setSection('budgets'); } } })));
    return txCard('fv-tx-more fv-pl-extras', secs);
  }
  function txMemory(v) {
    const list = v.memory || [];
    const inp = txInput('text', '', 'text', { placeholder: 'For example: moving in January; pension starts in April' });
    const fm = h('form', { class: 'fv-tx-inline', onsubmit: async (e) => { e.preventDefault(); if (!inp.value.trim()) return; const said = inp.value; if (/\b[A-Za-z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Da-d]\b|(?<!\d)\d{5}\s?\d{5}(?!\d)/.test(said)) { toast('A UTR or National Insurance number goes under Your details, not here.', { bad: true }); return; } await txDo({ action: 'memory.add', text: said }, 'Remembered', { close: false }); } }, txField('Something to remember', inp), h('button', { type: 'submit', class: 'fv-btn', text: 'Add' }));
    return h('details', { class: 'fv-pl-more', open: TX.open.has('mem') ? true : null, ontoggle: (e) => { if (e.target.open) TX.open.add('mem'); else TX.open.delete('mem'); } },
      h('summary', null, h('b', { text: 'What Freeflo knows about my money' }), h('span', { class: 'mute', text: list.length ? `${list.length} note${list.length === 1 ? '' : 's'}` : 'Facts the assistant can use' })),
      h('div', { class: 'fv-pl-more-b' },
        h('p', { class: 'fv-pl-mute small', text: 'Things you told it, or that came from documents. The assistant reads these. Not shared with friends.' }),
        list.length ? h('ul', { class: 'fv-tx-pays' }, list.map(m => h('li', null, h('span', { class: 'n' }, h('b', { text: m.text }), h('small', { text: [m.date ? txShort(m.date) : '', m.source || '', m.open ? 'Still to find out' : ''].filter(Boolean).join('. ') })),
          m.open ? txBtn('Make a task', 'plus', () => txPost('/prompt', { id: 'mem:' + m.id, action: 'task', title: m.text, text: 'From What Freeflo knows about my money' }, () => toast('Added to your tasks')), 'ghost small') : null,
          h('button', { type: 'button', class: 'fv-btn ghost', 'aria-label': 'Forget this', onclick: () => txDo({ action: 'memory.remove', id: m.id }, 'Forgotten', { close: false }) }, ic('x'))))) : null, fm));
  }
  function txShelf(v) {
    const docs = v.docs || [];
    const pick = () => {
      const inp = h('input', { type: 'file', accept: 'application/pdf,image/*', hidden: true, onchange: async () => {
        const file = inp.files && inp.files[0]; if (!file) return;
        if (file.size > 8 * 1024 * 1024) { toast('That file is too big: 8 MB at most.', { bad: true }); return; }
        await txPost('/document', { name: file.name, kind: /p60/i.test(file.name) ? 'p60' : /p45/i.test(file.name) ? 'p45' : /p11d/i.test(file.name) ? 'p11d' : 'other', data: await txFileData(file) });
        toast('Kept on this computer');
      } });
      document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
    };
    return h('details', { class: 'fv-pl-more', open: TX.open.has('shelf') ? true : null, ontoggle: (e) => { if (e.target.open) TX.open.add('shelf'); else TX.open.delete('shelf'); } },
      h('summary', null, h('b', { text: 'Documents' }), h('span', { class: 'mute', text: docs.length ? `${docs.length} for ${v.yearLabel}` : 'Payslips, P45, P60, statements' })),
      h('div', { class: 'fv-pl-more-b' },
        docs.length ? h('ul', { class: 'fv-tx-pays' }, docs.map(d => h('li', null, h('span', { class: 'n' }, h('b', { text: d.name }), h('small', { text: d.kind.toUpperCase() + (d.at ? `, ${txShort(d.at)}` : '') })), d.file ? h('a', { class: 'fv-link', href: `/api/finance/tax/doc/${encodeURIComponent(v.year)}/${encodeURIComponent(d.file)}`, target: '_blank', rel: 'noopener', text: 'Open' }) : null))) : h('p', { class: 'fv-pl-mute', text: `Nothing here yet. Keep them until ${txShort(v.rates.keepUntil)}.` }),
        h('div', { class: 'fv-pl-acts' }, txBtn('Add a document', 'file-up', pick))));
  }
  function txChecklists(v) {
    const lists = v.checklists || {};
    return h('details', { class: 'fv-pl-more' }, h('summary', null, h('b', { text: 'Checklists' }), h('span', { class: 'mute', text: 'Moving, starting or leaving a job' })),
      h('div', { class: 'fv-pl-more-b fv-tx-lists' }, Object.values(lists).map(l => h('div', null, h('h4', { class: 'fv-tx-sub', text: l.title }), h('ul', { class: 'fv-tx-tips' }, l.items.map(t => h('li', { text: t })))))));
  }

  /* ---------- tell Freeflo in one go ---------- */
  function txPasteCard(v) {
    const P = TX.paste;
    if (P.result) return txPasteConfirm(v);
    const ta = h('textarea', { class: 'fv-tx-in fv-tx-ta', rows: 7, placeholder: 'For example: I have a job at Acme on 30,000 a year, code 1257L, and a second job at Bistro on 8,000 on BR. I did consultancy from May to September, about £5,000. I have a Plan 2 student loan.', oninput: (e) => { P.text = e.target.value; } }, P.text || '');
    ta.value = P.text || '';
    const ctlRef = {};
    const read = async () => {
      if (!ta.value.trim()) { toast('Type or paste something first.'); return; }
      P.busy = true; P.err = null; txPaint();
      const ctl = new AbortController(); P.ctl = ctl;
      try {
        const r = await api('/api/finance/tax/read-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: P.text }), signal: ctl.signal });
        if (!r.ok) { P.err = (r.body && r.body.error) || 'Claude could not read that just now. You can fill in the forms below instead.'; }
        else { P.result = r.body; P.on = new Set((r.body.items || []).map(x => x.key)); }
      } catch (e) { if (!(e && e.name === 'AbortError')) P.err = 'Freeflo isn’t answering. Your text is still here.'; }
      P.busy = false; P.ctl = null; txPaint();
    };
    void ctlRef;
    return txCard('fv-tx-paste', txHead('Tell Freeflo in one go', 'Describe your situation in your own words.'),
      ta,
      h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: 'Pressing Read it with Claude sends this text to Claude to read, with anything that looks like a UTR, National Insurance number or password taken out first. Nothing is saved until you have checked it. You can also skip this and fill in the forms below.' })),
      P.err ? h('p', { class: 'fv-plq-err', role: 'alert' }, h('span', { text: P.err + ' ' }), h('button', { type: 'button', class: 'fv-link', text: 'Try again', onclick: read })) : null,
      h('div', { class: 'fv-pl-acts' },
        P.busy ? h('span', { class: 'fv-pl-mute', text: 'Reading…' }) : txBtn('Read it with Claude', 'sparkles', read, 'primary'),
        P.busy ? txBtn('Cancel', null, () => { if (P.ctl) P.ctl.abort(); }, 'ghost') : txBtn('Close', null, () => { TX.paste = null; txPaint(); }, 'ghost')));
  }
  const TX_ITEM_WORDS = (x) => {
    if (x.kind === 'job') return { title: `Job: ${x.name}`, text: [x.annual != null ? gbp(x.annual) + ' a year' : 'Pay not given', x.taxCode ? `tax code ${x.taxCode}` : 'no tax code given', x.main ? 'main job' : '', x.start ? `from ${txShort(x.start)}` : '', x.end ? `to ${txShort(x.end)}` : ''].filter(Boolean).join(', ') };
    if (x.kind === 'self') return { title: `Self-employed: ${x.name}`, text: [x.income != null ? gbp(x.income) + ' in' : 'Amount not given', x.costs != null ? gbp(x.costs) + ' costs' : '', x.from ? `from ${txShort(x.from)}` : '', x.to ? `to ${txShort(x.to)}` : '', x.connected ? 'from your employer or a connected business' : ''].filter(Boolean).join(', ') };
    if (x.kind === 'other') return { title: `Other income: ${x.name}`, text: x.amount != null ? `${gbp(x.amount)} ${({ year: 'a year', month: 'a month', week: 'a week', total: 'in total' })[x.per]}` : 'Amount not given' };
    if (x.kind === 'loans') return { title: 'Student loan', text: x.loans.map(k => ({ plan1: 'Plan 1', plan2: 'Plan 2', plan4: 'Plan 4', plan5: 'Plan 5', pg: 'Postgraduate' })[k]).join(', ') };
    if (x.kind === 'region') return { title: 'Where you live', text: x.region === 'scotland' ? 'Scotland' : 'England, Wales or Northern Ireland' };
    if (x.kind === 'fact') return { title: 'Remember this', text: x.text };
    if (x.kind === 'gateway') return { title: 'Your Government Gateway sign-in is not working', text: 'Freeflo reminds you to sort it out in good time.' };
    if (x.kind === 'registered') return { title: x.value ? 'You have registered for Self Assessment' : 'You have not registered for Self Assessment yet', text: '' };
    return { title: x.kind, text: '' };
  };
  function txPasteConfirm(v) {
    const P = TX.paste, res = P.result;
    const row = (x) => { const w = TX_ITEM_WORDS(x); return h('li', { class: 'fv-tx-conf' }, h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', checked: P.on.has(x.key) ? true : null, onchange: (e) => { if (e.target.checked) P.on.add(x.key); else P.on.delete(x.key); } }), h('span', null, h('b', { class: 'fv-amt', text: w.title }), w.text ? h('small', { class: 'fv-amt', text: w.text }) : null))); };
    const save = async () => {
      const items = res.items.filter(x => P.on.has(x.key));
      const ch = [];
      const planPatch = {};
      for (const x of items) {
        if (x.kind === 'job') ch.push({ action: 'source.add', source: { type: 'job', name: x.name, annual: x.annual, taxCode: x.taxCode, start: x.start, end: x.end, main: x.main } });
        else if (x.kind === 'self') ch.push({ action: 'source.add', source: { type: 'self', name: x.name, start: x.from, end: x.to, amount: x.income, expenses: x.costs, connected: x.connected, per: 'total' } });
        else if (x.kind === 'other') ch.push({ action: 'source.add', source: { type: x.type, name: x.name, amount: x.amount, per: x.per } });
        else if (x.kind === 'fact') ch.push({ action: 'memory.add', text: x.text, source: 'From what you pasted' });
        else if (x.kind === 'gateway') ch.push({ action: 'pref.set', fields: { gatewayBroken: true } });
        else if (x.kind === 'registered') ch.push({ action: 'pref.set', fields: { registered: x.value } });
        else if (x.kind === 'loans') planPatch.loans = x.loans;
        else if (x.kind === 'region') planPatch.region = x.region;
      }
      if (P.saveUtr && res.found && res.found.utr) await api('/api/finance/tax/ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'utr', value: res.found.utr }) });
      if (P.saveNino && res.found && res.found.nino) await api('/api/finance/tax/ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'nino', value: res.found.nino }) });
      if (planPatch.loans || planPatch.region) {
        const next = pqClone(TX.d.plan); next.tax = Object.assign({}, next.tax, planPatch, { hasJob: true }); if (!next.country) next.country = 'uk';
        const r = await api('/api/finance/tax', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: next, doc: TX.d.doc, year: TX.year }) });
        if (r.ok && r.body.view) txTake(r.body);
      }
      TX.paste = null;
      if (ch.length) await txDo(ch, `Saved ${ch.length} thing${ch.length === 1 ? '' : 's'} from what you pasted`, { close: false });
      else { txPaint(); toast('Saved'); }
    };
    return txCard('fv-tx-paste', txHead('Is this right?', 'Untick anything that is wrong. Nothing is saved until you press Save.'),
      res.hid ? h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: `${res.hid} thing${res.hid === 1 ? '' : 's'} (a UTR, National Insurance number or password) ${res.hid === 1 ? 'was' : 'were'} taken out before it was sent.` })) : null,
      res.found && res.found.utr ? h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', onchange: (e) => { P.saveUtr = e.target.checked; } }), h('span', { text: `Save the UTR you typed, ending ${res.found.utr.slice(-4)}, on this computer` })) : null,
      res.found && res.found.nino ? h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', onchange: (e) => { P.saveNino = e.target.checked; } }), h('span', { text: 'Save the National Insurance number you typed, on this computer' })) : null,
      res.items.length ? h('ul', { class: 'fv-tx-confs' }, res.items.map(row)) : h('p', { class: 'fv-pl-mute', text: 'Claude did not find anything to save. Try adding more detail, or use the forms below.' }),
      res.notes && res.notes.length ? h('div', { class: 'fv-tx-paste-notes' }, h('h4', { text: 'Not used' }), h('ul', { class: 'fv-tx-tips' }, res.notes.map(n => h('li', { class: 'fv-amt', text: n })))) : null,
      h('div', { class: 'fv-pl-acts' }, txBtn('Save the ticked ones', 'check', save, 'primary'), txBtn('Back', null, () => { P.result = null; txPaint(); }, 'ghost'), txBtn('Cancel', null, () => { TX.paste = null; txPaint(); }, 'ghost')));
  }

  /* ---------- a payslip ---------- */
  function txPickSlip() {
    const inp = h('input', { type: 'file', accept: 'application/pdf,image/*', hidden: true, onchange: async () => { const f = inp.files && inp.files[0]; if (f) txReadSlip(f); } });
    document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
  }
  /** Sends only on the person's action: picking the file is the action, and the card says what is sent before it goes. */
  async function txReadSlip(file) {
    if (file.size > 8 * 1024 * 1024) { toast('That file is too big: 8 MB at most.', { bad: true }); return; }
    TX.slip = { busy: false, ask: true, file, name: file.name };
    txPaint();
    try { TX.host.querySelector('.fv-tx-slip').scrollIntoView({ block: 'nearest' }); } catch (e) { /* no scroll */ }
  }
  async function txSlipGo() {
    const S1 = TX.slip; if (!S1 || !S1.file) return;
    S1.busy = true; S1.ask = false; S1.err = null; txPaint();
    const ctl = new AbortController(); S1.ctl = ctl;
    try {
      const data = await txFileData(S1.file);
      const r = await api('/api/finance/tax/payslip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: S1.file.name, data, year: TX.year }), signal: ctl.signal });
      if (!r.ok) S1.err = (r.body && r.body.error) || 'Claude could not read that just now.';
      else Object.assign(S1, r.body, { usual: true });
    } catch (e) { if (e && e.name === 'AbortError') { TX.slip = null; txPaint(); return; } S1.err = 'Freeflo isn’t answering. Try again in a moment.'; }
    S1.busy = false; S1.ctl = null; txPaint();
  }
  function txSlipCard(v) {
    const S1 = TX.slip;
    if (S1.choose) {
      const jobs = v.sources.jobs;
      const toJob = (j) => { TX.slip = null; txOpenJob(j.id, { ytd: true }); };
      return txCard('fv-tx-slip', txHead('Add a payslip', 'Either way, you check every figure before it counts.'),
        h('div', { class: 'fv-tx-slipways' },
          jobs.length ? jobs.map(j => txBtn(jobs.length > 1 ? `Type the figures in for ${j.name}` : 'Type the figures in', 'pencil', () => toJob(j), 'primary'))
            : txBtn('Add your job first', 'plus', () => { TX.slip = null; TX.edit = { add: true, type: 'job' }; txPaint(); }, 'primary'),
          txBtn('Read a file with Claude', 'file-up', () => { TX.slip = null; txPaint(); txPickSlip(); }),
          txBtn('Close', null, () => { TX.slip = null; txPaint(); }, 'ghost')));
    }
    if (S1.ask) return txCard('fv-tx-slip', txHead('Read this payslip with Claude?', S1.name),
      h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', { text: 'The whole file goes to Claude to read, including anything printed on it such as your name and National Insurance number. It is held only for this and removed straight after. You check every figure before anything changes.' })),
      h('div', { class: 'fv-pl-acts' }, txBtn('Read it', 'sparkles', txSlipGo, 'primary'), txBtn('Cancel', null, () => { TX.slip = null; txPaint(); }, 'ghost')));
    if (S1.busy) return txCard('fv-tx-slip', txHead('Reading your payslip…', S1.name), h('div', { class: 'fv-pl-acts' }, txBtn('Cancel', null, () => { if (S1.ctl) S1.ctl.abort(); }, 'ghost')));
    if (S1.err) return txCard('fv-tx-slip', txHead('That did not work', S1.name), h('p', { class: 'fv-plq-err', text: S1.err }), h('div', { class: 'fv-pl-acts' }, txBtn('Try again', 'refresh-cw', txSlipGo, 'primary'), txBtn('Close', null, () => { TX.slip = null; txPaint(); }, 'ghost')));
    if (!S1.slip) return txCard('fv-tx-slip', txHead('Payslip', S1.name));
    const s = S1.slip;
    const inp = (k, label, val, type) => txField(label, txInput(k, val, type || 'money'));
    const fm = h('form', { class: 'fv-tx-form', onsubmit: async (e) => {
      e.preventDefault(); const f = txGet(fm); if (!f) return;
      const n = (x) => (x == null ? null : Number(x));
      const body = { token: S1.token, year: S1.year, job: f.job === '__new' ? null : f.job, newJobName: f.job === '__new' ? (f.newJob || s.employer || 'A job') : null, usual: f.usual, slip: { employer: s.employer, payDate: f.payDate, period: s.period, gross: n(f.gross), code: f.code, tax: n(f.tax), ni: n(f.ni), plan: n(f.plan), pg: n(f.pg), pension: n(f.pension), net: n(f.net), ytd: { pay: n(f.ytdPay), taxablePay: n(f.ytdTaxable), tax: n(f.ytdTax), ni: n(f.ytdNi), plan: n(f.ytdPlan), pg: n(f.ytdPg) } } };
      const r = await api('/api/finance/tax/payslip/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { toast((r.body && r.body.error) || 'That could not be saved.', { bad: true }); return; }
      txTake(r.body); TX.slip = null; txPaint();
      const undo = r.body.undo;
      toast(r.body.said || 'Updated', { action: 'Undo', onAction: () => txUndo(undo) });
    } },
      h('div', { class: 'fv-tx-grid' },
        txField('Which job?', h('select', { name: 'job', class: 'fv-tx-in' }, (S1.jobs || []).map(j => h('option', { value: j.id, text: j.name, selected: S1.job && S1.job.id === j.id ? true : null })), h('option', { value: '__new', text: 'A new job', selected: !S1.job ? true : null }))),
        !S1.job ? inp('newJob', 'Employer', s.employer, 'text') : null,
        inp('payDate', 'Pay date', s.payDate, 'date'), inp('code', 'Tax code', s.code, 'text'),
        inp('gross', 'Pay before deductions', s.gross), inp('tax', 'Income tax', s.tax), inp('ni', 'National Insurance', s.ni), inp('plan', 'Student loan', s.plan), inp('pg', 'Postgraduate loan', s.pg), inp('pension', 'Pension', s.pension), inp('net', 'What reached your bank', s.net)),
      h('fieldset', { class: 'fv-tx-ytd' }, h('legend', { text: 'So far this tax year' }), h('div', { class: 'fv-tx-grid' }, inp('ytdPay', 'Pay', s.ytd.pay), inp('ytdTaxable', 'Taxable pay', s.ytd.taxablePay), inp('ytdTax', 'Income tax', s.ytd.tax), inp('ytdNi', 'National Insurance', s.ytd.ni), inp('ytdPlan', 'Student loan', s.ytd.plan), inp('ytdPg', 'Postgraduate loan', s.ytd.pg))),
      h('label', { class: 'fv-tx-check' }, h('input', { type: 'checkbox', name: 'usual', checked: true }), h('span', { text: 'This is my usual pay (untick if it had a bonus or overtime)' })),
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'submit', class: 'fv-btn primary', text: 'Yes, update my figures' }), txBtn('Cancel', null, async () => { await txPost('/payslip/cancel', { token: S1.token }); TX.slip = null; txPaint(); }, 'ghost')));
    return txCard('fv-tx-slip', txHead('Is this right?', `${S1.name}. Change anything that was misread.`),
      (S1.checks || []).concat(S1.issues || []).map(c => h('p', { class: 'fv-pl-note ' + c.level }, ic(c.level === 'warn' ? 'triangle-alert' : c.level === 'good' ? 'circle-check' : 'info'), h('span', { class: 'fv-amt', text: c.text }))),
      (s.unclear || []).length ? h('p', { class: 'fv-pl-note warn' }, ic('triangle-alert'), h('span', { text: `Claude was not sure about: ${s.unclear.join(', ')}.` })) : null,
      fm);
  }
