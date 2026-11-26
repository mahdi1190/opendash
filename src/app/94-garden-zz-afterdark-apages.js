/* ============================================================
   AFTER DARK, the pages: the Field Journal's night pages (Places, under "The night sky"), the notice board's "Tonight's sky" card (what is
   up tonight, and what is coming a day ahead: a named moon, the vale lights, a comet, falling stars; mushrooms after rain; Wick's weather
   with the sayings its signs bring), and the words on the sky chip ("Autumn · night · the Owl Moon").
   ============================================================ */
/** The sky chip's words for tonight, or ''. */
function gardenNightChipWords(m) {
  try {
    if (!adOn() || !(m.tod === 'night' || m.tod === 'dusk')) return '';
    const N = adNow(m), row = N.moon.full ? N.moon.row : null;
    if (row) return row.name.replace(/^The /, 'the ');
    if (N.tod === 'night' && N.sky.aurora) return 'the vale lights';
    if (N.tod === 'night' && N.sky.comet) return 'a comet';
    if (N.tod === 'night' && N.sky.shower) return 'falling stars';
    return '';
  } catch (e) { return ''; }
}
/* ---------- the notice board ---------- */
function gardenNightBoard(el, m) {
  if (!adOn()) return;
  const N = adNow(m), M = N.moon, row = M.full ? M.row : null, nx = adNextMoon(N.night, N.south), C = _gcpCard('Tonight’s sky', 'moon');
  const p = (t, cls) => { if (t) C.appendChild(_gdpEl('p', cls || 'gca-p', t)); };
  const moon = _gdpEl('div', 'ad-board-moon'); moon.innerHTML = `<svg viewBox="-14 -14 28 28" width="34" height="34" aria-hidden="true">${adMoonSvg(M.age, 11, row ? row.css : '')}</svg>`;
  const mt = _gdpEl('span'); mt.appendChild(_gdpEl('b', null, row ? `${row.name} is full` : M.name === 'new' ? 'A new moon' : `A ${M.name} moon`)); mt.appendChild(_gdpEl('small', 'muted', row ? (adHas(row.keep) ? row.line : 'Something happens on its nights. ' + row.hint) : nx ? `${nx.row.name} is in ${_wdPlural(nx.days, 'night')}.` : '')); moon.appendChild(mt); C.appendChild(moon);
  if (nx && nx.days === 1) p(`Tomorrow night: ${nx.row.name}. Something happens on it.`);
  if (row && row.id === 'owl') p('Wick: “The Owl Moon. Everything that ever learned to fly at night is out. You are doing well, you know. Better than you think.”', 'gca-p ad-wick');
  if (N.sky.aurora && N.tod === 'night') p('The vale lights are out tonight. Look at the water.');
  if (N.sky.comet) p(`The comet is up: ${N.sky.comet >= 1 ? 'at its brightest tonight' : N.sky.comet >= 0.75 ? 'bright tonight' : 'faint, but there'}. Lie down on the grass and look up.`);
  if (N.sky.shower) p(`The ${N.sky.shower.name} ${N.tod === 'night' ? 'are falling tonight' : 'fall tonight'}: a star every minute or so, if the sky is clear.`);
  if (typeof adSkyTomorrow === 'function') p(adSkyTomorrow(N));
  if (typeof adStarsNow === 'function') { const st = adStarsNow(N, m).find(s => s.fresh); if (st && !adGet('sf.' + st.nn)) p('Something came down in the night. Look for a thin line of smoke.'); }
  if (typeof adRainedLast === 'function' && m.season !== 'winter' && N.hour >= 5 && N.hour < 13 && adRainedLast(m, N)) p('It rained in the night. There may be mushrooms under the trees.');
  if (typeof gardenNightDanceBoard === 'function') p(gardenNightDanceBoard(m, N));   // (9music: Friday for tomorrow, Saturday for tonight)
  if (typeof adLanternNight === 'function' && adLanternNight(Object.assign({}, m, { tod: 'night' }), N)) p('It is lantern week. After dusk, fold a paper lantern by the still water and set it drifting. Your friends’ lanterns drift on yours too.');
  // Wick's weather: what the signs say today (reading it here counts as hearing them)
  if (!m.visit && typeof _adrSigns === 'function') {
    const signs = _adrSigns(m, N);
    for (const s of signs) { p(`Wick’s weather: “${s.words}”`, 'gca-p ad-wick'); if (!adGet('sy.' + s.id)) adSet('sy.' + s.id, N.day); }
    const g = Number(adGet('vg.' + N.dn)) || 0; if (g) p(`You told the weathervane: ${AD_GUESS[g].toLowerCase()} tomorrow.`, 'gca-p muted');
  }
  const f = _gdpEl('div', 'gd-card-f'); f.appendChild(_gdpBtn('The moon calendar', { icon: 'moon', run: () => gardenNightMoonOpen() })); C.appendChild(f);
  el.appendChild(C);
}
/* ---------- the Field Journal: under "The night sky" ---------- */
function gardenNightJournal(right, m) {
  if (GARDEN_WORLD.v < 3) return;
  const N = adOn() ? adNow(m) : null, box = right.appendChild(_gjEl('div', 'gj-sky ad-gj'));
  box.appendChild(_gjEl('h3', null, 'The moons'));
  const nx = N ? adNextMoon(N.night, N.south) : null, list = box.appendChild(_gjEl('div', 'gj-skylist'));
  for (const row of AD_MOONS.concat([AD_MOON_BLUE])) { const seen = adGet('ms.' + row.id), next = nx && nx.row === row; list.appendChild(_gjEl('span', 'gj-star' + (seen ? ' is-on' : ''), seen ? row.name.replace(/^The /, '') : next ? row.name.replace(/^The /, '') + ` (in ${_wdPlural(nx.days, 'night')})` : '· · ·')); }
  const seen = AD_MOON_IDS.filter(id => adGet('ms.' + id)).length;
  box.appendChild(_gjEl('small', 'gj-hand', seen ? `${seen} of ${AD_MOON_IDS.length} named moons seen.` : 'Each month’s full moon has a name. Be out under one.'));
  const bits = [];
  const sk = [['aurora', 'the vale lights'], ['comet', 'a comet']].filter(([k]) => adGet('bs.' + k)).map(([k, w]) => `${w} on ${_gjDayWords(adGet('bs.' + k))}`);
  if (sk.length) bits.push('Seen ' + sk.join(', and ') + '.');
  const sfn = Number(adGet('sfn')) || 0; if (sfn) bits.push(`${_wdPlural(sfn, 'star stone')} picked up where stars fell.`);
  const gt = Number(adGet('gt')) || 0; if (gt) bits.push(`${_wdPlural(gt, 'glade')} found at the end of the little lights.`);
  const sy = AD_SAYINGS.filter(s => adGet('sy.' + s.id)).length; if (sy) bits.push(`${sy} of ${AD_SAYINGS.length} weather sayings heard.`);
  // with friends (8friends, 9music)
  const named = typeof adNamedStars === 'function' ? adNamedStars(null) : [];
  if (named.length) bits.push('Named with a friend: ' + named.map(r => `${r.name}, in ${r.row.name.replace(/^The /, 'the ')}`).join('; ') + '.');
  const ln = Object.keys(_wdG()).filter(k => /^ad\.ly\d{4}$/.test(k)).reduce((n, k) => n + (Number(_wdG()[k]) || 0), 0); if (ln) bits.push(`${_wdPlural(ln, 'paper lantern')} set on still water.`);
  const bk = Number(adGet('bkt')) || 0; if (bk) bits.push(`${_wdPlural(bk, 'coin')} in the busking hat, all told.`);
  const dn = Number(adGet('dn')) || 0; if (dn) bits.push(`Danced at ${_wdPlural(dn, 'barn dance')}.`);
  for (const b of bits) box.appendChild(_gjEl('p', 'gj-hand', b));
  const act = box.appendChild(_gjEl('div', 'gj-acts')); act.appendChild(_gdpBtn('The moon calendar', { icon: 'moon', run: () => gardenNightMoonOpen() }));
}
function _gjDayWords(iso) { const s = String(iso || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'a night'; return Number(s.slice(8, 10)) + ' ' + _WD_MONTHS[Number(s.slice(5, 7)) - 1]; }
