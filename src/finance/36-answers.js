  // @part 36-answers.js · NEW (2.28) · OWNER: tax edit (Your answers: every questionnaire answer, changed one at a time, in place)
  // ── Your answers ──────────────────────────────────────────────────────
  // The same question list the first-time walk-through uses (lib/finance/countries.mjs -> MPL.v.questions), shown as lines:
  // "Registered blind: No". Tap a line and a small control made from that question's definition opens under it (choice, many
  // choices, money, date, percent, text, pay day, a bill, a list). It saves at once, the toast has Undo, and every figure on the page
  // follows. Any country's questions work the same way. Used on Budgets and on the Tax tab (the Tax tab's "Change" panels reuse the rows).
  const ANS = { edit: null, shut: new Set(['What you pay', 'Day to day']), draft: null };
  const ansWith = (draft, fn) => { const was = MPQ.draft; MPQ.draft = draft; try { return fn(); } finally { MPQ.draft = was; } };
  const ansRepaint = () => { if (R.sectionId === 'tax' && typeof txPaint === 'function') txPaint(); else planPaint(); };
  /** The plan changed (here, or by Undo): the Tax tab reads its figures again. Budgets repaints itself. */
  function ansAfterSave() {
    if (R.sectionId === 'tax' && typeof txLoad === 'function') txLoad(TX.year).then(() => { if (R.sectionId === 'tax') txPaint(); });
  }
  function ansRead(plan, path) {
    const [root, ...rest] = path.split('.');
    if (root === 'country') return plan.country == null ? null : plan.country;
    let cur = root === 'job' ? pqMainJob(plan) : plan[root];
    for (const k of rest) cur = cur == null ? cur : cur[k];
    return cur == null ? null : cur;
  }
  /** Save one change to a copy of the plan. keep: leave the line open (a list of ticks). */
  function ansSave(fn, say, o) {
    const next = pqClone(MPL.plan);
    ansWith(next, () => fn(next));
    if (!(o && o.keep)) ANS.edit = null;
    return planSave(next, { say });
  }
  const ansShort = q => q.short || q.title;
  const ansMoney = x => (Number.isInteger(+x) ? gbp(x) : gbp2(x));
  const PER_WORDS = { month: 'a month', '4weeks': 'every 4 weeks', fortnight: 'a fortnight', week: 'a week', quarter: 'a quarter', year: 'a year', total: 'in total' };
  function ansFieldWords(f, v) {
    if (v == null || v === '') return null;
    if (f.type === 'money') return ansMoney(v);
    if (f.type === 'percent') return v + '%';
    if (f.type === 'date') return fDayY(dnum(v));
    if (f.type === 'select') { const o = (f.options || []).find(x => String(x[0]) === String(v)); return o ? o[1] : String(v); }
    return String(v);
  }
  const ansShown = f => { const s = f.showIf; if (!s) return true; const v = ansRead(MPL.plan, s.path); return s.is !== undefined ? v === s.is : v !== s.not; };

  /* ---------- one line ---------- */
  function ansLine(key, label, valueKids, editor, help) {
    const open = ANS.edit === key;
    const head = h('button', { type: 'button', class: 'fv-ans-h', 'aria-expanded': open ? 'true' : 'false', onclick: () => { ANS.edit = open ? null : key; ansRepaint(); } },
      h('span', { class: 'l', text: label }), h('span', { class: 'v' }, valueKids), h('span', { class: 'fv-chg' }, ic(open ? 'chevron-down' : 'pencil'), h('span', { text: open ? 'Close' : 'Change' })));
    return h('li', { class: 'fv-ans-r' + (open ? ' open' : '') }, head, open ? h('div', { class: 'fv-ans-ed' }, help ? h('p', { class: 'fv-pl-mute small', text: help }) : null, editor()) : null);
  }
  const ansUnset = t => h('span', { class: 'fv-ans-unset', text: t || 'Not answered' });

  /* ---------- the controls, one per kind of question ---------- */
  function ansChoiceEd(q) {
    const cur = ansRead(MPL.plan, q.path);
    return h('div', { class: 'fv-plq-opts fv-ans-opts', role: 'radiogroup', 'aria-label': q.title }, q.options.map(o => {
      const on = pqSame(cur, o.v);
      return h('button', { type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', class: 'fv-plq-opt' + (on ? ' on' : ''), onclick: () => { if (on) { ANS.edit = null; ansRepaint(); return; } ansSave(() => pqSet(q.path, o.v), `${ansShort(q)}: ${o.l}`); } }, h('b', { text: o.l }), o.h ? h('span', { text: o.h }) : null);
    }));
  }
  function ansMultiEd(q) {
    const cur = new Set(ansRead(MPL.plan, q.path) || []);
    return h('div', { class: 'fv-plq-opts fv-ans-opts' }, q.options.map(o => {
      const on = cur.has(o.v);
      return h('button', { type: 'button', role: 'checkbox', 'aria-checked': on ? 'true' : 'false', class: 'fv-plq-opt' + (on ? ' on' : ''), onclick: () => { const nx = new Set(cur); if (on) nx.delete(o.v); else nx.add(o.v); ansSave(() => pqSet(q.path, [...nx]), `${ansShort(q)}: ${nx.size ? q.options.filter(x => nx.has(x.v)).map(x => x.l).join(', ') : 'none'}`, { keep: true }); } }, h('b', { text: o.l }), o.h ? h('span', { text: o.h }) : null);
    }));
  }
  /** One field: money, percent, text, date, or a pick from a short list. A pick or a date saves as soon as it is chosen; typed ones on Save or Enter. */
  function ansFieldEd(q, f) {
    const cur = ansRead(MPL.plan, f.path);
    let val = cur, sent = false;
    const label = f.row || f.label;
    const send = () => {
      if (sent) return; sent = true;
      if (pqSame(val, cur)) { ANS.edit = null; ansRepaint(); return; }
      ansSave(() => pqSet(f.path, val), `${label}: ${ansFieldWords(f, val) || 'cleared'}`);
    };
    const instant = f.type === 'select' || f.type === 'date';
    const inp = pqInput(f, cur, v => { val = v; if (instant) send(); });
    inp.el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); val = f.type === 'text' ? (inp.el.value.trim() || null) : val; send(); } });
    setTimeout(() => { try { inp.el.focus({ preventScroll: true }); } catch (e) { /* no focus */ } }, 0);
    return h('div', { class: 'fv-ans-in' }, inp.wrap,
      h('div', { class: 'fv-pl-acts' },
        h('button', { type: 'button', class: 'fv-btn primary small', text: 'Save', onclick: send }),
        h('button', { type: 'button', class: 'fv-btn ghost small', text: 'Cancel', onclick: () => { ANS.edit = null; ansRepaint(); } }),
        cur != null ? h('button', { type: 'button', class: 'fv-link', text: f.usual != null ? 'Go back to what Freeflo works out' : 'Clear this', onclick: () => { sent = true; ansSave(() => pqSet(f.path, null), `${label}: cleared`); } }) : null));
  }
  function ansScheduleEd(q) {
    const cur = ansRead(MPL.plan, q.path);
    let rule = cur || (q.guess && q.guess.rule) || null;
    const ed = plRuleEditor(rule, r => { rule = r; }, { kind: q.kindOf, showNext: true });
    return h('div', null, ed, h('div', { class: 'fv-pl-acts' },
      h('button', { type: 'button', class: 'fv-btn primary small', text: 'Save', onclick: () => { if (!rule) { ANS.edit = null; ansRepaint(); return; } ansSave(() => pqSet(q.path, rule), `${ansShort(q)}: ${planRuleWords(rule)}`); } }),
      h('button', { type: 'button', class: 'fv-btn ghost small', text: 'Cancel', onclick: () => { ANS.edit = null; ansRepaint(); } })));
  }
  const ansItemOf = (plan, q) => (plan.items || []).find(i => i.type === q.itemType && (i.kind === 'bill' || i.kind === 'everyday')) || null;
  function ansTimingEd(q) {
    const it0 = ansItemOf(MPL.plan, q) || {};
    const s = { status: it0.status || 'now', amount: it0.amount != null ? it0.amount : null, per: it0.per || 'month', starts: it0.starts || null };
    const body = h('div', { class: 'fv-ans-in' });
    const paint = () => {
      body.textContent = '';
      const opts = h('div', { class: 'fv-plq-opts row', role: 'radiogroup', 'aria-label': q.title }, [['now', q.itemKind === 'bill' ? 'Yes, now' : 'Yes'], ['later', 'From a later date'], ['no', 'Not at all']].map(([v, l]) =>
        h('button', { type: 'button', role: 'radio', 'aria-checked': s.status === v ? 'true' : 'false', class: 'fv-plq-opt' + (s.status === v ? ' on' : ''), onclick: () => { s.status = v; paint(); } }, h('b', { text: l }))));
      body.append(opts);
      if (s.status !== 'no') {
        const amount = pqInput({ type: 'money' }, s.amount, v => { s.amount = v; });
        const per = pqInput({ type: 'select', options: [['month', 'a month'], ['4weeks', 'every 4 weeks'], ['week', 'a week'], ['quarter', 'a quarter'], ['year', 'a year']] }, s.per, v => { s.per = v; });
        body.append(h('div', { class: 'fv-plq-pair' }, h('label', { class: 'fv-plq-field' }, h('span', { class: 'fv-plq-lab', text: 'About how much' }), amount.wrap), h('label', { class: 'fv-plq-field' }, h('span', { class: 'fv-plq-lab', text: 'How often' }), per.wrap)));
        if (s.status === 'later') body.append(h('label', { class: 'fv-plq-field' }, h('span', { class: 'fv-plq-lab', text: 'From about when?' }), pqInput({ type: 'date' }, s.starts, v => { s.starts = v; }).wrap));
      }
      body.append(h('div', { class: 'fv-pl-acts' },
        h('button', { type: 'button', class: 'fv-btn primary small', text: 'Save', onclick: () => ansSave(p => {
          let it = ansItemOf(p, q);
          if (!it) { it = { id: q.itemType, kind: q.itemKind, type: q.itemType, name: q.label, per: 'month', status: s.status }; p.items = p.items || []; p.items.push(it); }
          it.status = s.status;
          if (s.status !== 'no') { if (s.amount == null) delete it.amount; else it.amount = s.amount; it.per = s.per; }
          if (s.status === 'later' && s.starts) it.starts = s.starts; else delete it.starts;
          if (q.askDate && s.status !== 'no' && !it.when) it.when = (q.guess && q.guess.rule) || { t: 'day', day: q.defDay || 1, adjust: 'next' };
        }, `${q.label}: ${s.status === 'no' ? 'not at all' : s.status === 'later' ? 'from a later date' : 'yes'}`) }),
        h('button', { type: 'button', class: 'fv-btn ghost small', text: 'Cancel', onclick: () => { ANS.edit = null; ansRepaint(); } }),
        s.status !== 'no' && q.askDate ? h('span', { class: 'fv-pl-mute small', text: 'Change the day it goes out on Budgets, in the bill’s own line.' }) : null));
    };
    paint();
    return body;
  }
  /** A list (debts, goals, other jobs...): the walk-through's own list control on a copy, with Save. */
  function ansListEd(q) {
    const draft = pqClone(MPL.plan);
    const body = h('div', { class: 'fv-ans-in' });
    ansWith(draft, () => pqList(body, q));
    body.append(h('div', { class: 'fv-pl-acts' },
      h('button', { type: 'button', class: 'fv-btn primary small', text: 'Save', onclick: () => { ANS.edit = null; planSave(draft, { say: `${ansShort(q)} saved` }); } }),
      h('button', { type: 'button', class: 'fv-btn ghost small', text: 'Cancel', onclick: () => { ANS.edit = null; ansRepaint(); } }),
      q.list === 'jobs' ? h('button', { type: 'button', class: 'fv-link', text: 'Pay so far, last payments, a bonus: on the Tax tab', onclick: () => ansOpenTax() }) : null));
    return body;
  }
  /** Open the Your answers page (Budgets or the Tax tab, whichever you are on), with one line open if you name it. */
  function ansOpen(key) {
    ANS.edit = key || null;
    if (R.sectionId === 'tax') { TX.answers = true; txPaint(); } else { MPL.answers = true; planPaint(); }
    if (key) setTimeout(() => { const el = document.querySelector('.fv-ans-r.open'); if (el) el.scrollIntoView({ block: 'center' }); }, 60);
  }
  /** A job from the plan: its details open on the Tax tab. */
  function ansOpenJob(id) {
    MPL.answers = false; TX.answers = false; TX.year = null; TX.edit = { id }; TX.focus = id;
    if (R.sectionId === 'tax') { txLoad(null).then(txPaint); } else setSection('tax');
  }
  function ansOpenTax() { TX.answers = false; TX.year = null; TX.why = null; ANS.leave && ANS.leave(); setSection('tax'); }

  /* ---------- the lines for one question ---------- */
  function ansListWords(q) {
    const plan = MPL.plan;
    const rows = q.list === 'asset' ? (plan.assets || []) : (plan.items || []).filter(PQ_LISTS[q.list].pick);
    if (!rows.length) return ansUnset('None');
    return h('span', { text: rows.slice(0, 3).map(r => (r.name || 'Untitled') + (r.balance != null ? ` ${ansMoney(r.balance)}` : r.target != null ? ` ${ansMoney(r.target)}` : r.annual != null ? ` ${ansMoney(r.annual)} a year` : r.amount != null ? ` ${ansMoney(r.amount)}` : '')).join(', ') + (rows.length > 3 ? ` and ${rows.length - 3} more` : '') });
  }
  function ansTimingWords(q) {
    const it = ansItemOf(MPL.plan, q);
    if (!it) return ansUnset();
    if (it.status === 'no') return h('span', { text: 'Not at all' });
    const bit = it.amount != null ? `${ansMoney(it.amount)} ${PER_WORDS[it.per || 'month'] || ''}`.trim() : 'No amount yet';
    return h('span', null, it.status === 'later' ? (it.starts ? `From ${fDayY(dnum(it.starts))}: ` : 'Later: ') : '', amt(bit));
  }
  /** The lines for one question, as <li> elements (a question with several fields gives one line for each). */
  function ansQuestionLines(q) {
    const plan = MPL.plan, key = q.id;
    if (q.kind === 'choice') {
      const v = ansRead(plan, q.path), o = q.options.find(x => pqSame(v, x.v));
      return [ansLine(key, ansShort(q), o ? h('span', { text: o.l }) : ansUnset(), () => ansChoiceEd(q), q.help)];
    }
    if (q.kind === 'multi') {
      const v = ansRead(plan, q.path) || [], names = q.options.filter(o => v.includes(o.v)).map(o => o.l);
      return [ansLine(key, ansShort(q), names.length ? h('span', { text: names.join(', ') }) : ansUnset('None'), () => ansMultiEd(q), q.help)];
    }
    if (q.kind === 'fields') {
      return q.fields.filter(ansShown).map(f => {
        const v = ansRead(plan, f.path), words = ansFieldWords(f, v != null ? v : f.type === 'select' ? f.def : null);
        const shown = words != null ? (f.type === 'money' ? amt(words) : h('span', { text: words })) : ansUnset(f.usual != null ? `Not set: Freeflo uses ${f.usual}` : 'Not set');
        return ansLine(q.id + ':' + f.path, f.row || f.label, shown, () => ansFieldEd(q, f), q.fields.length === 1 ? q.help : null);
      });
    }
    if (q.kind === 'schedule') {
      const v = ansRead(plan, q.path);
      return [ansLine(key, ansShort(q), v ? h('span', { text: planRuleWords(v) }) : ansUnset(), () => ansScheduleEd(q), q.help)];
    }
    if (q.kind === 'timing') return [ansLine(key, q.label, ansTimingWords(q), () => ansTimingEd(q), null)];
    if (q.kind === 'list') return [ansLine(key, ansShort(q), ansListWords(q), () => ansListEd(q), q.help)];
    return [];
  }
  /** One question's lines by its id, for the Tax tab's Change panels. */
  function ansLinesFor(id) {
    if (!MPL.v || !MPL.v.questions) return [];
    const q = MPL.v.questions.find(x => x.id === id);
    return q ? ansQuestionLines(q) : [];
  }

  /* ---------- the page ---------- */
  function ansStrip() {
    const v = MPL.v; if (!v || !v.has || !v.calc) return null;
    const c = v.calc, bits = [];
    if (c.due) bits.push(['Your tax-free amount', gbp(c.due.allowance)]);
    bits.push(['Take-home, a normal month', gbp(c.perMonth.takeHome)], ['Left over a month', gbp(v.budget.left)]);
    return h('div', { class: 'fv-ans-strip', 'aria-live': 'polite' }, bits.map(([l, x]) => h('div', null, h('small', { text: l }), amt(x, 'fv-ans-big'))));
  }
  function ansPage(onDone) {
    ANS.leave = onDone;
    const v = MPL.v;
    if (!v) return h('section', { class: 'fv-card fv-pl-invite' }, h('p', { class: 'fv-pl-mute', text: 'Opening your answers…' }));
    if (!v.has) return h('section', { class: 'fv-card fv-pl-invite' }, h('h2', { text: 'Your answers' }), h('p', { text: 'There are no answers yet. A few easy questions set up your money plan, and then they are all listed here.' }),
      h('div', { class: 'fv-pl-acts' }, h('button', { type: 'button', class: 'fv-btn primary big', onclick: () => ansWalk() }, h('span', { text: 'Start' }), ic('arrow-right')), h('button', { type: 'button', class: 'fv-btn ghost', text: 'Back', onclick: onDone })));
    const qs = v.questions, groups = [...new Set(qs.map(q => q.group))];
    const g = (name) => {
      const lines = qs.filter(q => q.group === name).flatMap(ansQuestionLines);
      if (!lines.length) return null;
      return h('details', { class: 'fv-card fv-ans-g', open: ANS.shut.has(name) ? null : true, ontoggle: e => { if (e.target.open) ANS.shut.delete(name); else ANS.shut.add(name); } },
        h('summary', null, h('h3', { text: name }), h('span', { class: 'mute', text: `${lines.length} ${lines.length === 1 ? 'answer' : 'answers'}` })), h('ul', { class: 'fv-ans-list' }, lines));
    };
    return h('div', { class: 'fv-ans' },
      h('section', { class: 'fv-card fv-ans-top' },
        h('header', { class: 'fv-pl-h row' }, h('div', null, h('h2', { text: 'Your answers' }), h('p', { text: 'Everything you told Freeflo, in plain words. Tap any line to change just that one. It saves at once, and Undo is on the message that appears.' })),
          h('div', { class: 'fv-pl-acts' }, h('button', { type: 'button', class: 'fv-btn primary', onclick: onDone }, ic('check'), h('span', { text: 'Done' })))),
        ansStrip(),
        c_overrideNote(v)),
      groups.map(g), h('p', { class: 'fv-pl-mute small fv-ans-foot' }, 'Prefer the step-by-step questions? ', h('button', { type: 'button', class: 'fv-link', text: 'Walk through them again', onclick: () => ansWalk() })));
  }
  function c_overrideNote(v) {
    const t = (MPL.plan && MPL.plan.tax) || {};
    if (t.allowanceOverride == null) return null;
    return h('p', { class: 'fv-pl-note info' }, ic('info'), h('span', null, `Your tax-free amount is the figure you gave from HMRC: ${gbp(t.allowanceOverride)}.${t.allowanceNote ? ' ' + t.allowanceNote + '.' : ''} `, h('button', { type: 'button', class: 'fv-link', text: 'Go back to worked out', onclick: () => ansSave(p => { delete p.tax.allowanceOverride; delete p.tax.allowanceOverrideYear; delete p.tax.allowanceNote; }, 'Your tax-free amount is worked out again') })));
  }
  function ansWalk(id) {
    if (ANS.leave) ANS.leave();
    TX.answers = false; MPL.answers = false;
    if (R.sectionId !== 'budgets') { setSection('budgets'); setTimeout(() => { try { pqStart(id); } catch (e) { /* the plan opens by itself */ } }, 120); } else pqStart(id);
  }

  /* ---------- click an amount or a date, edit it right there ---------- */
  /** A figure that is a button with a pencil: tap, type, Enter. Blank puts nothing in. onCommit(number|null). */
  function ansInlineAmount(value, label, onCommit, o) {
    o = o || {};
    const wrap = h('span', { class: 'fv-ie' });
    const show = () => {
      wrap.textContent = '';
      wrap.append(h('button', { type: 'button', class: 'fv-ie-b', title: `Change ${label}`, 'aria-label': `${label}: ${value != null ? ansMoney(value) : 'not set'}. Change it`, onclick: edit }, amt(value != null ? ansMoney(value) : o.empty || 'Add'), ic('pencil')));
    };
    const edit = () => {
      wrap.textContent = '';
      let done = false;
      const box = plAmountInput(value, label, x => { done = true; onCommit(x); });
      const inp = box.querySelector('input');
      inp.addEventListener('blur', () => { if (!done) show(); });
      inp.addEventListener('keydown', e => { if (e.key === 'Escape') { done = true; show(); } });
      wrap.append(box); inp.focus(); inp.select();
    };
    show();
    return wrap;
  }
