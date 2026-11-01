/* ============================================================
   GARDEN LIFE, the Nature book (2.23). A tidy collection: silhouettes until you have found something, the day you first saw it, hints for where and when. It is a section of the Almanac (the Notice board).

     gardenLifeFound(kind, id)  kind 'c' creature, 'e' surprise, 'k' keepsake: note it (the first time), pay once, show the little card. Synced in state.garden.disc as 'lf.<kind>.<id>': <first day>.
     gardenLifeHas(kind, id)    have you found it?
     gardenLifeBookTab(el, m)   the panel
     gardenLifeFacts()          {creatures, surprises, keepsakes, rare, found: {c: {id: day}, e, k}} for anything that wants to unlock by them: pet unlock rows can say {life: 'fox'} or {lifeCount: 10}
     gardenLifeUnlocked(rule)   the check for those rules: true, or false

   THE ECONOMY stays honest: one payment per discovery, ever, by id (GL_ECON, the ledger's entry 'lf' works like every other row of the wallet). At most GL_ECON.dayCoins a day; what is left over is paid on a later day,
   not lost (gardenLifeSettle). Saying hello again pays nothing, so there is nothing to farm. Keys are prefixed, so nothing that counts plants and visitors in `disc` is affected.
   ============================================================ */
const GL_ECON = Object.freeze({ coins: Object.freeze({ common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 15 }), xp: Object.freeze({ common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 8 }), keepsake: 1, dayCoins: 12 });
const _GL_SHELVES = Object.freeze([['insect', 'Insects', 'bug'], ['bird', 'Birds', 'bird'], ['animal', 'Animals', 'paw-print'], ['pond', 'Pond life', 'waves'], ['surprise', 'Surprises', 'sparkles'], ['keep', 'Keepsakes', 'gem']]);
const _glb = { shelf: '', queue: [], showing: false };

function _glKey(kind, id) { return `lf.${kind}.${id}`; }
function gardenLifeHas(kind, id) { try { return !!_gdG().disc[_glKey(kind, id)]; } catch (e) { return false; } }
function _glDefOf(kind, id) { return kind === 'c' ? GL_CREATURE.get(id) : kind === 'e' ? GL_EGG.get(id) : GL_KEEPSAKE.get(id); }
function gardenLifeFound(kind, id) {
  try {
    const def = _glDefOf(kind, id); if (!def || !gardenReady()) return false;
    const g = _gdG(), key = _glKey(kind, id);
    if (g.disc[key]) return false;
    g.disc[key] = _gdToday();
    if (kind === 'c' && gardenVisitor(id) && !g.disc[id]) g.disc[id] = _gdToday();   // the Almanac's Visitors page knows it too
    gardenLifeSettle(true);
    _glbShow(kind, def);
    if (kind === 'k' && typeof gardenCatchMoment === 'function') gardenCatchMoment('keep', id, { isNew: true });
    return true;
  } catch (e) { console.error('[garden life]', e); return false; }
}
/** The garden's day log knows who you saw (a catalogue visitor only): the daily goals and ribbons count it. */
function gardenLifeSeenToday(id) {
  try {
    if (!gardenVisitor(id)) return;
    const g = _gdG(), t = _gdToday(), day = g.vd[t] || (g.vd[t] = {});
    if (!day[id]) { day[id] = 1; _gdSave(); if (typeof gardenTickSoon === 'function') gardenTickSoon(); }
  } catch (e) { /* only a note */ }
}
function _glReward(kind, def) { if (kind === 'k') return { c: GL_ECON.keepsake, x: 1 }; const r = def.rarity || 'common'; return { c: GL_ECON.coins[r] || 1, x: GL_ECON.xp[r] || 1 }; }
/** Pay what is owed for discoveries, up to today's limit. The ledger's key is the discovery's, so two devices cannot pay it twice. */
function gardenLifeSettle(save) {
  const g = _gdG(), today = _gdToday(); let paid = 0, changed = false;
  for (const [k, e] of Object.entries(g.led)) if (e && e.k === 'lf' && e.d === today) paid += Number(e.c) || 0;
  for (const key of Object.keys(g.disc)) {
    if (!key.startsWith('lf.') || g.disc['lp' + key.slice(2)]) continue;
    const dot = key.indexOf('.', 3), kind = key.slice(3, dot), id = key.slice(dot + 1), def = _glDefOf(kind, id);
    if (!def) continue;   // an id from a newer version: it stays noted, and pays when this version knows it
    const r = _glReward(kind, def);
    if (paid + r.c > GL_ECON.dayCoins) continue;
    paid += r.c;
    g.led['lfr.' + kind + '.' + id] = { d: today, k: 'lf', c: r.c, x: r.x, n: 1 };
    g.disc['lp' + key.slice(2)] = today;   // (the ledger is folded by month; this mark is what stops a second payment for good)
    changed = true;
  }
  if (changed || save) { if (typeof _gdSave === 'function') _gdSave(); }
}
/* ---------- the little card when you find something new: not a toast, it is part of the game ---------- */
function _glbShow(kind, def) {
  _glb.queue.push({ kind, def });
  if (!_glb.showing) _glbNext();
}
function _glbNext() {
  const it = _glb.queue.shift(); if (!it) { _glb.showing = false; return; }
  const box = typeof _gw !== 'undefined' && _gw.root ? _gw.root.querySelector('.gd-stagebox') : null;
  if (!box) { _glb.showing = false; _glb.queue.length = 0; return; }
  _glb.showing = true;
  const r = _glReward(it.kind, it.def), n = document.createElement('button'); n.type = 'button'; n.className = 'gl-found';
  n.setAttribute('aria-label', `New in your Nature book: ${it.def.name}. Open the book.`);
  n.innerHTML = `<span class="gl-found-art">${_glbArt(it.kind, it.def, 56)}</span><span class="gl-found-t"><small>New in your Nature book</small><b>${esc(it.def.name)}</b></span><span class="gl-found-c">+${r.c}</span>`;
  n.onclick = () => { _glb.shelf = _glbShelfOf(it.kind, it.def); n.remove(); clearTimeout(n._t); _glb.showing = false; _glb.queue.length = 0; if (typeof gardenPopupOpen === 'function') gardenPopupOpen('nature'); };
  box.appendChild(n); _glbFit(n);
  if (typeof gameCheer === 'function') gameCheer(null, { quiet: true, sound: true, at: { x: 0, y: 0 } });
  n._t = setTimeout(() => { n.classList.add('is-out'); setTimeout(() => { n.remove(); _glbNext(); }, 320); }, 3600);
}
function _glbShelfOf(kind, def) { return kind === 'e' ? 'surprise' : kind === 'k' ? 'keep' : def.group; }
/** A picture for the book: the creature's kit art at rest, in an svg of its own, framed by its real size. */
function _glbArt(kind, def, px) {
  let inner = '';
  try {
    if (kind === 'c') inner = gardenLifeArt(def).svg;
    else if (kind === 'k') inner = gardenKeepsakeSvg(def);
    else { const art = def.icon || (def.effect && def.effect.art); const creature = def.effect && def.effect.kind === 'visitor' && GL_CREATURE.get(def.effect.id); inner = art && GL_THINGS[art] ? GL_THINGS[art]() : creature ? gardenLifeArt(creature).svg : GL_THINGS['wish-star'](); }
  } catch (e) { inner = ''; }
  return `<svg class="gl-bookart" viewBox="-30 -40 60 44" width="${px}" height="${px}" aria-hidden="true"><g class="gl-art gl-still" data-clip="${kind === 'c' ? esc(gardenLifeArt(def).clips.rest || '') : ''}">${inner}</g></svg>`;
}
/** Frame every picture by what is actually in it, so the mouse and the stag both fill their card. */
function _glbFit(root) {
  requestAnimationFrame(() => {
    for (const svg of root.querySelectorAll('.gl-bookart')) {
      try {
        const b = svg.firstElementChild.getBBox(); if (!b.width && !b.height) continue;
        const side = Math.max(b.width, b.height, 18) * 1.1, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        svg.setAttribute('viewBox', [cx - side / 2, cy - side / 2, side, side].map(_glF).join(' '));
      } catch (e) { /* it keeps the default frame */ }
    }
  });
}
/* ---------- the panel ---------- */
const _GL_TOD = Object.freeze({ dawn: 'dawn', day: 'daytime', dusk: 'dusk', night: 'night' });
function _glbWhen(def) {
  const w = def.when || {}, bits = [];
  if (w.seasons && w.seasons.length < 4) bits.push(w.seasons.map(s => (typeof GARDEN_SEASON_LABEL !== 'undefined' && GARDEN_SEASON_LABEL[s]) || s).join(', '));
  if (w.tod && w.tod.length < 4) bits.push(w.tod.map(t => _GL_TOD[t] || t).join(', '));
  if (w.weather && w.weather.includes('rain')) bits.push('in the rain');
  return bits.join(' · ');
}
function _glbCounts() {
  const n = (kind, list) => list.filter(d => gardenLifeHas(kind, d.id)).length;
  return { c: n('c', GARDEN_CREATURES), e: n('e', GARDEN_LIFE_EGGS), k: n('k', GARDEN_KEEPSAKES) };
}
function gardenLifeBookTab(el) {
  const shelf = _glb.shelf || 'insect', C = _glbCounts();
  const total = GARDEN_CREATURES.length + GARDEN_LIFE_EGGS.length + GARDEN_KEEPSAKES.length, have = C.c + C.e + C.k;
  const head = _gdpEl('div', 'gl-book-head');
  head.innerHTML = `<b>${have}</b><span class="muted"> of ${total} found</span><span class="gd-xpbar gl-book-bar"><i style="width:${Math.round(have / total * 100)}%"></i></span>`;
  el.appendChild(head);
  el.appendChild(_gdxChips(_GL_SHELVES.map(s => [s[0], s[1]]), shelf, (k) => { _glb.shelf = k; _gdxRepaintTab(); }));
  const list = shelf === 'surprise' ? GARDEN_LIFE_EGGS.map(d => ['e', d]) : shelf === 'keep' ? GARDEN_KEEPSAKES.map(d => ['k', d]) : GARDEN_CREATURES.filter(d => d.group === shelf).map(d => ['c', d]);
  const g = _gdG(), place = 'nature:' + shelf, rarities = Object.keys(GARDEN_RARITY), found = ([kind, d]) => (g.disc[_glKey(kind, d.id)] ? 0 : 1);
  const cmp = (a, b) => found(a) - found(b) || rarities.indexOf(a[1].rarity) - rarities.indexOf(b[1].rarity) || String(a[1].name).localeCompare(b[1].name);
  gardenPager(el, { key: place, items: gardenPagerOrder(place, list, ([k, d]) => k + d.id, cmp), grid: 'gd-grid gd-alm-grid gl-book-grid gpg-book', row: 150, draw: ([kind, d]) => {
    const day = g.disc[_glKey(kind, d.id)], known = !!day;
    const c = _gdpEl('button', 'gd-almcard gl-bookcard' + (known ? '' : ' is-unknown') + (d.rarity ? ' gd-r-' + d.rarity : '')); c.type = 'button';
    const art = _gdpEl('div', 'gd-card-art' + (known ? '' : ' gl-silhouette')); art.innerHTML = _glbArt(kind, d, 72); c.appendChild(art);
    c.appendChild(_gdpEl('b', null, known ? d.name : '???'));
    c.appendChild(_gdpEl('small', 'muted', known ? (kind === 'c' ? _glbWhen(d) || 'Any time' : day) : (d.rarity && GARDEN_RARITY[d.rarity] ? GARDEN_RARITY[d.rarity].label : 'Keep looking')));
    c.onclick = () => _glbDetail(kind, d, day);
    _glbFit(c);
    return c;
  } });
}
function _glbDetail(kind, d, day) {
  const back = _gdp.pop && _gdp.pop.tab;   // closing an entry goes back to the page of the book you were on
  openDialog({
    title: day ? d.name : 'Not found yet', width: 480, onClose: back ? () => setTimeout(() => gardenPopupOpen(back), 0) : undefined,
    body(el) {
      el.classList.add('gd-almdlg');
      const art = _gdpEl('div', 'gd-almdlg-art' + (day ? '' : ' gl-silhouette')); art.innerHTML = _glbArt(kind, d, 128); el.appendChild(art); _glbFit(art);
      const book = kind === 'c' ? (d.book || {}) : d;
      const hint = book.hint || (kind === 'k' ? 'Something might drop this, if you say hello.' : 'Keep looking.');
      if (!day) { el.appendChild(_gdpEl('p', null, hint)); const w = kind === 'c' ? _glbWhen(d) : ''; if (w) el.appendChild(_gdpEl('p', 'muted', w)); return; }
      if (book.blurb) el.appendChild(_gdpEl('p', 'gd-almdlg-blurb', book.blurb));
      const ul = _gdpEl('ul', 'gd-insp-facts');
      const li = (ic, t) => { const x = _gdpEl('li'); x.innerHTML = icon(ic, 'i-sm'); x.appendChild(_gdpEl('span', null, t)); ul.appendChild(x); };
      li('eye', 'First found ' + day);
      if (d.rarity && GARDEN_RARITY[d.rarity]) li('tag', GARDEN_RARITY[d.rarity].label);
      if (kind !== 'k') li('map-pin', hint);
      if (kind === 'c') { const w = _glbWhen(d); if (w) li('clock', w); }
      el.appendChild(ul);
    },
  });
}
/* ---------- for other agents: unlock rules as data ---------- */
function gardenLifeFacts() {
  const g = _gdG(), found = { c: {}, e: {}, k: {} }; let rare = 0;
  for (const [k, day] of Object.entries(g.disc)) { if (!k.startsWith('lf.')) continue; const dot = k.indexOf('.', 3), kind = k.slice(3, dot), id = k.slice(dot + 1); if (!found[kind]) continue; found[kind][id] = day; if (kind === 'c') { const d = GL_CREATURE.get(id); if (d && ['rare', 'epic', 'legendary'].includes(d.rarity)) rare++; } }
  return { creatures: Object.keys(found.c).length, surprises: Object.keys(found.e).length, keepsakes: Object.keys(found.k).length, rare, found };
}
/** {life: id} found this creature; {lifeCount: n} found n creatures; {lifeKeep: id} kept this; {lifeEgg: id} met this surprise. */
function gardenLifeUnlocked(rule) {
  if (!rule) return false;
  if (rule.life) return gardenLifeHas('c', rule.life);
  if (rule.lifeKeep) return gardenLifeHas('k', rule.lifeKeep);
  if (rule.lifeEgg) return gardenLifeHas('e', rule.lifeEgg);
  if (rule.lifeCount) return gardenLifeFacts().creatures >= rule.lifeCount;
  return false;
}
