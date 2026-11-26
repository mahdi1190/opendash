/* ============================================================
   AFTER DARK, moth sheet nights (FUN-ROADMAP Phase 8). Hang a moth sheet (Lights, in the shop) anywhere you can put a decoration. From
   dusk on a dry night the moths come to it: one at first, another every few minutes, up to four (one more with a night-scented plant
   near, one more at a full moon; never more than six a sheet or eight in the garden). Which come depends on the season, the moon and
   what grows near. They are ordinary bugs: netted with the net, held up, in the Field Journal and the bag; the host decides who
   netted one, as for any bug. Eight of them come only to a sheet (the fish catalogue's rows with the event 'moth-sheet').
   The same moths on every screen: keys 'n<20-minute window>s<sheet's place among the garden's sheets, by cell>.<n>', seeded by the
   garden's own key, the window and the sheet's cell (a visit names decorations by their cell, so a uid would differ).
   Rewards: the catch (XP, the book, the market), the first sheet night a keepsake (moth dust) or a little XP.
   ============================================================ */
const _adw = { sig: '', memo: [] };
const AD_SHEET_MOTHS = Object.freeze(['brimstone-moth', 'large-yellow-underwing', 'lamplighter-moth', 'silver-lady', 'angle-shades', 'kettle-moth', 'december-moth', 'blue-moon-moth']);
/** The host's sunrise and sunset, in hours (the same rule as _gdTod: the weather's, a kept one, else the season's table). */
function adSun(m) {
  const s = m && m.visit && m.visit.snap;
  if (s && Number.isFinite(s.sr) && Number.isFinite(s.ss)) return { up: s.sr / 60, down: s.ss / 60 };
  const hm = (v) => { const x = /(\d{1,2}):(\d{2})/.exec(String(v || '')); return x ? +x[1] + x[2] / 60 : NaN; };
  let up = NaN, down = NaN;
  if (!(m && m.visit)) { try { const w = _gdWeather(); if (w && w.today) { up = hm(w.today.sunrise); down = hm(w.today.sunset); } if (!isFinite(up) || !isFinite(down)) { const k = _gdSunKept(); if (k) { up = hm(k.up); down = hm(k.down); } } } catch (e) { /* the table */ } }
  if (!isFinite(up) || !isFinite(down)) { const t = { spring: [6.3, 19.6], summer: [5, 21.2], autumn: [7, 18], winter: [8, 16.2] }[m && m.season] || [7, 19]; up = t[0]; down = t[1]; }
  return { up, down };
}
/** Minutes since dusk began tonight (the host's clock), 0 by day. */
function adDuskMin(m) { const C = adClock(m), S = adSun(m), d0 = S.down - 0.75; let h = C.h; if (h < 12) h += 24; return Math.max(0, (h - d0) * 60); }
/** The moths on every moth sheet now (94-garden-fish-2core.js gardenBugsNow adds them): [{ key, id, x, y, hab, t, perch }]. perch: the
 *  sheet as drawn (x across, its foot line, how high the cloth hangs in px), so a moth flits about the cloth (94-garden-fish-3game.js). */
function gardenNightBugsNow(m) {
  try {
    if (!m || !m.decor || !adOn() || (m.tod !== 'dusk' && m.tod !== 'night')) return [];
    if (m.rain && (m.rain.now || m.rain.snow)) return [];   // (they stay in when it rains)
    const sheets = m.decor.filter(d => d.def.id === 'moth-sheet').sort((a, b) => a.y - b.y || a.x - b.x);
    if (!sheets.length) return [];
    const g = _gdG(), win = _gcWindow(m.now), min = adDuskMin(m), caught = new Set((g.fd[m.today] && g.fd[m.today].k) || []);
    const sig = win + '|' + Math.floor(min / AD_SHEET.every) + '|' + m.tod + '|' + m.season + '|' + sheets.map(d => d.x + ',' + d.y).join(';') + '|' + (m.visit ? m.visit.fid : 'o') + '|' + m.plants.length + '|' + _ad.devV;
    if (_adw.sig !== sig) { _adw.sig = sig; _adw.memo = _adwRows(m, sheets, win, min); }
    return _adw.memo.filter(b => !caught.has(b.key));
  } catch (e) { console.error('[after dark] moths', e); return []; }
}
function _adwRows(m, sheets, win, min) {
  const g = _gdG(), N = adNow(m), full = N.moon.full, row = full ? N.moon.row : null, blue = !!(row && row.blue);
  const ctx = { level: m.level.level, tod: m.tod, season: m.season, rain: false, moon: typeof gardenMoonPhase === 'function' ? gardenMoonPhase(N.day) : '', decor: (id) => id === 'moth-sheet' || m.decor.some(d => d.def.id === id), event: (id) => id === 'moth-sheet' || (typeof gardenEventOn === 'function' && gardenEventOn(id)), caught: (id) => !!g.bl[id] };
  if (typeof gardenPlaceHas === 'function') ctx.home = gardenPlaceHas;
  const moths = GARDEN_BUGS.filter(b => b.shape === 'moth' && b.tod.some(t => t === 'night' || t === 'dusk'));
  // the sheet's own moth tonight: the Kettle Moon's, the Blue Moon's, the silver lady at a spring or summer full moon
  const own = blue ? 'blue-moon-moth' : row && row.id === 'kettle' ? 'kettle-moth' : full && (m.season === 'spring' || m.season === 'summer') ? 'silver-lady' : '';
  const out = []; let total = 0;
  sheets.forEach((d, si) => {
    if (total >= AD_SHEET.garden) return;
    const cx = d.x + (d.def.w || 2) / 2, cy = d.y + (d.def.h || 1);
    const near = m.plants.filter(p => p.stage >= 3 && Math.hypot(p.x + p.fp / 2 - cx, p.y + p.fp / 2 - cy) <= AD_SHEET.near);
    const scented = near.some(p => (p.def.attracts || []).includes('moth') || p.def.night);
    const c2 = Object.assign({}, ctx, { plant: (id) => near.some(p => p.def.id === id) });
    const pool = moths.filter(b => gardenBugFits(b, c2) && (!(b.needs && b.needs.blue) || blue));
    if (!pool.length) return;
    const wts = pool.map(b => gardenBugWeight(b, c2) * (b.needs && b.needs.plant && near.some(p => p.def.id === b.needs.plant) ? 3 : 1) * (b.id === own ? 4 : 1)), tw = wts.reduce((a, b) => a + b, 0);
    const cap = Math.min(AD_SHEET.max, AD_SHEET.cap + (scented ? 1 : 0) + (full ? 1 : 0)), n = Math.min(cap, 1 + Math.floor(min / AD_SHEET.every), AD_SHEET.garden - total);
    for (let j = 0; j < n; j++) {
      const r = gardenRand(N.key + '|' + win + '|' + d.x + ',' + d.y + '|' + j); let v = r() * tw, k = 0;
      for (; k < pool.length - 1; k++) { v -= wts[k]; if (v <= 0) break; }
      const y = cy + 0.06;
      out.push({ key: 'n' + win + 's' + si + '.' + j, id: pool[k].id, x: cx - 0.6 + r() * 1.2, y, hab: 'light', t: r(), perch: { x0: cx - 0.62, x1: cx + 0.62, y, l0: 24, l1: 56 } });
      total++;
    }
  });
  return out;
}
/* ---------- the card: who is on the sheet tonight ---------- */
function gardenNightMothOpen() {
  gpStage('Moth sheet nights', (el) => {
    el.classList.add('ad-moths');
    const m = gardenHere(), g = _gdG(), sheets = m.decor.filter(d => d.def.id === 'moth-sheet'), now = gardenNightBugsNow(m), dark = m.tod === 'dusk' || m.tod === 'night';
    el.appendChild(gpEl('p', 'gp-lead', 'A white sheet and a lantern. On a dry night the moths come to the light, a few at first, then more. Net them gently with the bug net: each one goes in your Field Journal.'));
    if (!sheets.length) el.appendChild(gpEl('p', null, m.visit ? 'There is no moth sheet in this garden yet.' : 'Hang a moth sheet first: it is in the shop, under Lights, from garden level 3. Anywhere a decoration can go will do, best near flowers that open at night.'));
    else if (!dark) el.appendChild(gpEl('p', null, 'The moths come after dusk. Come back when it is getting dark: the lantern lights itself.'));
    else if (m.rain && (m.rain.now || m.rain.snow)) el.appendChild(gpEl('p', null, 'Not tonight: the moths stay in when it rains. Try again on a dry night.'));
    else if (!now.length) el.appendChild(gpEl('p', null, 'Nothing yet. Give it a few minutes: the first one is usually on its way.'));
    if (now.length) {
      el.appendChild(gpEl('h3', 'gd-h3', 'On the sheet tonight'));
      const by = new Map(); for (const b of now) by.set(b.id, (by.get(b.id) || 0) + 1);
      const row = gpEl('div', 'ad-moths-row');
      for (const [id, n] of by) { const d = gardenBugDef(id); if (!d) continue; const it = gpEl('div', 'ad-moth' + (g.bl[id] ? '' : ' is-new')), art = gpEl('span', 'ad-moth-art'); art.innerHTML = gardenCatchSvg('bug', id, 48, { uid: 'adm' + id, glow: false }); it.append(art, gpEl('b', null, d.name + (n > 1 ? ` × ${n}` : '')), gpEl('small', null, g.bl[id] ? d.blurb : 'New to you!')); row.appendChild(it); }
      el.appendChild(row);
      if (!adGet('sheet1')) { adSet('sheet1', m.today); if (!adHas('moth-dust')) adKeep('moth-dust'); else adGive('sheet1', { x: 3 }, 'Your first moth sheet night'); }
    }
    el.appendChild(gpEl('h3', 'gd-h3', 'The sheet’s own moths'));
    el.appendChild(gpEl('p', 'muted', 'These come only to a moth sheet. Some need a full moon; one needs a very particular moon.'));
    const own = gpEl('div', 'ad-moths-row');
    for (const id of AD_SHEET_MOTHS) { const d = gardenBugDef(id); if (!d) continue; const got = !!g.bl[id], it = gpEl('div', 'ad-moth' + (got ? ' is-got' : ' is-far')), art = gpEl('span', 'ad-moth-art'); art.innerHTML = gardenCatchSvg('bug', id, 40, { uid: 'ado' + id, glow: false, silhouette: !got }); it.append(art, gpEl('b', null, got ? d.name : '? ? ?'), gpEl('small', null, got ? `${g.bl[id].n || 1} netted` : d.clue || '')); own.appendChild(it); }
    el.appendChild(own);
  });
}
gardenPlayAdd({ id: 'moth-sheet', name: 'Moth sheet nights', verb: 'Watch the moths', icon: 'moon', group: 'secret', blurb: 'Hang a white sheet and a lantern, and see who comes to it after dark.',
  status: () => { try { if (!adOn()) return ''; const m = gardenHere(), n = gardenNightBugsNow(m).length; return n ? `${_wdPlural(n, 'moth')} on the sheet` : ''; } catch (e) { return ''; } },
  open: gardenNightMothOpen });
