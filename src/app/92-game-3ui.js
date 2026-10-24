/* ============================================================
   GAME, what you see (2.16): the level chip and streak flame in the top bar,
   the Home card "Quests and streaks", the Achievements page (Life > Achievements
   since 2.18, docs/dev/NAVIGATION_PLAN.md 2.2; the view ids stay game and game:<section>):
     game          Today: level, the bonus task, streaks, this week's quests
     game:wall     Achievements: the wall
     game:records  Records and focus: personal records, focus and estimates
     game:bosses   Bosses: boss tasks
     game:unlocks  Unlockables: accents, animations, and how XP works
   Settings > Game (the Fun level, sounds, accent), the command palette, and the
   task card's Game panel (focus timer, boss bar, XP).
   Every piece respects the Fun level (gameFun(): Off / Subtle / Full);
   the focus timer and the time logged stay at every level.
   ============================================================ */
const _gmUI = { entered: false };
const _GM_FUN = [['off', 'Off', 'circle-x'], ['subtle', 'Subtle', 'sparkles'], ['full', 'Full', 'party-popper']];
const _GM_STREAKS = [
  { id: 'done', label: 'Days with something done', icon: 'flame', unit: 'day' },
  { id: 'inbox', label: 'Inbox zero', icon: 'inbox', unit: 'day' },
  { id: 'focus', label: 'Focus sessions', icon: 'timer', unit: 'day' },
  { id: 'review', label: 'Weekly review', icon: 'calendar-check', unit: 'week' },
  { id: 'nospend', label: 'No-spend days', icon: 'wallet', unit: 'day' },
];
function _gmPlural(n, w) { return `${n.toLocaleString()} ${w}${n === 1 ? '' : 's'}`; }
function _gmShortDay(iso) { try { return new Date(iso + 'T12:00:00Z').toLocaleDateString((APP_CONFIG && APP_CONFIG.locale) || undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); } catch (e) { return iso; } }
function _gmRingSvg(pct, cls) {
  return `<svg class="${cls || 'gm-ring'}" viewBox="0 0 36 36" aria-hidden="true"><circle class="gm-ring-bg" cx="18" cy="18" r="15.5"/><circle class="gm-ring-fg" cx="18" cy="18" r="15.5" pathLength="100" style="stroke-dasharray:${Math.round(pct * 100)} 100"/></svg>`;
}
/** The three Fun levels, each with what it means as its tooltip (SIMPLIFY_PLAN.md 5.13). */
const _GM_FUN_TIPS = { off: 'No chip, moments or sounds. The focus timer stays.', subtle: 'A small chip and quiet toasts.', full: 'Floating XP, combos and confetti moments.' };
function _gmFunSeg() {
  const seg = _settingsSeg(_GM_FUN, gameFun(), (k) => { if (k !== gameFun()) gamePrefSet({ fun: k }); });
  seg.setAttribute('data-whats-new', 'fun-level');   // What's new points here (95-whats-new.js)
  [...seg.querySelectorAll('button')].forEach((b, i) => { const k = _GM_FUN[i] && _GM_FUN[i][0]; if (k && _GM_FUN_TIPS[k]) b.setAttribute('data-tip', _GM_FUN_TIPS[k]); });
  return seg;
}

/* ---------- top bar: the level chip and the streak flame ---------- */
function _gmChipRender(el) {
  if (!gameOn()) { el.innerHTML = ''; return false; }
  const s = gameStats(); if (!s) return false;
  const st = s.streaks.done, lv = s.level;
  const flame = st.current > 0;
  const tip = `Level ${lv.level} ${lv.title} · ${lv.into.toLocaleString()} of ${lv.need.toLocaleString()} XP to level ${lv.level + 1}`
    + (flame ? ` · ${_gmPlural(st.current, 'day')} in a row${st.todayDone ? '' : ' (today still open)'}${st.freezes ? ` · ${st.freezes} streak freeze${st.freezes > 1 ? 's' : ''} ready` : ''}` : '')
    + (s.xp.today ? ` · +${s.xp.today} XP today` : '');
  const key = [lv.level, Math.round(lv.pct * 100), st.current, st.todayDone, st.freezes, gameFun(), s.xp.today].join('|');
  if (el.dataset.k === key && el.firstChild) return true;
  el.dataset.k = key;
  el.innerHTML = `<button type="button" class="gm-chip" aria-label="${escAttr(tip + '. Open Achievements')}" data-tip="${escAttr(tip)}">`
    + `<span class="gm-lv">${_gmRingSvg(lv.pct)}<b class="num">${lv.level}</b></span>`
    + (flame ? `<span class="gm-flame${st.todayDone ? '' : ' is-open'}${st.current >= 30 ? ' is-blaze' : st.current >= 7 ? ' is-hot' : ''}">${icon('flame', 'i-sm')}<b class="num">${st.current}</b>${st.frozen.length ? icon('snowflake', 'i-xs gm-frost') : ''}</span>` : '')
    + (gameFun() === 'full' && s.xp.today ? `<span class="gm-chip-xp num">+${s.xp.today}</span>` : '')
    + '</button>';
  el.querySelector('.gm-chip').onclick = () => setView('game');
  return true;
}
if (typeof registerTopbarWidget === 'function') {
  registerTopbarWidget({
    id: 'game', order: 5,
    render(el) { try { if (typeof gameFocusPaint === 'function' && _gmRunSig() !== _gmT.sig) gameFocusPaint(); } catch (e) { /* not booted */ } return _gmChipRender(el); },
  });
}

/* ---------- Home: "Level and streaks" ---------- */
if (typeof registerHomeWidget === 'function') {
  registerHomeWidget({
    id: 'game', title: 'Quests and streaks', icon: 'trophy', group: 'fun', sizes: ['s', 'm'], defaultSize: 's', page: 'game',
    order: 268, defaultHidden: true,
    description: 'Your level, XP today, your streak and this week\'s quests',
    aliases: ['game', 'level', 'xp', 'streak', 'quests', 'achievements'],
    render(el, ctx) { return _gmHomeRender(el, ctx || {}); },
    refreshKey() { const s = gameStats(); return s ? [gameFun(), s.level.level, s.xp.today, s.streaks.done.current, s.quests.list.map(q => q.n).join(',')].join('|') : ''; },
  });
}
function _gmHomeRender(el, ctx) {
  const card = document.createElement('div'); card.className = 'card gm-home gm-home-' + (ctx.size || 's');
  if (!gameOn()) {
    card.innerHTML = `<div class="gm-home-off"><span class="muted">The game is off.</span></div>`;
    card.querySelector('.gm-home-off').appendChild(uiButton({ label: 'Turn it on', icon: 'sparkles', kind: 'ghost', size: 'sm', run: () => gamePrefSet({ fun: 'subtle' }) }));
    el.appendChild(card); return true;
  }
  const s = gameStats(); if (!s) return false;
  const lv = s.level, st = s.streaks.done;
  card.innerHTML = `<button type="button" class="gm-home-top"><span class="gm-lv gm-lv-lg">${_gmRingSvg(lv.pct)}<b class="num">${lv.level}</b></span>`
    + `<span class="gm-home-t"><span class="subtle overline">${esc(lv.title)}</span><b class="num">${lv.into.toLocaleString()} / ${lv.need.toLocaleString()} XP</b>`
    + `<span class="muted">${s.xp.today ? `+${s.xp.today} XP today` : 'No XP yet today'}${st.current ? ` · ${icon('flame', 'i-xs')} ${st.current}` : ''}</span></span></button>`;
  card.querySelector('.gm-home-top').onclick = () => setView('game');
  if (ctx.size === 'm' && s.quests.list.length) {
    const ul = document.createElement('ul'); ul.className = 'gm-home-q';
    for (const q of s.quests.list) {
      const li = document.createElement('li'); li.className = q.done ? 'is-done' : '';
      li.innerHTML = `${icon(q.done ? 'circle-check' : 'flag', 'i-xs')}<span>${esc(q.label)}</span><span class="num muted">${q.n}/${q.target}</span>`;
      ul.appendChild(li);
    }
    card.appendChild(ul);
  }
  el.appendChild(card);
  return true;
}

/* ---------- the task card: focus timer, boss bar, XP ---------- */
/** The boss bar for a task with 3+ subtasks (one-off), or ''. */
function gameBossBarHtml(t) {
  if (!t || !gameOn() || !_gmIsBoss(t)) return '';
  const subs = t.subtasks, n = subs.length, left = subs.filter(x => !x.done).length;
  const hp = left / n, aw = _gmG().awards['boss:' + t.id];
  const hit = _gm.bossHit && _gm.bossHit.id === t.id && Date.now() - _gm.bossHit.at < 1500 ? _gm.bossHit : null;
  const segs = n <= 20 ? Array.from({ length: n }, (_, i) => `<i class="${i < left ? '' : 'is-gone'}"></i>`).join('') : '';
  return `<div class="gm-boss${left === 0 || aw ? ' is-down' : ''}${hit ? ' is-hit' : ''}" data-boss-id="${escAttr(t.id)}" role="meter" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${left}" aria-label="Boss task: ${left} of ${n} subtasks left">`
    + `<div class="gm-boss-h">${icon('crown', 'i-xs')}<b>${aw || left === 0 ? 'Boss defeated' : 'Boss task'}</b><span class="num muted">${aw || left === 0 ? (aw ? _gmShortDay(aw.d) : '') : `${left} of ${n} left`}</span></div>`
    + `<div class="gm-boss-bar" style="--hp:${hp.toFixed(3)};--hp-from:${(hit ? Math.min(1, hit.from) : hp).toFixed(3)}"><span class="gm-boss-fill"></span>${segs ? `<span class="gm-boss-segs">${segs}</span>` : ''}</div></div>`;
}
/** The Game panel in the card's side column (61-task-card.js). */
function gameTaskCardSlot(id) {
  const t = getItem(id); if (!t) return null;
  const done = statusOf(id) === 'done', on = gameOn();
  const r = gameFocusRun(), mine = r && r.t === id;
  const logged = gameFocusOn(id);
  const box = document.createElement('section'); box.className = 'gm-slot'; box.setAttribute('aria-label', 'Focus and game');
  let html = gameBossBarHtml(t);
  if (!done || logged.n) {
    const learned = on ? gameEstimateFor(t) : null;
    const facts = [];
    if (logged.n) facts.push(`${_gmFmtMs(logged.ms)} logged${logged.n > 1 ? ` over ${logged.n} sessions` : ''}`);
    if (learned && learned.line) facts.push(learned.line + (learned.expected && Number(t.estimate) ? ` (about ${fmtEstimate(learned.expected)})` : ''));
    html += `<div class="gm-slot-focus">${facts.length ? `<span class="muted">${esc(facts.join('. '))}.</span>` : ''}</div>`;
  }
  if (on && !done) {
    const s = gameStats();
    const xp = gameTaskXp(t, Date.now(), { day: todayStr() });
    const bonus = s && s.bonus === id;
    html += `<div class="gm-slot-xp">${icon(bonus ? 'gift' : 'sparkles', 'i-xs')}<span>${xp.light ? 'A light task: up to ' + xp.xp + ' XP' : 'Worth about ' + (bonus ? xp.xp * 2 : xp.xp) + ' XP'}${bonus ? ' · bonus task today, double XP' : ''}</span></div>`;
  }
  box.innerHTML = html;
  if (!done) {
    const f = box.querySelector('.gm-slot-focus') || box.appendChild(Object.assign(document.createElement('div'), { className: 'gm-slot-focus' }));
    const b = mine
      ? uiButton({ label: r.p ? 'Resume timer' : 'Stop and log', icon: r.p ? '' : 'square', size: 'sm', run: () => { if (r.p) gameFocusResume(); else gameFocusStop({}); if (typeof tcRefresh === 'function') tcRefresh(); } })
      : uiButton({ label: 'Focus timer', icon: 'timer', size: 'sm', run: () => { gameFocusStart(id); if (typeof tcRefresh === 'function') tcRefresh(); } });
    f.prepend(b);
  }
  return box.childNodes.length ? box : null;
}
/** The card's footer button (61-task-card.js): start or stop the timer on this task. */
function gameFocusFootBtn(id) {
  const r = gameFocusRun(), mine = r && r.t === id;
  return uiButton({ label: mine ? 'Stop timer' : 'Focus', icon: 'timer', kind: 'ghost', size: 'sm', data: { fk: 'tc-focus' }, bubble: true,
    tip: mine ? 'Stop the focus timer and log the time' : 'Time this task with the focus timer',
    run: () => { if (mine) gameFocusStop({}); else gameFocusStart(id); if (typeof tcRefresh === 'function') tcRefresh(); } });
}

/* ---------- the Achievements page (#view=game, game:<section>; Life > Achievements since 2.18) ---------- */
const GM_PAGE_SECTIONS = Object.freeze([['game', 'Today', 'sun'], ['game:wall', 'Achievements', 'award'], ['game:records', 'Records and focus', 'timer'], ['game:bosses', 'Bosses', 'crown'], ['game:unlocks', 'Unlockables', 'sparkles']]);
function _gmPart(v) { const m = /^game:([a-z]+)$/.exec(String(v || '')); return m && GM_PAGE_SECTIONS.some(x => x[0] === 'game:' + m[1]) ? m[1] : 'today'; }
if (typeof registerSection === 'function') {
  registerSection('game', {
    match: v => v === 'game' || /^game:(wall|records|bosses|unlocks)$/.test(String(v || '')),
    title: () => 'Achievements',
    crumb: v => (_gmPart(v) === 'today' ? [] : [{ label: 'Achievements', view: 'game' }, (GM_PAGE_SECTIONS.find(x => x[0] === v) || [0, ''])[1]]),
    group: 'life', layout: 'page', hashable: true, taskControls: false,
    mount(container, view) { _gmPage(container, view || state.view); },
    // The page header (UX_BLUEPRINT.md 3): no primary action; how it works, its settings and the library under More.
    headerActions: () => ({ more: [
      { label: 'How XP works', icon: 'sparkles', run: () => setView('game:unlocks') },
      { label: 'Game settings', icon: 'settings', run: () => setView('settings:game') },
      { label: 'Animation library', icon: 'layout-grid', run: () => setView('settings:animations') },
    ] }),
    unmount() { _gmUI.entered = false; try { if (typeof _acw !== 'undefined') { _acw.root = null; _acw.body = null; } } catch (e) { /* no Achievements page on this build */ } },
  });
}
if (typeof registerPage === 'function') {
  registerPage({
    id: 'game', view: 'game', match: v => v === 'game' || /^game:[a-z]+$/.test(String(v || '')),
    label: 'Achievements', icon: 'trophy', area: 'life', tab: true, order: 40, since: '2.16', discover: true,
    desc: 'Your level, streaks, quests and achievements',
    keywords: 'game xp level streak streaks quests achievements records focus bosses wall badges unlockables trophies',
    sections: GM_PAGE_SECTIONS.map(x => [x[0], x[1]]),
    off: () => (typeof lifeFunOffState === 'function' ? lifeFunOffState() : null),
    badge: () => { try { const s = gameOn() ? gameStats() : null; return s ? 'Lv ' + s.level.level : ''; } catch (e) { return ''; } },
  });
}
/** A section of the page: the kit's section header (secHead, UI_CLEANUP_PLAN.md 3.2), then its content. */
function _gmSec(title, sub, id) {
  const sec = document.createElement('section'); sec.className = 'gm-sec'; if (id) sec.id = id;
  sec.appendChild(secHead({ title, sub }));
  return sec;
}
function _gmPage(container, view) {
  _gmFinLoad(false);
  const s = gameStats();
  const part = _gmPart(view);
  const root = document.createElement('div'); root.className = 'gm-page gm-part-' + part;
  // The shared header draws the title and the sections (UX_BLUEPRINT.md 3); with Fun Off it shows one calm
  // Turn on (15-nav-life.js), and the numbers below keep counting quietly. The Fun level: Unlockables, Settings > Game.
  const sub = document.getElementById('view-subtitle');
  if (sub) sub.textContent = 'Worked out from what you do. Nothing is ever taken away.';
  // Life › Achievements › Achievements is the Achievements page (92-game-5wall.js, ACHIEVEMENTS_500.md 2.5): this
  // section mounts it for 'game:wall' (its own 'game:wall' section registers later and is only the fallback).
  if (part === 'wall' && typeof gameWallMount === 'function') { container.appendChild(root); gameWallMount(root); return; }
  if (!s) { container.appendChild(root); return; }
  // Today: the hero, streaks and quests, then the Next up strip (the nearest achievements one glance from the quests).
  if (part === 'today') root.append(_gmHero(s), _gmStreaksSec(s), _gmQuestSec(s), _gmWallSec(s));
  else if (part === 'wall') root.append(_gmWallSec(s));
  else if (part === 'records') root.append(_gmRecordsSec(s), _gmFocusSec(s));
  else if (part === 'bosses') root.append(_gmBossSec(s));
  else root.append(_gmUnlockSec(s), _gmRulesSec());
  container.appendChild(root);
  if (!_gmUI.entered) {
    _gmUI.entered = true;
    if (window.Motion && Motion.stagger) Motion.stagger(root, { selector: '.gm-hero, .gm-sec', step: 30, max: 8 });
    const xpEl = root.querySelector('.gm-hero-xp');
    if (xpEl && window.Motion && Motion.countUp) Motion.countUp(xpEl, s.xp.total, { from: Math.max(0, s.xp.total - (s.xp.today || 0)), duration: 700 });
  }
}
function _gmHero(s) {
  const lv = s.level;
  const el = document.createElement('section'); el.className = 'card gm-hero';
  const nextT = lv.next ? `${lv.next.title} at level ${lv.next.level}` : 'the top title';
  const na = lv.nextAccent ? `the ${lv.nextAccent.label} accent at level ${lv.nextAccent.level}` : '';
  el.innerHTML = `<span class="gm-lv gm-lv-xl">${_gmRingSvg(lv.pct)}<b class="num">${lv.level}</b></span>`
    + `<div class="gm-hero-t"><span class="overline">Level ${lv.level}</span><h2>${esc(lv.title)}</h2>`
    + `<div class="gm-xpbar" role="progressbar" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}" aria-label="XP to the next level"><i style="--pct:${(lv.pct * 100).toFixed(1)}%"></i></div>`
    + `<span class="muted num">${lv.into.toLocaleString()} of ${lv.need.toLocaleString()} XP to level ${lv.level + 1} · next: ${esc(nextT)}${na ? ' · ' + esc(na) : ''}</span></div>`
    + `<div class="gm-hero-n"><div><b class="num gm-hero-xp">${s.xp.total.toLocaleString()}</b><span class="muted">XP in all</span></div><div><b class="num">+${s.xp.today.toLocaleString()}</b><span class="muted">today</span></div><div><b class="num">+${s.xp.week.toLocaleString()}</b><span class="muted">this week</span></div></div>`;
  const bt = s.bonus ? getItem(s.bonus) : null;
  if (bt) {
    const done = statusOf(bt.id) === 'done';
    const row = document.createElement('button'); row.type = 'button'; row.className = 'gm-bonus' + (done ? ' is-done' : '');
    row.innerHTML = `${icon('gift', 'i-sm')}<span><b>Bonus task of the day</b><span class="muted">${done ? 'Done: double XP earned.' : 'Double XP if you finish it today.'}</span></span><span class="gm-bonus-t">${esc(effTitle(bt))}</span>`;
    row.onclick = () => openTask(bt.id, { from: row });
    el.appendChild(row);
  }
  return el;
}
function _gmDots(set, frozen, today, unit) {
  const out = [];
  const step = unit === 'week' ? 7 : 1, n = unit === 'week' ? 8 : 14;
  const fz = new Set(frozen || []);
  for (let i = n - 1; i >= 0; i--) {
    const d = Clock.addDays(today, -i * step);
    const cls = set.has(d) ? 'is-on' : fz.has(d) ? 'is-frost' : i === 0 ? 'is-today' : '';
    out.push(`<i class="${cls}" title="${escAttr(_gmShortDay(d))}"></i>`);
  }
  return `<span class="gm-dots" aria-hidden="true">${out.join('')}</span>`;
}
function _gmStreaksSec(s) {
  const sec = _gmSec('Streaks', 'A missed day is covered by a streak freeze: one to start with, one more for every 7 days in a row (2 at most).');
  const grid = document.createElement('div'); grid.className = 'gm-grid gm-streaks';
  const g = _gmG(), sets = {
    done: new Set(Object.keys(s.done.byDay)), inbox: new Set([...Object.keys(g.ticks.inbox || {}), ...Object.keys(typeof seenAll === 'function' ? seenAll('inboxZero') || {} : {})]),
    focus: new Set([...Object.keys(g.ticks.focus || {}), ...s.focus.list.filter(x => x.ms >= 600000).map(x => x.d)]),
    review: _gmReviewWeeks(_gmWs()), nospend: _gm.fin ? _gm.fin.quiet : new Set(),
  };
  for (const def of _GM_STREAKS) {
    const st = s.streaks[def.id];
    const card = document.createElement('div'); card.className = 'card gm-streak' + (st && st.current ? ' is-live' : '');
    if (!st) {
      card.innerHTML = `<div class="gm-streak-h">${icon(def.icon, 'i-sm')}<span>${esc(def.label)}</span></div><span class="muted">Needs Finances: shows when your spending has loaded.</span>`;
      grid.appendChild(card); continue;
    }
    const w = def.unit === 'week' ? 'week' : 'day';
    const status = st.current ? (st.todayDone ? (def.unit === 'week' ? 'This week is done.' : 'Today is done.') : (st.atRisk ? `${def.unit === 'week' ? 'This week' : 'Today'} keeps it going.` : `${def.unit === 'week' ? 'This week' : 'Today'} is still open; a freeze covers it if not.`)) : (st.best ? `Best: ${_gmPlural(st.best, w)}.` : 'Not started yet.');
    card.innerHTML = `<div class="gm-streak-h">${icon(def.icon, 'i-sm')}<span>${esc(def.label)}</span></div>`
      + `<div class="gm-streak-n"><b class="num">${st.current}</b><span class="muted">${w}${st.current === 1 ? '' : 's'} in a row</span></div>`
      + _gmDots(sets[def.id], st.frozen, def.unit === 'week' ? s.week : s.today, def.unit)
      + `<div class="gm-streak-f"><span class="gm-freeze" data-tip="Streak freezes ready">${Array.from({ length: Math.max(1, st.freezes) }, (_, i) => icon('snowflake', 'i-xs' + (i < st.freezes ? '' : ' is-empty'))).join('')}</span><span class="muted">${esc(status)}${st.current && st.best > st.current ? ` Best ${st.best}.` : ''}</span></div>`;
    grid.appendChild(card);
  }
  sec.appendChild(grid);
  return sec;
}
function _gmQuestSec(s) {
  const q = s.quests;
  const sec = _gmSec('This week\'s quests', q.list.length ? `${_gmPlural(q.daysLeft, 'day')} left · 50 XP each, 50 more for all three` : 'They appear once you have some tasks.');
  const grid = document.createElement('div'); grid.className = 'gm-grid gm-quests';
  for (const x of q.list) {
    const card = document.createElement('div'); card.className = 'card gm-quest' + (x.done ? ' is-done' : '');
    const pct = Math.round(100 * x.n / Math.max(1, x.target));
    card.innerHTML = `<span class="gm-quest-ic">${icon(x.done ? 'circle-check' : ({ overdue: 'alarm-clock', review: 'calendar-check', stream: 'layers', focus: 'timer', boss: 'crown', nospend: 'wallet', inbox: 'inbox', people: 'users', old: 'hourglass', p1: 'flag', days: 'calendar-days', total: 'list-checks' })[x.kind] || 'flag', 'i-sm')}</span>`
      + `<div class="gm-quest-t"><b>${x.kind === 'stream' && typeof streamMarkHtml === 'function' ? streamMarkHtml(x.stream) + ' ' : ''}${esc(x.label)}</b>`
      + `<span class="gm-qbar" role="progressbar" aria-valuemin="0" aria-valuemax="${x.target}" aria-valuenow="${x.n}" aria-label="${escAttr(x.label)}"><i style="--pct:${pct}%"></i></span>`
      + `<span class="muted num">${x.kind === 'focus' ? `${x.n} of ${x.target} minutes` : `${x.n} of ${x.target}`}${x.done ? ' · done' : ''}</span></div>`;
    if (x.kind === 'review' && !x.done) card.appendChild(uiButton({ label: 'Review now', icon: 'calendar-range', kind: 'ghost', size: 'sm', run: () => setView('home:week') }));
    if (x.kind === 'overdue' && !x.done) card.appendChild(uiButton({ label: 'Open Today', icon: 'alarm-clock', kind: 'ghost', size: 'sm', run: () => setView('today') }));
    grid.appendChild(card);
  }
  if (q.allDone) { const p = document.createElement('div'); p.className = 'gm-perfect'; p.innerHTML = `${icon('star', 'i-sm')}<span>A perfect week: every quest done.</span>`; sec.appendChild(p); }
  sec.appendChild(grid);
  return sec;
}
function _gmRecordsSec(s) {
  const r = s.records;
  const sec = _gmSec('Personal records', 'Your bests so far.');
  const grid = document.createElement('div'); grid.className = 'gm-grid gm-records';
  const rows = [
    ['zap', 'Most tasks in a day', r.dayMost && `${r.dayMost.v}`, r.dayMost && _gmShortDay(r.dayMost.d)],
    ['calendar-range', 'Most in a week', r.weekMost && `${r.weekMost.v}`, r.weekMost && 'week of ' + _gmShortDay(r.weekMost.d)],
    ['flame', 'Longest streak', r.streak && _gmPlural(r.streak.v, 'day'), s.streaks.done.current ? `now ${s.streaks.done.current}` : ''],
    ['sparkles', 'Most XP in a day', r.xpDay && `${r.xpDay.v.toLocaleString()} XP`, r.xpDay && _gmShortDay(r.xpDay.d)],
    ['timer', 'Longest focus', r.focusLongest && _gmFmtMs(r.focusLongest.v), r.focusLongest && r.focusLongest.d && _gmShortDay(r.focusLongest.d)],
    ['crown', 'Biggest boss', r.bossBig && _gmPlural(r.bossBig.v, 'subtask'), r.bossBig && r.bossBig.d && _gmShortDay(r.bossBig.d)],
    ['piggy-bank', 'Cheapest week', r.cheapestWeek && gameMoney(r.cheapestWeek.v, _gm.fin && _gm.fin.currency), r.cheapestWeek ? 'week of ' + _gmShortDay(r.cheapestWeek.d) : (s.finance ? '' : 'needs Finances')],
  ];
  for (const [ic, label, v, sub] of rows) {
    const c = document.createElement('div'); c.className = 'card gm-record' + (v ? '' : ' is-empty');
    c.innerHTML = `${icon(ic, 'i-sm')}<span class="muted">${esc(label)}</span><b class="num">${esc(v || 'Not yet')}</b><small class="muted">${esc(sub || '')}</small>`;
    grid.appendChild(c);
  }
  sec.appendChild(grid);
  return sec;
}
function _gmFocusSec(s) {
  const f = s.focus;
  const sec = _gmSec('Focus and estimates', 'Time a task with the focus timer (the task card, or Ctrl+K "focus") and it learns how long things really take.');
  const row = document.createElement('div'); row.className = 'gm-focus-row';
  row.innerHTML = `<div class="gm-hero-n"><div><b class="num">${_gmFmtMs(f.todayMs || 0)}</b><span class="muted">today</span></div><div><b class="num">${_gmFmtMs(f.weekMs || 0)}</b><span class="muted">this week</span></div><div><b class="num">${f.sessions.toLocaleString()}</b><span class="muted">sessions</span></div><div><b class="num">${Math.floor(f.totalMs / 3600000).toLocaleString()} h</b><span class="muted">in all</span></div></div>`;
  const run = gameFocusRun();
  const next = run ? null : gameFocusNextTask();
  if (run) row.appendChild(uiButton({ label: 'Stop and log', icon: 'square', size: 'sm', run: () => gameFocusStop({}) }));
  else if (next) row.appendChild(uiButton({ label: `Focus on “${effTitle(getItem(next)).slice(0, 40)}”`, icon: 'timer', kind: 'primary', size: 'sm', run: () => gameFocusStart(next) }));
  sec.appendChild(row);
  const kinds = Object.entries(s.estimates.byKind).filter(([, r]) => r.n >= 3).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  if (!kinds.length) {   // an empty list inside the section: one muted line (UI_CLEANUP_PLAN.md 3.6)
    sec.appendChild(emptyLine(s.estimates.overall ? `So far you take about ${s.estimates.overall.ratio}x your estimates. Three timed tasks of a kind (a tag, or else a stream) give a line here.` : 'Nothing learned yet: give a task an estimate, time it, and finish it.'));
    return sec;
  }
  const ul = document.createElement('ul'); ul.className = 'gm-learn';
  for (const [k, r] of kinds) {
    const line = gameEstimateLine(k, r) || `Your estimates on ${k} are about right`;
    const li = document.createElement('li');
    li.innerHTML = `<span class="gm-ratio num${r.ratio > 1.15 ? ' is-over' : r.ratio < 0.85 ? ' is-under' : ''}">${r.ratio}x</span><span>${esc(line)}.</span><small class="muted">${_gmPlural(r.n, 'timed task')}</small>`;
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}
function _gmBossSec(s) {
  const open = s.bosses.open.map(getItem).filter(Boolean);
  const sec = _gmSec('Boss tasks', `A task with ${GAME_RULES.bossMin} or more subtasks is a boss: every subtask ticked is a hit. ${_gmPlural(s.bosses.defeated.length, 'boss')} defeated so far.`);
  if (!gameOn()) return sec;
  const list = document.createElement('div'); list.className = 'gm-grid gm-bosses';
  for (const t of open.slice(0, 9)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card gm-boss-card';
    b.innerHTML = `<b>${esc(effTitle(t))}</b>${gameBossBarHtml(t)}`;
    b.onclick = () => openTask(t.id, { from: b });
    list.appendChild(b);
  }
  // Empty: the section's teaching empty state (UI_CLEANUP_PLAN.md 3.6): what appears here, and the one action toward it.
  if (!open.length) mountEmptyState(sec, { icon: 'crown', compact: true, title: 'No boss tasks open', text: `Break a big task into ${GAME_RULES.bossMin} or more subtasks to make one.`, actions: [{ label: 'Open All tasks', icon: 'list-checks', run: () => setView('all') }] });
  else sec.appendChild(list);
  return sec;
}
/** The achievements on the Game page: the count, Next up and a link to the whole page (92-game-5wall.js). */
function _gmWallSec(s) {
  if (typeof gameWallSummary === 'function') { try { return gameWallSummary(s); } catch (e) { console.error('[ach] summary', e); } }
  const a = achState(), got = ACH_DEFS.filter(d => a.unlocked[d.id]).length;
  return _gmSec('Achievements', `${got} of ${ACH_DEFS.length} earned. Each stays earned for good.`, 'gm-ach');
}
function _gmUnlockSec(s) {
  const max = s.level.max, g = _gmG();
  const sec = _gmSec('Unlockables', 'Cosmetic only: accent colours and animations for your library, opened by levelling up.');
  const sw = document.createElement('div'); sw.className = 'gm-accents'; sw.setAttribute('role', 'radiogroup'); sw.setAttribute('aria-label', 'Accent colour');
  const cur = String(g.prefs.accent || '');
  for (const a of GAME_ACCENTS) {
    const open = typeof gameAccentOpen === 'function' ? gameAccentOpen(a) : a.level <= max;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'gm-acc' + (open ? '' : ' is-locked'); b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', cur === a.id ? 'true' : 'false');
    if (cur === a.id) b.setAttribute('aria-current', 'true');
    b.style.setProperty('--sw', a.sw);
    const lockAch = !open && typeof achUnlockOf === 'function' ? achDef(a.ach || achUnlockOf('accent', a.id)) : null;
    b.setAttribute('data-tip', open ? a.label : lockAch ? `${a.label}: earn “${lockAch.secret ? '???' : lockAch.name}”` : `${a.label}: level ${a.level}`);
    b.innerHTML = `<i></i><span>${esc(a.label)}</span>${open ? '' : `<small class="num">${icon('lock', 'i-xs')} ${lockAch ? '' : a.level}</small>`}`;
    if (open) b.onclick = () => { if (cur !== a.id) gamePrefSet({ accent: a.id }); };
    else b.disabled = true;
    sw.appendChild(b);
  }
  sec.appendChild(sw);
  if (typeof animItem === 'function' && typeof animItemHtml === 'function') {
    const row = document.createElement('div'); row.className = 'gm-anims';
    for (const [l, ref] of GAME_LEVEL_REWARDS) {
      const it = animItem(ref); if (!it) continue;
      const open = l <= max;
      const f = document.createElement('figure'); f.className = 'gm-anim' + (open ? '' : ' is-locked');
      f.innerHTML = `${animItemHtml(it, { size: 'md', reduced: true })}<figcaption><b>${esc(it.label)}</b><small class="muted">${open ? 'In your library' : 'Level ' + l}</small></figcaption>`;
      row.appendChild(f);
    }
    sec.appendChild(row);
    sec.appendChild(uiButton({ label: 'Open the animation library', icon: 'layout-grid', kind: 'ghost', size: 'sm', run: () => setView('settings:animations') }));
  }
  return sec;
}
function _gmRulesSec() {
  const sec = _gmSec('How XP works', '');
  sec.classList.add('gm-rules');
  const g = _gmG();
  sec.innerHTML += `<ul class="muted">
    <li>A task earns XP by priority (high 30, medium 20, low 12, none 10) and size (its estimate: half for 10 minutes, up to 2.2x for 3 hours or more), plus 2 per subtask. Done by its due date: +10%. A repeating task: 0.6x, once a day.</li>
    <li>No reward for padding: closing a task again counts once; a light task (10 minutes or less, ticked within 3 minutes of adding it, or bare) earns 5, and only the first 8 a day count.</li>
    <li>Focus timer: 1 XP per 5 minutes (40 a day at most). Quests: 50 each, 50 more for all three. Boss tasks: 10 + 5 per subtask. Inbox zero: 15. The bonus task: double.</li>
  </ul>`;
  const row = document.createElement('div'); row.className = 'gm-rules-c';
  row.appendChild(_gmFunSeg());
  const snd = _settingsSwitch(!!g.prefs.sounds, 'Sounds for milestones', (on) => { gamePrefSet({ sounds: on }); if (on) setTimeout(() => gameSound('quest'), 50); });
  const lab = document.createElement('label'); lab.className = 'gm-snd'; lab.append(snd, Object.assign(document.createElement('span'), { textContent: 'Sounds for milestones' }));
  row.appendChild(lab);
  sec.appendChild(row);
  return sec;
}

/* ---------- Settings > Game ---------- */
if (typeof registerSettingsGroup === 'function') {
  registerSettingsGroup({
    id: 'game', title: 'Game', icon: 'trophy', order: 57,
    description: 'Levels, streaks, quests and the focus timer.',
    render(el) {
      const g = _gmG();
      el.appendChild(_settingsRow('Fun level', 'How much of the game you see.', _gmFunSeg()));
      el.appendChild(_settingsRow('Sounds', 'A short chime for level ups and milestones.', _settingsSwitch(!!g.prefs.sounds, 'Sounds', (on) => { gamePrefSet({ sounds: on }); if (on) setTimeout(() => gameSound('level'), 50); })));
      const s = gameStats();
      const acc = _settingsSelect(GAME_ACCENTS.filter(a => !s || (typeof gameAccentOpen === 'function' ? gameAccentOpen(a) : a.level <= s.level.max)).map(a => [a.id, a.label]), String(g.prefs.accent || ''), (v) => gamePrefSet({ accent: v }));
      el.appendChild(_settingsRow('Accent colour', `More open up as you level up (${GAME_ACCENTS.length - 1} in all).`, acc));
      el.appendChild(_settingsRow('Your level, quests and achievements', s ? `Level ${s.level.level} ${s.level.title}, ${s.xp.total.toLocaleString()} XP.` : '', uiButton({ label: 'Open Achievements', icon: 'trophy', size: 'sm', run: () => setView('game') })));
    },
  });
}

/* ---------- the command palette ---------- */
if (typeof registerCommand === 'function') {
  registerCommand({ id: 'game-open', group: 'Go to', label: 'Achievements: level, streaks and quests', icon: 'trophy', keywords: 'game xp level streak quests achievements records wall boss unlock', run: () => setView('game') });
  registerCommand({ id: 'game-wall', label: 'Achievements: search, Next up and every achievement', icon: 'award', keywords: 'achievements wall badges trophies game secrets rarity unlocks titles', run: () => gameOpenWall() });
  registerCommand({ id: 'game-focus-this', group: 'This task', label: 'Focus timer on this task', icon: 'timer', keywords: 'focus timer time track stopwatch pomodoro log', when: () => { const id = typeof tcCurrentTaskId === 'function' ? tcCurrentTaskId() : null; return !!id && !(gameFocusRun() && gameFocusRun().t === id); }, run: () => gameFocusStart(tcCurrentTaskId()) });
  registerCommand({ id: 'game-focus-next', label: 'Focus timer on the next task', icon: 'timer', keywords: 'focus timer time track stopwatch start', when: () => !gameFocusRun() && !!gameFocusNextTask(), run: () => { const id = gameFocusNextTask(); if (id) { gameFocusStart(id); toast(`Focus timer on “${effTitle(getItem(id))}”`, { icon: 'timer' }); } } });
  registerCommand({ id: 'game-focus-stop', label: 'Stop the focus timer and log the time', icon: 'square', keywords: 'focus timer stop log', when: () => !!gameFocusRun(), run: () => gameFocusStop({}) });
  registerCommand({ id: 'game-focus-done', label: 'Focus timer: log it and mark the task done', icon: 'circle-check', keywords: 'focus timer done complete', when: () => !!gameFocusRun(), run: () => gameFocusStop({ done: true }) });
  registerCommand({ id: 'game-focus-pause', label: 'Pause or resume the focus timer', icon: 'timer', keywords: 'focus timer pause resume', when: () => !!gameFocusRun(), run: () => { const r = gameFocusRun(); if (r && r.p) gameFocusResume(); else gameFocusPause(); } });
  for (const [k, label] of _GM_FUN) registerCommand({ id: 'game-fun-' + k, label: `Fun level: ${label}`, icon: 'sparkles', keywords: 'game fun level gamification off subtle full', when: () => gameFun() !== k, run: () => { gamePrefSet({ fun: k }); toast(`Fun level: ${label}`, { icon: 'sparkles' }); } });
  registerCommand({ id: 'game-sounds', label: 'Game sounds on or off', icon: 'music', keywords: 'game sounds chime audio milestone', run: () => { const on = !_gmG().prefs.sounds; gamePrefSet({ sounds: on }); toast(on ? 'Game sounds on' : 'Game sounds off', { icon: 'music' }); if (on) gameSound('quest'); } });
}
