/* ============================================================
   GARDEN, THE CATCHING OVERHAUL: THE PAGES (docs/dev/CATCH_FEATURES.md). Two new tabs of the Catch page, and what is added to the others.
     The lake            the old angler, today's forecast, the wanted poster, the records, your maps, the smoker, the bug kit, the thing in the lake, your diary
     The lake hall       give one of each; a long tank you can scroll along; on a visit, your friend's
     Tackle              what you have on and what it is good for, saved setups (one tap), reels, lines, hooks, the bug kit
     Fish book           Get ready: what that fish needs, put on what you have, walk there and cast
   Plain words. Everything here is read from tables and your own save, or from a friend's cleaned snapshot.
   ============================================================ */
function _gcpSay(r) { if (r && r.ok && r.msg && typeof toast === 'function') gardenToast(r.msg, { icon: 'fish', timeout: 4500 }); return _gdpSay(r); }   // (_gdpSay only speaks up for a no)
function _gcpCard(title, ic) { const c = _gdpEl('section', 'card gca-card'); const h = _gdpEl('div', 'gdc-market-h'); h.innerHTML = `${icon(ic)}<b>${esc(title)}</b>`; c.appendChild(h); return c; }
function _gcpClose() { try { if (typeof _gdp !== 'undefined' && _gdp.pop && typeof _dialogClose === 'function' && _dialogClose) { _gdp.pop = null; _dialogClose(); } } catch (e) { /* closed already */ } }

/* ---------- tackle ---------- */
function gardenSetupPanel(el) {
  const u = gardenTackleInUse(), W = gardenSetupWords(u), c = _gcpCard('On your line now', 'fish');
  const row = _gdpEl('div', 'gca-setup');
  const item = (svg, label, name) => { const s = _gdpEl('div', 'gca-setup-i'); s.innerHTML = svg; s.appendChild(_gdpEl('small', 'muted', label)); s.appendChild(_gdpEl('b', null, name)); row.appendChild(s); };
  const d = (id) => gardenGearDef(id);
  item(gardenCatchSvg('rod', u.rod, 40), 'Rod', d(u.rod).name); item(gardenTackleSvg(d(u.reel), 40), 'Reel', d(u.reel).name); item(gardenTackleSvg(d(u.line), 40), 'Line', d(u.line).name); item(gardenTackleSvg(d(u.hook), 40), 'Hook', d(u.hook).name);
  item(gardenCatchSvg('bait', u.bait, 40), 'Bait', d(u.bait).name); item(gardenCatchSvg('bobber', u.float, 40), 'Float', gardenBobberDef(u.float).name);
  c.appendChild(row);
  if (W.good) c.appendChild(_gdpEl('p', 'gca-p', `Good for ${W.good}. It reaches ${W.reach} cells.`));
  if (W.warn) c.appendChild(_gdpEl('p', 'gca-p muted', `Mind: ${W.warn}.`));
  const saved = Array.isArray(_gca().setups) ? _gca().setups : [], slots = _gdpEl('div', 'gca-slots');
  for (let i = 0; i < GARDEN_CATCH_RULES.setups; i++) {
    const s = saved[i], box = _gdpEl('div', 'gca-slot');
    box.appendChild(_gdpEl('b', null, s ? `Setup ${i + 1}: ${(d(s.reel) || { name: 'reel' }).name}, ${(d(s.bait) || { name: 'bait' }).name}` : `Setup ${i + 1}: empty`));
    const f = _gdpEl('div', 'gd-card-f');
    if (s) f.appendChild(_gdpBtn('Put it on', { icon: 'check', kind: 'btn-primary', run: () => _gcpSay(gardenSetupUse(i)) }));
    f.appendChild(_gdpBtn(s ? 'Save over' : 'Save what I have on', { icon: 'check', kind: 'btn-ghost', run: () => { _gcpSay(gardenSetupSave(i)); _gdxRepaintTab(); } }));
    box.appendChild(f); slots.appendChild(box);
  }
  c.appendChild(slots); el.appendChild(c);
}
/** On the garden's side card: your saved setups, one tap each. */
function gardenSetupQuick(card) {
  const saved = (Array.isArray(_gca().setups) ? _gca().setups : []).map((s, i) => [s, i]).filter(x => x[0]); if (!saved.length) return;
  const row = _gdpEl('div', 'gca-quick');
  for (const [s, i] of saved) row.appendChild(_gdpBtn(String(i + 1), { kind: 'btn-ghost', tip: `Put on setup ${i + 1}`, aria: `Put on setup ${i + 1}`, run: () => _gcpSay(gardenSetupUse(i)) }));
  card.appendChild(row);
}
function _gcpTackleCard(d, m) {
  const pack = !!d.pack, owned = pack ? gardenHas('kit:' + d.id) > 0 : gardenGearOwned(d.id), worn = GARDEN_TACKLE_KINDS[d.kind] ? _gcaWorn(d.kind).id === d.id : false, c = _gdpEl('div', 'gd-card gdc-gear' + (worn ? ' is-equipped' : '') + (owned ? '' : ' is-locked'));
  const art = _gdpEl('div', 'gd-card-art'); art.innerHTML = gardenTackleSvg(d, 64); c.appendChild(art);
  const t = _gdpEl('div', 'gd-card-t'); t.appendChild(_gdpEl('b', null, d.name)); if (pack) t.appendChild(_gdpEl('small', 'gd-have', `${gardenHas('kit:' + d.id)} in your bag`));
  t.appendChild(_gdpEl('small', 'gd-facts', `Good for ${d.good}`)); t.appendChild(_gdpEl('small', 'muted', d.blurb)); c.appendChild(t);
  const f = _gdpEl('div', 'gd-card-f');
  if (owned && !pack) {
    if (GARDEN_TACKLE_KINDS[d.kind]) f.appendChild(_gdpBtn(worn ? 'On your line' : 'Use this', { icon: worn ? 'check' : 'hand', kind: worn ? 'btn-secondary' : 'btn-primary', disabled: worn, run: () => { const r = gardenGearEquip(d.kind, d.id); _gcaUseDirty(); _gcpSay(r); _gdxRepaintTab(); } }));
    else f.appendChild(_gdpEl('span', 'gd-have', 'Yours: you can see it on you'));
  } else if ((d.lv || 1) > m.level.level) { const l = _gdpEl('span', 'gd-lock'); l.innerHTML = icon('lock', 'i-xs'); l.appendChild(_gdpEl('span', null, 'Garden level ' + d.lv)); f.appendChild(l); }
  else f.appendChild(_gdpBtn(`Buy${pack ? ' ' + d.pack : ''} · ${d.price} coins`, { icon: 'shopping-bag', disabled: m.wallet.coins < d.price, run: () => { _gcpSay(gardenGearBuy(d.id)); _gdxRepaintTab(); } }));
  c.appendChild(f);
  return c;
}
/** On a card in your bag: let it go, give it to the hall. */
function gardenBagExtras(f, kind, r) {
  if (kind === 'fish' && r.def.cat !== 'fish') return;
  const hall = _gca().hall || {}, given = (kind === 'bug' ? hall.b : hall.f) || {};
  if (!given[r.id]) f.appendChild(_gdpBtn('', { icon: 'landmark', kind: 'btn-ghost', aria: 'Give it to the lake hall', tip: 'Give it to the lake hall', run: () => _gcpSay(gardenHallGive(kind === 'bug' ? 'bug' : 'fish', r.id)) }));
  if (kind === 'fish') f.appendChild(_gdpBtn('', { icon: 'waves', kind: 'btn-ghost', aria: 'Let it go', tip: 'Let it go: there will be more of them in your lake this week', run: () => _gcpSay(gardenFishRelease(r.key)) }));
}
/** In the fish book: what it needs, put it all on, take me there. */
function gardenReadyButton(def) {
  const b = _gdpBtn('Get ready', { icon: 'target', kind: 'btn-ghost', tip: 'What this fish needs, and where to find it' });
  b.onclick = (e) => {
    e.stopPropagation();
    openPopover(b, (el, close) => {
      el.classList.add('gca-ready');
      const known = !!_gdG().fl[def.id], R = gardenReadyFor(def);
      el.appendChild(_gdpEl('b', null, known ? def.name : 'This fish'));
      const list = _gdpEl('ul', 'gca-ready-l');
      for (const r of R.rows) { const li = _gdpEl('li', r.ok ? 'is-ok' : 'is-no'); li.innerHTML = icon(r.ok ? 'check' : 'shopping-bag', 'i-xs'); li.appendChild(_gdpEl('span', null, r.ok ? r.what : `${r.what}: not yours yet`)); list.appendChild(li); }
      if (!R.rows.length) list.appendChild(_gdpEl('li', 'is-ok', 'Anything will do.'));
      el.appendChild(list);
      if (R.where) el.appendChild(_gdpEl('p', 'gca-p', `Look at ${R.where.words}${R.when ? ', ' + R.when : ''}.`));
      else if (R.when) el.appendChild(_gdpEl('p', 'gca-p', `Look ${R.when}.`));
      const f = _gdpEl('div', 'gd-card-f');
      if (R.rows.length) f.appendChild(_gdpBtn('Put it on', { icon: 'check', run: () => { const r = gardenReadyEquip(def); _gcpSay(r); close(); } }));
      if (R.where && typeof _gw !== 'undefined' && _gw.on) f.appendChild(_gdpBtn('Take me there', { icon: 'footprints', kind: 'btn-primary', run: () => { close(); _gcpClose(); gardenFishClickPt({ x: R.where.x, y: R.where.y }, gardenHere()); } }));
      const pinned = (_gca().pins || []).includes(def.id);
      f.appendChild(_gdpBtn(pinned ? 'Pinned' : 'Tell me when', { icon: 'bell', kind: 'btn-ghost', tip: 'A quiet word in the garden when it is about', run: () => { gardenPinToggle(def.id); close(); } }));
      el.appendChild(f);
    }, { align: 'end', width: 300 });
  };
  return b;
}

/* ---------- the lake ---------- */
const _GCP_MOON = Object.freeze({ new: 'A new moon: dark water tonight.', waxing: 'The moon is growing.', full: 'A full moon tonight.', waning: 'The moon is going.' });
function gardenLakeTab(el, m) {
  const here = gardenHere(), visit = _gcaOnVisit(), ca = gardenCatchHere(), today = here.today, c = _gca();
  if (visit) {
    const k = _gdpEl('section', 'card gca-card'); k.appendChild(_gdpEl('b', null, 'You are at a friend’s lake'));
    const known = gardenLakeKnownFor(ca.sd || 0).map(id => gardenFishDef(id)).filter(Boolean);
    k.appendChild(_gdpEl('p', 'gca-p', `This lake is known for ${_gcpList(known.map(d => d.name.toLowerCase()))}. They come more often here than they do at yours.`));
    const rows = _gdpEl('div', 'gca-art-row'); for (const d of known) { const s = _gdpEl('span', 'gca-art-i'); s.innerHTML = gardenCatchSvg('fish', d.id, 52, { uid: 'kn' + d.id, silhouette: !_gdG().fl[d.id] }); s.setAttribute('data-tip', _gdG().fl[d.id] ? d.name : 'Not in your book yet'); rows.appendChild(s); }
    k.appendChild(rows); el.appendChild(k);
  } else _gcpAngler(el, m);
  // today
  const F = _gcpCard('Today at the lake', 'cloud'), hot = gardenHotSpot(today), events = gardenEventsNow();
  for (const id of events) { const e = GARDEN_LAKE_EVENTS[id]; if (e) { const p = _gdpEl('p', 'gca-ev'); p.innerHTML = `${icon(e.icon)}<b>${esc(e.name)}.</b> <span>${esc(e.says)}</span>`; F.appendChild(p); } }
  F.appendChild(_gdpEl('p', 'gca-p', `The gulls are over ${hot.name.toLowerCase()} today. ${hot.says}`));
  F.appendChild(_gdpEl('p', 'gca-p muted', _GCP_MOON[_gtMoon(today)] || ''));
  if (!visit) { const known = gardenLakeKnownFor(gardenLakeSeed()).map(id => gardenFishDef(id)).filter(Boolean); F.appendChild(_gdpEl('p', 'gca-p muted', `Your lake is known for ${_gcpList(known.map(d => _gdG().fl[d.id] ? d.name.toLowerCase() : 'something you have not met yet'))}. A friend’s will be different: go and see.`)); }
  const fest = gardenNextFestival(today);
  if (fest) {
    const what = fest.kind === 'bug' ? 'The bug-off' : 'The fishing festival';
    F.appendChild(_gdpEl('p', 'gca-p', fest.days === 0 ? `${what} is today! ${fest.kind === 'bug' ? 'Net as many as you can.' : 'Weigh in your best fish.'}` : `${what} is ${fest.days === 1 ? 'tomorrow' : `in ${fest.days} days`}. Flags go up along the shore.`));
    if (fest.days === 0 && !visit) { const done = !!(_gdG().fd[today] || {}).fw; const f = _gdpEl('div', 'gd-card-f'); f.appendChild(_gdpBtn(done ? 'You have weighed in' : fest.kind === 'bug' ? 'Show the judges your bugs' : 'Weigh in', { icon: 'trophy', kind: 'btn-primary', disabled: done, run: () => { _gcpSay(gardenFestivalWeigh()); _gdxRepaintTab(); } })); F.appendChild(f); }
  }
  el.appendChild(F);
  // wanted
  _gcpWanted(el, today);
  // records
  const rec = (visit ? (ca.rc || []) : (c.rec || [])).slice(0, 3);
  if (rec.length) {
    const R = _gcpCard('Biggest ever caught in this lake', 'trophy'), rows = _gdpEl('div', 'gca-art-row');
    rec.forEach((r, i) => { const d = gardenFishDef(r[0]); if (!d) return; const s = _gdpEl('span', 'gca-art-i'); s.innerHTML = gardenCatchSvg('fish', r[0], 56, { uid: 'rc' + i }); const who = r[2] && typeof gardenSocialName === 'function' ? gardenSocialName(r[2]) : visit ? '' : 'you'; s.appendChild(_gdpEl('small', null, `${r[1]} cm${who ? ', ' + who : ''}`)); s.setAttribute('data-tip', d.name); rows.appendChild(s); });
    R.appendChild(rows); el.appendChild(R);
  }
  if (visit) return;
  // the one that got away
  if (c.nem && gardenFishDef(c.nem.id)) {
    const N = _gcpCard('The one that got away', 'anchor'), d = gardenFishDef(c.nem.id), days = _gtDayNo(today) - _gtDayNo(c.nem.d || today);
    N.appendChild(_gdpEl('p', 'gca-p', `A ${_gdG().fl[d.id] ? d.name.toLowerCase() : 'big fish'} of about ${c.nem.cm} cm, ${days ? `${days} day${days === 1 ? '' : 's'} ago` : 'today'}. ${c.nem.how === 'snap' ? 'It took your line with it, and your float.' : 'It slipped the hook and took your float.'} Watch for a shadow trailing a line: it is still out there.`));
    el.appendChild(N);
  }
  _gcpMap(el);
  _gcpSmoker(el);
  _gcpBugKit(el);
  // the thing
  const th = Number(c.th) || 0;
  const T = _gcpCard(th ? 'The thing in the lake' : 'A question', 'eye');
  if (!th) T.appendChild(_gdpEl('p', 'gca-p muted', 'Have you ever been down at the water on a foggy night? Somebody says you should.'));
  else { for (const line of GARDEN_THING_CLUES.slice(0, th)) T.appendChild(_gdpEl('p', 'gca-p', line)); if (th < GARDEN_THING_CLUES.length) T.appendChild(_gdpEl('p', 'gca-p muted', `Seen ${th} time${th === 1 ? '' : 's'}. There is more to find out.`)); }
  el.appendChild(T);
  // the diary
  const D = _gcpCard('Your fishing diary', 'feather'); let any = false;
  for (let i = 0; i < 7; i++) { const iso = _gdAddDays(today, -i), lines = gardenDiaryDay(iso); if (!lines) continue; any = true; const p = _gdpEl('p', 'gca-p'); p.appendChild(_gdpEl('b', null, i === 0 ? 'Today. ' : i === 1 ? 'Yesterday. ' : `${iso.slice(8, 10)}/${iso.slice(5, 7)}. `)); p.appendChild(document.createTextNode(lines.join(' '))); D.appendChild(p); }
  if (!any) D.appendChild(_gdpEl('p', 'gca-p muted', 'Nothing yet. Go on: it fills itself in as you fish.'));
  el.appendChild(D);
}
function _gcpList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function _gcpAngler(el, m) {
  const c = _gca(), J = gardenJobNow(), A = _gcpCard('The old angler', 'fish');
  const row = _gdpEl('div', 'gca-angler');
  const pic = _gdpEl('div', 'gca-angler-pic'); pic.innerHTML = `<svg viewBox="-24 -50 48 56" width="72" height="84" aria-hidden="true">${_gcwAngler({ x: 0, y: 0, w: 0, h: 0 }, { tod: 'day' }, { still: true }, { aj: c.job || 0 }).replace(/translate\([^)]*\)/, 'translate(0 0)')}</svg>`; row.appendChild(pic);
  const t = _gdpEl('div', 'gca-angler-t');
  if (!J) t.appendChild(_gdpEl('p', 'gca-say', 'Nothing today. Sit down. Listen to the water.'));
  else { t.appendChild(_gdpEl('p', 'gca-say', `“${J.says}”`)); if (!J.waiting && !J.done) t.appendChild(_gdpEl('p', 'gca-ask', J.ask)); if (J.legend) { const d = gardenFishDef(J.legend); if (d && d.lv > m.level.level) t.appendChild(_gdpEl('p', 'gca-p muted', `Not yet: that one comes to a garden of level ${d.lv}. It will wait.`)); } }
  // a job you have already done (you bought the reel before he asked)
  if (J && J.have && J.have()) { const b = _gdpBtn('I have done that', { icon: 'check', kind: 'btn-primary', run: () => { const J2 = gardenJobNow(); if (J2 && J2.id === J.id) { const today = _gdToday(); _gdG().led['aj.' + today + '.' + _gdUid('')] = { d: today, k: 'ca', c: J.c || 0, x: 4, i: Object.assign({}, J.pay || {}), n: 1 }; c.job = (Number(c.job) || 0) + 1; c.jobDay = today; _gdSave(); gardenCatchShowSoon(); _gdxRepaintTab(); } } }); t.appendChild(b); }
  row.appendChild(t); A.appendChild(row);
  el.appendChild(A);
}
function _gcpWanted(el, today) {
  const wk = _gdWeekFrom(today), w = gardenWantedFor(wk); if (!w) return;
  const c = _gca(), P = _gcpCard('Wanted this week', 'scroll-text'), row = _gdpEl('div', 'gca-angler'), known = !!_gdG().fl[w.id];
  const pic = _gdpEl('div', 'gca-poster'); pic.innerHTML = gardenCatchSvg('fish', w.id, 72, { uid: 'wt', silhouette: !known }); row.appendChild(pic);
  const t = _gdpEl('div', 'gca-angler-t');
  t.appendChild(_gdpEl('p', 'gca-say', known ? `A ${w.name.toLowerCase()}. The bigger the better.` : 'This shape. You will know it when you land it.'));
  // the board: you and your friends, from what their gardens say
  const rows = [], mine = c.wb && c.wb.w === wk ? Number(c.wb.cm) || 0 : 0, wn = _gtDayNo(wk);
  if (mine) rows.push(['You', mine]);
  try { for (const f of (typeof _gscFriendList === 'function' ? _gscFriendList() : []).slice(0, 40)) { const d = gardenSocialFriendCached(f.id), s = d && d.garden && d.garden.snap, wb = s && s.ca && s.ca.wb; if (Array.isArray(wb) && wb[0] === wn && wb[1] > 0) rows.push([gardenSocialName(f.id), Number(wb[1])]); } } catch (e) { /* no friends' news today */ }
  rows.sort((a, b) => b[1] - a[1]);
  if (rows.length) { const ol = _gdpEl('ol', 'gca-rank'); for (const [n, cm] of rows.slice(0, 6)) { const li = _gdpEl('li'); li.appendChild(_gdpEl('span', null, n)); li.appendChild(_gdpEl('b', null, `${cm} cm`)); ol.appendChild(li); } t.appendChild(ol); }
  else t.appendChild(_gdpEl('p', 'gca-p muted', 'Nobody has one yet this week, you or your friends. The first one earns you a pack of maggots.'));
  row.appendChild(t); P.appendChild(row); el.appendChild(P);
}
function _gcpMap(el) {
  const map = gardenChestMapNow(); if (!map) return;
  const n = gardenChestPieces(map); if (!n) return;
  const P = _gcpCard(map.name, 'map');
  P.appendChild(_gdpEl('p', 'gca-p', `${n} of 4 pieces. ${map.says}${n < 4 ? ' More turn up with the fish you catch.' : ' Cast right on the cross, and wait.'}`));
  const L = gardenLakeWater(), at = gardenChestAt(gardenLakeSeed(), map.id), w = 260, h = 120, sx = w / L.w, sy = h / Math.max(1, L.h - 4);
  let s = `<rect width="${w}" height="${h}" fill="#e8dcb8"/><path d="M0 10Q${w / 2} 22 ${w} 8V${h}H0z" fill="#9ac0c8"/>`;
  const tear = (i, d) => (n >= i ? '' : d);
  s += tear(1, `<rect width="${w / 2}" height="${h / 2}" fill="#6a5a44"/>`) + tear(2, `<rect x="${w / 2}" width="${w / 2}" height="${h / 2}" fill="#6a5a44"/>`) + tear(3, `<rect y="${h / 2}" width="${w / 2}" height="${h / 2}" fill="#6a5a44"/>`) + tear(4, `<rect x="${w / 2}" y="${h / 2}" width="${w / 2}" height="${h / 2}" fill="#6a5a44"/>`);
  if (n >= 4) { const x = (at.x - L.x + 0.5) * sx, y = 14 + (at.y - L.y) * sy; s += `<path d="M${x - 7} ${y - 7}L${x + 7} ${y + 7}M${x + 7} ${y - 7}L${x - 7} ${y + 7}" stroke="#a83020" stroke-width="3.4" stroke-linecap="round"/>`; const pier = GARDEN_PROPS.find(q => q.id === 'pier'); if (pier) s += `<path d="M${(pier.x - L.x + 1) * sx} 2v26" stroke="#6e4c2a" stroke-width="3"/><text x="${(pier.x - L.x + 1) * sx + 5}" y="20" font-size="10" fill="#4a3a2a">pier</text>`; }
  const a = _gdpEl('div', 'gca-map'); a.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="An old map of the lake">${s}</svg>`; P.appendChild(a);
  el.appendChild(P);
}
function _gcpSmoker(el) {
  const meals = gardenHas('meal:smoked'), built = gardenWorkOwned('smoker'); if (!built && !meals) return;
  const P = _gcpCard('The smoker', 'flame'), st = gardenSmokerState(), f = _gdpEl('div', 'gd-card-f');
  if (built) {
    if (st === 0) { P.appendChild(_gdpEl('p', 'gca-p', 'It takes your three cheapest fish, and four hours.')); f.appendChild(_gdpBtn('Light it', { icon: 'flame', kind: 'btn-primary', run: () => { _gcpSay(gardenSmokerPut()); _gdxRepaintTab(); } })); }
    else if (st === 1) { const left = Math.ceil((GARDEN_CATCH_RULES.smokeMs - (_gdNow() - Number(_gca().smk.at))) / 3600000); P.appendChild(_gdpEl('p', 'gca-p', `Smoking. About ${left} hour${left === 1 ? '' : 's'} to go. You can see it from the pier.`)); }
    else { P.appendChild(_gdpEl('p', 'gca-p', 'It is ready. You can smell it from here.')); f.appendChild(_gdpBtn('Take it out', { icon: 'hand', kind: 'btn-primary', run: () => { _gcpSay(gardenSmokerTake()); _gdxRepaintTab(); } })); }
  }
  if (meals) { P.appendChild(_gdpEl('p', 'gca-p', `${meals} smoked fish in your bag. One makes the bar wider and gives you longer to strike, for half an hour, and steam comes off you.`)); f.appendChild(_gdpBtn('Eat one', { icon: 'utensils', run: () => { _gcpSay(gardenMealEat()); _gdxRepaintTab(); } })); }
  P.appendChild(f); el.appendChild(P);
}
function _gcpBugKit(el) {
  const P = _gcpCard('For bugs', 'bug'), sugar = gardenHas('kit:sugar-pot'), S = _gca().sugar;
  P.appendChild(_gdpEl('p', 'gca-p', 'Bugs go where they feel at home. A log pile brings beetles, a butterfly bush brings butterflies, and a moth sheet brings what flies at night: they are all in the garden shop. A lantern on your belt brings moths to you.'));
  if (S) P.appendChild(_gdpEl('p', 'gca-p muted', _gdNow() - Number(S.at) >= GARDEN_CATCH_RULES.sugarMs ? 'Something has come to the tree you painted. Go and look.' : 'You have painted a tree. Give it a couple of hours.'));
  else if (sugar) { P.appendChild(_gdpEl('p', 'gca-p', `${sugar} pot${sugar === 1 ? '' : 's'} of sugar. Stand near a tree you have grown.`)); const f = _gdpEl('div', 'gd-card-f'); f.appendChild(_gdpBtn('Paint the nearest tree', { icon: 'paintbrush', run: () => { _gcpSay(gardenSugarTree()); _gdxRepaintTab(); } })); P.appendChild(f); }
  el.appendChild(P);
}

/* ---------- the lake hall ---------- */
function gardenHallTab(el) {
  const visit = _gcaOnVisit(), ca = gardenCatchHere(), hall = _gca().hall || {};
  const fish = visit ? (ca.hf || []) : Object.keys(hall.f || {}), bugs = visit ? (ca.hb || []) : Object.keys(hall.b || {}), total = visit ? Number(ca.ha) || 0 : fish.length + bugs.length, tier = gardenHallTier(total), next = GARDEN_HALL_TIERS[tier + 1];
  const H = _gdpEl('section', 'card gca-card gca-hall'), art = _gdpEl('div', 'gca-hall-art');
  art.innerHTML = `<svg viewBox="-100 -150 200 160" width="240" height="192" aria-hidden="true">${_gcwHall({ x: 0, y: 0, w: 0, h: 0 }, { tod: 'day' }, { still: true }, { ha: total }).replace(/translate\([^)]*\)/, 'translate(0 0)')}</svg>`; H.appendChild(art);
  const t = _gdpEl('div'); t.appendChild(_gdpEl('b', null, visit ? 'Your friend’s lake hall' : 'The lake hall'));
  t.appendChild(_gdpEl('p', 'gca-p', `${total} on show. It is ${GARDEN_HALL_TIERS[tier].name}.`));
  if (next && !visit) t.appendChild(_gdpEl('p', 'gca-p muted', `${next.at - total} more and it will be ${next.name}. Give one of each from your bag: use the little building on a fish or bug in Bag and market.`));
  H.appendChild(t); el.appendChild(H);
  // the tank: fish at their true sizes, one after another. Scroll along it
  if (fish.length) {
    const box = _gdpEl('div', 'gca-tank'), list = fish.slice(-60), W = Math.max(720, list.length * 120 + 80); let s = `<defs><linearGradient id="gca-tk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ad4ee"/><stop offset="1" stop-color="#2f6a98"/></linearGradient></defs><rect width="${W}" height="220" fill="url(#gca-tk)"/><rect y="194" width="${W}" height="26" fill="#d8c898"/>`;
    const r = gardenRand('tank');
    for (let i = 0; i < W / 60; i++) s += `<path d="M${Math.round(r() * W)} 196q${Math.round(r() * 8 - 4)} -18 ${Math.round(r() * 8 - 4)} -${20 + Math.round(r() * 30)}" stroke="#3f8a4a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    list.forEach((id, i) => { const d = gardenFishDef(id); if (!d || d.cat !== 'fish') return; const cm = (d.cm[0] + d.cm[1]) / 2, k = 0.34 + Math.min(0.8, Math.sqrt(cm) / 15), x = 70 + i * 120, y = 60 + (gardenHash(id) % 90); s += `<g class="gfa-swim" style="--sx:${8 + gardenHash(id) % 14}px;animation-delay:-${(gardenHash(id) % 60) / 10}s;animation-duration:${6 + gardenHash(id) % 6}s"><g transform="translate(${x} ${y}) scale(${(i % 2 ? -k : k).toFixed(2)} ${k.toFixed(2)})">${gardenFishArt(id, { uid: 'tk' + i })}<title>${esc(d.name)}</title></g></g><text x="${x}" y="212" font-size="11" text-anchor="middle" fill="#4a3a2a">${esc(d.name)}</text>`; });
    box.innerHTML = `<svg viewBox="0 0 ${W} 220" width="${W}" height="220" role="img" aria-label="The tank in the lake hall">${s}</svg>`;
    el.appendChild(_gdpEl('h3', 'gdc-h', 'The long tank')); el.appendChild(box);
  } else el.appendChild(_gdpEl('p', 'muted gca-p', visit ? 'Nothing in the tank yet.' : 'The tank is empty. Bring the hall a fish.'));
  if (bugs.length) { const g = _gdpEl('div', 'gca-art-row'); for (const id of bugs.slice(-40)) { const d = gardenBugDef(id); if (!d) continue; const s = _gdpEl('span', 'gca-art-i'); s.innerHTML = gardenCatchSvg('bug', id, 46, { uid: 'hb' + id, glow: false }); s.setAttribute('data-tip', d.name); g.appendChild(s); } el.appendChild(_gdpEl('h3', 'gdc-h', 'The insect wall')); el.appendChild(g); }
}
