/* ============================================================
   PLOTS IN A FRIEND'S GARDEN (2.75, docs/dev/GARDEN_TOGETHER.md section 29). The owner, 20 Nov 2026: "Buy land in other people's gardens", and
   "make sure we aren't adding any vulnerabilities or ability to hack me or see my data".

   In plain words. While you visit a friend who is in their garden, and they have given you Play, you can buy a little plot of it (2 by 2, 3 by 3 or 4 by 4).
   You walk to where you want it; an outline follows you and says whether it can go there. You ask; your friend sees the outline in their garden and says
   "Yes, sell it" or "No thanks". Yes: a twine-and-peg plot with your name board appears, everyone there sees it, and your friends see it on the saved copy.
   On it only you plant or place things, and what grows there is always yours to pick. Your friend can give the plot back to you at any time, and your coins come home.

   WHO DECIDES WHAT (nothing trusts the other side):
     the buyer's page     only ever changes the buyer's own coins: they go on hold when you ask (`gl.l.<id>` in your ledger, c: minus the price), are spent when the owner says yes,
                          and come back on a no, a time-out, a never-decided id, or when the owner gives the plot back. Settled once: the record says so, and a late yes cannot spend twice.
     the servers          gl:lot is checked both ways against GL_LOT (94-garden-live-0rules.js): the level, whole cells inside the world, a size the table has, the table's price.
     the owner's page     the only one that writes the plot, into the owner's own garden (g.lots), and only after the owner's own click on Yes. It checks the spot again against
                          the garden as it is (empty, growable ground in one piece of land, no other plot, not on a path, a building or water), the caps (GL_LOT.max, perFriend)
                          and the level as the server read it for that very message. A visitor can never write anything here: an ask is only a question on the owner's screen.
     what friends see     the saved copy carries only the cells of each plot (`lt`), never who: a name goes only to the people in a live garden, as "Planted by" already does.
     coins                never move from one person to another. The land office thanks the owner with GL_LOT.thanks (made by the rules, capped a day), like a shared goal's thank-you.

     gardenLotPick()             the buyer: choose a spot and ask (the host's person menu)
     gardenLotsShown()           the plots in the garden you stand in: [{i?, f?, x, y, w, h, n (a first name, or ''), mine}]
     gardenLotClash(m, x, y, w, h, who)   '' or why a thing cannot go there: someone else's plot. who: a friend id (the owner's page), 'host', or 'me' (a visit)
     gardenLotsWire()            the snapshot's `lt`: cells only
     gardenLotWorldProps(sc, o)  the drawings: turned earth, pegs and twine, the name board
     gardenLiveLotPost(p)        a durable word from the owner (go, x, back) for a plot you asked for (94-garden-live-1core.js hands it over)
     _gloHostOn(ev) / _gloHostLeft(w)   the owner's page (94-garden-live-3host.js)
     _gloFromHost(ev) / _gloResume()    the buyer's page (94-garden-live-2visit.js)
   ============================================================ */
const _glo = { asks: new Map(), mine: null, pick: null, raf: 0, sweepT: 0, chkT: 0, cardFor: '' };
const _GLO_PROBE = Object.freeze({ id: 'lot-probe', name: 'A plot', w: 1, h: 1 });
const _gloHoldKey = (i) => 'gl.l.' + i;
function _gloEsc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function _gloRectHit(a, x, y, w, h) { return x < a.x + a.w && a.x < x + w && y < a.y + a.h && a.y < y + h; }

/* ---------- the plots there are ---------- */
/** In your own garden: what friends have bought here. */
function _gloHome() {
  const out = [], lots = _gdG().lots || {};
  for (const [i, r] of Object.entries(lots)) {
    if (!r || typeof r !== 'object' || typeof r.f !== 'string' || ![r.x, r.y, r.w, r.h].every(Number.isInteger) || !glLotSizeOk(r.w, r.h)) continue;
    out.push({ i, f: r.f, x: r.x, y: r.y, w: r.w, h: r.h, c: r.c | 0, at: r.at || 0 });
  }
  return out.sort((a, b) => a.at - b.at);
}
function gardenLotsWire() { return _gloHome().slice(0, GL_LOT.max).map(L => [L.x, L.y, L.w, L.h]); }
/** My own paid plots in the garden of the friend `fid` (my ledger: what I paid for, and the owner said yes). */
function _gloMinePaid(fid) {
  const out = [];
  for (const [k, h] of Object.entries(_gdG().led)) if (k.startsWith('gl.l.') && h && h.t === 'lot' && h.ok && !h.back && !h.gone && h.to === fid && Array.isArray(h.a)) out.push({ i: k.slice(5), x: h.a[0], y: h.a[1], w: h.a[2], h: h.a[3], c: -(h.c0 || 0) });
  return out;
}
/** On a visit: the cells from their snapshot, a first name from the live "who planted what", and whether it is mine (my own ledger says I paid for exactly that plot there). */
function _gloVisit() {
  if (typeof _gdv === 'undefined' || !_gdv.on) return [];
  const s = typeof _glvLive === 'function' && _glvLive() && _glv.snap ? _glv.snap : (typeof _gdvSnap === 'function' ? _gdvSnap() : null);
  const rows = s && Array.isArray(s.lt) ? s.lt : [], paid = _gloMinePaid(_gdv.fid);
  return rows.map(r => {
    const [x, y, w, h] = r, n = (typeof _gll !== 'undefined' && _gll.by && _gll.by.get('l|' + x + '|' + y)) || '';
    const mine = paid.some(P => P.x === x && P.y === y && P.w === w && P.h === h) || (!!n && !!_glv.selfName && n === _glv.selfName && _glvLive());
    return { x, y, w, h, n: mine ? (_glv.selfName || n) : n, mine };
  });
}
function gardenLotsShown() {
  if (typeof _gdv !== 'undefined' && _gdv.on) return _gloVisit();
  return _gloHome().map(L => Object.assign({}, L, { n: typeof _glhByName === 'function' ? _glhByName(L.f) : 'A friend', mine: false }));
}
/** Why something cannot go there because of a plot, or ''. A plot is its buyer's alone: the owner of the garden too keeps off it (they can give it back instead). */
function gardenLotClash(m, x, y, w, h, who) {
  let lots;
  try { lots = m && m.visit ? _gloVisit() : _gloHome(); } catch (e) { return ''; }
  if (!lots.length) return '';
  if (!who) who = m && m.visit ? 'me' : 'host';
  for (const L of lots) {
    if (!_gloRectHit(L, x, y, w || 1, h || 1)) continue;
    if (who === 'me' ? L.mine : L.f === who) { if (x >= L.x && y >= L.y && x + (w || 1) <= L.x + L.w && y + (h || 1) <= L.y + L.h) continue; return 'Keep it inside your plot, or wholly outside it'; }
    const name = who === 'me' ? (L.n || '') : (typeof _glhByName === 'function' ? _glhByName(L.f) : '');
    if (who === 'host') return `That is ${name || 'a friend'}'s plot: only they plant there. You can give it back to them from your gate.`;
    return `That is ${name ? name + "'s" : 'a friend\'s'} plot`;
  }
  return '';
}
/** A harvest's share: on a plot of their own, what grows is always the planter's. */
function gardenLotOwnsCell(f, x, y) { return !!f && _gloHome().some(L => L.f === f && _gloRectHit(L, x, y, 1, 1)); }

/* ---------- is this a good spot? (both pages, each against the garden it has) ---------- */
/** '' or why not, in plain words. lots: the plots there are now; ignore: a plot id to leave out. */
function _gloSpotWhy(m, x, y, w, h, lots) {
  if (!m || !glLotSizeOk(w, h)) return 'That size of plot is not sold here';
  if (x < 0 || y < 0 || x + w > GARDEN_WORLD.cols || y + h > GARDEN_WORLD.rows) return 'Off the edge of the garden';
  let area = '';
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const cx = x + dx, cy = y + dy;
    const why = gardenCellOk(_GLO_PROBE, cx, cy, m.level.level, 'decor');
    if (why) return why === 'Not in the water (a boardwalk can go there)' ? 'Part of it is in the water' : why;
    if (gardenIsWater(cx, cy)) return 'Part of it is in the water';
    const a = gardenAreaAt(cx, cy, m.level.level), ar = gardenArea(a);
    if (!ar) return 'Nothing can go there';   // (a bed or a patch: plant on it; the lawn: place things on it)
    if (area && a !== area) return 'A plot needs to be all on one piece of land';
    area = a;
    const c = m.occ.get(cx + ',' + cy);
    if (c && (c.plant || c.decor || c.ground)) return 'Something is already there: a plot needs empty ground';
  }
  for (const L of lots || []) if (_gloRectHit(L, x, y, w, h)) return L.mine ? 'Your other plot is there' : `${L.n ? L.n + "'s" : 'Another'} plot is there`;
  return '';
}

/* ============================================================
   THE BUYER'S PAGE
   _glo.pick: {w, h, x, y, why} while choosing; _glo.mine: {i, x, y, w, h, c, st: 'asking' | 'looking', at}
   ============================================================ */
function _gloLive() { return typeof _gll !== 'undefined' && _gll.role === 'visit' && typeof _glvLive === 'function' && _glvLive(); }
function _gloHostName() { try { return typeof _gdvFirst === 'function' ? _gdvFirst() : 'your friend'; } catch (e) { return 'your friend'; } }
function _gloHoldOf(i) { const h = _gdG().led[_gloHoldKey(i)]; return h && h.t === 'lot' ? h : null; }
function _gloOpenHolds(fid) { return Object.entries(_gdG().led).filter(([k, h]) => k.startsWith('gl.l.') && h && h.t === 'lot' && !h.ok && (!fid || h.to === fid)); }
function _gloCoins() { try { return gardenWallet().coins; } catch (e) { return 0; } }
/** Open the chooser: walk, and the outline follows you. */
function gardenLotPick() {
  if (!_gloLive()) { gardenToast(`Plots are bought face to face: visit ${_gloHostName()} while they are in their garden.`, { icon: 'fence' }); return; }
  if (!glAtLeast(_glv.lv, GL_LOT.lv)) { gardenToast(`${_gloHostName()} needs to give you Play before you can buy a plot here.`, { icon: 'fence' }); return; }
  if (_glo.mine) { _gloPaint(); return; }
  if (_gloMinePaid(_gdv.fid).length >= GL_LOT.perFriend) { gardenToast(`You already have ${GL_LOT.perFriend} plots in ${_gloHostName()}'s garden. That is the most there can be.`, { icon: 'fence' }); return; }
  _glo.pick = { w: 3, h: 3, x: -1, y: -1, why: '' };
  _gloTick();
  _gloPaint();
}
function _gloPickClose() { _glo.pick = null; cancelAnimationFrame(_glo.raf); _glo.raf = 0; _gloOutline(null); _gloPaint(); }
/** Each frame while choosing (or while waiting for an answer): where the outline is, and whether it can go there. Cheap: a few dozen cells, and only when you have moved. */
function _gloTick() {
  cancelAnimationFrame(_glo.raf); _glo.raf = 0;
  const P = _glo.pick, M = _glo.mine;
  if ((!P && !M) || typeof _gw === 'undefined' || !_gw.on) { _gloOutline(null); return; }
  if (P) {
    const x = Math.round(_gw.px - P.w / 2), y = Math.round(_gw.py - P.h / 2 - 0.2);
    if (x !== P.x || y !== P.y || P.dirty) {
      P.x = x; P.y = y; P.dirty = false;
      let why = '';
      try { why = _gloSpotWhy(gardenHere(), x, y, P.w, P.h, _gloVisit()); } catch (e) { why = 'One moment…'; }
      if (P.why !== why) { P.why = why; _gloPaint(); }
    }
    _gloOutline({ x: P.x, y: P.y, w: P.w, h: P.h, ok: !P.why });
  } else _gloOutline({ x: M.x, y: M.y, w: M.w, h: M.h, ok: true, wait: true });
  _glo.raf = requestAnimationFrame(_gloTick);
}
/** The outline on the stage: a dashed rope line round the cells, green when it can go there, warm red when not. Drawn over the world (it is a question, not a thing yet). */
function _gloOutline(r) {
  const box = typeof _gw !== 'undefined' ? _gw.box : null;
  let svg = box ? box.querySelector(':scope > .glo-outline') : null;
  if (!r || !box) { if (svg) svg.remove(); return; }
  const a = _ghProject(r.x, r.y), b = _ghProject(r.x + r.w, r.y + r.h);
  if (!a || !b) return;
  if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'glo-outline'); svg.setAttribute('aria-hidden', 'true'); box.appendChild(svg); }
  const x = a.x, y = a.y, w = b.x - a.x, h = b.y - a.y, col = r.ok ? '#3fae4f' : '#d0573a', k = Math.max(0.5, a.k);
  const key = [Math.round(x), Math.round(y), Math.round(w), Math.round(h), r.ok, !!r.wait].join(',');
  if (svg.getAttribute('data-k') === key) return;
  svg.setAttribute('data-k', key);
  const peg = (px, py) => `<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)})"><ellipse cx="0" cy="1" rx="${(4 * k).toFixed(1)}" ry="${(1.6 * k).toFixed(1)}" fill="#000" opacity=".25"/><rect x="${(-1.6 * k).toFixed(1)}" y="${(-9 * k).toFixed(1)}" width="${(3.2 * k).toFixed(1)}" height="${(10 * k).toFixed(1)}" rx="${(1 * k).toFixed(1)}" fill="#9a6a3a" stroke="#5a3a1e" stroke-width="${(0.8 * k).toFixed(1)}"/></g>`;
  svg.innerHTML = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(6 * k).toFixed(1)}" fill="${col}" fill-opacity="${r.wait ? 0.10 : 0.16}" stroke="${col}" stroke-width="${(2.4 * k).toFixed(1)}" stroke-dasharray="${(7 * k).toFixed(1)} ${(5 * k).toFixed(1)}" class="${r.wait ? 'glo-wait' : ''}"/>` + peg(x, y) + peg(x + w, y) + peg(x, y + h) + peg(x + w, y + h);
}
function _gloSize(w, h) { const P = _glo.pick; if (!P) return; P.w = w; P.h = h; P.dirty = true; P.why = ''; _gloPaint(); }
/** Ask: the coins go on hold first (saved), then the question goes. */
function _gloAsk() {
  const P = _glo.pick; if (!P || P.why || !_gloLive()) return;
  const c = glLotPrice(P.w, P.h);
  if (_gloCoins() < c) { gardenToast(`That plot is ${c} coins, and you have ${_gloCoins()}.`, { icon: 'coins' }); return; }
  const i = _gllNewId(), g = _gdG();
  g.led[_gloHoldKey(i)] = { d: _gllToday(), k: 'gl', n: 0, c: _gdCost(c), c0: _gdCost(c), t: 'lot', to: _glv.fid, a: [P.x, P.y, P.w, P.h], at: _gdNow() };
  _gscSaveGarden();
  _glo.mine = { i, x: P.x, y: P.y, w: P.w, h: P.h, c, st: 'asking', at: Date.now() };   // clock-ok: how long we have waited
  _glo.pick = null;
  _gloTick(); _gloPaint();
  _glvSend('lot', { i, e: 'ask', x: P.x, y: P.y, lw: P.w, lh: P.h, c });
  _gloKeep();
}
function _gloKeep() {
  clearInterval(_glo.chkT);
  _glo.chkT = setInterval(() => {
    const M = _glo.mine;
    if (!M) { clearInterval(_glo.chkT); _glo.chkT = 0; return; }
    if (_gloLive()) _glvSend('lot', { i: M.i, e: 'chk' });   // (what became of it? the owner's page answers from what it has: waiting, yes, or never decided)
  }, 20000);
}
function _gloCancel() {
  const M = _glo.mine; if (!M) { _gloPickClose(); return; }
  _glvSend('lot', { i: M.i, e: 'end' });
  M.st = 'ending'; _gloPaint();
}
/** The owner's word, however it came. */
function _gloFromHost(ev) {
  if (glLotOk(ev, true)) return;
  const h = _gloHoldOf(ev.i);
  if (!h || h.to !== _glv.fid) return;   // (only the friend I asked can answer, and only about what I asked)
  if (ev.e === 'st') { const M = _glo.mine; if (M && M.i === ev.i && M.st === 'asking') { M.st = 'looking'; _gloPaint(); } return; }
  if (ev.e === 'go') { _gloSettle(ev.i, [ev.x, ev.y, ev.lw, ev.lh]); return; }
  _gloRelease(ev.i, ev.why);
}
/** Yes: the hold becomes the purchase, once. The plot is the one I asked for: anything else is not what I paid for, and the coins come back. */
function _gloSettle(i, rect) {
  const g = _gdG(), h = _gloHoldOf(i);
  if (!h || h.ok) return false;
  if (rect && !rect.every((v, k) => v === h.a[k])) { _gloRelease(i, 'spot'); return false; }
  h.ok = 1; h.sat = _gdNow();
  _gscSaveGarden();
  const M = _glo.mine;
  if (M && M.i === i) { _glo.mine = null; clearInterval(_glo.chkT); _glo.chkT = 0; }
  _gloTick(); _gloPaint();
  const who = _gloHostName();
  gardenToast(`${who} said yes! The plot is yours. Only you plant there, and everything you grow on it is yours to pick.`, { icon: 'fence', kind: 'ok', timeout: 7000 });
  try { if (typeof gameCheer === 'function') gameCheer(null, { text: '🌱', tone: 'gold' }); if (typeof gartEmoteRun === 'function') gartEmoteRun('cheer', { quiet: true }); if (typeof gardenLiveEmoted === 'function') gardenLiveEmoted('cheer'); } catch (e) { /* only a flourish */ }
  if (typeof _gdvTouch === 'function') _gdvTouch();
  return true;
}
const _GLO_WHY = {
  no: (n) => `${n} said no thanks this time.`, busy: (n) => `${n} is answering someone else just now. Try again in a moment.`, gone: () => 'That plot was never sold.',
  level: (n) => `${n} needs to give you Play to buy a plot.`, full: (n) => `${n}'s garden has all the plots it can.`, spot: () => 'That spot is not free any more.',
  left: () => 'You left before they answered.', cancel: () => 'You changed your mind.', old: (n) => `${n} did not answer in time.`, host: (n) => `${n} left their garden.`, mine: (n) => `You already have all the plots you can in ${n}'s garden.`,
};
function _gloRelease(i, why) {
  const g = _gdG(), h = _gloHoldOf(i);
  if (!h || h.ok) return false;
  delete g.led[_gloHoldKey(i)];
  _gscSaveGarden();
  const M = _glo.mine;
  if (M && M.i === i) { _glo.mine = null; clearInterval(_glo.chkT); _glo.chkT = 0; }
  _gloTick(); _gloPaint();
  gardenToast(`${(_GLO_WHY[why] || _GLO_WHY.gone)(_gloHostName())} Your ${-(h.c0 || 0)} coins are back.`, { icon: 'undo-2', timeout: 6000 });
  return true;
}
/** A durable word (94-garden-live-1core.js): only the friend the hold names may give it. back: they gave the plot back, and the coins come home, once. */
function gardenLiveLotPost(p) {
  const g = _gdG(), h = _gloHoldOf(p.i);
  if (!h || h.to !== p.f) return;
  if (p.d === 'go') { if (!h.ok) _gloSettle(p.i, null); return; }
  if (p.d === 'x') { if (!h.ok) _gloRelease(p.i, 'gone'); return; }
  if (p.d === 'back' && h.ok && !h.back) {
    h.back = 1; h.c = 0; h.bat = _gdNow();
    _gscSaveGarden();
    gardenToast(`${_gscFirst(p.f)} gave your plot back to you. Your ${-(h.c0 || 0)} coins are home again.`, { icon: 'fence', timeout: 8000 });
    if (typeof _gdvTouch === 'function') _gdvTouch();
  }
}
/** Live in their garden (again): ask what became of anything I am still waiting on. Until they answer, nothing is released. */
function _gloResume() {
  const hs = _gloOpenHolds(_glv.fid);
  if (!hs.length) return;
  setTimeout(() => { if (_gloLive()) for (const [k] of _gloOpenHolds(_glv.fid).slice(0, 4)) _glvSend('lot', { i: k.slice(5), e: 'chk' }); }, 1800);
  const [k, h] = hs[hs.length - 1];
  if (!_glo.mine) { _glo.mine = { i: k.slice(5), x: h.a[0], y: h.a[1], w: h.a[2], h: h.a[3], c: -(h.c0 || 0), st: 'asking', at: Date.now() }; _gloKeep(); _gloTick(); _gloPaint(); }   // clock-ok: how long we have waited
}
/** I give my plot up (no coins back: it was mine to keep). The owner's page takes it away; my record says it is gone. Undo for a few seconds. */
function _gloDrop(i) {
  const h = _gloHoldOf(i); if (!h || !h.ok || h.back || h.gone || !_gloLive()) return;
  const t = setTimeout(() => { const r = _gloHoldOf(i); if (!r || r.gone) return; r.gone = 1; _gscSaveGarden(); _glvSend('lot', { i, e: 'drop' }); if (typeof _gdvTouch === 'function') _gdvTouch(); }, 6000);
  gardenToast(`Your plot goes back to ${_gloHostName()} in a moment.`, { icon: 'fence', timeout: 6000, action: { label: 'Undo', run: () => { clearTimeout(t); gardenToast('You kept your plot.', { icon: 'undo-2', kind: 'ok' }); } } });
}

/* ---------- the buyer's panel ---------- */
function _gloPaint() {
  const box = typeof _gw !== 'undefined' ? _gw.box : null;
  const old = box ? box.querySelector(':scope > .glo-panel') : null;
  const P = _glo.pick, M = _glo.mine;
  if (!box || !box.isConnected || (!P && !M)) { if (old) old.remove(); return; }
  const p = _gsvEl('aside', 'glo-panel'); p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Buy a plot');
  const who = _gloHostName();
  const top = _gsvEl('div', 'glo-top');
  top.appendChild(_gsvEl('h3', 'glo-h', P ? `A plot in ${who}'s garden` : `Asking ${who}`));
  top.appendChild(_gsvBtn('', { icon: 'x', kind: 'btn-ghost', aria: P ? 'Close' : 'Call it off', run: () => (P ? _gloPickClose() : _gloCancel()) }));
  p.appendChild(top);
  if (P) {
    p.appendChild(_gsvEl('p', 'glo-say', 'Walk to where you want it: the outline follows you. Only you plant or place things on it: on a bed, grow anything; on the lawn, put out your seats and decorations.'));
    const sizes = _gsvEl('div', 'glo-sizes'); sizes.setAttribute('role', 'radiogroup'); sizes.setAttribute('aria-label', 'Size');
    for (const [w, h] of GL_LOT.sizes) {
      const b = _gsvBtn('', { kind: P.w === w && P.h === h ? 'btn-primary' : 'btn-secondary', cls: 'glo-size', pressed: P.w === w && P.h === h, run: () => _gloSize(w, h) });
      b.appendChild(_gsvEl('b', null, w === 2 ? 'Small' : w === 3 ? 'Medium' : 'Large'));
      b.appendChild(_gsvEl('span', null, `${w} × ${h} · ${glLotPrice(w, h)} coins`));
      sizes.appendChild(b);
    }
    p.appendChild(sizes);
    const c = glLotPrice(P.w, P.h), have = _gloCoins(), short = have < c;
    const st = _gsvEl('p', 'glo-st ' + (P.why || short ? 'is-no' : 'is-ok'), P.why ? P.why + '.' : short ? `You have ${have} coins: this one is ${c}.` : `This spot is free. You have ${have} coins.`);
    st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    p.appendChild(st);
    const foot = _gsvEl('div', 'glo-foot');
    foot.appendChild(_gsvBtn(`Ask ${who}`, { icon: 'fence', kind: 'btn-primary', disabled: !!P.why || short, tip: `${who} sees your plot and says yes or no. Your coins wait safely until then.`, run: () => _gloAsk() }));
    foot.appendChild(_gsvBtn('Not now', { kind: 'btn-ghost', run: () => _gloPickClose() }));
    p.appendChild(foot);
  } else {
    const line = M.st === 'ending' ? 'Calling it off…' : M.st === 'looking' ? `${who} is looking at your plot now…` : `${who} gets your question now…`;
    const st = _gsvEl('p', 'glo-st is-wait', `${line} ${M.w} × ${M.h} for ${M.c} coins. Your coins wait safely: if they say no, they come straight back.`);
    st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    p.appendChild(st);
    const foot = _gsvEl('div', 'glo-foot');
    if (M.st !== 'ending') foot.appendChild(_gsvBtn('Call it off', { icon: 'undo-2', kind: 'btn-ghost', run: () => _gloCancel() }));
    p.appendChild(foot);
  }
  if (old) old.replaceWith(p); else box.appendChild(p);
}

/* ============================================================
   THE OWNER'S PAGE
   _glo.asks: id -> {i, f, w (slot), n, x, y, lw, lh, c, lv, at}: questions the owner has not answered yet
   ============================================================ */
function _gloTell(f, body) { return _glhSend(f, 'lot', body); }
function _gloHostOn(ev) {
  if (glLotOk(ev, false) || typeof _glh === 'undefined' || !_glh.on) return;   // (the server checked these tables too; the page checks them again)
  const A = _gll.actors.get(ev.w);
  if (!A || !A.f || A.f !== ev.f) return;
  if (ev.lv) A.lv = ev.lv;
  if (typeof gardenReady !== 'function' || !gardenReady() || !gardenEnsure()) return;   // (no answer while the garden is not loaded: they ask again)
  const no = (why) => _gloTell(ev.f, { i: ev.i, e: 'x', why });
  const g = _gdG();
  switch (ev.e) {
    case 'chk': {
      if (_glo.asks.has(ev.i)) { _gloTell(ev.f, { i: ev.i, e: 'st' }); return; }
      const r = g.lots[ev.i];
      if (r && r.f === ev.f) _gloTell(ev.f, { i: ev.i, e: 'go', x: r.x, y: r.y, lw: r.w, lh: r.h, c: glLotPrice(r.w, r.h) });
      else no('gone');   // (never decided: the record is written before the yes is sent)
      return;
    }
    case 'end': { const Q = _glo.asks.get(ev.i); if (Q && Q.f === ev.f) { _glo.asks.delete(ev.i); _gloCard(); } if (!g.lots[ev.i]) no('cancel'); return; }
    case 'drop': {
      const r = g.lots[ev.i]; if (!r || r.f !== ev.f) return;
      delete g.lots[ev.i];
      g.gl['l.' + ev.i + '.d'] = { f: ev.f, t: 'lotdrop', d: _gllToday(), at: _gdNow(), noUndo: true };
      _glhPrune(); _gdSave(); _glhHud(); _gloShowAll();
      return;
    }
    case 'ask': {
      if (!glAtLeast(ev.lv || A.lv, GL_LOT.lv)) { no('level'); return; }
      if (g.lots[ev.i]) { const r = g.lots[ev.i]; if (r.f === ev.f) _gloTell(ev.f, { i: ev.i, e: 'go', x: r.x, y: r.y, lw: r.w, lh: r.h, c: glLotPrice(r.w, r.h) }); return; }
      if (_glo.asks.has(ev.i)) { _gloTell(ev.f, { i: ev.i, e: 'st' }); return; }
      if ([..._glo.asks.values()].some(Q => Q.f === ev.f)) { no('busy'); return; }
      if (_glo.asks.size >= 2) { no('busy'); return; }
      const lots = _gloHome();
      if (lots.length >= GL_LOT.max) { no('full'); return; }
      if (lots.filter(L => L.f === ev.f).length >= GL_LOT.perFriend) { no('mine'); return; }
      if (_gloSpotWhy(gardenModel(), ev.x, ev.y, ev.lw, ev.lh, lots)) { no('spot'); return; }
      _glo.asks.set(ev.i, { i: ev.i, f: ev.f, w: ev.w, n: A.n, x: ev.x, y: ev.y, lw: ev.lw, lh: ev.lh, c: ev.c, at: Date.now() });   // clock-ok: how long it has waited
      _gloTell(ev.f, { i: ev.i, e: 'st' });
      if (!_glo.sweepT) _glo.sweepT = setInterval(_gloSweep, 5000);
      _gloCard();
      return;
    }
    default:
  }
}
function _gloSweep() {
  const now = Date.now();   // clock-ok: how long a question has waited
  for (const Q of [..._glo.asks.values()]) if (now - Q.at > GL_LOT.askMs) { _glo.asks.delete(Q.i); _gloTell(Q.f, { i: Q.i, e: 'x', why: 'old' }); }
  if (!_glo.asks.size) { clearInterval(_glo.sweepT); _glo.sweepT = 0; }
  _gloCard();
}
function _gloHostLeft(w) { for (const Q of [..._glo.asks.values()]) if (Q.w === w) _glo.asks.delete(Q.i); _gloCard(); }
function _gloHostStop() { for (const Q of [..._glo.asks.values()]) _gloTell(Q.f, { i: Q.i, e: 'x', why: 'host' }); _glo.asks.clear(); _gloCard(); }
/** Everyone there sees the garden as it is now (the plot is in the snapshot). */
function _gloShowAll() { try { if (_glh.on && _glhAnyone()) _glhSnapAll(); } catch (e) { /* the next look has it */ } if (typeof gardenRepaintSoon === 'function') gardenRepaintSoon(); }
/** The owner's own click: Yes. Everything is checked again against the garden as it is now; the plot, the word to the buyer and the thank-you go in ONE save, and only then is the buyer told. */
function _gloYes(i) {
  const Q = _glo.asks.get(i); if (!Q) return;
  _glo.asks.delete(i);
  const A = _gll.actors.get(Q.w), no = (why, say) => { _gloTell(Q.f, { i, e: 'x', why }); if (say) gardenToast(say, { icon: 'fence' }); _gloCard(); };
  if (!A || A.f !== Q.f) { no('left', `${Q.n} has left, so the plot was not sold.`); return; }
  if (!glAtLeast(_glhPermOf({ f: Q.f }).lv, GL_LOT.lv)) { no('level', `${Q.n} no longer has Play here, so the plot was not sold.`); return; }
  const lots = _gloHome();
  if (lots.length >= GL_LOT.max) { no('full', 'Your garden has all the plots it can.'); return; }
  if (lots.filter(L => L.f === Q.f).length >= GL_LOT.perFriend) { no('mine'); return; }
  const why = _gloSpotWhy(gardenModel(), Q.x, Q.y, Q.lw, Q.lh, lots);
  if (why) { no('spot', `That spot is not free any more (${why.toLowerCase()}), so the plot was not sold.`); return; }
  const g = _gdG(), today = _gllToday(), at = _gdNow();
  g.lots[i] = { f: Q.f, x: Q.x, y: Q.y, w: Q.lw, h: Q.lh, c: glLotPrice(Q.lw, Q.lh), d: today, at };
  g.gq['l' + i + 'g'] = { to: Q.f, why: 'lot', i, d: 'go', at };
  const thanked = Object.entries(g.led).filter(([k, e]) => k.startsWith('gl.lt.') && e && e.d === today).length;
  const thanks = thanked < GL_LOT.thanks.day ? GL_LOT.thanks.c : 0;
  if (thanks) g.led['gl.lt.' + i] = { d: today, k: 'gl', n: 0, c: thanks, ok: 1 };
  g.gl['l.' + i] = { f: Q.f, t: 'lot', d: today, at, noUndo: true };
  _glhPrune();
  _gdSave();
  _gloTell(Q.f, { i, e: 'go', x: Q.x, y: Q.y, lw: Q.lw, lh: Q.lh, c: glLotPrice(Q.lw, Q.lh) });
  _glhFlushPosts();
  _gloCard(); _glhHud(); _gloShowAll();
  gardenToast(`${Q.n} has a plot in your garden now.${thanks ? ` The land office gave you ${thanks} coins to say thank you.` : ''} You can give it back to them any time from your gate.`, { icon: 'fence', kind: 'ok', timeout: 8000 });
}
function _gloNo(i) { const Q = _glo.asks.get(i); if (!Q) return; _glo.asks.delete(i); _gloTell(Q.f, { i, e: 'x', why: 'no' }); _gloCard(); }
/** Give a plot back: its buyer's coins go home by the durable post, after a few seconds in which Undo puts everything as it was. What they planted stays theirs. */
function gardenLotGiveBack(i) {
  const g = _gdG(), r = g.lots[i]; if (!r) return;
  const was = JSON.parse(JSON.stringify(r)), key = 'l' + i + 'b', name = typeof _glhByName === 'function' ? _glhByName(r.f) : 'your friend';
  delete g.lots[i];
  g.gq[key] = { to: r.f, why: 'lot', i, d: 'back', at: _gdNow(), hold: _gdNow() + 6000 };
  g.gl['l.' + i + '.b'] = { f: r.f, t: 'lotback', d: _gllToday(), at: _gdNow(), noUndo: true };
  _gdSave(); _glhFlushPosts(); _gloShowAll(); _glhHud();
  gardenToast(`You gave ${name}'s plot back. Their ${was.c} coins go home to them.`, { icon: 'fence', timeout: 6000, action: { label: 'Undo', run: () => { const G = _gdG(); if (!G.gq[key]) { gardenToast('It has gone already.', { icon: 'fence' }); return; } delete G.gq[key]; delete G.gl['l.' + i + '.b']; G.lots[i] = was; _gdSave(); _gloShowAll(); _glhHud(); gardenToast(`${name} keeps the plot.`, { icon: 'undo-2', kind: 'ok' }); } } });
}
/** The question on the owner's screen: who, where (the outline is drawn in your garden), how big, and two plain buttons. */
function _gloCard() {
  const box = typeof _gw !== 'undefined' ? _gw.box : null;
  const old = box ? box.querySelector(':scope > .glo-card') : null;
  const Q = [..._glo.asks.values()][0];
  _gloHostOutline(Q);
  if (!box || !box.isConnected || !Q) { if (old) old.remove(); return; }
  if (old && old.getAttribute('data-i') === Q.i) return;
  const p = _gsvEl('aside', 'glo-panel glo-card'); p.setAttribute('role', 'alertdialog'); p.setAttribute('aria-label', `${Q.n} would like a plot`); p.setAttribute('data-i', Q.i);
  p.appendChild(_gsvEl('h3', 'glo-h', `${Q.n} would like to buy a plot here`));
  p.appendChild(_gsvEl('p', 'glo-say', `The ${Q.lw} × ${Q.lh} patch marked out in green, for ${Q.c} of their own coins. Only they would plant there, and what grows is theirs. You can give it back to them any time, and their coins go home.`));
  const foot = _gsvEl('div', 'glo-foot');
  foot.appendChild(_gsvBtn('Yes, sell it', { icon: 'fence', kind: 'btn-primary', run: () => _gloYes(Q.i) }));
  foot.appendChild(_gsvBtn('No thanks', { kind: 'btn-secondary', run: () => _gloNo(Q.i) }));
  p.appendChild(foot);
  if (old) old.replaceWith(p); else box.appendChild(p);
}
function _gloHostOutline(Q) {
  cancelAnimationFrame(_glo.raf); _glo.raf = 0;
  if (!Q) { if (!_glo.pick && !_glo.mine) _gloOutline(null); return; }
  const step = () => { _glo.raf = 0; if (!_glo.asks.has(Q.i)) { _gloOutline(null); return; } _gloOutline({ x: Q.x, y: Q.y, w: Q.lw, h: Q.lh, ok: true, wait: true }); _glo.raf = requestAnimationFrame(step); };
  step();
}
/** For the gate panel: the plots this friend has here, each with Give back. */
function gardenLotGateRow(fid) {
  const mine = _gloHome().filter(L => L.f === fid);
  if (!mine.length) return null;
  const row = _gsvEl('div', 'glo-gate');
  row.appendChild(_gsvEl('span', null, mine.length === 1 ? `Has a ${mine[0].w} × ${mine[0].h} plot here` : `Has ${mine.length} plots here`));
  for (const L of mine) row.appendChild(_gsvBtn(mine.length === 1 ? 'Give it back' : `Give the ${L.w} × ${L.h} back`, { icon: 'fence', kind: 'btn-ghost', tip: 'Their coins go home to them. What they planted stays theirs.', run: () => gardenLotGiveBack(L.i) }));
  return row;
}

/* ============================================================
   THE DRAWING: turned earth inside, a peg at each corner and along the long sides, a sagging twine between them, and a little name board on two stakes at the front.
   The back half sorts with the row behind the plot, the front half with the row in front of it, so a gardener stands inside it and plants grow over the earth.
   ============================================================ */
function gardenLotWorldProps(sc) {
  let lots;
  try { lots = gardenLotsShown(); } catch (e) { return []; }
  if (!lots.length) return [];
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, out = [], N = (v) => Math.round(v * 10) / 10;
  const winter = sc && sc.season === 'winter', twine = winter ? '#e9e1cc' : '#efe2b8', twineDark = '#a8916a', wood = ['#a8743e', '#7a4f28', '#4f3218'];
  const peg = (x, y, tall) => `<ellipse cx="${N(x + 1)}" cy="${N(y + 1.5)}" rx="5.5" ry="2.2" fill="#2a1c0c" opacity=".28"/><path d="M${N(x - 2)} ${N(y + 1)}L${N(x - 2.2)} ${N(y - tall)}L${N(x)} ${N(y - tall - 2.2)}L${N(x + 2.2)} ${N(y - tall)}L${N(x + 2)} ${N(y + 1)}Z" fill="${wood[0]}" stroke="${wood[2]}" stroke-width=".9" stroke-linejoin="round"/><path d="M${N(x + 0.6)} ${N(y - tall + 1)}L${N(x + 0.8)} ${N(y)}" stroke="${wood[1]}" stroke-width="1" opacity=".7"/><path d="M${N(x - 3)} ${N(y + 1.2)}q1.5 -2.6 2.6 -.2M${N(x + 0.8)} ${N(y + 1.4)}q1.6 -3 3 -.3" stroke="#5f8a3a" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  const rope = (x0, y0, x1, y1, sag) => `<path d="M${N(x0)} ${N(y0)}Q${N((x0 + x1) / 2)} ${N((y0 + y1) / 2 + sag)} ${N(x1)} ${N(y1)}" stroke="${twineDark}" stroke-width="2.2" fill="none" opacity=".55"/><path d="M${N(x0)} ${N(y0 - 0.5)}Q${N((x0 + x1) / 2)} ${N((y0 + y1) / 2 + sag - 0.5)} ${N(x1)} ${N(y1 - 0.5)}" stroke="${twine}" stroke-width="1.3" fill="none"/>`;
  for (const L of lots) {
    const x0 = L.x * cw + 3, x1 = (L.x + L.w) * cw - 3, y0 = W.sky + L.y * ch + 3, y1 = W.sky + (L.y + L.h) * ch - 2, T = 13, id = 'lot-' + L.x + '-' + L.y;
    const sag = Math.min(6, (x1 - x0) / 40);
    // the earth: a soft, uneven turned border inside the twine (on the ground, under everything that grows)
    const rnd = typeof gardenRand === 'function' ? gardenRand(id) : Math.random, wob = () => (rnd() - 0.5) * 4;
    let earth = `<path d="M${N(x0 + 4 + wob())} ${N(y0 + 3)}Q${N((x0 + x1) / 2)} ${N(y0 + wob())} ${N(x1 - 4 + wob())} ${N(y0 + 3)}Q${N(x1 + 1)} ${N((y0 + y1) / 2)} ${N(x1 - 3 + wob())} ${N(y1 - 2)}Q${N((x0 + x1) / 2)} ${N(y1 + 1 + wob())} ${N(x0 + 3 + wob())} ${N(y1 - 2)}Q${N(x0 - 1)} ${N((y0 + y1) / 2)} ${N(x0 + 4)} ${N(y0 + 3)}Z" fill="#6a4a2a" fill-opacity="${winter ? 0.10 : 0.16}" stroke="#5a3c20" stroke-opacity=".22" stroke-width="2.5"/>`;
    for (let k = 0; k < L.w * L.h * 2; k++) { const fx = x0 + 8 + rnd() * (x1 - x0 - 16), fy = y0 + 6 + rnd() * (y1 - y0 - 12); earth += `<path d="M${N(fx - 3)} ${N(fy)}q3 -1.6 6 0" stroke="#4a301a" stroke-opacity=".18" stroke-width="1.2" fill="none"/>`; }
    out.push({ z: L.y - 0.02, x: L.x, html: `<g class="gd-it gd-prop glo-lot" data-prop="${id}-earth" data-z="${L.y}" pointer-events="none">${earth}</g>` });
    // the back: pegs at the back corners and the side ropes' back halves
    const midX = (x0 + x1) / 2;
    let back = rope(x0, y0 - T + 4, x1, y0 - T + 4, sag) + rope(x0, y0 - T + 4, x0, y1 - T + 4, 0) + rope(x1, y0 - T + 4, x1, y1 - T + 4, 0) + peg(x0, y0, T) + peg(x1, y0, T);
    if (L.w >= 3) back += peg(midX, y0, T - 2);
    out.push({ z: L.y + 0.05, x: L.x, html: `<g class="gd-it gd-prop glo-lot" data-prop="${id}-back" data-z="${L.y}" pointer-events="none">${back}</g>` });
    // the front: the front rope, its pegs, and the name board on the left-front corner
    let front = rope(x0, y1 - T + 4, x1, y1 - T + 4, sag) + peg(x0, y1, T) + peg(x1, y1, T);
    if (L.w >= 3) front += peg(midX, y1, T - 2);
    const name = String(L.n || '').slice(0, 14), label = L.mine ? 'My plot' : name ? name + "'s plot" : 'A friend\'s plot';
    const bw = Math.max(44, Math.min(86, 10 + label.length * 5.6)), bx = x0 + 10, by = y1 - 30;
    front += `<ellipse cx="${N(bx + bw / 2)}" cy="${N(y1 + 2)}" rx="${N(bw / 2 + 2)}" ry="3" fill="#2a1c0c" opacity=".22"/>`;
    for (const sx of [bx + 7, bx + bw - 7]) front += `<rect x="${N(sx - 1.8)}" y="${N(by + 6)}" width="3.6" height="${N(y1 - by - 5)}" rx="1" fill="${wood[1]}" stroke="${wood[2]}" stroke-width=".8"/><path d="M${N(sx - 3)} ${N(y1 + 1)}q1.4 -3 2.8 -.4M${N(sx + 0.6)} ${N(y1 + 1.2)}q1.7 -3.4 3.2 -.3" stroke="#5f8a3a" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    front += `<g class="glo-board"><rect x="${N(bx)}" y="${N(by - 6)}" width="${N(bw)}" height="15" rx="3" fill="${wood[0]}" stroke="${wood[2]}" stroke-width="1.1"/><path d="M${N(bx + 3)} ${N(by - 2)}h${N(bw - 6)}M${N(bx + 3)} ${N(by + 5)}h${N(bw - 10)}" stroke="${wood[1]}" stroke-width=".7" opacity=".55"/><text x="${N(bx + bw / 2)}" y="${N(by + 5)}" text-anchor="middle" font-family="Georgia, serif" font-size="9.5" font-weight="700" fill="#fff4d6" stroke="#3a2410" stroke-width="2.2" paint-order="stroke">${_gloEsc(label)}</text>${L.mine ? `<circle cx="${N(bx + bw - 3)}" cy="${N(by - 6)}" r="3.2" fill="#f2b01e" stroke="#a06c0c" stroke-width=".8"/>` : ''}</g>`;
    out.push({ z: L.y + L.h + 0.02, x: L.x, html: `<g class="gd-it gd-prop glo-lot" data-prop="${id}-front-${_gloEsc(label).length}${L.mine ? 'm' : ''}" data-z="${L.y + L.h}" pointer-events="none">${front}</g>` });
  }
  return out;
}

/* ---------- a hold that never resolved ---------- */
setTimeout(function _gloBoot() {
  try {
    if (typeof gardenReady !== 'function' || !gardenReady() || !state.garden || !state.garden.since) { setTimeout(_gloBoot, 30000); return; }
    const old = _gloOpenHolds('').filter(([, h]) => h.at && _gdNow() - h.at > 3 * 86400000)[0];
    if (!old) return;
    const [k, h] = old;
    gardenToast(`You asked ${_gscFirst(h.to)} for a plot and never heard back. Your ${-(h.c0 || 0)} coins are still waiting. If they are only away, it will sort itself out when you next visit. If not, you can take them back.`, { icon: 'fence', timeout: 20000, action: { label: 'Take them back', run: () => { const G = _gdG(), r = G.led[k]; if (r && !r.ok) { delete G.led[k]; _gscSaveGarden(); gardenToast('Your coins are back.', { icon: 'undo-2', kind: 'ok' }); } } } });
  } catch (e) { /* the next start */ }
}, 16000);
