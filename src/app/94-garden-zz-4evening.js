/* ============================================================
   THE DAY'S END (docs/dev/GARDEN_TOGETHER.md section 24): after dusk a lamp stands lit by the shore bench. Walk up to it if you want to: what you caught today, what your real work earned, what is next. Then put the lamp out. Nothing asks you to, and nothing is counted if you do not.
   A friend who visits sees your lamp out if you have put the day to bed (`tg.ev`), lit if you have not.
   ============================================================ */
const GTG_EVE_AT = Object.freeze(_wdPt('reed-bank', 1.3, 0.6));   // world cells
function _gtgeWire(o) { if (_gtgW()['tg.ev.' + gtgToday()]) o.ev = 1; }
gtgWire(_gtgeWire);
function _gtgeLampSvg(lit) {
  const A = GART;
  return A.P('#000000', A.ell(0, 1, 9, 2.4), 0.2) + A.S('#3a3024', 2, 'M0 0L0 -22') + A.P('#3a3024', A.rrect(-4.4, -32, 8.8, 10, 1)) + A.P(lit ? '#ffe9a0' : '#8a8478', A.rrect(-3, -30.5, 6, 7, 0.6)) + A.P('#3a3024', 'M-5.5 -32L0 -37L5.5 -32z');
}
function _gtgeCaught(today) {
  const g = _gdG(), kinds = new Map(); let n = 0;
  for (const e of Object.values(g.led)) {
    if (!e || e.d !== today || (e.k !== 'fc' && e.k !== 'bc') || !e.i) continue;
    for (const k of Object.keys(e.i)) {
      const f = /^fish:(.+)-[0-3]$/.exec(k), b = /^bug:(.+)$/.exec(k);
      const row = f ? { kind: 'fish', id: f[1], d: gardenFishDef(f[1]) } : b ? { kind: 'bug', id: b[1], d: gardenBugDef(b[1]) } : null; if (!row || !row.d) continue;
      n++; const c = kinds.get(row.id); if (c) c.n++; else kinds.set(row.id, Object.assign(row, { n: 1 }));
    }
  }
  return { n, kinds: [...kinds.values()] };
}
function gardenEveningOpen() {
  gpStage('The end of the day', (el) => {
    el.classList.add('tg-panel', 'tg-eve');
    const m = gardenModel(), today = m.today, g = _gdG();
    try {
      const sc = gardenSceneFromModel(m); sc.tod = 'dusk'; sc.hour = 19;
      const a = gpEl('div', 'tg-eve-art'); a.innerHTML = gardenSceneSvg(sc, { size: 'm', crop: 'bed', still: true, uid: 'tgeve', photo: true, label: 'Your garden at the end of the day', fit: 'xMidYMid slice' }); el.appendChild(a);
    } catch (e) { /* the words will do */ }
    const C = _gtgeCaught(today);
    el.appendChild(gpEl('h3', 'gd-h3', 'What you caught'));
    if (C.n) {
      const row = gpEl('div', 'tg-eve-c');
      for (const c of C.kinds.slice(0, 12)) { const rec = (c.kind === 'bug' ? g.bl : g.fl)[c.id], it = gpEl('div', 'tg-eve-k'), art = gpEl('span'); art.innerHTML = gardenCatchSvg(c.kind, c.id, 36, { uid: 'tgev' + c.id, glow: false }); it.append(art, gpEl('small', null, c.d.name + (c.n > 1 ? ` × ${c.n}` : '') + (rec && rec.d === today ? ' (new)' : ''))); row.appendChild(it); }
      el.appendChild(row);
    } else el.appendChild(gpEl('p', 'muted', 'Nothing today, and the water is still there tomorrow.'));
    el.appendChild(gpEl('h3', 'gd-h3', 'What your work earned'));
    let line = ''; try { line = gardenRewardTodayLine(); } catch (e) { line = ''; }
    const coins = m.wallet.econToday ? Number(m.wallet.econToday.coins) || 0 : 0;
    el.appendChild(gpEl('p', null, [coins ? `${coins} coin${coins === 1 ? '' : 's'}.` : '', line].filter(Boolean).join(' ') || 'A day off from all that. The garden does not mind.'));
    const next = (() => { try { return gardenRewardNext(m).slice(0, 2); } catch (e) { return []; } })();
    const proj = typeof _gtgpList === 'function' ? _gtgpList()[0] : null;
    if (next.length || proj) {
      el.appendChild(gpEl('h3', 'gd-h3', 'What’s next, when you feel like it'));
      if (proj) el.appendChild(gpEl('p', null, `The ${proj.row.short} with ${_gscFirst(proj.fid)} is ${Math.floor(_gtgpState(proj).share * 100)}% of the way there.`));
      for (const n of next) el.appendChild(gpEl('p', null, n.text + '.'));
    }
    const go = gpEl('div', 'tg-eve-go'), done = _gtgW()['tg.ev.' + today];
    const out = gpEl('button', 'btn btn-primary', done ? 'The lamp is out' : 'Put the lamp out');
    out.type = 'button'; out.disabled = !!done;
    out.onclick = () => {
      _gtgW()['tg.ev.' + today] = 1; _gdSave(); gtgPublishSoon();
      const paid = _grGive('did.evening', { ticket: 2, x: 1 });
      out.textContent = paid ? 'Goodnight. 2 tickets' : 'Goodnight'; out.disabled = true;
      _gtgeDraw(gardenHere());
    };
    go.appendChild(out); el.appendChild(go);
  });
}
function _gtgeDraw(m) {
  const dark = m.tod === 'dusk' || m.tod === 'night';
  if (!dark || gardenFun() === 'off') { gtgSprite('eve', null); wdGlowOff('tg-eve'); return; }
  const lit = m.visit ? !_gtgTheirs(m).ev : !_gtgW()['tg.ev.' + m.today], x = GTG_EVE_AT.x, y = GTG_EVE_AT.y;
  gtgSprite('eve', { x, y, z: y, hit: 0.8, hitUp: 18, label: m.visit ? 'Their lamp' : 'The end of the day', svg: _gtgeLampSvg(lit), onClick: () => (m.visit ? wdTalk({ lines: [lit ? `${_gscFirst(m.visit.fid)}’s lamp is still lit. Their day is not over yet.` : `${_gscFirst(m.visit.fid)} has put the lamp out. Their day is done.`], bye: 'Goodnight' }) : gardenEveningOpen()) });
  if (lit) wdGlow('tg-eve', '<circle cy="-27" r="20" fill="#ffc768" opacity="0.2"/><circle cy="-27" r="7" fill="#ffd98a" opacity="0.5"/>', x, y); else wdGlowOff('tg-eve');
}
wdMod({ id: 'tg-eve', visit: true, begin(m) { _gtgeDraw(m); }, painted(m) { _gtgeDraw(m); }, tick(m) { if (Math.floor(_wd.t) % 10 === 0) _gtgeDraw(m); } });
gardenPlayAdd({ id: 'tg-eve', name: 'The end of the day', icon: 'moon', group: 'secret', blurb: 'What you caught, what your work earned, and what’s next. A lamp by the bench after dusk, if you want it.', open: gardenEveningOpen });
