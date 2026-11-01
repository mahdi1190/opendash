/* ============================================================
   GARDEN WONDER, things buried (docs/dev/HUNDRED_WORLD.md, rows 6 and 7). No cross on the map: a clue in words, and the real place. Nothing shows until you stand on it, and then only a glint.
   WD_FINDS: id, name, x, y, r (how near, cells), when(m) (an hour, the weather), clue (the words, kept on the Found page while you look), by: 'w' (the last gardener: set going by her letters) or 'map' (Bramble gives them out), story (what it is), art.
   Saved: fa.<id> (looking for it, since this day), ff.<id> (found). A find pays once, by id, in the ledger (wdf.<id>): a small thing, never a farm.
   ============================================================ */
const WD_THINGS = Object.freeze({
  tin() { const A = GART; return A.P('#2f5a6a', A.rrect(-16, -16, 32, 18, 2)) + A.P('#3f7486', A.rrect(-17, -19, 34, 5, 1.6)) + A.P('#e6dcc0', A.rect(-9, -12, 18, 8)) + A.S('#8a7a5a', 0.7, 'M-6 -9.6h12M-6 -6.8h9'); },
  glasses() { const A = GART; return A.S('#7a5a38', 1.8, 'M-14 -8a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M2 -8a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M-2 -9q2 -2 4 0M-14 -9L-20 -13') + A.S('#a0a4a8', 1.2, 'M14 -9L20 -13') + A.P('#d8eef4', A.circ(-8, -8, 4.6) + A.circ(8, -8, 4.6), 0.5); },
  boat() { const A = GART; return A.P('#b8623a', 'M-18 -6L18 -6L12 2L-12 2z') + A.P('#f2e4c8', 'M-1 -7L-1 -25L13 -8z') + A.S('#6e4024', 1.2, 'M-1 -6L-1 -26') + A.P('#f4ead8', A.rect(-10, -4.4, 12, 2.4)); },
  page() { const A = GART; return A.P('#f0e6cc', 'M-13 -24L12 -22L14 2L-12 0z') + A.S('#8a7a5a', 0.7, 'M-8 -18L8 -17M-8 -14L9 -13M-8 -10L7 -9M-9 -6L5 -5') + A.P('#e0d4b4', 'M12 -22L14 -14L8 -15z'); },
  photo() { const A = GART; return A.P('#6e4a2a', A.rrect(-16, -24, 32, 26, 1.6)) + A.P('#e6d8b8', A.rect(-13, -21, 26, 20)) + A.P('#8a9a72', A.rect(-13, -9, 26, 8)) + A.P('#5a4a3a', A.ell(-4, -12, 3, 6) + A.circ(-4, -19, 2.6) + A.ell(5, -9, 2, 4) + A.circ(5, -14, 2)); },
  whistle() { const A = GART; return A.P('#c8b488', A.rrect(-16, -10, 32, 7, 3.4)) + A.P('#3a2a1c', A.ell(-6, -6.6, 2, 1.6)) + A.S('#8a7448', 0.8, 'M6 -9v5M10 -9v5M-13 -8.6q1 -1.2 3 -1.2'); },
  acorn() { const A = GART; return A.P('#b08a4a', A.ell(0, -8, 7, 9)) + A.P('#6e5030', 'M-8 -14Q0 -22 8 -14Q0 -11 -8 -14z'); },
  coin() { const A = GART; return A.P('#d8b24a', A.circ(0, -9, 9)) + A.S('#a4822c', 1, 'M0 -9m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0') + A.P('#a4822c', A.rect(-1, -12.6, 2, 7.2)); },
  marble() { const A = GART; return A.P('#4a8ac0', A.circ(0, -8, 8)) + A.P('#ffffff', A.ell(-3, -11, 2.4, 1.8), 0.7) + A.S('#e8506e', 1.4, 'M-5 -5Q0 -11 5 -6'); },
  key() { const A = GART; return A.S('#8e8a7a', 2.6, 'M-14 -9a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M-5 -9L14 -9M10 -9L10 -5M14 -9L14 -4'); },
  bone() { const A = GART; return A.P('#e8e0cc', A.rrect(-11, -12, 22, 5, 2.4) + A.circ(-12, -13, 3) + A.circ(-12, -7, 3) + A.circ(12, -13, 3) + A.circ(12, -7, 3)); },
});
const WD_FINDS = Object.freeze([   // world cells: from the props and the island, so a clue stays true if the map moves
  { id: 'tin', by: 'w', name: 'A seed tin', ..._wdPt('notice-board', -0.1, 0), r: 1.2, art: 'tin', clue: 'Under the step by the notice board. “Nobody looks down.”', story: ['Inside, labels in careful pencil. RUNNER BEANS, DAD’S. SWEET PEAS, DO NOT LET T. PICK THEM.', 'One says only: NOT THIS YEAR.'] },
  { id: 'glasses', by: 'w', name: 'Reading glasses', x: WD_AT.seat.x, y: WD_AT.seat.y - 0.2, r: 1.1, art: 'glasses', clue: 'On the stone seat on the island. The stones come up at dawn and at dusk.', story: ['Round glasses, with one arm mended with garden wire.', 'You look through them at the far shore. It looks exactly the same.'] },
  { id: 'boat', by: 'w', name: 'A little boat', ..._wdPt('reed-bank', -0.3, 0.2), r: 1.3, art: 'boat', when: m => !!(m.rain.now || (m.rain.last && m.now - m.rain.last < 12 * 3600000)), clue: 'In the reeds, after rain. Things come ashore there.', story: ['A wooden boat the length of your hand. It has been at sea for a very long time, for a boat this size.', 'There is a name on it, in a seven-year-old’s letters: THE BIG BOAT.'] },
  { id: 'page', by: 'w', name: 'A page of a diary', ..._wdPt('sundial', 0, 0), r: 1.2, art: 'page', when: () => { const p = Clock.parts(_gdNow()); return p.h === 11 && p.mi >= 30 || p.h === 12 && p.mi <= 30; }, clue: 'Under the sundial, read at noon. Half an hour either side will do.', story: ['“T. leaves on Thursday. He says he will write.', 'I have planted the pear anyway.”'] },
  { id: 'photo', by: 'w', name: 'The photograph', mice: 1, art: 'photo', clue: 'Ask the mice. There is a door at the foot of your oldest tree, and you will see it at dusk.', story: ['A woman and a small boy on a lawn, both squinting. You know the oak behind them.', 'You leave it where it is. It looks right there.'] },
  { id: 'whistle', by: 'w', name: 'An elder whistle', ..._wdPt('sundial', 1, -0.1), r: 1.2, art: 'whistle', clue: 'On the last post of the shore, past the sundial, where the trees start.', story: ['Grey and dry, and light as nothing.', 'You blow it. It still works. Somewhere in the woods, something stops what it is doing.'] },
  { id: 'map-acorn', by: 'map', name: 'A stone acorn', ..._wdPt('camera-tripod', 0, 0.1), r: 1.1, art: 'acorn', clue: 'Bramble’s map says: “Stand where the camera is looking from, and look down. Whoever drew this was short.”', story: ['A small acorn, carved from stone by somebody with a lot of time.'], pay: { c: 6, x: 3 } },
  { id: 'map-coin', by: 'map', name: 'An old coin', ..._wdPt('pier', 0, 1.9), r: 1, art: 'coin', clue: 'Bramble’s map says: “The end of the old pier, before anyone built any more of it. Between the planks.”', story: ['Worn too smooth to read. Somebody dropped it and said a word, you’d think, and went on fishing.'], pay: { c: 12, x: 3 } },
  { id: 'map-marble', by: 'map', name: 'A glass marble', ..._wdPt('market-stall', 0.5, 0.1), r: 1.1, art: 'marble', clue: 'Bramble’s map says: “Past the market, at the west end of the shops, where it gives up.”', story: ['It has a small red twist in it. You look through it, and for a moment everything is upside down and very clear.'], pay: { c: 6, x: 3, fert: 1 } },
  { id: 'map-key', by: 'map', name: 'A tiny key', x: WD_AT.isle.cx + 2.3, y: WD_AT.isle.cy - 0.6, r: 1.1, art: 'key', clue: 'Bramble’s map says: “The far side of the island. I have marked it, but I have never been. I get seasick on stones.”', story: ['Too small for anything you own. You keep it anyway. Everyone would.'], pay: { c: 10, x: 4 } },
  { id: 'map-bone', by: 'map', name: 'Something’s bone', ..._wdPt('garden-shop', 0.5, -3), r: 1.1, when: m => m.tod === 'night', clue: 'Bramble’s map says: “Middle of the lawn, under the shop’s back wall. Only shows at night. I don’t make the rules, I only write them down.”', story: ['You are not going to think about what it was.', 'Your pet has opinions about it.'], pay: { c: 8, x: 3 } },
]);
const WD_FIND_ROW = new Map(WD_FINDS.map(r => [r.id, r]));
const _wdq = { glint: null, row: null };
function wdFindSvg(r, px) { const d = WD_THINGS[r.art]; return `<svg viewBox="-24 -30 48 36" width="${px || 96}" height="${(px || 96) * 0.75}" aria-hidden="true">${d ? d() : ''}</svg>`; }
function wdFindNow(r) {
  const W = _wdG(), today = _wdToday();
  if (W['ff.' + r.id]) return false;
  W['ff.' + r.id] = today;
  if (!W['fa.' + r.id]) W['fa.' + r.id] = today;
  const g = _gdG();
  if (r.pay && !g.led['wdf.' + r.id]) g.led['wdf.' + r.id] = { d: today, k: 'wd', c: r.pay.c || 0, x: r.pay.x || 0, n: 1, ...(r.pay.fert ? { i: { fertiliser: r.pay.fert } } : {}) };
  _gdSave();
  _wdTrunkSync();
  return true;
}
function _wdFindCard(r) {
  if (wdFindNow(r)) { _glSound('twinkle'); if (typeof _gw !== 'undefined') _glFx(_gw.px, _gw.py, 'sparkle', { lift: 20 }); }
  wdPage({ title: r.name, art: wdFindSvg(r, 128), text: r.story, foot: r.pay ? `It is in your keepsakes${r.pay.c ? `, and you turned up ${r.pay.c} coins beside it` : ''}.` : 'It is in your keepsakes.' });
}
function _wdFindGlintOff() { if (_wdq.glint) { _wdq.glint.remove(); _wdq.glint = null; _wdq.row = null; } }
/** Bramble hands out a map when she has one you can reach. */
function wdFolkExtra(row, F) {
  const out = { lines: [], actions: [] }, W = _wdG();
  if (row.id === 'bramble' && F.talks >= 0) {
    const open = WD_FINDS.filter(r => r.by === 'map' && W['fa.' + r.id] && !W['ff.' + r.id]);
    if (!open.length) {
      const next = WD_FINDS.find(r => r.by === 'map' && !W['fa.' + r.id] && (r.id === 'map-key' ? !!W.isle : true));
      if (next) { W['fa.' + next.id] = _wdToday(); out.lines.push(`I found this corner of an old map in a drain. It’s no use to me, I only draw them. ${next.clue.replace(/^Bramble’s map says: /, 'It says: ')}`, 'I’ve left it on your Found page. Keepsakes, in the menu.'); }
    } else out.lines.push('You haven’t dug that last one up yet. I can wait. I’m drawing anyway.');
  }
  if (row.id === 'wick' && typeof gardenWonderLookUp === 'function') out.actions.push({ label: 'Show me the stars', primary: true, run: () => { wdTalkClose(true); gardenWonderLookUp(); } });
  return out;
}
/* ---------- the trunk: what you have found shows in the world ---------- */
function _wdTrunkSvg(n) {
  const A = GART;
  let s = A.P('#000000', A.ell(0, 0.5, 15, 3), 0.16) + A.P('#6e4a2a', A.rrect(-14, -14, 28, 14, 1.8)) + A.S('#3f2a16', 1, 'M-14 -7h28M-7 -14v14M7 -14v14') + A.P('#8a6238', 'M-15 -14C-15 -24 15 -24 15 -14z') + A.P('#3f2a16', 'M-15 -14C-15 -24 -11 -22 -8 -18L8 -18C11 -22 15 -24 15 -14z', 0.25);
  if (n >= 1) s += `<g transform="translate(-8 -16) scale(0.32)">${WD_THINGS.tin()}</g>`;
  if (n >= 3) s += `<g transform="translate(1 -16.5) scale(0.3)">${WD_THINGS.boat()}</g>`;
  if (n >= 6) s += `<g transform="translate(9 -15.5) scale(0.28)">${WD_THINGS.marble()}</g>`;
  return s;
}
function _wdTrunkSync() {
  if (!_wd.on) return;
  const m = gardenHere(), n = m.visit ? Number(_wdTheir(m).f) || 0 : Object.keys(_wdG()).filter(k => k.startsWith('ff.')).length;
  if (!n) { if (_wdq.trunk) { _wdq.trunk.remove(); _wdq.trunk = null; } return; }
  if (!_wdq.trunk) _wdq.trunk = wdSprite({ id: 'wd-trunk', x: WD_AT.trunk.x, y: WD_AT.trunk.y, still: true, hit: 0.6, hitUp: 10, label: m.visit ? 'What they have dug up' : 'Your keepsakes', cursor: 'hand', svg: _wdTrunkSvg(n), onClick: () => { if (gardenHere().visit) { wdWhisper(`${_wdPlural(n, 'thing')} dug up so far, and the lid will not stay shut.`); return; } _wdb.tab = 'found'; gardenPopupOpen('wonder'); } });
  else wdArt(_wdq.trunk, _wdTrunkSvg(n));
}
wdMod({
  id: 'finds', visit: true,
  begin() { _wdq.glint = null; _wdq.row = null; _wdq.trunk = null; _wdTrunkSync(); },
  tick(m) {
    if (m.visit) return;
    const W = _wdG();
    if (_wdq.row && (!wdNear(_wdq.row.x, _wdq.row.y, _wdq.row.r + 0.6) || W['ff.' + _wdq.row.id])) _wdFindGlintOff();
    if (_wdq.glint) return;
    for (const r of WD_FINDS) {
      if (r.mice || !W['fa.' + r.id] || W['ff.' + r.id] || !wdNear(r.x, r.y, r.r) || (r.when && !r.when(m))) continue;
      _wdq.row = r;
      _wdq.glint = wdSprite({ id: 'wd-glint', x: r.x, y: r.y, z: r.y + 0.02, hit: 0.9, hitUp: 6, label: 'Something is here', cursor: 'hand',
        svg: '<g class="gl-twinkle"><path d="M0 -12L2.2 -5L9 -3L2.2 -1L0 6L-2.2 -1L-9 -3L-2.2 -5z" fill="#fff4b8" stroke="#c8983a" stroke-width="0.6"/></g><ellipse cy="1" rx="10" ry="3" fill="#6a4a2a" opacity="0.28"/>',
        still: true, onClick: () => { const f = _wdq.row; _wdFindGlintOff(); if (f) _wdFindCard(f); } });
      _glSound('twinkle');
      break;
    }
  },
  end() { _wdq.glint = null; _wdq.row = null; _wdq.trunk = null; },
});
/* ---------- the Found page ---------- */
function wdBoxFound(el) {
  const W = _wdG(), looking = WD_FINDS.filter(r => W['fa.' + r.id] && !W['ff.' + r.id]), got = WD_FINDS.filter(r => W['ff.' + r.id]);
  if (looking.length) {
    el.appendChild(_gdpEl('h4', 'wd-box-h', 'Still looking'));
    for (const r of looking) { const d = _gdpEl('div', 'wd-clue'); d.innerHTML = `<span class="wd-env" aria-hidden="true">${icon('search')}</span>`; d.appendChild(_gdpEl('span', null, r.clue)); el.appendChild(d); }
  }
  if (!got.length && !looking.length) { el.appendChild(_gdpEl('p', 'muted wd-box-empty', 'Nothing yet. Somebody might write to you about what is buried here.')); return; }
  if (got.length) {
    el.appendChild(_gdpEl('h4', 'wd-box-h', 'Dug up, and kept'));
    const grid = _gdpEl('div', 'gd-grid gd-alm-grid');
    for (const r of got) {
      const c = _gdpEl('button', 'gd-almcard'); c.type = 'button';
      const a = _gdpEl('div', 'gd-card-art'); a.innerHTML = wdFindSvg(r, 72); c.appendChild(a);
      c.appendChild(_gdpEl('b', null, r.name)); c.appendChild(_gdpEl('small', 'muted', String(W['ff.' + r.id])));
      c.onclick = () => wdPage({ title: r.name, art: wdFindSvg(r, 128), text: r.story, foot: 'Found ' + W['ff.' + r.id] });
      grid.appendChild(c);
    }
    el.appendChild(grid);
  }
}
