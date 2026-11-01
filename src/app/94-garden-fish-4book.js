/* ============================================================
   GARDEN, the dictionary: every fish, find and bug in one big book (the Fish book and Bug book tabs of the Catch page).
   The owner, 1 Nov 2026: "a big fish and bug dictionary, but make it clear how to catch the type of fish, so if we need certain bait, a certain reel, certain things".

     A page of cards   a picture (a shadow until you have caught it), a name, one line of where and when. Search by name, and simple filters.
     An entry          press a card: the big picture, what you have caught, your record, when and where, and how to catch it, line by line, with a tick beside what
                       you have right now. Every line comes from gardenCatchNeedsRows, so it can never disagree with the game.

   _gdc holds the filters; the entry you are reading is _gdc.pick. The search box stays put while you type: only the cards are drawn again.
   ============================================================ */
const _GDB_MORE = Object.freeze({ tod: [['', 'Any time'], ['dawn', 'Dawn'], ['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night']], season: [['', 'All year'], ['spring', 'Spring'], ['summer', 'Summer'], ['autumn', 'Autumn'], ['winter', 'Winter']], rar: [['', 'Any rarity'], ['common', 'Common'], ['uncommon', 'Uncommon'], ['rare', 'Rare'], ['epic', 'Epic'], ['legendary', 'Legendary']] });
function _gdbCtx(m, zone) {
  const g = _gdG(), blooms = m.plants.filter(p => p.stage >= 3);
  const ctx = { zone, tod: m.tod, season: m.season, rain: !!(m.rain && m.rain.now), level: m.level.level, moon: gardenMoonPhase(m.today), decor: (id) => m.decor.some(d => d.def.id === id) || gardenWorkOwned(id), plant: (id) => blooms.some(p => p.def.id === id) };
  if (typeof gardenEventOn === 'function') ctx.event = gardenEventOn;
  void g;
  return ctx;
}
/** Can it be about right now, wherever you are looking for it? (A spot is a place you go to, so it does not count against it.) */
function _gdbNow(d, m) {
  const H = gardenRegionHome(d);
  if (H && !gardenRegionHomeOpen(H, m.areas)) return false;
  if (H && H.w && H.w !== 'pond' && d.cat === 'fish') return gardenFishFits(d, Object.assign(_gdbCtx(m), { zone: d.zone[0] }));
  if (d.cat === 'bug') return gardenBugFits(d, _gdbCtx(m));
  if (d.cat !== 'fish') return true;
  return d.zone.some(z => (z !== 'pond' || m.areas.includes('pond')) && gardenFishFits(d, _gdbCtx(m, z)));
}
/** One row of the how-to: true (you have it now), false (not now) or null (nothing to check). */
function _gdbRowOk(r, d, m, setup) {
  const n = d.needs || {}, c = _gdbCtx(m), list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  switch (r.k) {
    case 'home': return gardenRegionHomeOpen(gardenRegionHome(d), m.areas);
    case 'when': return !d.tod.length ? null : d.tod.includes(m.tod);
    case 'season': return d.seasons.length ? d.seasons.includes(m.season) : d.cat === 'bug' ? m.season !== 'winter' : null;
    case 'rain': return d.cat === 'bug' ? (d.rain ? c.rain : c.rain ? d.hab.includes('light') : true) : n.rain === true ? c.rain : n.rain === false ? !c.rain : null;
    case 'moon': return list(n.moon).includes(c.moon);
    case 'level': return Math.max(d.lv || 1, n.level || 1) <= m.level.level;
    case 'decor': return c.decor(n.decor);
    case 'plant': return c.plant(n.plant);
    case 'event': return typeof gardenEventOn === 'function' ? !!gardenEventOn(n.event) : null;
    case 'rod': return !gardenFishLacks({ needs: { rod: n.rod } }, setup).length;
    case 'reel': return gardenGearDef(n.reel) ? !gardenFishLacks({ needs: { reel: n.reel } }, setup).length : null;
    case 'line': return gardenGearDef(n.line) ? !gardenFishLacks({ needs: { line: n.line } }, setup).length : null;
    case 'hook': return gardenGearDef(n.hook) ? !gardenFishLacks({ needs: { hook: n.hook } }, setup).length : null;
    case 'bait': return list(n.bait).length && list(n.bait).some(id => gardenGearDef(id)) ? !gardenFishLacks({ needs: { bait: n.bait } }, setup).length : null;
    case 'net': return gardenNet().tier >= n.net;
    default: return null;
  }
}
function _gdbSetup() { return typeof gardenTackleInUse === 'function' ? gardenTackleInUse() : { rod: gardenRod().tier, bait: gardenBait().id }; }
function _gdbMoonLine(m) {
  const ph = gardenMoonPhase(m.today), word = { new: 'a new moon', full: 'a full moon', waxing: 'a growing moon', waning: 'a shrinking moon' }[ph];
  const f = gardenMoonIn(m.today, 'full'), n = gardenMoonIn(m.today, 'new'), days = (k) => (k === 1 ? 'tomorrow' : `in ${k} days`);
  return `Tonight: ${word}.` + (ph === 'full' ? ` New moon ${days(n)}.` : ph === 'new' ? ` Full moon ${days(f)}.` : ` Full moon ${days(f)}, new moon ${days(n)}.`);
}
/** Draw the book again. The pop-up will not redraw while a text box has the focus, and a tap on a phone's button does not move it, so let go of the search box first. */
function _gdbGo() { const a = document.activeElement; if (a && a.classList && a.classList.contains('gdb-search')) a.blur(); _gdxRepaintTab(); }
/** The name a card shows: unknown ones stay ??? unless you searched for that very name. */
function _gdbMatches(d, q) { return !q || d.name.toLowerCase().includes(q); }
/** Where a kind lives, for the order of the book: [its place in the list of areas, the area's name]. */
function _gdbArea(d) {
  const H = typeof gardenRegionHome === 'function' ? gardenRegionHome(d) : null, i = H ? GARDEN_REGIONS.findIndex(x => x.id === H.r) : -1;
  return i < 0 ? [GARDEN_REGIONS.length, d.cat === 'bug' || d.cat === 'fish' ? 'Elsewhere' : 'Finds'] : [i, GARDEN_REGIONS[i].name];
}
function _gdbCmp(a, b) {
  const R = Object.keys(GARDEN_RARITY);
  return _gdbArea(a.def)[0] - _gdbArea(b.def)[0] || (a.rec ? 0 : 1) - (b.rec ? 0 : 1) || R.indexOf(a.def.rarity) - R.indexOf(b.def.rarity) || String(a.def.name).localeCompare(b.def.name);
}
function _gdcBook(el, m, kind) {
  const isFish = kind === 'fish', log = gardenCatchLog(), rows = isFish ? log.fish : log.bugs;
  if (_gdc.pick && _gdc.pickKind === kind) { const r = rows.find(x => x.def.id === _gdc.pick); if (r) { _gdbEntry(el, m, kind, r); return; } }
  const total = rows.length, found = rows.filter(r => r.rec).length;
  const head = _gdpEl('section', 'card gdb-head');
  const top = _gdpEl('div', 'gdb-progress');
  top.innerHTML = `<b>${found} of ${total}</b><span class="gdc-bar"><i style="width:${Math.round(found / Math.max(1, total) * 100)}%"></i></span><span class="muted">${isFish ? 'fish and finds' : 'bugs'} found</span>`;
  head.appendChild(top);
  const search = _gdpEl('input', 'control gdb-search'); search.type = 'search'; search.placeholder = isFish ? 'Find a fish by name' : 'Find a bug by name'; search.setAttribute('aria-label', search.placeholder); search.value = _gdc.q || '';
  head.appendChild(search);
  const chips = (list, key, label) => { const w = _gdpEl('div', 'gdb-filter'); if (label) w.appendChild(_gdpEl('span', 'gdb-filter-l muted', label)); w.appendChild(_gdxChips(list, _gdc[key] || '', (k) => { _gdc[key] = k; _gdbGo(); })); return w; };
  head.appendChild(chips([['', 'Everything'], ['yes', 'Caught'], ['no', 'Not yet'], ['now', 'About right now']], 'found', 'Show'));
  if (isFish) head.appendChild(chips([['', 'All water'], ['pond', 'Pond'], ['shallow', 'Shallows'], ['mid', 'Open water'], ['deep', 'Deep'], ['finds', 'Finds']], 'zone', 'Where'));
  const more = _gdpEl('details', 'gdb-more'); if (_gdc.tod || _gdc.season || _gdc.rar || _gdc.kit) more.open = true;
  more.appendChild(_gdpEl('summary', null, 'More filters'));
  more.ontoggle = () => gardenPagerFit();   // the drawer takes room from the page: fewer rows, no scrolling
  more.appendChild(_gdpEl('p', 'gdb-moon muted', _gdbMoonLine(m)));
  more.appendChild(chips(_GDB_MORE.tod, 'tod', 'Time'));
  more.appendChild(chips(_GDB_MORE.season, 'season', 'Season'));
  more.appendChild(chips(_GDB_MORE.rar, 'rar', 'Rarity'));
  more.appendChild(chips([['', 'Any'], ['easy', 'No special kit'], ['kit', 'Needs a setup'], ['rain', 'Rain'], ['moon', 'Moon']], 'kit', 'Needs'));
  head.appendChild(more);
  el.appendChild(head);
  const box = _gdpEl('div', 'gdb-cards'); el.appendChild(box);
  const paint = () => {
    box.textContent = '';
    const q = (_gdc.q || '').trim().toLowerCase();
    let list = rows.filter(r => _gdbMatches(r.def, q));
    if (isFish && _gdc.zone) list = list.filter(r => _gdc.zone === 'finds' ? r.def.cat !== 'fish' : r.def.cat === 'fish' && r.def.zone.includes(_gdc.zone));
    if (_gdc.found === 'yes' || _gdc.found === 'no') list = list.filter(r => (_gdc.found === 'yes') === !!r.rec);
    if (_gdc.found === 'now') list = list.filter(r => _gdbNow(r.def, m));
    if (_gdc.tod) list = list.filter(r => !r.def.tod.length || r.def.tod.includes(_gdc.tod));
    if (_gdc.season) list = list.filter(r => !r.def.seasons.length || r.def.seasons.includes(_gdc.season));
    if (_gdc.rar) list = list.filter(r => r.def.rarity === _gdc.rar);
    if (_gdc.kit) list = list.filter(r => { const n = r.def.needs || {}, kit = n.rod || n.reel || n.line || n.hook || n.net || n.bait || n.decor || n.plant || n.spot || n.event; return _gdc.kit === 'easy' ? !kit : _gdc.kit === 'kit' ? !!kit : _gdc.kit === 'rain' ? n.rain === true || !!r.def.rain : !!n.moon; });
    // by area, what you have found first inside an area, then how rare. Each set of filters remembers its own page; a search starts at page 1.
    const place = ['book', kind, _gdc.found, _gdc.zone, _gdc.tod, _gdc.season, _gdc.rar, _gdc.kit].map(x => x || '').join(':') + (q ? '?' : '');
    gardenPager(box, { key: place, sig: q, items: gardenPagerOrder(place, list, r => r.def.id, _gdbCmp, q), grid: 'gdb-grid gpg-book', row: 172, rowSm: 158, label: (r) => _gdbArea(r.def)[1], draw: (r) => _gdbCard(r, kind, m, q), none: q ? `Nothing in the book called “${q}”.` : 'Nothing here with those filters.' });
  };
  search.oninput = () => { _gdc.q = search.value; paint(); };
  paint();
  // (a pop-up puts the focus in its first box as it opens: on a phone that would throw up the keyboard over the book)
  if (!_gdc.q) setTimeout(() => { if (document.activeElement === search && !search.value) search.blur(); }, 30);
}
function _gdbCard(r, kind, m, q) {
  const d = r.def, known = !!r.rec, b = _gdpEl('button', 'gdb-card gd-r-' + d.rarity + (known ? '' : ' is-unknown')); b.type = 'button';
  const art = _gdpEl('span', 'gdb-card-art'); art.innerHTML = gardenCatchSvg(kind, d.id, 84, { uid: 'bk' + d.id, silhouette: !known, glow: false, real: true }); b.appendChild(art);
  const name = known || q ? d.name : '???';
  b.appendChild(_gdpEl('b', 'gdb-card-n', name));
  b.appendChild(_gdpEl('small', 'gdb-card-s muted', known ? (d.cat === 'fish' ? `Best ${Math.round(Number(r.rec.b) || 0)} cm · ${r.rec.n || 0} caught` : `${r.rec.n || 0} caught`) : _gdcWhen(d, m.level.level)));
  const p = known ? _gdcPill(d.rarity) : null; if (p) b.appendChild(p);
  if (_gdbNow(d, m) && !known) b.appendChild(_gdpEl('span', 'gdb-now', 'About now'));
  b.setAttribute('aria-label', `${name}. Open its page.`);
  b.onclick = () => { _gdc.pick = d.id; _gdc.pickKind = kind; _gdbGo(); };
  return b;
}
/** One entry's page. */
function _gdbEntry(el, m, kind, r) {
  const d = r.def, rec = r.rec, known = !!rec, setup = _gdbSetup();
  const page = _gdpEl('section', 'card gdb-entry gd-r-' + d.rarity);
  const back = _gdpBtn('Back to the book', { icon: 'arrow-left', kind: 'btn-ghost', run: () => { _gdc.pick = null; _gdbGo(); } });
  page.appendChild(back);
  const top = _gdpEl('div', 'gdb-entry-top');
  const art = _gdpEl('div', 'gdb-entry-art'); art.innerHTML = gardenCatchSvg(kind, d.id, 220, { uid: 'be' + d.id, silhouette: !known, glow: false, real: true }); top.appendChild(art);
  const t = _gdpEl('div', 'gdb-entry-t');
  t.appendChild(_gdpEl('h3', 'gd-h3', known ? d.name : 'Not caught yet'));
  const pill = _gdcPill(d.rarity); if (pill) t.appendChild(pill);
  if (known && d.blurb) t.appendChild(_gdpEl('p', 'gdb-blurb', d.blurb));
  if (known) {
    const facts = _gdpEl('dl', 'gdb-facts'), fact = (a, b) => { facts.appendChild(_gdpEl('dt', 'muted', a)); facts.appendChild(_gdpEl('dd', null, b)); };
    fact('You have caught', String(rec.n || 0) + (rec.g ? ' (and one came as a gift)' : ''));
    if (d.cat === 'fish') { fact('Your record', `${Math.round(Number(rec.b) || 0)} cm${rec.q ? ' ' + gardenQuality(rec.q).stars : ''}`); fact('Biggest it can be', `${d.cm[1]} cm`); }
    if (rec.d) fact('First caught', _gdbDay(rec.d));
    if (rec.l && rec.l !== rec.d) fact('Last caught', _gdbDay(rec.l));
    if (r.held) fact('In your bag', String(r.held));
    t.appendChild(facts);
  } else t.appendChild(_gdpEl('p', 'muted', 'You will see its name and its story once you catch one. Here is how.'));
  if (d.cat === 'fish' && typeof gardenReadyButton === 'function') t.appendChild(gardenReadyButton(d));   // put on what it needs, walk there and cast (94-garden-fish-9page.js)
  top.appendChild(t); page.appendChild(top);
  const now = _gdbNow(d, m);
  page.appendChild(_gdpEl('h4', 'gdb-how-h', d.cat === 'fish' || d.cat === 'bug' ? 'How to catch it' : 'How to find it'));
  const ul = _gdpEl('ul', 'gdb-how');
  for (const row of gardenCatchNeedsRows(d)) {
    const ok = _gdbRowOk(row, d, m, setup), li = _gdpEl('li', ok === true ? 'is-ok' : ok === false ? 'is-no' : '');
    li.innerHTML = `<span class="gdb-how-i">${ok === true ? icon('check', 'i-sm') : ok === false ? icon('x', 'i-sm') : ''}</span><b>${esc(row.label)}</b><span>${esc(row.text)}${ok === null ? '' : ' <em>' + (['rod', 'reel', 'line', 'hook', 'bait', 'net'].includes(row.k) ? (ok ? 'You have that with you.' : 'You do not have that with you.') : ['decor', 'plant'].includes(row.k) ? (ok ? 'You have that.' : 'You do not have that yet.') : row.k === 'level' ? (ok ? 'You are there.' : 'Not yet.') : row.k === 'home' ? (ok ? 'You can get there.' : 'Not open yet.') : (ok ? 'Right now, yes.' : 'Not right now.')) + '</em>'}</span>`;
    ul.appendChild(li);
  }
  page.appendChild(ul);
  page.appendChild(_gdpEl('p', 'gdb-nowline ' + (now ? 'is-yes' : 'muted'), now ? (kind === 'bug' ? 'It could be about right now. Keep your eyes open.' : 'It could be in the water right now. Cast near a shadow.') : 'It is not about right now. Check the lines above with a cross.'));
  if (d.needs && d.needs.moon) page.appendChild(_gdpEl('p', 'muted gdb-moon', _gdbMoonLine(m)));
  if (known && (kind === 'bug' || d.cat === 'fish')) {
    const show = gardenShowGet(), on = (kind === 'bug' ? show.b : show.f).includes(d.id), f = _gdpEl('div', 'gdc-acts');
    const pb = _gdpBtn(on ? 'In your showcase' : 'Show it off', { icon: on ? 'check' : 'trophy', kind: on ? 'btn-secondary' : 'btn-primary', tip: on ? 'Take it out of your showcase' : `Put your ${kind === 'bug' ? 'specimen' : 'best one'} in the ${kind === 'bug' ? 'bug case' : 'tank'}`, run: () => _gdcSay(gardenShowToggle(kind, d.id)) });
    pb.setAttribute('aria-pressed', on ? 'true' : 'false'); f.appendChild(pb); page.appendChild(f);
  }
  el.appendChild(page);
}
function _gdbDay(iso) { const d = new Date(String(iso) + 'T12:00:00'); return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
