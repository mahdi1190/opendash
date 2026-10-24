/* ============================================================
   ACHIEVEMENTS (v2.2 wave 5; 2.18 B0), the page side. The rules are pure
   (71-ach-0dsl.js the engine, 71-ach-1facts.js the facts, 71-achievements.js the
   core 78, 71-ach-pack-*.js the packs); this file keeps the unlocks, pays their
   XP, plays the moments, shows history once and hands rewards to their owners.
     state.achievements = {v: 2, unlocked: {id: 'YYYY-MM-DD'}, notes: {focus|boss|under-budget|inbox-zero: day},
                           hist: {id: day}      unlocked from history (shown once, as one summary)
                           packs: {packId: day} the day each pack (and 'core') was first checked
                           checked, histSeen (the summary seen or dismissed: day), xpPaid (the core's
                           old unlocks paid their XP: day), histXp (history XP paid so far)}
                          a UI key (01-core-state.js UI_STATE_KEYS): saved with saveUI, never an undo
                          step; synced per unlock (lib/sync/manifest.mjs '── achievements ──')
     achUnlockedIds()     the earned ids (animLook() reads them: the rewards pack's items and the
                          Golden hour theme open up)
     achNote(kind)        a moment the data cannot show: a focus block finished, a boss battle
                          (toggleDone -> achTaskDone), a budget month under budget, inbox zero
     achCheck()           evaluate the LOCKED achievements only (against gameFacts(), 92-game-4facts.js);
                          meta ones last. Each unlock pays its XP once (an internal award 'ach:<id>',
                          k 'ach'). HISTORY: the first check of a pack (and of the core) runs in history
                          mode for the whole session: what was already earned unlocks quietly, at half
                          XP (2,000 at most in all), and is shown ONCE as one calm summary ("You'd already
                          earned these"), never a flood of toasts; the level it brings is taken quietly.
     achRewardLabel(unlock)   'title:Oracle' -> 'the title Oracle' (an owner can name its own:
                          registerAchRewardLabel(kind, fn))
     achRewardOpen(kind, id)  true / false (earned or not) / null (no achievement locks it)
     achRewardsEarned(kind?)  [{kind, id, ach, day}]: what the 2.18 modules (you, wardrobe, garden, pets) read
                          On an unlock: document event 'opendash:ach-reward' {kind, id, ach, hist} and the
                          owner's guarded hook (typeof fn === 'function'): profileAchReward, wardrobeAchReward,
                          gardenAchReward, petAchReward (kind, id, achId, {hist})
     achFeatureOn(name)   is a feature an achievement needs on (finance, locations, travel, calendar,
                          friends, claude, sync, garden, pets, wardrobe, you)? registerAchFeature(name, fn)
     achHistoryPending()  the history unlocks not yet seen in the summary (the wall shows them once)
     achPanelRender(el)   Settings > Animations > Achievements, with the recaps
   Gentle: nothing is lost once earned, nothing counts down, nothing nags.
   ============================================================ */
const _ach = { timer: 0, waits: 0, histSession: new Set(), histNew: [], histXpNew: 0, histTimer: 0, histShown: false, features: new Map(), labels: new Map() };
function achState() {
  const s = typeof state !== 'undefined' && state && state.achievements && typeof state.achievements === 'object' ? state.achievements : {};
  const o = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.assign({}, v) : {});
  return {
    unlocked: o(s.unlocked), notes: o(s.notes), checked: !!s.checked, hist: o(s.hist), packs: o(s.packs),
    histSeen: typeof s.histSeen === 'string' ? s.histSeen : '', xpPaid: typeof s.xpPaid === 'string' ? s.xpPaid : '',
    histXp: Math.max(0, Number(s.histXp) || 0),
  };
}
function _achSave(s) {
  state.achievements = { v: 2, unlocked: s.unlocked, notes: s.notes, checked: !!s.checked, hist: s.hist || {}, packs: s.packs || {}, histSeen: s.histSeen || '', xpPaid: s.xpPaid || '', histXp: s.histXp || 0 };
  if (typeof saveUI === 'function') saveUI();
}
function achUnlockedIds() { return Object.keys(achState().unlocked).filter(id => !!achDef(id)); }
/** The facts view (92-game-4facts.js); without the game module, the old flat facts. */
function achFactsNow() {
  if (typeof gameFacts === 'function') { try { return gameFacts(); } catch (e) { /* the flat facts below */ } }
  let extra = null;
  try { extra = typeof gameAchFacts === 'function' ? gameAchFacts() : null; } catch (e) { extra = null; }
  try { const fx = typeof funAchFacts === 'function' ? funAchFacts() : null; if (fx) extra = Object.assign({}, extra || {}, fx); } catch (e) { /* friends' facts are a bonus */ }
  return achFacts({ log: (typeof state !== 'undefined' && state && state.completionLog) || {}, dayOf: (ts) => Clock.parts(ts).iso, notes: achState().notes, extra });
}
function achNote(kind) {
  if (!ACH_NOTES.includes(kind) || typeof state === 'undefined' || !state) return;
  // every inbox zero and focus block also ticks its streak (92-game-1core.js), not just the first
  if (typeof gameStreakTick === 'function') { try { if (kind === 'inbox-zero') gameStreakTick('inbox'); else if (kind === 'focus') gameStreakTick('focus'); } catch (e) { /* never in the way */ } }
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
  if (typeof gameTaskDone === 'function') gameTaskDone(item);   // XP, the bonus task, boss tasks, quests (92-game-1core.js)
  achCheckSoon(1400);
}
function achCheckSoon(ms) { clearTimeout(_ach.timer); _ach.timer = setTimeout(() => { try { achCheck(); } catch (e) { console.error('[ach]', e); } }, ms == null ? 1500 : ms); }
/** A pack registered after the page started (a 2.18 module): check soon (71-ach-0dsl.js calls this). */
function _achOnPack() { if (typeof _gf !== 'undefined') { _gf.rev++; _gf.key = ''; } if (typeof state !== 'undefined' && state) achCheckSoon(2500); }
const _achMetaMemo = new WeakMap();
function _achIsMeta(d) {
  if (!d || !d.when) return false;
  let v = _achMetaMemo.get(d);
  if (v == null) { v = JSON.stringify(d.when).indexOf('"meta"') >= 0; _achMetaMemo.set(d, v); }
  return v;
}

/* ---------- features an achievement needs ---------- */
function registerAchFeature(name, fn) { if (name && typeof fn === 'function') _ach.features.set(String(name), fn); }
function achFeatureOn(name) {
  const own = _ach.features.get(name);
  if (own) { try { return !!own(); } catch (e) { return false; } }
  const fn = (n) => typeof globalThis !== 'undefined' && typeof globalThis[n] === 'function';
  try {
    switch (name) {
      case 'finance': return !(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.features && APP_CONFIG.features.finance === false) && !!(typeof _gm !== 'undefined' && _gm.fin);
      case 'locations': return fn('locLogOn') ? !!locLogOn() : fn('locationsFacts');
      case 'travel': return typeof TravelStore !== 'undefined' && typeof TravelStore.on === 'function' ? !!TravelStore.on() : false;
      case 'calendar': return typeof GOOGLE_CONNECTED !== 'undefined' && !!GOOGLE_CONNECTED;
      case 'friends': return !!(window.Friends && typeof window.Friends.list === 'function' && window.Friends.list().length);
      case 'claude': return typeof AI_AVAILABLE !== 'undefined' && !!AI_AVAILABLE;
      case 'sync': return true;
      case 'garden': return fn('gardenAchFacts') || fn('gardenGet') || fn('gardenModel');   // integrate 2.18: the garden game (94-garden-1core.js)
      case 'pets': return fn('petAchFacts') || fn('petGet');
      case 'wardrobe': return fn('wardrobeAchFacts') || fn('wardrobeOpen') || fn('profileWardrobeEl');   // integrate 2.18: 97-profile-4wardrobe.js
      case 'you': return fn('youAchFacts') || fn('pfTitle');
      default: return true;
    }
  } catch (e) { return false; }
}
/** Every feature the achievement needs is on. */
function achNeedsOn(d) { return !d || !Array.isArray(d.needs) || d.needs.every(achFeatureOn); }

/* ---------- rewards ---------- */
function registerAchRewardLabel(kind, fn) { if (kind && typeof fn === 'function') _ach.labels.set(String(kind), fn); }
function _achWords(id) { const s = String(id).replace(/^(acc|top|hat|shoes|glasses|scarf)-/, '').replace(/[-_/]+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); }
/** A reward in words: 'seed:moonflower' -> 'Moonflower seeds'. */
function achRewardLabel(unlock) {
  const r = achRewardParse(unlock);
  if (!r) return '';
  const own = _ach.labels.get(r.kind);
  if (own) { try { const v = own(r.id); if (v) return String(v); } catch (e) { /* the default below */ } }
  const w = _achWords(r.id);
  switch (r.kind) {
    case 'title': return `the title “${r.id}”`;
    case 'banner': return `the ${w} profile banner`;
    case 'plate': return `the ${w} nameplate`;
    case 'wear': return `${w} for your wardrobe`;
    case 'seed': return `${w} seeds`;
    case 'decor': return `a ${w.toLowerCase()} for the garden`;
    case 'treat': return `${w} (a pet treat)`;
    case 'accent': { const a = typeof GAME_ACCENTS !== 'undefined' ? GAME_ACCENTS.find(x => x.id === r.id) : null; return `the ${a ? a.label : w} accent colour`; }
    case 'anim': { const it = typeof animItem === 'function' ? animItem(r.id) : null; return it ? `the ${it.label} animation` : 'an animation'; }
    default: return w;
  }
}
/** Is the owner of a reward here? (When not, the card says "with the Garden" and the id waits.) */
function achRewardOwnerOn(unlock) { const r = achRewardParse(unlock); const k = r ? ACH_REWARD_KINDS[r.kind] : null; return !k || !k.needs || achFeatureOn(k.needs); }
function achRewardOpen(kind, id) { const a = achUnlockOf(kind, id); if (!a) return null; return !!achState().unlocked[a]; }
function achRewardsEarned(kind) {
  const un = achState().unlocked, out = [];
  for (const d of ACH_DEFS) {
    if (!d.unlock || !un[d.id]) continue;
    const r = achRewardParse(d.unlock);
    if (r && (!kind || r.kind === kind)) out.push({ kind: r.kind, id: r.id, ach: d.id, day: un[d.id] });
  }
  return out;
}
function _achRewardEmit(d, hist) {
  const r = achRewardParse(d && d.unlock);
  if (!r) return;
  try { document.dispatchEvent(new CustomEvent('opendash:ach-reward', { detail: { kind: r.kind, id: r.id, ach: d.id, hist: !!hist } })); } catch (e) { /* old browser */ }
  const k = ACH_REWARD_KINDS[r.kind], fn = k && typeof globalThis !== 'undefined' ? globalThis[k.hook] : null;
  if (typeof fn === 'function') { try { fn(r.kind, r.id, d.id, { hist: !!hist }); } catch (e) { console.warn('[ach] reward hook ' + k.hook, e); } }
  if (r.kind === 'accent' && typeof gameAccentApply === 'function') { try { gameAccentApply(); } catch (e) { /* never in the way */ } }
}

/* ---------- the check ---------- */
function _achHistXp(s, xp) {
  const pay = Math.max(0, Math.min(Math.round(xp * ACH_HIST_XP.rate), ACH_HIST_XP.cap - s.histXp));
  s.histXp += pay;
  return pay;
}
function _achPay(id, day, xp, hist) {
  if (!(xp > 0) || typeof _gmAwardRaw !== 'function') return 0;
  const rec = { d: day, xp, k: 'ach' };
  if (hist) rec.h = 1;
  return _gmAwardRaw('ach:' + id, rec) ? xp : 0;
}
function achCheck() {
  if (typeof state === 'undefined' || !state) return [];
  // Wait for the state file (99-boot.js -> gameFactsBoot): a pack first checked on an empty cache would
  // later celebrate history as new. Without the game module, carry on after a few tries.
  if (typeof _gf !== 'undefined' && !_gf.booted && _ach.waits < 10) { _ach.waits++; achCheckSoon(3000); return []; }
  const s = achState(), day = todayStr();
  let changed = false;
  for (const id of ['core', ...achPacksAll().map(p => p.id)]) if (!s.packs[id]) { s.packs[id] = day; _ach.histSession.add(id); changed = true; }
  const F = achFactsNow();
  F.unlocked = s.unlocked; F.hist = s.hist;
  const fresh = [];
  const take = (d) => { s.unlocked[d.id] = day; if (_ach.histSession.has(d.pack)) s.hist[d.id] = day; fresh.push(d); };
  const locked = ACH_DEFS.filter(d => !s.unlocked[d.id]);
  for (const d of locked) if (!_achIsMeta(d) && achProgress(d, F).done) take(d);
  for (let pass = 0; pass < 3; pass++) {   // meta ones see this check's unlocks
    let added = 0;
    for (const d of locked) if (!s.unlocked[d.id] && _achIsMeta(d) && achProgress(d, F).done) { take(d); added++; }
    if (!added) break;
  }
  // XP: each unlock once; history at half rate, 2,000 in all at most. The core's earlier unlocks are paid once too.
  let histXp = 0;
  const live = [], hist = [];
  for (const d of fresh) {
    const h = !!s.hist[d.id] && s.hist[d.id] === day && _ach.histSession.has(d.pack);
    (h ? hist : live).push(d.id);
    histXp += _achPay(d.id, day, h ? _achHistXp(s, d.xp) : d.xp, h);
  }
  if (!s.xpPaid) {
    const aw = (state.game && state.game.awards) || {};
    for (const id of Object.keys(s.unlocked)) {
      const d = achDef(id);
      if (!d || aw['ach:' + id] || fresh.includes(d)) continue;
      histXp += _achPay(id, s.unlocked[id], _achHistXp(s, d.xp), true);
    }
    s.xpPaid = day; changed = true;
  }
  if (!fresh.length && !changed && s.checked) return [];
  s.checked = true;
  _achSave(s);
  if (typeof _agMemo !== 'undefined') _agMemo.key = '';   // today's look may now include a reward
  if (typeof _gf !== 'undefined') { _gf.view = null; }
  for (const d of fresh) _achRewardEmit(d, hist.includes(d.id));
  if (histXp > 0) _achQuietLevel();
  if (hist.length || histXp > 0) _achHistQueue(hist, histXp);
  if (live.length) achUnlockMoment(live);
  return fresh.map(d => d.id);
}
/** History XP brings levels quietly (no level-up moment for the past; 92-game-1core.js seen.level). */
function _achQuietLevel() {
  try {
    if (typeof gameStats !== 'function' || !state.game || !state.game.seen || state.game.seen.level == null) return;
    _gm.key = '';
    const st = gameStats(); if (!st) return;
    const g = state.game.seen, lv = st.level.level;
    if (lv > (Number(g.level) || 1)) { g.level = lv; g.levelMax = Math.max(lv, Number(g.levelMax) || 1); if (typeof saveUI === 'function') saveUI(); if (typeof gameAccentApply === 'function') gameAccentApply(); }
  } catch (e) { /* never in the way */ }
}
/** History unlocks of this session, gathered for a few seconds (providers report late), then ONE summary. */
function _achHistQueue(ids, xp) {
  _ach.histNew.push(...ids); _ach.histXpNew += xp;
  if (_ach.histShown) return;   // later ones join the wall's summary quietly
  clearTimeout(_ach.histTimer);
  _ach.histTimer = setTimeout(achHistorySummary, 8000);
}
function achHistoryPending() {
  const s = achState();
  return Object.keys(s.hist).filter(id => achDef(id) && s.unlocked[id] && (!s.histSeen || s.hist[id] > s.histSeen)).sort((a, b) => (achDef(b).xp - achDef(a).xp) || a.localeCompare(b));
}
/** The one calm summary of what history already earned (a toast; the wall lists them until dismissed). */
function achHistorySummary() {
  if (_ach.histShown) return;
  _ach.histShown = true;
  const n = _ach.histNew.length, xp = _ach.histXpNew;
  if (!n && !xp) return;
  if (typeof gameOn === 'function' && !gameOn()) return;   // Fun level Off: the wall still shows them
  const lv = (() => { try { const s = gameStats(); return s ? s.level.level : 0; } catch (e) { return 0; } })();
  const text = n ? `You'd already earned ${n.toLocaleString()} achievement${n === 1 ? '' : 's'} from your history${xp ? ` (+${xp.toLocaleString()} XP${lv ? `, level ${lv}` : ''})` : ''}.`
    : `Your earlier achievements now give XP: +${xp.toLocaleString()}${lv ? ` (level ${lv})` : ''}.`;
  toast(text, { icon: 'award', timeout: 9000, action: { label: 'Have a look', run: () => { if (typeof gameWallOpen === 'function') gameWallOpen('', { filter: 'history' }); else if (typeof gameOpenWall === 'function') gameOpenWall(); } } });
}
/** Mark the summary seen (the wall's Dismiss). */
function achHistorySeen() { const s = achState(); s.histSeen = todayStr(); _achSave(s); }

function _achRewardLabel(d) {
  const r = d && d.reward;
  if (!r) return d && d.unlock ? achRewardLabel(d.unlock) : '';
  if (r.theme) { const t = ANIM_THEMES.find(x => x.id === r.theme); return t ? `the ${t.label} theme` : 'a theme'; }
  const it = animItem(r.item);
  return it ? `${it.label} (${_agSlotLabel(it.slot).toLowerCase()})` : 'an animation';
}
/** The unlock moment: the game plays it by rarity (92-game-1core.js gameAchMoment); else one quiet toast. */
function achUnlockMoment(ids) {
  if (!ids || !ids.length) return;
  if (typeof gameAchMoment === 'function') { try { gameAchMoment(ids); return; } catch (e) { /* fall back to the toast */ } }
  if (ids.length > 1) { toast(`${ids.length} achievements unlocked.`, { icon: 'award', action: { label: 'See them', run: () => achOpenPanel() } }); return; }
  const d = achDef(ids[0]);
  if (!d) return;
  const rw = _achRewardLabel(d);
  toast(`${d.label}.${rw ? ` Unlocked: ${rw}.` : ''}`, { icon: 'award', action: { label: 'See it', run: () => achOpenPanel() } });
  const it = d.reward && d.reward.item ? animItem(d.reward.item) : null;
  const lv = typeof _amLevel === 'function' ? _amLevel() : 'standard';
  if (it && typeof animMomentPlay === 'function') animMomentPlay(it, { center: true, size: 'lg', ms: lv === 'subtle' ? 1300 : 2000, cls: 'ach-moment', caption: d.label });
}
function achOpenPanel() {
  if (typeof gameOpenWall === 'function') { gameOpenWall(); return; }
  setView('settings:animations');
  requestAnimationFrame(() => setTimeout(() => { const p = document.getElementById('ach-panel'); if (p) p.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60));
}

/* ---------- Settings > Animations > Achievements ---------- */
function achPanelRender(el) {
  const s = achState(), facts = achFactsNow();
  const root = document.createElement('section'); root.className = 'ach'; root.id = 'ach-panel'; root.setAttribute('aria-label', 'Achievements');
  const n = ACH_DEFS.filter(d => s.unlocked[d.id]).length;
  // Here only the ones that unlock something for the library; every achievement is on the achievements wall
  const withReward = ACH_DEFS.filter(d => d.reward || (d.unlock && /^anim:/.test(d.unlock)));
  root.innerHTML = `<div class="anim-gallery-h"><h3>Achievements</h3><span class="muted">${n} of ${ACH_DEFS.length} earned · these ${withReward.length} unlock something for your library. Nothing is ever lost.</span></div>`;
  if (typeof gameOpenWall === 'function') {
    const wb = document.createElement('button'); wb.type = 'button'; wb.className = 'btn btn-secondary btn-sm'; wb.innerHTML = icon('trophy', 'i-sm') + '<span>Open the achievements</span>';
    wb.onclick = () => gameOpenWall();
    root.appendChild(wb);
  }
  const grid = document.createElement('div'); grid.className = 'ach-grid';
  for (const d of withReward) {
    const got = s.unlocked[d.id], p = achProgress(d, facts);
    const card = document.createElement('div'); card.className = 'ach-card' + (got ? ' is-got' : '');
    const r = d.reward || { item: String(d.unlock || '').replace(/^anim:/, '') };
    const it = r.item ? animItem(r.item) : null;
    const art = it ? animItemHtml(it, { size: 'md', reduced: true })   // still here: the gallery plays it
      : `<span class="ach-theme" data-anim-theme="${escAttr(r.theme || 'calm')}">${(() => { const x = animToday('symbol'); return x ? animItemHtml(x, { size: 'md', reduced: true }) : ''; })()}</span>`;
    const prog = got ? `<span class="ach-when">Earned ${esc(_achDay(got))}</span>`
      : p.of > 1 ? `<span class="ach-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.of}" aria-valuenow="${p.n}" aria-label="${escAttr(d.label)}"><i style="--pct:${Math.round(100 * p.n / p.of)}%"></i></span><span class="ach-when num">${p.n.toLocaleString()} of ${p.of.toLocaleString()}</span>`
        : '<span class="ach-when">Whenever it happens</span>';
    card.innerHTML = `<span class="ach-ic">${icon(got ? d.icon : 'lock', 'i-sm')}</span><div class="ach-t"><b>${esc(d.label)}</b><span class="muted">${esc(d.secret && !got ? (d.clue || 'A secret.') : d.hint)}</span>${prog}</div>`
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
