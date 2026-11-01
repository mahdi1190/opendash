/* ============================================================
   THE PRIZE VEGETABLE (docs/dev/HUNDRED_PLAY.md row 35, built here; docs/dev/GARDEN_TOGETHER.md section 24). Pick one, tend it once a day, and it really gets huge: your real work that day decides how much it puts on. It stands in the garden at its true size, and friends see it, with its weight on a label.
   After a week it can go on the scales: tickets for its weight and a record that friends can see. Then start again. Fat days, thin days: a day off costs nothing but a little size.
   SAVES: wd['tg.pv'] = {k, d}; wd['tg.pt.<day>'] = hundred-gram units put on that day, one entry a day, so two devices cannot tend it twice over; wd['tg.pb'] the best ever (hundred-gram units).
   ============================================================ */
const GTG_VEG = Object.freeze({ min: 7, tickets: 60, perDay: 8, focus: 30, kinds: Object.freeze([{ id: 'pumpkin', name: 'Pumpkin', c: '#e8882a', c2: '#c8681a', stem: '#5a7a3a' }, { id: 'marrow', name: 'Marrow', c: '#6a9a4a', c2: '#4a7a3a', stem: '#7a8a3a' }, { id: 'turnip', name: 'Turnip', c: '#e8d8e8', c2: '#a86ab4', stem: '#4a8a3a' }]) });
const GTG_VEG_AT = Object.freeze({ x: 35.5, y: 16.6 });   // world cells
function _gtgvGet() { const P = _gtgW()['tg.pv']; return P && P.k ? P : null; }
function _gtgvUnits() { const W = _gtgW(), P = _gtgvGet(); if (!P) return 0; let n = 0; for (const k of Object.keys(W)) if (k.startsWith('tg.pt.') && k.slice(6) >= P.d) n += Number(W[k]) || 0; return n; }
function _gtgvDays() { const W = _gtgW(), P = _gtgvGet(); if (!P) return 0; return Object.keys(W).filter(k => k.startsWith('tg.pt.') && k.slice(6) >= P.d && Number(W[k]) > 0).length; }
function _gtgvBest() { return Number(_gtgW()['tg.pb']) || 0; }
const _gtgKg = (u) => (u / 10).toFixed(1);
gtgWire((o) => { const P = _gtgvGet(), best = _gtgvBest(); if (P || best) o.pv = [P ? Math.max(0, GTG_VEG.kinds.findIndex(k => k.id === P.k)) : 0, Math.min(99999, _gtgvUnits()), Math.min(99999, best)]; });
/** How much today's tending adds: a little for turning up, the rest from what you really finished and focused on today. */
function _gtgvToday() {
  const today = gtgToday(); let tasks = 0, focus = 0;
  try { const inp = _gdEconInputs(_gdAct()).get(today); if (inp) { tasks = gardenRewardTasksOf(inp); focus = gardenEconDay(Object.assign({ sessions: [], done: [] }, inp, { run: 1 })).focusMin || 0; } } catch (e) { /* a day with nothing on the books */ }
  return { tasks, focus, units: 10 + Math.min(GTG_VEG.perDay, tasks) * 6 + Math.min(GTG_VEG.perDay, Math.floor(focus / GTG_VEG.focus)) * 6 };
}
function gtgVegSvg(i, units) {
  const K = GTG_VEG.kinds[i] || GTG_VEG.kinds[0], A = GART, kg = units / 10, s = Math.min(5.2, 0.7 + Math.sqrt(kg) * 0.42), rx = 16 * s, ry = (K.id === 'marrow' ? 9 : 12) * s; let c = A.P('#000000', A.ell(0, 1, rx * 1.06, ry * 0.3), 0.2);
  if (K.id === 'marrow') { c += A.P(K.c, A.ell(0, -ry, rx * 1.2, ry)) + A.S(K.c2, 1.4 * Math.sqrt(s), `M${-rx * 1.1} ${-ry}Q0 ${-ry * 0.3} ${rx * 1.1} ${-ry}M${-rx * 1.1} ${-ry * 1.2}Q0 ${-ry * 1.6} ${rx * 1.1} ${-ry * 1.2}`) + A.P('#ffffff', A.ell(-rx * 0.4, -ry * 1.5, rx * 0.4, ry * 0.2), 0.3); }
  else if (K.id === 'turnip') { c += A.P(K.c, A.ell(0, -ry, rx, ry)) + A.P(K.c2, `M${-rx} ${-ry}Q0 ${-ry * 2.5} ${rx} ${-ry}Q0 ${-ry * 1.5} ${-rx} ${-ry}z`) + A.S(K.stem, 2.2 * Math.sqrt(s), `M0 ${-ry * 1.9}Q-4 ${-ry * 2.5} -10 ${-ry * 2.9}M0 ${-ry * 1.9}L0 ${-ry * 3}M0 ${-ry * 1.9}Q4 ${-ry * 2.5} 10 ${-ry * 2.9}`); }
  else { for (const [dx, k] of [[-0.72, 0.56], [0.72, 0.56], [-0.38, 0.8], [0.38, 0.8], [0, 0.9]]) c += A.P(dx % 0.72 === 0 ? K.c2 : K.c, A.ell(rx * dx, -ry, rx * (1 - Math.abs(dx) * 0.55) * 0.62, ry * k * 1.08)); c += A.P(K.stem, `M-3 ${-ry * 1.9}L${-1.6 * s} ${-ry * 2.3}L${2 * s} ${-ry * 2.3}L3 ${-ry * 1.9}z`) + A.P('#ffffff', A.ell(-rx * 0.35, -ry * 1.5, rx * 0.25, ry * 0.14), 0.3); }
  return c;
}
function _gtgvWeigh() {
  const u = _gtgvUnits(), best = _gtgvBest(), kg = u / 10, W = _gtgW(), P = _gtgvGet(); if (!P) return;
  const t = Math.min(GTG_VEG.tickets, Math.max(5, Math.round(kg))), g = _gdG();
  g.led['pl.' + gtgToday() + '.' + _gdUid('').toLowerCase()] = { d: gtgToday(), k: 'pl', i: { ticket: t, 'mat:stone': kg >= 40 ? 2 : 1 }, x: 5, n: 1, w: 'veg' };
  if (u > best) W['tg.pb'] = u;
  for (const k of Object.keys(W)) if (k.startsWith('tg.pt.')) W[k] = 0;   // (nothing is left on the scales: it counts from zero for the next)
  W['tg.pv'] = { x: gtgToday() };   // (an entry, not a deletion: the other device must hear it is over)
  _gdSave(); gardenTickSoon(); gtgPublishSoon();
  return { t, kg, record: u > best };
}
function gardenVegOpen() {
  gpStage('The prize vegetable', (el) => {
    el.classList.add('tg-panel');
    const paint = () => {
      el.textContent = '';
      const P = _gtgvGet(), W = _gtgW(), today = gtgToday();
      const friends = gtgFriends().filter(f => Array.isArray(f.tg.pv) && f.tg.pv[2] > 0).sort((a, b) => b.tg.pv[2] - a.tg.pv[2]).slice(0, 6);
      if (!P) {
        el.appendChild(gpEl('p', 'muted', 'Pick one seed. Tend it once a day, and what you really finish that day feeds it. After a week it can go on the scales.'));
        const row = gpEl('div', 'tg-veg-pick');
        GTG_VEG.kinds.forEach((K, i) => { const b = gpEl('button', 'tg-veg-k'); b.type = 'button'; b.innerHTML = `<svg viewBox="-34 -46 68 50" width="96" height="70" aria-hidden="true">${gtgVegSvg(i, 60)}</svg>`; b.appendChild(gpEl('b', null, K.name)); b.onclick = () => { W['tg.pv'] = { k: K.id, d: today }; _gdSave(); gtgPublishSoon(); _gtgvDraw(gardenHere()); paint(); }; row.appendChild(b); });
        el.appendChild(row);
      } else {
        const I = GTG_VEG.kinds.findIndex(k => k.id === P.k), u = _gtgvUnits(), days = _gtgvDays(), t = _gtgvToday(), tended = W['tg.pt.' + today] > 0;
        const a = gpEl('div', 'tg-veg-art'); a.innerHTML = `<svg viewBox="-170 -200 340 210" width="320" height="198" aria-hidden="true">${gtgVegSvg(I, u)}</svg>`;
        el.append(a, gpEl('p', null, `${GTG_VEG.kinds[I].name}: ${_gtgKg(u)} kg, after ${days} day${days === 1 ? '' : 's'} of tending.`));
        const tend = gpEl('button', 'btn btn-primary', tended ? 'Tended today' : `Tend it: ${_gtgKg(t.units)} kg today`); tend.type = 'button'; tend.disabled = tended;
        tend.onclick = () => { W['tg.pt.' + today] = t.units; _gdSave(); gtgPublishSoon(); _gtgvDraw(gardenHere()); paint(); };
        el.appendChild(tend);
        el.appendChild(gpEl('p', 'muted', `Today so far: ${t.tasks} finished task${t.tasks === 1 ? '' : 's'}, ${t.focus} minutes of focus. Tend it later and it will take more of that in.`));
        const weigh = gpEl('button', 'btn btn-ghost', days >= GTG_VEG.min ? 'Put it on the scales' : `${GTG_VEG.min - days} more day${GTG_VEG.min - days === 1 ? '' : 's'} until the scales`); weigh.type = 'button'; weigh.disabled = days < GTG_VEG.min;
        weigh.onclick = () => { const r = _gtgvWeigh(); if (!r) return; gardenToast(`${r.kg.toFixed(1)} kg${r.record ? ', your best yet' : ''}. ${r.t} tickets`, { icon: 'trophy', kind: 'ok', timeout: 6000 }); _gtgvDraw(gardenHere()); paint(); };
        el.appendChild(weigh);
      }
      const best = _gtgvBest();
      if (best || friends.length) {
        el.appendChild(gpEl('h3', 'gd-h3', 'The heaviest yet'));
        if (best) el.appendChild(gpEl('p', null, `You: ${_gtgKg(best)} kg`));
        for (const f of friends) el.appendChild(gpEl('p', null, `${f.name}: ${_gtgKg(f.tg.pv[2])} kg`));
      }
    };
    paint();
  });
}
function _gtgvDraw(m) {
  const T = GTG_VEG_AT; let I = 0, u = 0, on = false;
  if (m.visit) { const v = _gtgTheirs(m).pv; if (v && v[1] > 0) { on = true; I = v[0]; u = v[1]; } }
  else { const P = _gtgvGet(); if (P) { on = true; I = Math.max(0, GTG_VEG.kinds.findIndex(k => k.id === P.k)); u = _gtgvUnits(); } }
  if (!on) { gtgSprite('veg', null); return; }
  const K = GTG_VEG.kinds[I] || GTG_VEG.kinds[0], kg = u / 10, svg = gtgVegSvg(I, u) + (kg >= 1 ? gtgSaySvg(`${_gtgKg(u)} kg`, 12) : '');
  gtgSprite('veg', { x: T.x, y: T.y, z: T.y, hit: Math.min(2.2, 0.8 + Math.sqrt(kg) * 0.08), hitUp: 18, label: m.visit ? `Their ${K.name.toLowerCase()}` : `Your ${K.name.toLowerCase()}`, svg, onClick: () => (m.visit ? wdTalk({ lines: [`${_gscFirst(m.visit.fid)}’s ${K.name.toLowerCase()}. ${_gtgKg(u)} kg, and it is not done yet.`], bye: 'Blimey' }) : gardenVegOpen()) });
}
gardenPlayAdd({ id: 'tg-veg', name: 'The prize vegetable', icon: 'carrot', group: 'pet', blurb: 'Tend one vegetable a day, and your real work feeds it. It stands in your garden at its real size, and friends can see it.', status: () => { try { const P = _gtgvGet(); return P ? `${_gtgKg(_gtgvUnits())} kg` : ''; } catch (e) { return ''; } }, open: gardenVegOpen });
wdMod({ id: 'tg-veg', visit: true, begin(m) { _gtgvDraw(m); }, painted(m) { _gtgvDraw(m); } });
