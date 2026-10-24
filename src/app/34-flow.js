/* ============================================================
   ONE TASK AT A TIME (owner: Review, v2.16): the card deck the weekly review
   (34-review-flow.js) and the clean-up (34-cleanup.js) run in.
   rfDeckOpen(o) opens a dialog with one card per task. A single key decides it
   and the change is made at once (one undo step each); the next card slides in.
     keys  K keep  T tomorrow  W next week  D waiting on…  S someday  C done
           X drop (won't do)  B bin  N nudge  R back on my list  E edit
           U / Backspace / Ctrl+Z undo the last decision   Left back   Space skip
           Esc close (the caller keeps the progress, so opening it again resumes)
   o = { title, overline, reason ('Weekly review': kept with moved dates),
         stages: [{id, label, icon, hint, ids: [taskId], keys: [kind], labels: {kind: 'Keep in someday'}, why(i) -> 'line under the stage'}],
         onDecide(id, kind, stageId), onUndo(id, kind), finish(el, ctx), onClose(ctx) }
   ctx (finish / onClose) = { counts: {kind: n}, decided: n, skipped: n, minutes, close(), enter(fn) }
   ============================================================ */
const RF_KINDS = {
  keep:      { key: 'k', label: 'Keep', icon: 'check', verb: 'kept', tone: '' },
  tomorrow:  { key: 't', label: 'Tomorrow', icon: 'sunrise', verb: 'to tomorrow', tone: 'accent' },
  nextweek:  { key: 'w', label: 'Next week', icon: 'calendar-range', verb: 'to next week', tone: 'accent' },
  wait:      { key: 'd', label: 'Waiting on…', icon: 'hourglass', verb: 'waiting on someone', tone: 'warn' },
  someday:   { key: 's', label: 'Someday', icon: 'cloud', verb: 'parked for someday', tone: 'sky' },
  done:      { key: 'c', label: 'Done', icon: 'circle-check', verb: 'done', tone: 'ok' },
  drop:      { key: 'x', label: 'Drop', icon: 'circle-x', verb: 'dropped', tone: 'danger' },
  bin:       { key: 'b', label: 'Bin', icon: 'trash-2', verb: 'binned', tone: 'danger' },
  nudge:     { key: 'n', label: 'Nudge', icon: 'bell', verb: 'nudged', tone: 'warn' },
  unwait:    { key: 'r', label: 'Back on my list', icon: 'rotate-ccw', verb: 'back on your list', tone: 'accent' },
  edit:      { key: 'e', label: 'Edit', icon: 'pencil', verb: '', tone: '' },
};
const _rfDeck = { o: null, q: [], at: 0, hist: [], counts: {}, skipped: 0, root: null, close: null, editing: false, startedAt: 0, enter: null, endKeys: {}, dir: 'next', ended: false };

function rfDeckOpen(o) {
  if (_rfDeck.close) _rfDeck.close();
  const q = [];
  const seen = new Set();
  for (const st of o.stages) for (const id of (st.ids || [])) if (!seen.has(id) && getItem(id)) { seen.add(id); q.push({ id, stage: st.id, dec: null }); }
  Object.assign(_rfDeck, { o, q, at: 0, hist: [], counts: {}, skipped: 0, editing: false, startedAt: Date.now(), enter: null, endKeys: {}, dir: 'next', ended: false });
  const onKey = (e) => _rfDeckKey(e);
  window.addEventListener('keydown', onKey, true);
  // A fixed size (UI_CLEANUP_PLAN.md 1.3): the card area scrolls, so the rail, the action keys and
  // the back / skip controls stay exactly where they are from one card to the next.
  _rfDeck.close = openDialog({
    title: o.title || 'Review', size: 'lg', fixed: true, className: 'rf-deck', resizable: false, resizeKey: 'rf-deck',
    body: (b) => { _rfDeck.root = b; b.classList.add('rf-deck-b'); b.tabIndex = -1; _rfDeckSkipDone(); _rfDeckPaint(); setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (e) {} }, 10); },
    onClose: () => {
      window.removeEventListener('keydown', onKey, true);
      const ctx = _rfDeckCtx();
      _rfDeck.close = null; _rfDeck.root = null;
      const oo = _rfDeck.o; _rfDeck.o = null;
      if (oo && oo.onClose) try { oo.onClose(ctx); } catch (err) { console.error('[review] close', err); }
    },
  });
}
function rfDeckIsOpen() { return !!_rfDeck.o; }
function _rfDeckCtx() {
  const decided = _rfDeck.hist.length;
  return { counts: Object.assign({}, _rfDeck.counts), decided, skipped: _rfDeck.skipped, total: _rfDeck.q.length, minutes: Math.max(1, Math.round((Date.now() - _rfDeck.startedAt) / 60000)), close: () => _rfDeck.close && _rfDeck.close(), enter: (fn) => { _rfDeck.enter = fn; }, key: (k, fn) => { _rfDeck.endKeys[k] = fn; } };
}
function _rfStage(id) { return (_rfDeck.o.stages || []).find(s => s.id === id) || {}; }
/** Skip cards whose task is gone or already closed (done elsewhere, binned, synced in). */
function _rfDeckSkipDone() {
  const q = _rfDeck.q;
  while (_rfDeck.at < q.length) {
    const i = getItem(q[_rfDeck.at].id);
    if (i && (rfIsOpen(i) || q[_rfDeck.at].dec)) break;
    _rfDeck.at++;
  }
}

function _rfDeckPaint() {
  const root = _rfDeck.root; if (!root) return;
  const o = _rfDeck.o, q = _rfDeck.q;
  root.innerHTML = '';
  // Three rows: the rail and progress (top), the card (the middle, which scrolls), the keys and footer (pinned).
  const top = document.createElement('div'); top.className = 'rf-deck-top';
  const b = document.createElement('div'); b.className = 'rf-deck-mid';
  const bot = document.createElement('div'); bot.className = 'rf-deck-bot';
  root.append(top, b, bot);
  const atEnd = _rfDeck.at >= q.length;
  // Stage rail: each stage with how many it holds; the current one selected.
  const rail = document.createElement('div'); rail.className = 'rf-rail'; rail.setAttribute('role', 'list');
  const curStage = atEnd ? '__end' : q[_rfDeck.at].stage;
  let passed = true;
  for (const st of o.stages) {
    const n = q.filter(x => x.stage === st.id).length;
    const on = st.id === curStage;
    if (on) passed = false;
    const d = q.filter(x => x.stage === st.id && x.dec).length;
    const pill = document.createElement('span'); pill.className = 'rf-pill' + (on ? ' on' : '') + (passed || (n && d === n) ? ' done' : '') + (n ? '' : ' empty');
    pill.setAttribute('role', 'listitem');
    if (on) pill.setAttribute('aria-current', 'step');
    pill.innerHTML = `${icon(passed && !on ? 'check' : (st.icon || 'circle'), 'i-xs')}<span>${esc(st.label)}</span><b class="num">${esc(n)}</b>`;
    rail.appendChild(pill);
  }
  const fin = document.createElement('span'); fin.className = 'rf-pill' + (atEnd ? ' on' : '');
  fin.innerHTML = `${icon('party-popper', 'i-xs')}<span>${esc(o.finishLabel || 'Summary')}</span>`;
  rail.appendChild(fin);
  top.appendChild(rail);
  const prog = document.createElement('div'); prog.className = 'rf-prog';
  const doneN = Math.min(q.length, _rfDeck.at);
  const left = q.length - doneN;
  prog.innerHTML = `<span class="rf-prog-bar"><i style="--pct:${q.length ? Math.round(doneN / q.length * 100) : 100}%"></i></span><span class="rf-prog-t num">${atEnd ? `${q.length} of ${q.length}` : `${doneN + 1} of ${q.length}`}${!atEnd && left > 1 ? ` · about ${Math.max(1, Math.round(left * 15 / 60))} min left` : ''}</span>`;
  top.appendChild(prog);
  if (atEnd) { bot.remove(); _rfDeckFinish(b); return; }
  _rfDeck.enter = null; _rfDeck.endKeys = {};
  const cur = q[_rfDeck.at];
  const i = getItem(cur.id);
  const st = _rfStage(cur.stage);
  b.appendChild(_rfCard(i, st, cur));
  // The keys for this stage.
  const acts = document.createElement('div'); acts.className = 'rf-acts';
  for (const kind of (st.keys || ['keep', 'tomorrow', 'nextweek', 'wait', 'someday', 'drop', 'edit'])) {
    const k = RF_KINDS[kind]; if (!k) continue;
    const label = (st.labels && st.labels[kind]) || k.label;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rf-act' + (k.tone ? ' t-' + k.tone : '') + (cur.dec === kind ? ' was' : '');
    btn.dataset.kind = kind;
    btn.innerHTML = `<kbd class="kbd">${esc(k.key.toUpperCase())}</kbd>${icon(k.icon, 'i-sm')}<span>${esc(label)}</span>`;
    btn.title = `${label} (${k.key.toUpperCase()})`;
    btn.onclick = () => _rfDecide(kind, btn);
    acts.appendChild(btn);
  }
  bot.appendChild(acts);
  const foot = document.createElement('div'); foot.className = 'rf-foot';
  foot.innerHTML = `<span><kbd class="kbd">←</kbd> back</span><span><kbd class="kbd">Space</kbd> skip</span><span><kbd class="kbd">U</kbd> undo</span><span class="spacer"></span><span><kbd class="kbd">Esc</kbd> close · your progress is kept</span>`;
  const nav = document.createElement('span'); nav.className = 'rf-foot-nav';
  const back = uiButton({ icon: 'arrow-left', iconCls: 'i-sm', size: 'sm', aria: 'Back', disabled: _rfDeck.at === 0, run: () => _rfDeckBack() });
  const skip = uiButton({ icon: 'arrow-right', iconCls: 'i-sm', size: 'sm', aria: 'Skip', run: () => _rfDeckSkip() });
  const un = uiButton({ icon: 'undo-2', iconCls: 'i-sm', size: 'sm', aria: 'Undo the last decision', disabled: !_rfDeck.hist.length, run: () => _rfDeckUndo() });
  nav.append(back, skip, un);
  foot.prepend(nav);
  bot.appendChild(foot);
  if (typeof animActivate === 'function') try { animActivate(root); } catch (e) { /* scenes are a bonus */ }
}

function _rfCard(i, st, cur) {
  const card = document.createElement('article'); card.className = 'rf-card rf-in-' + _rfDeck.dir; card.dataset.id = i.id;
  const type = typeof animForTask === 'function' ? animForTask(i).type : '';
  const art = type && typeof animSceneHtml === 'function' ? animSceneHtml(type, { size: 'hero', once: true }) : '';
  const d = effDate(i), n = d ? daysUntil(d) : null;
  const pr = effPriority(i);
  const ppl = (typeof effPeople === 'function' ? effPeople(i) : []).map(getPerson).filter(p => p && !p.self);
  const subs = effSubtasks(i);
  const why = st.why ? st.why(i) : '';
  const touched = rfLastTouch(i);
  const created = rfCreatedMs(i);
  const ago = (ms) => { const dd = Math.max(0, Math.round((Date.now() - Number(new Date(ms))) / 864e5)); return dd < 1 ? 'today' : dd < 2 ? 'yesterday' : dd < 14 ? `${dd} days ago` : dd < 60 ? `${Math.round(dd / 7)} weeks ago` : `${Math.round(dd / 30)} months ago`; };
  const meta = [
    `<span class="rf-m">${typeof streamMarkHtml === 'function' ? streamMarkHtml(effStream(i)) : ''}<span>${esc((STREAMS[effStream(i)] || {}).label || effStream(i) || 'No stream')}</span></span>`,
    d ? `<span class="rf-m${n < 0 ? ' late' : n === 0 ? ' today' : ''}">${icon(n < 0 ? 'circle-alert' : 'calendar', 'i-xs')}<span>${esc(n < 0 ? `${-n} d overdue` : dueLabel(d))}</span></span>` : '',
    i.plannedFor ? `<span class="rf-m">${icon('sun', 'i-xs')}<span>planned ${esc(dueLabel(i.plannedFor))}</span></span>` : '',
    pr !== 'p0' ? `<span class="rf-m pr-${esc(pr)}">${icon('flag', 'i-xs')}<span>${esc({ p1: 'High', p2: 'Medium', p3: 'Low' }[pr] || pr)}</span></span>` : '',
    i.estimate && typeof fmtEstimate === 'function' ? `<span class="rf-m">${icon('timer', 'i-xs')}<span>${esc(fmtEstimate(i.estimate))}</span></span>` : '',
    subs.length ? `<span class="rf-m">${icon('list-checks', 'i-xs')}<span>${subs.filter(s => s.done).length}/${subs.length}</span></span>` : '',
    rfIsWaiting(i) ? `<span class="rf-m warn">${icon('hourglass', 'i-xs')}<span>${esc((rfWaitPerson(i) || {}).name || 'Someone')} · ${esc(rfDaysSince(rfWaitSince(i)) || 0)} d</span></span>` : '',
    rfIsBlocked(i) ? `<span class="rf-m">${icon('lock', 'i-xs')}<span>after ${esc(String(effTitle(rfBlockers(i)[0])).slice(0, 40))}</span></span>` : '',
    ppl.length ? `<span class="rf-m rf-ppl">${ppl.slice(0, 4).map(p => homeAvatar(p, 18)).join('')}<span>${esc(ppl.slice(0, 2).map(p => typeof hglFirst === 'function' ? hglFirst(p) : p.name).join(', '))}${ppl.length > 2 ? ` +${ppl.length - 2}` : ''}</span></span>` : '',
  ].filter(Boolean).join('');
  const detail = typeof homePlainText === 'function' ? homePlainText(effDetail(i), 240) : String(effDetail(i) || '').slice(0, 240);
  const dec = cur.dec ? RF_KINDS[cur.dec] : null;
  card.innerHTML = `<div class="rf-card-art" aria-hidden="true">${art}</div>`
    + `<div class="rf-card-b"><div class="rf-card-stage">${icon(st.icon || 'circle', 'i-xs')}<span>${esc(st.label || '')}</span>${why ? `<span class="rf-why">· ${esc(why)}</span>` : ''}</div>`
    + `<h2 class="rf-card-t"></h2><div class="rf-card-meta">${meta}</div>${detail ? `<p class="rf-card-d">${esc(detail)}</p>` : ''}`
    + `<div class="rf-card-age">${created ? `Added ${esc(ago(created))}` : ''}${touched && touched !== created ? ` · last touched ${esc(ago(touched))}` : ''}</div>`
    + `${dec ? `<div class="rf-card-dec">${icon(dec.icon, 'i-xs')}<span>You chose: ${esc(dec.label)}. Pick again to change it.</span></div>` : ''}</div>`;
  card.querySelector('.rf-card-t').textContent = effTitle(i);
  return card;
}

function _rfDecide(kind, btn) {
  if (!_rfDeck.o || _rfDeck.at >= _rfDeck.q.length) return;
  const cur = _rfDeck.q[_rfDeck.at];
  const id = cur.id;
  if (!getItem(id)) { _rfDeckSkip(); return; }
  const st = _rfStage(cur.stage);
  if (!(st.keys || []).includes(kind) && st.keys) return;
  if (kind === 'edit') { _rfEdit(); return; }
  const reason = _rfDeck.o.reason || 'Review';
  if (kind === 'wait') {
    const anchor = btn || (_rfDeck.root && _rfDeck.root.querySelector('[data-kind="wait"]'));
    rfPickPerson(anchor, { taskId: id, title: 'Waiting on…', onPick: (pid) => _rfApply(kind, rfDo('wait', id, { person: pid })) });
    return;
  }
  if (kind === 'nudge') { _rfApply(kind, rfNudge(id)); return; }
  const op = { keep: 'keep', tomorrow: 'tomorrow', nextweek: 'nextweek', someday: 'someday', done: 'done', drop: 'drop', bin: 'bin', unwait: 'unwait' }[kind];
  if (!op) return;
  if (kind === 'done') { const row = _rfDeck.root && _rfDeck.root.querySelector('.rf-card'); if (row && typeof animBurst === 'function') try { animBurst(row, 'celebration'); } catch (e) {} }
  _rfApply(kind, rfDo(op, id, { reason, text: `${reason}: kept` }));
}
function _rfApply(kind, mark) {
  const cur = _rfDeck.q[_rfDeck.at];
  if (!cur || !_rfDeck.o) return;
  _rfDeck.hist.push({ at: _rfDeck.at, id: cur.id, kind, mark, prev: cur.dec });
  if (cur.dec) _rfDeck.counts[cur.dec] = Math.max(0, (_rfDeck.counts[cur.dec] || 1) - 1);
  _rfDeck.counts[kind] = (_rfDeck.counts[kind] || 0) + 1;
  cur.dec = kind;
  if (_rfDeck.o.onDecide) try { _rfDeck.o.onDecide(cur.id, kind, cur.stage); } catch (e) { console.error('[review] decide', e); }
  _rfDeck.at++; _rfDeck.dir = 'next';
  _rfDeckSkipDone();
  _rfDeckPaint();
}
function _rfDeckSkip() { if (_rfDeck.at < _rfDeck.q.length) { if (!_rfDeck.q[_rfDeck.at].dec) _rfDeck.skipped++; _rfDeck.at++; _rfDeck.dir = 'next'; _rfDeckSkipDone(); _rfDeckPaint(); } }
function _rfDeckBack() { if (_rfDeck.at > 0) { _rfDeck.at--; _rfDeck.dir = 'back'; _rfDeckPaint(); } }
function _rfDeckUndo() {
  const h = _rfDeck.hist.pop();
  if (!h) { toast('Nothing to undo in this review yet', { icon: 'undo-2' }); return; }
  if (h.mark) undoMarked(h.mark);
  const cur = _rfDeck.q[h.at];
  if (cur) {
    _rfDeck.counts[h.kind] = Math.max(0, (_rfDeck.counts[h.kind] || 1) - 1);
    if (h.prev) _rfDeck.counts[h.prev] = (_rfDeck.counts[h.prev] || 0) + 1;
    cur.dec = h.prev || null;
  }
  if (_rfDeck.o && _rfDeck.o.onUndo) try { _rfDeck.o.onUndo(h.id, h.kind, h.prev); } catch (e) { console.error('[review] undo', e); }
  _rfDeck.at = h.at; _rfDeck.dir = 'back';
  _rfDeckPaint();
}

/* E: rename in place, pick a deadline or a plan day, or open the whole task (the review waits). */
function _rfEdit() {
  const card = _rfDeck.root && _rfDeck.root.querySelector('.rf-card');
  const cur = _rfDeck.q[_rfDeck.at];
  const i = cur && getItem(cur.id);
  if (!card || !i || _rfDeck.editing) return;
  _rfDeck.editing = true;
  const h = card.querySelector('.rf-card-t');
  const inp = document.createElement('input'); inp.className = 'control rf-card-in'; inp.value = effTitle(i); inp.maxLength = 500; inp.setAttribute('aria-label', 'Title');
  h.replaceWith(inp);
  const row = document.createElement('div'); row.className = 'rf-edit-row';
  const mk = (label, ic, run) => uiButton({ label, icon: ic, iconCls: 'i-sm', size: 'sm', run: (e, b) => run(b) });
  const stop = () => { _rfDeck.editing = false; _rfDeckPaint(); };
  row.append(
    mk('Deadline…', 'calendar', (b) => openDueDatePopover(b, { value: effDate(i), allowClear: true, title: 'Deadline', onPick: (d) => { setDateWithReason(i.id, d || null, _rfDeck.o ? _rfDeck.o.reason : 'Review'); _rfDeck.hist.push({ at: _rfDeck.at, id: i.id, kind: 'edit', mark: undoMark(), prev: cur.dec }); stop(); } })),
    mk('Plan for…', 'sun', (b) => openDueDatePopover(b, { value: i.plannedFor || null, allowClear: true, title: 'Plan for', onPick: (d) => { const m = rfDo('plan', i.id, { date: d || null }); if (m) _rfDeck.hist.push({ at: _rfDeck.at, id: i.id, kind: 'edit', mark: m, prev: cur.dec }); stop(); } })),
    mk('Priority', 'flag', (b) => openPriorityMenu(b, i.id)),
    mk('Open the whole task', 'maximize-2', () => { const id = i.id; _rfDeck.editing = false; if (_rfDeck.close) _rfDeck.close(); if (typeof openTask === 'function') openTask(id); }),
  );
  const hint = document.createElement('span'); hint.className = 'muted rf-edit-hint'; hint.innerHTML = '<kbd class="kbd">Enter</kbd> save · <kbd class="kbd">Esc</kbd> cancel';
  row.appendChild(hint);
  inp.after(row);
  inp.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      const t = inp.value.trim();
      if (t && t !== effTitle(i)) { const m = rfDo('rename', i.id, { title: t }); if (m) _rfDeck.hist.push({ at: _rfDeck.at, id: i.id, kind: 'edit', mark: m, prev: cur.dec }); }
      stop();
    }
  };
  setTimeout(() => { inp.focus(); inp.select(); }, 0);
}

function _rfDeckFinish(b) {
  const box = document.createElement('div'); box.className = 'rf-end';
  b.appendChild(box);
  const ctx = _rfDeckCtx();
  if (_rfDeck.o.finish) { try { _rfDeck.o.finish(box, ctx); } catch (e) { console.error('[review] finish', e); box.textContent = 'All done.'; } }
  else box.innerHTML = `<h2>All done</h2>`;
  if (!_rfDeck.ended) { _rfDeck.ended = true; const art = box.querySelector('.rf-end-hero'); if (art && typeof animBurst === 'function') try { animBurst(art, 'celebration'); } catch (e) {} }
}
/** Summary tiles for ctx.counts: "5 kept · 3 to tomorrow …". */
function rfCountsHtml(counts) {
  const order = ['keep', 'tomorrow', 'nextweek', 'wait', 'someday', 'done', 'drop', 'bin', 'nudge', 'unwait'];
  const tiles = order.filter(k => counts[k]).map(k => `<div class="rf-tile t-${esc(RF_KINDS[k].tone || 'plain')}">${icon(RF_KINDS[k].icon, 'i-sm')}<b class="num">${esc(counts[k])}</b><span>${esc(RF_KINDS[k].verb)}</span></div>`);
  return tiles.length ? `<div class="rf-tiles">${tiles.join('')}</div>` : '';
}

function _rfDeckKey(e) {
  if (!_rfDeck.o) return;
  const stopIt = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  const popOpen = [...document.querySelectorAll('.pop')].some(n => n.getClientRects().length > 0);
  if (popOpen) { if (e.key === 'Escape') { stopIt(); closePopovers(); } return; }
  const t = e.target;
  const typing = t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable);
  if (typing) { if (e.key === 'Escape' && _rfDeck.editing) { stopIt(); _rfDeck.editing = false; _rfDeckPaint(); } return; }
  if (e.key === 'Escape' || e.key === 'Tab') return;           // the dialog closes; Tab moves focus
  // A centre task card (opened from Edit) owns the keyboard while it is open.
  if ([...document.querySelectorAll('.tc')].some(n => n.getClientRects().length > 0)) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { stopIt(); _rfDeckUndo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const atEnd = _rfDeck.at >= _rfDeck.q.length;
  if (k === 'Enter') { if (atEnd && _rfDeck.enter) { stopIt(); _rfDeck.enter(); } else if (t && t.tagName === 'BUTTON' && t.closest('.rf-deck-b')) return; else stopIt(); return; }
  if (k === 'u' || k === 'Backspace') { stopIt(); _rfDeckUndo(); return; }
  if (k === 'ArrowLeft') { stopIt(); _rfDeckBack(); return; }
  if (k === 'ArrowRight' || k === ' ') { if (k === ' ' && t && t.tagName === 'BUTTON') return; stopIt(); _rfDeckSkip(); return; }
  if (atEnd) { if (_rfDeck.endKeys[k]) { stopIt(); _rfDeck.endKeys[k](); } else if (k.length === 1) e.stopImmediatePropagation(); return; }
  const st = _rfStage(_rfDeck.q[_rfDeck.at].stage);
  const kind = (st.keys || []).find(x => RF_KINDS[x] && RF_KINDS[x].key === k);
  if (kind) { stopIt(); _rfDecide(kind, _rfDeck.root && _rfDeck.root.querySelector(`[data-kind="${kind}"]`)); return; }
  if (k.length === 1) e.stopImmediatePropagation();          // no global shortcut fires under the review
}
