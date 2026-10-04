/* ============================================================
   HOME Focus: the card a row opens into, its motion, and the task actions.
   Owner: HB2 (focus). The rows and the widget: 12-home-w-focus.js.
   CSS: 13-home-w-focus.css. Replaces the retired full-task sheet
   (12-home-sheet.js): "Open full card" is the centre card (openTask).

   API (other modules may call these)
     homeFocusToggle(id, on?, {focus, scroll})  open (true), close (false) or
                         flip a Focus card in place; re-selecting does nothing
     homeFocusCollapseAll()                      close every open card
     homeFocusDone(id, cardEl?)    the short celebration, then done (Undo toast)
     homeFocusSnooze(id, backOn?, cardEl?)       hide from Focus until backOn
                         (YYYY-MM-DD, default tomorrow): home.snoozed, one undo step
     homeFocusAct(act, id, cardEl, btn, e)       the card's buttons (data-act)
     homeFocusFreeSlot(events, fromHM, minutes, untilHM)   pure: the first free
                         stretch today, for "Time" (tests/home-focus.test.mjs)
     homeOpenSheet(id, fromEl)     the old name, kept for the brief / evening /
                         review pages: on Home a Focus task opens in place,
                         elsewhere the centre card (else the side panel)

   Motion (HOME_SPEC.md 5.2-5.3), with the Home grid's FLIP (ctx.flip,
   12-home-grid.js): the layout changes once, then the card's height glides
   (it is data-flip-h, so it clips while it grows), the rows below ride
   along, the widgets below translate, and the details fade up from 20 %.
   Opening: 320 ms, ease-out; the card lifts (raised surface, shadow) and
   its scene grows and goes live. Closing animates first and commits after:
   the details fade (90 ms), then from 40 ms the card shrinks over them
   (they are taken out of the flow and clipped) and its lift fades.
   Interruptible: a new change starts from where things are on screen.
   Reduced motion or a hidden tab: every change is instant.
   ============================================================ */
const _HF_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const _HF_EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';
const _HF_POP = 'cubic-bezier(0.34, 1.4, 0.64, 1)';
const _hfDescFull = new Set();      // descriptions shown in full ("more"), this session

function _hfReduced() { return !!(window.Motion && Motion.prefersReduced()) || !!document.hidden; }
function _hfCardEl(id) { return id ? document.querySelector(`#main-body .hf-card[data-id="${CSS.escape(id)}"]`) : null; }
function _hfPlus(n, from) {
  const d = new Date((from || todayStr()) + 'T00:00:00');
  d.setDate(d.getDate() + n); // clock-ok: wall date
  return fmtDate(d);
}
function _hfNextMonday() { const d = new Date(todayStr() + 'T00:00:00'); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); return fmtDate(d); } // clock-ok: wall date
function _hfDay(iso, withWeekday) { return typeof _tbShortDate === 'function' ? _tbShortDate(iso, withWeekday !== false) : iso; }

/* ============================================================
   THE OPEN CARD
   ============================================================ */
function _hfDetails(item, ctx) {
  const id = item.id;
  const subs = getSubtasks(id);
  const prog = homeFocusProgress(subs);
  const doing = statusOf(id) === 'doing';
  const desc = String(effDetail(item) || '').trim();
  const descHtml = !desc ? '' : typeof renderMarkdown === 'function' ? renderMarkdown(desc) : `<p>${esc(homePlainText(desc, 1600))}</p>`;
  const full = _hfDescFull.has(id);
  const aside = _hfAsideHtml(item);
  // Where "Open" lands this session (61-task-card.js): the side panel when it is open or was chosen.
  const toPanel = typeof itemOpenTarget === 'function' && itemOpenTarget() === 'panel';
  const x = document.createElement('div');
  x.className = 'hf-x no-drag';
  x.id = 'hfx-' + id;
  x.setAttribute('role', 'region');
  x.setAttribute('aria-label', 'Details: ' + effTitle(item));
  x.innerHTML = `
    <div class="hf-grid${aside ? '' : ' no-aside'}">
      <div class="hf-main">
        ${descHtml ? `<div class="hf-desc md${full ? ' is-full' : ''}">${descHtml}</div><button type="button" class="btn-link hf-more" data-act="more" aria-expanded="${full ? 'true' : 'false'}" hidden>${full ? 'Less' : 'More'}</button>` : ''}
        ${prog.total ? `<div class="hf-subh"><span class="hf-ovl">Subtasks</span><span class="n">${esc(prog.done)} of ${esc(prog.total)}</span><span class="hf-bar" aria-hidden="true"><i style="--pct:${prog.pct}%"></i></span></div>` : ''}
        <ul class="hf-subs" aria-label="Subtasks">${subs.map(s => _hfSubHtml(s, prog)).join('')}</ul>
        <label class="hf-add">${icon('plus')}<input type="text" placeholder="Add a subtask" aria-label="Add a subtask" maxlength="300" data-fk="add-${escAttr(id)}"></label>
      </div>
      ${aside ? `<aside class="hf-aside">${aside}</aside>` : ''}
    </div>
    <div class="hf-acts">
      <button type="button" class="btn btn-sm hf-b-ok" data-act="done" data-kbd="X">${icon('check')}<span>Done</span></button>
      <button type="button" class="btn btn-sm hf-b-soft" data-act="snooze" aria-haspopup="menu">${icon('alarm-clock')}<span>Snooze</span>${icon('chevron-down', 'i-cv')}</button>
      <button type="button" class="btn btn-sm hf-b-soft" data-act="resched" aria-haspopup="dialog">${icon('calendar-days')}<span>Reschedule</span>${icon('chevron-down', 'i-cv')}</button>
      <button type="button" class="btn btn-ghost btn-sm hf-b-doing${doing ? ' on' : ''}" data-act="doing" aria-pressed="${doing ? 'true' : 'false'}">${icon('circle-dot')}<span>${doing ? 'In progress' : 'Start'}</span></button>
      <span class="spacer"></span>
      <button type="button" class="btn-icon btn-sm hf-b-menu" data-act="menu" aria-label="More actions" data-tip="More">${icon('ellipsis')}</button>
      <button type="button" class="btn btn-secondary btn-sm hf-open" data-act="open" data-kbd="O">${toPanel ? icon('panel-right') + '<span>Open in side panel</span>' : icon('maximize-2') + '<span>Open full card</span>'}</button>
    </div>`;
  const inp = x.querySelector('.hf-add input');
  inp.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); _homeRememberNow(); homeAddSubtask(id, inp.value.trim()); }
    else if (e.key === 'Escape') { e.preventDefault(); if (inp.value) inp.value = ''; else _hfFocusRow(id); }
  });
  x.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); homeFocusToggle(id, false); _hfFocusRow(id); return; }
    const li = t.closest && t.closest('.hf-sub[data-st]');
    if (li && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const list = getSubtasks(id), i = list.findIndex(s => s.id === li.dataset.st), j = i + (e.key === 'ArrowUp' ? -1 : 1);
      if (i < 0 || j < 0 || j >= list.length) return;
      _homeRememberNow();
      _homeRefocus = 'st-' + li.dataset.st;      // the core puts focus back after the re-render
      moveSubtask(id, li.dataset.st, j);
    }
  });
  return x;
}
function _hfSubHtml(s, prog) {
  return `<li class="hf-sub${s.done ? ' done' : ''}${prog.next === s.id ? ' next' : ''}" data-st="${escAttr(s.id)}" data-flip="${escAttr('st:' + s.id)}">`
    + `<span class="hf-grip" aria-hidden="true">${icon('grip-vertical')}</span>`
    + `<button type="button" class="hf-cbx" role="checkbox" aria-checked="${s.done ? 'true' : 'false'}" aria-label="${escAttr(s.title)}" data-act="sub" data-fk="${escAttr('st-' + s.id)}">${icon('check')}</button>`
    + `<span class="hf-sub-t">${esc(s.title)}</span><span class="hf-next" aria-hidden="true">Next</span></li>`;
}
/** Linked (folder, files, links, a linked meeting), With (people), Time. '' when there is nothing. */
function _hfAsideHtml(item) {
  const parts = [];
  let linked = '';
  if (typeof resFor === 'function' && typeof rsrcDisplayLabel === 'function') {
    const list = resFor('task', item.id);
    linked = list.slice(0, 4).map(r => `<button type="button" class="hf-lk k-${escAttr(r.kind)}" data-act="res" data-res="${escAttr(r.id)}" title="${escAttr(rsrcDisplayLabel(r))}">${icon(typeof rsrcIcon === 'function' ? rsrcIcon(r) : 'link')}<span>${esc(rsrcDisplayLabel(r))}</span><small>${esc(typeof rsrcKindLabel === 'function' ? rsrcKindLabel(r) : r.kind)}</small></button>`).join('')
      + (list.length > 4 ? `<button type="button" class="hf-lk hf-lk-more" data-act="open">${icon('ellipsis')}<span>${esc(list.length - 4)} more in the full card</span></button>` : '');
  } else if (typeof resFocusChips === 'function') linked = resFocusChips(item.id);
  if (typeof autolinkFocusChips === 'function') linked += autolinkFocusChips(item.id);
  if (linked) parts.push(`<div class="hf-ax"><div class="hf-ovl">Linked</div>${linked}</div>`);
  const ppl = _hfPeople(item);
  if (ppl.length) {
    parts.push(`<div class="hf-ax"><div class="hf-ovl">With</div>${ppl.slice(0, 4).map(p => {
      const sub = [p.role, p.org].filter(Boolean).join(' · ');
      return `<button type="button" class="hf-who" data-act="person" data-person="${escAttr(p.id)}">${_hfAvatar(p, 28)}<span>${esc(p.name || '')}${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
    }).join('')}${ppl.length > 4 ? `<div class="hf-when"><small>${esc(`and ${ppl.length - 4} more`)}</small></div>` : ''}</div>`);
  }
  const time = _hfTimeLines(item);
  if (time.length) parts.push(`<div class="hf-ax"><div class="hf-ovl">Time</div>${time.map(t => `<div class="hf-when${t.cls ? ' ' + t.cls : ''}">${esc(t.t)}${t.s ? `<small>${esc(t.s)}</small>` : ''}</div>`).join('')}</div>`);
  return parts.join('');
}
/** Due, estimate and the first free stretch today (when the calendar is loaded and the task is for today). */
function _hfTimeLines(item) {
  const out = [];
  const today = todayStr();
  const d = effDate(item);
  if (d) {
    const n = daysUntil(d);
    const at = item.dueTime ? ' at ' + item.dueTime : '';
    out.push(n < 0 ? { t: `${-n} ${-n === 1 ? 'day' : 'days'} overdue`, s: 'was due ' + _hfDay(d), cls: 'late' }
      : n === 0 ? { t: 'Due today' + at, s: '' }
      : n === 1 ? { t: 'Due tomorrow' + at, s: _hfDay(d) }
      : { t: `Due in ${n} days`, s: _hfDay(d) + at });
  }
  const est = Number(item.estimate) || 0;
  if (est > 0) out.push({ t: `About ${_hfMinutes(est)}`, s: 'your estimate' });
  const forToday = (d && d <= today) || statusOf(item.id) === 'doing' || (item.plannedFor && item.plannedFor <= today);
  // A planned slot (20-task-plan.js) says when; otherwise the next free stretch in the working hours.
  const ps = typeof planSlotOf === 'function' ? planSlotOf(item) : null;
  if (ps && ps.date >= today) out.push({ t: `Planned ${planSlotText(ps)}`, s: ps.date === today ? 'today' : _hfDay(ps.date) });
  const cal = typeof _calSoon !== 'undefined' ? _calSoon : null;
  if (forToday && !(ps && ps.date === today) && cal && cal.day === today && cal.ok && Array.isArray(cal.events)) {
    const planned = typeof planSlotsOn === 'function' ? planSlotsOn(today).map(p => ({ start: p.slot.time, end: homeHM(p.slot.end) })) : [];
    const evs = cal.events.filter(e => e && e.date === today && !e.allDay && e.start).concat(planned);
    const now = Clock.parts(Clock.now());
    const hm = `${String(now.h).padStart(2, '0')}:${String(now.mi).padStart(2, '0')}`;
    const wh = typeof homeWorkHours === 'function' ? homeWorkHours() : null;
    const slot = homeFocusFreeSlot(evs, wh && wh.start > hm ? wh.start : hm, Math.max(30, Math.min(est || 60, 240)), wh ? wh.end : '19:00');
    if (slot) out.push({ t: `Free ${slot.start}–${slot.end}`, s: slot.start <= hm ? 'clear from now' : 'your next clear stretch today' });
  }
  return out;
}
/**
 * The first free stretch of at least `need` minutes between max(fromHM, 08:00)
 * and untilHM ('19:00'), given today's timed events [{start, end}] ('HH:MM').
 * -> {start, end, minutes} | null. Pure.
 */
function homeFocusFreeSlot(events, fromHM, need, untilHM) {
  const toM = (s) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const want = Math.max(1, Number(need) || 60);
  const end = toM(untilHM) == null ? 19 * 60 : toM(untilHM);
  let cur = Math.max(toM(fromHM) == null ? 0 : toM(fromHM), 8 * 60);
  cur = Math.ceil(cur / 15) * 15;
  const busy = (Array.isArray(events) ? events : [])
    .map(e => { const a = toM(e && e.start); const b = toM(e && e.end); return [a, b == null ? (a == null ? null : a + 30) : b]; })
    .filter(([a, b]) => a != null && b != null && b > a).sort((x, y) => x[0] - y[0]);
  for (const [a, b] of busy) {
    if (cur >= end) return null;
    if (b <= cur) continue;
    const stop = Math.min(a, end);
    if (stop - cur >= want) return { start: fmt(cur), end: fmt(stop), minutes: stop - cur };
    cur = Math.max(cur, b);
  }
  return end - cur >= want ? { start: fmt(cur), end: fmt(end), minutes: end - cur } : null;
}

/** After an open card is in the page: "More" only when clamped, subtask drag, new subtasks rise. */
function _hfDetailsMounted(card, ctx) {
  const x = card && card.querySelector(':scope > .hf-x');
  if (!x) return;
  const id = card.dataset.id;
  const d = x.querySelector('.hf-desc'), more = x.querySelector('.hf-more');
  if (d && more) more.hidden = !(d.classList.contains('is-full') || d.scrollHeight > d.clientHeight + 2);
  const ul = x.querySelector('.hf-subs');
  if (!ul || !ctx) return;
  const lis = [...ul.querySelectorAll('.hf-sub[data-st]')];
  if ('fresh' in x.dataset) { lis.forEach(li => ctx.isNew('st:' + li.dataset.st)); delete x.dataset.fresh; }   // opened in place: nothing in it is "new"
  else ctx.enterNew(lis, (li) => 'st:' + li.dataset.st);
  if (!ctx.editing && lis.length > 1 && !card._hfSort) {
    card._hfSort = ctx.sortable(ul, {
      items: '.hf-sub[data-st]', axis: 'y', idOf: (n) => n.dataset.st,
      onReorder: (ids, moved) => { _homeRememberNow(); moveSubtask(id, moved, ids.indexOf(moved)); },
    });
  }
}

/* ============================================================
   OPEN / CLOSE IN PLACE
   ============================================================ */
/** Open (true), close (false) or flip (undefined) a Focus card. Returns the new state. */
function homeFocusToggle(id, on, o) {
  o = o || {};
  const card = _hfCardEl(id);
  const isOpen = card ? card.classList.contains('is-open') && !card.classList.contains('is-closing') : homeIsExpanded(id);
  const want = on === undefined ? !isOpen : !!on;
  if (!card) { homeSetExpanded(id, want); return want; }
  if (want === isOpen) {                                  // re-selecting: nothing moves
    if (want && o.focus) _hfFocusRow(id);
    return want;
  }
  if (want) _hfExpand(card, o); else _hfCollapse([card], o);
  return want;
}
function homeFocusCollapseAll() {
  const cards = [...document.querySelectorAll('#main-body .hf-card.is-open:not(.is-closing)')];
  const ui = state.homeUI && typeof state.homeUI === 'object' ? state.homeUI : {};
  if ((ui.expanded || []).length) { state.homeUI = Object.assign({}, ui, { expanded: [] }); saveUI(); }   // also ones not on screen now
  if (!cards.length) return;
  const inside = cards.find(c => c.contains(document.activeElement));
  // Scrolled down past Focus's header: bring it back into view while the cards close.
  const w = cards[0].closest('.hf-w'), sc = document.getElementById('main');
  if (w && sc) {
    const r = w.getBoundingClientRect(), m = sc.getBoundingClientRect();
    if (r.top < m.top) sc.scrollBy({ top: r.top - m.top - 8, behavior: _hfReduced() ? 'auto' : 'smooth' });
  }
  _hfCollapse(cards);
  if (inside) _hfFocusRow(inside.dataset.id);
  if (typeof homeAnnounce === 'function') homeAnnounce(cards.length > 1 ? `${cards.length} cards closed` : 'Card closed');
}
function _hfFocusRow(id) {
  const t = document.querySelector(`#main-body .hf-card[data-id="${CSS.escape(id)}"] .hf-tt`);
  if (t) try { t.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
/** Swap the row's scene: live while open (animActivate keeps at most six looping), else on hover only. */
function _hfSceneSwap(card, item, live) {
  const box = card && card.querySelector('.hf-scene');
  if (!box || !item || typeof animSceneHtml !== 'function') return;
  box.innerHTML = _hfSceneHtml(item, live);
  if (live && typeof animActivate === 'function') animActivate(box);
}
/**
 * While a card grows or shrinks, what follows it is painted IN FRONT of it on
 * the widget's own surface. The card's height is laid out on the main thread
 * and the rows' small slide runs on the compositor; if a busy frame lets the
 * two drift apart, a row covers the card's last line instead of printing over
 * it (HOME_SPEC.md 5.2, step 4).
 */
function _hfFront(cards, ms) {
  const set = new Set();
  for (const card of cards) {
    for (let n = card.nextElementSibling; n; n = n.nextElementSibling) set.add(n);
    const b = card.closest('.hf-b');
    if (b) for (const el of b.querySelectorAll(':scope > .hf-done, :scope > .hf-hint')) set.add(el);
  }
  for (const c of cards) set.delete(c);
  set.forEach(el => el.classList.add('hf-front'));
  setTimeout(() => set.forEach(el => el.classList.remove('hf-front')), ms);
}
function _hfSceneGrow(box, w0) {
  if (!box || !w0 || _hfReduced() || typeof box.animate !== 'function') return;
  const w1 = box.getBoundingClientRect().width;
  if (w1 && Math.abs(w1 - w0) > 1) box.animate([{ transform: `scale(${w0 / w1})` }, { transform: 'none' }], { duration: 320, easing: _HF_EASE });
}

function _hfExpand(card, o) {
  o = o || {};
  const id = card.dataset.id, item = getItem(id);
  if (!item) return;
  const ctx = _hfCtx;
  homeSetExpanded(id, true);
  // Opening a card that is still closing: take it back from the close.
  if (card._hfBatch) { card._hfBatch.cards = card._hfBatch.cards.filter(c => c !== card); card._hfBatch = null; }
  clearTimeout(card._hfFinish);
  let x = card.querySelector(':scope > .hf-x');
  if (x) { x.classList.remove('is-leaving'); x.style.top = ''; if (x.getAnimations) x.getAnimations().forEach(a => a.cancel()); }
  const reduced = _hfReduced();
  const scene = card.querySelector('.hf-scene');
  const w0 = scene ? scene.getBoundingClientRect().width : 0;
  const change = () => {
    card.classList.remove('is-closing');
    card.classList.add('is-open');
    const tt = card.querySelector('.hf-tt'); if (tt) tt.setAttribute('aria-expanded', 'true');
    if (!x) { x = _hfDetails(item, ctx); x.dataset.fresh = ''; card.appendChild(x); }
    _hfSceneSwap(card, item, true);
    _hfDetailsMounted(card, ctx);                         // "More" shows or not BEFORE the final size is measured
  };
  if (!reduced) _hfFront([card], 360);
  if (ctx && card.isConnected) ctx.flip(change); else change();
  _hfSyncHead(card.closest('.hf-w'));
  if (!reduced && typeof x.animate === 'function') {
    x.animate([{ opacity: 0.2, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: _HF_EASE });
    _hfSceneGrow(card.querySelector('.hf-scene'), w0);
  }
  if (o.focus) _hfFocusRow(id);
  if (o.scroll !== false) setTimeout(() => _hfReveal(card), reduced ? 0 : 340);
}
/** Close cards: fade their details, then (40 ms in) shrink over them; commit when it lands. */
function _hfCollapse(cards, o) {
  cards = (cards || []).filter(c => c && c.isConnected && c.classList.contains('is-open') && !c.classList.contains('is-closing'));
  if (!cards.length) return;
  const ctx = _hfCtx;
  const reduced = _hfReduced();
  const w = cards[0].closest('.hf-w');
  for (const c of cards) {
    homeSetExpanded(c.dataset.id, false);
    if (c.contains(document.activeElement) && !c.querySelector('.hf-tt').contains(document.activeElement)) _hfFocusRow(c.dataset.id);
    c.classList.add('is-closing');
    const tt = c.querySelector('.hf-tt'); if (tt) tt.setAttribute('aria-expanded', 'false');
  }
  _hfSyncHead(w);
  const batch = { cards: cards.slice() };
  const finish = (c) => {
    if (c.classList.contains('is-open')) return;          // opened again meanwhile
    const x = c.querySelector(':scope > .hf-x'); if (x) x.remove();
    c.classList.remove('is-closing');
    if (c._hfSort) { try { c._hfSort.destroy(); } catch (e) { /* gone */ } c._hfSort = null; }
  };
  const close = () => {
    const sizes = new Map();
    for (const c of batch.cards) { const s = c.querySelector('.hf-scene'); sizes.set(c, s ? s.getBoundingClientRect().width : 0); }
    const change = () => {
      for (const c of batch.cards) {
        c.classList.remove('is-open');
        _hfSceneSwap(c, getItem(c.dataset.id), false);
        const x = c.querySelector(':scope > .hf-x');
        if (!x) continue;
        if (reduced) { x.remove(); continue; }
        x.classList.add('is-leaving');                     // out of the flow: the shrinking card clips it
        const row = c.querySelector('.hf-row');
        x.style.top = (row ? row.offsetHeight : 0) + 'px';
      }
    };
    if (!reduced) _hfFront(batch.cards, 360);
    if (ctx && batch.cards.some(c => c.isConnected)) ctx.flip(change); else change();
    for (const c of batch.cards) {
      c._hfBatch = null;
      _hfSceneGrow(c.querySelector('.hf-scene'), sizes.get(c));
      if (reduced) finish(c); else c._hfFinish = setTimeout(() => finish(c), 380);
    }
  };
  for (const c of cards) c._hfBatch = batch;
  if (reduced) { close(); return; }
  for (const c of cards) {
    const x = c.querySelector(':scope > .hf-x');
    if (x && x.animate) x.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: _HF_EASE_IN, fill: 'forwards' });
  }
  setTimeout(close, 40);
}
/** After an open: if the card runs off the bottom, scroll just enough (never past its top). */
function _hfReveal(card) {
  if (!card || !card.isConnected || !card.classList.contains('is-open')) return;
  const sc = document.getElementById('main');
  if (!sc) return;
  const r = card.getBoundingClientRect(), m = sc.getBoundingClientRect();
  const over = r.bottom - (m.bottom - 12);
  if (over <= 0) return;
  const by = Math.min(over, Math.max(0, r.top - (m.top + 8)));
  if (by > 4) sc.scrollBy({ top: by, behavior: _hfReduced() ? 'auto' : 'smooth' });
}

/* ============================================================
   ACTIONS
   ============================================================ */
function homeFocusAct(act, id, card, btn, e) {
  const row = card && card.querySelector('.hf-row');
  if (act === 'done') homeFocusDone(id, card);
  else if (act === 'tomorrow') { _homeRememberNow(); homeReschedule(id, _hfPlus(1)); }
  else if (act === 'sub') { const li = btn.closest('[data-st]'); if (li) _hfTickSub(id, li.dataset.st, card); }
  else if (act === 'snooze') _hfSnoozeMenu(btn, id, card);
  else if (act === 'resched') _hfReschedule(btn, id);
  else if (act === 'doing') { _homeRememberNow(); if (typeof toggleDoing === 'function') toggleDoing(id); else setStatus(id, statusOf(id) === 'doing' ? 'todo' : 'doing'); }
  else if (act === 'menu') homeTaskMenu(btn, id);
  else if (act === 'open') homeOpenTask(id, row || card);
  else if (act === 'more') _hfMore(card, btn);
  else if (act === 'res' && typeof resPrimary === 'function') resPrimary(btn.dataset.res, { type: 'task', id });   // Files & links (63-resources.js)
  else if (act === 'alink-ev') { if (typeof openEvent === 'function') openEvent(btn.dataset.ev, { from: btn }); else if (typeof calOpenEvent === 'function') calOpenEvent(btn.dataset.ev); }   // a linked meeting (66-autolink.js)
  else if (act === 'person' && btn.dataset.person) openPerson(btn.dataset.person, { from: btn });
}
/** "More" / "Less" on the description: the card glides to its new height. */
function _hfMore(card, btn) {
  const id = card.dataset.id, d = card.querySelector('.hf-desc');
  if (!d) return;
  const on = !_hfDescFull.has(id);
  if (on) _hfDescFull.add(id); else _hfDescFull.delete(id);
  const change = () => { d.classList.toggle('is-full', on); btn.textContent = on ? 'Less' : 'More'; btn.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  if (_hfCtx) _hfCtx.flip(change); else change();
}

/** Tick a subtask in place: the box pops, the row strikes, the ring and bar move. One undo step. */
function _hfTickSub(id, stId, card) {
  const cur = getSubtasks(id).slice();
  const i = cur.findIndex(s => s.id === stId);
  if (i < 0) return;
  cur[i] = Object.assign({}, cur[i], { done: !cur[i].done });
  setOverride(id, 'subtasks', cur);                       // saves; no repaint, so nothing else moves
  const nowDone = cur[i].done;
  const prog = homeFocusProgress(getSubtasks(id));
  if (card && card.isConnected) {
    const li = card.querySelector(`.hf-sub[data-st="${CSS.escape(stId)}"]`);
    const cb = li && li.querySelector('.hf-cbx');
    // Inside a flip: when "Next" moves, a row can change height; the rest glides instead of jumping.
    const change = () => {
      if (li) li.classList.toggle('done', nowDone);
      if (cb) cb.setAttribute('aria-checked', nowDone ? 'true' : 'false');
      _hfPaintProgress(card, prog);
    };
    if (_hfCtx) _hfCtx.flip(change); else change();
    if (cb && nowDone && !_hfReduced() && cb.animate) cb.animate([{ transform: 'scale(0.7)' }, { transform: 'scale(1.12)', offset: 0.6 }, { transform: 'none' }], { duration: 260, easing: _HF_POP });
  }
  if (typeof homeAnnounce === 'function') homeAnnounce(`${nowDone ? 'Done' : 'Not done'}: ${cur[i].title}. ${prog.done} of ${prog.total}.`);
  if (nowDone && prog.allDone && statusOf(id) !== 'done') {
    toast('All subtasks done', { kind: 'ok', icon: 'list-checks', action: { label: 'Complete the task', run: () => homeFocusDone(id, _hfCardEl(id)) } });
  }
}
function _hfPaintProgress(card, prog) {
  for (const li of card.querySelectorAll('.hf-sub[data-st]')) li.classList.toggle('next', li.dataset.st === prog.next);
  const ring = card.querySelector('.hf-ring');
  if (ring) { ring.style.setProperty('--p', prog.pct); ring.classList.toggle('is-zero', !prog.done); }
  const rn = card.querySelector('.hf-ringn');
  if (rn) {
    rn.title = `${prog.done} of ${prog.total} subtasks done`;
    const num = rn.querySelector('.num');
    if (num && num.textContent !== prog.label) {
      num.textContent = prog.label;
      if (!_hfReduced() && num.animate) num.animate([{ opacity: 0.2, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: _HF_EASE });
    }
  }
  const bar = card.querySelector('.hf-bar > i');
  if (bar) bar.style.setProperty('--pct', prog.pct + '%');
  const n = card.querySelector('.hf-subh .n');
  if (n) n.textContent = `${prog.done} of ${prog.total}`;
}

/** Done: the scene turns into a tick, a few sparks, the title strikes; then the row leaves and the rest glide up. */
function homeFocusDone(id, card) {
  const it = getItem(id);
  if (!it || statusOf(id) === 'done') return;
  card = card && card.isConnected ? card : _hfCardEl(id);
  let committed = false;
  const commit = () => {
    if (committed) return; committed = true;
    _homeRememberNow();
    if (typeof toggleDone === 'function') toggleDone(id); else setStatus(id, 'done');
  };
  if (!card || _hfReduced() || typeof card.animate !== 'function') { commit(); return; }
  if (card.classList.contains('is-completing')) return;
  card.classList.add('is-completing');
  const box = card.querySelector('.hf-scene');
  if (box) {
    const pop = document.createElement('span'); pop.className = 'hf-done-pop'; pop.setAttribute('aria-hidden', 'true');
    pop.innerHTML = `<b>${icon('check')}</b>` + '<i></i>'.repeat(8);
    box.appendChild(pop);
  }
  if (typeof homeAnnounce === 'function') homeAnnounce(effTitle(it) + ': done');
  setTimeout(() => _hfLeave(card, commit, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px) scale(0.985)' }]), 480);
}
/**
 * A row leaves Focus (done, snoozed): it fades, then the rows and widgets below
 * glide into its place, and only then is the change saved, so the re-render
 * that follows finds everything already where it belongs (nothing jumps).
 */
function _hfLeave(card, commit, frames) {
  let done = false;
  const go = () => { if (!done) { done = true; commit(); } };
  if (!card || !card.isConnected || _hfReduced() || typeof card.animate !== 'function') { go(); return; }
  const a = card.animate(frames || [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-12px)' }], { duration: 170, easing: _HF_EASE_IN, fill: 'forwards' });
  const away = () => {
    if (!card.isConnected) { go(); return; }
    const hide = () => { card.style.display = 'none'; };
    if (_hfCtx) _hfCtx.flip(hide); else hide();
    setTimeout(go, 330);
  };
  let left = false;
  const once = () => { if (!left) { left = true; away(); } };
  a.finished.then(once, once);
  setTimeout(once, 400);
}
/**
 * Hide a task from Focus until `backOn` (YYYY-MM-DD, after today; default
 * tomorrow). Stored as home.snoozed[id] = the last hidden day (12-home.js,
 * lib/home-topbar.mjs). Assistants: set_home_focus {hide, hideUntil}.
 */
function homeFocusSnooze(id, backOn, card) {
  if (!getItem(id)) return;
  const today = todayStr();
  const back = backOn && /^\d{4}-\d{2}-\d{2}$/.test(backOn) && backOn > today ? backOn : _hfPlus(1);
  const s = Object.assign({}, homeState().snoozed || {});
  s[id] = _hfPlus(-1, back);
  const when = back === _hfPlus(1) ? 'tomorrow' : _hfDay(back);
  _hfLeave(card || _hfCardEl(id), () => { _homeRememberNow(); homeUpdate({ snoozed: s }, `Hidden from Focus until ${when}`); });
}
function _hfSnoozeMenu(anchor, id, card) {
  const t1 = _hfPlus(1), t2 = _hfPlus(2), mon = _hfNextMonday();
  openMenu(anchor, [
    { heading: 'Back in Focus' },
    { label: 'Tomorrow', icon: 'sunrise', hint: _hfDay(t1), kbd: 'H', run: () => homeFocusSnooze(id, t1, card) },
    { label: 'In two days', icon: 'calendar', hint: _hfDay(t2), run: () => homeFocusSnooze(id, t2, card) },
    { label: 'Next week', icon: 'calendar-range', hint: _hfDay(mon), hidden: mon === t1 || mon === t2, run: () => homeFocusSnooze(id, mon, card) },
    'sep',
    { label: 'Pick a day…', icon: 'calendar-days', run: () => _hfDatePop(anchor, { title: 'Back in Focus on', value: '', min: _hfPlus(1), onPick: (d) => homeFocusSnooze(id, d, card) }) },
  ], { align: 'start' });
}
function _hfReschedule(anchor, id) {
  const it = getItem(id); if (!it) return;
  const cur = effDate(it) || '';
  _hfDatePop(anchor, {
    title: 'Due', value: cur, clearable: !!cur,
    onPick: (d) => { if (d === cur) return; _homeRememberNow(); if (d) homeReschedule(id, d); else { setDateWithReason(id, null, 'Cleared on Home'); toast('Date cleared', { kind: 'ok', icon: 'calendar', action: { label: 'Undo', run: () => undo() } }); } },
  });
}
/** A date popover: quick picks and the mini month (32-tasks-ui.js). Re-picking the current day does nothing. */
function _hfDatePop(anchor, o) {
  openPopover(anchor, (el, close) => {
    el.classList.add('pad', 'hf-date-pop');
    const pick = (d) => { close(); if (d === o.value) return; o.onPick(d); };
    const h = document.createElement('div'); h.className = 'pop-label'; h.textContent = o.title || 'Date';
    el.appendChild(h);
    const quick = document.createElement('div'); quick.className = 'hf-date-quick';
    const inMonth = (() => { const d = new Date(todayStr() + 'T00:00:00'); d.setMonth(d.getMonth() + 1); return fmtDate(d); })(); // clock-ok: wall date
    for (const [t, v] of [['Today', todayStr()], ['Tomorrow', _hfPlus(1)], ['Next week', _hfNextMonday()], ['In a month', inMonth]]) {
      if (o.min && v < o.min) continue;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip chip-lg';
      b.textContent = t; b.title = _hfDay(v);
      if (v === o.value) { b.classList.add('chip-accent'); b.setAttribute('aria-pressed', 'true'); }
      b.onclick = () => pick(v);
      quick.appendChild(b);
    }
    el.appendChild(quick);
    if (typeof buildMiniMonth === 'function') {
      const mm = document.createElement('div');
      buildMiniMonth(mm, { value: o.value || '', month: (o.value || todayStr()).slice(0, 7), onPick: (d) => { if (o.min && d < o.min) return; pick(d); } });
      el.appendChild(mm);
    }
    if (o.clearable) {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'btn btn-ghost btn-sm hf-date-clear';
      c.innerHTML = icon('x') + '<span>No date</span>';
      c.onclick = () => pick('');
      el.appendChild(c);
    }
  }, { width: 272, align: 'start' });
}

/* ============================================================
   RETIRED SHEET: the old entry point
   ============================================================ */
/** Kept for the brief / evening / review pages: on Home a Focus task opens in place, elsewhere the centre card. */
function homeOpenSheet(id, fromEl) {
  if (!id || !getItem(id)) return false;
  if (state.view === 'home' && _hfCardEl(id)) { homeFocusToggle(id, true, { focus: true }); return 'inline'; }
  if (typeof openTask === 'function') return openTask(id, { from: fromEl || null });
  if (typeof selectTask === 'function') selectTask(id);
  return 'panel';
}
