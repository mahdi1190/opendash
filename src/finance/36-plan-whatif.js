  // @part 36-plan-whatif.js · NEW (2.21) · OWNER: budget plan (the "What if?" explorer)
  // ── What if? ──────────────────────────────────────────────────────────
  // Ready-made scenarios and sliders, combined freely, shown live beside today. Every number comes from the server
  // (POST /api/finance/plan/whatif: lib/finance/uk-tax.mjs and the plan engine; the scenario types are data entries in
  // lib/finance/what-if.mjs). Nothing changes until "Make this my plan" (with Undo). FinanceView.openWhatIf(parts) opens
  // a scenario here (for the assistant, later).
  const MPW = { parts: [], res: null, busy: false, err: null, seq: 0, timer: 0, ctl: null, compare: null, saving: false, el: null };
  function pwBlank(type) {
    const c = (MPL.v.whatIf.catalogue || []).find(x => x.id === type);
    if (!c) return null;
    const values = {};
    for (const f of c.fields) values[f.k] = f.kind === 'date' ? '' : f.def;
    return { type, values, key: type + '-' + (++MPW.seq) };
  }
  /** Run now or soon. Only the newest answer is shown, and an old one is cancelled. */
  function pwAsk(soon) {
    clearTimeout(MPW.timer);
    MPW.timer = setTimeout(pwRun, soon ? 90 : 0);
  }
  async function pwRun() {
    if (MPW.ctl) { try { MPW.ctl.abort(); } catch (e) { /* gone */ } }
    const ctl = MPW.ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const me = ++MPW.seq;
    MPW.busy = true; MPW.err = null;
    try {
      const comp = MPW.compare ? (MPL.plan.scenarios || []).find(s => s.id === MPW.compare) : null;
      const r = await api('/api/finance/plan/whatif', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
        body: JSON.stringify({ parts: MPW.parts.map(({ type, values }) => ({ type, values })), compare: comp ? comp.parts : undefined }) });
      if (me !== MPW.seq) return;
      if (r.ok) MPW.res = r.body; else MPW.err = (r.body && r.body.error) || 'That could not be worked out.';
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      if (me === MPW.seq) MPW.err = 'Freeflo isn’t answering. Your plan has not changed.';
    }
    MPW.busy = false;
    pwPaintResult();
  }
  function pwOpen(parts) {
    MPW.parts = [];
    for (const p of parts || []) { const b = pwBlank(p.type); if (b) { Object.assign(b.values, p.values || {}); MPW.parts.push(b); } }
    MPW.compare = null;
    pwPaint(); pwAsk();
  }
  function pwAdd(type, values) {
    const b = pwBlank(type); if (!b) return;
    if (values) Object.assign(b.values, values);
    MPW.parts.push(b); pwPaint(); pwAsk();
  }

  /* ---------- the section ---------- */
  function pwSection() {
    const el = h('section', { class: 'fv-card fv-pw', 'aria-label': 'What if?' });
    MPW.el = el;
    pwPaint();
    pwAsk();   // always afresh: the plan under it may have changed
    return el;
  }
  function pwPaint() {
    const el = MPW.el; if (!el) return;
    el.innerHTML = '';
    const W = MPL.v.whatIf || { catalogue: [], saved: [] };
    MPW.result = h('div', { class: 'fv-pw-res', 'aria-live': 'polite' });
    MPW.actions = h('div', { class: 'fv-pw-acts' });
    const add = h('div', { class: 'fv-pw-add' }, (W.catalogue || []).map(c => h('button', { type: 'button', class: 'fv-pw-tile', onclick: () => pwAdd(c.id) }, ic(c.icon), h('span', { text: c.label }))));
    const ready = (W.catalogue || []).flatMap(c => c.ready.map(r => ({ c, r })));
    const quick = h('div', { class: 'fv-pw-quick' }, ready.slice(0, 8).map(({ c, r }) => h('button', { type: 'button', class: 'fv-pw-chip', text: r.label, onclick: () => pwAdd(c.id, r.values) })));
    const active = h('div', { class: 'fv-pw-parts' }, MPW.parts.map(pwPart));
    MPW.peek = MPW.parts.length ? h('div', { class: 'fv-pw-peek', 'aria-hidden': 'true' }) : null;
    el.append(
      h('header', { class: 'fv-pl-h' }, h('h3', { text: 'What if?' }), h('p', { text: 'Try things out. Nothing changes until you say so.' })),
      h('div', { class: 'fv-pw-grid' },
        h('div', { class: 'fv-pw-left' }, MPW.peek, MPW.parts.length ? active : null,
          h('p', { class: 'fv-pw-lab', text: MPW.parts.length ? 'Add another' : 'Tap something to try' }), quick, add,
          pwSaved(W)),
        h('div', { class: 'fv-pw-right' }, MPW.result, MPW.actions)));
    pwPaintResult();
  }
  function pwPart(part) {
    const c = (MPL.v.whatIf.catalogue || []).find(x => x.id === part.type);
    if (!c) return null;
    return h('div', { class: 'fv-pw-part' },
      h('div', { class: 'fv-pw-part-h' }, ic(c.icon), h('b', { text: c.label }), h('span', { class: 'fv-grow' }),
        h('button', { type: 'button', class: 'fv-btn ghost', 'aria-label': `Take off: ${c.label}`, title: 'Take this off', onclick: () => { MPW.parts = MPW.parts.filter(x => x !== part); pwPaint(); pwAsk(); } }, ic('x'))),
      c.fields.map(f => pwField(f, part)));
  }
  function pwField(f, part) {
    const lab = h('span', { class: 'fv-pw-f-lab', text: f.label });
    const set = v => { part.values[f.k] = v; pwAsk(true); };
    if (f.kind === 'choice') {
      const s = h('select', { class: 'fv-input' }, f.options.map(([v, l]) => h('option', { value: v, text: l })));
      s.value = part.values[f.k];
      s.addEventListener('change', () => set(s.value));
      return h('label', { class: 'fv-pw-f' }, lab, s);
    }
    if (f.kind === 'date') {
      const d = h('input', { type: 'date', class: 'fv-input' });
      if (part.values[f.k]) d.value = part.values[f.k];
      d.addEventListener('change', () => set(d.value));
      return h('label', { class: 'fv-pw-f' }, lab, d);
    }
    const money = f.kind === 'money';
    const r = h('input', { type: 'range', class: 'fv-pw-range', min: String(f.min), max: String(f.max), step: String(f.step), 'aria-label': f.label });
    const n = h('input', { type: 'text', inputmode: 'decimal', class: 'fv-input fv-pw-num fv-amt', 'aria-label': f.label + ', as a number' });
    const show = v => { r.value = String(v); n.value = money ? nf0.format(v) : String(v); };
    show(part.values[f.k]);
    r.addEventListener('input', () => { const v = Number(r.value); n.value = money ? nf0.format(v) : String(v); set(v); });
    n.addEventListener('change', () => { const v = Number(n.value.replace(/[£$€,\s%]/g, '')); if (!isFinite(v) || v < 0) { show(part.values[f.k]); return; } const c = Math.min(v, 1e7); part.values[f.k] = c; show(c); set(c); });
    return h('label', { class: 'fv-pw-f' }, lab, h('div', { class: 'fv-pw-slide' }, money ? h('i', { text: SYM }) : null, n, !money ? h('i', { text: '%' }) : null, r));
  }
  /* ---------- today beside the what-if ---------- */
  const pwMonth = iso => (iso ? fd(dnum(iso + '-01'), { month: 'long', year: 'numeric' }) : '');
  const pwLong = m => (m == null ? null : m === 0 ? 'Now' : m < 24 ? `${m} month${m === 1 ? '' : 's'}` : `${Math.floor(m / 12)} years${m % 12 ? `, ${m % 12} months` : ''}`);
  function pwRows(res) {
    const debt = m => (m.debtFree ? (m.debtFree.stuck ? 'Never, at this rate' : m.debtFree.date ? pwMonth(m.debtFree.date) : '') : 'No debts');
    const rows = [
      { k: 'takeHome', label: 'Comes in a month', v: m => m.takeHome, good: 1, big: true },
      { k: 'left', label: 'Left after everything', v: m => m.left, good: 1, big: true },
      { k: 'savings', label: 'Saved a month', v: m => m.savings, good: 1 },
      { k: 'pot', label: 'Savings you have', v: m => m.pot, good: 1 },
      { k: 'debt', label: 'Debt-free by', text: debt, cmp: m => (m.debtFree ? (m.debtFree.stuck ? 9999 : m.debtFree.months) : 0), good: -1 },
    ];
    if (res.today.goal || (res.a && res.a.metrics.goal)) rows.push({ k: 'goal', label: 'Time to ' + ((res.today.goal || res.a.metrics.goal).name) + ', with what is left over too', text: m => (m.goal ? (m.goal.months == null ? 'Not at this rate' : pwLong(m.goal.months)) : ''), cmp: m => (m.goal ? (m.goal.months == null ? 9999 : m.goal.months) : 0), good: -1 });
    return rows;
  }
  function pwCell(row, m, base) {
    const parts = [];
    if (row.text) {
      parts.push(h('b', { class: 'fv-amt', text: row.text(m) }));
      if (base) { const d = row.cmp(m) - row.cmp(base); if (d && Math.abs(d) < 9000) { const better = d * row.good > 0; parts.push(h('small', { class: better ? 'up' : 'down', text: `${Math.abs(d)} month${Math.abs(d) === 1 ? '' : 's'} ${d < 0 ? 'sooner' : 'later'}` })); } }
    } else {
      const v = row.v(m);
      parts.push(amt(gbp(v), row.big ? 'big' : ''));
      if (base) { const d = round2(v - row.v(base)); if (Math.abs(d) >= 0.5) { const better = d * row.good > 0; parts.push(h('small', { class: better ? 'up' : 'down' }, amt((d > 0 ? '+' : '−') + gbp(Math.abs(d))))); } }
    }
    return h('td', null, parts);
  }
  function pwPaintResult() {
    const box = MPW.result; if (!box) return;
    box.textContent = '';
    if (MPW.err) { box.append(h('p', { class: 'fv-plq-err', role: 'alert' }, h('span', { text: MPW.err + ' ' }), h('button', { type: 'button', class: 'fv-link', text: 'Try again', onclick: () => pwAsk() }))); }
    const res = MPW.res;
    if (!res) { if (!MPW.err) box.append(h('p', { class: 'fv-pl-mute', text: 'Working it out…' })); return; }
    const any = MPW.parts.length > 0;
    if (MPW.peek && any) { MPW.peek.textContent = ''; MPW.peek.append(h('span', null, 'Comes in ', h('b', { class: 'fv-amt', text: gbp(res.a.metrics.takeHome) })), h('span', null, 'Left ', h('b', { class: 'fv-amt', text: gbp(res.a.metrics.left) }))); }
    const compareName = MPW.compare && res.b ? ((MPL.plan.scenarios || []).find(s => s.id === MPW.compare) || {}).name : null;
    const rows = pwRows(res);
    box.append(h('div', { class: 'fv-pw-tablewrap' }, h('table', { class: 'fv-pw-table' },
      h('thead', null, h('tr', null, h('th', { text: '' }), h('th', { text: 'Today' }), any ? h('th', { class: 'hl', text: 'What if' }) : null, compareName ? h('th', { text: compareName }) : null)),
      h('tbody', null, rows.map(row => h('tr', { class: row.big ? 'big' : '' }, h('th', { text: row.label, scope: 'row' }), pwCell(row, res.today, null), any ? pwCell(row, res.a.metrics, res.today) : null, compareName ? pwCell(row, res.b.metrics, res.today) : null))))));
    if (any && res.a.lumpIn > 0.5) box.append(h('p', { class: 'fv-pw-note' }, 'That bonus would leave you about ', amt(gbp(res.a.lumpIn)), ' after tax. It counts once, not every month.'));
    if (any && res.a.metrics.at !== res.today.at) box.append(h('p', { class: 'fv-pw-note', text: `Shown as things will be from ${fDayY(dnum(res.a.metrics.at))}, when the last change starts.` }));
    if (any && res.a.said && res.a.said.length) box.append(h('p', { class: 'fv-pw-note mute fv-amt', text: res.a.said.join(' · ') }));
    if (MPL.v.calc && MPL.v.calc.kind === 'estimate') box.append(h('p', { class: 'fv-pw-note mute', text: 'An estimate, using official tax rates.' }));
    pwPaintActions();
  }
  function pwPaintActions() {
    const el = MPW.actions; if (!el) return;
    el.textContent = '';
    if (!MPW.parts.length) return;
    const name = h('input', { type: 'text', class: 'fv-input fv-pw-name', placeholder: 'Give it a name', maxlength: '60', 'aria-label': 'A name for this what if', hidden: !MPW.saving });
    const saveBtn = h('button', { type: 'button', class: 'fv-btn', onclick: async () => {
      if (!MPW.saving) { MPW.saving = true; name.hidden = false; name.focus(); saveBtn.lastChild.textContent = 'Save it'; return; }
      const nm = name.value.trim() || 'My what if';
      const next = pqClone(MPL.plan); next.scenarios = (next.scenarios || []).concat([{ id: PL_NEW_ID('sc'), name: nm, parts: MPW.parts.map(({ type, values }) => ({ type, values })) }]);
      if (await planSave(next, { say: `Saved “${nm}”` })) { MPW.saving = false; pwPaint(); }
    } }, h('span', { text: MPW.saving ? 'Save it' : 'Save this what if' }));
    name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); } });
    const make = h('button', { type: 'button', class: 'fv-btn primary', text: 'Make this my plan', onclick: async () => {
      if (!MPW.res || !MPW.res.a || !MPW.res.a.plan) return;
      const next = pqClone(MPW.res.a.plan);
      next.scenarios = pqClone(MPL.plan.scenarios || []);
      delete next.oneOffOut; delete next.oneOffIn;   // a one-off happens once: the bank shows it when it does
      if (await planSave(next, { say: 'That is your plan now', icon: 'circle-check' })) { MPW.parts = []; MPW.res = null; MPW.compare = null; pwPaint(); pwAsk(); }
    } });
    el.append(name, saveBtn, h('button', { type: 'button', class: 'fv-btn ghost', text: 'Clear', onclick: () => { MPW.parts = []; MPW.saving = false; pwPaint(); pwAsk(); } }), h('span', { class: 'fv-grow' }), make);
  }
  function pwSaved(W) {
    const list = (MPL.plan && MPL.plan.scenarios) || W.saved || [];
    if (!list.length) return null;
    return h('div', { class: 'fv-pw-saved' }, h('p', { class: 'fv-pw-lab', text: 'Your saved what-ifs' }), list.map(s => h('div', { class: 'fv-pw-sv' },
      h('button', { type: 'button', class: 'fv-link', text: s.name, title: 'Try this one', onclick: () => pwOpen(s.parts) }),
      h('span', { class: 'fv-grow' }),
      h('button', { type: 'button', class: 'fv-btn ghost' + (MPW.compare === s.id ? ' on' : ''), 'aria-pressed': MPW.compare === s.id ? 'true' : 'false', text: MPW.compare === s.id ? 'Comparing' : 'Compare', onclick: () => { MPW.compare = MPW.compare === s.id ? null : s.id; pwPaint(); pwAsk(); } }),
      h('button', { type: 'button', class: 'fv-btn ghost', 'aria-label': `Remove ${s.name}`, title: 'Remove', onclick: async () => { const next = pqClone(MPL.plan); next.scenarios = next.scenarios.filter(x => x.id !== s.id); if (MPW.compare === s.id) MPW.compare = null; if (await planSave(next, { say: `Removed “${s.name}”` })) { pwPaint(); pwAsk(); } } }, ic('x')))));
  }
