/* ============================================================
   GARDEN, the Field Journal (JOURNAL.md). One battered book for everything you find, replacing the fish and bug books, the Nature
   book, the Almanac's collections, My best catches, the region map and the Keepsakes box. Moss rebound it from the last gardener's;
   a few pages still carry W.'s notes in faded ink.

     gardenJournalOpen(o)        the book, as a pop-up: o {sec, page, kind, id}
     gardenJournalTab(el, m)     fill any element with it (the pop-up, and the route #view=garden:journal)
     gardenJournalGlimpse(id)    a fish or bug you saw but did not catch (it got away, it swam in a friend's vale): its card shows
     gardenJournalSnap()         what friends may read: {f: [[fish, best cm]], b: [bug ids]} (the snapshot's `jn`)
     gardenJournalPageState(id)  {fish: [found, of], bugs, seen, done, taken} for a page

   SEVEN SECTIONS, as ribbons down the right: Creatures (a page per region, fish, bugs, birds and beasts), Plants (and Thistle's
   kitchen), People, Places (the night sky, the year), Stories and letters (the story engine's chapters: wdBoxStories, filled by any
   file that calls wdTaleAdd), Keepsakes, Photos (trophy specimens, the pet's postcards).
   CARDS: unheard (dashed, a faint silhouette, one clue), glimpsed (a dark silhouette and its name), caught (the painted art and
   your best), well known (5 caught: a gold corner), a legend (gold-edged, only once its rumour is heard: a page more than half
   found). A page is full when every fish, bug and bird or beast on it is found, legends aside; its resident then gives you
   something for your garden (a decoration, through the ledger, with Undo). No coins: the reward is a thing.
   SAVED: nothing new but `disc['jn.<id>']` (glimpsed, the day) and `seen['jn.page.<id>']` (the reward taken). The rest is read
   from what the garden keeps already (fl, bl, disc, wd, the specimens).
   ============================================================ */
const _gj = { sec: 'creatures', page: 'village', kind: 'fish', pick: '' };
const GJ_SECTIONS = Object.freeze([
  ['creatures', 'Creatures', 'leaf', '#6a8a4a'], ['plants', 'Plants', 'sprout', '#7a8a3a'], ['people', 'People', 'user', '#b0605a'],
  ['places', 'Places', 'map', '#4a7a98'], ['stories', 'Letters', 'mail', '#7a5a98'], ['keep', 'Keepsakes', 'star', '#c8902a'], ['photos', 'Photos', 'camera', '#7a5a3a'],
]);
/* W.'s old notes, in the margins (JOURNAL.md section 4): one ordinary sentence each, all about life before. */
const GJ_MARGIN = Object.freeze({
  grayling: 'T. caught his first one here. Too small. Put back. He sulked all the way home.',
  'ballan-wrasse': 'Swam here every morning. Cold as charity.',
  bullhead: 'Not the brook.',
  'long-tailed-blue': 'The sweet peas are not for picking. T., this means you.',
  roach: 'First fish of every summer. Always a roach. Always.',
  'stag-beetle': 'Six weeks of summer, and he spent them all looking for one.',
  'the-duchess': 'Q.’s mother swore by her. So do I.',
  'glow-worm': 'Counted eleven on the verge tonight. T. said twelve.',
});
const GJ_WHO = Object.freeze({ pip: 'Pip', thistle: 'Thistle', bramble: 'Bramble', tam: 'Tam', quince: 'Quince', wick: 'Wick', angler: 'The old angler', perpetua: 'Perpetua', moss: 'Moss', hollin: 'Hollin' });
function _gjWho(id) { return GJ_WHO[id] || String(id || ''); }
function _gjRec(def) { const g = _gdG(); return (def.cat === 'bug' ? g.bl : g.fl)[def.id] || null; }
function _gjGlimpsed(id) { try { return !!_gdG().disc['jn.' + id]; } catch (e) { return false; } }
/** Seen, not caught: it got away, or swam in a friend's vale. The first time only. */
function gardenJournalGlimpse(id) {
  try { if (!gardenValeKind(id) || !gardenReady()) return; const g = _gdG(); if (g.disc['jn.' + id]) return; g.disc['jn.' + id] = _gdToday(); _gdSave(); } catch (e) { /* only a note */ }
}
function _gjZoneOpen(p, m) { return !p.zone || p.sea || (m.areas || []).includes('zn-' + p.zone); }
function _gjKinds(pageId, kind) { return (kind === 'bug' ? GARDEN_BUGS : GARDEN_FISH_ONLY).filter(d => d.page === pageId); }
function _gjSeenRows(pageId) { return (GARDEN_JOURNAL_SEEN[pageId] || []).map(id => (typeof GL_CREATURE !== 'undefined' && GL_CREATURE.get(id)) || null).filter(Boolean); }
function _gjSeen(id) { return typeof gardenLifeHas === 'function' && gardenLifeHas('c', id); }
/** The rumour of a page's legend is heard once more than half of the page's fish and bugs are found (or it was glimpsed). */
function _gjRumour(def) { if (_gjGlimpsed(def.id) || _gjRec(def)) return true; const all = _gjKinds(def.page, 'fish').concat(_gjKinds(def.page, 'bug')).filter(d => !d.legend); return all.filter(_gjRec).length * 2 > all.length; }
function gardenJournalPageState(id) {
  const fish = _gjKinds(id, 'fish').filter(d => !d.legend), bugs = _gjKinds(id, 'bug').filter(d => !d.legend), seen = _gjSeenRows(id);
  const n = (l, f) => [l.filter(f).length, l.length];
  const F = n(fish, _gjRec), B = n(bugs, _gjRec), S = n(seen, c => _gjSeen(c.id));
  const done = F[0] === F[1] && B[0] === B[1] && S[0] === S[1];
  let taken = false; try { taken = !!_gdG().seen['jn.page.' + id]; } catch (e) { /* not ready */ }
  return { fish: F, bugs: B, seen: S, done, taken, legends: _gjKinds(id, 'fish').concat(_gjKinds(id, 'bug')).filter(d => d.legend && _gjRec(d)).length };
}
/** The resident keeps their word: the page's reward, once. A thing for your garden, never coins. */
function gardenJournalClaim(id) {
  const p = gardenJournalPage(id); if (!p) return _gdNo('There is no such page');
  const S = gardenJournalPageState(id);
  if (S.taken) return _gdNo('You have that already');
  if (!S.done) return _gdNo('The page is not full yet');
  const d = gardenDecor(p.prize);
  return _gldPay(`${p.byName}, for a full page`, `${d ? d.name : 'A gift'}, from ${p.byName}`, { c: 0, x: 0, i: { ['decor:' + p.prize]: p.prizeN || 1 }, n: 1 }, [['jn.page.' + id, _gdToday()]], 'book-open');
}
/** What friends may read of your journal: the creatures you have caught, with your best size. Ids and numbers only. */
function gardenJournalSnap() {
  try {
    const g = _gdG(), f = [], b = [];
    for (const d of GARDEN_FISH_ONLY) { const r = g.fl[d.id]; if (r && r.n > 0) f.push([d.id, Math.max(1, Math.min(999, Math.round(Number(r.b) || 1)))]); }
    for (const d of GARDEN_BUGS) if (g.bl[d.id]) b.push(d.id);
    return f.length || b.length ? { f, b } : null;
  } catch (e) { return null; }
}
/** A friend's journal, from their snapshot (gardenSnapshotClean keeps it to the vale's ids). */
function _gjFriend(m) { const s = m && m.visit && m.visit.snap; return s && s.jn ? s.jn : null; }

/* ---------- the book ---------- */
function gardenJournalOpen(o) {
  o = o || {};
  if (o.sec) _gj.sec = o.sec; if (o.page) _gj.page = o.page; if (o.kind) _gj.kind = o.kind; if (o.id) _gj.pick = o.id;
  if (typeof gardenPopupOpen === 'function' && typeof _gdpopInGarden === 'function' && _gdpopInGarden()) { gardenPopupOpen('journal'); return; }
  setView('garden:journal');
}
function _gjEl(tag, cls, text) { return _gdpEl(tag, cls, text); }
function _gjSil(kind, id, px) { return `<span class="gj-sil">${gardenCatchSvg(kind, id, px, { uid: 'gjs' + id })}</span>`; }
function _gjArt(kind, id, px) { return gardenCatchSvg(kind, id, px, { uid: 'gja' + id + px }); }
function _gjDay(iso) { if (!iso) return ''; const d = new Date(String(iso) + 'T12:00:00'); return isNaN(d) ? String(iso) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }
function _gjRepaint() { if (_gj.el && _gj.el.isConnected) gardenJournalTab(_gj.el, gardenModel()); }
function _gjPurse(m) {
  const w = m.wallet || {}, t = gardenHas('mat:timber'), s = gardenHas('mat:stone');
  return `<span class="gj-coin"><i class="gj-dot"></i>${esc(_gdpNum(w.coins || 0))} coins</span><span class="gj-coin"><i class="gj-sq"></i>${esc(_gdpNum(t))} timber</span><span class="gj-coin"><i class="gj-tri"></i>${esc(_gdpNum(s))} stone</span>`;
}
function gardenJournalTab(el, m) {
  m = m || gardenModel(); _gj.el = el;
  { const fr = _gjFriend(m); if (fr) for (const id of fr.f.map(r => r[0]).concat(fr.b)) if (!_gjRec(gardenFishDef(id) || gardenBugDef(id) || { id, cat: 'fish' })) gardenJournalGlimpse(id); }   // what a friend's vale has and yours does not yet: glimpsed
  el.textContent = ''; el.classList.add('gj-host');
  // the title bar: who kept it, and the purse (in the pop-up's wooden bar; on the page, above the book)
  const modal = el.closest('.modal'), bar = modal && modal.querySelector('.modal-h');
  const head = bar || el.appendChild(_gjEl('div', 'gj-pagehead'));
  let extra = head.querySelector('.gj-headx');
  if (!extra) { extra = _gjEl('div', 'gj-headx'); const x = head.querySelector('button[aria-label="Close"]'); head.insertBefore(extra, x || null); }
  extra.innerHTML = `<i class="gj-kept">kept by you, and before you by W.</i><span class="gj-purse">${_gjPurse(m)}</span>`;
  const book = el.appendChild(_gjEl('div', 'gj-book'));
  const left = book.appendChild(_gjEl('section', 'gj-leaf gj-left')), right = book.appendChild(_gjEl('section', 'gj-leaf gj-right'));
  const tabs = book.appendChild(_gjEl('nav', 'gj-ribbons')); tabs.setAttribute('aria-label', 'Journal sections');
  for (const [id, label, ic, col] of GJ_SECTIONS) {
    const b = tabs.appendChild(_gjEl('button', 'gj-ribbon' + (_gj.sec === id ? ' is-on' : ''))); b.type = 'button'; b.dataset.gjSec = id; b.style.setProperty('--gj-rib', col);
    b.setAttribute('aria-pressed', String(_gj.sec === id)); b.innerHTML = `${icon(ic)}<span>${esc(label)}</span>`;
    b.onclick = () => { _gj.sec = id; _gj.pick = ''; _gjRepaint(); };
  }
  try {
    if (_gj.sec === 'creatures') _gjCreatures(left, right, m);
    else if (_gj.sec === 'plants') _gjPlants(left, right, m);
    else if (_gj.sec === 'people') _gjPeople(left, right, m);
    else if (_gj.sec === 'places') _gjPlaces(left, right, m);
    else if (_gj.sec === 'stories') _gjStories(left, right, m);
    else if (_gj.sec === 'keep') _gjKeep(left, right, m);
    else _gjPhotos(left, right, m);
  } catch (e) { console.error('[journal]', e); left.appendChild(_gjEl('p', 'muted', 'This page would not open. Close the journal and try again.')); }
}

/* ---------- Creatures ---------- */
function _gjRegionTabs(left, m) {
  const row = left.appendChild(_gjEl('div', 'gj-labels'));
  for (const p of GARDEN_JOURNAL_PAGES) {
    const open = _gjZoneOpen(p, m), b = row.appendChild(_gjEl('button', 'gj-label' + (p.id === _gj.page ? ' is-on' : '') + (open ? '' : ' is-far'), p.short)); b.type = 'button'; b.dataset.gjPage = p.id;
    b.onclick = () => { _gj.page = p.id; _gj.pick = ''; _gjRepaint(); };
  }
}
function _gjPips(n, of, gold) { let s = ''; for (let i = 0; i < of; i++) s += `<i class="gj-pip${i < n ? ' is-on' : ''}${gold ? ' is-gold' : ''}"></i>`; return `<span class="gj-pips" aria-hidden="true">${s}</span>`; }
function _gjCard(def, kind, m, fr) {
  const rec = _gjRec(def), gl = !rec && (_gjGlimpsed(def.id) || (fr && (kind === 'bug' ? fr.b.includes(def.id) : fr.f.some(r => r[0] === def.id))));
  if (def.legend && !_gjRumour(def) && !gl) return null;   // an unheard legend has no card at all
  const known = rec && Number(rec.n) >= 5;
  const c = _gjEl('button', 'gj-card' + (rec ? ' is-caught' : gl ? ' is-glimpsed' : ' is-unheard') + (def.legend ? ' is-legend' : '') + (_gj.pick === def.id ? ' is-pick' : '') + (known ? ' is-known' : ''));
  c.type = 'button'; c.dataset.gjId = def.id;
  const no = def.legend ? 'L' : String(def.n);
  const size = kind === 'bug' ? 'mm' : 'cm';
  const sub = rec ? (kind === 'bug' ? `first ${_gjDay(rec.d)}` : `best ${Math.round(rec.b)} ${size}`) : gl ? 'seen, but it got away' : '';
  c.innerHTML = `<span class="gj-no">${esc(no)}</span>${def.legend ? '<span class="gj-legtag">Legend</span>' : ''}${rec ? `<span class="gj-tick">${icon('check')}</span>` : ''}${known ? '<span class="gj-known" title="Well known">known</span>' : ''}`
    + `<span class="gj-cart">${rec ? _gjArt(kind, def.id, 72) : _gjSil(kind, def.id, 72)}</span>`
    + (rec || gl ? `<b>${esc(def.name)}</b><small>${esc(sub)}</small>` : `<b class="gj-q">? ? ?</b><small class="gj-clue">${def.legend ? esc(_gjWho(def.by)) + ': ' : ''}“${esc(def.clue)}”</small>`);
  c.setAttribute('aria-label', rec ? `${def.name}, caught` : gl ? `${def.name}, glimpsed` : `Not found yet. Clue: ${def.clue}`);
  c.onclick = () => { _gj.pick = def.id; _gjRepaint(); };
  return c;
}
function _gjCreatures(left, right, m) {
  const p = gardenJournalPage(_gj.page) || GARDEN_JOURNAL_PAGES[0], open = _gjZoneOpen(p, m), fr = _gjFriend(m);
  _gjRegionTabs(left, m);
  const h = left.appendChild(_gjEl('div', 'gj-ptitle')); h.innerHTML = `<h3>${esc(p.name)}</h3><i class="gj-hand">${esc(p.where)}</i>`;
  if (!open) {
    const mist = left.appendChild(_gjEl('div', 'gj-mist')); mist.innerHTML = `${icon('cloud')}<b>?? to find</b><p class="gj-hand">${esc(p.line)}</p><small>The way there opens later. Keep exploring.</small>`;
    _gjEntryEmpty(right, 'Somewhere past the edge of the map.'); return;
  }
  const S = gardenJournalPageState(p.id);
  const tally = left.appendChild(_gjEl('div', 'gj-tally'));
  tally.innerHTML = `<span>Fish <b>${S.fish[0]}</b> of ${S.fish[1]} ${_gjPips(S.fish[0], S.fish[1])}</span><span>Bugs <b>${S.bugs[0]}</b> of ${S.bugs[1]} ${_gjPips(S.bugs[0], S.bugs[1])}</span><span>Legend ${_gjPips(S.legends, _gjKinds(p.id, 'fish').concat(_gjKinds(p.id, 'bug')).filter(d => d.legend).length, true)}</span>`;
  const chips = left.appendChild(_gjEl('div', 'gj-chips'));
  for (const [k, label] of [['fish', 'Fish'], ['bug', 'Bugs'], ['seen', 'Birds & beasts'], ['plant', 'Plants here']]) {
    const b = chips.appendChild(_gjEl('button', 'gj-chip' + (_gj.kind === k ? ' is-on' : ''), label)); b.type = 'button'; b.dataset.gjKind = k; b.setAttribute('aria-pressed', String(_gj.kind === k));
    b.onclick = () => { _gj.kind = k; _gj.pick = ''; _gjRepaint(); };
  }
  const grid = left.appendChild(_gjEl('div', 'gj-grid'));
  let picked = null;
  if (_gj.kind === 'fish' || _gj.kind === 'bug') {
    const list = _gjKinds(p.id, _gj.kind).sort((a, b) => (a.legend - b.legend) || a.n - b.n);
    for (const d of list) { const c = _gjCard(d, _gj.kind, m, fr); if (c) grid.appendChild(c); if (d.id === _gj.pick) picked = d; }
    if (!picked) picked = list.find(d => _gjRec(d)) || null;
  } else if (_gj.kind === 'seen') {
    const rows = _gjSeenRows(p.id);
    if (!rows.length) grid.appendChild(_gjEl('p', 'muted gj-none', 'Nothing to see here but the view. Say hello to whoever you meet.'));
    for (const c0 of rows) {
      const seen = _gjSeen(c0.id), c = grid.appendChild(_gjEl('div', 'gj-card' + (seen ? ' is-caught' : ' is-unheard')));
      const art = typeof _glbArt === 'function' ? _glbArt('c', c0, 64) : '';
      c.innerHTML = `<span class="gj-cart${seen ? '' : ' gj-sil'}">${art}</span>${seen ? `<b>${esc(c0.name)}</b><small>said hello</small>` : `<b class="gj-q">? ? ?</b><small class="gj-clue">${esc(c0.hint || 'Say hello when you see it.')}</small>`}`;
    }
  } else {
    const plants = _gjPagePlants(p.id);
    for (const pl of plants) grid.appendChild(_gjPlantCard(pl, m));
  }
  if (typeof _glbFit === 'function') _glbFit(grid);
  const foot = left.appendChild(_gjEl('div', 'gj-foot'));
  foot.innerHTML = `<p class="gj-see">${icon('eye')}<span><b>From this page you can see:</b> <i class="gj-hand">${esc(p.glimpse)}</i></span></p>`;
  const rw = foot.appendChild(_gjEl('div', 'gj-reward' + (S.taken ? ' is-done' : S.done ? ' is-ready' : '')));
  rw.innerHTML = `<span class="gj-seal">${esc(p.byName.replace(/^the /, ''))}</span><span>${esc(S.taken ? `${p.byName[0].toUpperCase() + p.byName.slice(1)} kept their word. It is in your bag.` : p.reward)} <small>Legends don’t count towards it.</small></span>`;
  if (S.done && !S.taken && !m.visit) rw.appendChild(_gdpBtn('The page is full', { icon: 'gift', kind: 'btn-primary', run: () => { _gdpSay(gardenJournalClaim(p.id)); _gjRepaint(); } }));
  if (_gj.kind === 'fish' || _gj.kind === 'bug') _gjEntry(right, picked, _gj.kind, m, fr);
  else _gjEntryEmpty(right, p.line);
}
function _gjEntryEmpty(right, line) {
  right.appendChild(_gjEl('p', 'gj-hand gj-empty', line || 'Pick something on the left.'));
}
function _gjEntry(right, def, kind, m, fr) {
  if (!def) { _gjEntryEmpty(right, 'Nothing caught on this page yet. Pick a card to read its clue.'); return; }
  const rec = _gjRec(def), gl = !rec && (_gjGlimpsed(def.id) || (fr && (kind === 'bug' ? fr.b.includes(def.id) : fr.f.some(r => r[0] === def.id))));
  const p = gardenJournalPage(def.page), size = kind === 'bug' ? 'mm' : 'cm', range = kind === 'bug' ? def.mm : def.cm;
  const h = right.appendChild(_gjEl('div', 'gj-etitle'));
  h.innerHTML = `<h3>${esc(rec || gl ? def.name : '? ? ?')}</h3><small>${def.legend ? 'Legend' : 'No. ' + def.n} · ${esc(gardenRegionShort(def) || p.short)} · ${esc((GARDEN_RARITY[def.rarity] || {}).label || '')}</small>`;
  const plate = right.appendChild(_gjEl('div', 'gj-plate' + (rec ? '' : ' is-sil')));
  plate.innerHTML = (rec ? _gjArt(kind, def.id, 260) : _gjSil(kind, def.id, 260)) + '<i class="gj-tape gj-tape-a"></i><i class="gj-tape gj-tape-b"></i>' + (rec ? `<span class="gj-stamp">Caught ${esc(_gjDay(rec.d))}</span>` : '');
  const said = right.appendChild(_gjEl('div', 'gj-said'));
  said.innerHTML = `<span class="gj-face">${esc(_gjWho(def.by).replace(/^The /, '').slice(0, 1))}</span><span><span class="gj-hand gj-quote">“${esc(def.clue)}”</span><small>${esc(_gjWho(def.by))}</small></span>`;
  if (!rec) {
    right.appendChild(_gjEl('p', 'gj-note', gl ? `You have seen it. Next time, keep it on the line.${fr && !_gjGlimpsed(def.id) ? ' (Your friend has caught one.)' : ''}` : 'One clue is all you get. The rest is learnt by looking.'));
    return;
  }
  right.appendChild(_gjEl('p', 'gj-note', def.blurb + (Number(rec.n) >= 5 ? ' Moss adds: “You know this one now. Look again, though.”' : '')));
  const boxes = right.appendChild(_gjEl('div', 'gj-boxes'));
  const how = boxes.appendChild(_gjEl('div', 'gj-box'));
  how.appendChild(_gjEl('h4', null, 'Where and when'));
  let rows = []; try { rows = gardenCatchNeedsRows(def); } catch (e) { rows = []; }
  const ul = how.appendChild(_gjEl('ul', 'gj-checks'));
  for (const r of rows.slice(0, 6)) { const li = ul.appendChild(_gjEl('li')); li.innerHTML = `${icon('check')}<span>${esc(r.text)}</span>`; }
  if (kind === 'fish') {
    let lacks = []; try { lacks = gardenFishLacks(def, gardenTackleInUse()); } catch (e) { lacks = []; }
    how.appendChild(_gjEl('h4', null, 'To catch one'));
    const ul2 = how.appendChild(_gjEl('ul', 'gj-checks'));
    if (!lacks.length) { const li = ul2.appendChild(_gjEl('li')); li.innerHTML = `${icon('check')}<span>Your tackle will do.</span>`; }
    for (const t of lacks) { const li = ul2.appendChild(_gjEl('li', 'is-no')); li.innerHTML = `${icon('x')}<span>${esc(t)}</span>`; }
  }
  const yours = boxes.appendChild(_gjEl('div', 'gj-box'));
  yours.appendChild(_gjEl('h4', null, 'Your catches'));
  const dl = yours.appendChild(_gjEl('dl', 'gj-dl'));
  const row = (k, v) => { dl.appendChild(_gjEl('dt', null, k)); dl.appendChild(_gjEl('dd', null, v)); };
  row('First', _gjDay(rec.d)); row('Caught', String(rec.n || 1));
  if (kind === 'fish') row('Best', `${Math.round(rec.b)} cm`);
  row('Range', `${range[0]} to ${range[1]} ${size}`);
  if (fr && m.visit) { const theirs = kind === 'fish' ? (fr.f.find(r => r[0] === def.id) || [])[1] : fr.b.includes(def.id); if (theirs) row('Their best', kind === 'fish' ? theirs + ' cm' : 'caught'); }
  const acts = right.appendChild(_gjEl('div', 'gj-acts'));
  if (!m.visit) {
    acts.appendChild(_gdpBtn('Walk there', { icon: 'footprints', kind: 'btn-primary', run: () => _gjWalk(def, m) }));
    if (kind === 'fish') acts.appendChild(_gdpBtn('Tackle', { icon: 'store', run: () => { if (typeof gardenPopupOpen === 'function') gardenPopupOpen('catch', { sub: 'tackle', title: 'Tackle shop' }); } }));
  }
  if (GJ_MARGIN[def.id]) right.appendChild(_gjEl('p', 'gj-margin', GJ_MARGIN[def.id])).appendChild(_gjEl('small', null, ' (an old note, in faded ink)'));
}
function _gjWalk(def, m) {
  const H = def.home || {};
  let pt = null;
  try {
    if (H.w && H.w !== 'pond') { const w = gardenRegionWaterDef(H.w); if (w && !w.room && Number.isFinite(w.x)) pt = { x: w.x + w.w / 2, y: w.y + w.h / 2 }; }
    else if (H.w === 'pond' && typeof gardenArea === 'function') { const a = gardenArea('pond'), w = a && a.water; if (w) pt = { x: w.x + w.w / 2, y: w.y + w.h / 2 }; }
    else if (!H.g && !H.sea) pt = gardenRegionBugCell(H, Math.random, m.areas, () => true);
  } catch (e) { pt = null; }
  if (typeof gardenPopupClose === 'function') gardenPopupClose();
  if (H.sea) { if (typeof gardenGoToAct === 'function') gardenGoToAct('tackle'); gardenMessage('Sea fish: cast from the pier or the shore, off the coast its clue names.', { icon: 'waves' }); return; }
  if (H.g) { gardenMessage('This one comes to gardens: grow flowers and look about at the right hour.', { icon: 'flower-2' }); return; }
  if (!pt || !gardenRegionHomeOpen(H, m.areas) || !gardenWalkToPoint(pt, null, { radius: 6 })) gardenMessage('No path there yet. The way opens as you explore.', { icon: 'map' });
}

/* ---------- Plants ---------- */
const _GJ_PAGE_PLANTS = Object.freeze({ village: ['sweet-pea', 'rose', 'sunflower', 'lavender', 'daisy', 'tomato', 'cabbage'], woodland: ['foxglove', 'bluebell', 'fern', 'primrose', 'wild-garlic', 'oak'], valley: ['wheat', 'barley', 'potato', 'carrot', 'bean', 'willow'], oldwood: ['yew', 'ivy', 'snowdrop', 'mushroom', 'holly'], orchard: ['apple', 'pear', 'plum', 'cherry', 'blackberry'], mountains: ['heather', 'gorse', 'aster', 'thyme', 'pine'], sea: ['sea-thrift', 'samphire', 'marram'] });
function _gjPagePlants(id) { const ids = _GJ_PAGE_PLANTS[id] || []; return ids.map(x => gardenPlant(x)).filter(Boolean); }
function _gjPlantCard(d, m) {
  const g = _gdG(), found = !!g.disc[d.id];
  const c = _gjEl('div', 'gj-card' + (found ? ' is-caught' : ' is-unheard'));
  let art = ''; try { art = gardenIconSvg(d.id, { kind: 'plant', stage: 4, season: (d.seasons || ['summer'])[0], silhouette: !found, ripe: true, px: 64 }); } catch (e) { art = ''; }
  c.innerHTML = `<span class="gj-cart">${art}</span>${found ? `<b>${esc(d.name)}</b><small>${esc(GARDEN_CATS[d.cat] ? GARDEN_CATS[d.cat].one : '')}</small>` : `<b class="gj-q">? ? ?</b><small class="gj-clue">“${esc(d.blurb || 'Grow it, or find it wild.')}”</small>`}`;
  return c;
}
function _gjPlants(left, right, m) {
  const g = _gdG(), list = GARDEN_PLANTS.slice().sort((a, b) => (g.disc[a.id] ? 0 : 1) - (g.disc[b.id] ? 0 : 1) || String(a.name).localeCompare(b.name));
  const h = left.appendChild(_gjEl('div', 'gj-ptitle')); h.innerHTML = `<h3>Plants</h3><i class="gj-hand">grown to bloom, or found wild</i>`;
  left.appendChild(_gjEl('div', 'gj-tally')).innerHTML = `<span>Found <b>${list.filter(p => g.disc[p.id]).length}</b> of ${list.length}</span>`;
  const box = left.appendChild(_gjEl('div', 'gj-pagerbox'));
  gardenPager(box, { key: 'jn:plants', items: list, grid: 'gj-grid', row: 150, draw: (d) => _gjPlantCard(d, m) });
  const h2 = right.appendChild(_gjEl('div', 'gj-etitle')); h2.innerHTML = '<h3>Thistle’s kitchen</h3><small>every dish you have cooked, in her hand</small>';
  const grid = right.appendChild(_gjEl('div', 'gj-grid gj-grid-sm'));
  const dishes = typeof GP_DISHES !== 'undefined' ? GP_DISHES : [];
  for (const d of dishes) {
    const had = typeof gpGet === 'function' && (gpGet('ck.' + d.id) || gardenHas('dish:' + d.id) > 0);
    const c = grid.appendChild(_gjEl('div', 'gj-card' + (had ? ' is-caught' : ' is-unheard')));
    let art = ''; try { art = typeof gpDishSvg === 'function' ? gpDishSvg(d, 56) : ''; } catch (e) { art = ''; }
    c.innerHTML = `<span class="gj-cart${had ? '' : ' gj-sil'}">${art}</span>${had ? `<b>${esc(d.name)}</b>` : `<b class="gj-q">? ? ?</b><small class="gj-clue">“${esc(d.hint || 'Something sweet, and something from the mill.')}”</small>`}`;
  }
  if (!dishes.length) right.appendChild(_gjEl('p', 'gj-hand gj-empty', 'Nothing cooked yet.'));
}

/* ---------- People ---------- */
function _gjPeople(left, right, m) {
  const h = left.appendChild(_gjEl('div', 'gj-ptitle')); h.innerHTML = `<h3>People</h3><i class="gj-hand">in the order you met them</i>`;
  const folk = typeof WD_FOLK !== 'undefined' ? WD_FOLK : [];
  const list = left.appendChild(_gjEl('div', 'gj-people'));
  let any = false;
  for (const f of folk) {
    const met = typeof wdFacts === 'function' ? (() => { try { return (wdFacts(m, f.id) || {}).talks > 0; } catch (e) { return false; } })() : false;
    if (!met) continue; any = true;
    const heart = typeof wdKinHeart === 'function' ? Math.max(0, Math.min(5, Math.round(wdKinHeart(f.id) || 0))) : Math.min(5, Math.ceil(((wdFacts(m, f.id) || {}).talks || 0) / 3));
    const row = list.appendChild(_gjEl('div', 'gj-person'));
    let art = ''; try { art = typeof f.art === 'function' ? f.art() : ''; } catch (e) { art = ''; }
    row.innerHTML = `<span class="gj-portrait">${art}</span><span><b>${esc(f.name)}</b><span class="gj-leaves">${_gjPips(heart, 5)}</span><small>${esc(f.title || f.role || '')}</small></span>`;
  }
  if (!any) list.appendChild(_gjEl('p', 'gj-hand gj-empty', 'Nobody yet. Say hello to whoever you meet on the green.'));
  const h2 = right.appendChild(_gjEl('div', 'gj-etitle')); h2.innerHTML = '<h3>Your pet</h3><small>its tricks, and where it has been</small>';
  const pet = right.appendChild(_gjEl('div', 'gj-petbox'));
  if (typeof petBookPage === 'function' && typeof petGet === 'function' && petGet()) { try { petBookPage(pet, { panel: true }); } catch (e) { pet.appendChild(_gjEl('p', 'muted', 'Your pet is busy.')); } }
  else pet.appendChild(_gjEl('p', 'gj-hand gj-empty', 'No pet yet.'));
  const sig = right.appendChild(_gjEl('div', 'gj-acts'));
  sig.appendChild(_gdpBtn('Signed by friends', { icon: 'feather', run: () => { if (typeof gardenPopupOpen === 'function') gardenPopupOpen('visit'); } }));
}

/* ---------- Places ---------- */
function _gjPlaces(left, right, m) {
  const h = left.appendChild(_gjEl('div', 'gj-ptitle')); h.innerHTML = `<h3>Places</h3><i class="gj-hand">the vale, region by region</i>`;
  const list = left.appendChild(_gjEl('div', 'gj-places'));
  for (const p of GARDEN_JOURNAL_PAGES) {
    const open = _gjZoneOpen(p, m), S = gardenJournalPageState(p.id), row = list.appendChild(_gjEl('button', 'gj-place' + (open ? '' : ' is-far'))); row.type = 'button';
    row.innerHTML = `<i class="gj-swatch" style="background:${escAttr(p.color)}"></i><span><b>${esc(open ? p.name : p.short)}</b><small class="gj-hand">${esc(open ? p.line : '?? to find')}</small></span>${S.taken ? `<span class="gj-stampsm">full</span>` : ''}`;
    row.onclick = () => { _gj.sec = 'creatures'; _gj.page = p.id; _gjRepaint(); };
  }
  left.appendChild(_gdpBtn('Open the map (M)', { icon: 'map', run: () => { if (typeof gardenPopupClose === 'function') gardenPopupClose(); const b = document.querySelector('[data-menu="map"]'); if (b) b.click(); } }));
  const sky = right.appendChild(_gjEl('div', 'gj-sky'));
  sky.appendChild(_gjEl('h3', null, 'The night sky'));
  const stars = typeof WD_STARS !== 'undefined' ? WD_STARS : [];
  const sg = sky.appendChild(_gjEl('div', 'gj-skylist'));
  for (const r of stars) { const k = typeof _wdSkyKnown === 'function' && _wdSkyKnown(r.id); sg.appendChild(_gjEl('span', 'gj-star' + (k ? ' is-on' : ''), k ? r.name : '· · ·')); }
  if (!stars.length) sg.appendChild(_gjEl('small', null, 'Look up on a clear night.'));
  const yr = right.appendChild(_gjEl('div', 'gj-year'));
  yr.appendChild(_gjEl('h3', null, 'The year'));
  if (typeof wdBoxDays === 'function') { try { wdBoxDays(yr, m); } catch (e) { /* later */ } }
}

/* ---------- Stories and letters ---------- */
function _gjStories(left, right, m) {
  const h = left.appendChild(_gjEl('div', 'gj-ptitle')); h.innerHTML = `<h3>Stories</h3><i class="gj-hand">in your own hand</i>`;
  const box = left.appendChild(_gjEl('div', 'gj-stories wd-box'));
  if (typeof wdBoxStories === 'function') wdBoxStories(box, m);   // the story engine's chapters (wdTaleAdd), told as you heard them
  else box.appendChild(_gjEl('p', 'gj-hand gj-empty', 'Nothing written here yet. Stories find you: sit with people, and listen.'));
  left.appendChild(_gdpBtn('If this brings anything up', { icon: 'heart', kind: 'btn-ghost', run: () => { if (typeof wdCareNote === 'function') wdCareNote(); else gardenMessage('If anything in the story is hard to read, it is fine to stop. Settings › Garden can soften the darker turns.', { icon: 'heart' }); } }));
  const h2 = right.appendChild(_gjEl('div', 'gj-etitle')); h2.innerHTML = '<h3>Letters</h3><small>tipped in, to open and read again</small>';
  const lt = right.appendChild(_gjEl('div', 'gj-letters wd-box'));
  if (typeof _wdBoxLetters === 'function') _wdBoxLetters(lt, _gjRepaint); else lt.appendChild(_gjEl('p', 'muted', 'Nothing yet.'));
}

/* ---------- Keepsakes ---------- */
function _gjKeep(left, right, m) {
  const h = left.appendChild(_gjEl('div', 'gj-ptitle')); h.innerHTML = `<h3>Keepsakes</h3><i class="gj-hand">things you keep</i>`;
  const shelf = left.appendChild(_gjEl('div', 'gj-grid gj-shelf'));
  const g = _gdG();
  // what came up on the line: the boot, the float, the key, the bottle...
  for (const d of GARDEN_FISH.filter(f => f.cat !== 'fish')) {
    const rec = g.fl[d.id], c = shelf.appendChild(_gjEl('div', 'gj-card' + (rec ? ' is-caught' : ' is-unheard')));
    c.innerHTML = `<span class="gj-cart">${rec ? _gjArt('fish', d.id, 56) : _gjSil('fish', d.id, 56)}</span>${rec ? `<b>${esc(d.name)}</b><small>${esc(_gjDay(rec.d))}</small>` : '<b class="gj-q">? ? ?</b><small class="gj-clue">“Something on the line that isn’t a fish.”</small>'}`;
  }
  // feathers, dusts and drops
  if (typeof GL_KEEPSAKE !== 'undefined') for (const d of GL_KEEPSAKE.values()) {
    const have = gardenLifeHas('k', d.id), c = shelf.appendChild(_gjEl('div', 'gj-card' + (have ? ' is-caught' : ' is-unheard')));
    const art = typeof _glbArt === 'function' ? _glbArt('k', d, 48) : '';
    c.innerHTML = `<span class="gj-cart${have ? '' : ' gj-sil'}">${art || icon('gem')}</span>${have ? `<b>${esc(d.name)}</b>` : `<b class="gj-q">? ? ?</b><small class="gj-clue">“${esc(d.hint || 'Keep your eyes on the ground.')}”</small>`}`;
  }
  if (typeof _glbFit === 'function') _glbFit(shelf);
  const h2 = right.appendChild(_gjEl('div', 'gj-etitle')); h2.innerHTML = '<h3>Found</h3><small>the gardener’s things, curios and what the ground gave up</small>';
  const found = right.appendChild(_gjEl('div', 'gj-found wd-box'));
  if (typeof wdBoxFound === 'function') { try { wdBoxFound(found, m); } catch (e) { found.appendChild(_gjEl('p', 'muted', 'Nothing found yet.')); } }
  if (typeof GARDEN_LAND_CURIOS !== 'undefined') {
    const seen = typeof gardenLandShowMine === 'function' ? new Set((gardenLandShowMine(m).c || [])) : new Set();
    const cg = right.appendChild(_gjEl('div', 'gj-grid gj-grid-sm'));
    for (const c0 of GARDEN_LAND_CURIOS) { const have = seen.has(c0.id); cg.appendChild(_gjEl('div', 'gj-card' + (have ? ' is-caught' : ' is-unheard'))).innerHTML = `<b class="${have ? '' : 'gj-q'}">${esc(have ? c0.name : '? ? ?')}</b>${have ? '' : `<small class="gj-clue">“${esc(c0.hint || 'Somewhere on the land.')}”</small>`}`; }
  }
}

/* ---------- Photos ---------- */
function _gjPhotos(left, right, m) {
  const h = left.appendChild(_gjEl('div', 'gj-ptitle')); h.innerHTML = `<h3>Photos</h3><i class="gj-hand">trophy cards for your record catches</i>`;
  const box = left.appendChild(_gjEl('div', 'gj-trophies'));
  if (typeof gardenSpecTab === 'function') { try { gardenSpecTab(box); } catch (e) { box.appendChild(_gjEl('p', 'muted', 'Nothing here yet.')); } }
  const h2 = right.appendChild(_gjEl('div', 'gj-etitle')); h2.innerHTML = '<h3>Postcards</h3><small>from your pet’s little journeys</small>';
  const pc = right.appendChild(_gjEl('div', 'gj-grid gj-grid-sm'));
  const cards = typeof _gpCards === 'function' ? (() => { try { return _gpCards(); } catch (e) { return []; } })() : [];
  for (const [pid] of cards) { const pl = typeof GP_PLACES !== 'undefined' ? GP_PLACES.find(x => x.id === pid) : null; pc.appendChild(_gjEl('div', 'gj-card is-caught')).appendChild(_gjEl('b', null, pl ? pl.name : 'A postcard')); }
  if (!cards.length) pc.appendChild(_gjEl('p', 'gj-hand gj-empty', 'No postcards yet. Pets send them from their journeys.'));
}
