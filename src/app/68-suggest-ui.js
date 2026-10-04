/* ============================================================
   SUGGESTIONS ENGINE: cards, surfaces, settings (owner: Suggestions engine)
   ------------------------------------------------------------
   PUBLIC API (other areas use only these):
     sgCurrent()                -> {ctx, res: sgEvaluate(...), assign: sgAssign(...)} (memoised)
     sgCards(surface, n)        -> cards for 'hero' | 'home' | 'brief' | 'story-morning' | 'story-evening'
     sgForWidget(wid)           -> the card a widget hosts in place (inPlace: [wid]) or null
     sgCardEl(card, {surface, size: 'card'|'row'|'chip'}) -> Element (the shared card)
     sgRefresh()                re-evaluate and repaint (debounced 250 ms)
     sgRunKey(key, from)        run a shown card's primary by key (story ideas)
     sgStoryIdeas(kind)         -> ideas in the morning story's shape (act.do = 'suggest')
     sgHeroSlot(root)           the Today hero's one suggestion (12-home-w-today.js)
     sgHomeWidgetRender(el, ctx)   the 'suggest' Home widget (12-home-w-suggest.js)
     sgScheduleBlockHtml(g) / sgScheduleBlock(spec, btn, quick) / sgScheduleReceipts(el) /
     sgScheduleBannerText(g, kind)   S1 in place in Today's schedule (12-home-w-schedule.js)
     sgEvcLinkRow(d, repaint)   the event card (create mode) shows the task a block is for
   A card (see 68-suggest-logic.js): primary = the normal editor, prefilled (the user
   adjusts and Saves); ✓ = applies it as it is, at once, then a receipt with Undo in
   place of the card (it folds 10 s after the last touch; hover or focus holds it).
   "…" = Not now / Not for this one / Fewer like this / Stop these / Why am I seeing
   this?; × = Not now. Settings > Suggestions: a switch per rule, how many on Home,
   reset, the local counts. Counts never leave the computer (UI key suggestStats).
   ============================================================ */

let _sgEval = null, _sgEvalMem = '', _sgRefreshT = 0, _sgSeq = 0, _sgIO = null;
const _sgReceipts = new Map();      // card key -> receipt {key, card, surface, state, line, sub, message, group, eventId, ...}

/* ---------- evaluation ---------- */
function sgCurrent() {
  _sgWatchCalw();
  const ctx = sgSnapshot();
  const memKey = JSON.stringify(state.suggest || null);
  if (_sgEval && _sgEval.ctx === ctx && _sgEvalMem === memKey) return _sgEval;
  const stats = sgStatsRoll(state.suggestStats, ctx.now.date);
  let res;
  try { res = sgEvaluate(ctx, state.suggest, { stats }); }
  catch (e) { console.error('[suggest] evaluate', e); res = { cards: [], hidden: [], skipped: [], errors: [], guards: {}, suppressed: [] }; }
  if (res.errors.length) console.warn('[suggest] rule errors', res.errors);
  const assign = sgAssign(res.cards, ctx, { homeMax: sgMemNorm(state.suggest).homeMax });
  _sgEval = { ctx, res, assign };
  _sgEvalMem = memKey;
  return _sgEval;
}
function sgCards(surface, n) {
  const a = sgCurrent().assign;
  let list = surface === 'hero' ? (a.hero ? [a.hero] : []) : surface === 'home' ? a.home
    : surface === 'story-morning' || surface === 'brief' ? a.story.morning : surface === 'story-evening' ? a.story.evening : [];
  return Number.isFinite(n) ? list.slice(0, n) : list;
}
function sgForWidget(wid) { return sgCurrent().assign.widgets[wid] || null; }
function sgRefresh() {
  clearTimeout(_sgRefreshT);
  _sgRefreshT = setTimeout(() => { _sgEval = null; if (typeof _sgSnap !== 'undefined') _sgSnap = null; if (typeof render === 'function') render(); }, 250);
}
/** Run a card's primary by key (it must be one the engine shows now). */
function sgRunKey(key, from) {
  const c = sgCurrent().res.cards.find(x => x.key === key);
  if (!c) { toast('That suggestion is no longer current.', { icon: 'info' }); return false; }
  _sgDo(c, c.primary.action, { surface: 'story', from: from || null });
  return true;
}
/** The morning story's ideas, from the engine (its close beat; `do: 'suggest'` runs sgRunKey). */
function sgStoryIdeas(kind) {
  return sgCards(kind === 'evening' ? 'story-evening' : 'story-morning', 3).map(c => ({
    kind: 'suggest', label: SG_AREA_LABEL[c.area] || 'Idea', text: `${c.title}. ${c.text}`, say: `${c.title}. ${c.text}`, detail: (c.why || [])[0] || '',
    scene: c.scene || 'idea', act: { label: c.primary.label, icon: c.primary.icon || 'arrow-right', do: 'suggest', key: c.key },
  }));
}

/* ---------- the card ---------- */
function _sgBadge(card) {
  const s = card.safety;
  return s === 'confirm' ? '<span class="sg-badge">Asks first</span>' : s === 'draft' ? '<span class="sg-badge">Draft only</span>' : '';
}
function _sgIconHtml(card, size) {
  if (card.scene && typeof animSceneHtml === 'function' && size !== 'row') return animSceneHtml(card.scene, { size: size === 'chip' ? 'xs' : 'sm', hover: true });
  return icon(card.icon || 'lightbulb');
}
function _sgBtn(cls, html, aria) {
  const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html;
  if (aria) b.setAttribute('aria-label', aria);
  return b;
}
/** The shared card. o: {surface, size}. Re-uses the receipt when this card was just acted on here. */
function sgCardEl(card, o) {
  o = o || {};
  const size = ['card', 'row', 'chip'].includes(o.size) ? o.size : 'card';
  const surface = o.surface || 'home';
  const el = document.createElement('section');
  el.className = `sg-card sg-sz-${size} sg-a-${card.area || 'time'}`;
  el.dataset.sgKey = card.key; el.dataset.sgRule = card.rule || ''; el.dataset.flip = 'sg:' + card.key;
  el.dataset.sceneKey = 'sg:' + card.key;
  el.setAttribute('role', 'group');
  const rec = _sgReceipts.get(card.key);
  if (rec && rec.surface === surface) { _sgPaintReceipt(el, rec); return el; }
  const tid = 'sg-t-' + (++_sgSeq);
  el.setAttribute('aria-labelledby', tid);
  const ovl = size === 'card' ? `<div class="sg-ovl">${card.stream && typeof streamMarkHtml === 'function' ? streamMarkHtml(card.stream) : ''}<span>${esc(SG_AREA_LABEL[card.area] || 'Suggestion')}</span>${_sgBadge(card)}</div>` : '';
  el.innerHTML = `<div class="sg-ic" aria-hidden="true">${_sgIconHtml(card, size)}</div>`
    + `<div class="sg-main">${ovl}<div class="sg-tt" id="${tid}">${esc(card.title)}${size === 'chip' ? `<span class="sg-tx-in"> · ${esc(card.text)}</span>` : ''}</div>`
    + (size !== 'chip' ? `<div class="sg-tx">${esc(card.text)}</div>` : '')
    + `<div class="sg-act"></div><div class="sg-err" role="alert" hidden></div></div><div class="sg-tools"></div>`;
  const act = el.querySelector('.sg-act');
  const p = card.primary;
  const go = _sgBtn('btn btn-primary btn-sm sg-go', (p.icon ? icon(p.icon) : '') + `<span>${esc(p.label)}</span>`, p.aria || p.label);
  go.onclick = () => _sgDo(card, p.action, { surface, from: go, el });
  act.appendChild(go);
  if (card.quick && card.quick.action) {
    const q = _sgBtn('btn btn-secondary btn-sm btn-icon sg-ok', icon(card.quick.icon || 'check'), card.quick.aria || card.quick.label);
    q.setAttribute('data-tip', (card.quick.label || 'Do it now') + ' · Undo');
    q.onclick = () => _sgDo(card, card.quick.action, { surface, from: q, el });
    act.appendChild(q);
  }
  if (size === 'card') {
    for (const s of card.secondary || []) {
      const c = _sgBtn('chip sg-chip', (s.icon ? icon(s.icon, 'i-xs') : '') + `<span>${esc(s.label)}</span>`, s.aria || s.label);
      c.onclick = () => _sgDo(card, s.action, { surface, from: c, el });
      act.appendChild(c);
    }
  }
  if (card.askKeep && size !== 'chip') el.querySelector('.sg-main').appendChild(_sgKeepRow(card));
  const tools = el.querySelector('.sg-tools');
  const more = _sgBtn('btn-icon sg-more', icon('ellipsis'), 'More about this suggestion');
  more.setAttribute('aria-haspopup', 'menu');
  more.onclick = () => _sgMore(more, card, surface);
  tools.appendChild(more);
  if (size !== 'row') {
    const x = _sgBtn('btn-icon sg-x', icon('x'), 'Not now (hide until tomorrow)');
    x.setAttribute('data-tip', 'Not now');
    x.onclick = () => sgNotNow(card);
    tools.appendChild(x);
  }
  _sgObserve(el, card);
  return el;
}
function _sgKeepRow(card) {
  const row = document.createElement('div'); row.className = 'sg-keep';
  row.innerHTML = '<span>Keep suggesting these?</span>';
  const yes = _sgBtn('btn btn-ghost btn-sm', 'Yes'); yes.onclick = () => sgRun({ type: 'suggest.keep', args: { rule: card.rule, yes: true } }, card, { count: false });
  const no = _sgBtn('btn btn-ghost btn-sm', 'No'); no.onclick = () => sgRun({ type: 'suggest.keep', args: { rule: card.rule, yes: false } }, card, { count: false });
  row.append(yes, no);
  return row;
}
/** A button press: busy while it runs (a second press does nothing), a receipt for instant ones, the error inline. */
async function _sgDo(card, action, o) {
  const btn = o.from;
  if (!action) return;
  if (btn && (btn.disabled || btn.getAttribute('aria-busy') === 'true')) return;
  const safety = SG_ACTION_TYPES[action.type];
  if (safety === 'confirm' && btn && btn.dataset.armed !== '1') {
    // Someone is told: the button asks once more (5 s).
    btn.dataset.armed = '1';
    const lab = btn.querySelector('span'); const was = lab ? lab.textContent : '';
    if (lab) lab.textContent = action.confirmLabel || 'Press again to send';
    btn.classList.add('is-armed');
    setTimeout(() => { if (btn.isConnected && btn.dataset.armed === '1') { btn.dataset.armed = ''; btn.classList.remove('is-armed'); if (lab) lab.textContent = was; } }, 5000);
    return;
  }
  const instant = safety === 'instant' || safety === 'draft' || safety === 'confirm';
  if (instant && btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.classList.add('is-busy'); }
  const r = await sgRun(action, card, { from: btn, surface: o.surface, onState: instant ? _sgReceiptState(card, o.surface) : null, confirmed: safety === 'confirm' });
  if (r && r.ok !== false) return;
  if (btn && btn.isConnected) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.classList.remove('is-busy'); btn.dataset.armed = ''; }
  if (r && r.cancelled) return;
  _sgCardError(card, (r && r.message) || 'That did not work.', o.el, () => _sgDo(card, action, Object.assign({}, o, { from: o.el && o.el.isConnected ? o.el.querySelector('.sg-go') : btn })));
}
function _sgCardError(card, msg, el, retry) {
  const host = el && el.isConnected ? el : document.querySelector(`.sg-card[data-sg-key="${CSS.escape(card.key)}"]`);
  if (!host) { toast(msg, { kind: 'err', ...(retry ? { action: { label: 'Try again', run: retry } } : {}) }); return; }
  const box = host.querySelector('.sg-err');
  if (!box) { toast(msg, { kind: 'err' }); return; }
  box.hidden = false;
  box.innerHTML = `${icon('circle-alert', 'i-xs')}<span>${esc(msg)}</span>`;
  if (retry) { const b = _sgBtn('btn btn-ghost btn-sm', 'Try again'); b.onclick = () => { box.hidden = true; retry(); }; box.appendChild(b); }
}

/* ---------- receipts (after a ✓) ---------- */
function _sgReceiptState(card, surface) {
  return (st) => {
    if (st.state === 'error') {
      _sgReceipts.delete(card.key);
      _sgRepaintReceipt(card.key, true);
      _sgCardError(card, st.message || 'That did not work.', null, null);
      return;
    }
    if (st.state === 'undone') { _sgReceipts.delete(card.key); _sgRepaintReceipt(card.key, true); return; }
    let rec = _sgReceipts.get(card.key);
    if (!rec) { rec = { key: card.key, card, surface: surface || 'home', at: Date.now(), hold: false }; _sgReceipts.set(card.key, rec); }
    Object.assign(rec, st);
    _sgRepaintReceipt(card.key);
    if (st.state === 'saved' || st.state === 'warn') {
      _sgSay(`${String(rec.line || '').replace('–', ' to ')}. ${st.state === 'warn' ? (st.sub || '') : 'Undo available.'}`);
      _sgArmFold(rec);
    }
  };
}
function _sgSay(msg) { if (typeof homeAnnounce === 'function') homeAnnounce(msg); }
/** Repaint a receipt where it is on the page; when it is not there, the surface repaints. */
function _sgRepaintReceipt(key, gone) {
  const els = [...document.querySelectorAll(`[data-sg-key="${CSS.escape(key)}"]`)];
  const rec = _sgReceipts.get(key);
  if (!els.length || gone || !rec) { sgRefresh(); return; }
  for (const el of els) _sgPaintReceipt(el, rec);
}
function _sgArmFold(rec) {
  clearTimeout(rec.foldT);
  rec.foldT = setTimeout(() => {
    if (!_sgReceipts.has(rec.key)) return;
    if (rec.hold) { _sgArmFold(rec); return; }
    if (rec.state === 'saving') { _sgArmFold(rec); return; }
    _sgFold(rec);
  }, 10000);
}
function _sgFold(rec) {
  clearTimeout(rec.foldT);
  const els = [...document.querySelectorAll(`[data-sg-key="${CSS.escape(rec.key)}"].is-done`)];
  const done = () => { _sgReceipts.delete(rec.key); sgRefresh(); };
  const reduced = !window.Motion || (typeof Motion.prefersReduced === 'function' && Motion.prefersReduced());
  if (!els.length || reduced) { done(); return; }
  for (const el of els) { el.classList.add('is-folding'); }
  setTimeout(done, 260);
}
/** The receipt in place of the card: the result, Google's status, Undo, Open and (blocks) the chooser. */
function _sgPaintReceipt(el, rec) {
  el.classList.add('is-done');
  el.classList.toggle('is-saving', rec.state === 'saving');
  el.classList.toggle('is-warn', rec.state === 'warn');
  el.removeAttribute('aria-labelledby');
  el.setAttribute('aria-label', String(rec.line || 'Done'));
  const chip = rec.state === 'saving' ? `<span class="sg-rc-chip is-saving"><span class="spinner" aria-hidden="true"></span>${esc(rec.sub || 'Saving…')}</span>`
    : rec.state === 'warn' ? `<span class="sg-rc-chip is-warn">${icon('circle-alert', 'i-xs')}${esc(rec.sub || '')}</span>`
      : rec.sub ? `<span class="sg-rc-chip is-saved">${icon('cloud-check', 'i-xs')}${esc(rec.sub)}</span>` : '';
  el.innerHTML = `<div class="sg-ic sg-rc-ic" aria-hidden="true">${icon(rec.state === 'warn' ? 'circle-alert' : rec.state === 'saving' ? 'clock' : 'check')}</div>`
    + `<div class="sg-main"><div class="sg-tt sg-rc-line">${esc(rec.line || 'Done')}</div><div class="sg-rc-sub">${chip}</div><div class="sg-act sg-rc-act"></div></div>`;
  const act = el.querySelector('.sg-rc-act');
  if (rec.group && !rec.group.undone) {
    const u = _sgBtn('btn btn-secondary btn-sm sg-undo', icon('undo-2') + '<span>Undo</span>', 'Undo: ' + (rec.line || ''));
    u.onclick = async () => {
      if (u.disabled) return;
      u.disabled = true;
      const r = await rec.group.undo();
      _sgReceipts.delete(rec.key);
      if (r && r.ok) toast('Undone', { kind: 'ok', icon: 'undo-2' });
      sgRefresh();
    };
    act.appendChild(u);
  }
  if (rec.eventId && !/^tmp-/.test(rec.eventId) && typeof openEvent === 'function') {
    const op = _sgBtn('btn btn-ghost btn-sm', icon('external-link') + '<span>Open</span>', 'Open the event');
    op.onclick = () => openEvent(rec.eventId, { from: op });
    act.appendChild(op);
  }
  if (rec.state === 'warn' && typeof rec.retry === 'function') {
    const rt = _sgBtn('btn btn-ghost btn-sm', icon('refresh-cw') + '<span>Retry link</span>');
    rt.onclick = () => { rt.disabled = true; rec.retry(); };
    act.appendChild(rt);
  }
  if (rec.state === 'saved' && rec.eventId && Number.isFinite(rec.start) && rec.card && rec.card.quick && rec.card.quick.action.type === 'cal.block') el.querySelector('.sg-main').appendChild(_sgChooser(rec));
  if (!el._sgHoldBound) {
    el._sgHoldBound = true;
    const hold = (on) => () => { const r = _sgReceipts.get(el.dataset.sgKey); if (r) { r.hold = on; if (!on) _sgArmFold(r); } };
    el.addEventListener('pointerenter', hold(true)); el.addEventListener('pointerleave', hold(false));
    el.addEventListener('focusin', hold(true)); el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) hold(false)(); });
  }
}
/** After a block: change the task or the length (each change at once; the one Undo still removes everything). */
function _sgChooser(rec) {
  const box = document.createElement('div'); box.className = 'sg-choose';
  const a = (rec.card.quick.action.args) || {};
  const gapEnd = Number(a.gapEnd) || rec.end;
  const ctx = sgSnapshot();
  const cur = rec.taskId || null;
  const others = [];
  for (const id of ctx.focus || []) {
    if (others.length >= 2) break;
    if (id === cur) continue;
    const t = sgTask(ctx, id);
    if (t && !t.waiting && !t.snoozed && !t.notStarted) others.push(t);
  }
  const row1 = document.createElement('div'); row1.className = 'sg-choose-row'; row1.setAttribute('role', 'group'); row1.setAttribute('aria-label', 'Change the task');
  row1.innerHTML = '<span class="sg-choose-l">Task</span>';
  for (const t of others) {
    const c = _sgBtn('chip sg-chip', `<span>${esc(sgShort(t.title, 28))}</span>`, 'Use it for ' + t.title);
    c.onclick = () => _sgSwapTask(rec, t.id);
    row1.appendChild(c);
  }
  if (cur) { const c = _sgBtn('chip sg-chip', '<span>Just focus time</span>'); c.onclick = () => _sgSwapTask(rec, null); row1.appendChild(c); }
  const other = _sgBtn('chip sg-chip', '<span>Other…</span>', 'Pick another task');
  other.setAttribute('aria-haspopup', 'menu');
  other.onclick = () => {
    const pick = (ctx.tasks || []).filter(t => t.id !== cur && !t.waiting && (ctx.focus.includes(t.id) || t.planned === ctx.now.date || t.due === ctx.now.date)).slice(0, 8);
    openMenu(other, pick.length ? pick.map(t => ({ label: sgShort(t.title, 48), icon: 'circle', run: () => _sgSwapTask(rec, t.id) })) : [{ label: 'Nothing else is due or planned today', disabled: true }], { align: 'start', width: 300 });
  };
  row1.appendChild(other);
  const row2 = document.createElement('div'); row2.className = 'sg-choose-row'; row2.setAttribute('role', 'group'); row2.setAttribute('aria-label', 'Change the length');
  row2.innerHTML = '<span class="sg-choose-l">Length</span>';
  const lens = [[30, '30 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h']].filter(([m]) => rec.start + m <= gapEnd);
  if (gapEnd - rec.start > 0 && !lens.some(([m]) => rec.start + m === gapEnd)) lens.push([gapEnd - rec.start, 'Until ' + sgHM(gapEnd)]);
  for (const [m, label] of lens) {
    const on = rec.end - rec.start === m;
    const c = _sgBtn('chip sg-chip' + (on ? ' is-on' : ''), `<span>${esc(label)}</span>`, `Make it ${label}`);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
    c.onclick = () => { if (!on) _sgSetLength(rec, m); };
    row2.appendChild(c);
  }
  box.append(row1, row2);
  return box;
}
async function _sgSetLength(rec, mins) {
  const w = window.CalWrite;
  if (!w || !rec.eventId) return;
  const end = rec.start + mins;
  const r = await w.update(rec.eventId, { end: sgLocalISO(rec.date, end) }, { quiet: true, silent: true });
  if (r && r.ok) { rec.end = end; rec.line = String(rec.line || '').replace(/\d\d:\d\d–\d\d:\d\d/, `${sgHM(rec.start)}–${sgHM(end)}`); _sgRepaintReceipt(rec.key); _sgArmFold(rec); }
  else toast((r && r.message) || 'The length was not changed.', { kind: 'err' });
}
async function _sgSwapTask(rec, taskId) {
  const w = window.CalWrite;
  if (!w || !rec.eventId || !rec.group) return;
  const t = taskId && typeof getItem === 'function' ? getItem(taskId) : null;
  const title = sgBlockTitle(t ? { title: effTitle(t) } : null);
  const ctx = sgSnapshot();
  const desc = sgBlockDescription(t ? sgTask(ctx, t.id) || { title: effTitle(t) } : null);
  const r = await w.update(rec.eventId, { title, description: desc }, { quiet: true, silent: true });
  if (!r || !r.ok) { toast((r && r.message) || 'Not changed.', { kind: 'err' }); return; }
  // The old link and plan go back (its token); the new ones are a new batch with its own token.
  const old = rec.group.steps.filter(s => s.kind === 'ops');
  for (const s of old.reverse()) await sgUndoOps(s.token);
  rec.group.steps = rec.group.steps.filter(s => s.kind !== 'ops');
  const ops = [{ op: 'event.annotate', eventId: rec.eventId, origin: Object.assign({ kind: 'block', rule: (rec.card && rec.card.rule) || 'free-slot' }, t ? { taskId: t.id } : {}), ...(t ? { linkTasks: [t.id] } : {}) }];
  if (t) ops.push({ op: 'task.plan', id: t.id, date: rec.date });
  const j = await sgApplyOps(ops, { client: 'suggestions' });
  if (j.ok && j.undo) rec.group.push({ kind: 'ops', token: j.undo });
  rec.taskId = t ? t.id : null;
  rec.line = `Blocked ${sgHM(rec.start)}–${sgHM(rec.end)} · ${title}`;
  _sgRepaintReceipt(rec.key);
  _sgArmFold(rec);
}

/* ---------- "…", Not now, why ---------- */
function _sgToday2() { return typeof todayStr === 'function' ? todayStr() : sgSnapshot().now.date; }
function sgNotNow(card) {
  sgCountDismissed(card);
  sgMemWrite(m => sgMemDismiss(m, card.key, _sgToday2()), 'Hidden until tomorrow');
}
function _sgMore(anchor, card, surface) {
  const rule = sgRule(card.rule) || { cooldown: { notFor: 30 }, title: card.rule };
  const items = [];
  for (const m of card.menu || []) items.push({ label: m.label, icon: m.icon || 'arrow-right', run: () => _sgDo(card, m.action, { surface, from: anchor }) });
  if (items.length) items.push('sep');
  items.push({ label: 'Not now', icon: 'clock', hint: 'until tomorrow', run: () => sgNotNow(card) });
  if (card.entity) {
    const days = (rule.cooldown && rule.cooldown.notFor) || 30;
    items.push({ label: 'Not for this one', icon: 'eye-off', hint: `${days} days`, run: () => { sgCountDismissed(card); sgMemWrite(m => sgMemNotFor(m, card.entity, _sgToday2(), days), `Not for this one for ${days} days`); } });
  }
  items.push({ label: 'Fewer like this', icon: 'chevron-down', run: () => { sgCountDismissed(card); sgMemWrite(m => sgMemFewer(m, card.rule), 'You will see fewer like this'); } });
  items.push({ label: 'Stop these', icon: 'x', run: () => { sgCountDismissed(card); sgMemWrite(m => sgMemRule(m, card.rule, 'off', _sgToday2()), `"${rule.title}" is off. Settings > Suggestions turns it back on.`); } });
  items.push('sep');
  items.push({ label: 'Why am I seeing this?', icon: 'circle-help', run: () => setTimeout(() => sgWhyPopover(anchor, card), 0) });
  openMenu(anchor, items, { align: 'end', width: 250 });
}
/** "Why am I seeing this?": built only from the card. */
function sgWhyPopover(anchor, card) {
  const w = sgWhyText(card, sgCurrent().ctx);
  openPopover(anchor, (el, close) => {
    el.classList.add('sg-why');
    el.innerHTML = `<h4>Why am I seeing this?</h4><ul>${w.why.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
      + `<h5>What the button does</h5><p>${esc(w.does)}</p><div class="sg-why-f"><span>${esc(w.based)}</span></div>`;
    const off = _sgBtn('btn btn-ghost btn-sm', 'Turn these off');
    off.onclick = () => { close(); sgMemWrite(m => sgMemRule(m, card.rule, 'off', _sgToday2()), 'Turned off. Settings > Suggestions turns it back on.'); };
    el.querySelector('.sg-why-f').appendChild(off);
  }, { align: 'end', width: 340, role: 'dialog' });
}

/* ---------- shown counts: half the card on screen for a second ---------- */
function _sgObserve(el, card) {
  if (typeof IntersectionObserver !== 'function') return;
  if (!_sgIO) {
    _sgIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const t = e.target;
        if (!t.isConnected) { _sgIO.unobserve(t); clearTimeout(t._sgSeenT); continue; }
        clearTimeout(t._sgSeenT);
        if (e.intersectionRatio >= 0.5 && !document.hidden) {
          t._sgSeenT = setTimeout(() => { if (t.isConnected && t._sgCard) { sgCountShown(t._sgCard); _sgIO.unobserve(t); } }, 1000);
        }
      }
    }, { threshold: [0, 0.5] });
  }
  el._sgCard = { rule: card.rule, key: card.key };
  _sgIO.observe(el);
}

/* ---------- surface: the Today hero (one card, under the numbers) ---------- */
function sgHeroSlot(root) {
  if (!root || (state.suggest && state.suggest.off)) return null;
  const recs = [..._sgReceipts.values()].filter(r => r.surface === 'hero');
  let el = null;
  if (recs.length) { el = document.createElement('section'); el.className = 'sg-card sg-sz-chip'; el.dataset.sgKey = recs[0].key; _sgPaintReceipt(el, recs[0]); }
  else {
    const c = sgCards('hero')[0];
    if (!c) return null;
    el = sgCardEl(c, { surface: 'hero', size: 'chip' });
  }
  const box = document.createElement('div'); box.className = 'sg-hero'; box.setAttribute('aria-label', 'Suggestion');
  box.appendChild(el);
  root.appendChild(box);
  return box;
}

/* ---------- surface: the Suggestions widget ---------- */
function sgHomeWidgetRender(el, ctx) {
  const mem = sgMemNorm(state.suggest);
  const recs = [..._sgReceipts.values()].filter(r => r.surface === 'home');
  const cards = mem.off ? [] : sgCards('home').filter(c => !_sgReceipts.has(c.key));
  if (!recs.length && !cards.length && !ctx.editing) return false;
  const card = document.createElement('section');
  card.className = 'card home-card sgw';
  card.dataset.size = ctx.size;
  const n = recs.length + cards.length;
  card.innerHTML = `<div class="card-h sgw-h">${icon('lightbulb')}<h3>Suggestions</h3>${n ? `<span class="n">${n}</span>` : ''}<span class="spacer"></span></div><div class="card-b sgw-b"></div>`;
  const set = _sgBtn('btn-icon sgw-set', icon('settings'), 'Suggestion settings');
  set.setAttribute('data-tip', 'Settings');
  set.onclick = () => setView('settings:suggestions');
  card.querySelector('.sgw-h').appendChild(set);
  const body = card.querySelector('.sgw-b');
  const list = document.createElement('div'); list.className = 'sgw-list';
  for (const r of recs) { const x = document.createElement('section'); x.className = 'sg-card sg-sz-card'; x.dataset.sgKey = r.key; x.dataset.flip = 'sg:' + r.key; _sgPaintReceipt(x, r); list.appendChild(x); }
  for (const c of cards) list.appendChild(sgCardEl(c, { surface: 'home', size: ctx.size === 's' ? 'row' : 'card' }));
  if (!n) list.innerHTML = `<p class="sgw-empty">${mem.off ? 'Suggestions are off (Settings > Suggestions).' : 'Nothing to suggest right now. Ideas show here when they would help.'}</p>`;
  body.appendChild(list);
  // Fewer than "How many on Home": say how many and why, so a short list does not look broken.
  if (!mem.off && n < mem.homeMax && typeof sgHomeShortfall === 'function') {
    const cur = sgCurrent();
    const sf = sgHomeShortfall(cur.res, cur.assign, cur.ctx, mem.homeMax, _sgBriefKeys());
    if (sf.text && (n || sf.later || sf.laterEvening || sf.elsewhere || sf.hidden)) {
      const note = document.createElement('p'); note.className = 'sgw-why';
      note.textContent = n ? sf.text : sf.text.replace(/^0 suggestions right now (up to d+). /, '');
      body.appendChild(note);
    }
  }
  el.appendChild(card);
  if (typeof ctx.enterNew === 'function') ctx.enterNew(list.querySelectorAll('.sg-card[data-flip]'), (x) => x.dataset.flip);
  if (typeof animActivate === 'function') requestAnimationFrame(() => { if (card.isConnected) animActivate(card); });
  return true;
}

/** The cards the Brief widget's "Ideas" draw on this board (12-home-w-brief.js _bwIdeas: not Home's, not the hero's, at most 3). */
function _sgBriefKeys() {
  const lay = typeof homeLayout === 'function' ? homeLayout().widgets : [];
  const on = (id) => lay.some(w => w.id === id && !w.hidden);
  if (!on('brief')) return [];
  const skip = new Set(sgCards('home').map(c => c.key));
  if (on('today')) for (const c of sgCards('hero')) skip.add(c.key);
  return sgCards('brief').concat(sgCards('story-evening')).filter(c => !skip.has(c.key)).slice(0, 3).map(c => c.key);
}

/* ---------- surface: Today's schedule (S1 in place) ---------- */
/** The button(s) for one free gap: "Block 14:45–16:45" (the event card, prefilled) + ✓ (now, with Undo). */
function sgScheduleBlockHtml(g) {
  if (!g) return '';
  const can = sgCanBlock();
  if (!can.ok) {
    if (can.reason === 'stale') return `<button type="button" class="hs-block" data-sg-cal="refresh" aria-label="Update the calendar before blocking time">${icon('refresh-cw')}<span>Update calendar</span></button>`;
    if (can.reason === 'connect') return `<button type="button" class="hs-block" data-sg-cal="connect" aria-label="Connect Google Calendar to block time">${icon('plug')}<span>Connect calendar</span></button>`;
    return '';
  }
  const c = sgFreeSlotCard(sgSnapshot(), { start: g.start, end: g.end }, { surface: 'schedule' });
  if (!c) return `<span class="hs-block is-passed">That gap has passed</span>`;
  const spec = `${g.start}-${g.end}`;
  return `<span class="hs-blk"><button type="button" class="hs-block" data-block="${spec}" aria-label="${escAttr(c.primary.aria || c.primary.label)}" data-tip="Opens the event, ready to adjust">${icon('calendar-plus')}<span>${esc(c.primary.label)}</span></button>`
    + (c.quick ? `<button type="button" class="hs-block hs-block-ok" data-block-now="${spec}" aria-label="${escAttr(c.quick.aria)}" data-tip="Add it now · Undo">${icon('check')}</button>` : '') + '</span>';
}
/** The banner's words: "Free from 14:45 to 18:00. Block 2 h for Report draft?" / "3 h 15 min clear. Block 2 h for …?" */
function sgScheduleBannerText(g, kind) {
  const c = g ? sgFreeSlotCard(sgSnapshot(), { start: g.start, end: g.end }, { surface: 'schedule' }) : null;
  if (!c) return '';
  const len = Math.min(g.end - Math.max(g.start, Math.ceil(homeNowMin() / 5) * 5), SG_BLOCK_MAX);
  const t = c.primary.action.type === 'cal.blockOpen' ? c.primary.action.args.taskId : null;
  const what = t ? sgShort(_sgTaskTitle(t), 48) : 'focus';
  const offer = `Block ${sgDur(len)} for ${what}?`;
  return kind === 'empty' ? `Free from ${sgHM(g.start)} to ${sgHM(g.end)}. ${offer}` : `${sgDur(g.end - g.start)} clear. ${offer}`;
}
/** A press on a gap's button: the event card prefilled (quick = false) or the block at once (quick = true). */
function sgScheduleBlock(spec, btn, quick) {
  const [a, b] = String(spec).split('-').map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return;
  const c = sgFreeSlotCard(sgSnapshot({ fresh: true }), { start: a, end: b }, { surface: 'schedule' });
  if (!c) { toast('That gap has passed.', { icon: 'clock' }); if (typeof homeRerenderWidget === 'function') homeRerenderWidget('schedule'); return; }
  const act = quick && c.quick ? c.quick : c.primary;
  _sgDo(c, act.action, { surface: 'schedule', from: btn, el: btn && btn.closest('.hs') });
}
/** The calendar buttons a gap shows when blocking is not possible yet. */
function sgScheduleCal(kind) {
  if (kind === 'refresh') { if (typeof CalStore !== 'undefined') CalStore.update({ force: true }); return; }
  if (window.Connections && typeof Connections.open === 'function') Connections.open('calendar'); else setView('connections');
}
/** Receipts of blocks made from the schedule, at the top of the widget (they survive its repaints). */
function sgScheduleReceipts(body) {
  const recs = [..._sgReceipts.values()].filter(r => r.surface === 'schedule');
  if (!recs.length || !body) return null;
  const box = document.createElement('div'); box.className = 'hs-receipt'; box.setAttribute('aria-live', 'polite');
  for (const r of recs) { const x = document.createElement('section'); x.className = 'sg-card sg-sz-row'; x.dataset.sgKey = r.key; x.dataset.flip = 'sg:' + r.key; _sgPaintReceipt(x, r); box.appendChild(x); }
  body.prepend(box);
  return box;
}
/**
 * The same for any widget that runs cards on its own surface (sgCardEl(card, {surface: id})):
 * once a ✓ has filled a gap, the card is gone from the widget's model, so the receipt
 * (Undo, Open, the chooser) is drawn at the top of `body` until it folds. Call it in render().
 */
function sgSurfaceReceipts(body, surface) {
  const recs = [..._sgReceipts.values()].filter(r => r.surface === surface);
  if (!recs.length || !body || !surface) return null;
  const box = document.createElement('div'); box.className = 'sg-receipts'; box.setAttribute('aria-live', 'polite');
  for (const r of recs) { const x = document.createElement('section'); x.className = 'sg-card sg-sz-row'; x.dataset.sgKey = r.key; x.dataset.flip = 'sg:' + r.key; _sgPaintReceipt(x, r); box.appendChild(x); }
  body.prepend(box);
  return box;
}

/* ---------- the event card in create mode: which task the block is for ---------- */
function sgEvcLinkRow(d, repaint) {
  if (!d || !d.link || !d.link.taskId) return null;
  const t = typeof getItem === 'function' ? getItem(d.link.taskId) : null;
  if (!t) return null;
  const box = document.createElement('div'); box.className = 'sg-evlink';
  box.innerHTML = `<div class="ev-sec">For the task</div><div class="chips"><span class="chip chip-lg sg-evlink-t">${typeof streamMarkHtml === 'function' ? streamMarkHtml(effStream(t)) : ''}<span class="truncate"></span></span></div>`
    + '<p class="evc-note">Save links the task to this event and plans it for that day.</p>';
  box.querySelector('.sg-evlink-t .truncate').textContent = String(effTitle(t) || '');
  const x = _sgBtn('x', icon('x', 'i-xs'), 'Do not link a task');
  // Words the suggestion wrote go with the task; words the user changed stay.
  x.onclick = () => {
    if (d.title === sgBlockTitle({ title: effTitle(t) })) d.title = 'Focus time';
    if (/^Focus block from your dashboard\.\nTask: /.test(d.description || '')) d.description = '';
    d.link.taskId = '';
    repaint();
  };
  box.querySelector('.sg-evlink-t').appendChild(x);
  return box;
}

/* ---------- widgets that host one suggestion (W0-A's homeSuggestSlot) ---------- */
if (typeof registerHomeSuggestProvider === 'function') {
  registerHomeSuggestProvider(({ wid, size }) => {
    if (state.suggest && state.suggest.off) return null;
    const c = sgForWidget(wid);
    if (c) return sgCardEl(c, { surface: 'widget:' + wid, size: size === 'm' ? 'row' : 'card' });
    // The card is gone once its ✓ did the thing (a prep block filled the half hour): keep its receipt (Undo) until it folds.
    const rec = [..._sgReceipts.values()].find(r => r.surface === 'widget:' + wid);
    if (!rec) return null;
    const x = document.createElement('section'); x.className = 'sg-card sg-sz-row'; x.dataset.sgKey = rec.key; x.dataset.flip = 'sg:' + rec.key;
    _sgPaintReceipt(x, rec);
    return x;
  });
}

/* ---------- Settings > Suggestions ---------- */
registerSettingsGroup({
  id: 'suggestions', title: 'Suggestions', icon: 'lightbulb', order: 45,
  description: 'Ideas that do the thing when you click them: the button opens the normal editor filled in, for you to adjust and save; the small ✓ does it at once, with Undo. Nothing is ever sent, paid or deleted.',
  render(el) {
    const mem = sgMemNorm(state.suggest);
    const today = _sgToday2();
    const save = (fn, msg) => { sgMemWrite(fn, null); if (msg) toast(msg, { kind: 'ok' }); render(); };
    el.appendChild(_settingsRow('Show suggestions', 'On Home, in the Today hero, the morning story and Today’s schedule.', _settingsSwitch(!mem.off, 'Show suggestions', (on) => save(m => sgMemSetOff(m, !on), on ? 'Suggestions on' : 'Suggestions off'))));
    let nowHint = '';
    try {   // how many qualify right now, and why fewer (so the count does not look ignored)
      const cur = sgCurrent();
      const sf = !mem.off && typeof sgHomeShortfall === 'function' ? sgHomeShortfall(cur.res, cur.assign, cur.ctx, mem.homeMax, _sgBriefKeys()) : null;
      if (sf && sf.text) nowHint = ' ' + sf.text;
    } catch (e) { /* the hint is optional */ }
    el.appendChild(_settingsRow('How many on Home', 'The Suggestions card shows at most this many at a time.' + nowHint,
      _settingsSelect([['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']], String(mem.homeMax), (v) => save(m => sgMemSetHomeMax(m, Number(v))))));
    const wk = sgWork(sgWorkHoursRaw());
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = wk.days.join(',') === '1,2,3,4,5' ? 'Mon–Fri' : wk.days.map(d => names[d]).join(', ');
    const wh = document.createElement('button'); wh.type = 'button'; wh.className = 'btn btn-ghost btn-sm';
    wh.innerHTML = `<span>${esc(`${days} ${sgHM(wk.start)}–${sgHM(wk.end)}`)}</span>` + icon('arrow-right');
    wh.onclick = () => setView('settings:profile');
    el.appendChild(_settingsRow('Working hours', 'Time suggestions on Home and in the stories stay inside these. Today’s schedule always offers its buttons.', wh));
    for (const area of SG_AREAS) {
      const rules = sgRules().filter(r => r.area === area);
      if (!rules.length) continue;
      const h = document.createElement('div'); h.className = 'set-sub sg-set-h'; h.textContent = SG_AREA_LABEL[area] || area;
      el.appendChild(h);
      for (const r of rules) {
        const s = mem.rules[r.id];
        const on = s && s.off ? false : s && s.on ? true : s && s.until && s.until >= today ? false : r.defaultOn !== false;
        const hint = (r.description || '') + (r.description ? ' ' : '') + _sgSafetyHint(r);
        el.appendChild(_settingsRow(r.title, hint, _settingsSwitch(on, r.title, (v) => save(m => sgMemRule(m, r.id, v ? (r.defaultOn === false ? 'force-on' : 'on') : 'off', today)), mem.off)));
      }
    }
    const nMuted = sgMemCount(mem, today);
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'btn btn-secondary btn-sm';
    reset.innerHTML = icon('rotate-ccw') + '<span>Reset</span>'; reset.disabled = !nMuted && !Object.keys(mem.fewer).length;
    reset.onclick = () => save(m => sgMemReset(m), 'Hidden suggestions can show again');
    el.appendChild(_settingsRow(`Muted and dismissed: ${nMuted}`, '“Not now”, “Not for this one” and “Fewer like this” so far.', reset));
    const st = sgStatsNorm(state.suggestStats);
    const rows = sgRules().map(r => [r, st.rules[r.id] || {}]).filter(([, s]) => s.shown || s.acted || s.dismissed);
    const counts = document.createElement('div'); counts.className = 'sg-counts';
    counts.innerHTML = rows.length
      ? `<table class="table"><thead><tr><th>Suggestion</th><th class="num">Shown</th><th class="num">Used</th><th class="num">Dismissed</th></tr></thead><tbody>${rows.map(([r, s]) => `<tr><td>${esc(r.title)}</td><td class="num">${Number(s.shown) || 0}</td><td class="num">${Number(s.acted) || 0}</td><td class="num">${Number(s.dismissed) || 0}</td></tr>`).join('')}</tbody></table>`
      : '<p class="muted">Nothing counted yet.</p>';
    const rc = document.createElement('button'); rc.type = 'button'; rc.className = 'btn btn-ghost btn-sm'; rc.textContent = 'Reset counts';
    rc.onclick = () => { state.suggestStats = sgStatsReset(); saveUI(); render(); };
    const wrap = document.createElement('div'); wrap.className = 'vstack'; wrap.append(counts, rc);
    el.appendChild(_settingsRow('Counts', 'Kept on this computer only; they help rank suggestions you use above ones you skip.', wrap));
  },
});
/** One line on what its buttons do (a rule may say it itself: `safetyHint`). */
function _sgSafetyHint(r) {
  if (r.safetyHint) return String(r.safetyHint);
  return r.area === 'people' ? 'Opens a draft for you to check; nothing is sent.' : 'The button opens it ready to adjust; nothing changes until you save.';
}
