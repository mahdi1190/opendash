/* ============================================================
   THE WEEK AND THE YEAR, in the world (the folk3 plan, steps 6 and 7; the rules: 94-garden-folk3-2week.js; the kit:
   94-garden-wonder-folk3-6kit.js). The folk's days already go to the market, the cards and the fair (the planner books them on the kit's
   places); this is what YOU can do there, what they say about it, and what it gives.
   - A stall (E or a click): its keeper's line, and once a day each a little something from it (Quince's honey, a seed Bramble found in his
     pocket, one of Pip's river stones, Perpetua's stamp), and a little more friendship with the keeper.
   - The card table: join the game once a week; everyone at the table is a little fonder of you, and it goes in the vale's story.
   - The brazier: warm your hands with everyone (the warm act you know). Taking part in a festival (a stall, the brazier with folk round it,
     the opening) gives its one thing once a year, wherever you are: the Frost Fair's is the Star lantern, for your garden.
   - The Frost Fair opens with a moment when you first come near it on a fair day (94-garden-wonder-folk3-8scene.js): a public one, so a
     friend in your garden sees it too. The week before, one short note says it is coming. If you miss it, nobody says so.
   - Each villager has a line for the day when something is on ("Card night. I always lose. I am very good at losing.").
   Never coins from any of it, never counts, streaks or "you missed".
   Saved (garden.wd, entry by entry): vwk.<row>.<who>.<day> (a stall looked at), vwkc.<week> (cards joined that week), vyc (cards joined),
   vym (stalls looked at), vf.<fest>.<year> (took part), vfo.<fest>.<day> (its opening seen), vfn.<fest>.<year> (its note said).
     gardenYearStall(q, row) / gardenYearWarm(q, row) / gardenYearCards(q, row)   the kit's moves (the prompt and a click)
     vf3DayLine(id, F, today)      a villager's line for what is on today (hook T3), or ''
     valeYearFacts(F, m)           F.weekday and F.fest for the day lines (hook T4)
     gardenYearFacts()             for the vale's story and the ribbons: { market, cards, fest }
     gardenYearBoardLine(m)        one line for the Games board: what is on today, and the next festival
     gardenYearBoxRows(el, m)      the Journal's year: the festivals and the week
   ============================================================ */
const _vyr = { noticeT: 0, openT: 0, stillT: 0 };
function _vyM() { try { return gardenHere(); } catch (e) { return null; } }
function _vyHour() { try { const p = Clock.parts(_gdNow()); return p.h + p.mi / 60; } catch (e) { const d = new Date(); return d.getHours() + d.getMinutes() / 60; } }
function _vyWho(id) { const r = VALE_FOLK_ROW.get(id); return r ? r.name : id; }
function _vyArt(id) { try { return typeof gardenCastSvg === 'function' ? gardenCastSvg((VALE_FOLK_ROW.get(id) || {}).cast || id) : ''; } catch (e) { return ''; } }
function _vyOnRow(m) { try { return m && typeof valeYearToday === 'function' ? valeYearToday(m.today, !!m.south) : null; } catch (e) { return null; } }
function _vyHours(row) { const h = _vyHour(); return !!row && h >= row.hours[0] && h < row.hours[1]; }
/** Friendship from something done together: once a day per villager per thing; on a visit at most one a villager a day (as games do). */
function _vyWarm(id, what, m) {
  if (typeof _wkAdd !== 'function' || !VALE_FOLK_ROW.has(id)) return false;
  const W = _wdG(), k = 'vyf.' + what + '.' + id; if (W[k] === m.today) return false;
  if (m.visit) { if (W['vgv.' + id] === m.today) return false; W['vgv.' + id] = m.today; }
  W[k] = m.today; _wkAdd(id, 1);
  const L = []; if (typeof _wkHeartUp === 'function') _wkHeartUp(id, _vyWho(id), L);
  if (L.length) setTimeout(() => { try { wdAmbient(L[0], 7000, 'folk'); } catch (e) { /* quiet */ } }, 2400);
  return true;
}
/** Who of the folk is at a place of today's kit now (the keeper behind a stall, the folk round the brazier or at the table). */
function _vyFolkNear(x, y, r) {
  const out = []; const L = typeof _vfr !== 'undefined' && _vfr.on ? (_vfr.list || []) : (typeof _vfg !== 'undefined' ? [..._vfg.V.values()] : []);
  for (const V of L) if (V && V.S && !V.inside && Number.isFinite(V.x) && Math.hypot(V.x - x, (V.y - y) * 1.2) <= r) out.push(V.id);
  return out;
}
/* ---------- taking part in a festival: its one thing, once a year ---------- */
function _vyTookPart(row, m, how) {
  if (!row || row.kind !== 'fest') return;
  const W = _wdG(), y = String(m.today).slice(0, 4), k = 'vf.' + row.id + '.' + y;
  if (!W[k]) { W[k] = m.today; _wdSave(); }
  if (!row.thing || typeof gpGrant !== 'function') return;
  let got = false; try { got = gpGrant('fest-' + row.id + '-' + y, { ['decor:' + row.thing]: 1 }); } catch (e) { got = false; }
  if (got) { const def = typeof gardenDecor === 'function' ? gardenDecor(row.thing) : null; setTimeout(() => { try { gardenToast(`${row.name}: ${def ? def.name : 'a keepsake'}, for your garden. It is in your bag.`, { icon: 'gift' }); } catch (e) { /* fine */ } }, how === 'open' ? 900 : 1800); }
}
/* ---------- the stalls ---------- */
const VY_STALL_GIFT = Object.freeze({
  quince: { item: 'honey', words: 'A jar of honey, “for the bees’ sake”' },
  bramble: { seed: 1, words: 'A seed packet Bramble found in his map case' },
  pip: { mat: 'mat:stone', words: 'One of Pip’s river stones' },
  perpetua: { keep: 'vy-stamp', words: 'A stamp, first class' },
  'quince-cakes': { item: 'honey', words: 'A honey cake and a jar to go with it' },
  'perpetua-cards': { keep: 'vy-winter-card', words: 'A winter card' },
});
function gardenYearStall(q, row) {
  const m = _vyM(); if (!m || !q) return false;
  const look = VALE_STALLS[q.look] || {}, who = q.who, here = _vyFolkNear(q.x, q.y - 0.5, 1.8).includes(who), W = _wdG(), lines = [], acts = [];
  if (!here) { wdTalk({ name: (look.sign || 'A stall'), art: '', lines: [`${_vyWho(who)}’s stall. A card on the counter says: “Back soon. Do not count the jars.”`], actions: [], at: { x: q.x, y: q.y }, bye: 'Later' }); return true; }
  lines.push(look.line || 'Have a look.');
  const k = 'vwk.' + (row ? row.id : 'day') + '.' + q.look + '.' + m.today;
  if (!W[k]) acts.push({ label: 'Take one', primary: true, run: (T) => {
    if (W[k]) return; W[k] = 1; W.vym = (Number(W.vym) || 0) + 1;
    const g = VY_STALL_GIFT[q.look] || {}, bits = [];
    let got = '';
    try {
      if (g.item && typeof _wkGrant === 'function') got = _wkGrant('vyg.' + q.look + '.' + m.today, g.item) ? g.words : '';
      else if (g.seed && typeof _wkGrant === 'function' && typeof _wkSeed === 'function') got = _wkGrant('vyg.' + q.look + '.' + m.today, _wkSeed('vy|' + m.today)) ? g.words : '';
      else if (g.mat && typeof _grGive === 'function') got = _grGive('vy.' + q.look, { [g.mat]: 1 }) ? g.words : '';
      else if (g.keep) { if (!W['kp.' + g.keep]) { W['kp.' + g.keep] = m.today; got = g.words + ' (kept on the Stories page, under Keepsakes)'; } }
    } catch (e) { got = ''; }
    if (got) bits.push(got + (g.keep ? '' : ': in your bag'));
    if (_vyWarm(who, 'stall', m)) bits.push(`${_vyWho(who)} is a little fonder of you`);
    if (row && row.kind === 'fest') _vyTookPart(row, m, 'stall');
    _wdSave(); try { _gdSave(); } catch (e) { /* the wd save carries it */ }
    T.say(bits.length ? bits.join('. ') + '.' : 'You have one already. They wave it away anyway.', []);
  } });
  wdTalk({ name: `${_vyWho(who)}: ${look.sign || 'a stall'}`, art: _vyArt(who), lines, actions: acts, at: { x: q.x, y: q.y }, bye: acts.length ? 'Just looking' : 'Thank you' });
  return true;
}
wdTaleKeep({ id: 'vy-stamp', name: 'A first-class stamp', text: 'From Perpetua’s stall on market day. “First class means it goes first. It does not mean it goes fast.”' });
wdTaleKeep({ id: 'vy-winter-card', name: 'A winter card', text: 'From Perpetua’s stall at the Frost Fair: a robin on a gate. It arrived before you got home, which she says is a first.' });
/* ---------- the brazier: warm your hands with everyone ---------- */
function gardenYearWarm(q, row) {
  const m = _vyM(); if (!m || !q) return false;
  // stand behind it facing out over it (the warm act's way round), else at whichever side is clear
  let stand = { x: q.x, y: q.y - 0.78 };
  if (typeof _gwFree === 'function' && !_gwFree(stand.x, stand.y)) for (const [dx, dy] of [[-0.6, -0.7], [0.6, -0.7], [-1.1, 0.05], [1.1, 0.05]]) if (_gwFree(q.x + dx, q.y + dy)) { stand = { x: q.x + dx, y: q.y + dy }; break; }
  try { if (typeof gartActRun === 'function') gartActRun('warm', { act: 'warm', kind: 'campfire', name: 'the brazier', x: q.x, y: q.y, stand, deg: 90 }); } catch (e) { /* standing is enough */ }
  setTimeout(() => {
    const near = _vyFolkNear(q.x, q.y, 3.2), bits = [];
    for (const id of near) _vyWarm(id, 'warm', m);
    if (near.length >= 2 && row && row.kind === 'fest') _vyTookPart(row, m, 'warm');
    const who = near.slice(0, 3).map(_vyWho);
    if (who.length) bits.push(who.length === 1 ? `${who[0]} budges up to make room.` : `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]} budge up to make room.`);
    else bits.push('Your hands come back to you, one finger at a time.');
    try { wdAmbient(bits.join(' '), 5200, 'folk'); } catch (e) { /* quiet */ }
  }, 1400);
  return true;
}
/* ---------- the card table ---------- */
const VY_CARDS_HANDS = Object.freeze([
  ['{a} deals. {b} wins the first hand and pretends not to have.', '{a} loses, beautifully.', 'You win one. Nobody can work out how, least of all you.'],
  ['{b} counts the cards. Then counts them again. There are fifty-one.', 'The missing one is found in {a}’s hat.', 'You play the last hand by lamplight. Everyone says “one more” twice.'],
  ['{a} explains the rules. They change halfway through.', '{b} wins with a card nobody remembers dealing.', 'You lose with great dignity, and they all say so.'],
]);
function _vyWeekKey(iso) { const d = new Date(iso + 'T12:00:00Z'), day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day); return d.toISOString().slice(0, 10); }   // clock-ok: the Monday of an ISO day's week
function gardenYearCards(q, row) {
  const m = _vyM(); if (!m || !q) return false;
  const at = _vyFolkNear(q.x, q.y, 2.2), W = _wdG(), wk = 'vwkc.' + _vyWeekKey(m.today);
  if (at.length < 1) { wdTalk({ name: 'The card table', art: '', lines: ['The cards are laid out face down, and a stone on them so they do not blow away. Nobody is playing yet. They come out after dark.'], actions: [], at: { x: q.x, y: q.y }, bye: 'Later' }); return true; }
  // stand at the table's near corner, facing it
  const side = _gw.px < q.x ? -1 : 1, stand = { x: q.x + side * 0.35, y: q.y + 0.85 };
  try { if (typeof gardenWalkToPoint === 'function' && Math.hypot(_gw.px - stand.x, _gw.py - stand.y) > 0.6) gardenWalkToPoint(stand, null, { radius: 0.4 }); } catch (e) { /* stand where you are */ }
  const a = _vyWho(at[0]), b = _vyWho(at[1] || at[0]), hand = VY_CARDS_HANDS[(typeof gardenHash === 'function' ? gardenHash('vyc|' + m.today) : 0) % VY_CARDS_HANDS.length].map(t => t.replace('{a}', a).replace('{b}', b));
  const first = !W[wk];
  wdTalk({ name: 'Card evening', art: _vyArt(at[0]), lines: [`“Sit in, sit in. There’s always room for one more loser.” ${a} deals you a hand.`].concat(hand), at: { x: q.x, y: q.y }, bye: 'Good night',
    actions: first ? [{ label: 'Thank them for the game', primary: true, run: (T) => {
      if (W[wk]) return; W[wk] = m.today; W.vyc = (Number(W.vyc) || 0) + 1;
      let warm = 0; for (const id of at) if (_vyWarm(id, 'cards', m)) warm++;
      let xp = false; try { xp = !!(typeof _grGive === 'function' && _grGive('vy.cards', { x: 1 })); } catch (e) { xp = false; }
      _wdSave();
      T.say([xp ? '+1 XP' : '', warm ? (warm === 1 ? `${a} is a little fonder of you` : 'everyone at the table is a little fonder of you') : ''].filter(Boolean).join('. ').replace(/^./, c => c.toUpperCase()) + (xp || warm ? '.' : '“Same time next week.”'), []);
    } }] : [] });
  return true;
}
/* ---------- what they say ---------- */
function valeYearFacts(F, m) {
  try { F.weekday = new Date(String(m.today) + 'T12:00:00Z').getUTCDay(); const f = typeof valeFestOn === 'function' ? valeFestOn(m.today, !!m.south) : null; F.fest = f ? f.id : ''; } catch (e) { /* plain day */ }   // clock-ok: the weekday of an ISO day
  // (only on a day the kit is out: a layout with no plaza has no market to talk about)
  if (!(typeof gardenKitToday === 'function' && gardenKitToday(m))) { F.weekday = -1; F.fest = ''; }
  return F;
}
function vf3DayLine(id, F, today) {
  const rows = (typeof VF3_DAY_LINES !== 'undefined' && VF3_DAY_LINES[id]) || []; if (!rows.length || F.weekday == null) return '';
  for (const l of rows) { let ok = false; try { ok = !!l.if(F); } catch (e) { ok = false; } if (ok) { const W = _wdG(); if (W['fy.' + id] === today) return ''; W['fy.' + id] = today; return l.t; } }
  return '';
}
/** A festival day (the story's heavy beats wait for another day: hook S1). */
function gardenYearFestDay(m) { try { return !!(m && typeof valeFestOn === 'function' && valeFestOn(m.today, !!m.south)); } catch (e) { return false; } }
function gardenYearFacts() { try { const W = _wdG(); return { market: Number(W.vym) || 0, cards: Number(W.vyc) || 0, fest: Object.keys(W).filter(k => k.startsWith('vf.')).length }; } catch (e) { return { market: 0, cards: 0, fest: 0 }; } }
/** One line for the Games board: what is on today (only when its kit is out), and the next festival a week or less away. */
function gardenYearBoardLine(m) {
  m = m || _vyM(); if (!m) return '';
  const bits = [], row = _vyOnRow(m);
  if (row && typeof gardenKitToday === 'function' && gardenKitToday(m)) bits.push(row.kind === 'fest' ? `${row.name} is on, ${row.hours[0] > 12 ? 'from ' + (row.hours[0] - 12) + ' till ' + (row.hours[1] - 12) : 'all day'}.` : row.line);
  try { const n = valeFestNext(m.today, !!m.south).find(x => x.days >= 1 && x.days <= 7); if (n) bits.push(`${n.row.name}: ${n.days === 1 ? 'tomorrow' : 'in ' + n.days + ' days'}.`); } catch (e) { /* none */ }
  return bits.join(' ');
}
function gardenYearBoxRows(el, m) {
  try {
    for (const x of valeFestNext(m.today, !!m.south)) {
      const d = _gdpEl('div', 'wd-yearrow' + (x.days === 0 ? ' is-now' : '')), dd = new Date(x.from + 'T12:00:00Z');
      d.innerHTML = `<span class="wd-date" aria-hidden="true"><b>${dd.getUTCDate()}</b><small>${esc(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dd.getUTCMonth()])}</small></span>`;
      const t = _gdpEl('span', 'wd-letter-t'); t.appendChild(_gdpEl('b', null, x.row.name + (x.days === 0 ? ': now' : ''))); t.appendChild(_gdpEl('small', 'muted', x.row.blurb)); d.appendChild(t); el.appendChild(d);
    }
    const wk = _gdpEl('div', 'wd-yearrow'); wk.innerHTML = `<span class="wd-env" aria-hidden="true">${typeof icon === 'function' ? icon('calendar') : ''}</span>`;
    const t = _gdpEl('span', 'wd-letter-t'); t.appendChild(_gdpEl('b', null, 'Every week')); t.appendChild(_gdpEl('small', 'muted', VALE_YEAR_ROWS.filter(r => r.kind === 'week').map(r => r.blurb).join(' '))); wk.appendChild(t); el.appendChild(wk);
  } catch (e) { /* later */ }
}
/* ---------- the fair: the note the week before, and its opening ---------- */
function _vyNotice(m) {
  if (m.visit || performance.now() - _vyr.noticeT < 20000) return; _vyr.noticeT = performance.now();
  let n = null; try { n = valeFestNext(m.today, !!m.south).find(x => x.days >= 1 && x.days <= 7); } catch (e) { n = null; }
  if (!n || !n.row.notice) return;
  const W = _wdG(), k = 'vfn.' + n.row.id + '.' + n.from.slice(0, 4); if (W[k]) return;
  if ((typeof _wd !== 'undefined' && (_wd.talk || _wd.t < 40)) || (typeof wdWalkingLately === 'function' && wdWalkingLately())) return;
  W[k] = m.today; _wdSave();
  try { wdAmbient(n.row.notice, 9000, 'folk'); } catch (e) { /* quiet */ }
}
function _vyOpening(m) {
  if (m.visit || typeof gardenScenePlay !== 'function' || performance.now() - _vyr.openT < 3000) return; _vyr.openT = performance.now();
  const row = _vyOnRow(m); if (!row || row.kind !== 'fest' || !row.open || !_vyHours(row)) return;
  const K = typeof gardenKitToday === 'function' ? gardenKitToday(m) : null, mid = typeof gardenKitMark === 'function' ? gardenKitMark('middle') : null; if (!K || !mid) return;
  const W = _wdG(), k = 'vfo.' + row.id + '.' + m.today; if (W[k]) return;
  if (Math.hypot(_gw.px - mid.x, _gw.py - mid.y) > 18) return;
  if ((typeof _wd !== 'undefined' && _wd.talk) || (typeof gardenGameBusy === 'function' && gardenGameBusy()) || (typeof gardenSceneBusy === 'function' && gardenSceneBusy()) || (typeof gartActBusy === 'function' && gartActBusy())) return;
  if (typeof wdWalkingLately === 'function' && wdWalkingLately()) return;
  if (gardenScenePlay(row.open, { public: true })) { W[k] = m.today; _wdSave(); _vyTookPart(row, m, 'open'); }
}
wdMod({
  id: 'vale-year', pref: 'folk', visit: true,
  begin() { _vyr.noticeT = 0; _vyr.openT = 0; },
  tick(m) { try { if (!(typeof gardenFolkLive === 'function' && gardenFolkLive())) return; _vyNotice(m); _vyOpening(m); } catch (e) { console.error('[vale year]', e); } },
  end() { },
});
/** Console only (and the sandbox check): what the kit and the year say today. */
function gardenYearDev() { const m = _vyM(); return JSON.stringify({ row: (_vyOnRow(m) || {}).id || '', hours: _vyHours(_vyOnRow(m)), board: gardenYearBoardLine(m), facts: gardenYearFacts() }); }
