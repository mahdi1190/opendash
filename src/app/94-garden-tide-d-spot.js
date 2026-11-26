/* ============================================================
   THE WEEKLY SPOTTER CARD (FUN-ROADMAP phase 2, the friends piece, theme B). Every Monday a three by three card of things to spot this
   week: sea glass at low water, a fish caught in the rain, a sandcastle with a flag, a crab race won, a moth under a full moon (only in
   a week that has one), something given back to one of the folk... picked by the week, so every friend has the same card. Do one and
   its square is stamped. FRIENDS SHARE THE CARD: a square any of you has stamped is stamped for all of you, and each stamp shows the
   little faces of who found it (their stamps come in their snapshot, ti.sp). A line of three gives a prize; the whole card a bigger
   one, and the first time a frame for a group photo to stand in your garden. A week of real work adds one free "wild" stamp of your own
   (worked out on this device only from what you finished: it is never shown to anyone, and nothing about it leaves this device).
   Saved: g.wd['tsp.<week>'] [ids you stamped], g.wd['tspw.<week>'] the square your wild stamp went on; rewards in the ledger
   (tsp.<week>.L<line>, tsp.<week>.full, tsp.frame).
   ============================================================ */
const GT_SPOT_LINES = Object.freeze([[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]);
const GT_SPOT_PAY = Object.freeze({ line: 10, full: 50, frame: 'spotter-frame' });
const _isF = (d, what) => d.kind === 'tide' && d.find && (typeof gardenTideFindDef === 'function' ? (gardenTideFindDef(d.find) || {}).what === what : false);
const GT_SPOT = Object.freeze([
  Object.freeze({ id: 'sea-glass', t: 'A piece of sea glass', ic: 'sh:glass-green', test: (d) => _isF(d, 'glass') }),
  Object.freeze({ id: 'low-shell', t: 'A shell at low water', ic: 'sh:cockle', test: (d) => _isF(d, 'shell') }),
  Object.freeze({ id: 'driftwood', t: 'A bit of driftwood', ic: 'sh:driftwood', test: (d) => _isF(d, 'wood') }),
  Object.freeze({ id: 'shore-stone', t: 'A stone from the shore', ic: 'sh:pebble-banded', test: (d) => _isF(d, 'stone') }),
  Object.freeze({ id: 'blue', t: 'Something blue from the shore', ic: 'sh:glass-blue', hard: 1, test: (d) => d.kind === 'tide' && (d.find === 'glass-blue' || d.find === 'limpet-blue') }),
  Object.freeze({ id: 'pool-life', t: 'Something from a rock pool', ic: 'fish', test: (d) => d.kind === 'tide' && !!d.pool }),
  Object.freeze({ id: 'castle', t: 'Build a sandcastle', ic: 'flag', test: (d) => d.kind === 'shore' && d.what === 'castle' && d.first }),
  Object.freeze({ id: 'castle-flag', t: 'A flag on your sandcastle', ic: 'flag', hard: 1, test: (d) => d.kind === 'shore' && d.what === 'castle' && d.flag }),
  Object.freeze({ id: 'crab-win', t: 'Win a crab race', ic: 'trophy', test: (d) => d.kind === 'shore' && d.what === 'race' && d.won }),
  Object.freeze({ id: 'six-skips', t: 'Six skips or more', ic: 'waves', test: (d) => d.kind === 'shore' && d.what === 'skim' && d.skips >= 6 }),
  Object.freeze({ id: 'curve', t: 'A curving league throw', ic: 'waves', hard: 1, test: (d) => d.kind === 'shore' && d.what === 'skim' && d.curve }),
  Object.freeze({ id: 'bottle', t: 'A message in a bottle', ic: 'mail', test: (d) => d.kind === 'shore' && d.what === 'bottle' }),
  Object.freeze({ id: 'lost', t: 'Give back something lost', ic: 'heart', test: (d) => d.kind === 'shore' && d.what === 'lost' && d.back }),
  Object.freeze({ id: 'pits', t: 'Win at pebble pits', ic: 'gamepad-2', test: (d) => d.kind === 'shore' && d.what === 'pits' && d.won }),
  Object.freeze({ id: 'chat', t: 'A chat with one of the folk', ic: 'message-circle', test: (d) => d.kind === 'shore' && d.what === 'talk' }),
  Object.freeze({ id: 'fish-rain', t: 'A fish caught in the rain', ic: 'umbrella', test: (d, m) => d.kind === 'fish' && !!(m.rain && m.rain.now) }),
  Object.freeze({ id: 'fish-dawn', t: 'A fish at dawn', ic: 'sunrise', test: (d, m) => d.kind === 'fish' && m.tod === 'dawn' }),
  Object.freeze({ id: 'fish-dusk', t: 'A fish at dusk', ic: 'sunset', test: (d, m) => d.kind === 'fish' && m.tod === 'dusk' }),
  Object.freeze({ id: 'bug-night', t: 'A bug after dark', ic: 'moon', test: (d, m) => d.kind === 'bug' && m.tod === 'night' }),
  Object.freeze({ id: 'moth-moon', t: 'A moth under a full moon', ic: 'moon', hard: 1, moon: 1, test: (d, m) => d.kind === 'bug' && /moth/.test(d.id || '') && m.tod === 'night' && _gtsFull() }),
  Object.freeze({ id: 'new-fish', t: 'A fish you have never caught', ic: 'fish', hard: 1, test: (d) => d.kind === 'fish' && d.isNew }),
  Object.freeze({ id: 'harvest', t: 'Pick something you grew', ic: 'sprout', test: (d) => d.kind === 'harvest' }),
  Object.freeze({ id: 'plant-rain', t: 'Plant something in the rain', ic: 'umbrella', season: ['spring', 'autumn'], test: (d, m) => d.kind === 'plant' && !!(m.rain && m.rain.now) }),
  Object.freeze({ id: 'craft', t: 'Make something at the bench', ic: 'hammer', test: (d) => d.kind === 'craft' }),
  Object.freeze({ id: 'star', t: 'Spot a new star', ic: 'sparkles', test: (d) => d.kind === 'wonder' && d.what === 'star' }),
  Object.freeze({ id: 'storm', t: 'Something a storm brought in', ic: 'sh:glass-float', hard: 1, test: (d) => _isF(d, 'storm') || (d.kind === 'tide' && !!d.chest) }),
  Object.freeze({ id: 'snow-fish', t: 'A fish caught in the snow', ic: 'snowflake', season: ['winter'], test: (d, m) => d.kind === 'fish' && !!(m.rain && m.rain.snow) }),
]);
const _gtsp = { m: null, mAt: 0, card: null, cardWeek: -1, listening: false, toldWeek: -1 };
/** Is the moon full tonight (about a day and a half either side)? */
function _gtsFull() { try { const M = gardenTideMoon(_gdToday()); return M.full && M.kind === 'big'; } catch (e) { return false; } }
/** Does this week have a full moon in it (Monday to Sunday)? */
function _gtsWeekFull(week) { for (let k = 0; k < 7; k++) { const iso = _gdAddDays('2026-01-05', week * 7 + k); try { const M = gardenTideMoon(iso); if (M.full && M.kind === 'big' && Math.abs(M.age - 14.77) < 1) return true; } catch (e) { /* no moon */ } } return false; }
/** This week's card: nine spottables, picked by the week (and the season, and the moon): the same for everyone. */
function gardenSpotCard(week) {
  week = week == null ? gardenShoreWeek() : week;
  if (_gtsp.cardWeek === week && _gtsp.card) return _gtsp.card;
  let season = 'autumn'; try { season = gardenHere().season; } catch (e) { /* the usual */ }
  const full = _gtsWeekFull(week), pool = GT_SPOT.filter(s => (!s.season || s.season.includes(season)) && (!s.moon || full));
  const r = gardenRand(gardenHash('tide-spot|' + week)), easy = pool.filter(s => !s.hard), hard = pool.filter(s => s.hard), pick = [];
  const take = (list, n) => { const l = list.slice(); for (let i = 0; i < n && l.length; i++) pick.push(l.splice(Math.floor(r() * l.length), 1)[0]); };
  take(hard, 2); take(easy.filter(s => !pick.includes(s)), 9 - pick.length);
  for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
  _gtsp.card = pick.slice(0, 9); _gtsp.cardWeek = week;
  return _gtsp.card;
}
function _gtsMine(week) { const v = _gdG().wd['tsp.' + week]; return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; }
/** Who stamped each square this week: Map id -> [{me} | {friend}] (your wild stamp counts only for you). */
function gardenSpotStamps(week) {
  week = week == null ? gardenShoreWeek() : week;
  const out = new Map(), add = (id, who) => { let l = out.get(id); if (!l) out.set(id, l = []); l.push(who); };
  for (const id of _gtsMine(week)) add(id, { me: true });
  const wild = _gdG().wd['tspw.' + week]; if (typeof wild === 'string') add(wild, { me: true, wild: true });
  for (const f of gardenShoreFriends()) { const sp = f.ti && f.ti.sp; if (Array.isArray(sp) && sp[0] === week && Array.isArray(sp[1])) for (const id of sp[1]) add(id, { friend: f }); }
  return out;
}

/* ---------- stamping ---------- */
function _gtsHeard(ev) {
  const d = ev && ev.detail; if (!d || !d.kind) return;
  if (gardenShoreVisit() && !['shore', 'tide', 'fish', 'bug'].includes(d.kind)) return;   // (on a visit, what you do yourself still counts: fish, finds, the shore's games)
  const week = gardenShoreWeek(), card = gardenSpotCard(week), mine = _gtsMine(week);
  let m = null; try { m = gardenHere(); } catch (e) { return; }
  const det = d;   // (a catch comes as kind 'fish' or 'bug': _gdEmit('catch', {kind: 'fish', ...}) lets the detail's kind stand)
  for (const s of card) {
    if (mine.includes(s.id)) continue;
    let ok = false; try { ok = !!s.test(det, m); } catch (e) { ok = false; }
    if (!ok) continue;
    const W = _gdG().wd; W['tsp.' + week] = mine.concat([s.id]).slice(0, 9); mine.push(s.id);
    for (const k of Object.keys(W)) if (k.startsWith('tsp.') && /^tsp\.\d+$/.test(k) && Number(k.slice(4)) < week - 2) delete W[k];
    _wdSave();
    gardenShoreSay(`Spotter card: ${s.t.charAt(0).toLowerCase() + s.t.slice(1)}. Stamped!`, 'sparkles', 5000);
    try { gpTone([784, 988], { len: .18, vol: .05 }); } catch (e) { /* quiet */ }
    try { if (typeof _gscPublishSoon === 'function') _gscPublishSoon(4000); } catch (e) { /* the next check */ }
    _gtsPrizes(week);
  }
}
/** Lines of three and the full card: each pays once a week, on every friend's screen for themselves. */
function _gtsPrizes(week, quiet) {
  const card = gardenSpotCard(week), st = gardenSpotStamps(week), got = card.map(s => st.has(s.id)), out = [];
  GT_SPOT_LINES.forEach((L, k) => { if (L.every(i => got[i]) && gardenShoreGive('tsp.' + week + '.L' + k, { c: GT_SPOT_PAY.line, x: 2 })) out.push('line'); });
  if (got.every(Boolean)) {
    const first = !_gdG().led['tsp.frame'], gift = { c: GT_SPOT_PAY.full, x: 5, i: first ? { ['decor:' + GT_SPOT_PAY.frame]: 1 } : {} };
    if (gardenShoreGive('tsp.' + week + '.full', gift)) { if (first) gardenShoreGive('tsp.frame', { x: 1 }); out.push('full'); setTimeout(() => { try { gardenToast(`The whole spotter card! ${gardenShoreGiftWords(gift).replace(/^./, c => c.toUpperCase())}.${first ? ' Stand the frame up for a group photo.' : ''}`, { icon: 'trophy', timeout: 7000 }); } catch (e) { /* fine */ } }, 1800); }
  }
  const lines = out.filter(x => x === 'line').length;
  if (lines && !quiet) setTimeout(() => { try { gardenToast(`${lines === 1 ? 'A line' : lines + ' lines'} on the spotter card: ${lines * GT_SPOT_PAY.line} coins.`, { icon: 'gift', timeout: 5000, action: { label: 'See the card', run: () => gardenSpotOpen() } }); } catch (e) { /* fine */ } }, 900);
  return out;
}
/** A week of real work: one wild stamp, on the first square nobody has stamped yet. Counted here only: nothing about your work leaves
 *  this device or shows to anyone (not even that there was any). */
function _gtsWild(week) {
  const W = _gdG().wd; if (typeof W['tspw.' + week] === 'string') return;
  let n = 0; try { const A = typeof _gdAct === 'function' ? _gdAct() : null; if (A && A.days) for (let k = 0; k < 7; k++) { const iso = _gdAddDays('2026-01-05', week * 7 + k), r = A.days.get(iso); if (r && (r.n > 0 || r.focusMin >= 25)) n++; } } catch (e) { return; }
  if (n < 3) return;
  const card = gardenSpotCard(week), st = gardenSpotStamps(week), free = card.find(s => !st.has(s.id)); if (!free) return;
  W['tspw.' + week] = free.id; _wdSave();
  gardenShoreSay(`A good week. A wild stamp on your spotter card: ${free.t.charAt(0).toLowerCase() + free.t.slice(1)}.`, 'sparkles', 6000);
  _gtsPrizes(week);
}
/** For the snapshot (ti.sp): the squares you stamped yourself this week (never the wild one). */
GT_WIRE.push((out) => { const week = gardenShoreWeek(), mine = _gtsMine(week).filter(id => /^[a-z0-9-]{1,24}$/.test(id)); if (mine.length) out.sp = [week, mine.slice(0, 9)]; });

/* ---------- the card ---------- */
function _gtsIcon(ic, px) { if (String(ic).startsWith('sh:')) return gardenTideFindSvg(ic.slice(3), px); return icon(ic); }
function gardenSpotOpen() {
  if (typeof gpStage !== 'function') return;
  const week = gardenShoreWeek(); _gtsPrizes(week, true);
  gpStage('This week’s spotter card', (el) => {
    el.classList.add('gtsp-panel');
    const mon = _gdAddDays('2026-01-05', week * 7), sun = _gdAddDays(mon, 6), fmt = (iso) => { try { return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch (e) { return iso; } };
    el.appendChild(gpEl('p', 'muted', `${fmt(mon)} to ${fmt(sun)}. Friends share the card: what any of you spots is stamped for everyone, with the face of who found it. A line of three pays ${GT_SPOT_PAY.line} coins; the whole card ${GT_SPOT_PAY.full}.`));
    const card = gardenSpotCard(week), st = gardenSpotStamps(week), grid = gpEl('div', 'gtsp-card'); grid.setAttribute('role', 'grid'); grid.setAttribute('aria-label', 'Spotter card');
    const got = card.map(s => st.has(s.id)), done = new Set(); GT_SPOT_LINES.forEach(L => { if (L.every(i => got[i])) L.forEach(i => done.add(i)); });
    card.forEach((s, i) => {
      const who = st.get(s.id) || [], c = gpEl('div', 'gtsp-sq' + (who.length ? ' is-stamped' : '') + (done.has(i) ? ' is-line' : '') + (s.hard ? ' is-hard' : ''));
      c.setAttribute('role', 'gridcell'); c.setAttribute('aria-label', s.t + (who.length ? ': stamped' : ': not yet'));
      c.innerHTML = `<span class="gtsp-ic">${_gtsIcon(s.ic, 30)}</span><span class="gtsp-t">${esc(s.t)}</span>`;
      if (who.length) {
        const stamp = gpEl('span', 'gtsp-stamp'); stamp.innerHTML = who.some(w => w.wild) && who.length === 1 ? '<b>Wild</b>' : '<b>Spotted</b>'; c.appendChild(stamp);
        const faces = gpEl('span', 'gtsp-faces');
        for (const w of who.slice(0, 4)) { if (w.me) { const me = gpEl('span', 'gtsp-me', 'You'); faces.appendChild(me); } else if (w.friend) { try { const a = typeof friendAvatarEl === 'function' && w.friend.f ? friendAvatarEl(w.friend.f, 18) : gpEl('span', 'gtsp-me', w.friend.name.slice(0, 1)); a.title = w.friend.name; a.classList.add('gtsp-face'); faces.appendChild(a); } catch (e) { /* no face */ } } }
        c.appendChild(faces);
      }
      grid.appendChild(c);
    });
    el.appendChild(grid);
    const lines = GT_SPOT_LINES.filter(L => L.every(i => got[i])).length;
    el.appendChild(gpEl('p', 'gtsp-foot', got.every(Boolean) ? 'The whole card! A new one comes on Monday.' : lines ? `${lines} line${lines === 1 ? '' : 's'} so far. ${9 - got.filter(Boolean).length} square${9 - got.filter(Boolean).length === 1 ? '' : 's'} to go.` : `${got.filter(Boolean).length} of 9 stamped. A new card comes every Monday.`));
  });
}
if (typeof gardenPlayAdd === 'function') gardenPlayAdd({ id: 'tide-spot', name: 'Spotter card', icon: 'sparkles', group: 'games', blurb: 'Nine things to spot this week. Friends share the card, and every line of three pays.', status: () => { try { const w = gardenShoreWeek(), st = gardenSpotStamps(w), n = gardenSpotCard(w).filter(s => st.has(s.id)).length; return `${n} of 9 this week`; } catch (e) { return ''; } }, open: () => gardenSpotOpen() });
setTimeout(() => {
  if (!_gtsp.listening) { _gtsp.listening = true; document.addEventListener('opendash:garden', (ev) => { try { _gtsHeard(ev); } catch (e) { console.error('[spotter]', e); } }); }
  if (typeof wdMod === 'function') wdMod({ id: 'tide-spot', visit: false, fun: false, begin() { this.t = 0; }, tick(m) {
    const now = Date.now(); if (now - this.t < 20000) return; this.t = now;   // clock-ok: the pace
    const week = gardenShoreWeek();
    try { _gtsWild(week); _gtsPrizes(week); } catch (e) { /* later */ }
    if (_gtsp.toldWeek !== week && _gdG().wd['tspt'] !== week) { _gtsp.toldWeek = week; _gdG().wd['tspt'] = week; _wdSave(); gardenShoreSay('A new spotter card is up for the week. Menu, Play, Spotter card.', 'sparkles', 6000); }
    void m;
  } });
}, 0);

/* ---------- the shore's games in the Field Journal (Keepsakes) ---------- */
function gardenShoreGamesShelf(left) {
  const g = _gdG(), led = Object.keys(g.led), count = (pre) => led.filter(k => k.startsWith(pre)).length;
  const h = left.appendChild(_gjEl('div', 'gj-ptitle')); h.innerHTML = '<h3>Games on the shore</h3><i class="gj-hand">what you have done on the sand</i>';
  const box = left.appendChild(_gjEl('div', 'gtsg-shelf'));
  const sk = typeof _gtskMine === 'function' ? _gtskMine() : { r: 0, b: 0 };
  const pits = typeof GT_PITS_WAY !== 'undefined' ? Object.keys(GT_PITS_WAY).filter(w => g.disc['td.pits.' + w]).length : 0;
  const rows = [
    ['flag', 'Sandcastles', count('tdcd.') ? `${count('tdcd.')} day${count('tdcd.') === 1 ? '' : 's'} of building, ${count('tdcf.')} flag${count('tdcf.') === 1 ? '' : 's'} from the folk` : 'Build one on the open sand before the tide comes in.'],
    ['trophy', 'Crab races', Number(g.wd.tdr) ? `${g.wd.tdr} won${Number(g.wd.tdr) >= 5 ? ', and the cup' : ''}` : 'At any rock pool at low water.'],
    ['waves', 'The skimming league', sk.b ? `${sk.r >= 6 ? 'Champion' : 'Climbed past ' + sk.r} this month, best throw ${sk.b}${g.led['tsk.stone'] ? '. Pip’s champion stone is yours' : ''}` : 'Three league throws a day at still water.'],
    ['gamepad-2', 'Pebble pits', pits ? `Beaten ${pits} of the 6 folk` : 'Any of the folk will play, on bare ground.'],
    ['heart', 'Lost and found', count('tlr.') + count('tlor.') ? `${count('tlr.') + count('tlor.')} thing${count('tlr.') + count('tlor.') === 1 ? '' : 's'} given back` : 'Someone usually has lost something. Ask about.'],
    ['sparkles', 'Spotter cards', count('tsp.') ? `${led.filter(k => /^tsp\.\d+\.L/.test(k)).length} lines, ${led.filter(k => /^tsp\.\d+\.full$/.test(k)).length} whole cards` : 'A new card every Monday, shared with friends.'],
  ];
  for (const [ic, t, s] of rows) { const r = box.appendChild(_gjEl('div', 'gtsg-row')); r.innerHTML = `<span class="gtsg-ic">${icon(ic)}</span><b>${esc(t)}</b><small>${esc(s)}</small>`; }
}
