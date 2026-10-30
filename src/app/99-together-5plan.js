/* ============================================================
   TOGETHER: Plan together. A shared board of cards (notes, task ideas,
   times to vote on, places) that everyone in the space edits; when friends
   are on the board at the same time you see their pointers and what they
   are typing, live (the 'together:live' events: cursors at most ~8 a
   second from here, capped again by every receiver; typing previews are
   capped to 300 characters and shown as text only).
   Then the boot of the Together files (they load after 99-boot.js).
   ============================================================ */
var _tgPlan = { space: null, drag: null, editing: null, sweep: 0, tickAt: 0, marked: {}, booking: {}, calNote: {}, failed: {}, calLoading: false };
const TG_PLAN_COLORS = ['yellow', 'blue', 'green', 'pink', 'purple', 'grey'];
const TG_PLAN_KINDS = { note: ['notebook-pen', 'Note'], task: ['list-plus', 'Task idea'], time: ['clock', 'Time'], place: ['map-pin', 'Place'] };

function tgRenderPlan(body, sp, ro) {
  const v = sp.value, id = sp.id, me = tgMe();
  if (_tgPlan.space !== id) { if (_tgPlan.space) tgSendLive(_tgPlan.space, { t: 'here', on: false }); _tgPlan.space = id; tgSendLive(id, { t: 'here', on: true }); }
  const bar = tgEl('div', 'tg-bar');
  if (!ro) for (const k of ['note', 'task', 'place']) bar.appendChild(tgBtn(TG_PLAN_KINDS[k][1], { icon: TG_PLAN_KINDS[k][0], run: () => tgPlanAdd(id, k) }));
  if (!ro) bar.appendChild(tgBtn('Find a time', { icon: 'calendar-clock', run: () => tgFindTimeDialog({ space: id }) }));
  bar.appendChild(tgEl('span', 'spacer'));
  const here = tgPlanHere(id);
  if (here.length) { const h = tgEl('span', 'tg-here'); h.appendChild(tgAvatarStack(here, v, 6)); h.appendChild(tgEl('span', 'muted tg-sm', `${here.map(f => tgFirst(f, v)).join(', ')} ${here.length === 1 ? 'is' : 'are'} here`)); bar.appendChild(h); }
  body.appendChild(bar);
  const board = tgEl('div', 'tg-plan'); board.dataset.space = id;
  board.setAttribute('role', 'group'); board.setAttribute('aria-label', 'Plan together board');
  const cards = (v.plan || []).slice(0, 300);
  if (!cards.length) board.appendChild(tgEl('div', 'tg-plan-empty muted', ro ? 'Nothing on the board.' : 'Double-click anywhere to add a note. Everyone in the space sees it and can move it, vote and turn ideas into tasks.'));
  for (const c of cards) board.appendChild(tgPlanCard(id, c, ro, v));
  const layer = tgEl('div', 'tg-plan-cursors'); layer.setAttribute('aria-hidden', 'true');
  board.appendChild(layer);
  if (!ro) {
    board.addEventListener('dblclick', (e) => {
      if (e.target !== board && !e.target.classList.contains('tg-plan-empty')) return;
      const r = board.getBoundingClientRect();
      tgPlanAdd(id, 'note', { x: Math.max(0, Math.min(0.88, (e.clientX - r.left) / r.width - 0.05)), y: Math.max(0, Math.min(0.88, (e.clientY - r.top) / r.height - 0.04)) });
    });
  }
  // Your pointer, for the others (only while someone else is here).
  board.addEventListener('pointermove', (e) => {
    if (!tgPlanHere(id).length) return;
    const r = board.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    tgSendLive(id, { t: 'cursor', x, y, ...(_tgPlan.drag ? { sel: _tgPlan.drag.card } : {}) }, 120);
  });
  body.appendChild(board);
  tgPaintCursors(board);
  if (!_tgPlan.sweep) _tgPlan.sweep = setInterval(() => { const b = document.querySelector('.tg-plan'); if (b) tgPaintCursors(b); else { clearInterval(_tgPlan.sweep); _tgPlan.sweep = 0; } }, 2000);
}
function tgPlanCard(spaceId, c, ro, v) {
  const me = tgMe();
  const el = tgEl('div', 'tg-pcard c-' + (TG_PLAN_COLORS.includes(c.color) ? c.color : 'yellow') + (c.done ? ' is-done' : ''));
  el.dataset.id = c.id;
  el.style.left = (Math.max(0, Math.min(1, Number(c.x) || 0)) * 100) + '%';
  el.style.top = (Math.max(0, Math.min(1, Number(c.y) || 0)) * 100) + '%';
  const head = tgEl('div', 'tg-pcard-h');
  const k = TG_PLAN_KINDS[c.kind] || TG_PLAN_KINDS.note;
  head.insertAdjacentHTML('beforeend', icon(k[0], 'i-xs'));
  head.appendChild(tgEl('span', 'muted tg-sm', k[1]));
  head.appendChild(tgAvatarEl(c.by, 'sm', v));
  el.appendChild(head);
  const editing = _tgPlan.editing === c.id;
  if (editing && !ro) {
    const ta = tgInput('plan:' + c.id, { multi: true, rows: 3, max: 300, value: c.text || '', aria: 'Card text' });
    const commit = () => {
      const t = String(ta.value || '').trim().slice(0, 300);
      _tgPlan.editing = null; tgClearDraft('plan:' + c.id);
      if (t !== (c.text || '')) tgEdit(spaceId, [{ op: 'set', path: ['plan', c.id, 'text'], value: t }], { undo: false });
      else render();
    };
    ta.addEventListener('input', () => tgSendLive(spaceId, { t: 'edit', card: c.id, text: ta.value.slice(0, 300) }, 300));
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === 'Escape') { _tgPlan.editing = null; tgClearDraft('plan:' + c.id); render(); } });
    ta.addEventListener('blur', () => { if (_tgPlan.editing === c.id) commit(); });
    el.appendChild(ta);
    setTimeout(() => { if (ta.isConnected) { ta.focus(); const n = ta.value.length; ta.setSelectionRange(n, n); } }, 0);
  } else {
    const t = tgEl('div', 'tg-pcard-t', c.text || (ro ? '' : c.kind === 'time' ? 'What for? Click to write…' : 'Click to write…'));
    if (!c.text) t.classList.add('muted');
    if (!ro) { t.tabIndex = 0; t.setAttribute('role', 'button'); t.onclick = () => { _tgPlan.editing = c.id; render(); }; t.onkeydown = (e) => { if (e.key === 'Enter') { _tgPlan.editing = c.id; render(); } }; }
    el.appendChild(t);
  }
  // A friend typing on this card right now.
  const typing = Object.entries(_tg.live[spaceId] || {}).find(([f, x]) => x.card === c.id && x.text != null && Date.now() - x.at < 5000 && f !== me);
  if (typing) { const p = tgEl('div', 'tg-typing'); p.appendChild(tgEl('b', '', tgFirst(typing[0], v) + ': ')); p.appendChild(document.createTextNode(typing[1].text)); el.appendChild(p); }
  const timed = c.kind === 'time' && Number.isFinite(c.start) && Number.isFinite(c.end);
  if (timed) _tgPlanTimeBits(el, spaceId, c, ro, v);
  const foot = tgEl('div', 'tg-pcard-f');
  const votes = Object.keys(c.votes || {});
  const mine = !!(c.votes && c.votes[me]);
  const toggle = () => {
    _tgRememberVotes(spaceId, mine || !timed ? [] : [c], [c.id]);
    tgEdit(spaceId, [mine ? { op: 'del', path: ['plan', c.id, 'votes', me] } : { op: 'set', path: ['plan', c.id, 'votes', me], value: 1 }], { undo: false });
  };
  let vb;
  if (timed) {
    // A time: "I can make it" (your vote); fixed once it is booked, set aside or past.
    const s = tgPlanTimeState(v, c);
    const n = `${s.yes.length}/${s.members.length}`;
    vb = tgBtn(mine ? `You can make it · ${n}` : `I can make it · ${n}`, { cls: 'btn btn-ghost btn-sm tg-vote' + (mine ? ' is-on' : ''), icon: mine ? 'circle-check' : 'circle', aria: mine ? 'You said you can make it: take it back' : 'Say you can make it', tip: s.yes.length ? 'Can make it: ' + s.yes.map(f => tgName(f, v)).join(', ') : 'Nobody yet', disabled: ro || s.booked || s.aside || s.past, run: toggle });
  } else {
    vb = tgBtn(votes.length ? String(votes.length) : '', { cls: 'btn btn-ghost btn-sm tg-vote' + (mine ? ' is-on' : ''), icon: 'heart', aria: mine ? 'Take back your vote' : 'Vote', tip: votes.length ? votes.map(f => tgName(f, v)).join(', ') : 'Vote', disabled: ro, run: toggle });
  }
  foot.appendChild(vb);
  foot.appendChild(tgEl('span', 'spacer'));
  if (!ro) foot.appendChild(tgIconBtn('ellipsis', 'Card menu', (e, b) => tgPlanMenu(b, spaceId, c)));
  el.appendChild(foot);
  if (!ro) tgPlanDraggable(el, head, spaceId, c);
  return el;
}
function tgPlanMenu(anchor, spaceId, c) {
  openMenu(anchor, [
    { label: 'Edit text', icon: 'pencil', run: () => { _tgPlan.editing = c.id; render(); } },
    (c.kind === 'task' || c.kind === 'note' || c.kind === 'place') && !c.done ? { label: 'Make it a shared task', icon: 'list-plus', run: () => { if (!c.text) { toast('Write something on the card first.', { icon: 'pencil' }); return; } tgAddItem(spaceId, { title: c.text }, { toast: 'Added to the space’s tasks' }); tgEdit(spaceId, [{ op: 'set', path: ['plan', c.id, 'done'], value: true }], { undo: false }); } } : null,
    { heading: 'Colour' },
    ...TG_PLAN_COLORS.map(col => ({ label: col[0].toUpperCase() + col.slice(1), checked: c.color === col, run: () => tgEdit(spaceId, [{ op: 'set', path: ['plan', c.id, 'color'], value: col }], { undo: false }) })),
    'sep',
    { label: 'Delete card', icon: 'trash-2', danger: true, run: () => tgEdit(spaceId, [{ op: 'del', path: ['plan', c.id] }], { toast: 'Card deleted for everyone', icon: 'trash-2' }) },
  ].filter(Boolean), { align: 'end', width: 220 });
}
function tgPlanAdd(spaceId, kind, at) {
  const v = tgVal(spaceId); if (!v) return;
  if ((v.plan || []).length >= 300) { toast('The board is full (300 cards). Delete a few first.', { kind: 'err' }); return; }
  const n = (v.plan || []).length;
  const id = tgNewId('p');
  const pos = at || { x: Math.min(0.85, 0.04 + (n % 5) * 0.19), y: Math.min(0.85, 0.05 + (Math.floor(n / 5) % 5) * 0.18) };
  _tgPlan.editing = id;
  tgEdit(spaceId, [{ op: 'set', path: ['plan', id], value: { kind, text: '', x: Math.round(pos.x * 1000) / 1000, y: Math.round(pos.y * 1000) / 1000, color: kind === 'task' ? 'green' : kind === 'place' ? 'pink' : 'yellow', by: tgMe(), at: Date.now(), votes: {} } }], { undo: false });
}
function tgPlanDraggable(el, handle, spaceId, c) {
  handle.style.cursor = 'grab';
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const board = el.parentElement; if (!board) return;
    e.preventDefault();
    const r = board.getBoundingClientRect(), cr = el.getBoundingClientRect();
    _tgPlan.drag = { card: c.id, dx: e.clientX - cr.left, dy: e.clientY - cr.top, r, moved: false };
    _tg.keep = true;
    el.classList.add('is-drag');
    try { handle.setPointerCapture(e.pointerId); } catch (x) { /* old browser */ }
  });
  handle.addEventListener('pointermove', (e) => {
    const d = _tgPlan.drag; if (!d || d.card !== c.id) return;
    const x = Math.max(0, Math.min(0.92, (e.clientX - d.r.left - d.dx) / d.r.width));
    const y = Math.max(0, Math.min(0.92, (e.clientY - d.r.top - d.dy) / d.r.height));
    el.style.left = (x * 100) + '%'; el.style.top = (y * 100) + '%';
    d.x = x; d.y = y; d.moved = true;
  });
  const end = () => {
    const d = _tgPlan.drag; if (!d || d.card !== c.id) return;
    _tgPlan.drag = null; _tg.keep = false;
    el.classList.remove('is-drag');
    if (d.moved) tgEdit(spaceId, [{ op: 'set', path: ['plan', c.id, 'x'], value: Math.round(d.x * 1000) / 1000 }, { op: 'set', path: ['plan', c.id, 'y'], value: Math.round(d.y * 1000) / 1000 }], { undo: false });
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}
/** Friends on the board now (they said 'here', or moved a pointer in the last minute). */
function tgPlanHere(spaceId) {
  const now = Date.now();
  return Object.entries(_tg.live[spaceId] || {}).filter(([, x]) => x.here && now - x.at < 60000).map(([f]) => f);
}
function tgPlanHeard(from, ev) {
  const sp = tgSpace(ev.space);
  if (!sp || sp.status !== 'joined' || !tgIsMember(sp.value, from)) return;
  const m = _tg.live[ev.space] || (_tg.live[ev.space] = {});
  const cur = m[from] || {};
  const was = !!(cur.here && Date.now() - cur.at < 60000);
  if (ev.t === 'here') m[from] = Object.assign({}, cur, { here: ev.on, at: Date.now() });
  else if (ev.t === 'cursor') m[from] = Object.assign({}, cur, { here: true, x: ev.x, y: ev.y, sel: ev.sel || null, at: Date.now() });
  else if (ev.t === 'edit') m[from] = Object.assign({}, cur, { here: true, card: ev.card, text: String(ev.text || '').slice(0, 300), at: Date.now() });
  // Someone arrived: answer once so they see you too.
  if (ev.t === 'here' && ev.on && !was && _tgPlan.space === ev.space) tgSendLive(ev.space, { t: 'here', on: true }, 3000);
  const board = document.querySelector(`.tg-plan[data-space="${CSS.escape(ev.space)}"]`);
  if (!board) return;
  if (ev.t === 'cursor') tgPaintCursors(board);
  else if (!_tg.keep && !_tgPlan.editing && (ev.t === 'edit' || was !== !!m[from].here)) render();
}
function tgPaintCursors(board) {
  const id = board.dataset.space;
  const layer = board.querySelector('.tg-plan-cursors'); if (!layer) return;
  const now = Date.now(), v = tgVal(id);
  const live = _tg.live[id] || {};
  const want = new Set();
  for (const [f, x] of Object.entries(live)) {
    if (!x.here || x.x == null || now - x.at > 15000) continue;
    want.add(f);
    let c = layer.querySelector(`[data-f="${CSS.escape(f)}"]`);
    if (!c) {
      c = tgEl('div', 'tg-cursor tg-hue-' + _tgHue(f)); c.dataset.f = f;
      c.insertAdjacentHTML('beforeend', '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 7.5-6.2 1.7L10 19z"/></svg>');
      c.appendChild(tgEl('span', '', tgFirst(f, v)));
      layer.appendChild(c);
    }
    c.style.left = (x.x * 100) + '%'; c.style.top = (x.y * 100) + '%';
  }
  for (const c of [...layer.children]) if (!want.has(c.dataset.f)) c.remove();
}
/** Leaving the board (another view): tell the others. */
function tgPlanLeave() {
  if (_tgPlan.space) { tgSendLive(_tgPlan.space, { t: 'here', on: false }); _tgPlan.space = null; }
  _tgPlan.editing = null; _tgPlan.drag = null;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && typeof _tgPlan !== 'undefined' && _tgPlan.space) tgSendLive(_tgPlan.space, { t: 'here', on: false }); });

/* ---------- times to agree on (Find a time, 2layers) ----------
   A 'time' card holds an absolute start and end (ms), so everyone sees it on their own clock,
   with the others' own times beside it when their zones differ. "I can make it" is your vote
   (votes: your key only). When everyone in the space can make one time, any member's app marks
   it booked (done) and the other times proposed with it as set aside; then each person's own app
   puts it in THEIR calendar (CalWrite, with Undo), only if they said they can make it and only
   while the time is still ahead. The calendar event's title is never a friend's text (it could
   reach Claude through the calendar, and anyone in a space may edit a card or the space's name):
   the words YOU typed when you proposed it (kept on your side, state.together.spaces[id].what),
   else "Meet up". */
/** Put times on the space's board at once (with Undo); you can make each of them. slots: [{t0, t1}]; what: your words or ''. */
async function tgProposeSlots(spaceId, slots, what) {
  const v = tgVal(spaceId);
  if (!v) { toast('That space is not on this computer any more. Pick another one.', { kind: 'err' }); return false; }
  const list = (slots || []).filter(sl => sl && Number.isFinite(sl.t0) && Number.isFinite(sl.t1) && sl.t1 > sl.t0).slice(0, 5);
  if (!list.length) return false;
  if ((v.plan || []).length + list.length > 300) { toast('The board is full (300 cards). Delete a few first, then try again.', { kind: 'err' }); return false; }
  const me = tgMe(), at = Date.now(), n0 = (v.plan || []).filter(c => c.kind === 'time').length;
  const text = String(what || '').trim().slice(0, 120);
  const ids = list.map(() => tgNewId('p'));
  if (text) {
    // your words for your own calendar later (a friend may edit the card's text)
    const prev = tgSpacePref(spaceId, 'what'), keep = {};
    const live = new Set((v.plan || []).map(c => c.id));
    if (prev && typeof prev === 'object') for (const [k, w] of Object.entries(prev)) if (live.has(k) && typeof w === 'string' && TG_ID_RE.test(k)) keep[k] = w.slice(0, 120);
    for (const id of ids) keep[id] = text;
    tgSetSpacePref(spaceId, 'what', Object.fromEntries(Object.entries(keep).slice(-40)));
  }
  const ops = list.map((sl, i) => {
    const n = n0 + i;
    return { op: 'set', path: ['plan', ids[i]], value: { kind: 'time', text, start: Math.round(sl.t0), end: Math.round(sl.t1),
      x: Math.round(Math.min(0.85, 0.05 + (n % 4) * 0.22) * 1000) / 1000, y: Math.round(Math.min(0.85, 0.06 + (Math.floor(n / 4) % 4) * 0.2) * 1000) / 1000,
      color: 'blue', by: me, at, votes: { [me]: 1 } } };
  });
  ops.push(...tgFeedOps(spaceId, 'plan', `proposed ${list.length === 1 ? 'a time' : list.length + ' times'}${text ? ' for ' + text : ''}`));
  _tgRememberVotes(spaceId, ops.slice(0, list.length).map(o => ({ id: o.path[1], start: o.value.start, end: o.value.end })), []);
  tgClearDraft('ft:what');
  return tgEdit(spaceId, ops, { toast: list.length === 1 ? 'Proposed on Plan together' : `${list.length} times proposed on Plan together`, icon: 'send' });
}
/** The times proposed together with this one (same person, within two minutes). */
function tgPlanGroup(v, c) { return (v.plan || []).filter(o => o.kind === 'time' && o.by === c.by && Math.abs((o.at || 0) - (c.at || 0)) <= 120000 && Number.isFinite(o.start)); }
/** Where a time card stands: {members, yes, missing, all, booked, aside, past}. */
function tgPlanTimeState(v, c) {
  const members = tgMembers(v), votes = c.votes || {};
  const yes = members.filter(f => votes[f]), missing = members.filter(f => !votes[f]);
  const all = members.length > 1 && !missing.length;
  const allOf = (o) => { const vo = o.votes || {}; return members.length > 1 && members.every(f => vo[f]); };
  // two times of one proposal both full at once: the earlier one is the booking
  const booked = !!c.done && all && !tgPlanGroup(v, c).some(o => o.id !== c.id && o.done && allOf(o) && o.start < c.start);
  return { members, yes, missing, all, booked, aside: !!c.done && !booked, past: Number(c.end) < Date.now() };
}
function _tgCalKey(spaceId, c) { return 'booked:' + spaceId + ':' + c.id; }
/* Your yes is for a TIME, not a card: the start and end you said you can make are kept on your
   side (state.together.spaces[id].voted = {card: [start, end]}). Only that time goes in your
   calendar by itself; if the card is changed after, your yes is taken back and you are asked again. */
function _tgVotedFor(spaceId, c) {
  const w = tgSpacePref(spaceId, 'voted');
  const p = w && typeof w === 'object' && Object.prototype.hasOwnProperty.call(w, c.id) ? w[c.id] : null;
  return Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? p : null;
}
function _tgVoteHolds(spaceId, c) { const p = _tgVotedFor(spaceId, c); return !!p && c.kind === 'time' && p[0] === c.start && p[1] === c.end; }
/** Remember the times of `add` (cards {id, start, end}) and forget the cards in `drop`; cards gone from the board are forgotten too. */
function _tgRememberVotes(spaceId, add, drop) {
  const v = tgVal(spaceId);
  const live = new Set(((v && v.plan) || []).map(c => c.id));
  const prev = tgSpacePref(spaceId, 'voted'), keep = new Map();
  if (prev && typeof prev === 'object') for (const [k, p] of Object.entries(prev)) if (live.has(k) && TG_ID_RE.test(k) && Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) keep.set(k, [p[0], p[1]]);
  for (const k of drop || []) keep.delete(k);
  for (const c of add || []) if (c && TG_ID_RE.test(c.id) && Number.isFinite(c.start) && Number.isFinite(c.end)) keep.set(c.id, [c.start, c.end]);
  tgSetSpacePref(spaceId, 'voted', Object.fromEntries([...keep].slice(-300)));
}
/** The title the event gets in YOUR calendar: never a friend's words (your own, kept on your side, or "Meet up"). */
function _tgEventTitle(spaceId, c) {
  const w = tgSpacePref(spaceId, 'what');
  const mine = w && typeof w === 'object' && Object.prototype.hasOwnProperty.call(w, c.id) && typeof w[c.id] === 'string' ? w[c.id].trim() : '';
  return mine ? mine.slice(0, 120) : 'Meet up';
}
/** Put a booked time in your calendar (CalWrite). manual: your click (also after an Undo). */
async function tgBookInMyCalendar(spaceId, cardId, manual) {
  const sp = tgSpace(spaceId); if (!sp) return;
  const v = sp.value, c = (v.plan || []).find(x => x.id === cardId); if (!c) return;
  const key = _tgCalKey(spaceId, c);
  if (_tgPlan.booking[key] || (!manual && (tgSeen(key) || tgSeen(key + ':off') || !_tgVoteHolds(spaceId, c)))) return;
  // on its own it tries again at most every 10 minutes (a note on the card says why it has not happened)
  if (!manual && _tgPlan.failed[key] && Date.now() - _tgPlan.failed[key] < 10 * 60000) return;
  const note = (text) => { const was = _tgPlan.calNote[key]; _tgPlan.calNote[key] = text; _tgPlan.failed[key] = Date.now(); if (was !== text || manual) render(); };
  const CW = typeof CalWrite !== 'undefined' && CalWrite && typeof CalWrite.create === 'function' ? CalWrite : null;
  if (!CW) { note('This Freeflo cannot add events to a calendar.'); return; }
  const store = typeof CalStore !== 'undefined' ? CalStore : null;
  if (store && !store.data && typeof store.load === 'function') {
    if (!_tgPlan.calLoading) { _tgPlan.calLoading = true; Promise.resolve().then(() => store.load()).catch(() => {}).finally(() => { _tgPlan.calLoading = false; if (!store.data) { note('Your calendar has not loaded yet: open Calendar once, then try again from this card.'); return; } _tgPlan.tickAt = 0; if (manual) tgBookInMyCalendar(spaceId, cardId, true); }); }
    return;
  }
  let writable = [];
  try { writable = typeof CW.writableCalendars === 'function' ? CW.writableCalendars() : []; } catch (e) { writable = []; }
  if (!writable.length) {
    note('To have it added to your calendar, connect a calendar you can write to (Connections).');
    if (manual) toast(_tgPlan.calNote[key], { icon: 'calendar-plus', action: { label: 'Connect', run: () => (window.Connections && typeof Connections.open === 'function' ? Connections.open('calendar') : setView('connections')) } });
    return;
  }
  _tgPlan.booking[key] = true;
  render();
  const title = _tgEventTitle(spaceId, c);
  let r = null;
  try { r = await CW.create({ title, start: c.start, end: c.end, description: 'Planned together with friends in Freeflo.' }, { silent: true, quiet: true }); } catch (e) { r = { ok: false, message: String((e && e.message) || e) }; }
  _tgPlan.booking[key] = false;
  if (r && r.ok) {
    tgMarkSeen(key);
    if (tgSeen(key + ':off')) { delete _tgSt().seen[key + ':off']; saveUI(); }
    delete _tgPlan.calNote[key]; delete _tgPlan.failed[key];
    const evId = r.event && r.event.id;
    toast(`Everyone can make it: “${title}” is in your calendar, ${tgWhenLabel(c.start, c.end)}`, { kind: 'ok', icon: 'calendar-check', action: evId ? { label: 'Undo', run: () => tgUnbookMine(spaceId, c.id, evId) } : null });
  } else {
    _tgPlan.failed[key] = Date.now();
    const why = String((r && r.message) || 'the calendar said no').replace(/[.\s]+$/, '');
    _tgPlan.calNote[key] = `It could not go in your calendar (${why}). Try again from this card.`;
    if (!manual) toast(`Everyone can make “${title}”, ${tgWhenLabel(c.start, c.end)}, but it could not go in your calendar (${why}).`, { kind: 'err', retry: () => tgBookInMyCalendar(spaceId, cardId, true) });
  }
  render();
}
/** Undo of the automatic booking: take it out of your calendar, and do not add it again by itself. */
async function tgUnbookMine(spaceId, cardId, evId) {
  const key = 'booked:' + spaceId + ':' + cardId;
  tgMarkSeen(key + ':off');
  delete _tgSt().seen[key]; saveUI();
  const CW = typeof CalWrite !== 'undefined' ? CalWrite : null;
  if (CW && typeof CW.remove === 'function') {
    const r = await CW.remove(typeof CW.realId === 'function' ? CW.realId(evId) : evId, { silent: true });
    if (r && r.ok === false && !r.cancelled) toast(`It could not be taken out of your calendar (${r.message || 'the calendar said no'}). Delete it there.`, { kind: 'err' });
  }
  render();
}
/** Booked times: mark them (any member's app) and put them in your calendar. Runs after renders, at most every 4 s. */
function tgPlanTick() {
  if (!tgChannel()) return;
  const t = Date.now();
  if (t - (_tgPlan.tickAt || 0) < 4000) return;
  _tgPlan.tickAt = t;
  const me = tgMe();
  for (const sp of tgSpaces()) {
    const v = sp.value;
    for (const c of v.plan || []) {
      if (c.kind !== 'time' || !Number.isFinite(c.start) || !Number.isFinite(c.end)) continue;
      const s = tgPlanTimeState(v, c);
      if (s.past) continue;
      const mine = !!(c.votes && c.votes[me]), said = mine ? _tgVotedFor(sp.id, c) : null;
      if (said && (said[0] !== c.start || said[1] !== c.end)) {
        // Its time was changed after you said yes: that yes was for the old time, so it is taken back.
        _tgRememberVotes(sp.id, [], [c.id]);
        tgEdit(sp.id, [{ op: 'del', path: ['plan', c.id, 'votes', me] }], { undo: false });
        toast(`${tgFirst(c.by, v)} moved a time you said you can make, so your yes was taken back. It is on Plan together if the new time works.`, { icon: 'clock' });
        continue;
      }
      const mk = sp.id + '|' + c.id;
      if (!c.done && s.all && said && !_tgPlan.marked[mk]) {
        _tgPlan.marked[mk] = t;
        const ops = [{ op: 'set', path: ['plan', c.id, 'done'], value: true }];
        for (const o of tgPlanGroup(v, c)) if (o.id !== c.id && !o.done) ops.push({ op: 'set', path: ['plan', o.id, 'done'], value: true });
        const fid = ('bk' + c.id).slice(0, 64);
        if (!(v.feed || []).some(x => x.id === fid)) ops.push({ op: 'set', path: ['feed', fid], value: { by: me, at: t, kind: 'plan', text: `booked a time everyone can make${c.text ? ': ' + String(c.text).slice(0, 120) : ''}`, ref: c.id } });
        tgEdit(sp.id, ops, { undo: false });
        if (typeof tgHangoutOnce === 'function') tgHangoutOnce(sp.id, 'booked:' + c.id, `Booked with ${tgMembers(v).filter(f => f !== me).map(f => tgFirst(f, v)).join(', ') || 'friends'}: ${tgWhenLabel(c.start, c.end)}`, 'calendar-check');
        continue;
      }
      // By itself only for the time you said yes to; otherwise the card's "Add to my calendar" asks.
      if (s.booked && said && !document.hidden) tgBookInMyCalendar(sp.id, c.id, false);
    }
  }
}
/** The when, the others' own times, and where the time stands, on a time card. */
function _tgPlanTimeBits(el, spaceId, c, ro, v) {
  const me = tgMe();
  const when = tgEl('div', 'tg-pcard-when');
  when.appendChild(tgEl('b', '', tgWhenLabel(c.start, c.end)));
  const hints = [];
  for (const f of tgMembers(v)) {
    if (f === me) continue;
    const L = typeof tgBusyFriend === 'function' ? tgBusyFriend(f) : null;
    if (!L || !L.tz) continue;
    try { if (Clock.offset(c.start, L.tz) !== Clock.offset(c.start, Clock.zone())) hints.push(`${Clock.fmtTime(c.start, { zone: L.tz })} for ${tgFirst(f, v)}`); } catch (x) { /* an odd zone */ }
  }
  if (hints.length) when.appendChild(tgEl('span', 'muted tg-sm', hints.slice(0, 3).join(' · ') + ' (their time)'));
  el.appendChild(when);
  const s = tgPlanTimeState(v, c);
  const line = tgEl('div', 'tg-pcard-st tg-sm');
  if (s.booked) {
    el.classList.add('is-booked');
    line.insertAdjacentHTML('beforeend', icon('calendar-check', 'i-xs'));
    const key = _tgCalKey(spaceId, c);
    const inMine = tgSeen(key) && !tgSeen(key + ':off');
    line.appendChild(tgEl('span', '', inMine ? 'Booked · in your calendar' : 'Booked · everyone can make it'));
    el.appendChild(line);
    if (!inMine && !s.past && c.votes && c.votes[me] && !ro) {
      if (_tgPlan.calNote[key]) el.appendChild(tgEl('div', 'muted tg-sm tg-pcard-note', _tgPlan.calNote[key]));
      el.appendChild(tgBtn(_tgPlan.booking[key] ? 'Adding…' : 'Add to my calendar', { icon: 'calendar-plus', disabled: !!_tgPlan.booking[key], run: () => tgBookInMyCalendar(spaceId, c.id, true) }));
    }
    return;
  }
  if (s.aside) { line.appendChild(tgEl('span', 'muted', 'Set aside: another time was booked')); el.appendChild(line); return; }
  if (s.past) { line.appendChild(tgEl('span', 'muted', 'This time has passed')); el.appendChild(line); return; }
  line.appendChild(tgEl('span', 'muted', s.missing.length ? `Waiting for ${s.missing.map(f => tgFirst(f, v)).join(', ')}` : 'Everyone can make it'));
  el.appendChild(line);
}

/* ---------- boot (last of the Together files) ---------- */
_tgBoot();
