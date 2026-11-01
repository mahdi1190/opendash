/* ============================================================
   GARDEN, the Catch page (2.22): #view=garden:catch, with five pages of its own.
     Bag and market   what you carry (sell one or the lot, give a catch to a friend, pin it), the market's appetite today,
                      and the order board: three requests a day, paid in coins and goods
     Fish book, Bug book  the dictionary (94-garden-fish-4book.js)
     Tackle           rods, nets, bait and floats: buy, equip, see what each one does
     Showcase         your tank (6 fish) and bug case (9 bugs): what the aquarium, the case and the trophy board in your garden
                      show, and what friends see when they visit
   Also the little card in the garden's side panel (gardenCatchSideCard): your rod, your bait, the casts you have left, the bugs about.
   ============================================================ */
const _gdc = { zone: '', found: '', n: 36 };
const GDC_TABS = Object.freeze([['bag', 'Bag and market', 'shopping-basket'], ['fish', 'Fish book', 'fish'], ['bugs', 'Bug book', 'bug'], ['tackle', 'Tackle', 'store'], ['show', 'Showcase', 'trophy'], ['best', 'My best catches', 'award'], ['lake', 'The lake', 'waves'], ['hall', 'The lake hall', 'landmark']]);
function _gdcTab() { const t = _gdG().prefs.catchTab; return GDC_TABS.some(x => x[0] === t) ? t : 'bag'; }
function _gdcSetTab(t) { const a = document.activeElement; if (a && a.classList && a.classList.contains('gdb-search')) a.blur(); _gdG().prefs.catchTab = t; if (typeof saveUI === 'function') saveUI(); _gdc.n = 36; _gdc.pick = null; _gdc.q = ''; _gdxRepaintTab(); }
function _gdcRar(r) { return GARDEN_RARITY[r] || GARDEN_RARITY.common; }
function _gdcPill(r) { return r === 'common' ? null : _gdpEl('span', 'gd-rar gd-rar-' + r, _gdcRar(r).label); }
function _gdcWhen(def, level) {
  const bits = [];
  if (def.cat === 'bug') bits.push(def.hab.map(h => ({ flower: 'flowers', lawn: 'the lawn', ground: 'the ground', tree: 'trees', water: 'the water’s edge', light: 'lights', woods: 'the woods' })[h] || h).slice(0, 2).join(' or '));
  else bits.push(def.zone.map(z => (GARDEN_FISH_ZONES[z] || {}).label || z).slice(0, 2).join(' or '));
  if (def.cat !== 'bug' && def.zone.length === 1 && def.zone[0] === 'pond' && (level || 1) < 7) bits.push('the pond opens at garden level 7');
  if (def.tod && def.tod.length && def.tod.length < 3) bits.push(def.tod.map(t => ({ dawn: 'at dawn', day: 'by day', dusk: 'at dusk', night: 'at night' })[t]).join(' or '));
  if (def.seasons && def.seasons.length) bits.push('in ' + def.seasons.join(', '));
  if (def.rain) bits.push('when it rains');
  if (def.lv > (level || 1)) bits.push(`from garden level ${def.lv}`);
  return bits.join(' · ');
}
function _gdcGoto(tab) { return () => _gdcSetTab(tab); }
function _gdcSay(r) { return _gdpSay(r); }

function gardenCatchTab(el, m) {
  const tab = _gdcTab();
  const top = _gdpEl('div', 'gd-shop-top gdc-top');
  top.appendChild(_gdxSeg(GDC_TABS, tab, _gdcSetTab, 'gd-shop-seg'));
  const bag = gardenCatchBag();
  const f = gardenCatchFacts();
  const sum = _gdpEl('span', 'gdc-sum muted');
  sum.textContent = `${f.fishSpecies} of ${GARDEN_FISH_ONLY.length} fish · ${f.bugSpecies} of ${GARDEN_BUGS.length} bugs · ${gardenSpecFound()} of ${GARDEN_VARIANTS.length} variants`;
  top.appendChild(sum);
  el.appendChild(top);
  if (tab === 'bag') _gdcBag(el, m, bag);
  else if (tab === 'fish') _gdcBook(el, m, 'fish');
  else if (tab === 'bugs') _gdcBook(el, m, 'bug');
  else if (tab === 'tackle') _gdcTackle(el, m);
  else if (tab === 'best') gardenSpecTab(el);
  else if (tab === 'lake') gardenLakeTab(el, m);
  else if (tab === 'hall') gardenHallTab(el, m);
  else _gdcShow(el, m);
}

/* ---------- bag and market ---------- */
function _gdcStars(q) { return q ? `<b class="gd-stars q${q}" title="${esc(gardenQuality(q).label)}">${gardenQuality(q).stars}</b>` : ''; }
function _gdcBag(el, m, bag) {
  const mk = gardenMarketInfo(m), E = GARDEN_CATCH_ECON;
  const head = _gdpEl('section', 'card gdc-market');
  head.innerHTML = `<div class="gdc-market-h">${icon('coins')}<b>The market</b><span class="muted" data-tip="Full price up to a limit each day, then a fifth"></span></div>`;
  const meters = _gdpEl('div', 'gdc-meters');
  const meter = (label, left, cap) => { const d = _gdpEl('div', 'gdc-meter'); d.innerHTML = `<span>${esc(label)}</span><span class="gdc-bar"><i style="width:${Math.round((cap - left) / cap * 100)}%"></i></span><b>${cap - left} of ${cap} coins</b>`; return d; };
  meters.appendChild(meter('Fish today', mk.fishLeft, mk.fishCap)); meters.appendChild(meter('Bugs today', mk.bugsLeft, mk.bugCap));
  const castLine = _gdpEl('div', 'gdc-casts muted'); castLine.innerHTML = `${icon('fish', 'i-sm')} <span>Fish as long as you like: cast near a shadow in the water. Further out, the fish are bigger.</span>`;
  head.appendChild(meters); head.appendChild(castLine);
  const acts = _gdpEl('div', 'gdc-acts');
  acts.appendChild(_gdpBtn('Sell spare fish', { icon: 'coins', disabled: !bag.nFish, tip: 'Sell every fish except the best of each kind', run: () => _gdcSay(gardenCatchSellAll('fish', 1)) }));
  acts.appendChild(_gdpBtn('Sell all fish', { icon: 'coins', kind: 'btn-ghost', disabled: !bag.nFish, run: () => _gdcSay(gardenCatchSellAll('fish', 0)) }));
  acts.appendChild(_gdpBtn('Sell spare bugs', { icon: 'coins', disabled: !bag.nBugs, tip: 'Sell every bug except one of each kind', run: () => _gdcSay(gardenCatchSellAll('bug', 1)) }));
  head.appendChild(acts);
  el.appendChild(head);
  // the order board
  const orders = gardenOrdersNow(m);
  const board = _gdpEl('section', 'card gdc-orders');
  board.innerHTML = `<div class="gdc-market-h">${icon('handshake')}<b>Order board</b></div>`;
  const list = _gdpEl('div', 'gdc-order-list');
  for (const o of orders) {
    const row = _gdpEl('div', 'gdc-order' + (o.done ? ' is-done' : ''));
    const art = _gdpEl('span', 'gdc-order-art'); art.innerHTML = gardenCatchSvg(o.kind, o.want, 48, { uid: 'od' + o.id }); row.appendChild(art);
    const t = _gdpEl('span', 'gdc-order-t');
    t.appendChild(_gdpEl('b', null, `${o.who} wants ${o.n} × ${o.def.name.toLowerCase()}`));
    const rw = Object.entries(o.reward || {}).map(([k, v]) => `${v} × ${_gdcItemName(k)}`).join(', ');
    t.appendChild(_gdpEl('small', 'muted', `Pays ${o.c} coins${rw ? ' and ' + rw : ''} · you have ${o.have}`));
    row.appendChild(t);
    row.appendChild(o.done ? _gdpEl('span', 'gdc-done', 'Done today') : _gdpBtn('Fill it', { icon: 'check', disabled: !o.ok, tip: o.ok ? 'Hand them over' : `You need ${o.n}`, run: () => _gdcSay(gardenOrderDo(o.id)) }));
    list.appendChild(row);
  }
  board.appendChild(list); el.appendChild(board);
  // the bag
  if (!bag.nFish && !bag.nBugs) {
    const e = _gdpEl('div', 'card gdc-empty');
    e.innerHTML = `${icon('fish')}<div><b>Nothing in your bag yet</b></div>`;
    el.appendChild(e); return;
  }
  const grid = _gdpEl('div', 'gd-grid gdc-grid');
  for (const r of bag.fish) grid.appendChild(_gdcBagCard('fish', r, m));
  for (const r of bag.bugs) grid.appendChild(_gdcBagCard('bug', r, m));
  el.appendChild(grid);
}
function _gdcItemName(k) {
  if (k.startsWith('seed:')) { const p = gardenPlant(k.slice(5)); return p ? p.name.toLowerCase() + ' seed' : 'a seed'; }
  if (k.startsWith('bait:')) { const g = gardenGearDef(k.slice(5)); return g ? g.name.toLowerCase() : 'bait'; }
  if (k.startsWith('decor:')) { const d = gardenDecor(k.slice(6)); return d ? d.name.toLowerCase() : 'a decoration'; }
  return k === 'fertiliser' ? 'fertiliser' : k;
}
function _gdcBagCard(kind, r, m) {
  const c = _gdpEl('div', 'gd-card gdc-bag gd-r-' + r.def.rarity);
  const sv = gardenSpecInBag(kind, r);   // a variant is on top of the pile, and sells for more
  const art = _gdpEl('div', 'gd-card-art'); art.innerHTML = gardenCatchSvg(kind, r.id, 84, { uid: 'bg' + kind + r.id + (r.q || 0), v: sv ? sv.v : '' }); c.appendChild(art);
  const t = _gdpEl('div', 'gd-card-t');
  const b = _gdpEl('b'); b.innerHTML = `${esc(r.def.name)} ${kind === 'fish' ? _gdcStars(r.q) : ''}`; t.appendChild(b);
  const p = _gdcPill(r.def.rarity); if (p) t.appendChild(p);
  const each = gardenCatchEach(r.key);
  t.appendChild(_gdpEl('small', 'muted', `×${r.n} · ${each} coin${each === 1 ? '' : 's'} each`));
  if (sv) t.appendChild(_gdpEl('small', 'gd-facts', `One is ${_gscA(gardenVariantDef(sv.v).name.toLowerCase())} one: it sells for ${gardenVariantTier(sv.v).sell} times the price. Your records keep it either way.`));
  c.appendChild(t);
  const f = _gdpEl('div', 'gd-card-f');
  f.appendChild(_gdpBtn('Sell', { icon: 'coins', tip: 'Sell one', run: () => _gdcSay(gardenCatchSell(r.key, 1)) }));
  if (typeof gardenBagExtras === 'function') gardenBagExtras(f, kind, r);   // let it go, give it to the hall
  if (r.n > 1) f.appendChild(_gdpBtn(`All ${r.n}`, { kind: 'btn-ghost', run: () => _gdcSay(gardenCatchSell(r.key, r.n)) }));
  if (kind === 'bug' || r.def.cat === 'fish') {
    const gb = _gdpBtn('', { icon: 'gift', kind: 'btn-ghost', aria: 'Give one to a friend', tip: 'Give one to a friend' });
    gb.onclick = (e) => { e.stopPropagation(); _gdcGiftMenu(kind, kind === 'fish' ? r.id + '-' + r.q : r.id, gb); };
    f.appendChild(gb);
  }
  c.appendChild(f);
  void m;
  return c;
}
/** Give a catch to a friend: pick who. The parcel goes through the garden's own gift flow (Undo, daily caps, the friend unwraps it). */
function _gdcGiftMenu(kind, id, anchor) {
  const fr = typeof _gscFriendList === 'function' ? _gscFriendList() : [];
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop', 'gsv-gifts');
    el.appendChild(_gdpEl('div', 'pop-label', 'Give it to…'));
    if (!fr.length) { el.appendChild(_gdpEl('p', 'gsv-pop-p muted', 'You have no friends in Freeflo yet. Add some in Friends, and you can give them your catches.')); el.appendChild(_gdpBtn('Open Friends', { icon: 'users', run: () => { close(); setView('friends'); } })); return; }
    const list = _gdpEl('div', 'gsv-gift-list');
    for (const f of fr.slice(0, 60)) {
      const b = _gdpEl('button', 'gsv-gift'); b.type = 'button';
      b.appendChild(_gdpEl('span', 'gsv-gift-t', typeof gardenSocialName === 'function' ? gardenSocialName(f.id) : 'Friend'));
      b.onclick = () => { close(); gardenSocialGive(f.id, kind, id); };
      list.appendChild(b);
    }
    el.appendChild(list);
    el.appendChild(_gdpEl('p', 'gsv-pop-p muted gsv-small', 'It leaves your bag. A few seconds to Undo before it goes. One parcel a day for each friend.'));
  }, { align: 'end', width: 280 });
}

/* ---------- tackle ---------- */
function _gdcGearStats(d) {
  const s = d.st;
  if (d.kind === 'lake') return [s.adds];
  if (d.kind === 'rod') return [`Reaches ${s.range} cells`, `Bar ${Math.round(s.bar * 100)}%`, s.line < 1 ? `Line ${Math.round((1 - s.line) * 100)}% kinder` : '', s.react ? `${s.react.toFixed(1)}s longer to strike` : '', `Lands up to ${gardenQuality(s.q).stars || 'plain'}`].filter(Boolean);
  if (d.kind === 'net') return [`Reaches ${s.reach} cells`, `Swing ${s.swing}s`, s.luck ? `+${Math.round(s.luck * 100)}% luck` : ''].filter(Boolean);
  return [s.lure ? 'Fish notice it from further away' : 'Always there', s.rare ? 'Shy fish come more readily' : '', s.night ? 'Best at night' : '', s.chum ? 'Brings a fish up near your float' : ''].filter(Boolean);
}
function _gdcGearCard(d, m) {
  const owned = gardenGearOwned(d.id);
  const kind = d.kind;
  const cur = kind === 'lake' ? d : kind === 'rod' ? gardenRod() : kind === 'net' ? gardenNet() : gardenBait();
  const equipped = kind !== 'lake' && cur.id === d.id;
  const c = _gdpEl('div', 'gd-card gdc-gear' + (equipped ? ' is-equipped' : '') + (!owned && kind !== 'bait' ? ' is-locked' : ''));
  const art = _gdpEl('div', 'gd-card-art'); art.innerHTML = kind === 'lake' ? gardenWorkSvg(d.id, 64) : gardenCatchSvg(kind, d.id, 64); c.appendChild(art);
  const t = _gdpEl('div', 'gd-card-t');
  t.appendChild(_gdpEl('b', null, d.name));
  if (kind === 'bait' && !d.own) t.appendChild(_gdpEl('small', 'gd-have', `${gardenHas('bait:' + d.id)} in your bag`));
  t.appendChild(_gdpEl('small', 'gd-facts', _gdcGearStats(d).join(' · ')));
  t.appendChild(_gdpEl('small', 'muted', d.blurb));
  c.appendChild(t);
  const f = _gdpEl('div', 'gd-card-f');
  if (kind === 'bait') {
    if (!d.own) {
      const why = (d.lv || 1) > m.level.level ? 'Garden level ' + d.lv : '';
      if (why) { const l = _gdpEl('span', 'gd-lock'); l.innerHTML = icon('lock', 'i-xs'); l.appendChild(_gdpEl('span', null, why)); f.appendChild(l); }
      else f.appendChild(_gdpBtn(`Buy ${d.pack} · ${d.price} coins`, { icon: 'shopping-bag', disabled: m.wallet.coins < d.price, run: () => _gdcSay(gardenGearBuy(d.id)) }));
    }
    if (d.own || gardenHas('bait:' + d.id) > 0) f.appendChild(_gdpBtn(equipped ? 'Using this' : 'Use this bait', { icon: equipped ? 'check' : 'fish', kind: equipped ? 'btn-secondary' : 'btn-ghost', disabled: equipped, run: () => { _gdcSay(gardenGearEquip('bait', d.id)); } }));
  } else if (owned && kind === 'lake') {
    const l = _gdpEl('span', 'gd-have'); l.textContent = 'Built'; f.appendChild(l);
  } else if (owned) {
    f.appendChild(_gdpBtn(equipped ? 'In your hand' : 'Use this', { icon: equipped ? 'check' : 'hand', kind: equipped ? 'btn-secondary' : 'btn-primary', disabled: equipped, run: () => { _gdcSay(gardenGearEquip(kind, d.id)); } }));
  } else if (d.ribbon) {
    const r = GARDEN_RIBBONS.find(x => x.id === d.ribbon), l = _gdpEl('span', 'gd-lock'); l.innerHTML = icon('lock', 'i-xs'); l.appendChild(_gdpEl('span', null, 'Ribbon: ' + (r ? r.label : d.ribbon))); f.appendChild(l);
  } else {
    const pr = gardenGearBuyInfo(d.id, m);
    if (pr.why) { const l = _gdpEl('span', 'gd-lock'); l.innerHTML = icon('lock', 'i-xs'); l.appendChild(_gdpEl('span', null, pr.why)); f.appendChild(l); }
    f.appendChild(_gdpBtn(`Buy · ${d.price} coins`, { icon: 'shopping-bag', disabled: !!pr.why || m.wallet.coins < d.price, run: () => _gdcSay(gardenGearBuy(d.id)) }));
  }
  c.appendChild(f);
  return c;
}
/** Why you cannot buy a rod or net yet ('' = you can). */
function gardenGearBuyInfo(id, m) {
  const d = gardenGearDef(id); if (!d) return { why: 'Unknown' };
  if ((d.lv || 1) > m.level.level) return { why: 'Garden level ' + d.lv };
  const list = d.kind === 'rod' ? GARDEN_RODS : GARDEN_NETS, prev = d.kind === 'lake' ? (d.needs ? gardenGearDef(d.needs) : null) : list.find(x => x.tier === d.tier - 1);
  if (prev && !gardenGearOwned(prev.id)) return { why: 'Needs the ' + prev.name.toLowerCase() };
  return { why: '' };
}
function _gdcTackle(el, m) {
  const intro = _gdpEl('p', 'muted gdc-intro'); intro.innerHTML = `${icon('store', 'i-sm')} <span>You can also walk to the tackle shop on the shore and knock. You have <b>${_gdpNum(m.wallet.coins)}</b> coins.</span>`; el.appendChild(intro);
  const sec = (title, list, extra) => {
    el.appendChild(_gdpEl('h3', 'gdc-h', title));
    const grid = _gdpEl('div', 'gd-grid gd-shop-grid gdc-grid'); for (const d of list) grid.appendChild(_gdcGearCard(d, m)); el.appendChild(grid);
    if (extra) el.appendChild(extra);
  };
  gardenSetupPanel(el, m);
  sec('Rods', GARDEN_RODS);
  gardenTackleShelves(el, m);
  sec('Nets', GARDEN_NETS); sec('Bait', GARDEN_BAITS); sec('Build for the lake', GARDEN_WORKS);
  el.appendChild(_gdpEl('h3', 'gdc-h', 'Floats'));
  const grid = _gdpEl('div', 'gd-grid gdc-grid gdc-bobbers');
  const cur = gardenBobber();
  for (const b of GARDEN_BOBBERS) {
    const own = gardenBobberOwned(b.id), c = _gdpEl('div', 'gd-card gdc-gear' + (cur.id === b.id ? ' is-equipped' : '') + (own ? '' : ' is-locked'));
    const art = _gdpEl('div', 'gd-card-art'); art.innerHTML = gardenCatchSvg('bobber', b.id, 52); c.appendChild(art);
    const t = _gdpEl('div', 'gd-card-t'); t.appendChild(_gdpEl('b', null, b.name)); t.appendChild(_gdpEl('small', 'muted', own ? 'Yours' : b.hint)); c.appendChild(t);
    const f = _gdpEl('div', 'gd-card-f');
    if (own) f.appendChild(_gdpBtn(cur.id === b.id ? 'On your line' : 'Use this', { kind: cur.id === b.id ? 'btn-secondary' : 'btn-ghost', disabled: cur.id === b.id, run: () => _gdcSay(gardenGearEquip('bobber', b.id)) }));
    else { const l = _gdpEl('span', 'gd-lock'); l.innerHTML = icon('lock', 'i-xs'); l.appendChild(_gdpEl('span', null, b.hint)); f.appendChild(l); }
    c.appendChild(f); grid.appendChild(c);
  }
  el.appendChild(grid);
}

/* ---------- the showcase ---------- */
function _gdcShow(el, m) {
  const E = GARDEN_CATCH_ECON, show = gardenShowGet(), ent = gardenShowEntries();
  const intro = _gdpEl('p', 'muted gdc-intro'); intro.innerHTML = `${icon('trophy', 'i-sm')} <span>Pin your best catches. They swim in an <b>Aquarium</b>, sit in a <b>Bug case</b> and hang on a <b>Trophy board</b> in your garden (from the shop, under Angling and bugs), and friends see them when they visit. A fish is shown at your personal best size.</span>`;
  el.appendChild(intro);
  const have = (id) => gardenHas('decor:' + id) + m.decor.filter(d => d.def.id === id).length;
  const wrap = _gdpEl('div', 'gdc-showwrap');
  const panel = (title, id, count, cap, art) => {
    const p = _gdpEl('section', 'card gdc-showpanel');
    const h = _gdpEl('div', 'gdc-showh'); h.appendChild(_gdpEl('b', null, title)); h.appendChild(_gdpEl('span', 'muted', `${count} of ${cap}`)); p.appendChild(h);
    const a = _gdpEl('div', 'gdc-showart'); a.innerHTML = art; p.appendChild(a);
    const foot = _gdpEl('div', 'gdc-showf');
    if (have(id)) foot.appendChild(_gdpEl('small', 'muted', m.decor.some(d => d.def.id === id) ? `Your ${gardenDecor(id).name.toLowerCase()} is in the garden.` : `You have a ${gardenDecor(id).name.toLowerCase()}: place it with Decorate.`));
    else foot.appendChild(_gdpBtn(`${gardenDecor(id).name} · ${gardenDecor(id).price} coins`, { icon: 'store', kind: 'btn-ghost', run: () => { _gdx.shop = 'decor'; _gdx.shopCat = 'angling'; gardenGoPage('garden:shop'); } }));
    p.appendChild(foot);
    return p;
  };
  const sig = gardenShowSig(ent);
  wrap.appendChild(panel('Aquarium', 'aquarium', show.f.length, E.showFish, gardenIconSvg('aquarium', { kind: 'decor', px: 220, show: ent, shw: sig, tod: 'day', season: m.season })));
  wrap.appendChild(panel('Bug case', 'bug-case', show.b.length, E.showBugs, gardenIconSvg('bug-case', { kind: 'decor', px: 150, show: ent, shw: sig, tod: 'day', season: m.season })));
  el.appendChild(wrap);
  // what is pinned
  const pins = _gdpEl('div', 'gdc-pins');
  for (const [id, q, cm, v] of ent.f) {
    const b = _gdpEl('button', 'gdc-pin'); b.type = 'button'; b.setAttribute('data-tip', 'Take it out');
    b.innerHTML = gardenCatchSvg('fish', id, 54, { uid: 'pn' + id, v }) + `<span>${esc(gardenSpecName('fish', id, v))}</span><small>${cm} cm ${gardenQuality(q).stars}</small>`;
    b.onclick = () => _gdcSay(gardenShowToggle('fish', id));
    pins.appendChild(b);
  }
  for (const [bi, id] of ent.b.entries()) {
    const b = _gdpEl('button', 'gdc-pin'); b.type = 'button'; b.setAttribute('data-tip', 'Take it out');
    b.innerHTML = gardenCatchSvg('bug', id, 46, { uid: 'pb' + id, glow: false, v: ent.bv[bi] }) + `<span>${esc(gardenSpecName('bug', id, ent.bv[bi]))}</span>`;
    b.onclick = () => _gdcSay(gardenShowToggle('bug', id));
    pins.appendChild(b);
  }
  if (!ent.f.length && !ent.b.length) pins.appendChild(_gdpEl('p', 'muted', 'Nothing pinned yet. Open the Fish book or the Bug book and choose Show it off on something you have caught.'));
  el.appendChild(pins);
  const row = _gdpEl('div', 'gdc-acts');
  row.appendChild(_gdpBtn('My best catches', { icon: 'award', run: _gdcGoto('best') }));
  row.appendChild(_gdpBtn('Fish book', { icon: 'fish', run: _gdcGoto('fish') }));
  row.appendChild(_gdpBtn('Bug book', { icon: 'bug', run: _gdcGoto('bugs') }));
  el.appendChild(row);
}

/* ---------- the card in the garden's side panel: the rod and the net you carry ---------- */
function gardenCatchSideCard(m) {
  const card = _gdpEl('section', 'card gdc-side');
  const rod = gardenRod(), net = gardenNet(), bait = gardenBait();
  const h = _gdpEl('div', 'gdc-side-h');
  h.innerHTML = `<span class="gdc-side-art">${gardenCatchSvg('rod', rod.id, 36)}</span>`;
  const t = _gdpEl('div', 'gdc-side-t');
  t.appendChild(_gdpEl('b', null, 'Fishing and bugs'));
  t.appendChild(_gdpEl('small', 'muted', `${rod.name} · ${net.name}`));
  h.appendChild(t); card.appendChild(h);
  const row = _gdpEl('label', 'gdc-baitrow'); row.appendChild(_gdpEl('span', 'muted', 'Bait'));
  const sel = _gdpEl('select', 'control'); sel.setAttribute('aria-label', 'Bait');
  for (const b of GARDEN_BAITS) { if (!b.own && gardenHas('bait:' + b.id) < 1) continue; const o = document.createElement('option'); o.value = b.id; o.textContent = b.own ? b.name : `${b.name} (${gardenHas('bait:' + b.id)})`; if (b.id === bait.id) o.selected = true; sel.appendChild(o); }
  sel.onchange = () => { gardenGearEquip('bait', sel.value); sel.blur(); };
  row.appendChild(sel); card.appendChild(row);
  if (typeof gardenSetupQuick === 'function') gardenSetupQuick(card);
  const n = typeof _gw !== 'undefined' && _gw.bugs ? _gw.bugs.size : 0;
  const tip = _gdpEl('p', 'muted gdc-side-tip');
  tip.textContent = m.tod === 'night' ? 'Night: eels, zander and the deep lantern fish are about. ' : m.rain.now ? 'Rain: the trout and the catfish are biting. ' : '';
  tip.textContent += n ? `${n} bug${n === 1 ? '' : 's'} about: click one to creep up on it.` : (gardenFun() === 'off' ? 'Bugs rest while the Fun level is Off.' : 'Click the lake to fish. Bugs come out by day near flowers, and by night near lights.');
  card.appendChild(tip);
  return card;
}
/** A friend's showcase as a card on their visit page (null when they have none): their best fish with size and stars, their bugs, their gear. */
function gardenCatchVisitCard(f, snap) {
  const sh = (snap && snap.sh ? gardenShowClean(snap.sh) : null) || { f: [], b: [], rod: 0, net: 0 }, best = typeof gardenSpecVisitRow === 'function' ? gardenSpecVisitRow(snap) : null;
  if (!sh.f.length && !sh.b.length && !best) return null;
  const card = _gdpEl('div', 'card gsv-card-s gdc-visit');
  card.appendChild(_gdpEl('h3', 'gd-h3', `${typeof _gscFirst === 'function' ? _gscFirst(f.id) : 'Their'}'s catches`));
  const row = _gdpEl('div', 'gdc-visit-row');
  for (const [id, q, cm, v] of sh.f) {
    const d = gardenFishDef(id); if (!d) continue;
    const s = _gdpEl('span', 'gdc-visit-i'); s.innerHTML = gardenCatchSvg('fish', id, 58, { uid: 'vf' + id, v }) + `<small>${cm} cm ${gardenQuality(q).stars}</small>`; s.setAttribute('data-tip', gardenSpecName('fish', id, v)); row.appendChild(s);
  }
  for (const [bi, id] of sh.b.entries()) { const d = gardenBugDef(id); if (!d) continue; const v = (sh.bv || [])[bi], s = _gdpEl('span', 'gdc-visit-i is-bug'); s.innerHTML = gardenCatchSvg('bug', id, 40, { uid: 'vb' + id, glow: false, v }); s.setAttribute('data-tip', gardenSpecName('bug', id, v)); row.appendChild(s); }
  if (row.children.length) card.appendChild(row);
  if (best) card.appendChild(best);
  const rod = sh.rod ? GARDEN_RODS.find(r => r.tier === sh.rod) : null, net = sh.net ? GARDEN_NETS.find(r => r.tier === sh.net) : null;
  if (rod || net) card.appendChild(_gdpEl('p', 'muted gsv-small', [rod && rod.name, net && net.name].filter(Boolean).join(' · ')));
  return card;
}
