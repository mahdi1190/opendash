/* ============================================================
   GARDEN WONDER, the mice (docs/dev/HUNDRED_WORLD.md, row 18). A tiny door at the foot of your oldest tree, only there at dusk and at night. You can look in. They have no idea. Their house is made of your garden: a drawing worked out from your save, and it changes with the season and the hour.
   Saved: mv (how many times you have looked), mg ({i, name, d}: what you last left on the step).
   ============================================================ */
const _wdm = { door: null, at: null };
const _WD_MICE_LINES = Object.freeze(['They have no idea you are there.', 'One of them looks up, listens for a moment, and goes back to what it was doing.', 'Someone has been told to wipe their feet, you can tell.', 'There is a very serious discussion going on about the soup.', 'The small one is supposed to be in bed.', 'They seem to be counting something, and they keep getting different answers.', 'It is warmer in there than you would think.', 'Somebody is humming. It stops when you lean closer.', 'One of them has your button. You weren’t using it.', 'Everything in there came from somewhere else, and it all looks as if it was always meant to be there.', 'You stay longer than you meant to.']);
function _wdMiceDoorAt(m) {
  let t = null;
  for (const p of m.plants) if (p.def.cat === 'tree' && p.stage >= 3 && (!t || p.planted < t.planted)) t = p;
  if (t) return { x: t.x + t.fp / 2 + 0.28, y: t.y + t.fp - 0.04, tree: t };
  return Object.assign({ tree: null }, WD_AT.miceBack);
}
function _wdMouse(x, y, s, o) {
  o = o || {}; const f = o.c || '#a8957e', A = GART;
  let g = A.S(A.dk(f, 0.15), 1.1, 'M-9 -2Q-17 -2 -19 -7') + A.P(f, A.ell(0, -5, 9.5, 6.4)) + A.P(f, A.ell(8.4, -8, 5, 4.4)) + A.P('#e8c8bc', A.circ(5.4, -12.4, 2.6) + A.circ(10, -12.2, 2.2)) + A.P(A.dk(f, 0.1), A.circ(5.4, -12.4, 1.6)) + A.P('#2a2018', A.circ(10, -8.6, 0.8)) + A.P('#e0a8a0', A.circ(13.2, -7.4, 0.9));
  if (o.apron) g += A.P(o.apron, 'M1 -9L6 -4L3 0L-3 0L-3 -7z');
  if (o.scarf) g += A.P(o.scarf, A.rrect(3, -6.6, 8, 2.2, 1));
  if (o.sleep) g = A.P(f, A.ell(0, -4, 10, 5)) + A.P(f, A.ell(8, -4, 4.4, 3.6)) + A.P('#e8c8bc', A.circ(6, -7.6, 2.2)) + A.S('#2a2018', 0.5, 'M9 -5h2');
  return `<g transform="translate(${x} ${y}) scale(${o.flip ? -s : s} ${s})">${g}</g>`;
}
function _wdMiceSvg(m) {
  const A = GART, W = _wdG(), g = _gdG(), F = wdFacts(m, ''), winter = m.season === 'winter', spring = m.season === 'spring', night = m.tod === 'night';
  const grown = (id) => !!g.disc[id] || m.plants.some(p => p.def.id === id);
  let rug = '#b4506a', most = new Map();
  for (const p of m.plants) if (p.def.cat === 'flower') most.set(p.def, (most.get(p.def) || 0) + 1);
  { let bn = 0; for (const [d, n] of most) if (n > bn && d.look && d.look.c) { bn = n; rug = d.look.c; } }
  const bag = _wdBagFor();
  let s = `<defs><radialGradient id="wd-mglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs><rect width="640" height="380" fill="#4a3424"/>`;
  for (let i = 0; i < 26; i++) s += `<ellipse cx="${gardenHash('e' + i) % 640}" cy="${gardenHash('f' + i) % 380}" rx="${3 + gardenHash('g' + i) % 9}" ry="${2 + gardenHash('h' + i) % 3}" fill="#3a281a" opacity="0.7"/>`;
  // the rooms
  s += `<path d="M24 352C12 250 40 196 150 192C270 188 310 240 306 352z" fill="#c8a678"/><path d="M322 352C316 250 352 198 462 196C588 196 628 262 616 352z" fill="#c4a07a"/><path d="M196 164C192 86 244 34 330 34C420 34 462 90 456 164C380 176 280 176 196 164z" fill="#d0ae82"/>`;
  s += `<path d="M280 180L280 208L306 208L306 186z" fill="#9c7c56"/>${A.S('#6e5030', 2.4, 'M284 208V178M300 208V178M284 196H300M284 186H300')}`;
  // the kitchen: a stove, a table, what you grew
  s += A.P('#6e6a62', A.rrect(50, 268, 58, 82, 5)) + A.P('#3a3630', A.rrect(58, 304, 42, 28, 3)) + (night ? A.P('#e8862a', A.ell(79, 322, 14, 7)) : A.P('#c85a2a', A.ell(79, 322, 9, 5))) + A.P('#8a6a44', A.rect(70, 216, 12, 52));
  if (!night) s += `<path class="wd-steam" d="M76 208C70 194 84 186 76 172" stroke="#fff" stroke-width="3" fill="none" opacity="0.4"/>`;
  s += A.P('#8e8a80', A.rrect(58, 258, 30, 12, 3)) + A.P('#6e6a60', A.rect(62, 252, 22, 7));
  s += A.P('#c4453a', 'M136 288C136 268 196 268 196 288z') + A.P('#ffffff', A.circ(152, 280, 3) + A.circ(176, 278, 3.4)) + A.P('#efe4c8', A.rect(160, 288, 12, 62));
  if (W.mg && W.mg.i) { const id = W.mg.i.slice(W.mg.i.indexOf(':') + 1), k = W.mg.i.slice(0, W.mg.i.indexOf(':')); try { s += `<g transform="translate(150 240)">${k === 'crop' ? gardenIconSvg(id, { kind: 'plant', stage: 4, px: 34 }) : gardenCatchSvg('fish', id.replace(/-\d$/, ''), 34, { uid: 'wdmg' })}</g>`; } catch (e) { /* no picture */ } }
  else if (bag[0]) s += `<g transform="translate(150 244)">${bag[0].art.replace('width="28"', 'width="30"').replace('height="28"', 'height="30"')}</g>`;
  if (!night) s += _wdMouse(226, 350, 2.4, { apron: '#e8e0cc', c: '#a8957e', flip: 1 }) + _wdMouse(120, 350, 1.5, { c: '#b8a68e', scarf: winter ? '#3f6fa8' : '' });
  // the bedroom: your pumpkin, if you ever grew one
  if (grown('pumpkin')) s += A.P('#e6822a', 'M368 340C352 286 388 262 440 262C500 262 524 290 508 340z') + A.P('#b85e16', 'M382 340C372 300 396 278 440 278C490 278 508 302 494 340z') + A.S('#6a7a30', 3, 'M440 262Q442 248 452 246');
  else s += A.P('#8a6238', 'M368 342C356 300 392 276 440 276C490 276 520 300 508 342z') + A.P('#6a4a2a', 'M384 342C376 310 400 292 440 292C484 292 500 312 492 342z');
  s += A.P(rug, 'M380 340C390 318 490 318 498 340z') + A.P('#efe4c8', A.ell(410, 322, 22, 8));
  if (night || winter) s += _wdMouse(420, 322, 2, { sleep: 1, c: '#a8957e' }) + `<text x="470" y="290" class="wd-zz" fill="#fffbe0" font-size="16">z</text><text x="484" y="272" class="wd-zz" fill="#fffbe0" font-size="11">z</text>`;
  s += A.P(rug, A.ell(452, 354, 110, 8)) + A.P(A.dk(rug, 0.22), A.ell(452, 354, 84, 5));
  // the wall: your best fish, a warning about your pet
  if (F.fish && typeof GARDEN_FISH !== 'undefined') { const d = GARDEN_FISH.find(x => x.name === F.fish); if (d) { try { s += `<g transform="translate(528 226)">${A.P('#6e4a2a', A.rrect(-4, -3, 62, 34, 2))}<g transform="translate(5 -2)">${gardenCatchSvg('fish', d.id, 44, { uid: 'wdmf' })}</g></g>`; } catch (e) { /* no picture */ } } }
  if (F.pet) s += `<g transform="translate(350 220) rotate(-4)">${A.P('#f4ead8', A.rect(0, 0, 58, 48))}${A.S('#2a2018', 1.6, 'M10 34C6 14 18 8 30 10C44 10 52 20 48 36M10 34l4 -5l4 5l4 -5l4 5l4 -5l4 5l4 -5l4 5M18 18l4 3M38 16l-4 4')}${A.P('#c8362a', A.circ(23, 23, 2) + A.circ(36, 22, 2))}<text x="6" y="46" font-size="8" fill="#c8362a" font-family="serif" font-weight="700">THE BEAST</text></g>`;
  // upstairs: the photograph, a window on the year, whoever is reading
  s += A.P('#7a5a38', A.rrect(358, 62, 66, 52, 3)) + (winter ? A.P('#dfe8f0', A.rect(364, 68, 54, 40)) + A.P('#ffffff', A.ell(390, 106, 26, 7)) : night ? A.P('#1b2a54', A.rect(364, 68, 54, 40)) + A.P('#fffbe0', A.circ(380, 80, 3) + A.circ(400, 90, 1.6)) : m.season === 'autumn' ? A.P('#e8c88a', A.rect(364, 68, 54, 40)) + A.P('#b84a2a', A.ell(382, 96, 8, 3.4)) : A.P('#bfe0ea', A.rect(364, 68, 54, 40)) + A.P('#7aae6a', A.rect(364, 96, 54, 12)));
  s += A.S('#7a5a38', 2.4, 'M391 68V108M364 88H418');
  s += `<g class="wd-mice-photo" data-photo="1" role="button" tabindex="0" aria-label="A very old photograph">${A.P('#6e4a2a', A.rrect(248, 62, 62, 50, 2))}${A.P('#e6d8b8', A.rect(253, 67, 52, 40))}${A.P('#8a9a72', A.rect(253, 92, 52, 15))}${A.P('#5a4a3a', A.ell(270, 86, 5.4, 11) + A.circ(270, 72, 4.2) + A.ell(288, 92, 3.6, 7.5) + A.circ(288, 82, 3.2))}</g>`;
  s += A.P('#8a6a44', A.rrect(230, 150, 190, 8, 2));
  for (let i = 0; i < (m.season === 'autumn' ? 7 : 3); i++) s += `<g transform="translate(${250 + i * 22} 150) scale(0.62)">${WD_THINGS.acorn()}</g>`;
  s += `<circle cx="260" cy="130" r="42" fill="url(#wd-mglow)"/><circle cx="260" cy="130" r="4" fill="#fff4b8"/>${A.S('#6e5030', 1.2, 'M260 126V116')}`;
  s += _wdMouse(290, 150, 1.6, { c: '#b8a68e', flip: 0 });
  if (spring) { s += _wdMouse(180, 350, 0.9, { c: '#cdbba2' }) + _wdMouse(200, 350, 0.8, { c: '#b8a68e', flip: 1 }) + _wdMouse(140, 350, 0.85, { c: '#c4b29a' }); }
  return `<svg class="wd-mice" viewBox="0 0 640 380" role="img" aria-label="A family of mice in a tiny house inside your tree: three small rooms, with things from your garden in them.">${s}</svg>`;
}
function _wdMiceOpen() {
  const m = gardenModel(), W = _wdG(), n = Number(W.mv) || 0;
  W.mv = n + 1; _wdSave();
  const line = W.mg && W.mg.d && !W.mg.seen && _wdDaysBetween(W.mg.d, m.today) >= 0 ? `Your ${W.mg.name.toLowerCase()} has been put on the table, and everyone is looking at it.` : _WD_MICE_LINES[n < _WD_MICE_LINES.length ? n : gardenHash(m.today) % _WD_MICE_LINES.length];
  if (W.mg && !W.mg.seen) { W.mg = Object.assign({}, W.mg, { seen: 1 }); }
  wdPage({
    title: 'Through the little door', width: 680, art: _wdMiceSvg(m), text: [line],
    after(el) {
      const ph = el.querySelector('[data-photo]');
      if (ph) ph.addEventListener('click', () => { const r = WD_FIND_ROW.get('photo'); if (r && W['fa.photo'] && !W['ff.photo']) _wdFindCard(r); else if (r && W['ff.photo']) wdWhisper('It looks right there.'); else wdWhisper('A very old photograph. You can’t quite see who it is from here.'); });
      const bag = _wdBagFor(); if (!bag.length) return;
      const row = _gdpEl('div', 'wd-give'); row.appendChild(_gdpEl('span', 'muted wd-give-l', 'Leave something on the step:'));
      for (const b of bag.slice(0, 5)) {
        const x = _gdpEl('button', 'wd-give-b'); x.type = 'button'; x.title = b.name; x.setAttribute('aria-label', 'Leave ' + b.name); x.innerHTML = b.art;
        x.onclick = () => { const key = _gdLed('wd', { i: { [b.item]: -1 }, n: 1 }), was = W.mg; W.mg = { i: b.item, d: m.today, name: b.name }; _gdSave(); row.textContent = ''; row.appendChild(_gdpEl('span', 'muted wd-give-l', 'You leave it on the step. Nobody sees.')); const u = _gdpEl('button', 'btn btn-sm btn-ghost', 'Take it back'); u.type = 'button'; u.onclick = () => { const G = _gdG(); delete G.led[key]; if (was) W.mg = was; else delete W.mg; _gdSave(); row.remove(); }; row.appendChild(u); };
        row.appendChild(x);
      }
      el.appendChild(row);
    },
  });
}
wdMod({
  id: 'mice',
  begin() { _wdm.door = null; },
  tick(m) {
    if (m.visit) return;
    const on = m.tod === 'dusk' || m.tod === 'night';
    if (!on) { if (_wdm.door) { _wdm.door.remove(); _wdm.door = null; wdGlowOff('mice'); } return; }
    const at = _wdMiceDoorAt(m);
    if (_wdm.door && (_wdm.door.x !== at.x || _wdm.door.y !== at.y)) { _wdm.door.remove(); _wdm.door = null; }
    if (!_wdm.door) _wdm.door = wdSprite({ id: 'wd-mice', x: at.x, y: at.y, z: at.y + 0.02, still: true, hit: 0.45, hitUp: 6, label: 'A very small door', cursor: 'hand',
      svg: `<path d="M-4 0V-7a4 4 0 0 1 8 0V0z" fill="#5a3a20"/><circle cx="2" cy="-3.6" r="0.5" fill="#d8b24a"/><rect x="-1.4" y="-9" width="2.8" height="2.6" fill="#ffd98a"/>`,
      onClick: () => _wdMiceOpen() });
    wdGlow('mice', '<circle cy="-7" r="9" fill="#ffc768" opacity="0.22"/><rect x="-1.4" y="-9" width="2.8" height="2.6" fill="#ffe9a8"/>', at.x, at.y);
  },
  end() { _wdm.door = null; },
});
