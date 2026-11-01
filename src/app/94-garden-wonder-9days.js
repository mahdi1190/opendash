/* ============================================================
   GARDEN WONDER, small days in the year (docs/dev/HUNDRED_WORLD.md, rows 23 to 28). WD_DAYS: one row per day: the dates, the hour, words for the calendar, and up(m) / down() for what stands in the world while it holds. Nothing here is on any other day.
   South of the equator the dates move six months, except what is in the real sky.
   Saved: dl.<year> (lanterns floated), df.<year> (the fire jumped), dw.<year> (the tree sung to), ds.<year> (the supper).
   ============================================================ */
const _wdy = { up: new Map(), L: [], lastStar: 0 };
const _WD_MONTHS = Object.freeze(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
function _wdMd(md, south) { if (!south) return md; const mo = Number(md.slice(0, 2)), n = ((mo + 5) % 12) + 1; return String(n).padStart(2, '0') + md.slice(2); }
function _wdDayOn(r, m) {
  const md = String(m.today).slice(5), south = !!m.south && !r.sky, from = _wdMd(r.from, south), to = _wdMd(r.to, south);
  if (!(from <= to ? md >= from && md <= to : md >= from || md <= to)) return false;
  return !r.tod || r.tod.includes(m.tod);
}
function _wdYear(m) { return String(m.today).slice(0, 4); }
/* ---------- lantern night ---------- */
function _wdLanternSvg(i) { const c = ['#f2a65a', '#f2d06a', '#e8806a', '#f4e4a8', '#d8a0c8'][i % 5]; return `<path d="M-6 0L-5 -9L5 -9L6 0z" fill="${c}"/><path d="M-5 -9L0 -13L5 -9z" fill="${c}" opacity="0.8"/><ellipse cy="1" rx="8" ry="2" fill="#2a3a4a" opacity="0.35"/>`; }
function _wdLanternFloat(m, i, fresh) {
  const a = WD_AT.lanterns, ang = (gardenHash('lan' + i + m.today) % 100) / 100 * 1.3 - 0.65, S0 = { x: a.x + (fresh ? 0 : ang * 4), y: a.y + (fresh ? 0.4 : 2 + (i * 0.7)) };
  const id = 'lan' + i, S = wdSprite({ id: 'wd-' + id, x: S0.x, y: S0.y, t: Math.random() * 10, svg: _wdLanternSvg(i),
    update(dt, Sp) { Sp.t += dt; Sp.x += (Math.sin(ang) * 0.1 + Math.sin(Sp.t * 0.2) * 0.04) * dt; Sp.y += 0.06 * dt * (Sp.y > a.y + 7 ? 0.1 : 1); Sp.lift = Math.sin(Sp.t * 1.2) * 0.8; wdGlow(id, '<circle cy="-6" r="20" fill="#ffc768" opacity="0.2"/><circle cy="-6" r="8" fill="#ffd98a" opacity="0.42"/>', Sp.x, Sp.y); } });
  _wdy.L.push(S);
}
const _wdLantern = {
  up(m) {
    const W = _wdG(), k = 'dl.' + _wdYear(m), had = Number(W[k]) || 0, a = WD_AT.lanterns;
    _wdy.L = [];
    for (let i = 0; i < had; i++) _wdLanternFloat(m, i, false);
    return wdSprite({ id: 'wd-basket', x: a.x + 0.7, y: a.y - 0.8, still: true, hit: 0.8, hitUp: 8, label: 'Paper lanterns', cursor: 'hand',
      svg: `<path d="M-11 -9L-8 0L8 0L11 -9z" fill="#b08a5a"/><path d="M-11 -9h22" stroke="#7a5a38" stroke-width="1.4"/><g transform="translate(-4 -9) scale(0.7)">${_wdLanternSvg(0)}</g><g transform="translate(5 -9) scale(0.7)">${_wdLanternSvg(3)}</g>`,
      onClick: () => {
        const mm = gardenHere(), n = Number(_wdGet(k)) || 0, cap = 5;
        if (n >= cap) { wdWhisper('They are all out on the water now. They will drift for as long as you stay.', 5000); return; }
        if (!mm.visit) _wdSet(k, n + 1);
        _wdLanternFloat(mm, n, true); wdSound([[523, 0.9, 'sine', 0.016]]);
        wdWhisper(n === 0 ? 'One for someone, or for nothing. Nobody asks.' : ['There it goes.', 'It catches up with the others in the end.', 'The water doesn’t mind.', 'That’s the last of them, nearly.'][Math.min(3, n - 1)], 4000);
      } });
  },
  down() { for (const S of _wdy.L) { const i = S.id.slice(3); S.remove(); wdGlowOff(i); } _wdy.L = []; },
};
/* ---------- the midsummer fire ---------- */
const _wdFire = {
  up() {
    const a = WD_AT.fire, A = GART, glow = () => wdGlow('fire', '<circle class="wd-lamp-g" cy="-16" r="40" fill="#ff9a3a" opacity="0.24"/><circle cy="-14" r="16" fill="#ffc768" opacity="0.5"/>', a.x, a.y);
    glow();
    return wdSprite({ id: 'wd-fire', x: a.x, y: a.y, hit: 0.9, hitUp: 12, label: 'Jump the fire', cursor: 'hand', t: 0, svg: A.S('#5a3a20', 3, 'M-13 0L13 -6M-13 -6L13 0') + `<g class="gl-glow-soft">${A.P('#e8602a', 'M-9 -3C-11 -14 -3 -18 -2 -28C4 -22 11 -15 9 -3z')}${A.P('#ffc23a', 'M-5 -3C-6 -10 -1 -13 0 -19C3 -14 6 -10 5 -3z')}</g>`,
      update(dt, S) { S.t += dt; if (Math.floor(S.t) !== S.k) { S.k = Math.floor(S.t); glow(); } },
      onClick: () => {
        const side = _gw.px < a.x ? 1 : -1;
        gardenWalkToPoint({ x: a.x + side * 1.3, y: a.y + 0.2 }, () => {
          _glFx(a.x, a.y, 'sparkle', { lift: 26 }); wdSound([[392, 0.2, 'triangle', 0.03], [587, 0.25, 'triangle', 0.03, 0.12]]);
          if (typeof gartEmoteRun === 'function') { try { gartEmoteRun('cheer', { quiet: false }); } catch (e) { /* fine */ } }
          const m = gardenHere(), k = 'df.' + _wdYear(m), n = (Number(_wdGet(k)) || 0) + 1; if (!m.visit) _wdSet(k, n);
          wdWhisper(n === 1 ? 'You jumped it. They say that is lucky. They also say not to.' : n === 7 ? 'Seven times. That is enough luck for anybody.' : 'Over you go.', 4000);
        }, { radius: 1 });
      } });
  },
  down() { wdGlowOff('fire'); },
};
/* ---------- wassail: sing to your oldest tree ---------- */
const _wdWassail = {
  up(m) {
    let t = null; for (const p of m.plants) if (p.def.cat === 'tree' && p.stage >= 2 && (!t || p.planted < t.planted)) t = p;
    if (!t) return null;
    const x = t.x + t.fp / 2 - 0.5, y = t.y + t.fp + 0.2, k = 'dw.' + _wdYear(m);
    return wdSprite({ id: 'wd-wassail', x, y, still: true, hit: 0.7, hitUp: 8, label: 'Sing to the tree', cursor: 'hand',
      svg: '<path d="M-5 0L-6 -9H6L5 0z" fill="#8e8a80"/><ellipse cy="-9" rx="6" ry="1.6" fill="#c8a24a"/><path d="M-2 -13h4" stroke="#d8c88a" stroke-width="1"/>',
      onClick: () => {
        const notes = [392, 440, 494, 392, 523, 494, 440, 392]; wdSound(notes.map((f, i) => [f, 0.34, 'triangle', 0.024, i * 0.3]));
        _glFx(x, y - 1, 'sparkle', { lift: 40 });
        const mm = gardenModel();
        if (mm.visit || _wdGet(k)) { wdWhisper('You sing it again. It’s a good song. The tree has heard it.', 4000); return; }
        _wdSet(k, mm.today);
        const g = _gdG(); g.led['wdw.' + mm.today.slice(0, 4)] = { d: mm.today, k: 'wd', x: 4, i: { fertiliser: 1 }, n: 1 }; _gdSave();
        wdPage({ title: 'Wassail', text: ['People used to go out to the oldest tree in January, and pour it a drink, and sing to it, so that it would remember what it was for. Some still do.', `You have sung to your ${t.def.name.toLowerCase()}. It seems to be thinking about it. Somebody has left a bag of fertiliser at its foot, in case that helps.`] });
      } });
  },
  down() {},
};
/* ---------- the harvest supper: what you really grew, and everyone who has called ---------- */
function _wdHarvestTop(m) {
  const g = _gdG(), year = _wdYear(m), sum = new Map();
  const add = (i) => { for (const [k, v] of Object.entries(i || {})) if (k.startsWith('crop:') && v > 0) sum.set(k.slice(5), (sum.get(k.slice(5)) || 0) + v); };
  for (const e of Object.values(g.led)) if (e && String(e.d).startsWith(year)) add(e.i);
  for (const [mo, b] of Object.entries(g.bank)) if (mo.startsWith(year) && b) add(b.i);
  return [...sum.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ id, n, def: gardenPlant(id) })).filter(x => x.def);
}
function _wdSupperSvg(m) {
  const A = GART, top = _wdHarvestTop(m), met = WD_FOLK.filter(r => _wdGet('fv.' + r.id)).slice(0, 5);
  let s = '';
  met.forEach((r, i) => { s += `<g transform="translate(${-48 + i * 24} -8) scale(0.72)">${_wdFolkArt(r)}</g>`; });
  s += A.P('#000000', A.ell(0, 1, 74, 5), 0.16) + A.P('#6e5030', A.rect(-62, -12, 5, 13) + A.rect(57, -12, 5, 13)) + A.P('#f4ead8', A.rrect(-70, -18, 140, 8, 1.6)) + A.P('#e0d4b8', A.rect(-70, -11, 140, 3));
  top.forEach((x, i) => { try { s += `<g transform="translate(${-58 + i * 25} -40)">${gardenIconSvg(x.id, { kind: 'plant', stage: 4, px: 22 })}</g>`; } catch (e) { /* no picture */ } });
  return s;
}
const _wdSupper = {
  up(m) {
    const a = WD_AT.feast, k = 'ds.' + _wdYear(m);
    return wdSprite({ id: 'wd-supper', x: a.x, y: a.y, still: true, hit: 1.6, hitUp: 14, label: 'The harvest supper', cursor: 'hand', svg: _wdSupperSvg(m),
      onClick: () => {
        const mm = gardenModel(), w = mm.wallet, n = w.n || {}, top = _wdHarvestTop(mm), lines = [];
        if (top[0]) lines.push(`There’s your ${top[0].def.name.toLowerCase().replace(/ tree$/, '')}, ${_wdPlural(top[0].n, 'of them').replace('of thems', 'of them')}, all this year. Somebody has made something of it.`);
        else lines.push('The table is laid, and there’s not much on it yet. Nobody minds. They came anyway.');
        if (_wdGet('fv.tam') && n.planted) lines.push(`Tam: “${_wdPlural(n.planted, 'thing')} you’ve put in the ground in your time. I felt most of them.”`);
        if (_wdGet('fv.pip')) { const F = wdFacts(mm, ''); lines.push(F.fish ? `Pip: “And the ${F.fish.toLowerCase()}! Tell them about the ${F.fish.toLowerCase()}!”` : 'Pip: “I brought a hat. It isn’t mine.”'); }
        if (_wdGet('fv.thistle')) lines.push('Mother Thistle: “Sit down, dear. You’ve been on your feet since spring.”');
        if (_wdGet('fv.wick')) lines.push('Wick: “It’s dark in another hour, if anyone wants to see something.”');
        if (_wdGet('l.w7')) lines.push('There is a card at the end of the table, in careful pencil. “Well kept. W.”');
        if (!_wdGet(k)) { _wdSet(k, mm.today); const g = _gdG(); g.led['wds.' + _wdYear(mm)] = { d: mm.today, k: 'wd', x: 6, c: 10, n: 1 }; _gdSave(); lines.push('They won’t let you pay. There are ten coins in your coat that weren’t there before.'); }
        wdTalk({ name: 'The harvest supper', lines, at: { x: a.x, y: a.y }, bye: 'Stay a little' });
      } });
  },
  down() {},
};
/* ---------- star nights ---------- */
const _wdStarNight = {
  tick(m) {
    if (!_gl.W || !_gl.W.own) return;
    if (_wd.t - _wdy.lastStar < 34) return;
    _wdy.lastStar = _wd.t + Math.random() * 25;
    const e = GL_EGG.get('shooting-star'); if (e) { try { GARDEN_LIFE_EFFECTS.streak(e, e.effect, _gl.W); gardenLifeFound('e', e.id); } catch (err) { /* fine */ } }
  },
};
const WD_DAYS = Object.freeze([
  { id: 'wassail', name: 'Wassail', from: '01-05', to: '01-06', run: _wdWassail, blurb: 'Go and sing to your oldest tree. A real old custom, and the tree will not mind.' },
  { id: 'midfire', name: 'The midsummer fire', from: '06-20', to: '06-24', tod: ['dusk', 'night'], run: _wdFire, blurb: 'A fire by the lane on the shortest nights. You can jump it.' },
  { id: 'august-stars', name: 'The August stars', from: '08-11', to: '08-13', tod: ['night'], sky: 1, run: _wdStarNight, blurb: 'Falling stars, every few minutes, on the same nights every year. They are real: look out of the window too.' },
  { id: 'supper', name: 'The harvest supper', from: '09-22', to: '09-28', run: _wdSupper, blurb: 'A long table with what you grew this year on it, and everyone who has called sitting down.' },
  { id: 'lanterns', name: 'Lantern night', from: '11-01', to: '11-07', tod: ['dusk', 'night'], run: _wdLantern, blurb: 'Float paper lanterns out on the lake, from the pier, after dusk.' },
  { id: 'december-stars', name: 'The December stars', from: '12-13', to: '12-15', tod: ['night'], sky: 1, run: _wdStarNight, blurb: 'The best falling stars of the year, if the sky is clear. They are real too.' },
]);
wdMod({
  id: 'days', pref: 'days',
  begin() { _wdy.up = new Map(); _wdy.lastStar = 0; },
  tick(m) {
    if (m.visit) return;
    for (const r of WD_DAYS) {
      const on = _wdDayOn(r, m), S = _wdy.up.get(r.id);
      if (on && !_wdy.up.has(r.id)) { let got = null; if (r.run.up) { try { got = r.run.up(m); } catch (e) { console.error('[garden wonder]', r.id, e); } } _wdy.up.set(r.id, got || true); }
      else if (!on && _wdy.up.has(r.id)) { if (r.run.down) r.run.down(); if (S && S.remove) S.remove(); _wdy.up.delete(r.id); }
      if (on && r.run.tick) r.run.tick(m);
    }
  },
  end() { for (const r of WD_DAYS) if (_wdy.up.has(r.id) && r.run.down) r.run.down(); _wdy.up = new Map(); },
});
/* ---------- The year: what is coming ---------- */
function wdBoxDays(el, m) {
  const south = !!m.south, md = String(m.today).slice(5);
  const rows = WD_DAYS.map(r => { const f = _wdMd(r.from, south && !r.sky), t = _wdMd(r.to, south && !r.sky); return { r, f, t, now: _wdDayOnDate(f, t, md), wait: f >= md ? 0 : 1 }; }).sort((a, b) => (b.now - a.now) || (a.wait - b.wait) || a.f.localeCompare(b.f));
  const P = wdMoon(m.today);
  const moonRow = _gdpEl('div', 'wd-yearrow is-moon'); moonRow.innerHTML = `<span class="wd-env" aria-hidden="true">${icon('moon')}</span>`;
  const mt = _gdpEl('span', 'wd-letter-t'); mt.appendChild(_gdpEl('b', null, P.full ? 'The moon is full' : `Full moon in ${_wdPlural(P.toFull, 'night')}`)); mt.appendChild(_gdpEl('small', 'muted', 'On the nights round it, there is a road across the lake.')); moonRow.appendChild(mt); el.appendChild(moonRow);
  for (const x of rows) {
    const d = _gdpEl('div', 'wd-yearrow' + (x.now ? ' is-now' : '')); d.innerHTML = `<span class="wd-date" aria-hidden="true"><b>${Number(x.f.slice(3))}</b><small>${esc(_WD_MONTHS[Number(x.f.slice(0, 2)) - 1].slice(0, 3))}</small></span>`;
    const t = _gdpEl('span', 'wd-letter-t'); t.appendChild(_gdpEl('b', null, x.r.name + (x.now ? ': now' : ''))); t.appendChild(_gdpEl('small', 'muted', x.r.blurb)); d.appendChild(t); el.appendChild(d);
  }
}
function _wdDayOnDate(f, t, md) { return (f <= t ? md >= f && md <= t : md >= f || md <= t) ? 1 : 0; }
