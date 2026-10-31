  // @part 36-plan-q.js · NEW (2.21) · OWNER: budget plan (the "Your money plan" questionnaire)
  // ── The questionnaire ─────────────────────────────────────────────────
  // One question per screen, big, skippable, editable later and resumable. The questions come from the server
  // (lib/finance/countries.mjs for the country's set, lib/finance/money-plan.mjs for the rest): this file only draws
  // each kind (choice, multi, fields, schedule, timing, list). Answers go into a draft that is saved after each screen;
  // if a save fails the answers stay on screen, with the reason and Try again.
  const MPQ = { open: false, id: null, draft: null, busy: false, err: null, done: false, said: null };
  const pqClone = o => JSON.parse(JSON.stringify(o));
  const PL_NEW_ID = p => p + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  function pqMainJob(d, create) {
    let j = (d.items || []).find(i => i.kind === 'income' && i.incomeType === 'job' && i.main) || (d.items || []).find(i => i.kind === 'income' && i.incomeType === 'job');
    if (!j && create) { j = { id: 'job-main', kind: 'income', incomeType: 'job', main: true, status: 'now' }; d.items = d.items || []; d.items.unshift(j); }
    return j || null;
  }
  function pqGet(path) {
    const d = MPQ.draft, [root, ...rest] = path.split('.');
    if (root === 'country') return d.country;
    let cur = root === 'job' ? pqMainJob(d) : d[root];
    for (const k of rest) cur = cur == null ? cur : cur[k];
    return cur == null ? null : cur;
  }
  function pqSet(path, v) {
    const d = MPQ.draft, parts = path.split('.'), root = parts[0];
    if (root === 'country') { d.country = v; return; }
    let cur = root === 'job' ? pqMainJob(d, true) : (d[root] = d[root] || {});
    for (const k of parts.slice(1, -1)) cur = cur[k] = cur[k] || {};
    const last = parts[parts.length - 1];
    if (v === null || v === '' || v === undefined) delete cur[last]; else cur[last] = v;
    if (path === 'tax.hasJob') { const j = pqMainJob(d, v === true); if (j) j.status = v === true ? 'now' : 'no'; }
  }
  function pqStart(id) {
    MPQ.open = true; MPQ.done = false; MPQ.err = null; MPQ.draft = pqClone(MPL.plan || {});
    if (ansHasJob(MPQ.draft)) MPQ.draft.tax = Object.assign({}, MPQ.draft.tax, { hasJob: true });   // a job added on the Tax tab answers this question
    const list = MPL.v.questions;
    MPQ.id = id && list.some(q => q.id === id) ? id : (MPQ.draft.step && list.some(q => q.id === MPQ.draft.step) ? MPQ.draft.step : list[0].id);
    planPaint();
  }
  function pqClose() { MPQ.open = false; MPQ.err = null; planPaint(); }
  const pqCurrent = () => MPL.v.questions.find(q => q.id === MPQ.id) || null;
  // Save the draft, then move. A failed save stays on this screen with the reason.
  async function pqGo(dir) {
    if (MPQ.busy) return;
    const list0 = MPL.v.questions, i0 = list0.findIndex(q => q.id === MPQ.id);
    if (dir < 0) { MPQ.err = null; MPQ.said = null; MPQ.id = list0[Math.max(0, i0 - 1)].id; planPaint(); return; }
    const box = MPL.host && MPL.host.querySelector('.fv-plq');
    const wrong = pqProblem(list0[i0], box);
    if (wrong) { pqTell(box, wrong); return; }
    MPQ.busy = true; MPQ.err = null; pqPaintButtons();
    const here = MPQ.id, wasLeft = MPL.v && MPL.v.budget ? MPL.v.budget.left : null;
    MPQ.draft.step = here;
    const ok = await planSave(MPQ.draft, { quiet: true });
    MPQ.busy = false;
    if (!ok) { MPQ.err = MPL.saveErr || 'Could not save that.'; planPaint(); return; }
    const nowLeft = MPL.v && MPL.v.budget ? MPL.v.budget.left : null;
    MPQ.said = wasLeft != null && nowLeft != null && Math.abs(nowLeft - wasLeft) >= 1 ? `That answer takes what is left over a month from ${gbp(wasLeft)} to ${gbp(nowLeft)}.` : null;
    MPQ.draft = pqClone(MPL.plan);
    const list = MPL.v.questions, i = list.findIndex(q => q.id === here);
    if (i < 0 || i >= list.length - 1) MPQ.done = true; else MPQ.id = list[i + 1].id;
    planPaint();
  }
  /** What stops this question being saved: an amount that is not one, or two dates the wrong way round. */
  function pqProblem(q, box) {
    if (!q) return null;
    if (box && box.querySelector('.fv-plq-body input.bad')) return MONEY_HELP;
    const d = MPQ.draft;
    if (q.id === 'jobstart') { const j = pqMainJob(d); if (j && j.starts && j.ends && j.ends < j.starts) return 'The last day is before the first day. Change one of them.'; }
    if (q.kind === 'list' && q.list !== 'asset') {
      const rows = (d.items || []).filter(PQ_LISTS[q.list].pick);
      for (const r of rows) {
        const from = r.starts || r.from, to = r.ends || r.to;
        if (from && to && to < from) return `${r.name || 'One of these'}: the last date is before the first. Change one of them.`;
      }
    }
    return null;
  }
  function pqTell(box, text) {
    if (!box) return;
    let el = box.querySelector('.fv-plq-tell');
    if (!el) { el = h('p', { class: 'fv-plq-err fv-plq-tell', role: 'alert' }); box.querySelector('.fv-plq-foot').before(el); }
    el.textContent = text;
    const bad = box.querySelector('.fv-plq-body input.bad'); if (bad) bad.focus();
  }
  async function pqFinishLater() {
    MPQ.draft.step = MPQ.id;
    if (!(await planSave(MPQ.draft, { quiet: true }))) { MPQ.err = MPL.saveErr || 'Could not save that.'; planPaint(); return; }
    pqClose();
  }
  async function pqFinish() {
    MPQ.draft.done = true; MPQ.draft.step = null;
    if (!(await planSave(MPQ.draft, { quiet: true }))) { MPQ.err = MPL.saveErr || 'Could not save that.'; planPaint(); return; }
    pqClose();
    toast('Your money plan is ready', { kind: 'ok', icon: 'circle-check' });
  }
  let pqButtons = null;
  function pqPaintButtons() { if (pqButtons) pqButtons.forEach(b => { b.disabled = MPQ.busy; }); }

  /* ---------- drawing ---------- */
  function pqPaint(host) {
    if (MPQ.done) return pqPaintDone(host);
    const q = pqCurrent();
    if (!q) { MPQ.done = true; return pqPaintDone(host); }
    const list = MPL.v.questions, i = list.indexOf(q);
    const groups = [...new Set(list.map(x => x.group))];
    const bar = h('div', { class: 'fv-plq-prog', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(list.length), 'aria-valuenow': String(i + 1), 'aria-label': 'How far through' }, h('i', { style: { width: ((i + 1) / list.length * 100).toFixed(1) + '%' } }));
    const body = h('div', { class: 'fv-plq-body' });
    const drawers = { choice: pqChoice, multi: pqMulti, fields: pqFields, schedule: pqSchedule, timing: pqTiming, list: pqList };
    (drawers[q.kind] || pqFields)(body, q);
    // The first question decides what comes next, so it is the one that cannot be skipped.
    const mustAnswer = q.id === 'country' && !MPQ.draft.country;
    const next = h('button', { type: 'button', class: 'fv-btn primary fv-plq-next', disabled: mustAnswer, onclick: () => pqGo(1) }, h('span', { text: 'Next' }), ic('arrow-right'));
    const skip = mustAnswer ? h('span') : h('button', { type: 'button', class: 'fv-btn ghost', text: 'Skip this', onclick: () => pqGo(1) });
    const back = h('button', { type: 'button', class: 'fv-btn ghost', disabled: i === 0, onclick: () => pqGo(-1) }, ic('arrow-left'), h('span', { text: 'Back' }));
    pqButtons = [next, back].concat(mustAnswer ? [] : [skip]);
    const box = h('section', { class: 'fv-card fv-plq', 'aria-label': 'Your money plan' },
      h('div', { class: 'fv-plq-top' }, h('span', { class: 'fv-plq-group', text: q.group }), h('span', { class: 'fv-plq-count', text: `${i + 1} of ${list.length}` }), h('span', { class: 'fv-grow' }),
        h('button', { type: 'button', class: 'fv-link', text: 'Finish later', onclick: pqFinishLater })),
      bar,
      MPL.plan && MPL.plan.done ? h('div', { class: 'fv-plq-jump', role: 'navigation', 'aria-label': 'Jump to a part' }, groups.map(g => h('button', { type: 'button', class: 'fv-plq-chip' + (g === q.group ? ' on' : ''), text: g, onclick: () => { MPQ.id = list.find(x => x.group === g).id; MPQ.err = null; planPaint(); } }))) : null,
      MPQ.said ? h('p', { class: 'fv-plq-said' }, ic('circle-help'), h('span', { class: 'fv-amt', text: MPQ.said })) : null,
      h('h2', { class: 'fv-plq-t', text: q.title }),
      q.help ? h('p', { class: 'fv-plq-help', text: q.help }) : null,
      q.hint ? h('p', { class: 'fv-plq-hint' }, ic('info'), h('span', { class: 'fv-amt', text: q.hint })) : null,
      body,
      q.id === 'jobstart' && (pqMainJob(MPQ.draft) || {}).ends ? h('p', { class: 'fv-plq-help', text: 'Pay stops after the last day, so this will not count as a lasting salary. If you know your exact last payment, add it on the Tax tab afterwards.' }) : null,
      MPQ.err ? h('p', { class: 'fv-plq-err', role: 'alert' }, h('span', { text: MPQ.err + ' ' }), h('button', { type: 'button', class: 'fv-link', text: 'Try again', onclick: () => pqGo(1) })) : null,
      h('footer', { class: 'fv-plq-foot' }, back, h('span', { class: 'fv-grow' }), skip, next));
    host.append(box);
    box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); e.target.blur(); pqGo(1); } });
    const first = box.querySelector('.fv-plq-body input:not([type=hidden]), .fv-plq-body select');
    if (first && q.kind === 'fields') setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) { /* no focus */ } }, 0);
  }
  function pqPaintDone(host) {
    const v = MPL.v, b = v.budget;
    host.append(h('section', { class: 'fv-card fv-plq fv-plq-end' },
      h('span', { class: 'fv-plq-group', text: 'All done' }),
      h('h2', { class: 'fv-plq-t', text: 'Here is your plan' }),
      h('div', { class: 'fv-pl-big' }, amt(gbp(b.left), 'fv-pl-big-v' + (b.left < 0 ? ' neg' : '')), h('span', { text: b.left >= 0 ? 'left over each month' : 'short each month' })),
      h('p', { class: 'fv-plq-help' }, amt(gbp(b.income)), ' comes in each month. You can change anything at any time.'),
      v.calc && v.calc.kind === 'estimate' ? h('p', { class: 'fv-plq-help', text: 'Tax is an estimate from what you told us, using official rates. Your payslip has the final word.' }) : null,
      MPQ.err ? h('p', { class: 'fv-plq-err', role: 'alert', text: MPQ.err }) : null,
      h('footer', { class: 'fv-plq-foot' }, h('button', { type: 'button', class: 'fv-btn ghost', onclick: () => { MPQ.done = false; planPaint(); } }, ic('arrow-left'), h('span', { text: 'Back' })), h('span', { class: 'fv-grow' }),
        h('button', { type: 'button', class: 'fv-btn primary fv-plq-next', text: 'See my plan', onclick: pqFinish }))));
  }
  const pqSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function pqChoice(body, q) {
    const cur = pqGet(q.path);
    body.append(h('div', { class: 'fv-plq-opts', role: 'radiogroup', 'aria-label': q.title }, q.options.map(o =>
      h('button', { type: 'button', role: 'radio', 'aria-checked': pqSame(cur, o.v) ? 'true' : 'false', class: 'fv-plq-opt' + (pqSame(cur, o.v) ? ' on' : ''), onclick: () => { pqSet(q.path, o.v); pqGo(1); } },
        h('b', { text: o.l }), o.h ? h('span', { text: o.h }) : null))));
  }
  function pqMulti(body, q) {
    const cur = new Set(pqGet(q.path) || []);
    body.append(h('div', { class: 'fv-plq-opts' }, q.options.map(o => {
      const b = h('button', { type: 'button', role: 'checkbox', 'aria-checked': cur.has(o.v) ? 'true' : 'false', class: 'fv-plq-opt' + (cur.has(o.v) ? ' on' : '') }, h('b', { text: o.l }), o.h ? h('span', { text: o.h }) : null);
      b.addEventListener('click', () => { const on = !cur.has(o.v); if (on) cur.add(o.v); else cur.delete(o.v); b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); pqSet(q.path, [...cur]); });
      return b;
    })));
  }
  /** A labelled input for one value. onChange gets a number, text, or null. */
  function pqInput(f, value, onChange) {
    let el;
    if (f.type === 'select') {
      el = h('select', { class: 'fv-input fv-plq-in' }, (f.options || []).map(([v, l]) => h('option', { value: String(v), text: l })));
      el.value = value == null ? String(f.def != null ? f.def : (f.options[0] || [''])[0]) : String(value);
      el.addEventListener('change', () => { const raw = el.value; const o = f.options.find(x => String(x[0]) === raw); onChange(o ? o[0] : raw); });
    } else if (f.type === 'date') {
      el = h('input', { type: 'date', class: 'fv-input fv-plq-in' });
      if (value) el.value = value;
      el.addEventListener('change', () => onChange(el.value || null));
    } else if (f.type === 'text') {
      el = h('input', { type: 'text', class: 'fv-input fv-plq-in', placeholder: f.placeholder || '', maxlength: '60', autocomplete: 'off', spellcheck: 'false' });
      if (value != null) el.value = value;
      el.addEventListener('input', () => { if (f.upper) el.value = el.value.toUpperCase(); onChange(el.value.trim() || null); });
    } else {
      el = h('input', { type: 'text', inputmode: 'decimal', class: 'fv-input fv-plq-in fv-plq-num' + (f.type === 'money' ? ' fv-amt' : ''), placeholder: f.placeholder || '', autocomplete: 'off' });
      if (value != null) el.value = f.type === 'money' ? moneyNice(value) : String(value);
      el.addEventListener('input', () => {
        const n = f.type === 'money' ? moneyParse(el.value) : (() => { const raw = el.value.replace(/[,\s%]/g, ''); return raw === '' ? null : Number(raw); })();
        if (n === null) { el.classList.remove('bad'); onChange(null); return; }
        if (!isFinite(n) || n < 0 || (f.type === 'percent' && n > 100)) { el.classList.add('bad'); return; }
        el.classList.remove('bad'); onChange(n);
      });
      if (f.type === 'money') moneyWire(el);
    }
    const unit = f.type === 'money' ? SYM : f.type === 'percent' ? '%' : null;
    return { el, wrap: unit ? h('span', { class: 'fv-plq-unit' + (f.type === 'percent' ? ' after' : '') }, f.type === 'money' ? h('i', { text: unit }) : null, el, f.type === 'percent' ? h('i', { text: unit }) : null) : el };
  }
  function pqFields(body, q) {
    const rows = [];
    const refresh = () => { for (const r of rows) { const s = r.f.showIf; if (!s) continue; const v = pqGet(s.path); r.el.hidden = s.is !== undefined ? v !== s.is : v === s.not; } };
    for (const f of q.fields) {
      const value = pqGet(f.path);
      const inp = pqInput(f, value != null ? value : null, v => { pqSet(f.path, v); refresh(); });
      const el = h('label', { class: 'fv-plq-field' }, h('span', { class: 'fv-plq-lab', text: f.label }), inp.wrap);
      rows.push({ f, el });
      body.append(el);
      if (f.guess != null && value == null) {
        body.append(h('button', { type: 'button', class: 'fv-link fv-plq-use', onclick: () => { pqSet(f.path, f.guess); inp.el.value = String(f.guess); } }, 'Use ', amt(gbp2(f.guess)), ' from your bank'));
      }
    }
    refresh();
  }
  /* ---------- dates ---------- */
  const PL_WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  function plRuleEditor(rule, onChange, o) {
    o = o || {};
    const isPay = o.kind === 'pay';
    let r = rule ? pqClone(rule) : { t: 'day', day: isPay ? 25 : (o.defDay || 1), adjust: isPay ? 'prev' : 'next' };
    const wrap = h('div', { class: 'fv-plr' });
    const kinds = [['day', 'A set day'], ['lastWorking', 'Last working day'], ['lastWeekday', 'A last weekday'], ['28', 'Every 4 weeks'], ['14', 'Every 2 weeks'], ['7', 'Every week']].concat(isPay ? [] : [['q', 'Every 3 months'], ['y', 'Once a year']]);
    const keyOf = x => (x.t === 'every' ? String(x.days) : x.t === 'months' ? (x.every === 3 ? 'q' : 'y') : x.t);
    const sel = h('select', { class: 'fv-input', 'aria-label': 'How often' }, kinds.map(([v, l]) => h('option', { value: v, text: l })));
    sel.value = keyOf(r);
    const detail = h('div', { class: 'fv-plr-d' });
    const next = h('p', { class: 'fv-plr-next', 'aria-live': 'polite' });
    let t = 0, seq = 0;
    const preview = () => {
      clearTimeout(t); const me = ++seq;
      t = setTimeout(async () => {
        try {
          const res = await api('/api/finance/plan/dates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rule: r, country: o.country || (MPL.plan && MPL.plan.country) }) });
          if (me !== seq || !res.ok) return;
          next.textContent = '';
          next.append(h('span', { class: 'mute', text: 'Next: ' }), ...res.body.next.map((d, i) => h('b', { text: (i ? ', ' : '') + fd(dnum(d.date), r.t === 'months' ? { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'long' }) })));
          const moved = res.body.next.find(d => d.moved && d.why);
          if (moved) next.append(h('span', { class: 'mute', text: ` (one moved for ${moved.why})` }));
        } catch (e) { if (me === seq) next.textContent = ''; }
      }, 120);
    };
    const emit = () => { onChange(pqClone(r)); preview(); };
    const adjustSel = () => {
      const s = h('select', { class: 'fv-input', 'aria-label': 'If that is a weekend or bank holiday' }, [['prev', 'the working day before'], ['next', 'the next working day'], ['none', 'stay on the same day']].map(([v, l]) => h('option', { value: v, text: l })));
      s.value = r.adjust || (isPay ? 'prev' : 'next');
      s.addEventListener('change', () => { r.adjust = s.value; emit(); });
      return h('label', { class: 'fv-plr-f' }, h('span', { text: 'On a weekend or bank holiday, move to' }), s);
    };
    const paint = () => {
      detail.innerHTML = '';
      if (r.t === 'day' || r.t === 'months') {
        const d = h('input', { type: 'number', min: '1', max: '31', class: 'fv-input fv-plr-day', 'aria-label': 'Day of the month' });
        d.value = String(r.day || 1);
        d.addEventListener('change', () => { r.day = clamp(Math.floor(Number(d.value) || 1), 1, 31); d.value = String(r.day); emit(); });
        detail.append(h('label', { class: 'fv-plr-f' }, h('span', { text: 'Day of the month' }), d));
      }
      if (r.t === 'months') {
        const m = h('select', { class: 'fv-input', 'aria-label': 'Month' }, ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((l, i) => h('option', { value: String(i + 1), text: l })));
        m.value = String(r.month || 1);
        m.addEventListener('change', () => { r.month = Number(m.value); emit(); });
        detail.append(h('label', { class: 'fv-plr-f' }, h('span', { text: r.every === 12 ? 'Month' : 'First in' }), m));
      }
      if (r.t === 'lastWeekday') {
        const w = h('select', { class: 'fv-input', 'aria-label': 'Which day' }, PL_WD.map((l, i) => h('option', { value: String(i), text: 'Last ' + l })));
        w.value = String(r.wd != null ? r.wd : 4);
        w.addEventListener('change', () => { r.wd = Number(w.value); emit(); });
        detail.append(h('label', { class: 'fv-plr-f' }, h('span', { text: 'Which day' }), w));
      }
      if (r.t === 'every') {
        const a = h('input', { type: 'date', class: 'fv-input', 'aria-label': 'A date it happened' });
        if (r.anchor) a.value = r.anchor;
        a.addEventListener('change', () => { if (a.value) { r.anchor = a.value; emit(); } });
        detail.append(h('label', { class: 'fv-plr-f' }, h('span', { text: 'A date it last happened' }), a));
      }
      if (r.t === 'day' || r.t === 'every' || r.t === 'months') detail.append(adjustSel());
    };
    sel.addEventListener('change', () => {
      const v = sel.value, adj = r.adjust || (isPay ? 'prev' : 'next');
      const today = diso(R.model ? R.model.anchor : localToday());
      if (v === 'day') r = { t: 'day', day: r.day || (isPay ? 25 : 1), adjust: adj };
      else if (v === 'lastWorking') r = { t: 'lastWorking' };
      else if (v === 'lastWeekday') r = { t: 'lastWeekday', wd: 4 };
      else if (v === 'q' || v === 'y') r = { t: 'months', every: v === 'q' ? 3 : 12, month: 1, day: 1, adjust: adj };
      else r = { t: 'every', days: Number(v), anchor: r.anchor || today, adjust: adj };
      paint(); emit();
    });
    wrap.append(h('label', { class: 'fv-plr-f' }, h('span', { text: 'How often' }), sel), detail, next);
    paint(); if (rule || o.showNext) preview();
    return wrap;
  }
  function pqSchedule(body, q) {
    const cur = pqGet(q.path);
    if (q.guess && q.guess.rule) body.append(h('button', { type: 'button', class: 'fv-plq-opt fv-plq-guess', onclick: () => { pqSet(q.path, q.guess.rule); planPaint(); } }, h('b', { text: 'Use what your bank shows' }), h('span', { text: planRuleWords(q.guess.rule) })));
    body.append(plRuleEditor(cur || (q.guess && q.guess.rule) || null, r => pqSet(q.path, r), { kind: q.kindOf, showNext: true }));
    if (!cur && q.guess && q.guess.rule) pqSet(q.path, q.guess.rule);
  }
  function planRuleWords(r) {
    if (!r) return '';
    if (r.t === 'day') return `The ${r.day}${r.day % 10 === 1 && r.day !== 11 ? 'st' : r.day % 10 === 2 && r.day !== 12 ? 'nd' : r.day % 10 === 3 && r.day !== 13 ? 'rd' : 'th'} of each month`;
    if (r.t === 'lastWorking') return 'The last working day of each month';
    if (r.t === 'lastWeekday') return `The last ${PL_WD[r.wd] || 'Friday'} of each month`;
    if (r.t === 'every') return r.days === 28 ? 'Every four weeks' : r.days === 14 ? 'Every two weeks' : 'Every week';
    return r.every === 12 ? 'Once a year' : 'Every three months';
  }
  /* ---------- now, later, or not at all ---------- */
  function pqTiming(body, q) {
    const d = MPQ.draft; d.items = d.items || [];
    let it = d.items.find(i => i.type === q.itemType && (i.kind === 'bill' || i.kind === 'everyday'));
    const ensure = () => { if (!it) { it = { id: q.itemType, kind: q.itemKind, type: q.itemType, name: q.label, per: 'month', status: 'now' }; d.items.push(it); } return it; };
    const status = it ? it.status : null;
    const set = (s) => {
      ensure(); it.status = s;
      if (s === 'no') { pqGo(1); return; }
      if (q.askDate && !it.when) it.when = (q.guess && q.guess.rule) || { t: 'day', day: q.defDay || 1, adjust: 'next' };
      if (q.guess) { if (it.amount == null) it.amount = q.guess.amount; if (q.guess.m && !it.link) it.link = { m: q.guess.m }; }
      if (s === 'now') delete it.starts;
      planPaint();
    };
    if (q.guess) body.append(h('p', { class: 'fv-plq-hint' }, ic('info'), h('span', { class: 'fv-amt', text: q.guess.text })));
    body.append(h('div', { class: 'fv-plq-opts row', role: 'radiogroup', 'aria-label': q.title }, [['now', q.itemKind === 'bill' ? 'Yes, now' : 'Yes'], ['later', 'From a later date'], ['no', 'Not at all']].map(([v, l]) =>
      h('button', { type: 'button', role: 'radio', 'aria-checked': status === v ? 'true' : 'false', class: 'fv-plq-opt' + (status === v ? ' on' : ''), onclick: () => set(v) }, h('b', { text: l })))));
    if (status !== 'now' && status !== 'later') return;
    const amount = pqInput({ type: 'money' }, it.amount != null ? it.amount : null, v => { ensure(); if (v == null) delete it.amount; else it.amount = v; });
    const per = pqInput({ type: 'select', options: [['month', 'a month'], ['4weeks', 'every 4 weeks'], ['week', 'a week'], ['quarter', 'a quarter'], ['year', 'a year']] }, it.per || 'month', v => { it.per = v; });
    body.append(h('div', { class: 'fv-plq-pair' }, h('label', { class: 'fv-plq-field' }, h('span', { class: 'fv-plq-lab', text: 'About how much' }), amount.wrap), h('label', { class: 'fv-plq-field' }, h('span', { class: 'fv-plq-lab', text: 'How often' }), per.wrap)));
    if (status === 'later') {
      const s = pqInput({ type: 'date' }, it.starts || null, v => { if (v) it.starts = v; else delete it.starts; });
      body.append(h('label', { class: 'fv-plq-field' }, h('span', { class: 'fv-plq-lab', text: 'From about when?' }), s.wrap));
      body.append(h('p', { class: 'fv-plq-help', text: 'It will not count, or be flagged as missing, until then. It shows under Coming up.' }));
    }
    if (q.askDate) body.append(h('div', { class: 'fv-plq-sub' }, h('span', { class: 'fv-plq-lab', text: 'When does it go out?' }), plRuleEditor(it.when || null, r => { it.when = r; }, { kind: 'bill', defDay: q.defDay, showNext: true })));
  }
  /* ---------- lists: debts, goals, yearly bills, other jobs and income ---------- */
  const PQ_LISTS = {
    jobs: { pick: i => i.kind === 'income' && i.incomeType === 'job' && !i.main, make: d => { const m = pqMainJob(d); return { id: PL_NEW_ID('job'), kind: 'income', incomeType: 'job', status: 'now', when: (m && m.when) || { t: 'day', day: 28, adjust: 'prev' } }; }, empty: 'No other job. Skip this if that is right.' },
    self: { pick: i => i.kind === 'income' && i.incomeType === 'self', make: () => ({ id: PL_NEW_ID('self'), kind: 'income', incomeType: 'self', per: 'total', status: 'now' }), empty: 'Nothing here yet. Skip this if you have not been.' },
    income: { pick: i => i.kind === 'income' && !['job', 'self'].includes(i.incomeType), make: () => ({ id: PL_NEW_ID('in'), kind: 'income', incomeType: 'side', per: 'month', status: 'now' }), empty: 'Nothing else coming in. Skip this if that is right.' },
    debt: { pick: i => i.kind === 'debt', make: () => ({ id: PL_NEW_ID('debt'), kind: 'debt', status: 'now' }), empty: 'No debts added. Skip this if you owe nothing.' },
    saving: { pick: i => i.kind === 'saving', make: () => ({ id: PL_NEW_ID('goal'), kind: 'saving', status: 'now' }), empty: 'No goals yet. You can add one at any time.' },
    fund: { pick: i => i.kind === 'fund', make: () => ({ id: PL_NEW_ID('fund'), kind: 'fund', per: 'year', status: 'now', when: { t: 'months', every: 12, month: 1, day: 1, adjust: 'next' } }), empty: 'None yet. Skip this if you have none.' },
  };
  const pqCell = (row, k) => (k === 'dueMonth' ? (row.when && row.when.month) || 1 : row[k]);
  const pqCellSet = (row, k, v) => { if (k === 'dueMonth') { row.when = Object.assign({ t: 'months', every: 12, day: 1, adjust: 'next' }, row.when || {}, { month: Number(v) || 1 }); return; } if (v == null) delete row[k]; else row[k] = v; };
  /** Pay before tax, typed by the year or the month: kept as its yearly figure. */
  function pqPayCell(row) {
    let per = 'year', typed = row.annual != null ? row.annual : null;
    const say = h('small', { class: 'fv-plq-echo fv-amt' });
    const put = () => { if (typed == null) { delete row.annual; say.textContent = ''; return; } row.annual = per === 'month' ? Math.round(typed * 1200) / 100 : typed; say.textContent = per === 'month' ? `${gbp(row.annual)} a year if it runs all year` : `about ${gbp(row.annual / 12)} a month`; };
    const amount = pqInput({ type: 'money' }, typed, v => { typed = v; put(); });
    const sel = h('select', { class: 'fv-input fv-plq-in', 'aria-label': 'A year or a month?' }, [['year', 'a year'], ['month', 'a month']].map(([v, l]) => h('option', { value: v, text: l })));
    sel.addEventListener('change', () => { per = sel.value; put(); });
    put();
    return h('label', { class: 'fv-plq-field' }, h('span', { class: 'fv-plq-lab', text: 'Pay, before tax' }), h('span', { class: 'fv-plq-payper' }, amount.wrap, sel), say);
  }
  function pqList(body, q) {
    const d = MPQ.draft;
    const isAsset = q.list === 'asset';
    const def = PQ_LISTS[q.list];
    const rows = () => (isAsset ? (d.assets = d.assets || []) : (d.items = d.items || []).filter(def.pick));
    const list = h('div', { class: 'fv-plq-list' });
    const paint = () => {
      list.innerHTML = '';
      const all = rows();
      if (!all.length) list.append(h('p', { class: 'fv-plq-empty', text: isAsset ? 'Nothing added. Skip this if you like.' : def.empty }));
      for (const row of all) {
        const cells = q.columns.map(c => {
          if (q.list === 'jobs' && c.key === 'annual') return pqPayCell(row);
          const inp = pqInput({ type: c.type, options: c.options, placeholder: c.placeholder, upper: c.upper }, pqCell(row, c.key) != null ? pqCell(row, c.key) : null, v => pqCellSet(row, c.key, v));
          return h('label', { class: 'fv-plq-field' }, h('span', { class: 'fv-plq-lab', text: c.label }), inp.wrap);
        });
        const rm = h('button', { type: 'button', class: 'fv-btn ghost fv-plq-rm', 'aria-label': 'Remove this', title: 'Remove', onclick: () => {
          const arr = isAsset ? d.assets : d.items, at = arr.indexOf(row);
          arr.splice(at, 1); paint();
          toast('Removed', { action: 'Undo', onAction: () => { arr.splice(at, 0, row); paint(); } });
        } }, ic('x'));
        list.append(h('div', { class: 'fv-plq-row' }, cells, rm));
      }
    };
    paint();
    body.append(list, h('button', { type: 'button', class: 'fv-btn', onclick: () => { const r = isAsset ? { id: PL_NEW_ID('asset') } : def.make(d); (isAsset ? (d.assets = d.assets || []) : d.items).push(r); paint(); const inp = list.querySelector('.fv-plq-row:last-child input'); if (inp) inp.focus(); } }, ic('plus'), h('span', { text: q.add })));
  }
