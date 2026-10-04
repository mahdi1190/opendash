/* ============================================================
   ACHIEVEMENTS (v2.2 wave 5), the page side. The rules are pure
   (71-achievements.js: ACH_DEFS, achFacts, achEarned); this file keeps the
   unlocks, plays the unlock moment and draws the panel.
     state.achievements = {v, unlocked: {id: 'YYYY-MM-DD'}, notes: {focus|boss|
                          under-budget|inbox-zero: 'YYYY-MM-DD'}, checked}
                          a UI key (01-core-state.js UI_STATE_KEYS): saved with
                          saveUI, so an unlock never becomes an undo step
     achUnlockedIds()     the earned ids (animLook() reads them: the rewards
                          pack's items and the Golden hour theme open up)
     achNote(kind)        a moment the rules cannot see in the data: a focus
                          block finished (78-anim-moments.js), a boss battle
                          (toggleDone -> achTaskDone), a budget month closed
                          under budget (src/finance/36-budgets.js), inbox zero
                          (78-delight-hooks.js delightInboxSeen)
     achCheck()           evaluate; new unlocks are stored and get one gentle
                          moment (several at once: one quiet toast)
     achPanelRender(el)   Settings > Animations > Achievements, with the recaps
   Gentle: nothing is lost once earned, nothing counts down, nothing nags; the
   panel is the only place they are listed.
   ============================================================ */
const _ach = { timer: 0 };
function achState() {
  const s = typeof state !== 'undefined' && state && state.achievements && typeof state.achievements === 'object' ? state.achievements : {};
  return {
    unlocked: s.unlocked && typeof s.unlocked === 'object' ? Object.assign({}, s.unlocked) : {},
    notes: s.notes && typeof s.notes === 'object' ? Object.assign({}, s.notes) : {},
    checked: !!s.checked,
  };
}
function _achSave(s) {
  state.achievements = { v: 1, unlocked: s.unlocked, notes: s.notes, checked: !!s.checked };
  if (typeof saveUI === 'function') saveUI();
}
function achUnlockedIds() { return Object.keys(achState().unlocked).filter(id => !!achDef(id)); }
function achFactsNow() {
  return achFacts({ log: (typeof state !== 'undefined' && state && state.completionLog) || {}, dayOf: (ts) => Clock.parts(ts).iso, notes: achState().notes });
}
function achNote(kind) {
  if (!ACH_NOTES.includes(kind) || typeof state === 'undefined' || !state) return;
  const s = achState();
  if (s.notes[kind]) return;
  s.notes[kind] = todayStr();
  _achSave(s);
  achCheckSoon(600);
}
/** A task was just closed (toggleDone): a week or more overdue counts as a boss battle. */
function achTaskDone(item, due) {
  const today = todayStr();
  if (due && due < today && clockDaysBetween(due, today) >= (typeof ANIM_BOSS_DAYS === 'number' ? ANIM_BOSS_DAYS : 7)) achNote('boss');
  achCheckSoon(1400);
}
function achCheckSoon(ms) { clearTimeout(_ach.timer); _ach.timer = setTimeout(() => { try { achCheck(); } catch (e) { /* never in the way */ } }, ms == null ? 1500 : ms); }
function achCheck() {
  if (typeof state === 'undefined' || !state) return [];
  const s = achState();
  const fresh = achEarned(achFactsNow(), s.unlocked);
  if (!fresh.length) { if (!s.checked) { s.checked = true; _achSave(s); } return []; }
  const day = todayStr();
  for (const id of fresh) s.unlocked[id] = day;
  s.checked = true;
  _achSave(s);
  if (typeof _agMemo !== 'undefined') _agMemo.key = '';   // today's look may now include a reward
  achUnlockMoment(fresh);
  return fresh;
}
function _achRewardLabel(d) {
  const r = d && d.reward;
  if (!r) return '';
  if (r.theme) { const t = ANIM_THEMES.find(x => x.id === r.theme); return t ? `the ${t.label} theme` : 'a theme'; }
  const it = animItem(r.item);
  return it ? `${it.label} (${_agSlotLabel(it.slot).toLowerCase()})` : 'an animation';
}
/** The unlock moment: one quiet toast; with motion on, the reward's art for a moment. */
function achUnlockMoment(ids) {
  if (!ids || !ids.length) return;
  const open = { label: 'See them', run: () => achOpenPanel() };
  if (ids.length > 1) { toast(`${ids.length} achievements unlocked, each with something new in your animation library.`, { icon: 'award', action: open }); return; }
  const d = achDef(ids[0]);
  if (!d) return;
  toast(`${d.label}. Unlocked: ${_achRewardLabel(d)}.`, { icon: 'award', action: { label: 'See it', run: () => achOpenPanel() } });
  const it = d.reward && d.reward.item ? animItem(d.reward.item) : null;
  const lv = typeof _amLevel === 'function' ? _amLevel() : 'standard';
  if (it && typeof animMomentPlay === 'function') animMomentPlay(it, { center: true, size: 'lg', ms: lv === 'subtle' ? 1300 : 2000, cls: 'ach-moment', caption: d.label });
}
function achOpenPanel() {
  setView('settings:animations');
  requestAnimationFrame(() => setTimeout(() => { const p = document.getElementById('ach-panel'); if (p) p.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60));
}

/* ---------- Settings > Animations > Achievements ---------- */
function achPanelRender(el) {
  const s = achState(), facts = achFactsNow();
  const root = document.createElement('section'); root.className = 'ach'; root.id = 'ach-panel'; root.setAttribute('aria-label', 'Achievements');
  const n = ACH_DEFS.filter(d => s.unlocked[d.id]).length;
  root.innerHTML = `<div class="anim-gallery-h"><h3>Achievements</h3><span class="muted">${n} of ${ACH_DEFS.length} · each one unlocks something for your library. Nothing is ever lost.</span></div>`;
  const grid = document.createElement('div'); grid.className = 'ach-grid';
  for (const d of ACH_DEFS) {
    const got = s.unlocked[d.id], p = achProgress(d, facts);
    const card = document.createElement('div'); card.className = 'ach-card' + (got ? ' is-got' : '');
    const r = d.reward || {};
    const it = r.item ? animItem(r.item) : null;
    const art = it ? animItemHtml(it, { size: 'md', reduced: true })   // still here: the gallery plays it
      : `<span class="ach-theme" data-anim-theme="${escAttr(r.theme || 'calm')}">${(() => { const x = animToday('symbol'); return x ? animItemHtml(x, { size: 'md', reduced: true }) : ''; })()}</span>`;
    const prog = got ? `<span class="ach-when">Earned ${esc(_achDay(got))}</span>`
      : d.of > 1 ? `<span class="ach-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${d.of}" aria-valuenow="${p.n}" aria-label="${escAttr(d.label)}"><i style="--pct:${Math.round(100 * p.n / d.of)}%"></i></span><span class="ach-when num">${p.n} of ${d.of}</span>`
        : '<span class="ach-when">Whenever it happens</span>';
    card.innerHTML = `<span class="ach-ic">${icon(got ? d.icon : 'lock', 'i-sm')}</span><div class="ach-t"><b>${esc(d.label)}</b><span class="muted">${esc(d.hint)}</span>${prog}</div>`
      + `<div class="ach-rw anim-hover-host" data-tip="${escAttr('Unlocks ' + _achRewardLabel(d))}">${art}<small>${esc(got ? 'Unlocked' : 'Unlocks')}: ${esc(it ? it.label : (ANIM_THEMES.find(t => t.id === r.theme) || {}).label || '')}</small></div>`;
    grid.appendChild(card);
  }
  root.appendChild(grid);
  // The recaps (79-story-recap.js)
  if (typeof recapOpen === 'function') {
    const row = document.createElement('div'); row.className = 'ach-recaps';
    const today = todayStr();
    const lastMonth = Clock.addDays(today.slice(0, 8) + '01', -1).slice(0, 7);
    const btn = (label, ic, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.innerHTML = icon(ic, 'i-sm') + `<span>${esc(label)}</span>`; b.onclick = run; return b; };
    row.append(
      btn(`Play my ${today.slice(0, 4)}`, 'sparkles', () => recapOpen('year', today.slice(0, 4))),
      btn('Play this month', 'calendar-days', () => recapOpen('month', today.slice(0, 7))),
      btn('Play last month', 'calendar-days', () => recapOpen('month', lastMonth)));
    root.appendChild(_settingsRow('Your year and month in OpenDash', 'An animated recap from the data on this device: tasks done, your busiest day, streams, people, meetings, money totals and the look of the year. A summary card can be saved as an image from its last moment.', row));
  }
  el.appendChild(root);
}
function _achDay(iso) {
  try { return new Date(String(iso) + 'T12:00:00Z').toLocaleDateString((APP_CONFIG && APP_CONFIG.locale) || undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return String(iso); }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => achCheckSoon(5000), { once: true });
}
