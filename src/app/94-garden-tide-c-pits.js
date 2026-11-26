/* ============================================================
   PEBBLE PITS (FUN-ROADMAP phase 2, theme G). The old sowing game: twelve pits scratched in any bare ground (grass, earth or sand),
   three pebbles in each, a store at each end. Take every pebble from one of your pits and sow them one by one round the board, the
   way the sun goes; your last one in your store, and you go again; your last one in an empty pit on your side, and you take it and
   whatever is in the pit across from it. When one side runs out, the rest go to whoever's side they are on; most pebbles wins.
   Two to four minutes. The pebbles are your own: sea glass, banded and green and holed pebbles from the shore (94-garden-tide-0rules.js),
   so the board looks different every time you have found something new.
   The vale's folk play you: one stops as they pass you on bare ground ("Fancy a quick one?"), or ask anyone you talk to. Each has
   their way (Tam rushes, Bramble thinks, Pip likes another go, Wick looks ahead, Quince and Mother Thistle are kind about it).
   You kneel and scratch the board in front of you, and the game itself is on the card.
   Rewards: a win, a shore pebble for your pockets, and the first win of the day 10 coins; the first win against each villager goes in
   the journal; beat all six and a carved pebble pits board is yours to stand in your garden. Saved: g.disc['td.pits.<villager>'],
   g.wd['tpc.<villager>'] the day they last asked, g.wd.tpw wins.
   ============================================================ */
const GT_PITS = Object.freeze({ seeds: 3, coins: 10, board: 'pits-board', near: 3.4 });
const GT_PITS_WAY = Object.freeze({ tam: { rush: .4, look: 0 }, bramble: { rush: 0, look: .8 }, pip: { rush: .1, look: .3, again: 1.5 }, wick: { rush: 0, look: 1 }, quince: { rush: .15, look: .4, kind: .2 }, thistle: { rush: .1, look: .3, kind: .3 } });
const GT_PITS_SAY = Object.freeze({
  hello: { tam: 'Tam: “A game? Go on, then. I play fast. It is the only way I know.”', bramble: 'Bramble: “Pebble pits. I keep a chart of every game. You will be on it.”', pip: 'Pip: “Yes! I love this one. I nearly always nearly win.”', wick: 'Wick: “I see four moves ahead. Sometimes five. Shall we?”', quince: 'Quince: “Oh, lovely. I will try to be gentle. I am not very good at it.”', thistle: 'Mother Thistle: “Sit down, dear. My knees will thank you for it.”' },
  win: { tam: '“Hm. You dug that one well.”', bramble: '“I will be putting that game on the chart. In red.”', pip: '“Again! No, wait, you won. Well done! Again?”', wick: '“I saw that coming. I simply did not stop it.”', quince: '“Oh, well played! The bees will hear about this.”', thistle: '“There. I knew you had it in you.”' },
  lose: { tam: '“Fast is best. I did say.”', bramble: '“Chart says me. Chart is never wrong.”', pip: '“I won? I WON. Sorry. Again?”', wick: '“Five moves ahead. As I said.”', quince: '“Oh dear, I won. I did try not to.”', thistle: '“Never mind, dear. You were very close.”' },
});
const _gtp2 = { game: null, ask: null, askAt: 0, still: 0, lastP: null, board: null };

/* ---------- the rules (pure) ---------- */
/** A new board: [your six pits, your store, their six pits (from your right round to your left), their store]. */
function gardenPitsNew(n) { const b = new Array(14).fill(n || GT_PITS.seeds); b[6] = 0; b[13] = 0; return b; }
/** Sow from pit i for side s (0 you, 1 them). Returns {b, last, again, took, path} (a new board; path: each pit a pebble went into). */
function gardenPitsSow(b0, i, s) {
  const b = b0.slice(), own = s === 0 ? 6 : 13, skip = s === 0 ? 13 : 6, path = [];
  let n = b[i]; b[i] = 0; let at = i;
  while (n > 0) { at = (at + 1) % 14; if (at === skip) continue; b[at]++; n--; path.push(at); }
  let took = 0;
  const mine = s === 0 ? at >= 0 && at <= 5 : at >= 7 && at <= 12;
  if (mine && b[at] === 1 && b[12 - at] > 0) { took = b[12 - at] + 1; b[own] += took; b[12 - at] = 0; b[at] = 0; }
  return { b, last: at, again: at === own, took, path };
}
function gardenPitsOver(b) { const a = b.slice(0, 6).every(v => !v), c = b.slice(7, 13).every(v => !v); return a || c; }
function gardenPitsFinish(b0) { const b = b0.slice(); for (let i = 0; i < 6; i++) { b[6] += b[i]; b[i] = 0; } for (let i = 7; i < 13; i++) { b[13] += b[i]; b[i] = 0; } return b; }
function gardenPitsMoves(b, s) { const out = []; for (let i = s === 0 ? 0 : 7, e = s === 0 ? 6 : 13; i < e; i++) if (b[i] > 0) out.push(i); return out; }
/** A villager's move: each their own way (rushing, looking ahead, liking another go, being kind about it). */
function gardenPitsAi(b, who, rnd) {
  const way = GT_PITS_WAY[who] || { rush: .2, look: .4 }, moves = gardenPitsMoves(b, 1); if (!moves.length) return -1;
  if (rnd() < way.rush) return moves[Math.floor(rnd() * moves.length)];
  const score = (m) => {
    const r = gardenPitsSow(b, m, 1); let v = (r.b[13] - b[13]) + (r.again ? (way.again || 1.2) : 0) + r.took * .3;
    if (way.look > 0 && !r.again && !gardenPitsOver(r.b)) { let worst = 0; for (const q of gardenPitsMoves(r.b, 0)) { const o = gardenPitsSow(r.b, q, 0); worst = Math.max(worst, (o.b[6] - r.b[6]) + (o.again ? 1 : 0)); } v -= worst * way.look; }
    return v;
  };
  const ranked = moves.map(m => ({ m, v: score(m) + rnd() * .2 })).sort((a, c) => c.v - a.v);
  if (way.kind && ranked.length > 1 && rnd() < way.kind) return ranked[1].m;
  return ranked[0].m;
}

/* ---------- the pebbles: from your pockets ---------- */
function _gtp2Colours() {
  const out = []; let items = {}; try { items = gardenWallet().items || {}; } catch (e) { items = {}; }
  for (const f of GARDEN_SHORE_FINDS) if ((f.what === 'stone' || f.what === 'glass') && items['sh:' + f.id] > 0) out.push([f.look.c, f.look.c2, f.what === 'glass', !!f.look.band]);
  const plain = [['#9a968c', '#c8c4b8', false, false], ['#8a7a68', '#b8a890', false, false], ['#a8a49a', '#e0dcd0', false, false]];
  return out.length ? out.concat(plain.slice(0, Math.max(1, 3 - out.length))) : plain;
}
function _gtp2Pebble(cols, k) { const c = cols[k % cols.length], r = 4.4 + (k * 7 % 5) * .25; return `<span class="gtp-peb${c[2] ? ' is-glass' : ''}" style="--pc:${c[0]};--pc2:${c[1]};--pr:${r}px${c[3] ? ';--band:1' : ''}"></span>`; }

/* ---------- playing ---------- */
/** Start a game with one of the folk (who), on the card; you kneel at a board scratched in front of you if you stand on bare ground. */
function gardenPitsPlay(who) {
  if (!GT_PITS_WAY[who] || typeof gpStage !== 'function') return false;
  const G = _gtp2.game = { who, b: gardenPitsNew(), turn: 0, busy: false, over: false, rnd: gardenRand(gardenHash('tide-pits|' + who + '|' + Date.now())), cols: _gtp2Colours(), sel: 0, hi: -1, msg: GT_PITS_SAY.hello[who] || '' };   // clock-ok: luck
  if (typeof _gw !== 'undefined' && _gw.on && _gtp2Bare(_gw.px, _gw.py)) { try { _gtp2.board = { x: _gw.px, y: _gw.py + .55 }; if (typeof gartActRun === 'function') gartActRun('pits', { key: 'tide:pits', act: 'pits', name: 'pebble pits', x: _gw.px, y: _gw.py + .55, stand: { x: _gw.px, y: _gw.py }, noProp: true }); } catch (e) { /* the card is enough */ } }
  gpStage('Pebble pits with ' + gardenShoreFolkName(who), (el) => { G.el = el; el.classList.add('gtp-panel'); _gtp2Draw(G); }, { onClose: () => { if (_gtp2.game === G) _gtp2.game = null; _gtp2.board = null; try { if (typeof _ga !== 'undefined' && _ga.cur && _ga.cur.id === 'pits') gartActStop(true); } catch (e) { /* fine */ } } });
  return true;
}
function _gtp2Draw(G) {
  const el = G.el; if (!el || (G.drawn && !el.isConnected)) return;   // (the first drawing is into the card as it is made, before it is on the page)
  G.drawn = true;
  el.textContent = '';
  const name = gardenShoreFolkName(G.who);
  el.appendChild(gpEl('p', 'gtp-say', G.msg || (G.turn === 0 ? 'Your turn: pick one of your pits.' : name + ' is thinking…')));
  const board = gpEl('div', 'gtp-board'); board.setAttribute('role', 'group'); board.setAttribute('aria-label', 'The pebble pits board');
  const store = (i, label) => { const d = gpEl('div', 'gtp-store' + (G.hi === i ? ' is-hi' : '')); d.setAttribute('aria-label', label + ': ' + G.b[i] + ' pebbles'); d.innerHTML = `<span class="gtp-pebs">${Array.from({ length: Math.min(G.b[i], 36) }, (_, k) => _gtp2Pebble(G.cols, i * 5 + k)).join('')}</span><b>${G.b[i]}</b><small>${esc(label)}</small>`; return d; };
  board.appendChild(store(13, name));
  const mid = gpEl('div', 'gtp-rows');
  const top = gpEl('div', 'gtp-row is-them'), bot = gpEl('div', 'gtp-row is-you');
  for (let i = 12; i >= 7; i--) { const p = gpEl('div', 'gtp-pit' + (G.hi === i ? ' is-hi' : '')); p.setAttribute('aria-label', name + '’s pit: ' + G.b[i]); p.innerHTML = `<span class="gtp-pebs">${Array.from({ length: Math.min(G.b[i], 24) }, (_, k) => _gtp2Pebble(G.cols, i * 3 + k)).join('')}</span><b>${G.b[i]}</b>`; top.appendChild(p); }
  for (let i = 0; i <= 5; i++) {
    const p = gpEl('button', 'gtp-pit is-mine' + (G.hi === i ? ' is-hi' : '')); p.type = 'button'; p.disabled = G.turn !== 0 || G.busy || G.over || !G.b[i];
    p.setAttribute('aria-label', 'Your pit ' + (i + 1) + ': ' + G.b[i] + ' pebbles' + (G.b[i] ? '. Sow them.' : ''));
    p.innerHTML = `<span class="gtp-pebs">${Array.from({ length: Math.min(G.b[i], 24) }, (_, k) => _gtp2Pebble(G.cols, i * 3 + k)).join('')}</span><b>${G.b[i]}</b>`;
    p.onclick = () => _gtp2Move(G, i, 0);
    bot.appendChild(p);
  }
  mid.append(top, bot); board.appendChild(mid); board.appendChild(store(6, 'You'));
  el.appendChild(board);
  el.appendChild(gpEl('p', 'muted gtp-how', G.over ? '' : 'Sow round the way the sun goes. Last pebble in your store: go again. Last pebble in an empty pit of yours: take it and the pit across.'));
  if (G.over) { const again = uiButton({ label: 'Another game', icon: 'refresh-cw', kind: 'primary', run: () => { const w = G.who; try { el.closest('[role=dialog]')?.querySelector('.dlg-close, [aria-label="Close"]')?.click(); } catch (e) { /* fine */ } setTimeout(() => gardenPitsPlay(w), 60); } }); el.appendChild(again); }
  else if (G.turn === 0 && !G.busy) { const first = el.querySelector('.gtp-pit.is-mine:not([disabled])'); if (first && !el.contains(document.activeElement)) try { first.focus({ preventScroll: true }); } catch (e) { /* fine */ } }
}
/** One move: the pebbles go round one at a time (quickly), then the next turn. */
function _gtp2Move(G, i, s) {
  if (G.busy || G.over || G.turn !== s || !G.b[i]) return;
  G.busy = true; G.msg = s === 0 ? 'Sowing…' : gardenShoreFolkName(G.who) + ' sows.';
  const r = gardenPitsSow(G.b, i, s), motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(), step = motion ? 150 : 0;
  const b = G.b.slice(); let n = b[i]; b[i] = 0; let k = 0;
  const one = () => {
    if (_gtp2.game !== G) return;
    if (k < r.path.length && step) { b[r.path[k]]++; n--; G.b = b.slice(); G.hi = r.path[k]; k++; _gtp2Draw(G); try { gpTone([660 + (k % 5) * 40], { len: .08, vol: .03 }); } catch (e) { /* quiet */ } setTimeout(one, step); return; }
    void n;
    G.b = r.b; G.hi = -1; G.busy = false;
    if (gardenPitsOver(G.b)) { G.b = gardenPitsFinish(G.b); G.over = true; _gtp2End(G); return; }
    if (r.took) G.msg = s === 0 ? `You take ${r.took}!` : `${gardenShoreFolkName(G.who)} takes ${r.took}.`;
    else if (r.again) G.msg = s === 0 ? 'In your store: go again!' : `${gardenShoreFolkName(G.who)} goes again.`;
    else G.msg = '';
    G.turn = r.again ? s : 1 - s;
    _gtp2Draw(G);
    if (G.turn === 1) setTimeout(() => { if (_gtp2.game !== G || G.over) return; const m = gardenPitsAi(G.b, G.who, G.rnd); if (m >= 0) _gtp2Move(G, m, 1); }, motion ? 800 : 200);
  };
  one();
}
function _gtp2End(G) {
  const me = G.b[6], them = G.b[13], won = me > them, draw = me === them, name = gardenShoreFolkName(G.who), g = _gdG();
  let gift = null;
  if (won) {
    const r = G.rnd(), peb = r < .15 ? 'pebble-holed' : r < .5 ? 'pebble-green' : 'pebble-banded';
    gift = { x: 3, i: { ['sh:' + peb]: 1 } };
    if (!g.led['tpw.' + _gdToday()]) gift.c = GT_PITS.coins;
    const first = !g.disc['td.pits.' + G.who]; if (first) g.disc['td.pits.' + G.who] = _gdToday();
    g.wd.tpw = (Number(g.wd.tpw) || 0) + 1; _wdSave();
    const beatAll = Object.keys(GT_PITS_WAY).every(w => g.disc['td.pits.' + w]);
    if (beatAll && !g.led['tpw.board']) { gardenShoreGive('tpw.board', { i: { ['decor:' + GT_PITS.board]: 1 }, x: 3 }); setTimeout(() => { try { gardenToast('You have beaten everyone at pebble pits! A carved pebble pits board for your garden.', { icon: 'trophy', timeout: 7000 }); } catch (e) { /* fine */ } }, 1500); }
    gardenShoreGive(g.led['tpw.' + _gdToday()] ? 'tpw.' + _gdToday() + '.' + g.wd.tpw : 'tpw.' + _gdToday(), gift);
    if (first) _gdSave();
  } else gardenShoreGive('tpl.' + _gdToday() + '.' + G.who, { x: 2 });
  G.msg = `${draw ? 'A draw' : won ? 'You win' : name + ' wins'}, ${me} to ${them}. ${name} says: ${(won ? GT_PITS_SAY.win : GT_PITS_SAY.lose)[G.who] || '“Good game.”'}${gift ? ' (' + gardenShoreGiftWords(gift).replace(/^./, c => c.toUpperCase()) + '.)' : ''}`;
  _gtp2Draw(G);
  try { gpTone(won ? [523, 659, 784] : [392, 330], { len: .25 }); } catch (e) { /* quiet */ }
  gardenShoreEmit('pits', { won, draw, who: G.who });
}

/* ---------- where: any bare ground, with one of the folk passing ---------- */
function _gtp2Bare(x, y) { try { const t = typeof gardenTerrainAt === 'function' ? gardenTerrainAt(x, y) : ''; return t === 'open-grass' || t === 'sand' || t === 'ground' || t === 'snow'; } catch (e) { return false; } }
function gardenPitsRows(px, py) {
  if (gardenShoreVisit() || _gtp2.game) return [];
  const V = gardenShoreFolkNear(px, py, GT_PITS.near); if (!V || !GT_PITS_WAY[V.id] || !_gtp2Bare(px, py)) return [];
  const asked = _gtp2.ask && _gtp2.ask.id === V.id && performance.now() - _gtp2.askAt < 45000;
  return [{ key: 'tide:pits:' + V.id, act: 'pits', tide: { kind: 'pits', who: V.id }, words: `Play pebble pits with ${V.name}`, name: 'pebble pits', x: px, y: py, stand: null, pri: asked ? .8 : -.4 }];
}
/** Once a day each, a villager passing you while you stand on bare ground asks for a game. */
function _gtp2Tick() {
  if (gardenShoreVisit() || _gtp2.game || typeof _gw === 'undefined' || !_gw.on) return;
  const P = { x: _gw.px, y: _gw.py }, last = _gtp2.lastP; _gtp2.lastP = P;
  if (!last || Math.hypot(P.x - last.x, P.y - last.y) > .05) { _gtp2.still = 0; return; }
  if (++_gtp2.still < 3 || !_gtp2Bare(P.x, P.y)) return;
  const V = gardenShoreFolkNear(P.x, P.y, 3); if (!V || !GT_PITS_WAY[V.id]) return;
  const W = _gdG().wd, today = _gdToday(); if (W['tpc.' + V.id] === today || (typeof _wd !== 'undefined' && _wd.talk)) return;
  W['tpc.' + V.id] = today; _wdSave();
  _gtp2.ask = V; _gtp2.askAt = performance.now();
  gardenShoreSay(`${V.name} stops beside you. “Fancy a quick game of pebble pits?”`, 'gamepad-2', 7000);
}
GT_ROW_SOURCES.push((px, py) => gardenPitsRows(px, py));
GT_RUN.pits = (spot) => gardenPitsPlay(spot.tide.who);
gardenShoreFolkOn((row) => (GT_PITS_WAY[row.id] && !gardenShoreVisit() ? { actions: [{ label: 'A game of pebble pits?', run: () => { try { wdTalkClose(true); } catch (e) { /* fine */ } setTimeout(() => gardenPitsPlay(row.id), 120); } }] } : null));
if (typeof gardenPlayAdd === 'function') gardenPlayAdd({ id: 'tide-pits', name: 'Pebble pits', icon: 'gamepad-2', group: 'games', blurb: 'The old sowing game, against one of the folk, with pebbles from your own pockets.', status: () => { try { const n = Object.keys(GT_PITS_WAY).filter(w => _gdG().disc['td.pits.' + w]).length; return n ? `Beaten ${n} of 6` : ''; } catch (e) { return ''; } }, open: () => gardenPitsPlay(GT_SHORE_FOLK[gardenHash('tide-pits-who|' + _gdToday()) % GT_SHORE_FOLK.length]) });

/* ---------- drawn: twelve pits scratched in the ground in front of you, while you play ---------- */
function _gtp2Paint(B) {
  const pit = (x, y) => { B.f(B.ell(x, y + .6, 5.2, 2.6), '#3a3020', .28).f(B.ell(x, y, 4.6, 2.2), '#5a4a32', .32).s(`M${x - 4.4} ${y + .9}Q${x} ${y + 2.8} ${x + 4.4} ${y + .9}`, '#e8dcc0', .6, .45); };
  B.f(B.ell(0, 0, 40, 10), '#4a3e2a', .1);
  for (let i = 0; i < 6; i++) { pit(-25 + i * 10, -3.6); pit(-25 + i * 10, 3.6); }
  for (const x of [-36, 36]) { B.f(B.ell(x, 0, 5.4, 7), '#3a3020', .3).s(`M${x - 5} 2Q${x} 8 ${x + 5} 2`, '#e8dcc0', .6, .4); }
  const r = gardenRand(5), cols = ['#9a968c', '#7a9a84', '#c8925a', '#8ac4a0', '#a8a094'];
  for (let i = 0; i < 12; i++) for (let k = 0; k < 3; k++) { const x = -25 + (i % 6) * 10 + (r() - .5) * 4, y = (i < 6 ? -3.6 : 3.6) + (r() - .5) * 1.6; B.f(B.ell(x, y, 1.3, .9), cols[(i + k) % cols.length]).f(B.ell(x - .4, y - .3, .5, .3), '#ffffff', .5); }
  B.s('M30 9l12 -16', '#7a5a3a', 1.2);   // (the stick the pits were scratched with)
}
const GardenTidePitsSprite = {
  id: 'pits',
  paint(scene, root) { this.scene = scene; this.root = root; this.im = null; this.t = 0; },
  clear() { if (this.im) { try { this.im.destroy(); } catch (e) { /* gone */ } } this.im = null; this.scene = null; },
  tick(time) {
    const scene = this.scene; if (!scene || time - this.t < 300) return; this.t = time;
    const at = _gtp2.game ? _gtp2.board : null, W = GARDEN_WORLD;
    if (!at) { if (this.im) { this.im.destroy(); this.im = null; } _gtp2Tick(); return; }
    if (!this.im) { if (!gardenShoreBake(scene, 'gt-pits', [-44, -14, 46, 14], _gtp2Paint, 2.5)) return; this.im = gardenShoreImage(scene, this.root, 'gt-pits', [-44, -14, 46, 14], at.x * W.cellW, W.sky + at.y * W.cellH, 2.5).setDepth(-9345.13); if (this.root.sort) this.root.sort('depth'); }
  },
};
if (window.GardenPaintTide) GardenPaintTide.parts.push(GardenTidePitsSprite);
