/* ============================================================
   AFTER DARK, music with friends (FUN-ROADMAP Phase 8): the busking hat, and barn dance night. Both stand on playing music together
   (94-garden-zz-7act-3music.js: any thing whose kind has music places, one shared tune clock, gmNow) and on the vale's folk (the host's
   villagers, seen by guests through gl:fk). Nothing here names a place: a pitch is any thing of a kind with music places, a floor is the
   ground in front of any pitch or barn, read from its own drawn footing and its front.

   THE BUSKING HAT. While anyone plays at a pitch between 06:00 and 23:00 (the host's clock), an upturned hat lies in front of it, on every
   screen. The host's villagers who are awake and about within AD_BUSK.near cells stop by to watch, up to three (one more for each extra
   player), in a half ring in front, facing the band; they stay while the tune plays. While you play, a ring round your feet beats the
   quarter notes of the shared tune: tap Space on the beat, or click the ring (E still puts the instrument down). Eight good taps in a row:
   one of the watchers dances. At the end of each full tune with somebody watching (villagers or friends), your own app pays you coins:
   up to AD_BUSK.coins a tune, AD_BUSK.day a day (busking never stands in for real work); once a day the season's wild flower too, and
   your first coin is a keepsake. Later that day a villager who watched you hums your tune as you pass.
   BARN DANCE NIGHT. On Saturdays (the host's day) from dusk until 22:30, at the floor nearest most of the villagers' homes, and on any
   dusk or night when two or more people play at a pitch (that pitch's floor). The notice board says so on Friday. The band's tune if
   anyone plays; otherwise a quiet fiddle and drum from the pitch, heard within AD_DANCE.ear cells, only while the garden is showing (the
   garden's own song pauses under it, as it does for the band). On the floor, E: Dance. Arrows come along the strip to the line on the
   beat: arrow keys, W A S D, or the big buttons; a miss costs nothing. Every four good steps you dance or twirl (friends see it, your pet
   joins in). Two of you dancing within a step and a half: "Swing your partner!" and double steps for eight beats. The caller's calls come
   from the shared bar number, the same on every screen. Five paper lanterns round the floor light one for each dancer and each villager
   watching; all five: the last eight bars of each tune are the big finish. Rewards: XP once a night, the barn dance ribbon the first
   time, the reel for your moves wheel after 16 great steps in one dance, and a bandstand for your garden the first time all four places
   at a pitch are played by people at once.
   Saves: ad.bw.<day>.<villager> (watched you today), ad.bh.<day>.<villager> (hummed it), ad.bkt (coins busked, all told), ad.dn (dances);
   coins are ledger lines adbk.<day>.<tune> (kind 'wd', as the rainbow's pot).
   ============================================================ */
const _adb = { crowd: new Map(), play: null, ring: null, ringAt: 0, keys: null, streak: 0, hatCoins: new Map(), said: 0, flowerT: 0, humAt: 0 };
const _add = { floors: null, floorsKey: '', sat: null, satKey: '', on: null, strip: null, keys: null, them: new Map(), arrows: [], next: 0, iv: 0, good: 0, great: 0, tapN: 0, swingTo: -1, swingAt: -99, call: -1, finTune: -1, lamps: 0, beat: null, beatNext: -1, beatIv: 0, startX: 0, startY: 0, tellT: 0, pingT: 0, beatOn: false };
const AD_FOLK_FREE = Object.freeze(['wander', 'sit', 'sitout', 'look', 'read', 'post', 'porch', 'warm', 'tend']);

/* ---------- small helpers ---------- */
function _adbBands() { try { return typeof _gmBands === 'function' ? _gmBands() : new Map(); } catch (e) { return new Map(); } }
function _adbThing(id) { try { return typeof _gmThing === 'function' ? _gmThing(id) : null; } catch (e) { return null; } }
function _adbPitch(t) { return !!t && typeof gmPlaces === 'function' && gmPlaces(t.kind).length > 0; }
/** A point in front of a thing, laid out for a front facing you (dy > 0 is out in front), turned to the way it really faces. */
function _adbAt(t, dx, dy) { const v = typeof _gkTurn === 'function' ? _gkTurn(dx, dy, t.front) : [dx, dy]; return { x: t.x + v[0], y: t.y + v[1] }; }
/** A point in the thing's own frame (the inverse of _adbAt): [across, out in front]. */
function _adbLocal(t, p) { const a = -((t.front == null ? 90 : t.front) - 90) * Math.PI / 180, dx = p.x - t.x, dy = p.y - t.y; return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]; }
function _adbFree(x, y) {
  try {
    if (!adOpen(x, y)) return false;
    const tr = typeof gardenTerrainAt === 'function' ? gardenTerrainAt(x, y) : ''; if (tr === 'water' || tr === 'deep' || !tr) return false;
    if (typeof _gwFree === 'function' && typeof _gw !== 'undefined' && _gw.grid && !_gwFree(x, y)) return false;
  } catch (e) { return false; }
  return true;
}
function _adbName(t) { const n = (t && (t.name || (GARDEN_KINDS[t.kind] && GARDEN_KINDS[t.kind].name))) || 'the band’s pitch'; return /^the /i.test(n) ? n.replace(/^The /, 'the ') : 'the ' + n; }
/** The vale's folk drawn here now, on any screen: [{ id, name, x, y, V (the host's own record, at home only) }] */
function adFolkHere() {
  const out = [];
  try {
    if (typeof _vfr !== 'undefined' && _vfr.on) { for (const V of _vfr.list || []) if (!V.inside && Number.isFinite(V.x) && V.row) out.push({ id: V.id, name: V.row.name, x: V.x, y: V.y, V }); }
    else if (typeof _vfg !== 'undefined') { for (const V of _vfg.V.values()) if (V.S && Number.isFinite(V.x) && V.row) out.push({ id: V.id, name: V.row.name, x: V.x, y: V.y }); }
  } catch (e) { /* nobody about */ }
  return out;
}
/* ---------- the host's villagers come over and watch (their runner: 94-garden-wonder-0vale-folk.js) ----------
   A watcher's walk-over is the runner's own `visit` (the way a teller comes to you), held while the tune plays: its arrival time reads as
   none, so the runner's "come over to you" time-out never sends them home while a guest is the one playing. Host only. */
function adFolkSummon(V, at, face) {
  if (!V || V.inside || (V.visit && !V.visit.ad) || V.hold) return false;
  const until = performance.now() + 20000;
  if (V.visit && V.visit.ad) { V.visit.until = until; V.visit.face = face; if (Math.hypot(V.visit.at.x - at.x, V.visit.at.y - at.y) > 0.3) { V.visit.at = at; V.path = null; V.pathFor = ''; V.arrived = false; } return true; }
  V.visit = { at, until, ad: true, face, get arr() { return 0; }, set arr(v) { /* held: see above */ } };
  V.mark = false; V.path = null; V.pathFor = ''; V.arrived = false; V.drawn = '';
  return true;
}
function adFolkLetGo(V) { if (!V || !V.visit || !V.visit.ad) return; V.visit = null; V.mark = false; V.drawn = ''; V.arrived = false; V.path = null; V.pathFor = ''; }
/** Turned to face what they came to see (the runner turns them to the host's own figure on arrival). */
function _adbFaceTo(V) { if (V && V.visit && V.visit.ad && V.arrived && V.visit.face) { const f = V.visit.face.x > V.x + 0.05 ? 1 : V.visit.face.x < V.x - 0.05 ? -1 : V.face; if (V.face !== f) { V.face = f; V.drawn = ''; } } }
function _adbAwake(V) { const e = V && V.entry; return !!V && !V.inside && !V.hold && V.x != null && (!V.visit || V.visit.ad) && !!e && AD_FOLK_FREE.includes(e.act); }
/** Places to stand and watch: a half ring in front of a pitch (or round a dance floor), free ground, a step apart, clear of the hat. */
function _adbRing(t, n, hat) {
  const out = [], c = _adbAt(t, 0, 0.6);
  for (let k = 0; k < 9 && out.length < n; k++) {
    const a = (0.16 + (k % 9) / 8 * 0.68) * Math.PI, r = 2.4 + (k % 2) * 0.55, v = typeof _gkTurn === 'function' ? _gkTurn(Math.cos(a) * r, Math.sin(a) * r * 0.78, t.front) : [Math.cos(a) * r, Math.sin(a) * r * 0.78], p = { x: c.x + v[0], y: c.y + v[1] };
    if (!_adbFree(p.x, p.y) || (hat && Math.hypot(p.x - hat.x, p.y - hat.y) < 0.9) || out.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 1)) continue;
    out.push(p);
  }
  return out;
}
/** Who is watching a pitch here (villagers and friends standing in front, not playing): on every screen alike. */
function _adbWatchers(t, players) {
  const c = _adbAt(t, 0, 2.1), out = [];
  for (const f of adFolkHere()) if (Math.hypot(f.x - c.x, (f.y - c.y) * 1.25) <= 2.4) out.push({ id: f.id, name: f.name, x: f.x, y: f.y, folk: true });
  try {
    const playing = new Set(players.map(p => p.who)), me = adRole() === 'visit' ? _glv.w : 0;
    if (typeof _gll !== 'undefined' && _gll.actors) for (const [w, A] of _gll.actors) { if (A.me || w === me || playing.has(w) || !Number.isFinite(A.x)) continue; if (Math.hypot(A.x - c.x, (A.y - c.y) * 1.25) <= 2.6) out.push({ id: 'w' + w, name: A.n, x: A.x, y: A.y }); }
    if (adRole() !== 'visit' && !playing.has('me') && typeof _gw !== 'undefined' && Math.hypot(_gw.px - c.x, (_gw.py - c.y) * 1.25) <= 2.6) out.push({ id: 'me', name: 'you', x: _gw.px, y: _gw.py });   // (the host watching a guest play: on a visit the host is one of the actors)
  } catch (e) { /* the folk alone */ }
  return out;
}

/* ---------- the hat ---------- */
function _adbHatAt(t) { for (const [dx, dy] of [[0, 1.12], [0.3, 1.2], [-0.3, 1.2], [0, 1.45]]) { const p = _adbAt(t, dx, dy); if (_adbFree(p.x, p.y)) return p; } return null; }   // (just in front of the players' places, between the band and whoever stops to listen)
function _adbHatSvg(n) {
  // an old felt hat upturned on the grass: you see into its crown, its band, and the coins in it glint (world px, about 0.3 H across)
  let coins = ''; const at = [[-3.4, -4.2], [2, -4.6], [-0.4, -5.6], [3.8, -3.8], [-2.4, -6], [1, -3.6]];
  for (let i = 0; i < Math.min(6, n); i++) coins += `<ellipse cx="${at[i][0]}" cy="${at[i][1]}" rx="2.2" ry="1" fill="#e0b84a" stroke="#8a6a22" stroke-width="0.35"/><ellipse cx="${at[i][0] - 0.6}" cy="${at[i][1] - 0.3}" rx="0.8" ry="0.35" fill="#fff4c8" opacity="0.8"/>`;
  return `<ellipse cx="0" cy="0.8" rx="12.5" ry="3.2" fill="#000000" opacity="0.28"/>`
    + `<ellipse cx="0" cy="-0.4" rx="11.6" ry="3.4" fill="#4e3c2e"/><ellipse cx="-1" cy="-1" rx="10.4" ry="2.8" fill="#6a5240"/><path d="M-10.8 -1.4Q-6 -3.6 0 -3.7" stroke="#8a7058" stroke-width="0.8" fill="none" opacity="0.8"/>`
    + `<path d="M-7.2 -1.4Q-7.8 -6.6 -6.6 -7.4H6.6Q7.8 -6.6 7.2 -1.4Z" fill="#3e2e22"/><path d="M-7.2 -1.4Q-7.8 -6.6 -6.6 -7.4H-3.6Q-4.8 -5 -4.4 -1.4Z" fill="#6a5240" opacity="0.6"/>`
    + `<ellipse cx="0" cy="-6.8" rx="6.6" ry="2.2" fill="#1e1612"/><path d="M-7.1 -3.2Q0 -1.8 7.1 -3.2" stroke="#9a3a2e" stroke-width="1.2" fill="none"/>`
    + coins + (n ? `<g transform="translate(2 -7.4)"><g class="ad-twinkle"><path d="M0 -2.8L.6 -.6L2.8 0L.6 .6L0 2.8L-.6 .6L-2.8 0L-.6 -.6Z" fill="#fff4c8"/></g></g>` : '')
    + `<path d="M-12.6 1.2q1 -3.2 2 0M10.6 1.4q1 -3.2 2 0M-4 2.4q.8 -2.6 1.6 0" stroke="#5f7d3e" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
}

/* ---------- busking: the crowd, the hat, the pay ---------- */
function _adbHours(N) { return N.hour >= AD_BUSK.from && N.hour < AD_BUSK.to; }
function _adbTick(m, N) {
  const bands = _adbBands(), want = new Set(), hostFolk = !m.visit && typeof _vfr !== 'undefined' && _vfr.on, D = _add.on;
  for (const [id, players] of bands) {
    const t = _adbThing(id); if (!_adbPitch(t) || !players.length || !_adbHours(N)) continue;
    const hat = _adbHatAt(t); if (!hat) continue;
    want.add(id);
    if (adInView(hat.x, hat.y, 3)) adSprite('hat-' + id, { x: hat.x, y: hat.y, z: hat.y, svg: _adbHatSvg(_adb.hatCoins.get(id) || 0), label: 'The hat: whoever plays here is paid at the end of each tune somebody stays for', hit: 0.4, hitUp: 3 });
    else adSprite('hat-' + id, null);
    // the host's folk come over (on a dance night at this pitch they stand round the floor instead: 9music's dance)
    if (hostFolk && !(D && D.f.t.id === id)) {
      const n = AD_BUSK.crowd + players.length - 1, spots = _adbRing(t, n, hat), have = _adb.crowd.get(id) || new Map();
      for (const [vid, sp] of have) { const V = _vfr.V.get(vid); if (!V || !V.visit || !V.visit.ad || !_adbAwake(V)) { adFolkLetGo(V); have.delete(vid); continue; } if (!adFolkSummon(V, sp, { x: t.x, y: t.y })) have.delete(vid); else _adbFaceTo(V); }   // (their day takes them home: they go)
      const used = new Set([...have.values()].map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)));
      const free = spots.filter(p => !used.has(p.x.toFixed(2) + ',' + p.y.toFixed(2)));
      if (have.size < n && free.length) {
        const cands = (_vfr.list || []).filter(V => !have.has(V.id) && _adbAwake(V) && Math.hypot(V.x - t.x, V.y - t.y) <= AD_BUSK.near && ![..._adb.crowd.values()].some(c => c.has(V.id))).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
        for (const V of cands) { if (have.size >= n || !free.length) break; const sp = free.shift(); if (adFolkSummon(V, sp, { x: t.x, y: t.y })) have.set(V.id, sp); }
      }
      _adb.crowd.set(id, have);
    }
  }
  for (const [id, have] of _adb.crowd) if (!want.has(id) || (D && D.f.t.id === id)) { if (typeof _vfr !== 'undefined') for (const vid of have.keys()) adFolkLetGo(_vfr.V.get(vid)); _adb.crowd.delete(id); }
  for (const sid of [..._ad.sprites.keys()]) if (sid.startsWith('hat-') && !want.has(sid.slice(4))) { adSprite(sid, null); _adb.hatCoins.delete(sid.slice(4)); }
  // you, playing: the beat ring, and the pay at the end of each tune
  const me = typeof _gmu !== 'undefined' ? _gmu.me : null, myBand = me ? bands.get(me.id) : null, t = me ? _adbThing(me.id) : null;
  if (me && myBand && _adbPitch(t) && _adbHours(N) && want.has(me.id)) _adbPlaying(m, N, t, myBand);
  else _adbStopPlaying();
  // the bandstand: all four places at a pitch played by people at once (you among them)
  for (const [, players] of bands) if (players.length >= 4 && players.some(p => p.who === 'me')) adGrant('bandstand', { 'decor:bandstand': 1 }, 'All four places played at once: a bandstand for your garden is in your bag');
  _adbHum(m, N);
}
function _adbPlaying(m, N, t, players) {
  const now = gmNow(), tune = Math.floor(now / GM_LOOP);
  let P = _adb.play;
  if (!P || P.id !== t.id) { P = _adb.play = { id: t.id, tune, from: now, bonus: 0, watched: new Map(), paid: 0 }; _adb.streak = 0; }
  const W = _adbWatchers(t, players);
  for (const w of W) P.watched.set(w.id, w);
  _adbRingOn(t);
  if (tune > P.tune) {   // a tune has ended
    const played = now - Math.max(P.from, P.tune * GM_LOOP);
    if (played >= AD_BUSK.play && P.watched.size) _adbPay(m, N, t, players, P);
    P.tune = tune; P.from = tune * GM_LOOP; P.bonus = 0; P.watched = new Map(W.map(w => [w.id, w]));
  }
}
function _adbPay(m, N, t, players, P) {
  const g = _gdG(), today = _gdToday(); let had = 0;
  for (const [k, e] of Object.entries(g.led)) if (k.startsWith('adbk.' + today + '.') && e) had += Number(e.c) || 0;
  const folk = [...P.watched.values()].filter(w => w.folk), names = [...P.watched.values()].map(w => w.name).filter(n => n && n !== 'you');
  const coins = Math.max(0, Math.min(AD_BUSK.coins, P.watched.size + players.length - 1 + P.bonus, AD_BUSK.day - had));
  if (coins > 0) {
    g.led['adbk.' + today + '.' + P.tune + '.' + (gardenHash(t.id + '|' + (typeof gardenPlaceKey === 'function' ? gardenPlaceKey() : '')) >>> 0).toString(36)] = { d: today, k: 'wd', c: coins, n: 1 }; _gdSave();   // (the tune, at this pitch in this garden)
    adSet('bkt', (Number(adGet('bkt')) || 0) + coins);
    _adb.hatCoins.set(t.id, Math.min(6, (_adb.hatCoins.get(t.id) || 0) + coins));
    try { _glFx(t.x, t.y + 1.3, 'sparkle', { lift: 6 }); } catch (e) { /* no fx */ }
    wdSound([[1318, 0.12, 'triangle', 0.01], [1568, 0.16, 'triangle', 0.008, 0.08]]);
  }
  for (const w of folk) adSet('bw.' + N.dn + '.' + w.id, 1);
  const who = names.length ? (names.length > 2 ? names.slice(0, 2).join(', ') + ' and the others' : names.join(' and ')) : 'Somebody';
  const forage = typeof GARDEN_LAND_FORAGE !== 'undefined' && GARDEN_LAND_FORAGE[m.season];
  const flower = forage && adGive('busk.flower', { [forage.item]: 1, x: 1 });
  const first = coins > 0 && adKeep('ad-first-penny');
  if (!first) wdAmbient(coins > 0 ? `In the hat: ${_wdPlural(coins, 'coin')}. ${who} stayed for the whole tune.${flower ? ' Somebody left ' + forage.name + ' in it too.' : ''}` : `${who} stayed for the whole tune. The hat is full for today, but they love it all the same.`, 6500, 'music');
}
/* ---------- keeping time: the ring round your feet ---------- */
function _adbRingOn(t) {
  const box = typeof _gw !== 'undefined' ? _gw.box : null; if (!box) return;
  let el = _adb.ring;
  if (!el || !el.isConnected) {
    el = _adb.ring = document.createElement('div'); el.className = 'ad-beat'; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '-1'); el.setAttribute('aria-label', 'Keep time: tap Space on the beat, or click here');
    el.innerHTML = '<i class="ad-beat-r"></i><i class="ad-beat-p"></i><b class="ad-beat-t">Tap Space on the beat</b>';
    el.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); ev.preventDefault(); _adbTap(); });
    box.appendChild(el); _adb.ringAt = 0;
    if (!_adb.keys) { _adb.keys = (ev) => { if (!_adb.ring || ev.key !== ' ' || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return; const tg = ev.target; if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tg.tagName))) return; ev.preventDefault(); ev.stopPropagation(); _adbTap(); }; document.addEventListener('keydown', _adb.keys, true); }
    setTimeout(() => { const b = _adb.ring && _adb.ring.querySelector('.ad-beat-t'); if (b) b.classList.add('is-gone'); }, 6000);
  }
  // where your feet are, and the pulse set to the shared beat: a new pulse every few seconds, started at the beat's phase that moment (a
  // visitor's clock settles as the host's answers come in)
  const now = performance.now();
  if (now - _adb.ringAt > 3000) {
    _adb.ringAt = now;
    const s = typeof _ghProject === 'function' ? _ghProject(_gw.px, _gw.py) : null;
    if (s) el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px)`;
    const q = GM_STEP * 2, ph = ((gmNow() % q) + q) % q, old = el.querySelector('.ad-beat-p'), pulse = document.createElement('i');
    pulse.className = 'ad-beat-p'; pulse.style.animationDuration = q.toFixed(1) + 'ms'; pulse.style.animationDelay = (-ph).toFixed(0) + 'ms';
    if (old) old.replaceWith(pulse); else el.appendChild(pulse);
  }
}
function _adbStopPlaying() {
  if (_adb.ring) { _adb.ring.remove(); _adb.ring = null; }
  if (_adb.keys) { document.removeEventListener('keydown', _adb.keys, true); _adb.keys = null; }
  _adb.play = null; _adb.streak = 0;
}
function _adbTap() {
  const P = _adb.play, el = _adb.ring; if (!P || !el) return;
  const q = GM_STEP * 2, T = gmNow() - 30, off = ((T % q) + q) % q, d = Math.min(off, q - off), good = d <= AD_BUSK.good;   // (30 ms: the sound reaches your ears a little after it is played)
  el.classList.remove('is-good', 'is-miss'); void el.offsetWidth; el.classList.add(good ? 'is-good' : 'is-miss');
  if (!good) { _adb.streak = 0; return; }
  _adb.streak++;
  if (_adb.streak >= AD_BUSK.streak) {
    _adb.streak = 0; P.bonus = 1;
    const t = _adbThing(P.id), W = t ? _adbWatchers(t, _adbBands().get(P.id) || []).filter(w => w.folk) : [];
    const w = W.length ? W[Math.floor(Math.random() * W.length)] : null;
    if (w) {
      try { if (window.GardenNativeActions) { const G = GARDEN_WORLD; for (let i = 0; i < 3; i++) setTimeout(() => GardenNativeActions.effect('notes', w.x * G.cellW, G.sky + w.y * G.cellH - 40, { count: 2, color: 0x4a2c18 }), i * 420); } } catch (e) { /* no notes */ }
      if (performance.now() - _adb.said > 20000) { _adb.said = performance.now(); wdAmbient(`${w.name.replace(/^The /, 'the ')} is dancing!`, 3500, 'music'); }
    } else if (performance.now() - _adb.said > 20000) { _adb.said = performance.now(); wdAmbient('Right on the beat. Whoever stops by will hear it.', 3500, 'music'); }
  }
}
/** Later that day: a villager who watched you play hums your tune as you pass (once each a day). */
function _adbHum(m, N) {
  if (typeof _gw === 'undefined' || _adb.play || performance.now() - _adb.humAt < 15000) return;
  for (const f of adFolkHere()) {
    if (Math.hypot(f.x - _gw.px, (f.y - _gw.py) * 1.3) > 2.6 || !adGet('bw.' + N.dn + '.' + f.id) || adGet('bh.' + N.dn + '.' + f.id)) continue;
    adSet('bh.' + N.dn + '.' + f.id, 1); _adb.humAt = performance.now();
    wdAmbient(`${f.name.replace(/^The /, 'The ')} is humming your reel.`, 4500, 'music');
    try { if (window.GardenNativeActions) { const G = GARDEN_WORLD; GardenNativeActions.effect('notes', f.x * G.cellW, G.sky + f.y * G.cellH - 40, { count: 1, color: 0x4a2c18 }); } } catch (e) { /* no notes */ }
    return;
  }
}

/* ============================================================
   BARN DANCE NIGHT
   ============================================================ */
/** Dance floors: up to 12 free cells in a 5 by 3 box in front of every pitch and barn, from its own footing and front (worked out again as
 *  the world settles). [{ id (on the wire), t, cells, cx, cy, edge (where watchers stand), lamps (where the lanterns stand) }] */
function _addFloors() {
  const key = adWorldSig() + '|' + gardenAffordThings().length + '|' + (typeof _gw !== 'undefined' && _gw.grid ? 1 : 0);
  if (_add.floors && _add.floorsKey === key) return _add.floors;
  _add.floorsKey = key; const out = [];
  for (const t of gardenAffordThings()) {
    if (!(_adbPitch(t) || t.kind === 'barn')) continue;
    const y0 = t.kind === 'barn' ? 1.2 : 1.9, cells = [];
    for (let j = 0; j < AD_DANCE.d; j++) for (let i = 0; i < AD_DANCE.w; i++) { const p = _adbAt(t, i - (AD_DANCE.w - 1) / 2, y0 + j); if (_adbFree(p.x, p.y) && !adHidden(p.x, p.y, 1)) cells.push(p); }
    if (cells.length < AD_DANCE.min) continue;
    const use = cells.slice(0, AD_DANCE.cells), cx = use.reduce((s, p) => s + p.x, 0) / use.length, cy = use.reduce((s, p) => s + p.y, 0) / use.length;
    // round the floor's edge, a little outside it (two rings): the lanterns spread as far apart as they will go, the watchers in between
    const edge = [], lamps = [], near = (p, list, r) => list.some(q => Math.hypot(q.x - p.x, q.y - p.y) < r), ring = [];
    for (const k of [1, 1.25]) for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, p = { x: cx + Math.cos(a) * (AD_DANCE.w / 2 + 0.9) * k, y: cy + Math.sin(a) * (AD_DANCE.d / 2 + 0.8) * k };
      if (_adbLocal(t, p)[1] < y0 - 0.15) continue;   // (never level with the band or the barn: the floor's three open sides only)
      if (_adbFree(p.x, p.y) && !near(p, use, 0.7) && !near(p, ring, 0.5)) ring.push(p);
    }
    const lampOk = ring.filter(p => !adHidden(p.x, p.y, 1));
    if (lampOk.length) { lampOk.sort((p, q) => q.y - p.y); lamps.push(lampOk[0]); }   // (the first at the front)
    while (lamps.length < AD_DANCE.lamps) { let best = null, bd = 1.6; for (const p of lampOk) { if (lamps.includes(p)) continue; const d = Math.min(...lamps.map(q => Math.hypot(q.x - p.x, q.y - p.y))); if (d > bd) { bd = d; best = p; } } if (!best) break; lamps.push(best); }
    for (const p of ring) if (!lamps.includes(p) && !near(p, lamps, 0.9) && !near(p, edge, 1)) edge.push(p);
    out.push({ id: 'f' + (gardenHash('floor|' + t.id) >>> 0).toString(36), t, cells: use, cx, cy, edge, lamps });
  }
  return (_add.floors = out);
}
function _addWeekday(iso) { const d = Date.parse(iso + 'T12:00:00Z'); return Number.isFinite(d) ? new Date(d).getUTCDay() : -1; }   // clock-ok: the weekday of an ISO day
/** Saturday's floor: the one nearest most of the villagers' homes (else the one nearest the arrival point). */
function _addSaturday(m, N, floors) {
  const key = N.nn + '|' + floors.length; if (_add.sat && _add.satKey === key && floors.includes(_add.sat)) return _add.sat;
  let homes = []; try { homes = adHomes(m).filter(h => h.lived); } catch (e) { homes = []; }
  const L = adLay(), a = (L && L.arrival) || { x: 0, y: 0 }; let best = null, bd = 1e12;
  for (const f of floors) { const d = homes.length ? homes.reduce((s, h) => s + Math.hypot(h.x - f.cx, h.y - f.cy), 0) : Math.hypot(f.cx - a.x, f.cy - a.y); if (d < bd) { bd = d; best = f; } }
  _add.sat = best; _add.satKey = key; return best;
}
/** Is there a dance now, and where: { f, why: 'band' | 'sat' } or null. */
function adDanceNow(m, N) {
  if (!(N.tod === 'dusk' || N.tod === 'night')) return null;
  const floors = _addFloors(); if (!floors.length) return null;
  for (const [id, players] of _adbBands()) if (players.length >= 2) { const f = floors.find(q => q.t.id === id); if (f) return { f, why: 'band' }; }
  if (_addWeekday(N.day) === 6 && N.hour > 12 && N.hour < AD_DANCE.late) { const f = _addSaturday(m, N, floors); if (f) return { f, why: 'sat' }; }
  return null;
}
/** The notice board's word about the dance: on Friday for tomorrow, on Saturday for tonight. */
function gardenNightDanceBoard(m, N) {
  try {
    const wd = _addWeekday(N.day), floors = _addFloors(); if (!floors.length) return '';
    const f = _addSaturday(m, N, floors); if (!f) return '';
    if (wd === 5) return `Barn dance tomorrow night, by ${_adbName(f.t)}. From dusk until half past ten. Bring your feet.`;
    if (wd === 6 && N.hour < AD_DANCE.late) return `Barn dance tonight, by ${_adbName(f.t)}, from dusk until half past ten.`;
  } catch (e) { /* no floor */ }
  return '';
}
function _addOnFloor(D, x, y) { return !!D && D.f.cells.some(p => Math.abs(p.x - x) <= 0.62 && Math.abs(p.y - y) <= 0.62); }
/** Friends dancing on this floor now (their nt|dance), by slot. */
function _addDancers(D) {
  const out = []; const now = performance.now();
  for (const [w, r] of _add.them) { if (now - r.at > 16000 || r.f !== D.f.id) { if (now - r.at > 16000) _add.them.delete(w); continue; } const A = typeof _gll !== 'undefined' && _gll.actors ? _gll.actors.get(w) : null; if (A && !A.me) out.push({ w, A }); }
  return out;
}
/* ---------- the lanterns round the floor ---------- */
function _addLampSvg(lit, k) {
  const P = AD_LANTERN.papers[k % 5];
  return `<ellipse cx="0" cy="0.6" rx="6" ry="1.8" fill="#000000" opacity="0.26"/><path d="M-1 0V-44" stroke="#5a4028" stroke-width="2.2" stroke-linecap="round"/><path d="M-0.4 -2V-43" stroke="#8a6a44" stroke-width="0.7" opacity="0.7"/>`
    + `<path d="M-1 -43Q4 -46 7 -42" stroke="#5a4028" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M7 -42V-38" stroke="#3a2a1a" stroke-width="0.6"/>`
    + `<path d="M3.2 -24.6L2.8 -33Q3 -36.6 5 -37.6H9Q11 -36.6 11.2 -33L10.8 -24.6Z" fill="${lit ? P[1] : GART.dk(P[1], 0.38)}"/>`
    + (lit ? `<ellipse cx="7" cy="-30" rx="2.2" ry="3" fill="#fff6d0" opacity="0.85"/>` : '')
    + `<path d="M3.2 -24.6L2.8 -33Q3 -36.6 5 -37.6H6.2Q4.8 -35.6 4.9 -33L5.2 -24.6Z" fill="#ffffff" opacity="${lit ? 0.3 : 0.14}"/><path d="M4.6 -37.7H9.4M4 -24.5H10" stroke="#6a4a2c" stroke-width="0.8"/>`
    + `<path d="M-4.6 1q.8 -3.4 1.6 0M1.6 1.2q.8 -3 1.6 0" stroke="#5f7d3e" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
}
/** A lit lantern's light over the night, and the pool of it on the grass (the glow layer: a glow inside the sprite is a grey disc there). */
const _AD_LAMP_GLOW = AD_LANTERN.papers.map(P => `<circle cx="7" cy="-31" r="18" fill="${P[2]}" opacity="0.34"/><circle cx="7" cy="-31" r="8" fill="#fff4d0" opacity="0.45"/><ellipse cx="5" cy="0" rx="17" ry="5" fill="${P[2]}" opacity="0.22"/>`);
function _addLamps(D, lit) {
  const want = new Set();
  if (D) D.f.lamps.forEach((p, k) => {
    if (!adInView(p.x, p.y, 3)) return; const id = 'dl-' + D.f.id + '-' + k, on = k < lit; want.add(id);
    adSprite(id, { x: p.x, y: p.y, z: p.y, svg: _addLampSvg(on, k), label: on ? 'A lantern lit for a dancer' : 'A lantern: it lights for each dancer', hit: 0.4, hitUp: 30 });
    if (on) wdGlow('ad-' + id, _AD_LAMP_GLOW[k % 5], p.x, p.y); else wdGlowOff('ad-' + id);
  });
  for (const id of [..._ad.sprites.keys()]) if (id.startsWith('dl-') && !want.has(id)) { adSprite(id, null); wdGlowOff('ad-' + id); }
}
/* ---------- the host's folk round the floor ---------- */
function _addCrowd(m, D) {
  if (m.visit || typeof _vfr === 'undefined' || !_vfr.on) return;
  const id = 'dance:' + (D ? D.f.id : ''), have = _adb.crowd.get(id) || new Map();
  for (const [key, h] of _adb.crowd) if (key.startsWith('dance:') && key !== id) { for (const vid of h.keys()) adFolkLetGo(_vfr.V.get(vid)); _adb.crowd.delete(key); }
  if (!D) return;
  const face = { x: D.f.cx, y: D.f.cy };
  for (const [vid, sp] of have) { const V = _vfr.V.get(vid); if (!V || !_adbAwake(V) || !adFolkSummon(V, sp, face)) { adFolkLetGo(V); have.delete(vid); } else _adbFaceTo(V); }
  if (have.size < AD_DANCE.watch) {
    const used = new Set([...have.values()]), free = D.f.edge.filter(p => !used.has(p));
    const cands = (_vfr.list || []).filter(V => !have.has(V.id) && _adbAwake(V) && Math.hypot(V.x - D.f.cx, V.y - D.f.cy) <= AD_BUSK.near + 4 && ![..._adb.crowd.values()].some(c => c.has(V.id))).sort((a, b) => Math.hypot(a.x - D.f.cx, a.y - D.f.cy) - Math.hypot(b.x - D.f.cx, b.y - D.f.cy));
    for (const V of cands) { if (have.size >= AD_DANCE.watch || !free.length) break; const sp = free.shift(); if (adFolkSummon(V, sp, face)) have.set(V.id, sp); }
  }
  _adb.crowd.set(id, have);
}
function _addWatching(D) { let n = 0; for (const f of adFolkHere()) if (Math.hypot(f.x - D.f.cx, (f.y - D.f.cy) * 1.2) <= AD_DANCE.w / 2 + 1.6) n++; return n; }
/* ---------- the quiet beat when nobody plays: a fiddle and a drum, the reel's two parts ---------- */
function _addBeatWanted() {
  const D = _add.on; if (!D || typeof _gw === 'undefined' || !_gw.on) return 0;
  if (typeof _gsShowing === 'function' && !_gsShowing()) return 0;
  if (document.hidden || _adbBands().has(D.f.t.id)) return 0;   // (the band plays the tune)
  const d = Math.hypot(_gw.px - D.f.cx, (_gw.py - D.f.cy) * 1.3); if (d > AD_DANCE.ear) return 0;
  return d <= 6 ? 1 : 1 - (d - 6) / (AD_DANCE.ear - 6);
}
function _addBeatWake() { if (!_add.beatIv) { _add.beatIv = setInterval(_addBeatTick, 100); _addBeatTick(); } }
function _addBeatTick() {
  try {
    const k = _addBeatWanted(); _add.beatOn = k > 0;
    const B = typeof gardenSoundBus === 'function' ? gardenSoundBus({ always: true }) : null;
    if (!k || !B) { if (_add.beat) { try { _add.beat.g.gain.setTargetAtTime(0, _add.beat.c.currentTime, 0.25); } catch (e) { /* gone */ } } _add.beatNext = -1; clearInterval(_add.beatIv); _add.beatIv = 0; return; }   // (nothing runs while it is not wanted: the dance's tick, once a second while the garden shows, wakes it again)
    const c = B.ac;
    if (!_add.beat || _add.beat.c !== c) { const g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null; g.gain.value = 0; if (pan) { g.connect(pan); pan.connect(B.out); } else g.connect(B.out); _add.beat = { c, g, pan }; }
    const D = _add.on, t = c.currentTime, song = gmNow(), cur = Math.floor(song / GM_STEP), until = Math.floor((song + 350) / GM_STEP);
    _add.beat.g.gain.setTargetAtTime(0.62 * k, t, 0.2);
    if (_add.beat.pan) _add.beat.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, (D.f.cx - _gw.px) / 12)), t, 0.2);
    if (_add.beatNext < cur || _add.beatNext > until + 4) _add.beatNext = cur + 1;
    for (let s = _add.beatNext; s <= until; s++) {
      const at = t + Math.max(0.005, (s * GM_STEP - song) / 1000);
      gmStepNotes('fiddle', 'melody', s, 2, (voice, dt, mm, d, kk) => gmNote(c, _add.beat.g, voice, at + dt, mm, d, kk * 0.7));
      gmStepNotes('drum', 'rhythm', s, 2, (voice, dt, mm, d, kk) => gmNote(c, _add.beat.g, voice, at + dt, mm, d, kk * 0.8));
    }
    _add.beatNext = until + 1;
  } catch (e) { console.error('[after dark] beat', e); clearInterval(_add.beatIv); _add.beatIv = 0; }
}
// the garden's own song pauses under the quiet beat, as it does under the band (it is in another key and time), and carries on after
if (typeof _gsMusic === 'function') {
  const _addGsMusic0 = _gsMusic;
  _gsMusic = function (c, t, s) { return _addGsMusic0(c, t, _add.beatOn ? Object.assign({}, s, { band: true }) : s); };   // eslint-disable-line no-func-assign
}

/* ---------- dancing: the strip ---------- */
const AD_DIRS = Object.freeze([['left', 'arrow-left', 'ArrowLeft', 'a'], ['up', 'arrow-up', 'ArrowUp', 'w'], ['right', 'arrow-right', 'ArrowRight', 'd'], ['down', 'arrow-down', 'ArrowDown', 's']]);
function _addQ() { return GM_STEP * 2; }   // a beat: a quarter note of the reel
/** The step on a beat: which way (the same on every screen: the floor, the beat), or -1 for a breath. */
function _addStepOf(D, beat) { if (beat % 8 === 7) return -1; return gardenHash('adstep|' + D.f.id + '|' + beat) % 4; }
function adDanceStart() {
  const D = _add.on, box = typeof _gw !== 'undefined' ? _gw.box : null; if (!D || !box || _add.strip) return;
  try { if (typeof gartActStop === 'function') gartActStop(); } catch (e) { /* standing */ }
  const el = document.createElement('div'); el.className = 'ad-strip'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Barn dance');
  el.innerHTML = `<div class="ad-strip-top"><b class="ad-strip-call" aria-live="polite">Take your places!</b><span class="ad-strip-lamps" aria-label="Lanterns lit"></span></div><div class="ad-strip-track"><i class="ad-strip-hit" aria-hidden="true"></i><div class="ad-strip-arrows" aria-hidden="true"></div><b class="ad-strip-say" aria-live="polite"></b></div><div class="ad-strip-keys"></div>`;
  const keys = el.querySelector('.ad-strip-keys');
  AD_DIRS.forEach((d, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ad-strip-k'; b.innerHTML = icon(d[1]); b.setAttribute('aria-label', 'Step ' + d[0]); b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); adDanceStep(i); }); keys.appendChild(b); });
  const stop = document.createElement('button'); stop.type = 'button'; stop.className = 'btn btn-sm btn-ghost ad-strip-stop'; stop.textContent = 'Stop dancing'; stop.onclick = () => adDanceStop(); keys.appendChild(stop);
  el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  box.appendChild(el); _add.strip = el;
  _add.arrows = []; _add.next = Math.floor(gmNow() / _addQ()) + 2; _add.good = 0; _add.great = 0; _add.tapN = 0; _add.call = -1; _add.startX = _gw.px; _add.startY = _gw.py;
  _add.keys = (ev) => {
    if (!_add.strip || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tg = ev.target; if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    if (ev.key === 'Escape' || ev.key === 'e' || ev.key === 'E') { ev.preventDefault(); ev.stopPropagation(); if (!ev.repeat) adDanceStop(); return; }
    const i = AD_DIRS.findIndex(d => d[2] === ev.key || d[3] === ev.key || d[3].toUpperCase() === ev.key);
    if (i < 0) return;
    ev.preventDefault(); ev.stopPropagation(); if (!ev.repeat) adDanceStep(i);
  };
  document.addEventListener('keydown', _add.keys, true);
  document.addEventListener('keyup', _addKeyUp, true);
  adLive('dance', { i: D.f.id, n: 1 }); _add.tellT = performance.now();
  if (adRole() === 'visit' && typeof _gmPing === 'function') { _gmPing(); setTimeout(() => { try { _gmPing(); } catch (e) { /* alone */ } }, 500); }
  clearInterval(_add.iv); _add.iv = setInterval(_addStripTick, 100); _addStripTick();
  _addBeatWake();
}
function _addKeyUp(ev) { if (!_add.strip) return; if (AD_DIRS.some(d => d[2] === ev.key || d[3] === ev.key || d[3].toUpperCase() === ev.key)) { ev.preventDefault(); ev.stopPropagation(); } }
function adDanceStop() {
  const D = _add.on;
  if (_add.strip) { const had = _add.strip.contains(document.activeElement); _add.strip.remove(); _add.strip = null; if (had) { try { _gw.box.focus({ preventScroll: true }); } catch (e) { /* no stage */ } } }
  if (_add.keys) { document.removeEventListener('keydown', _add.keys, true); _add.keys = null; document.removeEventListener('keyup', _addKeyUp, true); }
  clearInterval(_add.iv); _add.iv = 0; _add.arrows = [];
  if (D) adLive('dance', { i: D.f.id, n: null });
}
/** Every 100 ms while the strip is open: arrows come in, the caller calls, a partner is noticed, the lanterns are counted. */
function _addStripTick() {
  const D = _add.on, el = _add.strip; if (!D || !el || !el.isConnected) { adDanceStop(); return; }
  if (typeof _gw === 'undefined' || !_gw.on || Math.hypot(_gw.px - _add.startX, _gw.py - _add.startY) > 0.7) { adDanceStop(); return; }   // (walked off the floor)
  const q = _addQ(), now = gmNow(), beat = Math.floor(now / q), lane = el.querySelector('.ad-strip-arrows'), tune = Math.floor(now / GM_LOOP), bar = Math.floor(((now % GM_LOOP) + GM_LOOP) % GM_LOOP / (GM_STEP * 8));
  // the lanterns: one for each dancer and each villager watching; all of them lit, the last eight bars are the big finish
  const lit = Math.min(AD_DANCE.lamps, 1 + _addDancers(D).length + _addWatching(D)), finish = lit >= AD_DANCE.lamps && bar >= 8;
  const lampEl = el.querySelector('.ad-strip-lamps'), lk = lit + (finish ? 'f' : '');
  if (lampEl && lampEl.dataset.k !== lk) { lampEl.dataset.k = lk; lampEl.innerHTML = Array.from({ length: AD_DANCE.lamps }, (_, i) => `<i class="${i < lit ? 'is-lit' : ''}"></i>`).join(''); el.classList.toggle('is-finish', finish); }
  // a partner: a friend dancing within a step and a half: swing your partner, double steps for eight beats
  const partner = _addDancers(D).find(r => Number.isFinite(r.A.x) && Math.hypot(r.A.x - _gw.px, r.A.y - _gw.py) <= 1.5);
  if (partner && beat - _add.swingAt >= 32) { _add.swingAt = beat; _add.swingTo = beat + 8; _addSay('Swing your partner!', 'is-swing'); try { gartEmoteRun('twirl'); } catch (e) { /* standing */ } }
  // the caller, every four bars, by the shared bar number
  const ci = Math.floor(beat / 16);
  if (ci !== _add.call) { _add.call = ci; const c = el.querySelector('.ad-strip-call'); if (c) c.textContent = beat < _add.swingTo ? 'Swing your partner!' : AD_CALLS[gardenHash('adcall|' + D.f.id + '|' + ci) % AD_CALLS.length]; }
  // the big finish at the end of the tune
  if (finish && bar === 15 && _add.finTune !== tune) { _add.finTune = tune; setTimeout(() => { try { _glFx(D.f.cx, D.f.cy, 'sparkle', { lift: 24 }); } catch (e) { /* no fx */ } _addSay('What a finish!', 'is-swing'); }, 2200); }
  // the arrows: each starts AD_DANCE.lead before its beat; double steps (half beats) while you swing or in the big finish
  for (let b = Math.max(_add.next, beat); b * q <= now + AD_DANCE.lead + 120; b++) {
    const dbl = b < _add.swingTo || finish, halves = dbl ? [0, 0.5] : [0];
    for (const h of halves) {
      const dir = h ? (_addStepOf(D, b) + 2) % 4 : _addStepOf(D, b); if (dir < 0) continue;
      const at = (b + h) * q, left = at - now; if (left < 40) continue;
      if (_add.arrows.reduce((n, A) => n + (A.done ? 0 : 1), 0) >= 8) break;
      const a = document.createElement('i'); a.className = 'ad-arrow d' + dir; a.innerHTML = icon(AD_DIRS[dir][1]);
      a.style.animationDuration = AD_DANCE.lead + 'ms'; a.style.animationDelay = (-(AD_DANCE.lead - left)).toFixed(0) + 'ms';
      lane.appendChild(a); _add.arrows.push({ at, dir, el: a, done: false });
    }
    _add.next = b + 1;
  }
  for (const A of _add.arrows) if (!A.done && now - A.at > AD_DANCE.good + 40) { A.done = true; A.el.classList.add('is-late'); setTimeout(() => A.el.remove(), 260); }
  _add.arrows = _add.arrows.filter(A => !A.done || A.el.isConnected);
  if (_add.arrows.length > 12) _add.arrows = _add.arrows.slice(-12);
  // tell the floor you are still dancing; on a visit keep the host's clock
  if (performance.now() - _add.tellT > 10000) { _add.tellT = performance.now(); adLive('dance', { i: D.f.id, n: 1 }); if (adRole() === 'visit' && typeof _gmPing === 'function') { try { _gmPing(); } catch (e) { /* alone */ } } }
}
function _addSay(text, cls) {
  const s = _add.strip && _add.strip.querySelector('.ad-strip-say'); if (!s) return;
  s.textContent = text; s.className = 'ad-strip-say ' + (cls || ''); void s.offsetWidth; s.classList.add('is-on');
}
/** A step pressed: the nearest arrow of that way, on its beat. A miss costs nothing. */
function adDanceStep(dir) {
  const D = _add.on, el = _add.strip; if (!D || !el) return;
  const now = gmNow() - 30; let best = null, bd = 1e9;   // (as the busking ring: the beat is heard a moment after it is played)
  for (const A of _add.arrows) { if (A.done || A.dir !== dir) continue; const d = Math.abs(now - A.at); if (d < bd) { bd = d; best = A; } }
  const k = el.querySelectorAll('.ad-strip-k')[dir]; if (k) { k.classList.remove('is-hit'); void k.offsetWidth; k.classList.add('is-hit'); }
  if (!best || bd > AD_DANCE.good) { _addSay(best && bd < AD_DANCE.good * 2.2 ? (now < best.at ? 'A touch early' : 'A touch late') : '', 'is-miss'); return; }
  best.done = true; best.el.classList.add('is-hit'); setTimeout(() => best.el.remove(), 260);
  const great = bd <= AD_DANCE.great;
  _add.good++; if (great) _add.great++;
  _addSay(great ? 'Great!' : 'Good', great ? 'is-great' : 'is-good');
  wdSound([[great ? 1046 : 880, 0.12, 'triangle', 0.008]]);
  if (_add.good % AD_DANCE.every === 0) { try { gartEmoteRun(Math.floor(_add.good / AD_DANCE.every) % 2 ? 'dance' : 'twirl'); } catch (e) { /* standing */ } }
  const N = adNow();
  if (_add.good === AD_DANCE.xp) {
    adSet('dn', (Number(adGet('dn')) || 0) + (adGet('dd.' + N.nn) ? 0 : 1)); adSet('dd.' + N.nn, 1);
    const first = adKeep('ad-dance-ribbon');
    if (!first) adGive('dance.' + N.nn, { x: 3 }, 'A dance in the lantern light');
    else adGive('dance.' + N.nn, { x: 3 });
  }
  if (_add.great === AD_DANCE.reel && adGrant('reel', { 'craft:reel-step': 1 })) setTimeout(() => { if (_wd.on) wdAmbient('You learned the reel! It is on your moves wheel (press Q).', 7000, 'music'); }, 900);
}
adHear('dance', (A, ev) => {
  const w = Number.isInteger(ev.w) ? ev.w : A && A.w; if (!Number.isInteger(w)) return;
  if (Number(ev.n) === 1) _add.them.set(w, { f: String(ev.i || ''), at: performance.now() }); else _add.them.delete(w);
});
/* ---------- the night's dance in the world ---------- */
function _addTick(m, N) {
  const now = adDanceNow(m, N), was = _add.on;
  if (!now) {
    if (was) { adDanceStop(); _addLamps(null, 0); _addCrowd(m, null); _ad.picks.delete('dance'); _add.on = null; }
    return;
  }
  if (!was || was.f.id !== now.f.id) { if (was) { adDanceStop(); _addLamps(null, 0); } _add.on = now; /* (by the floor's id: the floors are worked out again as the world settles, and the same floor goes on) */ if (now.why === 'sat' && !m.visit && !adGet('ds.' + N.nn)) { adSet('ds.' + N.nn, 1); setTimeout(() => { if (_wd.on) wdAmbient(`It is barn dance night, by ${_adbName(now.f.t)}. You can hear the fiddle from here.`, 7000, 'music'); }, 1800); } }
  else _add.on = now;
  const D = _add.on;
  _addBeatWake();
  _addCrowd(m, D);
  const lit = Math.min(AD_DANCE.lamps, (_add.strip ? 1 : 0) + _addDancers(D).length + _addWatching(D));
  _addLamps(D, lit);
  // on the floor and not dancing yet: E (or a click on the prompt) to dance
  if (typeof _gw !== 'undefined' && !_add.strip && _addOnFloor(D, _gw.px, _gw.py)) _ad.picks.set('dance', { x: _gw.px, y: _gw.py, words: 'Dance', run: () => adDanceStart(), promptY: _gw.py - 2.1, pri: 0.9 });
  else _ad.picks.delete('dance');
}
wdMod({
  id: 'ad-music', pref: 'night', visit: true,
  begin() { _adb.crowd = new Map(); _add.on = null; _add.them = new Map(); },
  tick(m) {
    if (!adOn() || GARDEN_WORLD.v < 3) { this.end(); return; }
    const N = adNow(m);
    _addTick(m, N);
    _adbTick(m, N);
  },
  end() {
    _adbStopPlaying(); adDanceStop();
    if (typeof _vfr !== 'undefined') for (const h of _adb.crowd.values()) for (const vid of h.keys()) adFolkLetGo(_vfr.V.get(vid));
    _adb.crowd = new Map(); adSpritesOff('hat-'); adSpritesOff('dl-'); _ad.picks.delete('dance'); _add.on = null; _add.beatOn = false;
  },
});
