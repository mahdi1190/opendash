  // @part 45-cards.js · NEW (2.23) · Credit cards on the page: the check before a card file goes in, what you owe
  // and how you pay it, the Add a credit card screen, and a card's block in Your data (44-your-data.js).
  // The rules are lib/finance/cards.mjs; the next payment is MBM.cardNext (25-money-model.js).
  // Styles: 45-cards.css. No inline handlers (strict CSP).

  // ── The check before a card file goes in ──────────────────────────────
  // pv: POST /api/finance/import's preview. -> {key, name, flip, flipped, issuer} | false (not a credit card) | null (cancelled)
  function cdFileCheck(fileName, pv) {
    return new Promise((resolve) => {
      let flip = !!pv.flip, flipped = false, answered = false, known = !!pv.known;
      const answer = (v) => { if (!answered) { answered = true; resolve(v); } };
      openDialog({
        title: 'Check this file', size: 'sm', className: 'yd-dialog cd-dialog', resizeKey: 'cd-file',
        onClose: () => answer(null),
        body: (el, close) => {
          const box = h('div', { class: 'cd-read', 'aria-live': 'polite' });
          const row = (x) => h('li', {}, h('span', { class: 'cd-read-m', text: x.m }), ydDlgAmt(x.a));
          const paint = () => {
            const spent = flip ? pv.pos : pv.neg, back = flip ? pv.neg : pv.pos;
            // Shops come first as spending, the card's payment first as money back: a payment shown as spending is the giveaway.
            const out = spent.slice(0, 3), inn = [...back].sort((a, b) => Number(b.pay) - Number(a.pay)).slice(0, 2);
            box.replaceChildren(...[
              h('p', { class: 'cd-q', text: 'We read these as money you spent:' }),
              out.length ? h('ul', { class: 'cd-rows' }, out.map(row)) : h('p', { class: 'yd-small', text: 'Nothing in this file reads as money you spent.' }),
              inn.length ? h('p', { class: 'cd-q2', text: 'And these as money back, or payments to the card:' }) : null,
              inn.length ? h('ul', { class: 'cd-rows' }, inn.map(row)) : null,
              h('p', { class: 'cd-q', text: 'Is that right?' }),
            ].filter(Boolean));
            flipBtn.lastChild.textContent = flipped ? 'Flip them back' : 'No, flip them';
          };
          const flipBtn = h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => { flip = !flip; flipped = !flipped; paint(); } }, ic('repeat'), h('span', { text: 'No, flip them' }));
          const name = h('input', { type: 'text', class: 'input', maxlength: '40', value: pv.name, 'aria-label': 'Name of this card', autocomplete: 'off' });
          const yes = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => {
            answer({ key: known ? pv.key : null, name: name.value, flip, flipped: flipped && known, issuer: pv.issuer || null });
            close();
          } }, ic('check'), h('span', { text: 'Yes, import it' }));
          // Whose it is: a card already here (one tap to say it is another one), or a name for a new one.
          const nameBox = h('label', { class: 'cd-field' }, h('span', { text: 'Call this card' }), name);
          nameBox.hidden = known;
          const lead = h('span', { text: known ? `This looks like your ${pv.name}.` : 'This looks like a credit card file.' });
          const other = h('button', { type: 'button', class: 'fv-link cd-other', text: 'This is a different card', onclick: () => {
            known = false; nameBox.hidden = false; other.hidden = true; name.value = ''; lead.textContent = 'This looks like a credit card file.'; name.focus();
          } });
          other.hidden = !known;
          el.append(...[
            h('p', { class: 'cd-lead' }, ic('credit-card'), lead, other),
            box,
            h('div', { class: 'cd-flip' }, flipBtn),
            pv.repeat > 0 ? h('p', { class: 'yd-small', text: pv.fresh ? `${nf0.format(pv.repeat)} of its ${nf0.format(pv.rows)} payments are already here, so only ${nf0.format(pv.fresh)} will be added.` : 'All its payments are already here, so nothing new will be added.' }) : null,
            nameBox,
            pv.statement ? h('p', { class: 'yd-small' }, 'The file says you owe ', ydDlgAmt(pv.statement.amount), pv.statement.date ? ` on ${ydDate(pv.statement.date, true)}.` : '.') : null,
            h('p', { class: 'yd-safe' }, ic('shield-check'), 'What you buy counts as spending on the day you buy it. Your payment to the card is not counted a second time.'),
            h('div', { class: 'modal-f' },
              h('button', { type: 'button', class: 'fv-link cd-notcard', text: 'This isn’t a credit card', onclick: () => { answer(false); close(); } }),
              h('span', { class: 'spacer' }),
              h('button', { type: 'button', class: 'btn btn-secondary', text: 'Cancel', onclick: () => close() }),
              yes),
          ].filter(Boolean));
          paint();
        },
      });
    });
  }

  // ── What you owe, and how you pay it ──────────────────────────────────
  const CD_DAY_WORD = (d) => { const s = d % 100 >= 11 && d % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[d % 10] || 'th'; return d + s; };
  // c: {key, name, owed, asOf, from, pay, typed}; connected: the bank says what is owed.
  function cdOweDialog(c, opts) {
    opts = opts || {};
    const fromBank = c.from === 'bank';
    const typed = c.typed && c.typed.from === 'typed' ? c.typed : null;
    const pay0 = c.pay || {};
    const today = YD.doc && YD.doc.today ? YD.doc.today : diso(localToday());
    openDialog({
      title: `What you owe on ${c.name}`, size: 'sm', className: 'yd-dialog cd-dialog', resizeKey: 'cd-owe',
      body: (el, close) => {
        const amount = h('input', { type: 'number', class: 'input cd-money', min: '0', step: '0.01', inputmode: 'decimal', 'aria-label': 'What you owe', placeholder: '0.00', value: typed ? String(typed.amount) : c.owed != null && !fromBank ? String(c.owed) : '' });
        const date = h('input', { type: 'date', class: 'input yd-date', max: today, 'aria-label': 'On which day', value: typed ? typed.date : (c.from === 'statement' && c.asOf) || today });
        let how = pay0.how || null;
        const seg = h('div', { class: 'cd-seg', role: 'radiogroup', 'aria-label': 'How you pay it' });
        const hows = [['full', 'In full'], ['min', 'The minimum'], ['fixed', 'A fixed amount']];
        const btns = hows.map(([v, t]) => {
          const b = h('button', { type: 'button', role: 'radio', class: 'cd-seg-b', text: t, onclick: () => { how = v; paintHow(); } });
          b.dataset.v = v; seg.append(b); return b;
        });
        const fixed = h('input', { type: 'number', class: 'input cd-money', min: '0', step: '0.01', inputmode: 'decimal', value: pay0.amount ? String(pay0.amount) : '', placeholder: '0.00' });
        const fixedLbl = h('span', { text: '' });
        const fixedRow = h('label', { class: 'cd-field' }, fixedLbl, fixed);
        const day = h('select', { class: 'input cd-day', 'aria-label': 'Day it is due' }, h('option', { value: '', text: 'Choose' }));
        for (let d = 1; d <= 31; d++) day.append(h('option', { value: String(d), text: CD_DAY_WORD(d) }));
        day.value = pay0.day ? String(pay0.day) : '';
        const cur = h('input', { type: 'checkbox', class: 'yd-check' });
        cur.checked = pay0.fromCurrent !== false;
        const hint = h('p', { class: 'yd-small' });
        const err = h('p', { class: 'yd-err', role: 'alert', hidden: true });
        const paintHow = () => {
          for (const b of btns) b.setAttribute('aria-checked', String(b.dataset.v === how));
          fixedRow.hidden = how !== 'fixed' && how !== 'min';
          fixedLbl.textContent = how === 'min' ? 'The minimum on your statement, if you know it' : 'What you pay each month';
          hint.textContent = !how ? '' : how === 'full' ? 'Safe to spend keeps back all you owe, before the day it is due.'
            : how === 'min' && !fixed.value ? 'Until you type it, we use the larger of 25 or 2.5% of what you owe. Your statement has the real figure.'
              : 'Safe to spend keeps this back, before the day it is due.';
        };
        fixed.addEventListener('input', paintHow);
        const save = h('button', { type: 'button', class: 'btn btn-primary', text: 'Save', onclick: async () => {
          const body = { key: c.key, isCard: true };
          if (!fromBank && amount.value !== '') {
            const a = Number(amount.value);
            if (!Number.isFinite(a) || a < 0) return bad('That amount does not look right. Type what you owe, like 612.40.');
            body.balance = { amount: a, date: date.value || today };
          }
          if (how) {
            if (!day.value) return bad('Choose the day it is due. It is on your statement.');
            if (how === 'fixed' && !(Number(fixed.value) > 0)) return bad('Type what you pay each month.');
            body.pay = { how, amount: fixed.value ? Number(fixed.value) : undefined, day: Number(day.value), fromCurrent: cur.checked };
          }
          save.disabled = true; save.textContent = 'Saving…';
          try {
            const r = await ydPost('/card', body);
            close();
            await ydAfterChange();
            toast(`${c.name} is saved.`, { kind: 'ok', icon: 'circle-check', action: 'Undo', onAction: () => cdPutBack(r.prev) });
          } catch (e) {
            save.disabled = false; save.textContent = 'Save';
            bad(`${e.message}${/\.$/.test(e.message) ? '' : '.'} Nothing has changed.`);
          }
        } });
        const bad = (t) => { err.textContent = t; err.hidden = false; };
        el.append(
          fromBank
            ? h('p', {}, 'Your bank says you owe ', ydDlgAmt(c.owed || 0), c.asOf ? ` on ${ydDate(c.asOf, true)}. It updates by itself.` : '. It updates by itself.')
            : h('div', { class: 'cd-sec' },
              h('h4', { class: 'yd-h4', text: 'What you owe' }),
              h('p', { class: 'yd-small', text: 'It is on your latest statement, or the card’s website. Type it once: new files keep it up to date.' }),
              h('div', { class: 'cd-inline' }, h('label', { class: 'cd-field' }, h('span', { text: 'Amount' }), amount), h('label', { class: 'cd-field' }, h('span', { text: 'On' }), date))),
          h('div', { class: 'cd-sec' },
            h('h4', { class: 'yd-h4', text: 'How do you pay it?' }),
            seg, fixedRow,
            h('label', { class: 'cd-field cd-dayrow' }, h('span', { text: 'Due each month on the' }), day),
            h('label', { class: 'yd-tick' }, cur, h('span', { text: 'I pay it from my current account' })),
            hint),
          err,
          h('div', { class: 'modal-f' }, h('button', { type: 'button', class: 'btn btn-secondary', text: opts.after ? 'Later' : 'Cancel', onclick: () => close() }), save));
        paintHow();
      },
    });
  }
  async function cdPutBack(prev) {
    if (!prev) return;
    try { await ydPost('/card', { key: prev.key, isCard: prev.isCard, ...(prev.isCard ? { balance: prev.balance || null, pay: prev.pay } : {}) }); await ydAfterChange(); toast('Back as it was.', { kind: 'ok', icon: 'undo-2' }); }
    catch (e) { toastErr('undo that', e); }
  }
  async function cdFlip(r) {
    try {
      const out = await ydPost('/flip', { key: r.key });
      await ydAfterChange();
      toast(`${r.name}: ${nf0.format(out.flipped)} payments flipped. Money in is money out now, and the other way round.`, { kind: 'ok', icon: 'repeat', action: 'Undo', onAction: () => cdFlip(r) });
    } catch (e) { toastErr('flip that', e, () => cdFlip(r)); }
  }
  async function cdMark(r, isCard) {
    try {
      const out = await ydPost('/card', { key: r.key, isCard });
      await ydAfterChange();
      toast(isCard ? `${r.name} is now a credit card.` : `${r.name} is not treated as a credit card now.`, { kind: 'ok', icon: 'credit-card', action: 'Undo', onAction: () => cdPutBack(out.prev) });
    } catch (e) { toastErr('change that', e); }
  }

  // ── How to get a new file ─────────────────────────────────────────────
  const cdSteps = () => h('ol', { class: 'cd-steps' },
    h('li', { text: 'Sign in on your card’s website (a computer is easiest).' }),
    h('li', { text: 'Find your statements or activity, and choose the dates. Going back further than you need is fine.' }),
    h('li', { text: 'Choose Download or Export, then CSV.' }),
    h('li', { text: 'Bring the file in here. Payments already here are skipped.' }));
  function cdPickFile() {
    if (typeof state !== 'undefined' && state.view !== 'finance' && typeof setView === 'function') setView('finance');
    setTimeout(() => pickCsv(), 0);   // still inside the click: the file picker may open
  }

  // ── A card in Your data ───────────────────────────────────────────────
  const CD_LATE_DAYS = 14;
  /** The line under the name: what you owe, the next payment. */
  function cdRowBlock(r) {
    const c = r.card; if (!c) return null;
    const anchor = YD.doc && YD.doc.today ? dnum(YD.doc.today) : localToday();
    const source = c.from === 'bank' ? 'from your bank' : c.from === 'statement' ? 'from your statement' : c.from === 'typed' ? 'you typed this' : '';
    const owe = c.owed != null
      ? h('p', { class: 'cd-owe' }, 'You owe ', h('b', {}, ydAmt(c.owed)), c.asOf ? h('span', { class: 'cd-src', text: ` · ${ydDate(c.asOf, true)}, ${source}` }) : null)
      : h('p', { class: 'cd-owe is-empty', text: 'What you owe isn’t here yet.' });
    const x = MBM.cardNext(c, anchor);
    let pay;
    if (x) pay = h('p', { class: 'cd-pay' }, `Next payment ${x.guess ? 'about ' : ''}`, ydAmt(x.amount), ` on ${fDayW(x.n)}, from your current account.`);
    else if (c.pay && c.pay.fromCurrent === false) pay = h('p', { class: 'cd-pay', text: 'You pay it from somewhere else, so Safe to spend leaves it alone.' });
    else if (c.pay && c.owed === 0) pay = h('p', { class: 'cd-pay', text: 'Nothing to pay right now.' });
    else if (!c.pay) pay = h('p', { class: 'cd-pay', text: 'Say how you pay it, and Safe to spend keeps the money back.' });
    else pay = null;
    // Read with no one to ask (a file in the Finances folder), or most of it reads as money in: worth a look.
    const check = r.origin === 'file' && (c.guess || c.mostlyIn)
      ? h('p', { class: 'cd-pay' }, c.mostlyIn ? 'Most of this card reads as money in, which is unusual. ' : 'Freeflo read this file by itself. ',
        h('button', { type: 'button', class: 'fv-link', text: 'Money in and out are the wrong way round', onclick: () => cdFlip(r) }))
      : null;
    return h('div', { class: 'cd-block' },
      h('div', { class: 'cd-block-t' }, owe, pay, check),
      h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: c.owed == null || !c.pay ? 'Add details' : 'Change', onclick: () => cdOweDialog(c) }));
  }
  /** A file that is getting old: calm, with the way to a new one. */
  function cdLate(r) {
    if (r.kind !== 'credit' || r.origin !== 'file' || !r.to) return null;
    const today = YD.doc && YD.doc.today ? dnum(YD.doc.today) : localToday();
    const days = today - dnum(r.to);
    if (days < CD_LATE_DAYS) return null;
    return h('div', { class: 'cd-late' },
      h('p', {}, ic('clock'), h('span', { text: `This card comes from a file, so Freeflo knows it up to ${ydDate(r.to, days > 300)}. Anything you bought since isn’t counted yet.` })),
      h('details', { class: 'cd-how' }, h('summary', { text: 'How to get a new file' }), cdSteps()),
      h('button', { type: 'button', class: 'btn btn-secondary btn-sm', onclick: () => cdPickFile() }, ic('upload'), h('span', { text: 'Import a newer file' })));
  }
  /** "You pay a card we can't see." d: the unseen note of the analysis. */
  function cdUnseen(u) {
    if (!u || !u.count) return null;
    const who = u.names && u.names.length ? u.names.join(' and ') : 'a credit card';
    return h('div', { class: 'cd-unseen' }, ic('credit-card'),
      h('div', {}, h('b', { text: 'You pay a card we can’t see: add it to see what you bought.' }),
        h('span', { class: 'cd-unseen-s' }, `We found ${u.count === 1 ? 'a payment' : nf0.format(u.count) + ' payments'} to ${who}, `, ydAmt(u.total), ' lately. They count as moving your own money, not spending.')),
      h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Add a credit card', onclick: () => cdAddCard() }));
  }

  // ── Add a credit card: one screen ─────────────────────────────────────
  function cdAddCard() {
    let gone = false, timer = null, ac = null;
    openDialog({
      title: 'Add a credit card', size: 'md', className: 'yd-dialog cd-dialog', resizeKey: 'cd-add',
      onClose: () => { gone = true; clearTimeout(timer); if (ac) ac.abort(); },
      body: (el, close) => {
        const name = h('input', { type: 'search', class: 'input', placeholder: 'For example, American Express', 'aria-label': 'Which card is it?', autocomplete: 'off' });
        const said = h('p', { class: 'cd-said', role: 'status', text: 'Type its name and we’ll check whether it is listed.' });
        const connect = h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => {
          close();
          if (window.Connections && Connections.open) Connections.open('money');
          setTimeout(() => { if (typeof finStartProvider === 'function') finStartProvider('enable-banking', {}); }, 60);
        } }, ic('plug'), h('span', { text: 'Connect it' }));
        const file = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { close(); cdPickFile(); } }, ic('upload'), h('span', { text: 'Choose the file' }));
        const check = async () => {
          const q = name.value.trim();
          if (ac) ac.abort();
          if (q.length < 3) { said.textContent = 'Type its name and we’ll check whether it is listed.'; said.className = 'cd-said'; return; }
          said.textContent = 'Checking…'; said.className = 'cd-said';
          ac = typeof AbortController === 'function' ? new AbortController() : null;
          try {
            const country = typeof _finCountry === 'function' ? _finCountry() : 'GB';
            const r = await fetch(`/api/fin-connect/eb/banks?country=${encodeURIComponent(country)}&q=${encodeURIComponent(q)}`, { cache: 'no-store', signal: ac ? ac.signal : undefined });
            const j = await r.json().catch(() => ({}));
            if (gone) return;
            if (!r.ok) throw new Error(j.error || 'no answer');
            const hit = (j.banks || [])[0];
            if (hit) { said.textContent = `${hit.name} is listed, so you can connect it.`; said.className = 'cd-said good'; }
            else if (j.source === 'live') { said.textContent = `“${q}” isn’t listed right now, so it can’t be connected. Import a file instead: that works for every card.`; said.className = 'cd-said warn'; }
            else { said.textContent = `We can’t check “${q}” until Enable Banking is set up: its list needs your own free app. If you’d rather not, import a file.`; said.className = 'cd-said'; }
          } catch (e) {
            if (e && e.name === 'AbortError') return;
            if (!gone) { said.textContent = 'We couldn’t check the list just now. You can still import a file.'; said.className = 'cd-said'; }
          }
        };
        name.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(check, 350); });
        el.append(
          h('label', { class: 'cd-field' }, h('span', { text: 'Which card is it?' }), name),
          said,
          h('div', { class: 'cd-ways' },
            h('section', { class: 'cd-way' },
              h('h4', { text: 'Import a file' }),
              h('p', { class: 'yd-small', text: 'Works for every card, in about 2 minutes. Do it again whenever you want to catch up.' }),
              cdSteps(), file),
            h('section', { class: 'cd-way' },
              h('h4', { text: 'Connect it (if your card is listed)' }),
              h('p', { class: 'yd-small', text: 'It then updates by itself, and your bank gives the balance. Which cards can be connected changes, and many aren’t listed.' }),
              h('ol', { class: 'cd-steps' },
                h('li', { text: 'Set up Enable Banking once (about 10 minutes, free).' }),
                h('li', { text: 'Search for your card there.' }),
                h('li', { text: 'Sign in on your card’s own site. Freeflo can only read, never pay.' })),
              connect)),
          h('div', { class: 'modal-f' }, h('button', { type: 'button', class: 'btn btn-secondary', text: 'Close', onclick: () => close() })));
      },
    });
  }
