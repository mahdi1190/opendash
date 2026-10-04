/* ============================================================
   HOME widget "habits": Habits & routines (WIDGETS_CATALOGUE.md 3.12).
   OWNER: the "habits" widget builder (Phase 1, wave 1). Styles: 13-home-w-habits.css.
   The pure model (which tasks, the chain, streaks, words) is 12-home-habits-logic.js;
   tests: tests/home-w-habits.test.mjs.

   Repeating tasks shown as habits, with a chain and a one-tap tick. No habits store:
   a habit is a repeating task (prefs.mode: auto = #habit tasks if any exist, else
   daily / weekday / weekly / fortnightly ones; tag = only the tag; all = every
   repeating task), ticked through the completion log, skipped through its
   `occurrence` activity, so MCP clients, the assistant and the Tasks views agree.

   S   today's habits as large toggle pills (name + streak); done ones show a tick.
       Nothing today: when the next ones are.
   M   a row per habit: the tick, the name with "done 11 of the last 14 days", dots for
       the last prefs.days days, the streak and the best.
   L   a card per habit: an 8-week heatmap, the streak, the best and the 30-day rate.

   Actions (each one undo step, through the page helpers):
     Tick       toggleDone(id): the task rolls to its next date; its toast offers Undo.
                A habit done today (or this week) is pressed and inert: a re-click does nothing.
     Skip       markWontDo(id): skips one occurrence and keeps the chain (toast with Undo).
     New habit  the user's rule (3 Oct): the main button (and Enter) opens the task card in
                create mode, prefilled (the name, every day, from today, the habit tag); Save
                adds it. The small check (and Ctrl+Enter) adds it as it is at once, with Undo
                (addCustomTask). Pressing the main button again while that card is open does
                nothing, so the user's edits stay.
     Track      (empty state) a repeating task the view leaves out: its name opens the task
                card; the check adds the habit tag at once, with Undo.
     Open       a row or card opens its task (the centre card); the open one is highlighted
                (aria-current); clicking it again does nothing.
   Motion, only on the user's own tick: the pill or tick bursts (animBurst) and the streak
   number rolls up by one. Every habit of today done: a celebration once a day (the date is
   the UI key homeUI.habitsCelebrated). Entrance (dots, heatmap, pills) once per entry. With
   reduced motion none of it plays.
   ============================================================ */
registerHomeWidget({
  id: 'habits', title: 'Habits & routines', icon: 'repeat', order: 210, group: 'wellbeing',
  description: 'Repeating tasks as habits, with streaks and a one-tap tick',
  sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, fresh: true,
  aliases: ['habits', 'habit', 'routines', 'routine', 'streaks', 'habit tracker'],
  defaults: { mode: 'auto', tag: 'habit', days: 14 },
  available: () => true,
  sample: (kit) => _habSample(kit),
  render(el, ctx) { return _habRender(el, ctx); },
  settings(anchor, ctx) { return _habSettings(anchor, ctx); },
  unmount() { _hab.ticked = null; },
});

/* Session-only UI (per widget copy): the input's text, the new-habit row, "+N more". */
const _hab = { ticked: null, text: new Map(), adding: new Set(), more: new Set(), draftKey: null };
const _HAB_MAX = { s: 5, m: 8, l: 6 };

function _habReduced() {
  return !!(window.Motion && Motion.prefersReduced()) || (typeof animEnabled === 'function' && !animEnabled());
}
function _habWeekStart() { return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.weekStart) || 'Mon'; }

/* ---------- the model ---------- */
function _habBuild(tasks, completions, activity, p, today) {
  const isOpen = (t) => (typeof statusOf === 'function' ? statusOf(t.id) !== 'done' : true);
  const pick = homeHabitPick(tasks, { mode: p.mode, tag: p.tag, isOpen });
  const list = pick.list.map(t => Object.assign(homeHabitStats(t, {
    completions: (completions && completions[t.id]) || [], activity: (activity && activity[t.id]) || [],
    today, days: p.days, weekStart: _habWeekStart(),
  }), { id: t.id, title: String(t.title || ''), task: t }));
  // Today's ones first (in their stable order), then the rest: nothing jumps when one is ticked.
  const shown = list.filter(h => h.showToday).concat(list.filter(h => !h.showToday));
  const ids = new Set(list.map(h => h.id));
  // Repeating tasks this view leaves out (monthly ones; untagged ones in Tagged mode): the empty state offers them.
  const others = list.length ? [] : homeHabitOrder((tasks || []).filter(t => t && homeHabitKind(t.recurrence) && !ids.has(t.id) && isOpen(t))).slice(0, 3);
  return { today, pick, list: shown, totals: homeHabitTotals(list), others };
}
function _habModel(ctx) {
  const p = ctx.prefs || homePrefs(ctx);
  if (ctx.preview) {
    const s = homeSample('habits') || {};
    return _habBuild(s.tasks || [], s.completions || {}, s.activity || {}, p, todayStr());
  }
  return homeMemo('habits:' + ctx.id, homeMemoSig({ extra: [p.mode, p.tag, p.days, _habWeekStart()] }),
    () => _habBuild(getAllItems(), state.completionLog || {}, state.taskActivity || {}, p, todayStr()));
}
/** The gallery's sample: three habits with real chains, run through the same model (synthetic). */
function _habSample(kit) {
  // Days and wall times on the page's clock (Clock, travel spec 2.7).
  const iso = (back) => Clock.addDays(String(kit.today), -back);
  const at = (back, h) => Clock.at(iso(back), (h || 9) * 60);
  const tasks = [], completions = {}, activity = {};
  (kit.habits || []).forEach((h, i) => {
    const rec = h.recur || 'daily';
    const step = rec === 'weekly' ? 7 : rec === 'biweekly' ? 14 : 1;
    const ts = [];
    const first = h.doneToday ? 0 : step;
    for (let j = 0; j < (h.streak || 0); j++) ts.push(at(first + j * step, 8 + i));
    const gap = first + (h.streak || 0) * step + step;          // one missed, then the best run
    for (let j = 0; j < (h.best || 0); j++) ts.push(at(gap + j * step, 8 + i));
    const oldest = gap + (h.best || 0) * step + 2;
    tasks.push({ id: h.id, title: h.title, recurrence: rec, tags: ['habit'], createdAt: at(oldest), dueDate: h.doneToday ? iso(-step) : iso(0), priority: 'p0' });
    completions[h.id] = ts.sort((a, b) => a - b);
    activity[h.id] = [];
  });
  return { tasks, completions, activity };
}

/* ---------- words ---------- */
let _habFmt = null;
function _habDate(iso, withYear) {
  const dt = new Date(String(iso) + 'T00:00:00');
  if (isNaN(dt)) return String(iso || '');
  const t = todayStr();
  if (iso === t) return 'today';
  if (iso === Clock.addDays(t, 1)) return 'tomorrow';
  if (typeof _tbShortDate === 'function') return _tbShortDate(iso, true);
  try {
    if (!_habFmt) _habFmt = new Intl.DateTimeFormat((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    return _habFmt.format(dt) + (withYear ? ' ' + dt.getFullYear() : '');   // clock-ok: wall date
  } catch (e) { return String(iso); }
}
function _habUnit(h) { return h.kind === 'period' ? ({ weekly: 'week', biweekly: 'fortnight', monthly: 'month' })[h.rec] || 'period' : 'day'; }
function _habCellWord(h, s) {
  const u = _habUnit(h);
  return ({
    done: 'done', extra: 'done (a rest day)', skipped: 'skipped', missed: 'missed', due: 'today', open: `this ${u}, open`,
    cover: `${u} done`, skipcover: `${u} skipped`, lapse: `${u} missed`, off: 'rest day', before: 'before it started', future: '',
  })[s] || '';
}
function _habRecLabel(h) { return typeof recurrenceLabel === 'function' ? recurrenceLabel(h.rec) : h.rec; }
/** The row's line under the name: how often, then how it is going (or when it starts / comes next). */
function _habSub(h) {
  if (h.now === 'before') return `${_habRecLabel(h)} · starts ${_habDate(h.next || h.start)}`;
  if (h.now === 'later' && h.next) return `${_habRecLabel(h)} · next ${_habDate(h.next)}`;
  return `${_habRecLabel(h)} · ${homeHabitSummary(h)}`;
}
function _habDoneNow(h) { return h.doneToday || h.now === 'done'; }
function _habSkippedNow(h) { return !_habDoneNow(h) && (h.skippedToday || h.now === 'skipped'); }

/* ---------- render ---------- */
function _habRender(el, ctx) {
  const m = _habModel(ctx);
  const size = ctx.size === 'l' ? 'l' : ctx.size === 'm' ? 'm' : 's';
  const t = m.totals;
  const empty = !m.list.length;
  const adding = empty || _hab.adding.has(ctx.id);
  const card = document.createElement('section');
  card.className = `card home-card hab hab-${size}` + (t.allDone ? ' is-alldone' : '');
  const count = t.due ? `${t.done}/${t.due}` : (empty ? '' : String(m.list.length));
  const countSay = t.due ? `${t.done} of ${t.due} done today` : `${m.list.length} habit${m.list.length === 1 ? '' : 's'}`;
  card.innerHTML = `<div class="card-h">${icon('repeat')}<h3>Habits</h3>`
    + (count ? `<span class="n num" aria-label="${escAttr(countSay)}" title="${escAttr(countSay)}">${esc(count)}</span>` : '')
    + `<span class="spacer"></span>`
    + (!empty ? `<button type="button" class="btn-icon btn-sm hab-add" data-act="adding" aria-expanded="${adding ? 'true' : 'false'}" aria-label="New habit" data-tip="New habit">${icon(adding ? 'x' : 'plus')}</button>` : '')
    + `</div><div class="card-b hab-b"></div>`;
  if (!ctx.preview && typeof homeSettingsButton === 'function') card.querySelector('.card-h').appendChild(homeSettingsButton(ctx, 'Habits settings'));
  el.appendChild(card);
  const body = card.querySelector('.hab-b');
  if (empty) _habEmpty(body, ctx, m, size);
  else {
    if (size === 's') _habPills(body, ctx, m);
    else if (size === 'm') _habRows(body, ctx, m);
    else _habCards(body, ctx, m);
    if (t.allDone) body.insertAdjacentHTML(size === 's' ? 'beforeend' : 'afterbegin', `<div class="hab-alldone" role="status"><span class="hab-ad-i">${icon('party-popper')}</span><span>All done today</span></div>`);
    if (adding) body.appendChild(_habNewForm(ctx, m));
    if (size !== 's' && typeof homeSuggestSlot === 'function') homeSuggestSlot(body, ctx, { habits: m.list.map(h => h.id) });
  }
  _habWire(card, ctx, m);
  if (typeof homeGrowEntering === 'function' && !ctx.preview) homeGrowEntering(card, 'habits:' + ctx.id, ctx.firstPaint);
  if (!ctx.preview) {
    ctx.enterNew(body.querySelectorAll('.hab-pw, .hab-row, .hab-card'), (x) => 'h:' + x.dataset.id);
    _habAfterTick(card, ctx, m);
  }
  return true;
}

function _habTickHtml(h, cls) {
  const done = _habDoneNow(h), skipped = _habSkippedNow(h);
  const u = _habUnit(h);
  const when = h.kind === 'period' ? `this ${u}` : 'today';
  const label = done ? `${h.title}: done ${when}` : skipped ? `${h.title}: skipped ${when}`
    : h.tickable ? `Tick off ${h.title}` : h.now === 'before' ? `${h.title}: starts ${_habDate(h.next || h.start)}` : h.next ? `${h.title}: next ${_habDate(h.next)}` : `${h.title}: not due now`;
  return `<button type="button" class="${cls}${done ? ' is-done' : ''}${skipped ? ' is-skipped' : ''}" data-act="tick" data-fk="hab-tick:${escAttr(h.id)}" aria-pressed="${done ? 'true' : 'false'}"`
    + `${h.tickable ? '' : ' aria-disabled="true"'} aria-label="${escAttr(label)}" title="${escAttr(done ? 'Done. Undo is in the toast' : skipped ? 'Skipped' : h.tickable ? 'Tick it off' : '')}">`
    + `${icon(done ? 'check' : skipped ? 'redo-2' : h.tickable ? 'circle' : 'circle-dashed')}</button>`;
}
function _habSkipHtml(h) {
  if (!h.tickable) return '<span class="hab-skip-ph" aria-hidden="true"></span>';
  const u = _habUnit(h);
  return `<button type="button" class="btn-icon btn-sm hab-skip" data-act="skip" aria-label="Skip ${h.kind === 'period' ? 'this ' + u : 'today'}: ${escAttr(h.title)}" data-tip="Skip ${h.kind === 'period' ? 'this ' + u : 'today'} (keeps the chain)">${icon('redo-2')}</button>`;
}
function _habCurrent(id) { try { return typeof tcCurrentTaskId === 'function' && tcCurrentTaskId() === id; } catch (e) { return false; } }
function _habMoreHtml(n, open) {
  if (n <= 0 && !open) return '';
  return `<button type="button" class="hab-more" data-act="more" aria-expanded="${open ? 'true' : 'false'}">${open ? 'Show fewer' : `+${n} more`}</button>`;
}

/* S: today's habits as large toggle pills. */
function _habPills(body, ctx, m) {
  const today = m.list.filter(h => h.showToday);
  if (!today.length) {
    const next = m.list.filter(h => h.next && (h.now === 'later' || h.now === 'before' || h.now === 'open' || h.now === 'off' || h.now === 'done'))
      .slice().sort((a, b) => String(a.next).localeCompare(String(b.next))).slice(0, 3);
    const safe = m.list.some(h => h.streak > 0);
    body.innerHTML = `<div class="hab-none">${icon('circle-check')}<div><b>Nothing due today</b>${safe ? `<span>Your ${m.list.length === 1 ? 'streak is' : 'streaks are'} safe.</span>` : ''}</div></div>`
      + (next.length ? `<ul class="hab-next" role="list">${next.map(h => `<li class="hab-nx" data-id="${escAttr(h.id)}"><button type="button" class="hab-nx-b" data-act="open" aria-label="${escAttr(`${h.title}: ${_habSub(h)}`)}"><span class="hab-t">${esc(h.title)}</span><span class="hab-nx-d">${esc(_habDate(h.next))}</span></button></li>`).join('')}</ul>` : '');
    return;
  }
  const open = _hab.more.has(ctx.id);
  const shown = open ? today : today.slice(0, _HAB_MAX.s);
  body.innerHTML = `<div class="hab-pills" role="group" aria-label="Today's habits">${shown.map((h, i) => {
    const done = h.doneToday, skipped = !done && _habSkippedNow(h);
    return `<span class="hab-pw${done ? ' is-done' : ''}${skipped ? ' is-skipped' : ''}" data-id="${escAttr(h.id)}" style="--i:${i}">`
      + `<button type="button" class="hab-pill${done ? ' is-done' : ''}${skipped ? ' is-skipped' : ''}" data-act="tick" data-fk="hab-pill:${escAttr(h.id)}" aria-pressed="${done ? 'true' : 'false'}"`
      + `${h.tickable ? '' : ' aria-disabled="true"'} aria-label="${escAttr(homeHabitSay(h.title, h))}">`
      + `<span class="hab-ck" aria-hidden="true">${icon(done ? 'check' : skipped ? 'redo-2' : 'circle')}</span>`
      + `<span class="hab-pt">${esc(h.title)}</span>`
      + `<span class="hab-sn${h.streak ? '' : ' is-zero'}" aria-hidden="true">${icon('flame')}<b class="num">${esc(h.streak)}</b></span>`
      + `</button>${h.tickable ? _habSkipHtml(h) : ''}</span>`;
  }).join('')}</div>` + _habMoreHtml(today.length - shown.length, open && today.length > _HAB_MAX.s);
}

/* M: a row per habit, dots for the last prefs.days days. */
function _habRows(body, ctx, m) {
  const open = _hab.more.has(ctx.id);
  const shown = open ? m.list : m.list.slice(0, _HAB_MAX.m);
  body.innerHTML = `<ul class="hab-rows" role="list">${shown.map((h) => {
    const sum = homeHabitSummary(h), u = _habUnit(h);
    const cur = _habCurrent(h.id);
    return `<li class="hab-row${_habDoneNow(h) ? ' is-done' : ''}${cur ? ' tc-current' : ''}" data-id="${escAttr(h.id)}" ${homeRowAttrs(h.id, `${h.title}: ${h.streak}-${u} streak, best ${h.best}, ${sum}`)}${cur ? ' aria-current="true"' : ''}>`
      + _habTickHtml(h, 'hab-tk')
      + `<span class="hab-nm" title="${escAttr(`${h.title} · ${_habRecLabel(h)}`)}"><span class="hab-t">${esc(h.title)}</span><span class="hab-sub">${esc(h.now === 'before' || h.now === 'later' ? _habSub(h) : sum)}</span></span>`
      + `<span class="hab-dots" style="--n:${h.cells.length}" aria-hidden="true">${h.cells.map((c, i) => `<i class="c-${c.state}" style="--i:${Math.round(i * Math.min(1, 14 / h.cells.length) * 10) / 10}" title="${escAttr(`${_habDate(c.date)}: ${_habCellWord(h, c.state)}`)}"></i>`).join('')}</span>`
      + `<span class="hab-st" aria-hidden="true"><span class="hab-sn${h.streak ? '' : ' is-zero'}">${icon('flame')}<b class="num">${esc(h.streak)}</b></span><small>best ${esc(h.best)}</small></span>`
      + _habSkipHtml(h) + `</li>`;
  }).join('')}</ul>` + _habMoreHtml(m.list.length - shown.length, open && m.list.length > _HAB_MAX.m);
}

/* L: a card per habit with an 8-week heatmap. */
function _habCards(body, ctx, m) {
  const open = _hab.more.has(ctx.id);
  const shown = open ? m.list : m.list.slice(0, _HAB_MAX.l);
  body.innerHTML = `<div class="hab-grid">${shown.map((h) => {
    const u = _habUnit(h), sum = homeHabitSummary(h);
    const rate = h.rate == null ? '–' : Math.round(h.rate * 100) + '%';
    const cur = _habCurrent(h.id);
    const days8 = h.heat.filter(c => c.state === 'done' || c.state === 'extra').length;
    let scene = '';
    try {
      // Only a scene that means something: a word in its title, a rule or the user's own pick (not its stream's).
      const a = typeof animForTask === 'function' ? animForTask(h.task) : null;
      const word = a && a.source === 'keyword' ? String(a.why || '').replace(/^[“"]|[”"]$/g, '').toLowerCase() : '';
      const type = a && (a.source === 'rule' || a.source === 'override' || (word && h.title.toLowerCase().includes(word))) ? a.type : '';
      if (type && type !== 'task' && type !== 'event') scene = `<span class="hab-scene" data-scene-key="hab:${escAttr(h.id)}">${homeScene(type, { size: 'sm' })}</span>`;
    } catch (e) { scene = ''; }
    return `<article class="hab-card${_habDoneNow(h) ? ' is-done' : ''}${cur ? ' tc-current' : ''}" data-id="${escAttr(h.id)}" ${homeRowAttrs(h.id, `${h.title}: ${h.streak}-${u} streak, best ${h.best}, ${sum}`)}${cur ? ' aria-current="true"' : ''}>`
      + `<div class="hab-ch">${_habTickHtml(h, 'hab-tk')}<span class="hab-nm"><span class="hab-t">${esc(h.title)}</span><span class="hab-sub">${esc(h.now === 'before' || h.now === 'later' ? _habSub(h) : _habRecLabel(h))}</span></span>${h.tickable ? _habSkipHtml(h) : ''}${scene}</div>`
      + `<div class="hab-cb"><span class="hab-heat" role="img" aria-label="${escAttr(`Last 8 weeks: done on ${days8} day${days8 === 1 ? '' : 's'}`)}">`
      + h.heat.map((c, i) => `<i class="c-${c.state}" style="--c:${Math.floor(i / 7)}" title="${escAttr(c.state === 'future' ? '' : `${_habDate(c.date, true)}: ${_habCellWord(h, c.state)}`)}"></i>`).join('')
      + `</span><dl class="hab-kv"><div class="is-streak"><dt>streak</dt><dd><span class="hab-sn${h.streak ? '' : ' is-zero'}">${icon('flame')}<b class="num">${esc(h.streak)}</b></span></dd></div>`
      + `<div><dt>best</dt><dd class="num">${esc(h.best)}</dd></div><div><dt>last 30 days</dt><dd class="num">${esc(rate)}</dd></div></dl></div>`
      + `<div class="hab-cs">${esc(sum)}</div>`
      + `</article>`;
  }).join('')}</div>` + _habMoreHtml(m.list.length - shown.length, open && m.list.length > _HAB_MAX.l);
}

/* No habits yet: "Make a repeating task a habit", with the input (and repeating tasks to track). */
function _habEmpty(body, ctx, m, size) {
  const modeTxt = m.pick.mode === 'tag' ? `Tasks tagged #${m.pick.tag} show here.` : m.pick.mode === 'all' ? 'Every repeating task shows here.' : 'Daily and weekly repeating tasks show here.';
  body.innerHTML = `<div class="hab-empty">${size === 's' ? '' : `<span class="hab-empty-s">${homeScene('rest', { size: 'md' })}</span>`}<div><h4>Make a repeating task a habit</h4><p>${esc(modeTxt)} Tick one off each day and the chain grows.</p></div></div>`;
  body.appendChild(_habNewForm(ctx, m));
  if (m.others.length && !ctx.preview) {
    const ul = document.createElement('ul'); ul.className = 'hab-others'; ul.setAttribute('role', 'list');
    ul.setAttribute('aria-label', 'Repeating tasks you could track');
    ul.innerHTML = m.others.map(t => `<li class="hab-other" data-id="${escAttr(t.id)}"><button type="button" class="hab-ot" data-act="open" aria-label="${escAttr(`Open ${t.title}`)}">${icon('repeat')}<span class="hab-t">${esc(t.title)}</span><span class="hab-sub">${esc(typeof recurrenceLabel === 'function' ? recurrenceLabel(t.recurrence) : t.recurrence)}</span></button>`
      + `<button type="button" class="btn-icon btn-sm hab-quick" data-act="track" aria-label="${escAttr(`Track ${t.title} as a habit now`)}" data-tip="Track it (adds #${escAttr(m.pick.tag)})">${icon('check')}</button></li>`).join('');
    body.appendChild(ul);
  }
}

/* The new-habit row: the main button opens the prefilled task card; the check adds it now. */
function _habNewForm(ctx, m) {
  const f = document.createElement('div'); f.className = 'hab-new'; f.setAttribute('role', 'group'); f.setAttribute('aria-label', 'New habit');
  const tags = _habNewTags(m);
  f.innerHTML = `<input type="text" class="input input-sm" data-fk="hab-new" maxlength="200" placeholder="New habit, e.g. Stretch" aria-label="New habit name" aria-describedby="hab-hint-${escAttr(ctx.id)}" autocomplete="off">`
    + `<button type="button" class="btn btn-secondary btn-sm hab-new-open" data-act="new-open">${icon('plus')}<span>Add habit</span></button>`
    + `<button type="button" class="btn-icon btn-sm hab-quick" data-act="new-quick" aria-label="Add it now, as it is" data-tip="Add it now (Ctrl+Enter)">${icon('check')}</button>`
    + `<p class="hab-hint" id="hab-hint-${escAttr(ctx.id)}">Every day from today${tags.length ? `, tagged #${esc(tags[0])}` : ''}. Add habit opens it to adjust first.</p>`;
  const inp = f.querySelector('input');
  inp.value = _hab.text.get(ctx.id) || '';
  if (ctx.preview) inp.disabled = true;
  return f;
}
/**
 * The tags a new habit gets. Auto mode while it shows untagged repeating tasks: none (a
 * tagged habit would hide them all, since auto shows only #habit tasks once any exist;
 * the new one repeats daily, so it shows anyway).
 */
function _habNewTags(m) {
  if (m.pick.mode === 'auto' && m.pick.source === 'repeat' && m.list.length) return [];
  return [m.pick.tag];
}

/* ---------- wiring ---------- */
function _habWire(card, ctx, m) {
  if (ctx.preview) return;
  card.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    const host = e.target.closest('[data-id]');
    const id = host && card.contains(host) ? host.dataset.id : null;
    if (b && card.contains(b)) {
      const act = b.dataset.act;
      if (act === 'tick') { e.stopPropagation(); _habDoTick(ctx, m, id, b); return; }
      if (act === 'skip') { e.stopPropagation(); _habDoSkip(ctx, m, id, b); return; }
      if (act === 'adding') { _habToggleAdding(ctx, !_hab.adding.has(ctx.id)); return; }
      if (act === 'new-open') { _habNewOpen(ctx, m, b); return; }
      if (act === 'new-quick') { _habNewQuick(ctx, m, b); return; }
      if (act === 'track') { _habTrack(ctx, m, id, b); return; }
      if (act === 'more') { if (_hab.more.has(ctx.id)) _hab.more.delete(ctx.id); else _hab.more.add(ctx.id); ctx.rerender(); return; }
      if (act === 'open') { _habOpen(ctx, id, host); return; }
      return;                                       // the settings gear and the suggestion handle themselves
    }
    const row = e.target.closest('.hab-row, .hab-card');
    if (row && card.contains(row) && !e.target.closest('.hg-suggest')) _habOpen(ctx, row.dataset.id, row);
  });
  const list = card.querySelector('.hab-rows, .hab-grid');
  if (list) homeRowKeys(list, {
    open: (id, row) => _habOpen(ctx, id, row),
    done: (id, row) => { const b = row.querySelector('[data-act="tick"]'); if (b) _habDoTick(ctx, m, id, b); },
  });
  const inp = card.querySelector('.hab-new input');
  if (inp) {
    inp.addEventListener('input', () => { if (inp.value) _hab.text.set(ctx.id, inp.value); else _hab.text.delete(ctx.id); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        const b = card.querySelector(e.ctrlKey || e.metaKey ? '[data-act="new-quick"]' : '[data-act="new-open"]');
        if (e.ctrlKey || e.metaKey) _habNewQuick(ctx, m, b); else _habNewOpen(ctx, m, b);
      } else if (e.key === 'Escape' && m.list.length && !inp.value) { e.preventDefault(); _habToggleAdding(ctx, false); }
    });
  }
}
function _habToggleAdding(ctx, on) {
  if (on) _hab.adding.add(ctx.id); else _hab.adding.delete(ctx.id);
  ctx.rerender();
  const sel = on ? '.hab-new input' : '[data-act="adding"]';
  const el = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(ctx.id)}"] ${sel}`);
  if (el) try { el.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
function _habOpen(ctx, id, fromEl) {
  if (!id || ctx.preview || !getItem(id)) return;
  if (_habCurrent(id)) return;                     // already open: a re-click does nothing
  ctx.openTask(id, fromEl);
}

/* Tick: one undo step (toggleDone's toast offers Undo). Done today: pressed and inert. */
function _habDoTick(ctx, m, id, btn) {
  if (ctx.preview || !id) return false;
  const h = m.list.find(x => x.id === id);
  if (!h || !h.tickable || (btn && btn.getAttribute('aria-disabled') === 'true')) return false;
  if (!getItem(id) || statusOf(id) === 'done') return false;
  _hab.ticked = { id, wid: ctx.id, from: h.streak, at: Date.now() };
  toggleDone(id);                                  // rolls it to its next date, saves, repaints Home
  return true;
}
/* Skip: one occurrence, the chain kept (markWontDo's toast offers Undo). */
function _habDoSkip(ctx, m, id, btn) {
  if (ctx.preview || !id) return false;
  const h = m.list.find(x => x.id === id);
  if (!h || !h.tickable || !getItem(id)) return false;
  _hab.ticked = null;
  markWontDo(id);
  if (typeof homeAnnounce === 'function') homeAnnounce(`${h.title} skipped; the chain is kept`);
  return true;
}
/* After the user's own tick: the burst, the streak rolling up, and once a day the celebration. */
function _habAfterTick(card, ctx, m) {
  const t = _hab.ticked;
  if (!t || t.wid !== ctx.id) return;
  _hab.ticked = null;                              // once
  if (Date.now() - t.at > 4000) return;
  const h = m.list.find(x => x.id === t.id);
  if (!h || !h.doneToday) return;
  const host = card.querySelector(`[data-id="${CSS.escape(t.id)}"]`);
  const target = host && (host.querySelector('.hab-pill, .hab-tk') || host);
  if (typeof homeAnnounce === 'function') homeAnnounce(`${h.title} done. ${h.streak}-${_habUnit(h)} streak`);
  const celebrate = m.totals.allDone && _habCelebrateOnce(m.today);
  if (_habReduced()) return;
  if (target) target.classList.add('is-ticked');
  // The streak rolls up by one: the old number slides out above, the new one in from below.
  const num = host && host.querySelector('.hab-sn b');
  if (num && h.streak === t.from + 1) {
    num.innerHTML = `<span class="o" aria-hidden="true">${esc(t.from)}</span><span class="n">${esc(h.streak)}</span>`;
    num.classList.add('is-up'); num.parentElement.classList.add('is-up');
  }
  requestAnimationFrame(() => {
    if (celebrate) _habCelebrate(card);
    else if (target && target.isConnected && typeof animBurst === 'function') animBurst(target, 'celebration');
  });
}
/** Every habit of today done: remember the day (UI key homeUI.habitsCelebrated). True the first time today. */
function _habCelebrateOnce(today) {
  const ui = state.homeUI && typeof state.homeUI === 'object' ? state.homeUI : {};
  if (ui.habitsCelebrated === today) return false;
  state.homeUI = Object.assign({}, ui, { habitsCelebrated: today });
  saveUI();
  return true;
}
function _habCelebrate(card) {
  const strip = card.querySelector('.hab-alldone');
  if (!strip || !strip.isConnected) return;
  strip.classList.add('is-celebrating');
  const sc = document.createElement('span'); sc.className = 'hab-ad-scene'; sc.setAttribute('aria-hidden', 'true');
  sc.innerHTML = homeScene('celebration', { size: 'sm', once: true });
  strip.appendChild(sc);
  if (typeof animActivate === 'function') animActivate(strip);
  if (typeof animBurst === 'function') animBurst(strip, 'celebration');
  setTimeout(() => { if (strip.isConnected) strip.classList.remove('is-celebrating'); }, 2400);
}

/* New habit: the main path opens the task card prefilled; nothing is saved before Save. */
function _habNewOpen(ctx, m, btn) {
  if (ctx.preview || typeof tcOpenCreate !== 'function') return false;
  try {     // its card is already open: a no-op, the user's edits stay
    if (typeof _tc !== 'undefined' && _tc && !_tc.closing && _hab.draftKey) {
      const c = _tcCur();
      if (c && c.kind === 'create' && c.draft && c.draft.key === _hab.draftKey) { if (typeof _tcFocusStart === 'function') _tcFocusStart(); return false; }
    }
  } catch (e) { /* the card is not there */ }
  const wid = ctx.id;
  const title = String(_hab.text.get(wid) || '').trim();
  tcOpenCreate({
    title, date: m.today, recurrence: 'daily', priority: 'p0', tags: _habNewTags(m),
    onCreated: () => { _hab.text.delete(wid); _hab.draftKey = null; if (state.view === 'home' && typeof homeRerenderWidget === 'function') homeRerenderWidget(wid); },
  }, { from: btn || null });
  try { const c = _tcCur(); _hab.draftKey = c && c.kind === 'create' && c.draft ? c.draft.key : null; } catch (e) { _hab.draftKey = null; }
  return true;
}
/* The check: add it as it is, at once (one undo step; the toast offers Undo). */
function _habNewQuick(ctx, m, btn) {
  if (ctx.preview) return false;
  const wid = ctx.id;
  const title = String(_hab.text.get(wid) || '').trim();
  if (!title) {
    const inp = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(wid)}"] .hab-new input`);
    if (inp) { inp.placeholder = 'Give it a name first'; try { inp.focus(); } catch (e) { /* gone */ } }
    if (typeof homeAnnounce === 'function') homeAnnounce('Give the habit a name first');
    return false;
  }
  const tags = _habNewTags(m);
  homeAction(btn, () => {
    // The row stays open for the next one (the header's x or Esc closes it); its text goes.
    _hab.text.delete(wid); _hab.adding.add(wid);
    const id = addCustomTask(title, m.today, 'p0', tags, null, 'daily');     // saves and repaints Home
    if (!id) { _hab.text.set(wid, title); return false; }
    return id;
  }, { toast: `Habit added: ${title}`, undo: true, say: `Habit added: ${title}` });
  return true;
}
/* Track a repeating task as a habit: the habit tag, at once, with Undo (its name opens the task to adjust). */
function _habTrack(ctx, m, id, btn) {
  const it = id && getItem(id);
  if (ctx.preview || !it) return false;
  const tags = typeof effTags === 'function' ? effTags(it) : (it.tags || []);
  if (tags.some(x => homeHabitTag(x) === m.pick.tag)) return false;
  homeAction(btn, () => { setOverride(id, 'tags', [...tags, m.pick.tag]); render(); return true; },
    { toast: `Tracking ${it.title} as a habit`, undo: true, say: `Tracking ${it.title} as a habit` });
  return true;
}

/* ---------- settings ---------- */
function _habSettings(anchor, ctx) {
  return homeSettingsMenu(anchor, ctx, [
    { key: 'mode', label: 'Which tasks', type: 'choice', choices: [['auto', 'Auto'], ['tag', 'Tagged'], ['all', 'All repeating']],
      hint: 'Auto: tasks tagged with the habit tag, else daily and weekly repeating tasks' },
    { key: 'tag', label: 'Habit tag', type: 'text', placeholder: 'habit', hint: 'Tagged mode and new habits use it' },
    { key: 'days', label: 'Days of dots', type: 'number', min: 7, max: 60, hint: 'The medium size shows this many days' },
  ], { foot: 'A habit is a repeating task: ticking it here completes it and rolls it to its next date.' });
}
