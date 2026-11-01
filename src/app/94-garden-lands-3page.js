/* ============================================================
   GARDEN, the land (the page). The bubbles on what you have built, the land office pop-up, and the small finds lying about: today's dig spot, the forage, the weekend cart.
   Everything says in plain words what is needed. On a friend's land you can look at things but not use them (the lookout you can climb).
   ============================================================ */
const _gldp = { sprites: new Map() };
function gardenLandGrowsLine(s) { const names = s.cats.map(c => (GARDEN_CATS[c] || {}).label).filter(Boolean).map(n => n.toLowerCase()); return names.length ? 'grows ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]) : ''; }
/** After an action: the world answers, a red flash and the reason if it could not. */
function _gldSay(r, b, ic) {
  if (!r) return r;
  if (!r.ok) { gameDenyOf(r, b); return r; }
  if (r.msg && typeof _gdgNote === 'function') _gdgNote(r.msg, icon(ic || 'sparkles'));
  return r;
}

/* ---------- a click on something on the land ---------- */
function gardenLandPropOpen(p) {
  const id = p.lf, m = gardenHere();
  const at = { x: p.x + p.w / 2, y: p.y - 0.4 };
  if (gardenLandSight(id)) {
    const d = gardenLandSight(id), items = [], E = !m.visit && d.egg && !gardenLandEggFound(id) ? d.egg : null;
    if (E) items.push({ ic: 'sparkles', label: E.verb, cls: 'is-go', run: (b) => _gldSay(gardenLandEgg(id), b, 'sparkles') });
    gardenBubbleOpen(at, { title: d.name, sub: d.say, items, cls: items.length ? '' : 'is-empty' });
    return;
  }
  if (id === 'lf-chest') { if (m.visit) { gardenBubbleOpen(at, { title: p.name, sub: 'Your friend’s to open', items: [] }); return; } gardenBubbleOpen(at, { title: p.name, sub: p.blurb, items: [{ ic: 'gift', label: 'Open it', cls: 'is-go', run: (b) => _gldSay(gardenLandChest(), b, 'gift') }] }); return; }
  if (id === 'land-finds') { const n = (m.visit ? gardenLandShowOf(m.visit.snap) : gardenLandShowMine(m)).c.length; gardenBubbleOpen(at, { title: p.name, sub: `${n} on the table.`, items: [{ ic: 'book-open', label: 'See them all', cls: 'is-go', run: () => gardenPopupOpen('lands') }] }); return; }
  const f = gardenLandFeature(id); if (!f) return;
  if (m.visit) { _gldVisitBubble(f, at, m); return; }
  if (p.site || !gardenLandOwnsFeature(id)) { _gldBuildBubble(f, at, m); return; }
  _gldUseBubble(f, at, m);
}
function _gldVisitBubble(f, at, m) {
  const s = m.visit.snap || {}, items = [];
  let sub = f.blurb;
  const seen = gardenLandShowOf(s);
  if (f.does === 'museum') { sub = `${seen.c.filter(id => id !== GARDEN_LAND_KEY_ID).length} of ${GARDEN_LAND_CURIOS.length} curios on show.`; items.push({ ic: 'book-open', label: 'See them all', cls: 'is-go', run: () => gardenPopupOpen('lands') }); }
  if (f.does === 'stars') sub = `${'★'.repeat(seen.r)}${'☆'.repeat(5 - seen.r)} this garden’s stars.`;
  if (f.does === 'observatory') sub = `${seen.z.length} of ${GARDEN_LAND_SKY.length} in their star book.`;
  if (f.does === 'post') { sub = 'Where to?'; for (const q of GARDEN_LAND_FEATURES) if (q.does === 'post' && q.id !== f.id && _GD_LAND.has(q.id)) items.push({ ic: 'milestone', label: q.name.replace(/^Way post /, ''), cls: 'is-go', run: () => gardenLandHop(q.id) }); }
  if (f.does === 'lookout') items.push({ ic: 'eye', label: 'Look out over the land', cls: 'is-go', run: () => gardenCamSet('fit') });
  gardenBubbleOpen(at, { title: f.name, sub, items });
}
function _gldBuildBubble(f, at, m) {
  const info = gardenLandFeatureInfo(f.id, gardenModel());
  const sub = info.why ? `${f.blurb} ${info.why}.` : info.spot ? `${f.blurb} ${info.spot} is in the way.` : f.blurb;
  const items = info.why || info.spot ? [] : [{ svg: _GH_GLYPH.coin, label: `Build for ${_gdpNum(f.cost)} coins`, n: _gdpNum(f.cost), cls: 'is-go is-buy', run: (b) => {
    const r = gardenBuildFeature(f.id);
    if (!r.ok) { gameDenyOf(r, b); return; }
    gameCheer(b, { text: '-' + f.cost, tone: 'coin', sound: true });
  } }];
  gardenBubbleOpen(at, { title: f.name, sub, items, cls: 'is-land' + (items.length ? '' : ' is-empty') });
}
function _gldUseBubble(f, at, m0) {
  const m = gardenModel(), items = [];
  let sub = f.blurb;
  const go = (ic, label, run, off) => items.push({ ic, label, cls: off ? 'is-off' : 'is-go', run });
  if (f.per && !['lookout', 'observatory'].includes(f.does)) {
    const i = gardenLandCollectInfo(f, m);
    go(f.icon, i.ready ? i.label : i.soon, (b) => _gldSay(gardenLandCollect(f.id), b, f.icon), !i.ready);
    if (!i.ready) sub = i.soon;
  } else if (f.does === 'post') {
    const posts = GARDEN_LAND_FEATURES.filter(q => q.does === 'post' && q.id !== f.id && gardenLandOwnsFeature(q.id));
    sub = posts.length ? 'Where to?' : 'Build another way post and you can hop between them.';
    for (const q of posts) items.push({ ic: 'milestone', label: q.name.replace(/^Way post /, ''), cls: 'is-go', run: () => gardenLandHop(q.id) });
  } else if (f.does === 'machine') {
    const I = gardenLandMachineInfo(f, m), what = f.input === 'fruit' ? 'fruit' : 'herbs';
    if (I.state === 'empty') { sub = `Put in ${f.n} of your ${what} (you have ${I.haveN}). Ready after ${f.hours} hours.`; go(f.icon, `Put in ${f.n}`, (b) => _gldSay(gardenLandMachineLoad(f.id), b, f.icon), I.haveN < f.n); }
    else if (I.state === 'busy') { sub = `Worth ${I.pay} coins, in ${_gdHoursLabel(I.left)}.`; }
    else { sub = `Ready: ${I.pay} coins.`; go('coins', `Take ${I.pay} coins`, (b) => _gldSay(gardenLandMachineTake(f.id), b, 'coins')); }
  } else if (f.does === 'swap') {
    const S = gardenLandSwapInfo(m);
    sub = S.done ? 'One swap a day: come back tomorrow.' : `Leave 5 common seeds for a better one. You have ${S.haveN}.`;
    if (!S.done) go('sprout', 'Swap 5 seeds', (b) => _gldSay(gardenLandSwap(), b, 'sprout'), S.haveN < 5);
  } else if (f.does === 'help') {
    const H = gardenLandHelpInfo(m);
    sub = H.done ? 'Done for this week. There will be a new note next week.' : `Wanted this week: ${H.n} ${H.plant.name.toLowerCase()}. Pays ${H.pay} coins. You have ${H.have}.`;
    if (!H.done) go('flag', `Hand in ${H.n}`, (b) => _gldSay(gardenLandHelp(), b, 'flag'), H.have < H.n);
  } else if (f.does === 'oak') {
    const O = gardenLandOakInfo(m);
    if (O.state === 'empty') { sub = `Bury coins here. In ${GARDEN_LAND_OAK.days} days they come back with a little more.`; for (const n of GARDEN_LAND_OAK.sums) items.push({ ic: 'coins', label: `Bury ${n} coins`, n, cls: m.wallet.coins >= n ? 'is-go' : 'is-off', run: (b) => _gldSay(gardenLandOakBury(n), b, 'coins') }); }
    else if (O.state === 'busy') { sub = `${O.c} coins under the roots. ${O.back} in ${_gdHoursLabel(O.left * 24)}. You can take the ${O.c} back now if you need them.`; go('coins', `Take ${O.c} coins back`, (b) => _gldSay(gardenLandOakDig(), b, 'coins')); }
    else { sub = `The oak has done well: ${O.back} coins.`; go('coins', `Dig up ${O.back} coins`, (b) => _gldSay(gardenLandOakDig(), b, 'coins')); }
  } else if (f.does === 'lookout') {
    const i = gardenLandCollectInfo(f, m), key = _gldKey(f.id);
    go('eye', 'Look out over the land', () => { gardenCamSet('fit'); if (i.ready) { const g = _gdG(); g.seen[key] = i.period; _gdLed('lc', { x: 5 }); _gdSave(); } });
  } else if (f.does === 'observatory') {
    const i = gardenLandCollectInfo(f, m);
    sub = `${gardenLandSkyCount()} of ${GARDEN_LAND_SKY.length} in your star book. ${i.ready ? `Tonight: ${gardenLandSkyTonight(m).name}.` : i.soon + '.'}`;
    go('star', i.ready ? 'Log tonight’s stars' : i.soon, (b) => _gldSay(gardenLandSkyLog(), b, 'star'), !i.ready);
    const ms = _gldMilestone('sky', gardenLandSkyCount()); if (ms) go('gift', `Collect ${ms.c} coins`, (b) => _gldSay(gardenLandMilestoneTake('sky', gardenLandSkyCount()), b, 'gift'));
  } else if (f.does === 'museum') {
    const n = gardenLandCurioCount(), ms = _gldMilestone('curios', n);
    sub = `${n} of ${GARDEN_LAND_CURIOS.length} curios on show. Dig them up on your land.`;
    if (ms) go('gift', `Collect ${ms.c} coins`, (b) => _gldSay(gardenLandMilestoneTake('curios', n), b, 'gift'));
    items.push({ ic: 'book-open', label: 'See them all', run: () => gardenPopupOpen('lands') });
  } else if (f.does === 'stars') {
    const S = gardenLandStars(m), ms = _gldMilestone('stars', S.stars);
    sub = `${'★'.repeat(S.stars)}${'☆'.repeat(5 - S.stars)} ${S.next ? `${S.pts} of ${S.next} points to the next star: land, buildings, kinds of plant and what you have placed all count.` : 'Five stars. There is nothing more to say.'}`;
    if (ms) go('gift', `Collect ${ms.c} coins`, (b) => _gldSay(gardenLandMilestoneTake('stars', S.stars), b, 'gift'));
  }
  void m0;
  gardenBubbleOpen(at, { title: f.name, sub, items, cls: items.length ? '' : 'is-empty' });
}
/** A way post: step to another one. */
function gardenLandHop(id) {
  const f = gardenLandFeature(id); if (!f || !_GD_LAND.has(id)) return;   // (whoever's land you are on)
  _gw.path = []; _gw.then = null; _gw.px = f.door.x + 0.5; _gw.py = f.door.y + 0.5;
  _gw.cam.init = false; _gw.cam.dirty = true; _gw.reach = null;
  if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop();
}

/* ---------- what is lying about today ---------- */
function _gldDigArt() { return '<path d="M-8 -2L8 2M-7 3L7 -3" stroke="#6a4a2a" stroke-width="2.600" stroke-linecap="round"/><path d="M-8 -2L8 2M-7 3L7 -3" stroke="#a88a5a" stroke-width="1" stroke-linecap="round"/>'; }
function _gldForageArt(season) { const c = { spring: '#f8e58c', summer: '#e2273b', autumn: '#3a2a4a', winter: '#d0202b' }[season] || '#e2273b'; return `<path d="M-6 0q3 -7 6 -8q3 1 6 8z" fill="#4f8a44" stroke="#2f5f2c" stroke-width="0.7"/><circle cx="-3" cy="-4" r="1.800" fill="${c}"/><circle cx="2.500" cy="-5" r="1.800" fill="${c}"/><circle cx="0" cy="-1.500" r="1.500" fill="${c}"/>`; }
function _gldCartArt() {
  const A = GART, Wd = GART_PAL.wood;
  return A.P('#1a2a14', A.ell(0, 1, 30, 4), 0.2) + A.P(Wd[1], A.rrect(-26, -26, 52, 18, 2)) + A.S(Wd[0], 1, 'M-26 -20H26M-26 -14H26', 0.5) + A.P('#e0a23a', 'M-30 -26Q0 -46 30 -26z') + A.P('#fbf3de', 'M-14 -33Q0 -41 14 -33L10 -26H-10z', 0.8) + A.S(Wd[0], 2.4, A.circ(-16, -6, 7) + A.circ(16, -6, 7)) + A.S(Wd[0], 1, 'M-16 -13V1M-23 -6H-9M16 -13V1M9 -6H23', 0.8) + A.P('#c8352a', A.circ(-8, -28, 2)) + A.P('#5aa83a', A.circ(0, -29, 2)) + A.P('#f2c432', A.circ(8, -28, 2));
}
/** Put today's finds in the world, once each (no loop of their own: nothing moves). */
function gardenLandsPaint(m) {
  if (typeof _gw === 'undefined' || !_gw.on) return;
  { const g = _gdG();
    if (!m.visit && g.seen.worldMoved && !g.seen.worldNoted && typeof openDialog === 'function') {
      g.seen.worldNoted = m.today; if (typeof saveUI === 'function') saveUI();
      openDialog({ title: 'We rearranged the garden', size: 'sm', body(el) { el.appendChild(_gdpEl('p', null, 'Your garden is now the middle of a bigger world, with land to find in every direction. Everything you had planted is back in your bag as seeds, and everything you had placed is in your bag too. Land and buildings you bought have been paid back in coins. Your coins, level, gear and books are as they were.')); } });
    }
  }
  const want = new Map();
  if (!m.visit) {
    const dig = gardenLandDigSpot(m);
    if (dig) want.set('dig', { x: dig.x + 0.5, y: dig.y + 0.7, svg: _gldDigArt(), hit: 0.45, label: 'Something is buried here', run: () => _gldSay(gardenLandDig(), null, 'gift') });
    for (const s of gardenLandForageSpots(m)) want.set('f' + s.i + m.season, { x: s.x + 0.5, y: s.y + 0.7, svg: _gldForageArt(m.season), hit: 0.4, label: 'Something to pick', run: () => _gldSay(gardenLandForage(s.i), null, 'leaf') });
    const cart = gardenLandCart(m);
    if (cart) want.set('cart', { x: 43.5, y: 20.2, svg: _gldCartArt(), hit: 0.8, hitUp: 18, label: 'The weekend cart', run: () => _gldCartBubble() });
  }
  for (const [k, S] of _gldp.sprites) if (!want.has(k)) { S.remove(); _gldp.sprites.delete(k); }
  for (const [k, w] of want) {
    if (_gldp.sprites.has(k)) continue;
    _gldp.sprites.set(k, gardenWorldAdd({ id: 'gld-' + k, svg: w.svg, x: w.x, y: w.y, hit: w.hit, hitUp: w.hitUp || 0, label: w.label, cursor: 'hand', onClick: w.run }));
  }
}
function _gldCartBubble() {
  const m = gardenModel(), list = gardenLandCart(m) || [];
  const items = list.map(r => ({ ic: r.key.startsWith('seed:') ? 'sprout' : 'gift', n: r.bought ? '✓' : r.price, label: r.bought ? `${r.name}: sold` : `${r.name} for ${r.price} coins`, cls: r.bought ? 'is-off' : m.wallet.coins >= r.price ? 'is-go' : 'is-off', keep: false, run: (b) => _gldSay(gardenLandCartBuy(r.key), b, 'store') }));
  gardenBubbleOpen({ x: 43.5, y: 19.1 }, { title: 'The weekend cart', sub: 'Here Saturdays and Sundays. Things you may not have reached yet, one of each.', items });
}

/* ---------- the land office ---------- */
/** On a friend's land: what they have, the way they would show you round. Only what their snapshot says, and nothing in it can be bought. */
function _gldFriendTab(el, m) {
  const box = _gdpEl('div', 'gld'), s = m.visit.snap || {}, S = gardenLandShowOf(s), name = m.visit.name || 'Your friend'; el.appendChild(box);
  const secs = GARDEN_LAND_SECTIONS.filter(q => q.buy && m.areas.includes(q.id)), built = GARDEN_LAND_FEATURES.filter(f => m.areas.includes(f.id));
  const head = _gdpEl('div', 'gld-head'), mp = _gdpEl('div', 'gld-mapbox'); mp.innerHTML = _gldMap(m); head.appendChild(mp);
  const txt = _gdpEl('div', 'gld-intro'); txt.appendChild(_gdpEl('h3', null, `${name}’s land`)); txt.appendChild(_gdpEl('p', null, `Garden level ${m.level.level} · ${secs.length} of ${GARDEN_LAND_SECTIONS.filter(q => q.buy).length} pieces of land · ${built.length} of ${GARDEN_LAND_FEATURES.length} things built${S.r ? ` · ${'★'.repeat(S.r)}` : ''}.`)); head.appendChild(txt); box.appendChild(head);
  const sec = (title) => { box.appendChild(_gdpEl('h4', 'gld-h', title)); const d = _gdpEl('div', 'gld-list'); box.appendChild(d); return d; };
  if (built.length) { const d = sec('What they have built'); for (const f of built) _gldRow(d, { icon: f.icon, name: f.name, sub: f.blurb }); }
  if (S.c.length) { const d = sec('What they have dug up'); const g = _gdpEl('div', 'gld-chips'); for (const c of GARDEN_LAND_CURIOS) if (S.c.includes(c.id)) { const ch = _gdpEl('span', 'gld-chip is-on'); ch.innerHTML = gardenLandCurioSvg(c.id, 16); ch.appendChild(document.createTextNode(c.name)); g.appendChild(ch); } if (S.c.includes(GARDEN_LAND_KEY_ID)) { const ch = _gdpEl('span', 'gld-chip is-on'); ch.innerHTML = gardenLandCurioSvg(GARDEN_LAND_KEY_ID, 16); ch.appendChild(document.createTextNode('An old iron key')); g.appendChild(ch); } d.appendChild(g); }
  if (S.z.length) { const d = sec('Their star book'); const g = _gdpEl('div', 'gld-chips'); for (const c of GARDEN_LAND_SKY) if (S.z.includes(c.id)) g.appendChild(_gdpEl('span', 'gld-chip is-on', c.name)); d.appendChild(g); }
  if (secs.length) { const d = sec('Their land'); const g = _gdpEl('div', 'gld-chips'); for (const q of secs) g.appendChild(_gdpEl('span', 'gld-chip is-on', q.name)); d.appendChild(g); }
}
function _gldRow(host, o) {
  const r = _gdpEl('div', 'gld-row' + (o.dim ? ' is-dim' : '') + (o.done ? ' is-done' : ''));
  const ic = _gdpEl('span', 'gld-ic'); ic.innerHTML = icon(o.icon || 'sprout'); r.appendChild(ic);
  const mid = _gdpEl('div', 'gld-mid'); mid.appendChild(_gdpEl('b', null, o.name)); mid.appendChild(_gdpEl('small', null, o.sub || '')); r.appendChild(mid);
  if (o.tag) r.appendChild(_gdpEl('span', 'gld-tag', o.tag));
  if (o.btn2) { const b = _gdpEl('button', 'gld-buy' + (o.off2 ? ' is-off' : ''), o.btn2); b.type = 'button'; b.onclick = () => o.run2(b); r.appendChild(b); }
  if (o.btn) { const b = _gdpEl('button', 'gld-buy' + (o.off ? ' is-off' : ''), o.btn); b.type = 'button'; b.onclick = () => o.run(b); r.appendChild(b); }
  host.appendChild(r);
}
function _gldMap(m) {
  const W = GARDEN_WORLD, open = new Set(m.areas);
  let s = '';
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    const c = gardenLandCell(x, y); if (!c) continue;
    const mine = open.has(c.id), col = c.solid ? '#5f7f52' : c.lane ? '#e3d3a2' : c.trail ? (mine ? '#f4e8c0' : '#9a9e8c') : mine ? _gdrTileCol(c.tile, m.season) : (m.level.level >= c.lv && (!c.via || open.has(c.via)) ? '#e8d8a0' : '#b8bca8');
    s += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${col}"/>`;
  }
  const me = typeof _gw !== 'undefined' ? _gw : null, dot = me ? `<circle cx="${me.px.toFixed(1)}" cy="${me.py.toFixed(1)}" r="0.8" fill="#c8352a" stroke="#fff" stroke-width="0.3"/>` : '';
  return `<svg viewBox="0 0 ${W.cols} ${W.rows}" class="gld-map" role="img" aria-label="Map of the land"><rect x="12" y="21" width="28" height="17" fill="#4f93c8"/>${s}${dot}</svg>`;
}
/** Fill the pop-up: where you are with the land, what you can buy and build now, and what is still to come. */
function gardenLandsTab(el, m) {
  el.textContent = '';
  { const here = gardenHere(); if (here.visit) { _gldFriendTab(el, here); return; } }
  const box = _gdpEl('div', 'gld'); el.appendChild(box);
  const lv = m.level.level, owned = GARDEN_LAND_SECTIONS.filter(s => s.buy && m.areas.includes(s.id)).length, built = GARDEN_LAND_FEATURES.filter(f => gardenLandOwnsFeature(f.id)).length;
  const head = _gdpEl('div', 'gld-head');
  const mp = _gdpEl('div', 'gld-mapbox'); mp.innerHTML = _gldMap(m); head.appendChild(mp);
  const txt = _gdpEl('div', 'gld-intro');
  txt.appendChild(_gdpEl('h3', null, `You have ${owned} of ${GARDEN_LAND_SECTIONS.filter(s => s.buy).length} pieces of land`));
  txt.appendChild(_gdpEl('p', null, `Garden level ${lv} · ${_gdpNum(m.wallet.coins)} coins · ${built} of ${GARDEN_LAND_FEATURES.length} things built. New land and new paths open as your level goes up. On the map, gold is what you can buy now and grey is for later.`));
  head.appendChild(txt); box.appendChild(head);
  const sec = (title) => { box.appendChild(_gdpEl('h4', 'gld-h', title)); const d = _gdpEl('div', 'gld-list'); box.appendChild(d); return d; };
  const buyRow = (host, s) => { const i = gardenLandInfo(s.id, m), K = GARDEN_LAND_KINDS[s.kind]; _gldRow(host, { icon: s.icon, name: s.name, sub: `${K.name}, ${s.cells.length} squares: ${gardenLandGrowsLine(s)}. ${K.says || ''}`, btn: `${_gdpNum(s.buy)} coins`, off: !i.afford, run: (b) => { const r = gardenBuyLand(s.id); if (!r.ok) gameDenyOf(r, b); else gameCheer(b, { text: '-' + s.buy, tone: 'coin', sound: true }); }, ...gardenRewardBtn2(s.buy, m, () => gardenBuyLand(s.id)) }); };
  const buildRow = (host, f, I) => _gldRow(host, { icon: f.icon, name: f.name, sub: f.blurb + (I.spot ? ` ${I.spot} is in the way.` : ''), btn: `${_gdpNum(f.cost)} coins`, off: !I.afford || !!I.spot, run: (b) => { const r = gardenBuildFeature(f.id); if (!r.ok) gameDenyOf(r, b); else gameCheer(b, { text: '-' + f.cost, tone: 'coin', sound: true }); }, ...(I.spot ? {} : gardenRewardBtn2(f.cost, m, () => gardenBuildFeature(f.id))) });
  gardenRewardLandRows(sec, m);
  // now
  const canLand = GARDEN_LAND_SECTIONS.filter(s => { const i = s.buy ? gardenLandInfo(s.id, m) : null; return i && !i.owned && i.lvOk && i.reach && i.keyOk; }).sort((a, b) => a.buy - b.buy);
  const canBuild = GARDEN_LAND_FEATURES.map(f => [f, gardenLandFeatureInfo(f.id, m)]).filter(([, I]) => !I.built && !I.why).sort((a, b) => a[0].cost - b[0].cost);
  if (canBuild.length) { const d = sec('You can build these now'); for (const [f, I] of canBuild) buildRow(d, f, I); }
  if (canLand.length) { const d = sec('You can buy these now'); for (const s of canLand.slice(0, 12)) buyRow(d, s); if (canLand.length > 12) d.appendChild(_gdpEl('p', 'gld-more', `And ${canLand.length - 12} more.`)); }
  if (!canLand.length && !canBuild.length) box.appendChild(_gdpEl('p', 'gld-more', 'Nothing new just now. Level up and more opens.'));
  // next
  const later = [];
  for (const t of GARDEN_LAND_TRAILS) if (!m.areas.includes(t.id)) later.push({ lv: t.lv, icon: 'footprints', name: t.name, sub: 'A new path', tag: `Level ${t.lv}` });
  for (const s of GARDEN_LAND_SECTIONS) { if (m.areas.includes(s.id)) continue; if (!s.buy) { later.push({ lv: s.lv, icon: s.icon, name: s.name, sub: GARDEN_LAND_KINDS[s.kind].name + ', free', tag: `Level ${s.lv}` }); continue; } const i = gardenLandInfo(s.id, m); if (i && i.lvOk && i.reach && i.keyOk) continue; const key = i && i.lvOk && i.reach && !i.keyOk; later.push({ lv: s.lv, icon: s.icon, name: s.name, sub: `${GARDEN_LAND_KINDS[s.kind].name}, ${_gdpNum(s.buy)} coins${key ? '. Behind a rusty gate: keep digging, somebody lost a key' : ''}`, tag: key ? 'Key' : `Level ${s.lv}` }); }
  for (const f of GARDEN_LAND_FEATURES) { const I = gardenLandFeatureInfo(f.id, m); if (I.built || !I.why) continue; later.push({ lv: f.lv, icon: f.icon, name: f.name, sub: `${f.blurb} ${_gdpNum(f.cost)} coins.${lv >= f.lv ? ' ' + I.why + '.' : ''}`, tag: lv >= f.lv ? 'Land first' : `Level ${f.lv}` }); }
  later.sort((a, b) => a.lv - b.lv);
  if (later.length) { const d = sec('Still to come'); for (const r of later.slice(0, 14)) _gldRow(d, Object.assign({ dim: true }, r)); if (later.length > 14) d.appendChild(_gdpEl('p', 'gld-more', `And ${later.length - 14} more further on.`)); }
  // finds
  { const d = sec(`Curios found: ${gardenLandCurioCount()} of ${GARDEN_LAND_CURIOS.length}`);
    const n = _gdpEl('p', 'gld-more', 'Look for a little cross on the ground: one spot a day, somewhere on your land or the lane. Some turn up when you forage, help out or open the maze chest.'); d.appendChild(n);
    const g = _gdpEl('div', 'gld-chips'); for (const c of GARDEN_LAND_CURIOS) { const has = gardenHas('cur:' + c.id) > 0, ch = _gdpEl('span', 'gld-chip' + (has ? ' is-on' : ''), has ? '' : '?'); if (has) { ch.innerHTML = gardenLandCurioSvg(c.id, 16); ch.appendChild(document.createTextNode(c.name)); ch.setAttribute('data-tip', c.blurb); } g.appendChild(ch); } d.appendChild(g); }
  box.appendChild(_gdpEl('p', 'gld-more', `Small secrets found about the place: ${gardenLandEggCount()} of ${gardenLandEggs().length}. Go up to things and have a look.`));
  if (gardenLandOwnsFeature('lf-observatory') || gardenLandSkyCount()) { const d = sec(`Your star book: ${gardenLandSkyCount()} of ${GARDEN_LAND_SKY.length}`); const g = _gdpEl('div', 'gld-chips'); for (const c of GARDEN_LAND_SKY) { const has = gardenHas('sky:' + c.id) > 0; g.appendChild(_gdpEl('span', 'gld-chip' + (has ? ' is-on' : ''), has ? c.name : '?')); } d.appendChild(g); }
}
