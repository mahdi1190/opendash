/* ============================================================
   OWED TO ME, repeating splits: rent and bills. A regular payment splits by itself with the people you name each time it
   leaves the bank (or on a date, with no bank connected), then the usual matching checks who has paid, and it nudges you
   about whoever has not. Start and end dates, for everyone or for one person moving in or out. Changing people only
   changes what comes next. Set up here, from a recurring payment (35-recurring.js), from a split (66-owed-2split.js)
   or by typing names in the money plan's "Split with" (lib/owed.mjs syncPlanRepeats).
   ============================================================ */
/** The names box with suggestions. list: [{name, pid, key}], changed in place. onChange() after each change. */
function owdPeoplePicker(list, onChange) {
  const wrap = _xe('div', 'owd-picker');
  const chips = _xe('div', 'owd-pick'), sug = _xe('div', 'owd-sug');
  const nameIn = _xInput('text', '', 'Type a name'); nameIn.className = 'owd-name'; nameIn.autocomplete = 'off'; nameIn.setAttribute('aria-label', 'Add a person');
  chips.appendChild(nameIn);
  const add = (p) => {
    const name = String(p.name || '').trim(), key = p.key || owdKey(name);
    if (!name || !key || list.some(x => x.key === key)) return;
    list.push({ name, pid: p.pid || '', key });
    paint(); if (onChange) onChange();
  };
  const paint = () => {
    chips.querySelectorAll('.owd-pchip').forEach(n => n.remove());
    for (const p of list) {
      const c = _xe('span', 'owd-pchip', `<span>${esc(p.name)}</span>`);
      const x = _xe('button', 'owd-pchip-x', icon('x', 'i-xs')); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + p.name);
      x.onclick = () => { list.splice(list.indexOf(p), 1); paint(); if (onChange) onChange(); nameIn.focus(); };
      c.appendChild(x); chips.insertBefore(c, nameIn);
    }
    sug.innerHTML = '';
    const q = nameIn.value.trim().toLowerCase();
    for (const g of (OWD.data ? OWD.data.groups : []).filter(x => !q || x.name.toLowerCase().includes(q)).slice(0, 3)) {
      const b = _xe('button', 'xp-chip owd-gchip', `${icon('users', 'i-xs')}<span>${esc(g.name)}</span>`); b.type = 'button';
      b.onclick = () => { for (const k of g.keys) add({ key: k, name: owdPersonName(k) }); };
      sug.appendChild(b);
    }
    for (const c of owdCandidates().filter(x => !list.some(y => y.key === x.key) && (!q || x.name.toLowerCase().includes(q))).slice(0, q ? 8 : 6)) {
      const b = _xe('button', 'xp-chip', `<span>${esc(c.name)}</span>`); b.type = 'button';
      b.onclick = () => { add(c); nameIn.value = ''; paint(); nameIn.focus(); };
      sug.appendChild(b);
    }
    if (q && !owdCandidates().some(c => c.name.toLowerCase() === q)) {
      const b = _xe('button', 'xp-chip on', `${icon('plus', 'i-xs')}<span>Add ${esc(nameIn.value.trim())}</span>`); b.type = 'button';
      b.onclick = () => { add({ name: nameIn.value }); nameIn.value = ''; paint(); nameIn.focus(); };
      sug.appendChild(b);
    }
  };
  nameIn.oninput = paint;
  nameIn.onkeydown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && nameIn.value.trim()) { e.preventDefault(); e.stopPropagation(); add({ name: nameIn.value, pid: (owdCandidates().find(c => c.name.toLowerCase() === nameIn.value.trim().toLowerCase()) || {}).pid }); nameIn.value = ''; paint(); nameIn.focus(); }
    else if (e.key === 'Backspace' && !nameIn.value && list.length) { list.pop(); paint(); if (onChange) onChange(); nameIn.focus(); }
  };
  /** Whatever is still typed in the box counts as a name. */
  wrap.commit = () => { if (nameIn.value.trim()) { add({ name: nameIn.value }); nameIn.value = ''; paint(); } };
  wrap.focus = () => nameIn.focus();
  wrap.append(chips, sug);
  paint();
  return wrap;
}

const OWD_REPEAT_METHODS = [['equal', 'Equally'], ['shares', 'Shares'], ['percent', 'Percent'], ['exact', 'Exact amounts']];
/** Set one up, or change one ({edit: id}). pre: {title, match: {m, near}, amount, last, people, seen, method, meIn}. */
function owdRepeatDialog(pre) {
  pre = pre || {};
  const edit = pre.edit ? ((OWD.data && OWD.data.repeats) || []).find(r => r.id === pre.edit) : null;
  const v = edit || pre;
  const S = { method: v.method || 'equal', meIn: v.meIn !== false, myWeight: v.myWeight != null ? v.myWeight : 1, people: (v.people || []).map(p => ({ ...p, key: p.key || owdKey(p.name) })), regulars: [], usual: Number(v.amount) || (v.match && v.match.near) || 0, last: pre.last || '' };
  const title = _xInput('text', v.title || '', 'What is it? e.g. Rent, Council tax');
  const from = _xInput('date', (edit ? edit.from : pre.from) || todayStr()), until = _xInput('date', (edit && edit.until) || pre.until || '');
  const amount = _xInput('number', (v.rule || (!v.match && v.amount)) ? (v.amount || '') : '', '0.00', { step: '0.01', min: '0', inputMode: 'decimal' });
  const day = _xInput('number', (v.rule && v.rule.t === 'day' && v.rule.day) || 1, '', { min: '1', max: '31', step: '1', inputMode: 'numeric' });
  const which = _xe('select', 'xp-in'); which.setAttribute('aria-label', 'Which payment it follows');
  const remind = _xe('select', 'xp-in'); remind.setAttribute('aria-label', 'When to remind you');
  remind.innerHTML = [[3, 'After 3 days'], [7, 'After a week'], [14, 'After 2 weeks'], [0, 'Don’t remind me']].map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  remind.value = String(edit && edit.remindDays != null ? edit.remindDays : 7);
  let listEl, dateRow, lastHint, datesEl;
  const whichVal = () => which.value || (v.match && v.match.m ? 'm:' + v.match.m : v.match && v.match.c ? 'c:' + v.match.c : v.rule ? 'date' : '');
  const previewTotal = () => { const w = whichVal(); if (w === 'date') return Number(amount.value) || 0; const r = S.regulars.find(x => 'm:' + x.m === w); return r ? r.amount : S.usual; };
  const paintWhich = () => {
    const cur = whichVal();
    const opts = S.regulars.map(r => `<option value="m:${escAttr(r.m)}">${esc(r.m)} (about ${esc(owdMoney(r.amount))})</option>`);
    if (v.match && v.match.m && !S.regulars.some(r => r.m === v.match.m)) opts.unshift(`<option value="m:${escAttr(v.match.m)}">${esc(v.match.m)}</option>`);
    if (v.match && v.match.c) opts.unshift(`<option value="c:${escAttr(v.match.c)}">Everything in ${esc(v.match.c)}</option>`);
    which.innerHTML = '<option value="">Choose…</option>' + opts.join('') + '<option value="date">No bank payment: on a date each month</option>';
    which.value = cur;
    if (!which.value) which.value = '';
  };
  const paintDate = () => {
    const w = whichVal();
    dateRow.hidden = w !== 'date';
    const r = S.regulars.find(x => 'm:' + x.m === w);
    lastHint.innerHTML = '';
    const lastDay = r ? r.last : S.last;
    if (lastDay && lastDay < from.value) {
      lastHint.appendChild(_xe('span', '', `The last one left on ${esc(_xpDate(lastDay))}. `));
      lastHint.appendChild(uiButton({ label: 'Split that one too', kind: 'link', run: () => { from.value = lastDay; paintDate(); } }));
    }
  };
  const inputFor = (p, me) => {
    const field = (key, ph, lbl, obj) => {
      const i = _xInput('number', obj[key] == null ? '' : obj[key], ph, { step: key === 'weight' ? '0.5' : '0.01', min: '0', inputMode: 'decimal' }); i.className += ' owd-sr-in'; i.setAttribute('aria-label', lbl);
      i.oninput = () => { obj[key] = i.value; paintSums(); };
      return i;
    };
    if (S.method === 'shares') return me ? field('myWeight', '1', 'Your shares', S) : field('weight', '1', `${p.name}: shares`, p);
    if (S.method === 'percent' && !me) return field('pct', '%', `${p.name}: percent`, p);
    if (S.method === 'exact' && !me) return field('exact', '0.00', `${p.name}: amount`, p);
    return null;
  };
  const row = (who, key, inp) => { const r = _xe('div', 'owd-sr' + (key === '_me' ? ' is-me' : '')); r.appendChild(_xe('span', 'owd-sr-n', who)); r.appendChild(inp || _xe('span', 'owd-sr-sp')); const o = _xe('b', 'owd-sr-am num'); o.dataset.key = key; r.appendChild(o); return r; };
  const paintSums = () => {
    const T = previewTotal();
    const r = owdSplit(T, S.people, { method: S.method, meIn: S.meIn, myWeight: S.myWeight });
    for (const o of listEl.querySelectorAll('.owd-sr-am')) { const k = o.dataset.key; o.textContent = T > 0 && !r.error ? owdMoney((k === '_me' ? r.me : (r.lines.get(k) || 0)) / 100) : ''; }
    const e = listEl.querySelector('.owd-err'); if (e) { e.textContent = T > 0 && S.people.length && r.error ? r.error : ''; e.hidden = !e.textContent; }
    const n = listEl.querySelector('.owd-rep-usual'); if (n) n.textContent = T > 0 ? `Worked out on about ${owdMoney(T)}. It follows the real amount each time.` : 'Each share follows the real amount each time.';
  };
  const paintList = () => {
    listEl.innerHTML = '';
    if (!S.people.length) { listEl.appendChild(_xe('p', 'xp-fh', 'Add who you share it with.')); return; }
    for (const p of S.people) listEl.appendChild(row(esc(p.name), p.key, inputFor(p)));
    const me = row('', '_me', S.meIn ? inputFor({}, true) : null);
    const tog = _xe('label', 'owd-me', `<input type="checkbox"${S.meIn ? ' checked' : ''}><span>I’m in it too</span>`);
    tog.querySelector('input').onchange = (e) => { S.meIn = e.target.checked; paintList(); };
    me.firstChild.appendChild(tog);
    listEl.appendChild(me);
    const err = _xe('div', 'owd-err'); err.hidden = true; err.setAttribute('role', 'alert'); listEl.appendChild(err);
    listEl.appendChild(_xe('small', 'xp-fh owd-rep-usual'));
    paintSums();
    paintDates();
  };
  const paintDates = () => {
    if (!datesEl) return;
    datesEl.querySelectorAll('.owd-rep-pd').forEach(n => n.remove());
    for (const p of S.people) {
      const r = _xe('div', 'owd-rep-pd');
      const a = _xInput('date', p.from || ''), b = _xInput('date', p.until || '');
      a.setAttribute('aria-label', `${p.name} starts on`); b.setAttribute('aria-label', `${p.name} ends on`);
      a.onchange = () => { p.from = a.value; }; b.onchange = () => { p.until = b.value; };
      r.append(_xe('span', 'owd-rep-pn', esc(p.name)), _xField('From', a), _xField('Until', b));
      datesEl.appendChild(r);
    }
  };
  const picker = owdPeoplePicker(S.people, () => paintList());
  openDialog({
    title: edit ? `Change ${edit.title}` : 'A split that repeats', size: 'md', className: 'owd-dlg',
    body(el) {
      el.className += ' xp-form owd-form';
      el.appendChild(_xe('p', 'xp-fh', 'Each time this payment leaves your bank, Freeflo splits it with these people, checks who has paid and reminds you about who hasn’t. It never sends anyone anything by itself.'));
      el.append(_xField('What is it', title), _xField('Which payment', which));
      lastHint = _xe('div', 'owd-hint'); el.appendChild(lastHint);
      dateRow = _xe('div', 'xp-row2'); dateRow.append(_xField('How much each time', amount), _xField('Day of the month', day)); el.appendChild(dateRow);
      const pl = _xe('div', 'xp-f'); pl.appendChild(_xe('span', 'xp-fl', 'With')); pl.appendChild(picker); el.appendChild(pl);
      const seg = _xe('div', 'xp-seg owd-methods'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'How to split it');
      const paintSeg = () => { seg.innerHTML = ''; for (const [k, l] of OWD_REPEAT_METHODS) seg.appendChild(_xChip(l, '', 'xp-chip' + (S.method === k ? ' on' : ''), () => { S.method = k; paintSeg(); paintList(); })); };
      paintSeg(); el.appendChild(seg);
      listEl = _xe('div', 'owd-sum-list'); el.appendChild(listEl);
      const row2 = _xe('div', 'xp-row2'); row2.append(_xField('Starts on', from), _xField('Ends on', until, 'Leave empty if it carries on')); el.appendChild(row2);
      el.appendChild(_xField('Remind me if someone hasn’t paid', remind));
      datesEl = _xe('details', 'owd-opts'); datesEl.innerHTML = '<summary>Someone moving in or out?</summary>';
      datesEl.appendChild(_xe('p', 'xp-fh', 'Give them dates and they only share the payments between them. Add someone new above, with the date they start.'));
      el.appendChild(datesEl);
      which.onchange = () => { paintDate(); paintSums(); };
      amount.oninput = paintSums;
      from.onchange = paintDate;
      paintWhich(); paintDate(); paintList();
      owdApi('/regulars', {}).then((j) => {
        S.regulars = j.rows || [];
        paintWhich();
        // From the plan or a recurring payment: the payment is chosen already.
        if (!which.value && v.match && v.match.m) which.value = 'm:' + v.match.m;
        if (!which.value && !v.match && !S.regulars.length) which.value = 'date';
        paintDate(); paintSums();
      }).catch(() => { if (!which.value && !v.match) which.value = 'date'; paintDate(); });
      setTimeout(() => (title.value ? picker : title).focus(), 40);
    },
    actions: [
      edit ? { label: 'Stop it', icon: 'x', tip: 'What was split stays', run: async () => { const j = await owdDo('/repeat/remove', { id: edit.id }, { done: `${edit.title} won’t split any more. What was split stays.`, icon: 'repeat', what: 'stop that' }); return j ? undefined : false; } } : null,
      'spacer',
      { label: 'Cancel' },
      { label: edit ? 'Save' : 'Set it up', primary: true, icon: 'check', run: async () => {
        picker.commit();
        const name = title.value.trim();
        if (!name) { title.focus(); toast('Say what it is, for example Rent.', { kind: 'err' }); return false; }
        if (!S.people.length) { picker.focus(); toast('Add who you share it with.', { kind: 'err' }); return false; }
        const w = whichVal();
        if (!w) { which.focus(); toast('Choose the payment it follows, or a date.', { kind: 'err' }); return false; }
        const byDate = w === 'date';
        if (byDate && !(Number(amount.value) > 0)) { amount.focus(); toast('Put in how much it is each time.', { kind: 'err' }); return false; }
        const reg = S.regulars.find(x => 'm:' + x.m === w);
        // A bill that goes up and down follows the merchant alone; a steady one also has to be about the usual amount.
        const near = reg ? (reg.varies ? 0 : reg.amount) : (v.match && v.match.near) || 0;
        const repeat = { id: edit ? edit.id : undefined, title: name, method: S.method, meIn: S.meIn, myWeight: S.myWeight, from: from.value, until: until.value, remindDays: Number(remind.value), planItem: edit ? edit.planItem : pre.planItem,
          people: S.people.map(p => ({ name: p.name, pid: p.pid, weight: p.weight, pct: p.pct, exact: p.exact, from: p.from, until: p.until })),
          match: byDate ? null : w.startsWith('m:') ? { m: w.slice(2), near } : { c: w.slice(2) }, rule: byDate ? { t: 'day', day: Number(day.value) || 1 } : null, amount: byDate ? Number(amount.value) : reg ? reg.amount : S.usual, seen: pre.seen };
        const j = await owdDo('/repeat/save', { repeat }, { done: edit ? 'Saved. This changes what comes next, not what was split before.' : `${name} will split by itself ${byDate ? 'each month' : 'each time it leaves the bank'}.`, icon: 'repeat', what: 'save that' });
        if (!j) return false;
        OWD.scanAt = 0; owdScan(true);
        return undefined;
      } },
    ],
  });
}
/** The scan split something: say so, once, with one Undo. A payment undone is not split again. */
function owdRepeatsMade(j) {
  const made = j.made || [];
  if (made.length) {
    const t = made[0], owed = made.reduce((a, x) => a + x.lines.reduce((b, l) => b + l.owes, 0), 0);
    const names = [...new Set(t.lines.map(l => owdFirstName(owdPersonName(l.key))))];
    toast(made.length === 1 ? `${t.title} left the bank, so it’s split: ${names.join(' and ')} owe${names.length === 1 ? 's' : ''} you ${owdMoney(owed)}` : `${made.length} repeating payments split: ${owdMoney(owed)} owed to you`, { icon: 'repeat', timeout: 12000, action: j.madeUndo ? { label: 'Undo', run: () => owdUndo(j.madeUndo) } : undefined });
    for (const x of made) { const tasks = owdMakeChaseTasks(x); if (tasks) owdApi('/tasks', { id: x.id, map: tasks }).then(owdSet).catch(() => {}); }
  }
  for (const a of j.planAdded || []) toast(`${a.title} will split with ${a.names.map(owdFirstName).join(' and ')} each time it leaves the bank.`, { icon: 'repeat', timeout: 9000, action: { label: 'Change', run: () => owdRepeatDialog({ edit: a.id }) } });
}
/** The card on the page: what repeats, what happened last time, and what can change. */
function _owRepeatsCard(d) {
  const list = d.repeats || [];
  if (!list.length) return null;
  const card = _xe('section', 'owd-card owd-rep');
  const head = _xe('div', 'owd-card-h', `<span class="owd-card-m"><b>Repeating</b><small>Split by itself each time</small></span>`);
  head.appendChild(uiButton({ label: 'Add', icon: 'plus', size: 'sm', kind: 'ghost', run: () => owdRepeatDialog({}) }));
  card.appendChild(head);
  const box = _xe('div', 'owd-lines');
  for (const r of list) {
    const row = _xe('div', 'owd-line owd-rep-row' + (r.state === 'on' ? '' : ' is-off'));
    const who = r.people.filter(p => p.now).map(p => owdFirstName(p.name));
    const how = r.match ? (r.match.m ? `Each time ${esc(r.match.m)} leaves the bank` : `Everything in ${esc(r.match.c)}`) : r.rule ? `On the ${esc(String(r.rule.day || 1))}${esc(_owOrd(r.rule.day || 1))} of each month` : 'Choose the payment it follows';
    const bits = [how, who.length ? `with ${esc(who.join(', '))}` : 'with nobody right now',
      r.state === 'paused' ? 'paused' : r.state === 'ended' ? `ended ${esc(_xpDate(r.until))}` : r.state === 'later' ? `starts ${esc(_xpDate(r.from))}` : r.until ? `until ${esc(_xpDate(r.until))}` : '',
      r.planItem ? 'from your plan' : ''].filter(Boolean).join(' · ');
    const last = r.latest ? r.latest.lines.map(l => `<span class="xp-tag owd-st st-${l.status}">${esc(owdFirstName(l.name))}: ${esc(OWD_STATUS[l.status][0].toLowerCase())}</span>`).join('') : '';
    row.innerHTML = `<span class="owd-line-m"><span class="owd-line-t">${esc(r.title)}</span><small>${bits}</small>${r.latest ? `<span class="owd-rep-last"><small>${esc(_xpDate(r.latest.date))}:</small>${last}</span>` : ''}${r.problem ? `<small class="owd-old">${esc(r.problem)}</small>` : ''}</span>${r.stillOwed > 0 ? `<b class="num owd-line-am">${owdAmt(r.stillOwed)}</b>` : ''}`;
    const acts = [
      { label: 'Change it…', icon: 'pencil', hint: 'People, dates, how it’s shared', run: () => owdRepeatDialog({ edit: r.id }) },
      { label: r.paused ? 'Carry on' : 'Pause', icon: r.paused ? 'play' : 'pause', run: () => owdDo('/repeat/pause', { id: r.id, paused: !r.paused }, { done: r.paused ? `${r.title} carries on` : `${r.title} paused`, icon: 'repeat', what: 'change that' }) },
      'sep',
      { label: 'Stop it', icon: 'x', hint: 'What was split stays', run: () => owdDo('/repeat/remove', { id: r.id }, { done: `${r.title} won’t split any more. What was split stays.`, icon: 'repeat', what: 'stop that' }) },
    ];
    row.appendChild(uiButton({ icon: 'ellipsis', size: 'sm', kind: 'ghost', tip: 'More', aria: `More for ${r.title}`, run: (ev, b) => openMenu(b, acts, { align: 'end', width: 230 }) }));
    box.appendChild(row);
  }
  card.appendChild(box);
  return card;
}
function _owOrd(n) { const v = n % 100; return v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th'; }
/** Who has not paid their share: a calm question, and you choose what happens. */
function _owNudges(d) {
  return (d.nudges || []).slice(0, 3).map(n => {
    const c = _xe('div', 'xp-ask card owd-ask owd-nudge');
    c.innerHTML = `${icon('calendar-clock')}<span class="xp-ask-t">${esc(owdFirstName(n.name))} hasn’t paid ${owdAmt(n.left)} for ${esc(n.title)} yet<small>${n.count > 1 ? `${n.count} payments, the oldest ` : ''}${esc(owdAgo(n.age))}</small></span>`;
    const ref = n.refs;
    const a = _xe('div', 'owd-ask-a');
    a.append(uiButton({ label: `Remind ${owdFirstName(n.name)}…`, size: 'sm', kind: 'primary', run: () => owdRemindDialog(ref) }), uiButton({ label: 'They paid', size: 'sm', run: () => owdDo('/paid', { refs: ref }, { done: 'Marked as paid', icon: 'circle-check', what: 'mark that as paid' }) }), uiButton({ label: 'Later', size: 'sm', kind: 'ghost', run: () => owdDo('/nudge-later', { refs: ref }, { quiet: true, what: 'save that' }) }));
    c.appendChild(a);
    return c;
  });
}
