/* ============================================================
   HOME widget "wrapup": After meetings (WIDGETS_CATALOGUE.md 3.5).
   OWNER: the "wrapup" widget builder. The rules are pure, in
   12-home-wrapup-logic.js (homeWrapCandidates...); styles in
   13-home-w-wrapup.css; tests in tests/home-w-wrapup.test.mjs.

   The job: close the loop on a meeting with other people once it ends,
   before its follow-ups are forgotten. Meetings come from the calendar store
   (homeMeetingsBetween, 53-people-contact.js): meetings with someone else that
   ended in the last 36 h (Settings: today, 36 h or 7 days; repeating ones can be
   left out) and are not wrapped up yet (wuIsWrapped: eventMeta.wrapped, or a
   follow-up task linked to it), newest first.

   Sizes
     S   "2 meetings to wrap up", the latest one, and its three buttons
     M   rows: title, "Ended 2 h ago · 45 min · Sam and Jo", avatars; Note, Follow-up (+ ✓),
         Nothing needed (4 rows, "+N more")
     L   M (6 rows) + Thank-you (+ ✓; meetings with at most 6 other people); the note box adds a follow-up line (prefilled title
         and a due-date chip), so one Save writes the note and the follow-up
   Actions (every one leaves the row with Undo; it now counts as wrapped up)
     Note           the note box opens in place (the editor: nothing is written before
                    Save); "Also add to <first>'s notes" ticks for attendees in People.
                    Save = calAnnotate(appendNotes, wrapped) + addPersonNote per tick (+ the
                    follow-up at L): ONE undo step (selUndoGroup). Ctrl+Enter saves, Esc closes
                    (what was typed is kept for the session).
     Follow-up      the user's rule (3 Oct): the NORMAL editor PREFILLED, the task card in
                    create mode (tcOpenCreate: 'Follow up: <title>', due in 2 working days, the
                    attendees in People, the likely stream, linked to the meeting). Save
                    creates it (the task card makes task + link one undo step); a task made
                    after the meeting began and linked to it wraps the meeting up.
     ✓ (beside it)  the same follow-up at once, as it is: addCustomTask + calAnnotate(link,
                    wrapped), one undo step, an Undo toast.
     Nothing needed calAnnotate(wrapped: true); Undo un-wraps it.
     Thank-you (L)  the draft editor prefilled (GmailDraft.openEditor: People addresses only,
                    a Gmail DRAFT, never sent); its ✓ saves the draft as it is
                    (GmailDraft.quick, Undo deletes it). Without Gmail drafts: the mail app
                    (mailto, never sends). A thank-you does not wrap the meeting up.
   A second press does nothing: the Note box already open, the follow-up card already
   open for this meeting, a thank-you already drafted. The row whose event card, follow-up
   card or note box is open is the current one (aria-current). Enter on a row opens the
   event; X = Nothing needed, N = Note, F = Follow-up.
   Gating: the feature switch (gate 'calendar'); no connected calendar -> ctx.off with
   Connect; nothing to wrap up -> hidden (emptyHint), except right after the user wrapped
   up the last one: "All wrapped up" until Home is left (at most 10 min). Calendar data
   older than 6 h: "Updated 07:02" in the foot (click = update).
   Motion: new rows rise once (ctx.enterNew); a row leaves with Motion.collapse and the
   rest glide (data-flip); the note box opens with Motion.expand. Nothing replays on a
   save or live sync; reduced motion = instant. The minute tick updates "ended … ago" in
   place and repaints only when a meeting ends or ages out.
   ============================================================ */
let _wuOpen = null;               // the meeting whose note box is open (one at a time)
let _wuOpenFresh = false;         // it has just been opened: focus it and let it expand once
const _wuDrafts = new Map();      // meeting id -> {text, sel, ticks: Set, fu: {on, title, due}} (kept for the session)
const _wuThanked = new Set();     // meetings with a thank-you drafted this session
let _wuAll = false;               // "+N more" opened (until Home is left)
let _wuCleared = 0;               // when the user wrapped up the last one (the "All wrapped up" moment)
let _wuCalAsked = false;
let _wuPreviewSeq = 0;
const _WU_CLEARED_MS = 10 * 60000;
const _WU_STALE_MS = 6 * 3600000;
const _WU_THANKS_MAX = 6;         // L offers a thank-you for meetings with at most this many other people

registerHomeWidget({
  id: 'wrapup', title: 'After meetings', icon: 'clipboard-list', order: 140, group: 'time', gate: 'calendar',
  description: 'Notes and follow-ups for meetings that just ended',
  emptyHint: 'Appears after a meeting with other people ends',
  sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultHidden: true, fresh: true,
  aliases: ['wrap up', 'wrap-up', 'after meetings', 'meeting notes', 'meeting follow-ups'],
  defaults: { windowH: 36, skipRecurring: false },
  available: () => true,
  render: (el, ctx) => _wuRender(el, ctx || {}),
  settings: (anchor, ctx) => homeSettingsMenu(anchor, ctx, [
    { key: 'windowH', label: 'Meetings that ended', type: 'choice', choices: [[0, 'Today'], [36, '36 h'], [168, '7 days']] },
    { key: 'skipRecurring', label: 'Leave out repeating meetings', hint: 'Stand-ups and other series', type: 'toggle' },
  ]),
  unmount() { _wuOpen = null; _wuOpenFresh = false; _wuAll = false; _wuCleared = 0; _wuCalAsked = false; },
  sample: (kit) => _wuSample(kit),
});

/* ---------- the model ---------- */
function _wuPrefs(ctx) {
  const p = ctx && ctx.prefs ? ctx.prefs : homePrefs('wrapup');
  const h = Number(p.windowH);
  return { windowH: Number.isFinite(h) ? Math.max(0, Math.min(168, Math.round(h))) : 36, skipRecurring: p.skipRecurring === true };
}
function _wuCreatedAt(id) {
  const t = typeof getItem === 'function' ? getItem(id) : null;
  if (!t || !t.createdAt) return null;
  const ms = typeof t.createdAt === 'number' ? t.createdAt : Date.parse(String(t.createdAt));
  return Number.isFinite(ms) ? ms : null;
}
function _wuCalAt() { return typeof CalStore !== 'undefined' && CalStore && CalStore.data ? String(CalStore.data.fetchedAt || 'c') : ''; }
/** The meetings to wrap up now (memoised per minute and data version). */
function wuMeetingsToWrap(prefs) {
  const p = prefs || _wuPrefs(null);
  const sig = homeMemoSig({ minute: true, extra: [_wuCalAt(), p.windowH, p.skipRecurring, (state.people || []).length] });
  return homeMemo('wrapup:model', sig, () => {
    if (typeof homeMeetingsBetween !== 'function') return [];
    const now = Date.now();
    const from = p.windowH > 0 ? now - p.windowH * 3600000 : _wuDayStart(now);
    let list = [];
    try { list = homeMeetingsBetween(from, now); } catch (e) { console.error('[wrapup] meetings', e); list = []; }
    return homeWrapCandidates(list, state.eventMeta || {}, now, { windowH: p.windowH, skipRecurring: p.skipRecurring, createdAt: _wuCreatedAt });
  });
}
function _wuCalReady() {
  if (typeof CalStore === 'undefined' || !CalStore || !CalStore.st) return false;
  if (CalStore.data) return true;
  if (!_wuCalAsked && !CalStore.st.loaded && !CalStore.st.loading && (typeof _serverAvailable === 'undefined' || _serverAvailable)) {
    _wuCalAsked = true;
    try { CalStore.load(); } catch (e) { /* the store's onChange repaints Home when it lands */ }
  }
  return false;
}

/* ---------- small text helpers ---------- */
function _wuLocale() { return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined; }
function _wuIso(ms) { return fmtDate(new Date(ms)); }
function _wuDayDiff(ms) {
  const a = new Date(_wuIso(ms) + 'T12:00:00'), b = new Date(todayStr() + 'T12:00:00');
  return Math.round((b - a) / 864e5);
}
function _wuHM(ms) {
  if (typeof _calTime === 'function') return _calTime(new Date(ms));
  const p = typeof Clock !== 'undefined' ? Clock.parts(ms) : null;
  if (p) return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
  const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;   // clock-ok: fallback where Clock is not loaded (tests)
}
function _wuDayShort(ms) { try { return new Date(ms).toLocaleDateString(_wuLocale(), { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return _wuIso(ms); } }
/** 'today', 'yesterday' or 'on Monday' (the thank-you line). */
function _wuWhenWord(ms) {
  const dd = _wuDayDiff(ms);
  if (dd <= 0) return 'today';
  if (dd === 1) return 'yesterday';
  try { return 'on ' + new Date(ms).toLocaleDateString(_wuLocale(), { weekday: 'long' }); } catch (e) { return ''; }
}
function _wuWhenText(m) { return `${_wuDayShort(m.start)} · ${_wuHM(m.start)}–${_wuHM(m.end)}`; }
function _wuDur(min) { const m = Math.max(0, Math.round(Number(min) || 0)); if (m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r}` : `${h} h`; }
function _wuEnded(m) { return 'Ended ' + wuEndedText(Math.max(0, Math.round((Date.now() - m.end) / 60000)), _wuDayDiff(m.end)); }
function _wuPerson(pid, kit) {
  if (!pid) return null;
  if (kit) return (kit.people || []).find(p => p.id === pid) || null;
  return typeof getPerson === 'function' ? getPerson(pid) || null : null;
}
function _wuFirstOf(a, kit) {
  const p = _wuPerson(a.personId, kit);
  if (p) return hglFirst(p);
  const n = String(a.name || '').trim();
  if (n) return n.split(/\s+/)[0];
  return String(a.email || '').split('@')[0] || 'Someone';
}
/** People (ids) who were at the meeting: attendees matched to People, not those who declined. */
function _wuPeopleIds(m) {
  const out = [];
  for (const a of m.attendees || []) if (a && a.personId && a.response !== 'declined' && !out.includes(a.personId) && typeof getPerson === 'function' && getPerson(a.personId)) out.push(a.personId);
  return out;
}
function _wuNames(m, kit) { return wuNamesText((m.attendees || []).filter(a => a.response !== 'declined').map(a => _wuFirstOf(a, kit))); }
function _wuAvatars(m, kit, max) {
  const list = (m.attendees || []).filter(a => a.response !== 'declined');
  const shown = list.slice(0, max);
  let html = '';
  for (const a of shown) {
    const p = _wuPerson(a.personId, kit);
    if (p) { html += homeAvatar(p, 22); continue; }
    const nm = String(a.name || a.email || '?');
    html += `<span class="avatar" style="--size:22px;--c:var(--sw-slate)" title="${escAttr(nm)}">${esc(typeof avatarInitials === 'function' ? avatarInitials(nm) : nm.slice(0, 1).toUpperCase())}</span>`;
  }
  if (list.length > shown.length) html += `<span class="avatar wu-more-av" style="--size:22px">+${list.length - shown.length}</span>`;
  return html ? `<span class="wu-avs" aria-hidden="true">${html}</span>` : '';
}

/* ---------- which card is open for a meeting (the current row) ---------- */
function _wuCardFor(id) {
  try {
    if (typeof _tc === 'undefined' || !_tc || _tc.closing || typeof _tcCur !== 'function') return null;
    const c = _tcCur();
    if (c && c.kind === 'event' && c.id === id) return 'event';
    if (c && c.kind === 'create' && c.draft && c.draft.eventId === id) return 'followup';
  } catch (e) { /* no card */ }
  return null;
}
function _wuIsCurrent(id) { return _wuOpen === id || !!_wuCardFor(id); }
function _wuTrackCurrent(li, id, focusEl) {
  if (_wuIsCurrent(id)) li.setAttribute('aria-current', 'true');
  (focusEl || li).addEventListener('focus', () => { if (!_wuIsCurrent(id)) li.removeAttribute('aria-current'); });
}
function _wuMarkCurrent(li) {
  for (const el of document.querySelectorAll('.wu-row[aria-current="true"]')) if (el !== li) el.removeAttribute('aria-current');
  if (li) li.setAttribute('aria-current', 'true');
}

/* ---------- drafts (what the user typed, per meeting) ---------- */
function _wuDraft(id) {
  let d = _wuDrafts.get(id);
  if (!d) {
    d = { text: '', sel: null, ticks: new Set(), fu: { on: false, title: '', due: '2wd' } };
    _wuDrafts.set(id, d);
    if (_wuDrafts.size > 30) _wuDrafts.delete(_wuDrafts.keys().next().value);
  }
  return d;
}

/* ---------- render ---------- */
function _wuRender(el, ctx) {
  const size = ['s', 'm', 'l'].includes(ctx.size) ? ctx.size : 'm';
  if (ctx.preview) return _wuPaint(el, ctx, size, _wuSampleRows(homeSample('wrapup')), { kit: _homeSampleKit() });
  // No calendar connected and nothing from one (a snapshot still counts: its age shows in the foot).
  const connected = !(window.Connections && typeof Connections.has === 'function') || Connections.has('calendar');
  const ready = _wuCalReady();
  const loading = !ready && typeof CalStore !== 'undefined' && !!(CalStore && CalStore.st && CalStore.st.loading);
  if (!connected && !loading && !(ready && calAllEvents().length)) {
    const card = _wuCard(el, ctx, size, '');
    card.querySelector('.card-b').appendChild(ctx.off({ icon: 'calendar', title: 'Connect a calendar', text: 'Then the meetings you have just had wait here for a note or a follow-up.', action: { label: 'Connect', run: () => Connections.open('calendar') } }));
    return true;
  }
  if (!ready) return false;                                     // the store's first load repaints Home
  const rows = wuMeetingsToWrap(_wuPrefs(ctx));
  if (!rows.some(m => m.id === _wuOpen)) _wuOpen = null;          // its meeting left (wrapped up elsewhere)
  homeTick(ctx, () => _wuTickFn(ctx));
  if (!rows.length) {
    if (!(_wuCleared && Date.now() - _wuCleared < _WU_CLEARED_MS)) return false;
    return _wuPaintCleared(el, ctx, size);
  }
  _wuCleared = 0;
  // L offers a thank-you: ask once whether Gmail drafts work (cached; the widget repaints when it knows).
  if (size === 'l' && window.GmailDraft && typeof GmailDraft.info === 'function') homeData('wrapup:gmail-drafts', () => GmailDraft.info().then(j => (j ? { fake: !!j.fake } : null)), { ctx, maxAge: 10 * 60000, sig: String(typeof _serverAvailable === 'undefined' || !!_serverAvailable) });
  return _wuPaint(el, ctx, size, rows, {});
}
/** The minute tick: "ended … ago" in place; a repaint only when the list itself changed. */
function _wuTickFn(ctx) {
  const frame = document.querySelector('#main-body .hg-w[data-wid="wrapup"]');
  if (!frame) return;
  const shown = frame.querySelector('.wu') ? frame.querySelector('.wu').dataset.ids || '' : null;
  if (_wuCleared && Date.now() - _wuCleared >= _WU_CLEARED_MS) { _wuCleared = 0; return 'rerender'; }
  const ids = wuMeetingsToWrap(_wuPrefs(null)).map(m => m.id).join(',');
  if (shown === null ? ids !== '' : shown !== ids) return 'rerender';
  for (const s of frame.querySelectorAll('[data-ended]')) {
    const end = Number(s.dataset.ended);
    if (Number.isFinite(end)) s.textContent = 'Ended ' + wuEndedText(Math.max(0, Math.round((Date.now() - end) / 60000)), _wuDayDiff(end));
  }
}

function _wuCard(el, ctx, size, n) {
  const card = document.createElement('section');
  card.className = `card home-card wu wu--${size}`;
  const head = hglHead({ icon: 'clipboard-list', title: 'After meetings', n });
  if (!ctx.preview && !ctx.editing && typeof homeSettingsButton === 'function') head.appendChild(homeSettingsButton(ctx, 'After meetings settings'));
  card.appendChild(head);
  const body = document.createElement('div'); body.className = 'card-b wu-b';
  card.appendChild(body);
  el.appendChild(card);
  return card;
}

function _wuPaint(el, ctx, size, rows, o) {
  const kit = o.kit || null;
  if (ctx.firstPaint && !kit) _wuAll = false;
  const card = _wuCard(el, ctx, size, rows.length > 1 && size !== 's' ? String(rows.length) : '');   // S says it in big type
  card.dataset.ids = kit ? '' : rows.map(m => m.id).join(',');
  const body = card.querySelector('.wu-b');
  if (size === 's') {
    const sum = document.createElement('p'); sum.className = 'wu-sum';
    const n = rows.length;
    sum.innerHTML = `<b class="num">${n}</b> <span>meeting${n === 1 ? '' : 's'} to wrap up</span>`;
    body.appendChild(sum);
  }
  const cap = size === 's' ? 1 : size === 'l' ? 6 : 4;
  const shown = _wuAll && size !== 's' ? rows : rows.slice(0, cap);
  const list = document.createElement('ul'); list.className = 'wu-list';
  for (const m of shown) list.appendChild(_wuRow(m, ctx, size, kit));
  body.appendChild(list);
  const foot = _wuFoot(ctx, size, rows.length, cap, !!kit);
  if (foot) body.appendChild(foot);
  if (!kit) {
    homeRowKeys(list, {
      open: (id, r) => _wuOpenEvent(id, r),
      done: (id, r) => { const li = r.closest('.wu-row'); const m = rows.find(x => x.id === id); if (li && m) _wuNothing(m, li); },
      keys: {
        n: (id, r) => { const m = rows.find(x => x.id === id); if (m) _wuNoteOpen(m, ctx); },
        f: (id, r) => { const m = rows.find(x => x.id === id); const li = r.closest('.wu-row'); if (m) _wuFollowUpOpen(m, li && li.querySelector('[data-act="fu"]'), li); },
      },
    });
    if (ctx.enterNew) ctx.enterNew(list.children, (li) => li.dataset.flip);
    if (size !== 's' && typeof homeSuggestSlot === 'function') homeSuggestSlot(body, ctx);
    if (_wuOpenFresh) {
      _wuOpenFresh = false;
      const panel = list.querySelector('.wu-panel');
      const ta = panel && panel.querySelector('textarea');
      if (panel && window.Motion) Motion.expand(panel);
      if (ta) setTimeout(() => { if (ta.isConnected) { try { ta.focus({ preventScroll: true }); const d = _wuDraft(_wuOpen); const p = d.sel == null ? ta.value.length : d.sel; ta.setSelectionRange(p, p); } catch (e) { /* gone */ } } }, 0);
    }
  }
  return true;
}

function _wuRow(m, ctx, size, kit) {
  const li = document.createElement('li');
  li.className = 'wu-row hgl-row';
  li.dataset.flip = 'wu:' + m.id; li.dataset.ev = m.id;
  const tid = 'wu-t-' + (kit ? 'p' + (++_wuPreviewSeq) : String(m.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) + '-' + (++_wuPreviewSeq));
  li.setAttribute('role', 'group'); li.setAttribute('aria-labelledby', tid);
  const names = _wuNames(m, kit);
  const ended = kit ? 'Ended ' + wuEndedText(m.endedMin, m.endedMin >= 1440 ? Math.floor(m.endedMin / 1440) : 0) : _wuEnded(m);
  const meta = [`<span${kit ? '' : ` data-ended="${escAttr(String(m.end))}"`}>${esc(ended)}</span>`];
  if (size !== 's' && m.minutes) meta.push(`<span class="wu-dur">${esc(_wuDur(m.minutes))}</span>`);
  if (names) meta.push(`<span class="wu-who">${esc(names)}</span>`);
  const main = document.createElement('button'); main.type = 'button'; main.className = 'wu-main';
  if (!kit) { main.setAttribute('data-row', m.id); main.setAttribute('aria-keyshortcuts', 'Enter N F X'); }
  main.setAttribute('aria-label', `${m.title}, ${ended.toLowerCase()}${names ? ', with ' + names : ''}. Open the event`);
  main.innerHTML = (size !== 's' ? _wuAvatars(m, kit, size === 'l' ? 4 : 3) : '')
    + `<span class="wu-txt"><span class="wu-tt" id="${escAttr(tid)}">${esc(m.title)}</span>`
    + `<span class="wu-meta">${meta.join('<span class="wu-dot" aria-hidden="true"> · </span>')}${m.hasNotes ? `<span class="wu-has">${icon('notebook-pen', 'i-xs')}Has notes</span>` : ''}</span></span>`;
  main.onclick = () => _wuOpenEvent(m.id, main);
  li.appendChild(main);
  li.appendChild(_wuActs(m, ctx, size, kit, li));
  if (!kit && _wuOpen === m.id) li.appendChild(_wuPanel(m, ctx, size, li));
  if (!kit) _wuTrackCurrent(li, m.id, main);
  return li;
}

function _wuBtn(cls, ic, label, o) {
  o = o || {};
  const b = document.createElement('button'); b.type = 'button'; b.className = cls;
  b.innerHTML = icon(ic) + (o.iconOnly ? '' : `<span>${esc(label)}</span>`);
  b.setAttribute('aria-label', o.aria || label);
  if (o.tip) b.setAttribute('data-tip', o.tip);
  if (o.kbd) b.setAttribute('data-kbd', o.kbd);
  b.tabIndex = -1;                                    // the row's main button is its one Tab stop (keys N, F, X)
  if (o.act) b.dataset.act = o.act;
  return b;
}
function _wuActs(m, ctx, size, kit, li) {
  const acts = document.createElement('div'); acts.className = 'wu-acts';
  const small = size === 's';
  const t = m.title;
  const note = _wuBtn('hgl-mini wu-b-note', 'notebook-pen', 'Note', { iconOnly: small, aria: `Write a note on ${t}`, tip: small ? 'Note' : 'Write a note', kbd: 'N', act: 'note' });
  if (_wuOpen === m.id) { note.setAttribute('aria-pressed', 'true'); note.classList.add('is-on'); }
  else note.setAttribute('aria-pressed', 'false');
  note.onclick = () => { if (!kit) _wuNoteOpen(m, ctx); };
  acts.appendChild(note);
  const split = document.createElement('span'); split.className = 'wu-split';
  const fu = _wuBtn('hgl-mini wu-b-fu', 'list-todo', 'Follow-up', { iconOnly: small, aria: `Follow-up task for ${t}: opens a new task, filled in`, tip: 'Follow-up task (opens it filled in)', kbd: 'F', act: 'fu' });
  fu.onclick = () => { if (!kit) _wuFollowUpOpen(m, fu, li); };
  const ok = _wuBtn('hgl-mini wu-ok', 'check', 'Add the follow-up now', { iconOnly: true, aria: `Add the follow-up for ${t} now`, tip: 'Add it now · Undo', act: 'fu-ok' });
  ok.onclick = () => { if (!kit) _wuFollowUpNow(m, ok, li); };
  split.append(fu, ok);
  acts.appendChild(split);
  if (size === 'l' && (m.others || 0) <= _WU_THANKS_MAX) {      // a thank-you suits a small meeting, not an all-hands
    const thanks = _wuThanksSplit(m, kit);
    if (thanks) acts.appendChild(thanks);
  }
  const done = _wuBtn('hgl-mini wu-b-done', 'check-check', 'Nothing needed', { iconOnly: small, aria: `Nothing needed for ${t}: mark it wrapped up`, tip: 'Nothing needed', kbd: 'X', act: 'done' });
  done.onclick = () => { if (!kit) _wuNothing(m, li); };
  acts.appendChild(done);
  return acts;
}

/* ---------- the foot: more, stale calendar ---------- */
function _wuFoot(ctx, size, total, cap, preview) {
  const foot = document.createElement('div'); foot.className = 'hgl-foot wu-foot';
  let any = false;
  if (!preview && typeof CalStore !== 'undefined' && CalStore && typeof CalStore.age === 'function') {
    const age = CalStore.age();
    if (age !== null && age > _WU_STALE_MS) {
      const at = CalStore.data && CalStore.data.fetchedAt ? Date.parse(CalStore.data.fetchedAt) : NaN;
      const run = typeof CalStore.running === 'function' && CalStore.running();
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm wu-upd';
      b.innerHTML = icon('refresh-cw') + `<span>${esc(run ? 'Updating calendar…' : Number.isFinite(at) ? `Updated ${_wuDayDiff(at) === 0 ? _wuHM(at) : _wuDayShort(at)}` : 'Update calendar')}</span>`;
      b.title = 'The calendar was last updated a while ago: update it now';
      if (run) { b.disabled = true; b.setAttribute('aria-busy', 'true'); }
      b.onclick = () => { if (!(typeof CalStore.running === 'function' && CalStore.running())) { CalStore.update({ force: true }); b.disabled = true; b.querySelector('span').textContent = 'Updating calendar…'; } };
      foot.appendChild(b); any = true;
    }
  }
  if (size !== 's' && total > cap) {
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost btn-sm wu-more';
    more.innerHTML = `<span>${_wuAll ? 'Show less' : `+${total - cap} more`}</span>${icon(_wuAll ? 'chevron-up' : 'chevron-down')}`;
    more.setAttribute('aria-expanded', _wuAll ? 'true' : 'false');
    more.onclick = () => { if (preview) return; _wuAll = !_wuAll; if (ctx.rerender) ctx.rerender(); };
    foot.appendChild(more); any = true;
  } else if (size === 's' && total > 1) {
    const s = document.createElement('span'); s.className = 'wu-later';
    s.textContent = `${total - 1} more after this one`;
    foot.appendChild(s); any = true;
  }
  return any ? foot : null;
}

/* ---------- "All wrapped up" (right after the last one) ---------- */
function _wuPaintCleared(el, ctx, size) {
  const card = _wuCard(el, ctx, size, '');
  card.dataset.ids = '';
  const box = document.createElement('div'); box.className = 'wu-clear';
  const art = typeof animSceneHtml === 'function' ? animSceneHtml('review', { size: size === 's' ? 'md' : 'lg', once: true }) : '';
  box.innerHTML = `<span class="wu-clear-art" data-scene-key="wu:cleared">${art || icon('check-check')}</span><div><b>All wrapped up</b><span>Notes and follow-ups are in. The next meeting shows here when it ends.</span></div>`;
  card.querySelector('.wu-b').appendChild(box);
  return true;
}

/* ---------- actions ---------- */
function _wuOpenEvent(id, fromEl) {
  if (_wuCardFor(id) === 'event') return;                      // already open: a no-op
  const li = fromEl && fromEl.closest ? fromEl.closest('.wu-row') : null;
  _wuMarkCurrent(li);
  if (typeof openEvent === 'function') openEvent(id, { from: fromEl || null, context: 'home' });
}
/** The row leaves (Motion.collapse), then fn() writes; focus goes to the next row. */
function _wuLeave(li, m, fn) {
  if (!li || li.dataset.leaving === '1') return;
  li.dataset.leaving = '1';
  const list = li.parentElement;
  const sib = li.nextElementSibling || li.previousElementSibling;
  const nextId = sib && sib.dataset ? sib.dataset.ev : null;
  const hadFocus = li.contains(document.activeElement);
  if (list && list.children.length === 1 && wuMeetingsToWrap(_wuPrefs(null)).length <= 1) _wuCleared = Date.now();   // the last one: the "All wrapped up" moment
  const go = () => {
    try { fn(); } catch (e) { console.error('[wrapup]', e); toast(typeof netErrorMessage === 'function' ? netErrorMessage(e, 'That did not work') : 'That did not work', { kind: 'err' }); }
    // Keyboard focus was in the row (or went to the page with it): the next row takes it.
    const a = document.activeElement;
    if (!hadFocus && a && a !== document.body) return;
    const frame = document.querySelector('#main-body .hg-w[data-wid="wrapup"]');
    const to = frame && ((nextId && frame.querySelector(`.wu-row[data-ev="${CSS.escape(nextId)}"] .wu-main`)) || frame.querySelector('.wu-main') || frame.querySelector('.hgl-h h3'));
    if (to) { if (!to.hasAttribute('tabindex') && to.tagName === 'H3') to.tabIndex = -1; try { to.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
  };
  if (window.Motion && li.isConnected) Motion.collapse(li, go); else go();
}
function _wuNothing(m, li) {
  if (calIsWrapped(m.id)) return;
  _wuLeave(li, m, () => {
    if (_wuOpen === m.id) _wuOpen = null;
    if (!calAnnotate(m.id, { wrapped: true }, { toast: false })) return;
    toast(`Wrapped up: ${m.title}`, { kind: 'ok', icon: 'check', action: { label: 'Undo', run: () => calAnnotate(m.id, { wrapped: false }, { toast: false }) } });
    homeAnnounce(`Wrapped up ${m.title}`);
  });
}

/* Follow-up: the prefilled task card (main) or at once (✓). */
function _wuFollowUpPrefill(m) {
  const d = _wuDrafts.get(m.id);
  const choices = wuDueChoices(todayStr(), typeof homeWorkHours === 'function' ? homeWorkHours().days : null);
  const due = choices.find(c => c.key === ((d && d.fu.due) || '2wd')) || choices[0];
  const people = _wuPeopleIds(m);
  let stream = null;
  try {
    const open = getAllItems().filter(t => statusOf(t.id) !== 'done').map(t => ({ stream: t.stream, people: typeof effPeople === 'function' ? effPeople(t) : (t.people || []) }));
    stream = wuGuessStream(open, people);
  } catch (e) { stream = null; }
  return {
    title: (d && d.fu.title.trim()) || wuFollowUpTitle(m.title), date: due.date, people, eventId: m.id,
    detail: wuDetail(m.title, _wuWhenText(m), _wuNames(m, null)), ...(stream && typeof STREAMS !== 'undefined' && STREAMS[stream] ? { stream } : {}),
  };
}
function _wuFollowUpOpen(m, btn, li) {
  if (_wuCardFor(m.id) === 'followup') return;                 // its card is open: the user's edits stay
  _wuMarkCurrent(li);
  const pre = _wuFollowUpPrefill(m);
  if (typeof tcOpenCreate === 'function') tcOpenCreate(pre, { from: btn || li || null });
  else if (typeof openNewTask === 'function') openNewTask(pre.title, { from: btn || null });
}
function _wuFollowUpNow(m, btn, li) {
  if (!btn || btn.dataset.done === '1') return;
  btn.dataset.done = '1';
  const pre = _wuFollowUpPrefill(m);
  _wuLeave(li, m, () => {
    if (_wuOpen === m.id) _wuOpen = null;
    let id = null;
    selUndoGroup(() => {
      calAnnotate(m.id, { wrapped: true }, { toast: false, render: false });
      id = addCustomTask(pre.title, pre.date, 'p0', [], pre.stream || null, 'none', { people: pre.people, detail: pre.detail });
      if (id) calAnnotate(m.id, { linkTasks: [id] }, { toast: false, render: false });
    });
    render();
    if (!id) return;
    toast(`Follow-up added: ${pre.title}`, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
    homeAnnounce(`Wrapped up ${m.title}: follow-up added`);
  });
}

/* Note: the box in place. */
function _wuNoteOpen(m, ctx) {
  if (_wuOpen === m.id) {                                      // already open: focus it, change nothing
    const ta = document.querySelector(`#main-body .wu-row[data-ev="${CSS.escape(m.id)}"] .wu-panel textarea`);
    if (ta) try { ta.focus({ preventScroll: true }); } catch (e) { /* gone */ }
    return;
  }
  _wuOpen = m.id; _wuOpenFresh = true;
  if (ctx && ctx.rerender) ctx.rerender(); else homeRerenderWidget('wrapup');
}
function _wuNoteClose(m, ctx) {
  if (_wuOpen !== m.id) return;
  _wuOpen = null;
  if (ctx && ctx.rerender) ctx.rerender(); else homeRerenderWidget('wrapup');
  const b = document.querySelector(`#main-body .wu-row[data-ev="${CSS.escape(m.id)}"] .wu-main`);
  if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
function _wuPanel(m, ctx, size, li) {
  const d = _wuDraft(m.id);
  const panel = document.createElement('div'); panel.className = 'wu-panel';
  panel.dataset.flip = 'wup:' + m.id;
  const nid = 'wu-n-' + (++_wuPreviewSeq);
  const ta = document.createElement('textarea');
  ta.className = 'control wu-note'; ta.id = nid; ta.rows = size === 's' ? 3 : 4; ta.maxLength = 2000;
  ta.dataset.fk = 'wu-note:' + m.id;
  ta.placeholder = 'What was decided? What happens next?';
  ta.value = d.text;
  const lab = document.createElement('label'); lab.className = 'sr-only'; lab.htmlFor = nid; lab.textContent = `Notes on ${m.title}`;
  panel.append(lab, ta);
  // People ticks: "Also add to Sam's notes" (attendees matched to People).
  const ppl = _wuPeopleIds(m).map(pid => getPerson(pid)).filter(p => p && !p.self).slice(0, 4);
  let ticks = null;
  if (ppl.length) {
    ticks = document.createElement('div'); ticks.className = 'wu-ticks'; ticks.setAttribute('role', 'group'); ticks.setAttribute('aria-label', 'Also add the note to people\'s notes');
    for (const p of ppl) {
      const l = document.createElement('label'); l.className = 'wu-tick';
      const c = document.createElement('input'); c.type = 'checkbox'; c.checked = d.ticks.has(p.id); c.dataset.pid = p.id;
      c.onchange = () => { if (c.checked) d.ticks.add(p.id); else d.ticks.delete(p.id); };
      l.append(c, Object.assign(document.createElement('span'), { textContent: `Also add to ${hglFirst(p)}'s notes` }));
      ticks.appendChild(l);
    }
    panel.appendChild(ticks);
  }
  // L: the follow-up line (prefilled title + due chip), saved with the note in one step.
  let fuOn = null, fuTitle = null;
  if (size === 'l') {
    const line = document.createElement('div'); line.className = 'wu-fu';
    fuOn = document.createElement('input'); fuOn.type = 'checkbox'; fuOn.checked = !!d.fu.on; fuOn.id = nid + '-fu';
    const fl = document.createElement('label'); fl.htmlFor = fuOn.id; fl.className = 'wu-fu-l'; fl.textContent = 'Follow-up task';
    fuTitle = document.createElement('input'); fuTitle.className = 'input input-sm wu-fu-t'; fuTitle.maxLength = 300;
    fuTitle.value = d.fu.title || wuFollowUpTitle(m.title); fuTitle.setAttribute('aria-label', 'Follow-up task title');
    fuTitle.dataset.fk = 'wu-fu:' + m.id;
    const due = document.createElement('button'); due.type = 'button'; due.className = 'chip wu-due'; due.setAttribute('aria-haspopup', 'menu');
    const paintDue = () => {
      const ch = wuDueChoices(todayStr(), homeWorkHours().days);
      const c = ch.find(x => x.key === d.fu.due) || ch[0];
      due.innerHTML = icon('calendar', 'i-xs') + `<span>${esc(c.date ? 'Due ' + dueLabel(c.date) : 'No date')}</span>` + icon('chevron-down', 'i-xs');
      due.setAttribute('aria-label', `Due date: ${c.date ? dueLabel(c.date) : 'none'}. Change it`);
    };
    paintDue();
    const sync = () => { saveBtn.disabled = !(ta.value.trim() || fuOn.checked); };
    fuOn.onchange = () => { d.fu.on = fuOn.checked; sync(); };
    fuTitle.oninput = () => { d.fu.title = fuTitle.value; if (!fuOn.checked && fuTitle.value.trim()) { fuOn.checked = true; d.fu.on = true; sync(); } };
    due.onclick = () => {
      const ch = wuDueChoices(todayStr(), homeWorkHours().days);
      openMenu(due, ch.map(c => ({ label: c.label, hint: c.date && dueLabel(c.date) !== c.label ? dueLabel(c.date) : '', checked: c.key === d.fu.due, run: () => {
        if (c.key === d.fu.due) return;                       // the current choice does nothing
        d.fu.due = c.key; d.fu.on = true; fuOn.checked = true; paintDue(); sync();
      } })), { align: 'start' });
    };
    line.append(fuOn, fl, fuTitle, due);
    panel.appendChild(line);
  }
  const bar = document.createElement('div'); bar.className = 'wu-pacts';
  const saveBtn = document.createElement('button'); saveBtn.type = 'button'; saveBtn.className = 'btn btn-primary btn-sm';
  saveBtn.dataset.act = 'save';
  saveBtn.innerHTML = icon('check') + '<span>Save and wrap up</span>';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-ghost btn-sm'; cancel.textContent = 'Cancel';
  cancel.dataset.act = 'cancel';
  const hint = document.createElement('span'); hint.className = 'wu-hint'; hint.innerHTML = '<kbd class="kbd">Ctrl</kbd><kbd class="kbd">Enter</kbd>';
  bar.append(saveBtn, cancel, hint);
  panel.appendChild(bar);
  saveBtn.disabled = !(d.text.trim() || (size === 'l' && d.fu.on));
  ta.oninput = () => { d.text = ta.value; d.sel = ta.selectionStart; saveBtn.disabled = !(ta.value.trim() || (fuOn && fuOn.checked)); };
  ta.onkeyup = ta.onclick = () => { d.sel = ta.selectionStart; };
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); if (!saveBtn.disabled) saveBtn.click(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); _wuNoteClose(m, ctx); }
  });
  cancel.onclick = () => _wuNoteClose(m, ctx);
  saveBtn.onclick = () => _wuSaveNote(m, li, size, saveBtn);
  if (d.sel != null) { try { ta.setSelectionRange(d.sel, d.sel); } catch (e) { /* not rendered */ } }
  return panel;
}
function _wuSaveNote(m, li, size, btn) {
  if (btn && btn.dataset.done === '1') return;
  const d = _wuDraft(m.id);
  const text = wuNoteLine(d.text);
  const fu = size === 'l' && d.fu.on ? _wuFollowUpPrefill(m) : null;
  if (!text && !fu) return;
  if (btn) btn.dataset.done = '1';
  const day = _wuDayShort(m.start);
  const pids = text ? [...d.ticks].filter(pid => getPerson(pid)) : [];
  _wuLeave(li, m, () => {
    _wuOpen = null;
    let id = null;
    selUndoGroup(() => {
      calAnnotate(m.id, Object.assign({ wrapped: true }, text ? { appendNotes: text } : {}), { toast: false, render: false });
      for (const pid of pids) addPersonNote(pid, wuPersonNote(text, m.title, day));
      if (fu) {
        id = addCustomTask(fu.title, fu.date, 'p0', [], fu.stream || null, 'none', { people: fu.people, detail: fu.detail });
        if (id) calAnnotate(m.id, { linkTasks: [id] }, { toast: false, render: false });
      }
    });
    render();
    const what = [text ? 'note saved' : '', pids.length ? `added to ${pids.length === 1 ? hglFirst(getPerson(pids[0])) + "'s" : pids.length + ' people\'s'} notes` : '', id ? 'follow-up added' : ''].filter(Boolean).join(', ');
    toast(`Wrapped up: ${m.title}${what ? ' · ' + what : ''}`, { kind: 'ok', icon: 'check', action: { label: 'Undo', run: () => undo() } });
    homeAnnounce(`Wrapped up ${m.title}`);
  });
}

/* Thank-you (L): the draft editor prefilled; ✓ saves the draft as it is. Never sends. */
function _wuThanksPrefill(m) {
  const plan = wuThanksPlan(m.attendees, {
    emailsOf: (pid) => { const p = getPerson(pid); return p && typeof pplPersonEmails === 'function' ? pplPersonEmails(p) : []; },
    firstOf: (pid) => { const p = getPerson(pid); return p ? hglFirst(p) : ''; },
  });
  const me = String((typeof userName === 'function' && userName()) || '').split(/\s+/)[0] || '';
  const dr = wuThanksDraft({ title: m.title, first: plan.first, me, when: _wuWhenWord(m.start) });
  return { plan, prefill: plan.to.length ? { to: plan.to, cc: plan.cc, subject: dr.subject, body: dr.body, purpose: 'note' } : null, draft: dr };
}
function _wuDraftsOn() { return !!(window.GmailDraft && typeof GmailDraft.available === 'function' && GmailDraft.available()); }
function _wuThanksSplit(m, kit) {
  const t = m.title;
  const done = !kit && _wuThanked.has(m.id);
  const split = document.createElement('span'); split.className = 'wu-split';
  const b = _wuBtn('hgl-mini wu-b-ty', done ? 'mail-check' : 'mail', done ? 'Thank-you drafted' : 'Thank-you', { aria: done ? `A thank-you for ${t} is drafted in Gmail` : `Thank-you for ${t}: opens a draft, filled in (never sent)`, tip: done ? 'Drafted in Gmail (not sent)' : 'Draft a thank-you (never sent)', act: 'thanks' });
  b.setAttribute('aria-pressed', done ? 'true' : 'false');
  if (done) { b.dataset.done = '1'; b.classList.add('is-done'); }
  b.onclick = () => { if (!kit) _wuThanksOpen(m, b); };
  split.appendChild(b);
  const on = kit ? true : _wuDraftsOn();
  if (on && !done && (kit || _wuThanksPrefill(m).prefill)) {
    const ok = _wuBtn('hgl-mini wu-ok', 'check', 'Save the thank-you draft now', { iconOnly: true, aria: `Save a thank-you draft for ${t} now (not sent)`, tip: 'Save the draft now · Undo', act: 'thanks-ok' });
    ok.onclick = () => { if (!kit) _wuThanksNow(m, ok); };
    split.appendChild(ok);
  }
  return split;
}
function _wuThanksOpen(m, btn) {
  if (_wuThanked.has(m.id) || (btn && btn.dataset.done === '1')) return;
  const x = _wuThanksPrefill(m);
  if (x.prefill && _wuDraftsOn()) {
    GmailDraft.openEditor(x.prefill, { title: 'Draft a thank-you', onSaved: () => { _wuThanked.add(m.id); homeRerenderWidget('wrapup'); } });
    return;
  }
  // No Gmail drafts (or nobody in People): the mail app, which never sends by itself.
  const to = x.plan.all.slice(0, 6);
  if (!to.length) { toast('There is no email address to write to.', { kind: 'err' }); return; }
  const q = `subject=${encodeURIComponent(x.draft.subject)}&body=${encodeURIComponent(x.draft.body)}`;
  hglOpenMail('mailto:' + to.map(a => encodeURIComponent(a).replace(/%40/g, '@')).join(',') + '?' + q);
}
function _wuThanksNow(m, btn) {
  if (_wuThanked.has(m.id)) return;
  const x = _wuThanksPrefill(m);
  if (!x.prefill) return;
  homeAction(btn, async () => {
    const r = await GmailDraft.quick(x.prefill, { onSaved: () => { _wuThanked.add(m.id); }, onUndone: () => { _wuThanked.delete(m.id); homeRerenderWidget('wrapup'); } });
    if (!r || !r.ok) return false;
    homeRerenderWidget('wrapup');
    return r;
  }, { say: `Thank-you drafted for ${m.title}` });
}

/* ---------- the gallery's sample ---------- */
function _wuSample(kit) {
  const now = Date.now();
  const mk = (id, title, endedMin, minutes, people, extra) => ({
    id, title, endedMin, minutes, start: now - (endedMin + minutes) * 60000, end: now - endedMin * 60000,
    attendees: people.map(pid => ({ personId: pid, name: ((kit.people || []).find(p => p.id === pid) || {}).name || '', response: 'accepted' })), people, others: people.length, ...(extra || {}),
  });
  return [
    mk('sample-w1', 'Design review with Acme', 40, 60, ['sample-jo', 'sample-alex']),
    mk('sample-w2', 'Planning with Sam', 210, 45, ['sample-sam'], { hasNotes: true }),
    mk('sample-w3', 'Weekly sync', 60 * 22, 30, ['sample-sam', 'sample-alex', 'sample-jo']),
  ];
}
function _wuSampleRows(x) { return Array.isArray(x) ? x : []; }
