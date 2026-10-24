/* ============================================================
   GAME, the Achievements page (2.18 B0; docs/dev/ACHIEVEMENTS_500.md 2.5,
   docs/dev/UX_BLUEPRINT.md). The view 'game:wall' (Life › Achievements in the
   navigation plan; the Game page 'game' keeps its id and shows a short
   summary with Next up). The shared header draws the title: this page never
   draws a second one.

     gameWallMount(container)      the page (a section can mount it anywhere)
     gameWallOpen(id?, {filter})   go to the page, at one achievement (its category opens, the card
                                   flashes once) or with a filter ('history': what history earned)
     gameWallSummary(stats)        the Game page's short section: the count, Next up, a link here
     gameWallNextUp(n)             up to n {def, p} worth doing next (one per category)

   Layout, status first: one line of counts; the history card (once, until dismissed); search, the
   shelf tabs, the filter chips and the sort; Next up (3 cards, one per category, each with one Go
   button); Almost there (one line, 80% or more); then the five shelves, each category ONE folded row
   with its bar ("12 of 25") that builds its cards only when opened. A category whose feature is off is
   one calm row with one button, never a grid of locks. Secrets show '???' and their clue, never a bar.
   A series is one card with tier pips. Cards open a fixed 440 px detail (what to do, progress, rarity
   and XP, the reward and its owner, the earned day, Show on my profile with Undo, Go).
   Keyboard: / searches, arrows move between cards, Enter opens, Esc closes. Reduced motion: no flashes.
   Secrets (marks): 'konami' (the old code on the Game pages) and 'ring' (10 clicks on the level ring in 4 s).
   ============================================================ */
const _acw = { q: '', shelf: 'all', status: new Set(), extra: new Set(), sort: 'closest', root: null, body: null, target: '', searchFocus: false, caret: 0, keys: [], ring: [], limit: 120 };
const _ACW_SORTS = [['closest', 'Closest'], ['newest', 'Newest earned'], ['rarest', 'Rarest'], ['az', 'A to Z']];
const _ACW_STATUS = [['progress', 'In progress'], ['earned', 'Earned'], ['none', 'Not started']];
const _ACW_EXTRA = [['reward', 'Unlocks something'], ['season', 'In season'], ['history', 'From your history']];
const _ACW_GO = {
  'cmd:rf-plan-week': 'Plan my week', 'view:today': 'Open Today', 'view:all': 'Open All tasks', 'view:home:week': 'Weekly review',
  'cmd:rf-sweep': 'Sweep Today', 'cmd:game-focus-next': 'Start a focus timer', 'cmd:quick-capture': 'Quick capture', 'view:waiting': 'Open Waiting',
  'cmd:sidebar-customise': 'Customise the sidebar', 'view:memories': 'Open Memories', 'view:finance': 'Open Money', 'view:locations': 'Open Places',
  'view:people': 'Open People', 'view:calendar': 'Open Calendar', 'view:friends': 'Open Friends', 'view:garden': 'Open the garden', 'view:pet': 'Open Pets',
  'view:profile': 'Edit your profile', 'view:settings:animations': 'Open the scenes', 'view:game': 'Open quests',
};
const _ACW_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* ---------- reading ---------- */
function _acwF() {
  const F = typeof gameFacts === 'function' ? gameFacts() : achFactsAsView({});
  const a = achState();
  F.unlocked = a.unlocked; F.hist = a.hist;
  return F;
}
function _acwProg(d, F, un) {
  if (un[d.id]) return { n: 1, of: 1, done: true, ratio: 1 };
  const p = achProgress(d, F);
  return Object.assign({}, p, { ratio: p.of ? Math.min(1, p.n / p.of) : 0 });
}
function _acwRank(d) { return (ACH_RARITY[d.rarity] || ACH_RARITY.common).rank; }
function _acwDay(iso) { return typeof _achDay === 'function' ? _achDay(iso) : String(iso || ''); }
function _acwNum(n) { return Number(n || 0).toLocaleString(); }
function _acwSeasonWords(d, today) {
  if (!d.season) return '';
  if (achInSeason(d, today)) return 'In season now';
  return `Back in ${_ACW_MONTHS[Number(d.season.from.slice(0, 2)) - 1] || 'its season'}`;
}
function _acwSecretHidden(d, un) { return d.secret && !un[d.id]; }
/** The words under a bar: '12 / 20', a ratio's numbers, or nothing for a 0-or-1 achievement. */
function _acwProgText(d, p) {
  if (d.when && Array.isArray(d.when.ratio)) return p.done ? 'Done' : p.of > 100 || p.n > 100 ? `${(p.raw || 0).toFixed(2)} of ${d.when.gte}` : `${_acwNum(p.n)} of ${_acwNum(p.of)} needed first`;
  return p.of > 1 ? `${_acwNum(p.n)} / ${_acwNum(p.of)}` : '';
}
function _acwCats() { return ACH_CATS.filter(c => ACH_DEFS.some(d => d.cat === c.id)); }
function _acwCatOn(c) { return !c.needs || !c.needs.length || c.needs.every(achFeatureOn); }
function _acwInShelf(d) { return _acw.shelf === 'all' || (_acw.shelf === 'secrets' ? (d.secret || d.cat === 'secrets') : d.shelf === _acw.shelf); }
/** Achievements worth doing next: locked, not secret, in season, feature on, 40% or more; one per category. */
function gameWallNextUp(n, F) {
  F = F || _acwF();
  const un = F.unlocked, today = todayStr(), pick = [], used = new Set();
  const cands = [];
  for (const d of ACH_DEFS) {
    if (un[d.id] || d.secret || !achInSeason(d, today) || !achNeedsOn(d) || (typeof _achIsMeta === 'function' && _achIsMeta(d))) continue;
    if (d.series && ACH_DEFS.some(x => x.series === d.series && x.cat === d.cat && !un[x.id] && ACH_TIERS.indexOf(x.tier) < ACH_TIERS.indexOf(d.tier))) continue;   // the next tier only
    const p = _acwProg(d, F, un);
    if (p.ratio >= 0.4 && p.ratio < 1) cands.push({ def: d, p });
  }
  cands.sort((a, b) => b.p.ratio - a.p.ratio || _acwRank(a.def) - _acwRank(b.def) || a.def.id.localeCompare(b.def.id));
  for (const c of cands) { if (pick.length >= n) break; if (used.has(c.def.cat)) continue; used.add(c.def.cat); pick.push(c); }
  if (pick.length < n) {   // suggested: the easiest of a category not started yet, its feature on
    const touched = new Set(ACH_DEFS.filter(d => un[d.id]).map(d => d.cat));
    const sug = ACH_DEFS.filter(d => !un[d.id] && !d.secret && !touched.has(d.cat) && !used.has(d.cat) && achNeedsOn(d) && achInSeason(d, today) && d.go && !(typeof _achIsMeta === 'function' && _achIsMeta(d)))
      .sort((a, b) => _acwRank(a) - _acwRank(b) || (Number(a.of) || 0) - (Number(b.of) || 0) || a.id.localeCompare(b.id));
    for (const d of sug) { if (pick.length >= n) break; if (used.has(d.cat)) continue; used.add(d.cat); pick.push({ def: d, p: _acwProg(d, F, un), suggested: true }); }
  }
  return pick;
}

/* ---------- small pieces (buttons: the kit's uiButton, small) ---------- */
function _acwRarityPill(d) { const r = ACH_RARITY[d.rarity] || ACH_RARITY.common; return `<span class="aw-rar aw-r-${r.id}">${esc(r.label)}</span>`; }
function _acwBar(p, label) {
  const pct = Math.round(100 * Math.max(0, Math.min(1, p.ratio != null ? p.ratio : p.n / Math.max(1, p.of))));
  return `<span class="aw-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.of}" aria-valuenow="${Math.min(p.n, p.of)}" aria-label="${escAttr(label)}"><i style="--pct:${pct}%"></i></span>`;
}
function _acwGoLabel(go) { return _ACW_GO[go] || 'Go'; }
function _acwGo(go) {
  const m = /^(view|cmd):(.+)$/.exec(String(go || ''));
  if (!m) return;
  if (m[1] === 'view') { setView(m[2]); return; }
  const c = typeof PALETTE_COMMANDS !== 'undefined' ? PALETTE_COMMANDS.find(x => x.id === m[2]) : null;
  if (!c || (typeof c.when === 'function' && !c.when())) { toast('That isn’t available right now.', { icon: 'info' }); return; }
  try { c.run(); } catch (e) { toastError('open it', e, () => _acwGo(go)); }
}
/** One card (an achievement, or a series as one card with pips). */
function _acwCard(d, F, un, members) {
  const hidden = _acwSecretHidden(d, un), got = !!un[d.id];
  const p = _acwProg(d, F, un);
  const b = document.createElement('button'); b.type = 'button';
  b.className = `aw-card aw-r-${d.rarity}${got ? ' is-got' : ''}${hidden ? ' is-secret' : ''}${!got && !achNeedsOn(d) ? ' is-off' : ''}`;
  b.dataset.ach = d.id;
  const name = hidden ? '???' : d.name;
  const desc = hidden ? (d.clue || 'Some secrets keep themselves.') : d.desc;
  const today = todayStr();
  let foot;
  if (got) foot = `<small class="muted">Earned ${esc(_acwDay(un[d.id]))}${F.hist && F.hist[d.id] ? ' · from your history' : ''}</small>`;
  else if (hidden) foot = '<small class="muted">A secret</small>';
  else if (!achNeedsOn(d)) foot = `<small class="muted">Needs ${esc(d.needs.join(' and '))}</small>`;
  else if (d.season && !achInSeason(d, today)) foot = `<small class="muted">${esc(_acwSeasonWords(d, today))}</small>`;
  else { const t = _acwProgText(d, p); foot = (p.of > 1 ? _acwBar(p, d.name) : '') + `<small class="muted num">${esc(t || 'Not yet')}</small>`; }
  let pips = '';
  if (members && members.length > 1) {
    pips = `<span class="aw-pips" aria-label="${escAttr(members.filter(m => un[m.id]).length + ' of ' + members.length + ' tiers')}">${members.map(m => `<i class="aw-pip aw-t-${esc(m.tier || '')}${un[m.id] ? ' is-on' : ''}" title="${escAttr((m.tier ? m.tier.charAt(0).toUpperCase() + m.tier.slice(1) + ': ' : '') + m.desc)}"></i>`).join('')}</span>`;
  }
  const rw = d.unlock || d.reward ? `<span class="aw-gift" title="${escAttr('Unlocks ' + (d.unlock ? achRewardLabel(d.unlock) : _achRewardLabel(d)))}">${icon('gift', 'i-xs')}</span>` : '';
  b.innerHTML = `<span class="aw-ic">${icon(got ? d.icon : hidden ? 'sparkles' : 'lock', 'i-sm')}</span>`
    + `<span class="aw-t"><b>${esc(name)}</b><small class="muted">${esc(desc)}</small></span>`
    + `<span class="aw-meta">${_acwRarityPill(d)}<span class="num muted">${_acwNum(d.xp)} XP</span>${rw}${pips}</span>`
    + `<span class="aw-foot">${foot}</span>`;
  b.setAttribute('aria-label', `${name}. ${got ? 'Earned' : hidden ? 'Secret' : 'Not yet earned'}. ${(ACH_RARITY[d.rarity] || {}).label || ''}, ${d.xp} XP.`);
  b.onclick = () => _acwDetail(d, members);
  return b;
}
/** A category's cards: series collapse to one card (the lowest tier not earned yet, else the top one). */
function _acwCatCards(defs, F, un) {
  const out = [], seen = new Set();
  for (const d of defs) {
    if (seen.has(d.id)) continue;
    if (d.series) {
      const mem = defs.filter(x => x.series === d.series).sort((a, b) => ACH_TIERS.indexOf(a.tier) - ACH_TIERS.indexOf(b.tier));
      for (const m of mem) seen.add(m.id);
      const show = mem.find(m => !un[m.id]) || mem[mem.length - 1];
      out.push({ def: show, members: mem });
    } else { seen.add(d.id); out.push({ def: d, members: null }); }
  }
  return out;
}
function _acwSortList(list, F, un) {
  const s = _acw.sort;
  const key = (x) => x.def;
  const pr = new Map();
  const ratio = (d) => { if (!pr.has(d.id)) pr.set(d.id, _acwProg(d, F, un).ratio); return pr.get(d.id); };
  return list.sort((a, b) => {
    const A = key(a), B = key(b);
    if (s === 'az') return A.name.localeCompare(B.name);
    if (s === 'rarest') return _acwRank(B) - _acwRank(A) || A.name.localeCompare(B.name);
    if (s === 'newest') return String(un[B.id] || '').localeCompare(String(un[A.id] || '')) || A.name.localeCompare(B.name);
    const ga = !!un[A.id], gb = !!un[B.id];
    if (ga !== gb) return ga ? 1 : -1;
    const ha = _acwSecretHidden(A, un), hb = _acwSecretHidden(B, un);
    if (ha !== hb) return ha ? 1 : -1;
    return ratio(B) - ratio(A) || _acwRank(A) - _acwRank(B) || A.name.localeCompare(B.name);
  });
}
function _acwMatches(d, F, un) {
  const today = todayStr();
  if (!_acwInShelf(d)) return false;
  if (_acw.q) {
    const q = _acw.q.toLowerCase(), hidden = _acwSecretHidden(d, un);
    const c = achCat(d.cat);
    const hay = [hidden ? '' : d.name, hidden ? d.clue : d.desc, c ? c.label : '', d.unlock && !hidden ? achRewardLabel(d.unlock) : '', (ACH_RARITY[d.rarity] || {}).label || ''].join(' ').toLowerCase();
    if (!q.split(/\s+/).filter(Boolean).every(w => hay.includes(w))) return false;
  }
  if (_acw.status.size) {
    const got = !!un[d.id];
    const st = got ? 'earned' : (_acwSecretHidden(d, un) ? 'none' : (_acwProg(d, F, un).n > 0 ? 'progress' : 'none'));
    if (!_acw.status.has(st)) return false;
  }
  if (_acw.extra.has('reward') && !(d.unlock || d.reward)) return false;
  if (_acw.extra.has('season') && !(d.season && achInSeason(d, today))) return false;
  if (_acw.extra.has('history') && !(F.hist && F.hist[d.id])) return false;
  return true;
}
function _acwFiltered() { return !!(_acw.q || _acw.status.size || _acw.extra.size || _acw.shelf !== 'all' || _acw.sort !== 'closest'); }

/* ---------- the page ---------- */
if (typeof registerSection === 'function') {
  registerSection('game:wall', {
    match: v => v === 'game:wall',
    title: () => 'Achievements',
    mount(container) { gameWallMount(container); },
    unmount() { _acw.root = null; _acw.body = null; },
  });
}
function gameWallMount(container) {
  const F = _acwF(), un = F.unlocked;
  const root = document.createElement('div'); root.className = 'aw'; root.id = 'gm-wall';
  _acw.root = root;
  root.appendChild(_acwSummaryLine(F, un));
  const hp = _acwHistoryCard(F);
  if (hp) root.appendChild(hp);
  root.appendChild(_acwTools());
  const body = document.createElement('div'); body.className = 'aw-body';
  _acw.body = body;
  root.appendChild(body);
  container.appendChild(root);
  _acwRenderBody();
  root.addEventListener('keydown', _acwKeys);
  if (_acw.searchFocus) { const i = root.querySelector('.aw-search input'); if (i) { i.focus({ preventScroll: true }); try { i.setSelectionRange(_acw.caret, _acw.caret); } catch (e) { /* not a text input */ } } }
  if (_acw.target) { const id = _acw.target; _acw.target = ''; requestAnimationFrame(() => _acwReveal(id)); }
}
function _acwSummaryLine(F, un) {
  const all = ACH_DEFS.length, got = ACH_DEFS.filter(d => un[d.id]).length, month = todayStr().slice(0, 7);
  const thisMonth = ACH_DEFS.filter(d => String(un[d.id] || '').slice(0, 7) === month && !(F.hist && F.hist[d.id])).length;
  const sec = ACH_DEFS.filter(d => d.secret), secGot = sec.filter(d => un[d.id]).length;
  let xp = 0;
  for (const a of Object.values((state.game && state.game.awards) || {})) if (a && a.k === 'ach') xp += Math.max(0, Number(a.xp) || 0);
  const el = document.createElement('div'); el.className = 'aw-sum';
  el.innerHTML = `<b class="num">${_acwNum(got)}</b><span class="muted">of ${_acwNum(all)} earned</span>`
    + `<span class="aw-dot" aria-hidden="true"></span><span class="muted"><b class="num">${_acwNum(thisMonth)}</b> this month</span>`
    + (sec.length ? `<span class="aw-dot" aria-hidden="true"></span><span class="muted"><b class="num">${secGot}</b> of ${sec.length} secrets found</span>` : '')
    + `<span class="aw-dot" aria-hidden="true"></span><span class="muted"><b class="num">${_acwNum(xp)}</b> XP from achievements</span>`;
  // With the Fun level Off the shared header shows one calm "Turn Fun on" row (15-nav-life.js): no second note here.
  return el;
}
function _acwHistoryCard() {
  const ids = typeof achHistoryPending === 'function' ? achHistoryPending() : [];
  if (!ids.length) return null;
  const card = document.createElement('section'); card.className = 'card aw-hist';
  // At most three chips, then +N (UX_BLUEPRINT.md 3).
  const names = ids.slice(0, 3).map(id => { const d = achDef(id); return `<span class="chip chip-solid">${esc(d.name)}</span>`; }).join('');
  card.innerHTML = `<div class="aw-hist-t">${icon('history', 'i-sm')}<div><b>You'd already earned these</b><span class="muted">${_acwNum(ids.length)} achievement${ids.length === 1 ? '' : 's'} from what you did before this update. Nothing to do: they're yours.</span></div></div>`
    + `<div class="chips aw-hist-chips">${names}${ids.length > 3 ? `<span class="chip chip-more">+${ids.length - 3}</span>` : ''}</div>`;
  const row = document.createElement('div'); row.className = 'aw-hist-a';
  row.append(
    uiButton({ label: 'Show them', icon: 'eye', size: 'sm', run: () => { _acw.extra = new Set(['history']); _acw.status.clear(); _acw.shelf = 'all'; _acwRerender(); } }),
    uiButton({ label: 'Close', kind: 'ghost', size: 'sm', run: () => {
      const before = achState().histSeen;
      achHistorySeen();
      _acwRerender();
      toast('Put away: they stay earned', { icon: 'check', action: { label: 'Undo', run: () => { const s = achState(); s.histSeen = before; _achSave(s); _acwRerender(); } } });
    } }));
  card.appendChild(row);
  return card;
}
function _acwTools() {
  const t = document.createElement('div'); t.className = 'aw-tools';
  const search = document.createElement('label'); search.className = 'input input-sm aw-search';
  search.innerHTML = `${icon('search', 'i-sm')}<input type="search" placeholder="Search achievements" aria-label="Search achievements" autocomplete="off" spellcheck="false">`;
  const inp = search.querySelector('input');
  inp.value = _acw.q;
  let tm = 0;
  inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { _acw.q = inp.value.trim(); _acwRenderBody(); }, 140); });
  inp.addEventListener('focus', () => { _acw.searchFocus = true; });
  inp.addEventListener('blur', () => { _acw.searchFocus = false; _acw.caret = inp.selectionStart || 0; });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Escape' && inp.value) { e.preventDefault(); e.stopPropagation(); inp.value = ''; _acw.q = ''; _acwRenderBody(); } });
  // The shelves are a filter, not a third row of tabs (the page's sections are level 2, UX_BLUEPRINT.md 3).
  const shelfOpts = [['all', 'All shelves'], ...ACH_SHELVES.map(s => [s.id, s.label]), ['secrets', 'Secrets']];
  const shelves = typeof _settingsSelect === 'function' ? _settingsSelect(shelfOpts, _acw.shelf, (v) => { _acw.shelf = v; _acwRenderBody(); }, 'aw-shelves') : document.createElement('span');
  shelves.setAttribute('aria-label', 'Shelf');
  // Three status chips; the other filters behind "More filters" (at most 3 chips in a row, UX_BLUEPRINT.md 3).
  const chips = document.createElement('div'); chips.className = 'chips aw-chips'; chips.setAttribute('aria-label', 'Filters');
  for (const [id, label] of _ACW_STATUS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip chip-lg aw-chip';
    b.textContent = label; b.setAttribute('aria-pressed', _acw.status.has(id) ? 'true' : 'false');
    b.onclick = () => { if (_acw.status.has(id)) _acw.status.delete(id); else _acw.status.add(id); b.setAttribute('aria-pressed', _acw.status.has(id) ? 'true' : 'false'); _acwRenderBody(); };
    chips.appendChild(b);
  }
  const hasHist = typeof achState === 'function' && Object.keys(achState().hist).length > 0;
  const extras = _ACW_EXTRA.filter(x => x[0] !== 'history' || hasHist);
  const moreLabel = () => (_acw.extra.size ? `More filters (${_acw.extra.size})` : 'More filters');
  chips.appendChild(uiButton({ label: moreLabel(), icon: 'list-filter', kind: 'ghost', size: 'sm', cls: 'aw-more', pressed: _acw.extra.size > 0,
    run: (e, btn) => openMenu(btn, extras.map(([id, label]) => ({ label, checked: () => _acw.extra.has(id),
      run: () => {
        if (_acw.extra.has(id)) _acw.extra.delete(id); else _acw.extra.add(id);
        btn.setAttribute('aria-pressed', _acw.extra.size ? 'true' : 'false'); const sp = btn.querySelector('span'); if (sp) sp.textContent = moreLabel();
        _acwRenderBody();
      } }))) }));
  const sort = typeof _settingsSelect === 'function' ? _settingsSelect(_ACW_SORTS, _acw.sort, (v) => { _acw.sort = v; _acwRenderBody(); }, 'aw-sort') : document.createElement('span');
  sort.setAttribute('aria-label', 'Sort');
  t.append(search, shelves, chips, sort);
  return t;
}
function _acwRerender() {
  if (!_acw.root || !_acw.root.parentNode) return;
  const c = _acw.root.parentNode;
  _acw.root.remove();
  gameWallMount(c);
}
function _acwRenderBody() {
  const body = _acw.body;
  if (!body) return;
  const F = _acwF(), un = F.unlocked;
  body.innerHTML = '';
  if (!_acwFiltered()) {
    // the shelves beside what is closest (2.19.1): Next up and the almost-there list stay in view while you open shelves
    const nx = gameWallNextUp(3, F), al = _acwAlmost(F, un);
    body.appendChild(pageLayout({ main: _acwShelves(F, un), cls: 'aw-layout', sideWidth: 340,
      side: (nx.length || al) ? (h) => { if (nx.length) h.appendChild(_acwNextSec(nx)); if (al) h.appendChild(al); } : null }));
  } else body.appendChild(_acwResults(F, un));
  const notes = document.createElement('p'); notes.className = 'aw-notes muted';
  notes.textContent = 'Money and Places achievements are private: they never show on your profile unless you pick them. Nothing earned is ever taken away.';
  body.appendChild(notes);
}
function _acwNextSec(list) {
  const sec = document.createElement('section'); sec.className = 'aw-next'; sec.setAttribute('aria-label', 'Next up');
  sec.appendChild(secHead({ title: 'Next up' }));
  const grid = document.createElement('div'); grid.className = 'aw-next-grid';
  for (const { def: d, p, suggested } of list) grid.appendChild(_acwNextCard(d, p, suggested));
  sec.appendChild(grid);
  return sec;
}
function _acwNextCard(d, p, suggested) {
  const c = achCat(d.cat);
  const card = document.createElement('div'); card.className = `card aw-nc aw-r-${d.rarity}`; card.dataset.ach = d.id;
  card.innerHTML = `<div class="aw-nc-h">${icon(d.icon, 'i-sm')}<span class="muted">${esc(suggested ? 'Suggested · ' + (c ? c.label : '') : (c ? c.label : ''))}</span>${_acwRarityPill(d)}</div>`
    + `<b class="aw-nc-t">${esc(d.name)}</b>`
    + (p.of > 1 ? `${_acwBar(p, d.name)}<small class="muted num">${esc(_acwProgText(d, p))}</small>` : '')
    + `<span class="muted aw-nc-d">${esc(d.desc)}</span>`;
  const row = document.createElement('div'); row.className = 'aw-nc-a';
  // One action on a card (UX_BLUEPRINT.md 3); Details is a quiet link.
  if (d.go) row.appendChild(uiButton({ label: _acwGoLabel(d.go), icon: 'arrow-right', size: 'sm', run: () => _acwGo(d.go) }));
  row.appendChild(uiButton({ label: 'Details', kind: 'link', run: () => _acwDetail(d, null) }));
  card.appendChild(row);
  return card;
}
function _acwAlmost(F, un) {
  const today = todayStr();
  const list = ACH_DEFS.filter(d => !un[d.id] && !d.secret && achNeedsOn(d) && achInSeason(d, today))
    .map(d => ({ d, p: _acwProg(d, F, un) })).filter(x => x.p.ratio >= 0.8 && x.p.ratio < 1 && x.p.of > 1)
    .sort((a, b) => b.p.ratio - a.p.ratio || a.d.name.localeCompare(b.d.name));
  if (!list.length) return null;
  const el = document.createElement('div'); el.className = 'aw-almost';
  el.innerHTML = '<span class="overline">Almost there</span>';
  for (const { d, p } of list.slice(0, 5)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'aw-al';
    b.innerHTML = `<span>${esc(d.name)}</span><small class="muted num">${esc(_acwProgText(d, p))}</small>`;
    b.onclick = () => _acwDetail(d, null);
    el.appendChild(b);
  }
  if (list.length > 5) el.appendChild(uiButton({ label: `${list.length - 5} more`, kind: 'ghost', size: 'sm', run: () => { _acw.status = new Set(['progress']); _acw.sort = 'closest'; _acwRerender(); } }));
  return el;
}
function _acwOpenMap() {
  const g = state.game && state.game.seen ? state.game.seen : null;
  const m = g && g.wallOpen && typeof g.wallOpen === 'object' ? g.wallOpen : null;
  if (m && Object.keys(m).length) return m;
  // first visit: the two categories with the most progress are open
  const un = achState().unlocked;
  const best = _acwCats().filter(_acwCatOn).map(c => { const l = ACH_DEFS.filter(d => d.cat === c.id); return { id: c.id, r: l.filter(d => un[d.id]).length / Math.max(1, l.length) }; })
    .sort((a, b) => b.r - a.r || a.id.localeCompare(b.id)).slice(0, 2);
  const out = {}; for (const b of best) out[b.id] = 1;
  return out;
}
function _acwSetOpen(cat, on) {
  if (typeof _gmG !== 'function') return;
  const g = _gmG();
  if (!g.seen.wallOpen || typeof g.seen.wallOpen !== 'object') g.seen.wallOpen = Object.assign({}, _acwOpenMap());
  g.seen.wallOpen[cat] = on ? 1 : 0;
  if (typeof saveUI === 'function') saveUI();
}
function _acwShelves(F, un) {
  const wrap = document.createElement('div'); wrap.className = 'aw-shelf-list';
  const open = _acwOpenMap();
  for (const sh of ACH_SHELVES) {
    const cats = _acwCats().filter(c => c.shelf === sh.id);
    if (!cats.length) continue;
    const sec = document.createElement('section'); sec.className = 'aw-shelf'; sec.dataset.shelf = sh.id;
    const all = ACH_DEFS.filter(d => d.shelf === sh.id), got = all.filter(d => un[d.id]).length;
    sec.appendChild(secHead({ title: sh.label, count: `${_acwNum(got)} of ${_acwNum(all.length)}` }));
    for (const c of cats) sec.appendChild(_acwCatRow(c, F, un, !!open[c.id]));
    wrap.appendChild(sec);
  }
  return wrap;
}
function _acwCatRow(c, F, un, isOpen) {
  const defs = ACH_DEFS.filter(d => d.cat === c.id);
  const got = defs.filter(d => un[d.id]).length;
  const row = document.createElement('div'); row.className = 'aw-cat'; row.dataset.cat = c.id;
  if (!_acwCatOn(c) && !got) {   // the feature is off: one calm row
    row.classList.add('is-off');
    row.innerHTML = `<div class="aw-cat-h is-static">${icon(c.icon, 'i-sm')}<b>${esc(c.label)}</b><span class="muted">${_acwNum(defs.length)} achievement${defs.length === 1 ? '' : 's'} wait here, ${esc(_acwNeedsWords(c.needs))}.</span></div>`;
    if (c.go) row.querySelector('.aw-cat-h').appendChild(uiButton({ label: _acwGoLabel(c.go), icon: 'arrow-right', kind: 'ghost', size: 'sm', run: () => _acwGo(c.go) }));
    return row;
  }
  const h = document.createElement('button'); h.type = 'button'; h.className = 'aw-cat-h';
  h.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  const pct = got / Math.max(1, defs.length);
  h.innerHTML = `${icon(c.icon, 'i-sm')}<b>${esc(c.label)}</b>${_acwBar({ n: got, of: defs.length, ratio: pct }, c.label)}<span class="muted num">${_acwNum(got)} of ${_acwNum(defs.length)}</span>${c.private ? `<span class="aw-priv" title="Private: never shown to friends unless you pick one">${icon('eye-off', 'i-xs')}</span>` : '<span class="aw-priv"></span>'}<span class="aw-chev">${icon('chevron-right', 'i-sm')}</span>`;
  const grid = document.createElement('div'); grid.className = 'aw-grid'; grid.hidden = !isOpen;
  const fill = () => { if (grid.dataset.built) return; grid.dataset.built = '1'; for (const x of _acwSortList(_acwCatCards(defs, F, un), F, un)) grid.appendChild(_acwCard(x.def, F, un, x.members)); };
  if (isOpen) fill();
  h.onclick = () => {
    const on = h.getAttribute('aria-expanded') !== 'true';
    h.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) fill();
    grid.hidden = !on;
    _acwSetOpen(c.id, on);
  };
  row.append(h, grid);
  return row;
}
function _acwNeedsWords(needs) {
  const W = { finance: 'once your finances are connected', locations: 'once location history is on', travel: 'once travel is on', calendar: 'once a calendar is connected',
    friends: 'once you have a friend in OpenDash', claude: 'once Claude is connected', sync: 'once sync is on', garden: 'when the garden arrives',
    pets: 'when pets arrive', wardrobe: 'when the wardrobe arrives', you: 'when profile cards arrive' };
  return (needs || []).filter(n => !achFeatureOn(n)).map(n => W[n] || 'later').join(' and ') || 'later';
}
function _acwResults(F, un) {
  const wrap = document.createElement('div'); wrap.className = 'aw-results';
  const match = ACH_DEFS.filter(d => _acwMatches(d, F, un));
  if (!match.length) {
    if (typeof mountEmptyState === 'function') mountEmptyState(wrap, { icon: 'search-x', compact: true, title: _acw.q ? `No achievements match “${_acw.q}”` : 'Nothing here with these filters', text: 'Try fewer words or another filter.', actions: [{ label: 'Clear search and filters', icon: 'x', run: () => { _acw.q = ''; _acw.status.clear(); _acw.extra.clear(); _acw.shelf = 'all'; _acw.sort = 'closest'; _acwRerender(); } }] });
    return wrap;
  }
  wrap.appendChild(secHead({ title: `${_acwNum(match.length)} achievement${match.length === 1 ? '' : 's'}`,
    actions: [{ label: 'Clear', icon: 'x', run: () => { _acw.q = ''; _acw.status.clear(); _acw.extra.clear(); _acw.shelf = 'all'; _acw.sort = 'closest'; _acwRerender(); } }] }));
  const items = _acwSortList(match.map(d => ({ def: d, members: null })), F, un);
  wrap.appendChild(pagedList({ items, pageSize: 24, cls: 'aw-grid-list', render: (x) => _acwCard(x.def, F, un, null) }));
  return wrap;
}

/* ---------- the detail ---------- */
function _acwDetail(d, members) {
  const F = _acwF(), un = F.unlocked, got = !!un[d.id], hidden = _acwSecretHidden(d, un), today = todayStr();
  const p = _acwProg(d, F, un), c = achCat(d.cat), r = ACH_RARITY[d.rarity] || ACH_RARITY.common;
  const rows = [];
  rows.push(`<div class="aw-d-top"><span class="aw-ic aw-ic-lg${got ? ' is-got' : ''}">${icon(got ? d.icon : hidden ? 'sparkles' : 'lock')}</span><div>${_acwRarityPill(d)} <span class="num">${_acwNum(d.xp)} XP</span><span class="muted"> · ${esc(c ? c.label : '')}</span></div></div>`);
  rows.push(`<p class="aw-d-desc">${esc(hidden ? (d.clue || 'Some secrets keep themselves.') : d.desc)}</p>`);
  if (got) rows.push(`<p class="muted">Earned ${esc(_acwDay(un[d.id]))}${F.hist && F.hist[d.id] ? ', from what you did before this update' : ''}.</p>`);
  else if (!hidden && p.of > 1) rows.push(`<div class="aw-d-prog">${_acwBar(p, d.name)}<span class="num">${esc(_acwProgText(d, p))}</span><small class="muted">Your best so far; it never goes down.</small></div>`);
  if (!got && !hidden && !achNeedsOn(d)) rows.push(`<p class="muted">${icon('plug', 'i-xs')} This starts ${esc(_acwNeedsWords(d.needs))}.</p>`);
  if (d.season) rows.push(`<p class="muted">${icon('calendar-days', 'i-xs')} ${esc(_acwSeasonWords(d, today))}.</p>`);
  if (members && members.length > 1) {
    rows.push(`<ul class="aw-d-tiers">${members.map(m => `<li class="${un[m.id] ? 'is-on' : ''}"><i class="aw-pip aw-t-${esc(m.tier || '')}${un[m.id] ? ' is-on' : ''}"></i><b>${esc(m.tier ? m.tier.charAt(0).toUpperCase() + m.tier.slice(1) : '')}</b> ${esc(m.name)}<small class="muted"> · ${esc(m.desc)}</small></li>`).join('')}</ul>`);
  }
  const unl = d.unlock ? achRewardLabel(d.unlock) : d.reward ? _achRewardLabel(d) : '';
  if (unl && !hidden) {
    const k = d.unlock ? ACH_REWARD_KINDS[(achRewardParse(d.unlock) || {}).kind] : null;
    const waits = d.unlock && !achRewardOwnerOn(d.unlock) && k && k.with ? ` (${k.with})` : '';
    rows.push(`<p class="aw-d-rw">${icon('gift', 'i-xs')} ${got ? 'Unlocked' : 'Unlocks'}: ${esc(unl)}${esc(waits)}</p>`);
  }
  if (d.private) rows.push(`<p class="muted">${icon('eye-off', 'i-xs')} Private: it never shows on your profile or travels to friends unless you pick it.</p>`);
  const title = hidden ? '???' : d.name;
  const actions = [];
  if (!got && !hidden && d.go && achNeedsOn(d)) actions.push({ label: _acwGoLabel(d.go), icon: 'arrow-right', primary: true, run: () => { setTimeout(() => _acwGo(d.go), 0); } });
  actions.push({ label: 'Close', run: () => true });
  openDialog({
    title, size: 'sm', resizable: false, resizeKey: 'ach-detail',
    body: (b) => {
      b.classList.add('aw-d');
      b.innerHTML = rows.join('');
      if (got && typeof profileGet === 'function' && typeof profileSet === 'function') b.appendChild(_acwShowcaseRow(d));
    },
    actions,
  });
}
/** "Show on my profile": a switch, with Undo (never a confirm). */
function _acwShowcaseRow(d) {
  const row = document.createElement('div'); row.className = 'toggle-row aw-d-show';
  const max = typeof PF_MAX !== 'undefined' && PF_MAX.badges ? PF_MAX.badges : 6;
  const cur = () => { const p = profileGet(); return Array.isArray(p.badges) ? p.badges.slice() : (typeof profileShowcase === 'function' ? profileShowcase(p) : []); };
  const on = cur().includes(d.id);
  const sw = typeof _settingsSwitch === 'function' ? _settingsSwitch(on, 'Show on my profile', (want) => {
    const before = profileGet().badges;
    const list = cur().filter(x => x !== d.id);
    if (want) { if (list.length >= max) list.shift(); list.push(d.id); }
    profileSet({ badges: list });
    sw.setAttribute('aria-checked', want ? 'true' : 'false');
    toast(want ? (d.private ? 'Added to your profile: friends will see this one' : 'Added to your profile') : 'Taken off your profile', { icon: 'award', action: { label: 'Undo', run: () => { profileSet({ badges: before }); sw.setAttribute('aria-checked', on ? 'true' : 'false'); } } });
  }) : null;
  if (!sw) return row;
  const t = document.createElement('span');
  t.innerHTML = `Show on my profile<span class="s">${esc(d.private ? 'Private: friends will see this one if you show it.' : 'Friends see the badges on your profile card.')}</span>`;
  row.append(sw, t);
  return row;
}

/* ---------- going to the page ---------- */
function gameWallOpen(id, o) {
  o = o || {};
  if (o.filter === 'history') { _acw.extra = new Set(['history']); _acw.status.clear(); _acw.shelf = 'all'; _acw.q = ''; }
  _acw.target = id ? String(id) : '';
  if (state.view === 'game:wall') { _acwRerender(); return; }
  setView('game:wall');
}
function _acwReveal(id) {
  const d = achDef(id); if (!d || !_acw.root) return;
  let card = _acw.root.querySelector(`.aw-card[data-ach="${CSS && CSS.escape ? CSS.escape(id) : id}"]`);
  if (!card && !_acwFiltered()) {
    const row = _acw.root.querySelector(`.aw-cat[data-cat="${d.cat}"] .aw-cat-h[aria-expanded="false"]`);
    if (row) row.click();
    card = _acw.root.querySelector(`.aw-card[data-ach="${CSS && CSS.escape ? CSS.escape(id) : id}"]`)
      || (d.series ? [..._acw.root.querySelectorAll(`.aw-cat[data-cat="${d.cat}"] .aw-card`)].find(c => { const x = achDef(c.dataset.ach); return x && x.series === d.series; }) : null);
  }
  if (!card) return;
  const motion = !(window.Motion && Motion.prefersReduced && Motion.prefersReduced());
  card.scrollIntoView({ block: 'center', behavior: motion ? 'smooth' : 'auto' });
  if (motion) { card.classList.add('is-flash'); setTimeout(() => card.classList.remove('is-flash'), 1600); }
  try { card.focus({ preventScroll: true }); } catch (e) { /* not focusable */ }
}

/* ---------- keyboard ---------- */
function _acwKeys(e) {
  const t = e.target;
  if (e.key === '/' && !(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) && !e.ctrlKey && !e.metaKey) {
    const i = _acw.root && _acw.root.querySelector('.aw-search input');
    if (i) { e.preventDefault(); i.focus(); }
    return;
  }
  if (!t || !t.classList || !t.classList.contains('aw-card')) return;
  const cards = [..._acw.root.querySelectorAll('.aw-card')].filter(c => c.offsetParent);
  const i = cards.indexOf(t);
  if (i < 0) return;
  let next = null;
  if (e.key === 'ArrowRight') next = cards[i + 1];
  else if (e.key === 'ArrowLeft') next = cards[i - 1];
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const r = t.getBoundingClientRect(), down = e.key === 'ArrowDown';
    let best = null, bd = Infinity;
    for (const c of cards) {
      if (c === t) continue;
      const q = c.getBoundingClientRect();
      if (down ? q.top <= r.top + 4 : q.top >= r.top - 4) continue;
      const dist = Math.abs(q.top - r.top) * 4 + Math.abs(q.left - r.left);
      if (dist < bd) { bd = dist; best = c; }
    }
    next = best;
  } else if (e.key === 'Home') next = cards[0];
  else if (e.key === 'End') next = cards[cards.length - 1];
  if (next) { e.preventDefault(); next.focus(); }
}

/* ---------- the Game page's short section ---------- */
function gameWallSummary() {
  const F = _acwF(), un = F.unlocked;
  const got = ACH_DEFS.filter(d => un[d.id]).length;
  const sec = document.createElement('section'); sec.className = 'gm-sec aw-mini'; sec.id = 'gm-ach';
  sec.appendChild(secHead({ title: 'Achievements', sub: `${_acwNum(got)} of ${_acwNum(ACH_DEFS.length)} earned. Each stays earned for good.` }));
  const nx = gameWallNextUp(3, F);
  if (nx.length) { const grid = document.createElement('div'); grid.className = 'aw-next-grid'; for (const { def: d, p, suggested } of nx) grid.appendChild(_acwNextCard(d, p, suggested)); sec.appendChild(grid); }
  else sec.appendChild(emptyLine('Nothing close right now. They come with weeks of steady work.'));
  sec.appendChild(uiButton({ label: `See all ${_acwNum(ACH_DEFS.length)} achievements`, icon: 'trophy', size: 'sm', run: () => gameWallOpen() }));
  return sec;
}

/* ---------- two secrets on the Game pages (marks: the achievements' sx-konami and sx-ring read them) ---------- */
if (typeof document !== 'undefined') {
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  document.addEventListener('keydown', (e) => {
    try {
      if (typeof state === 'undefined' || !state || !/^game(:|$)/.test(String(state.view || ''))) return;
      const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      _acw.keys.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (_acw.keys.length > KONAMI.length) _acw.keys.shift();
      if (_acw.keys.join(',') === KONAMI.join(',') && typeof gameMark === 'function') { _acw.keys = []; gameMark('konami', 'game'); }
    } catch (x) { /* never in the way */ }
  });
  document.addEventListener('click', (e) => {
    try {
      if (typeof state === 'undefined' || !state || !/^game(:|$)/.test(String(state.view || ''))) return;
      if (!e.target || !e.target.closest || !e.target.closest('.gm-hero .gm-lv')) return;
      const now = Date.now();
      _acw.ring = _acw.ring.filter(t => now - t < 4000); _acw.ring.push(now);
      if (_acw.ring.length >= 10 && typeof gameMark === 'function') { _acw.ring = []; gameMark('ring', 'game'); }
    } catch (x) { /* never in the way */ }
  });
}
