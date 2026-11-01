/* ============================================================
   TOGETHER: money, dates and people.
   Split costs for a trip or a shared house (who owes whom: ONLY amounts
   the people typed; nothing is ever read from Finances), shared countdowns
   and trips, birthdays (each person shares their own) and wishlists (a
   friend can quietly say "I'll get this": the person it is for never sees
   who). The hub's "Coming up".
   ============================================================ */
function _tgCur(v) { return (v && v.meta && /^[A-Z]{3}$/.test(String(v.meta.currency || '')) ? v.meta.currency : (typeof APP_CONFIG !== 'undefined' && /^[A-Z]{3}$/.test(String(APP_CONFIG.currency || '')) ? APP_CONFIG.currency : 'GBP')); }
function tgMoney(n, cur) {
  try { return new Intl.NumberFormat((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined, { style: 'currency', currency: cur || 'GBP' }).format(n); }
  catch (e) { return `${cur || ''} ${Number(n).toFixed(2)}`; }
}

/* ---------- split costs ---------- */
/** Net balance per currency per member: + is owed money, - owes. */
function tgBalances(v) {
  const by = {};
  for (const e of v.expenses || []) {
    const amt = Number(e.amount) || 0;
    if (amt <= 0 || !e.paidBy) continue;
    const cur = e.currency || _tgCur(v);
    const b = by[cur] || (by[cur] = {});
    if (e.settle) { if (!e.to) continue; b[e.paidBy] = (b[e.paidBy] || 0) + amt; b[e.to] = (b[e.to] || 0) - amt; continue; }
    const split = e.split && typeof e.split === 'object' ? Object.entries(e.split).filter(([, w]) => Number(w) > 0) : [];
    const parts = split.length ? split : tgMembers(v).map(f => [f, 1]);
    const tw = parts.reduce((s, [, w]) => s + Number(w), 0) || 1;
    b[e.paidBy] = (b[e.paidBy] || 0) + amt;
    for (const [f, w] of parts) b[f] = (b[f] || 0) - amt * Number(w) / tw;
  }
  return by;
}
/** The fewest payments that settle a currency's balances: [{from, to, amount}]. */
function tgSettle(bal) {
  const debt = [], cred = [];
  for (const [f, n] of Object.entries(bal)) { const x = Math.round(n * 100) / 100; if (x < -0.004) debt.push([f, -x]); else if (x > 0.004) cred.push([f, x]); }
  debt.sort((a, b) => b[1] - a[1]); cred.sort((a, b) => b[1] - a[1]);
  const out = [];
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const p = Math.min(debt[i][1], cred[j][1]);
    if (p >= 0.01) out.push({ from: debt[i][0], to: cred[j][0], amount: Math.round(p * 100) / 100 });
    debt[i][1] -= p; cred[j][1] -= p;
    if (debt[i][1] < 0.005) i++;
    if (cred[j][1] < 0.005) j++;
  }
  return out;
}
function tgRenderMoney(body, sp, ro) {
  const v = sp.value, id = sp.id, me = tgMe();
  const bal = tgBalances(v);
  const sum = tgEl('div', 'tg-card tg-money');
  const curs = Object.keys(bal);
  if (!curs.length) sum.appendChild(tgEl('p', 'muted', 'No costs yet. Add what someone paid, and who it was for: Freeflo works out who owes whom.'));
  for (const cur of curs) {
    const mine = Math.round((bal[cur][me] || 0) * 100) / 100;
    const h = tgEl('div', 'tg-money-h');
    h.appendChild(tgEl('b', mine > 0 ? 'tg-pos' : mine < 0 ? 'tg-neg' : '', mine > 0 ? `You are owed ${tgMoney(mine, cur)}` : mine < 0 ? `You owe ${tgMoney(-mine, cur)}` : `You are all square (${cur})`));
    sum.appendChild(h);
    for (const p of tgSettle(bal[cur])) {
      const r = tgEl('div', 'tg-row tg-row-flat');
      r.appendChild(tgAvatarEl(p.from, 'sm', v));
      r.appendChild(tgEl('span', 'tg-row-t', `${p.from === me ? 'You' : tgFirst(p.from, v)} → ${p.to === me ? 'you' : tgFirst(p.to, v)}: ${tgMoney(p.amount, cur)}`));
      if (!ro && (p.from === me || p.to === me)) r.appendChild(tgBtn(p.from === me ? 'I paid this' : 'They paid me', { icon: 'check', run: () => tgEdit(id, [{ op: 'set', path: ['expenses', tgNewId('x')], value: { what: 'Settled up', amount: p.amount, currency: cur, paidBy: p.from, to: p.to, settle: true, date: todayStr(), by: me, at: Date.now() } }], { toast: 'Settled up', icon: 'check' }) }));
      sum.appendChild(r);
    }
  }
  body.appendChild(sum);
  if (!ro) body.appendChild(tgBtn('Add a cost', { primary: true, icon: 'plus', run: () => tgExpenseDialog(id) }));
  const list = (v.expenses || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (b.at || 0) - (a.at || 0));
  const box = tgEl('div', 'tg-list');
  for (const e of list.slice(0, 300)) {
    const r = tgEl('div', 'tg-row tg-row-flat' + (e.settle ? ' is-settle' : ''));
    r.appendChild(tgAvatarEl(e.paidBy, 'sm', v));
    const t = tgEl('div', 'tg-row-t');
    t.appendChild(tgEl('span', '', e.settle ? `${tgFirst(e.paidBy, v)} paid ${tgFirst(e.to, v)}` : (e.what || 'A cost')));
    const split = e.split && Object.keys(e.split).length ? Object.keys(e.split) : tgMembers(v);
    t.appendChild(tgEl('span', 'muted tg-sm', e.settle ? 'settling up' : `${tgFirst(e.paidBy, v)} paid · for ${split.length === tgMembers(v).length ? 'everyone' : split.map(f => tgFirst(f, v)).join(', ')}${e.date ? ' · ' + _dayLabel(e.date) : ''}`));
    r.appendChild(t);
    r.appendChild(tgEl('b', 'tg-amt', tgMoney(Number(e.amount) || 0, e.currency || _tgCur(v))));
    if (!ro) r.appendChild(tgIconBtn('trash-2', 'Delete', () => tgEdit(id, [{ op: 'del', path: ['expenses', e.id] }], { toast: 'Deleted for everyone', icon: 'trash-2' })));
    box.appendChild(r);
  }
  body.appendChild(box);
  body.appendChild(tgEl('p', 'muted tg-sm', 'Only what people type here counts. Nothing is ever read from anyone’s Finances.'));
}
function tgExpenseDialog(spaceId) {
  const v = tgVal(spaceId); if (!v) return;
  const me = tgMe();
  const who = new Set(tgMembers(v));
  let what, amount, cur, paid, date;
  openDialog({
    title: 'Add a cost', size: 'sm',
    body: (el) => {
      const f = (label, inp) => { const l = tgEl('label', 'field'); l.append(tgEl('span', 'field-label', label), inp); el.appendChild(l); };
      what = document.createElement('input'); what.className = 'control'; what.maxLength = 120; what.placeholder = 'Dinner, train tickets, electricity…'; what.setAttribute('autofocus', ''); f('What', what);
      const row = tgEl('div', 'tg-dgrid');
      el.appendChild(row);
      amount = document.createElement('input'); amount.type = 'number'; amount.min = '0'; amount.step = '0.01'; amount.className = 'control control-sm'; amount.placeholder = '0.00';
      cur = document.createElement('input'); cur.className = 'control control-sm'; cur.maxLength = 3; cur.value = _tgCur(v);
      paid = document.createElement('select'); paid.className = 'control control-sm';
      for (const m of tgMembers(v)) { const o = new Option(m === me ? 'Me' : tgName(m, v), m); o.selected = m === me; paid.appendChild(o); }
      date = document.createElement('input'); date.type = 'date'; date.className = 'control control-sm'; date.value = todayStr();
      const g = (label, inp) => { const l = tgEl('label', 'field'); l.append(tgEl('span', 'field-label', label), inp); row.appendChild(l); };
      g('Amount', amount); g('Currency', cur); g('Paid by', paid); g('When', date);
      el.appendChild(tgEl('div', 'field-label', 'Split between'));
      const pick = tgEl('div', 'tg-pick');
      for (const m of tgMembers(v)) {
        const l = tgEl('label', 'tg-pick-row'); const c = document.createElement('input'); c.type = 'checkbox'; c.checked = true;
        c.onchange = () => { if (c.checked) who.add(m); else who.delete(m); };
        l.append(c, tgAvatarEl(m, 'sm', v), tgEl('span', '', m === me ? 'Me' : tgName(m, v)));
        pick.appendChild(l);
      }
      el.appendChild(pick);
    },
    actions: [{ label: 'Cancel' }, { label: 'Add', primary: true, run: () => {
      const n = Math.round(Number(amount.value) * 100) / 100;
      if (!(n > 0) || n > 1e7) { toast('Type an amount above zero.', { kind: 'err' }); return false; }
      const c = String(cur.value || '').trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(c)) { toast('The currency is a three-letter code, such as GBP or EUR.', { kind: 'err' }); return false; }
      if (!who.size) { toast('Pick who it was for.', { kind: 'err' }); return false; }
      const split = {}; for (const m of who) split[m] = 1;
      const ops = [{ op: 'set', path: ['expenses', tgNewId('x')], value: { what: (what.value.trim() || 'A cost').slice(0, 120), amount: n, currency: c, paidBy: paid.value, date: date.value || todayStr(), split, by: me, at: Date.now() } }];
      ops.push(...tgFeedOps(spaceId, 'expense', `${tgMoney(n, c)} for ${(what.value.trim() || 'a cost').slice(0, 80)}`, null));
      tgEdit(spaceId, ops, { toast: 'Cost added for everyone', icon: 'receipt' });
    } }],
  });
}

/* ---------- dates: countdowns and the trip ---------- */
function tgDaysTo(iso) { return typeof daysUntil === 'function' ? daysUntil(iso) : Math.round((Date.parse(iso + 'T12:00:00') - Date.parse(todayStr() + 'T12:00:00')) / 86400000); }
function _tgInDays(n) { return n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 1 ? `in ${n} days` : n === -1 ? 'yesterday' : `${-n} days ago`; }
/** The next date in a space for its card: a countdown, the trip, a due item. */
function tgNextDate(v) {
  const t = todayStr(), c = [];
  for (const cd of v.countdowns || []) if (cd.date && cd.date >= t) c.push([cd.date, cd.title || 'Countdown']);
  if (v.meta.start && v.meta.start >= t) c.push([v.meta.start, 'Trip starts']);
  for (const it of v.items || []) if (it.status !== 'done' && it.due && it.due >= t) c.push([it.due, it.title || 'Due']);
  c.sort((a, b) => a[0].localeCompare(b[0]));
  if (!c.length) return null;
  return `${String(c[0][1]).slice(0, 40)} ${_tgInDays(tgDaysTo(c[0][0]))}`;
}
function tgRenderDates(body, sp, ro) {
  const v = sp.value, id = sp.id, me = tgMe();
  if (tgKindOf(sp) === 'trip' || v.meta.start || v.meta.place) {
    const trip = tgEl('div', 'tg-card tg-trip');
    trip.insertAdjacentHTML('beforeend', icon('plane'));
    const t = tgEl('div', 'tg-trip-t');
    t.appendChild(tgEl('b', '', v.meta.place || tgSpaceName(sp)));
    const when = v.meta.start ? `${_dayLabel(v.meta.start)}${v.meta.end ? ' – ' + _dayLabel(v.meta.end) : ''} · ${_tgInDays(tgDaysTo(v.meta.start))}` : 'No dates yet';
    t.appendChild(tgEl('span', 'muted tg-sm', when));
    trip.appendChild(t);
    if (v.meta.start && v.meta.start >= todayStr()) trip.appendChild(tgPinBtn(id, 'trip'));
    if (!ro) trip.appendChild(tgBtn('Dates…', { icon: 'pencil', run: () => tgTripDialog(id) }));
    body.appendChild(trip);
  }
  const sec = tgSection(body, 'Countdowns', 'hourglass', (v.countdowns || []).length);
  if (!(v.countdowns || []).length) sec.appendChild(tgEl('p', 'muted tg-sm', ro ? 'No countdowns.' : 'Nothing to count down to yet. Add a date everyone here is looking forward to; you can pin it to your top bar.'));
  const list = (v.countdowns || []).slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  for (const cd of list) {
    const r = tgEl('div', 'tg-row tg-row-flat' + (cd.date < todayStr() ? ' is-done' : ''));
    r.insertAdjacentHTML('beforeend', icon(cd.icon && /^[a-z0-9-]{1,32}$/.test(cd.icon) ? cd.icon : 'hourglass'));
    r.appendChild(tgEl('span', 'tg-row-t', cd.title || 'Countdown'));
    const n = tgDaysTo(cd.date);
    r.appendChild(tgEl('b', 'tg-cd-n', n >= 0 ? String(n) : '✓'));
    r.appendChild(tgEl('span', 'muted tg-sm', n >= 0 ? (n === 1 ? 'day' : 'days') + ' · ' + _dayLabel(cd.date) : _dayLabel(cd.date)));
    if (n >= 0 || tgIsPinned(id, cd.id)) r.appendChild(tgPinBtn(id, cd.id));
    if (!ro && cd.by === me) r.appendChild(tgIconBtn('trash-2', 'Delete', () => tgEdit(id, [{ op: 'del', path: ['countdowns', cd.id] }], { toast: 'Countdown deleted', icon: 'trash-2' })));
    sec.appendChild(r);
  }
  if (!ro) {
    const add = tgEl('div', 'tg-bar');
    const ti = tgInput('cd:' + id, { placeholder: 'What are you counting down to?', max: 120, aria: 'Countdown' });
    const di = document.createElement('input'); di.type = 'date'; di.className = 'control control-sm'; di.setAttribute('aria-label', 'Date');
    add.append(ti, di, tgBtn('Add', { icon: 'plus', run: () => {
      const t = String(ti.value || '').trim();
      if (!t || !di.value) { toast('A countdown needs a name and a date.', { kind: 'err' }); return; }
      tgClearDraft('cd:' + id); ti.value = '';
      tgEdit(id, [{ op: 'set', path: ['countdowns', tgNewId('d')], value: { title: t.slice(0, 120), date: di.value, by: me, at: Date.now() } }], { toast: 'Countdown added for everyone', icon: 'hourglass' });
    } }));
    sec.appendChild(add);
  }
  // Birthdays of the people here.
  const bd = tgMembers(v).filter(f => v.members[f] && v.members[f].birthday).map(f => ({ f, d: tgNextBirthday(v.members[f].birthday) })).sort((a, b) => a.d.localeCompare(b.d));
  if (bd.length) {
    const bs = tgSection(body, 'Birthdays', 'cake', bd.length);
    for (const b of bd) {
      const r = tgEl('div', 'tg-row tg-row-flat');
      r.appendChild(tgAvatarEl(b.f, 'sm', v));
      r.appendChild(tgEl('span', 'tg-row-t', tgName(b.f, v)));
      r.appendChild(tgEl('span', 'muted tg-sm', `${_dayLabel(b.d, { day: 'numeric', month: 'long' })} · ${_tgInDays(tgDaysTo(b.d))}`));
      bs.appendChild(r);
    }
  }
}
function tgTripDialog(spaceId) {
  const v = tgVal(spaceId); if (!v) return;
  let s, e, p;
  openDialog({
    title: 'The trip', size: 'sm',
    body: (el) => {
      const f = (label, inp) => { const l = tgEl('label', 'field'); l.append(tgEl('span', 'field-label', label), inp); el.appendChild(l); };
      p = document.createElement('input'); p.className = 'control'; p.maxLength = 120; p.value = v.meta.place || ''; p.placeholder = 'Where'; f('Where', p);
      s = document.createElement('input'); s.type = 'date'; s.className = 'control control-sm'; s.value = v.meta.start || ''; f('From', s);
      e = document.createElement('input'); e.type = 'date'; e.className = 'control control-sm'; e.value = v.meta.end || ''; f('To', e);
    },
    actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, run: () => {
      if (s.value && e.value && e.value < s.value) { toast('The trip ends before it starts.', { kind: 'err' }); return false; }
      tgEdit(spaceId, [{ op: 'set', path: ['meta', 'place'], value: p.value.trim().slice(0, 120) }, { op: 'set', path: ['meta', 'start'], value: s.value || null }, { op: 'set', path: ['meta', 'end'], value: e.value || null }], { toast: 'Trip saved for everyone', icon: 'plane' });
    } }],
  });
}
/** The next date of a birthday ('MM-DD'), this year or next. */
function tgNextBirthday(mmdd) {
  const t = todayStr(), y = Number(t.slice(0, 4));
  let d = `${y}-${mmdd}`;
  if (mmdd === '02-29' && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) d = `${y}-02-28`;
  if (d < t) d = `${y + 1}-${mmdd === '02-29' ? '02-28' : mmdd}`;
  return d;
}

/* ---------- people: members, birthdays, wishlists ---------- */
function tgRenderPeople(body, sp, ro) {
  const v = sp.value, id = sp.id, me = tgMe();
  const owner = v.meta.owner === me;
  for (const f of Object.keys(v.members || {})) {
    const m = v.members[f];
    if (!m) continue;
    const card = tgEl('div', 'tg-card tg-person' + (m.left || m.removed ? ' is-gone' : ''));
    card.appendChild(tgAvatarEl(f, 'lg', v));
    const t = tgEl('div', 'tg-person-t');
    t.appendChild(tgEl('b', '', f === me ? `${userName() || 'You'} (you)` : tgName(f, v)));
    const bits = [];
    if (m.role === 'owner') bits.push('made this space');
    if (m.removed) bits.push('removed'); else if (m.left) bits.push('left'); else if (!m.joined && f !== v.meta.owner) bits.push('invited');
    if (m.birthday) bits.push('birthday ' + _dayLabel(`2000-${m.birthday}`, { day: 'numeric', month: 'long' }));
    const pr = f !== me ? tgPresence(f) : null;
    if (pr && pr !== 'offline') bits.push(pr);
    t.appendChild(tgEl('span', 'muted tg-sm', bits.join(' · ')));
    card.appendChild(t);
    const acts = tgEl('div', 'tg-acts');
    if (!ro && f === me) acts.appendChild(tgBtn(m.birthday ? 'Birthday…' : 'Share my birthday', { icon: 'cake', run: () => tgBirthdayDialog(id) }));
    if (!ro && owner && f !== me && !m.removed) acts.appendChild(tgBtn('Remove', { ghost: true, run: () => {
      tgAfterUndo(`Removing ${tgName(f, v)} from ${tgSpaceName(sp)}: they stop getting its changes (their copy stays with them).`, 'user-minus',
        () => tgEdit(id, [{ op: 'set', path: ['members', f, 'removed'], value: true }], { toast: `${tgFirst(f, v)} is out of the space`, icon: 'user-minus' }));
    } }));
    card.appendChild(acts);
    body.appendChild(card);
  }
  // Wishlists
  const sec = tgSection(body, 'Wishlists', 'gift', (v.wishlist || []).length);
  const byFor = {};
  for (const w of v.wishlist || []) (byFor[w.for] = byFor[w.for] || []).push(w);
  for (const f of tgMembers(v)) {
    const list = byFor[f] || [];
    if (!list.length && f !== me) continue;
    const h = tgEl('div', 'tg-wish-h');
    h.appendChild(tgAvatarEl(f, 'sm', v));
    h.appendChild(tgEl('b', '', f === me ? 'Your wishes' : `${tgFirst(f, v)} would love`));
    sec.appendChild(h);
    for (const w of list) {
      const r = tgEl('div', 'tg-row tg-row-flat');
      r.insertAdjacentHTML('beforeend', icon('gift'));
      const t = tgEl('div', 'tg-row-t');
      t.appendChild(tgEl('span', '', w.title || 'A wish'));
      if (w.note) t.appendChild(tgEl('span', 'muted tg-sm', w.note));
      r.appendChild(t);
      if (w.price) r.appendChild(tgEl('span', 'muted tg-sm', tgMoney(w.price, _tgCur(v))));
      // The surprise: the person it is for never sees whether (or by whom) it is claimed.
      if (f !== me) {
        if (w.claimedBy === me) r.appendChild(tgBtn('You’re getting this', { ghost: true, icon: 'check', disabled: ro, run: () => tgEdit(id, [{ op: 'set', path: ['wishlist', w.id, 'claimedBy'], value: null }], { toast: 'Let go of it', icon: 'gift' }) }));
        else if (w.claimedBy) r.appendChild(tgEl('span', 'tg-chip', `${tgFirst(w.claimedBy, v)} is getting this`));
        else if (!ro) r.appendChild(tgBtn('I’ll get this', { icon: 'gift', run: () => tgEdit(id, [{ op: 'set', path: ['wishlist', w.id, 'claimedBy'], value: me }], { toast: `Claimed: ${tgFirst(f, v)} won’t see it`, icon: 'gift' }) }));
      } else if (!ro) r.appendChild(tgIconBtn('trash-2', 'Delete wish', () => tgEdit(id, [{ op: 'del', path: ['wishlist', w.id] }], { toast: 'Wish deleted', icon: 'trash-2' })));
      sec.appendChild(r);
    }
    if (f === me && !ro) sec.appendChild(tgInput('wish:' + id, { placeholder: '+ Add something you’d love (Enter)', max: 200, aria: 'New wish', onEnter: (val, el) => { const t = String(val || '').trim(); if (!t) return; tgClearDraft('wish:' + id); el.value = ''; tgEdit(id, [{ op: 'set', path: ['wishlist', tgNewId('w')], value: { for: me, title: t.slice(0, 200), by: me, at: Date.now(), claimedBy: null } }], { toast: 'Added to your wishlist', icon: 'gift' }); } }));
  }
}
function tgBirthdayDialog(spaceId) {
  const v = tgVal(spaceId); if (!v) return;
  const me = tgMe(), cur = v.members[me] && v.members[me].birthday;
  let d;
  openDialog({
    title: 'Your birthday', size: 'sm',
    body: (el) => {
      el.appendChild(tgEl('p', 'muted tg-sm', 'Only the day and month, and only with the people in this space. Share it in each space you like.'));
      d = document.createElement('input'); d.type = 'date'; d.className = 'control'; d.value = cur ? `2000-${cur}` : '';
      el.appendChild(d);
    },
    actions: [
      cur ? { label: 'Stop sharing', run: () => { tgEdit(spaceId, [{ op: 'set', path: ['members', me, 'birthday'], value: null }], { toast: 'Birthday no longer shared here', icon: 'cake' }); } } : { label: 'Cancel' },
      { label: 'Share', primary: true, run: () => { if (!d.value) return false; tgEdit(spaceId, [{ op: 'set', path: ['members', me, 'birthday'], value: d.value.slice(5) }], { toast: 'Birthday shared with this space', icon: 'cake' }); } },
    ],
  });
}

/* ---------- shared countdowns pinned to YOUR top bar ----------
   A choice of yours only (state.together.spaces[id].pins: the countdown ids, or 'trip' for the
   trip's start), never sent to anyone. 10-header.js asks togetherTopbarWidgets(strip) after your
   own widgets (they are data-tg, so never dragged or saved with yours, and the first to fold into
   "+N"), and togetherTopbarOverflow(popover, close) for the folded ones. */
function tgPins(spaceId) { const p = tgSpacePref(spaceId, 'pins'); return Array.isArray(p) ? p.filter(x => typeof x === 'string' && TG_ID_RE.test(x)).slice(0, 20) : []; }
function tgIsPinned(spaceId, key) { return tgPins(spaceId).includes(key); }
function tgSetPins(spaceId, list) { tgSetSpacePref(spaceId, 'pins', list); render(); }
function tgTogglePin(spaceId, key) {
  const before = tgPins(spaceId), on = !before.includes(key);
  tgSetPins(spaceId, on ? [...before, key] : before.filter(x => x !== key));
  toast(on ? 'Pinned to your top bar (only you see it there)' : 'Taken off your top bar', { icon: on ? 'pin' : 'pin-off', action: { label: 'Undo', run: () => tgSetPins(spaceId, before) } });
}
function tgPinBtn(spaceId, key) {
  const on = tgIsPinned(spaceId, key);
  const b = tgIconBtn(on ? 'pin-off' : 'pin', on ? 'Take off your top bar' : 'Pin to your top bar', () => tgTogglePin(spaceId, key), 'tg-pin' + (on ? ' is-on' : ''));
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  return b;
}
/** Pinned shared dates still to come (today included), soonest first: [{sp, key, title, date, ic}], four at most. */
function tgPinnedDates() {
  if (!tgOn() || !tgHas()) return [];
  const t = todayStr(), out = [];
  for (const sp of tgSpaces()) {
    const pins = tgPins(sp.id);
    if (!pins.length) continue;
    const v = sp.value;
    for (const key of pins) {
      if (key === 'trip') { if (v.meta.start && v.meta.start >= t) out.push({ sp, key, title: v.meta.place || tgSpaceName(sp), date: v.meta.start, ic: 'plane' }); continue; }
      const cd = (v.countdowns || []).find(x => x.id === key);
      if (cd && cd.date && cd.date >= t) out.push({ sp, key, title: cd.title || 'Countdown', date: cd.date, ic: cd.icon && /^[a-z0-9-]{1,32}$/.test(cd.icon) ? cd.icon : 'hourglass' });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
}
/** One pinned date as a top-bar widget (textContent only: the title may be a friend's). */
function _tgPinWidget(p) {
  const n = tgDaysTo(p.date);
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'cdw c-teal t-countdown tg-cdw' + (n <= 7 ? ' warn' : '');
  b.dataset.tg = p.sp.id + ':' + p.key;
  const ic = tgEl('span', 'cdw-ic'); ic.insertAdjacentHTML('beforeend', icon(p.ic)); b.appendChild(ic);
  const val = tgEl('span', 'cdw-val');
  val.appendChild(tgEl('span', 'cdw-num', n === 0 ? 'Today' : String(n)));
  if (n > 0) val.appendChild(tgEl('span', 'cdw-unit', n === 1 ? 'day' : 'days'));
  b.appendChild(val);
  b.appendChild(tgEl('span', 'cdw-lbl', String(p.title).slice(0, 40)));
  const where = tgSpaceName(p.sp);
  b.title = `${p.title} · ${_dayLabel(p.date)} · shared in ${where}`;
  b.setAttribute('aria-label', `${p.title}: ${n === 0 ? 'today' : n + (n === 1 ? ' day' : ' days')}, shared in ${where}`);
  b.onclick = () => setView(`together:${p.sp.id}:dates`);
  const menu = () => openMenu(b, [
    { label: `Open ${where}`, icon: 'arrow-right', run: () => setView(`together:${p.sp.id}:dates`) },
    { label: 'Take off your top bar', icon: 'pin-off', run: () => tgTogglePin(p.sp.id, p.key) },
  ], { align: 'start' });
  b.oncontextmenu = (e) => { e.preventDefault(); menu(); };
  b.onkeydown = (e) => { if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') { e.preventDefault(); menu(); } };
  return b;
}
function togetherTopbarWidgets(strip) {
  if (!strip) return;
  for (const p of tgPinnedDates()) strip.appendChild(_tgPinWidget(p));
}
function togetherTopbarOverflow(el, close) {
  const hidden = new Set([...document.querySelectorAll('#countdowns .cdw[data-tg]')].filter(n => n.style.display === 'none' || n.classList.contains('cdw-fold')).map(n => n.dataset.tg));
  for (const p of tgPinnedDates()) {
    if (!hidden.has(p.sp.id + ':' + p.key)) continue;
    const b = _tgPinWidget(p);
    b.onclick = () => { if (typeof close === 'function') close(); setView(`together:${p.sp.id}:dates`); };
    el.appendChild(b);
  }
}

/* ---------- the hub: coming up ---------- */
function tgHubLife(root) {
  if (!tgChannel()) return;
  const t = todayStr(), rows = [];
  for (const sp of tgSpaces()) {
    const v = sp.value;
    for (const cd of v.countdowns || []) if (cd.date && cd.date >= t && tgDaysTo(cd.date) <= 60) rows.push({ d: cd.date, ic: 'hourglass', text: cd.title || 'Countdown', sp });
    if (v.meta.start && v.meta.start >= t && tgDaysTo(v.meta.start) <= 90) rows.push({ d: v.meta.start, ic: 'plane', text: `${v.meta.place || tgSpaceName(sp)} trip`, sp });
    for (const f of tgMembers(v)) { const b = v.members[f] && v.members[f].birthday; if (b && f !== tgMe()) { const d = tgNextBirthday(b); if (tgDaysTo(d) <= 30) rows.push({ d, ic: 'cake', text: `${tgName(f, v)}’s birthday`, sp, key: 'bd:' + f }); } }
  }
  const seen = new Set();
  const list = rows.filter(r => { const k = r.key ? r.key + r.d : r.sp.id + r.text + r.d; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 10);
  if (!list.length) return;
  const sec = tgSection(root, 'Coming up', 'calendar-heart', list.length);
  for (const r of list) {
    const el = tgEl('button', 'tg-row'); el.type = 'button';
    el.insertAdjacentHTML('beforeend', icon(r.ic));
    el.appendChild(tgEl('span', 'tg-row-t', r.text));
    el.appendChild(tgEl('span', 'muted tg-sm', `${_dayLabel(r.d)} · ${_tgInDays(tgDaysTo(r.d))}`));
    el.onclick = () => setView(`together:${r.sp.id}:${r.ic === 'cake' ? 'people' : 'dates'}`);
    sec.appendChild(el);
  }
}
