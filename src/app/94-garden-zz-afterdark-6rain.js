/* ============================================================
   AFTER DARK, rain things (FUN-ROADMAP Phase 8): mushrooms after rain, the rainbow's foot, weather sayings and the weathervane.
     Mushrooms: the morning after rain (rain since yesterday noon; spring, summer and autumn) the damp ground at the foot of one tree in
       AD_SHROOM.every has a cluster, and one morning in three a full fairy ring stands on open grass among trees. Mother Thistle sorts what
       you pick: for the pot, just for looking at, leave that one alone. Stand in the ring at dusk that day (with friends, brighter for
       each) and it shimmers.
     The rainbow's foot: when a shower has just passed, the rainbow really touches the ground on open grass near the end of its arc, with
       a shimmer of seven colours, for four minutes. Whoever gets there first gets a colour they have not got; everyone after, a colour too.
       With friends it is a race (the live family 'nt': bow, bowin, bowgot; the host ranks who arrives).
     Weather sayings: old lore the villagers say when its sign shows (gulls on the green, swallows high or low, dew, a ring round the
       moon, red water, webs on a hedge, frost under a clear moon): each true to the forecast the garden goes by.
     The weathervane: guess tomorrow (fair, rain, or snow in winter); after noon the next day it says if you were right. Right: a seed
       packet. Friends see the guess (`nt.g`).
   Everything stands at kinds of places (tree feet, open grass, still water, fences and hedges, decorations). Saves: ad.wt (when it last
   rained, ms), ad.wx.<day> (rain 1 or snow 2 seen that day), ad.mu.<day>.<cluster>, ad.ag (fly agarics left alone), ad.ring.<day>,
   ad.rb.<day> (rainbows today), ad.rbp.<day>.<round>, ad.sy.<saying> (first heard), ad.vg.<day> (your guess for the next day),
   ad.vr.<day> (the answer: 1 right, 2 not).
   ============================================================ */
const _adr = { ids: new Set(), clusters: null, cKey: '', ring: null, ringKey: '', hold: 0, bow: null, wasWet: null, dryAt: 0, rbT: -9999, signs: [], signKey: '', said: new Set() };
/* ---------- the rain, kept ---------- */
function _adrWetTrack(m) {
  if (m.visit) return;
  const last = Number(m.rain && m.rain.last) || 0;
  if (last && last > (Number(adGet('wt')) || 0)) adSet('wt', Math.floor(last));
  if (m.rain && (m.rain.now || m.rain.snow)) { const dn = gtgDayNum(m.today), v = m.rain.snow ? 2 : 1; if (adGet('wx.' + dn) !== v && adGet('wx.' + dn) !== 2) adSet('wx.' + dn, v); }
}
adWire(o => { const t = Number(adGet('wt')) || 0; if (t) o.w = gtgDayNum(_gdDayOf(t)); });
/** Has it rained since yesterday noon, in the garden you stand in (the host's, on a visit: their `nt.w`)? */
function adRainedLast(m, N) {
  if (_ad.dev.wet) return true;
  const y = _gdAddDays(N.day, -1);
  if (m.visit) { const w = adTheirs(m).w; return Number.isInteger(w) && w >= gtgDayNum(y); }
  const t = Math.max(Number(adGet('wt')) || 0, Number(m.rain && m.rain.last) || 0);
  return t >= _gdDayMs(y, 720);
}
/* ---------- mushrooms ---------- */
function _adrShroomPick(r) { const tot = AD_SHROOMS.reduce((a, s) => a + s.w, 0); let v = r() * tot; for (const s of AD_SHROOMS) { v -= s.w; if (v <= 0) return s; } return AD_SHROOMS[0]; }
/** The clusters near what you can see this morning: one tree in AD_SHROOM.every, chosen by the garden's key, the day and the tree. */
function _adrClusters(m, N) {
  const dn = gtgDayNum(N.day), v = adView(2), key = dn + '|' + Math.floor(v.x0 / 4) + ',' + Math.floor(v.y0 / 4) + '|' + N.key;
  if (_adr.cKey === key && _adr.clusters) return _adr.clusters;
  const out = [], cap = m.season === 'autumn' ? AD_SHROOM.autumn : AD_SHROOM.show;
  for (const t of adTrees()) {
    if (out.length >= cap) break;
    if (t.x < v.x0 || t.x > v.x1 || t.y < v.y0 || t.y > v.y1) continue;
    const tk = Math.round(t.x * 10) + '-' + Math.round(t.y * 10), h = gardenHash(N.key + '|mu|' + dn + '|' + tk);
    if (h % AD_SHROOM.every !== 0) continue;
    const r = gardenRand(h); let spot = null;
    for (let i = 0; i < 7 && !spot; i++) { const a = r() * Math.PI * 2, d = 0.8 + r() * 1.0, x = t.x + Math.cos(a) * d, y = t.y + 0.22 + Math.abs(Math.sin(a)) * d * 0.55; if (adOpen(x, y, m) && gardenTerrainTakes('mushroom', x, y) && !adHidden(x, y)) spot = { x, y }; }
    if (!spot) continue;
    out.push({ id: 'mu-' + dn + '-' + tk, nn: dn, tk, x: spot.x, y: spot.y, kind: _adrShroomPick(r), n: 3 + Math.floor(r() * 3), seed: h });
  }
  _adr.cKey = key; _adr.clusters = out;
  return out;
}
function _adrCapSvg(S, x, y, k, r) {
  const A = GART, st = A.P(S.stem, `M${x - 0.9 * k} ${y}L${x - 0.7 * k} ${y - 3.4 * k}H${x + 0.7 * k}L${x + 0.9 * k} ${y}Z`);
  if (S.round) return A.P('#000000', A.ell(x, y + 0.3, 3.4 * k, 0.9 * k), 0.2) + A.P(S.cap, A.circ(x, y - 2.6 * k, 2.8 * k)) + A.P('#ffffff', A.ell(x - 1 * k, y - 3.6 * k, 1.1 * k, 0.8 * k), 0.8) + A.P(S.gill, A.ell(x + 0.8 * k, y - 1.4 * k, 1.4 * k, 0.6 * k), 0.4);
  if (S.tall) return A.P('#000000', A.ell(x, y + 0.3, 2.6 * k, 0.8 * k), 0.2) + st + A.P(S.cap, `M${x - 2 * k} ${y - 2.4 * k}Q${x - 2.4 * k} ${y - 8 * k} ${x} ${y - 9 * k}Q${x + 2.4 * k} ${y - 8 * k} ${x + 2 * k} ${y - 2.4 * k}Z`) + A.S(S.gill, 0.7 * k, `M${x - 2 * k} ${y - 2.4 * k}Q${x} ${y - 1.4 * k} ${x + 2 * k} ${y - 2.4 * k}`) + A.S('#b8b0a4', 0.4 * k, `M${x - 1 * k} ${y - 7 * k}l0.4 1.2M${x + 0.6 * k} ${y - 6 * k}l0.4 1.2`) + A.P('#ffffff', A.ell(x - 0.9 * k, y - 6.4 * k, 0.6 * k, 1.4 * k), 0.6);
  let s = A.P('#000000', A.ell(x, y + 0.3, 3.4 * k, 0.9 * k), 0.2) + st + A.P(S.cap, `M${x - 3.4 * k} ${y - 2.6 * k}Q${x - 3 * k} ${y - 6.4 * k} ${x} ${y - 6.6 * k}Q${x + 3 * k} ${y - 6.4 * k} ${x + 3.4 * k} ${y - 2.6 * k}Q${x} ${y - 1.8 * k} ${x - 3.4 * k} ${y - 2.6 * k}Z`) + A.P(S.gill, `M${x - 3.2 * k} ${y - 2.6 * k}Q${x} ${y - 1.6 * k} ${x + 3.2 * k} ${y - 2.6 * k}Q${x} ${y - 2.2 * k} ${x - 3.2 * k} ${y - 2.6 * k}Z`, 0.7) + A.P('#ffffff', A.ell(x - 1.4 * k, y - 5.2 * k, 1.2 * k, 0.6 * k), 0.45);
  if (S.spots) for (const [dx, dy] of [[-1.6, -4.6], [0.4, -5.8], [1.8, -4], [-0.2, -3.6]]) s += A.P('#fbf6ea', A.circ(x + dx * k, y + dy * k, 0.5 * k));
  void r; return s;
}
function _adrClusterSvg(c) {
  const r = gardenRand(c.seed), L = ['#8a5a2a', '#b07a3a', '#6a7a3a', '#9a6a30'], A = GART; let s = '';
  for (let i = 0; i < 6; i++) { const x = (r() - 0.5) * 22, y = (r() - 0.5) * 5 + 1; s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(2 + r() * 1.6).toFixed(1)}" ry="${(1 + r() * 0.6).toFixed(1)}" fill="${L[i % 4]}" opacity="0.8" transform="rotate(${Math.round(r() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }
  s += A.P('#5e7a3a', A.ell(-6, 1.2, 5, 1.4), 0.55);
  const caps = []; for (let i = 0; i < c.n; i++) caps.push([(i - (c.n - 1) / 2) * 4.6 + (r() - 0.5) * 2.4, (r() - 0.5) * 2.4, 0.78 + r() * 0.5]);
  caps.sort((a, b) => a[1] - b[1]); for (const [x, y, k] of caps) s += _adrCapSvg(c.kind, x, y, k, r);
  return s;
}
/** Mother Thistle sorts what you picked: her portrait when she lives here, her note when not. */
function _adrThistle(text, m) {
  const r = typeof WD_FOLK !== 'undefined' ? WD_FOLK.find(x => x.id === 'thistle') : null, fk = m.visit ? ((m.visit.snap && m.visit.snap.fk) || []) : (typeof gardenFolkSnap === 'function' ? gardenFolkSnap() || [] : []), lives = fk.some(x => x[0] === 'thistle');
  let art = ''; try { art = r && lives ? _wdFolkArt(r) : ''; } catch (e) { art = ''; }
  wdTalk({ name: lives ? 'Mother Thistle' : 'A note from Mother Thistle', art, lines: [text], at: typeof _gw !== 'undefined' ? { x: _gw.px, y: _gw.py } : null, bye: 'Thank you' });
}
function _adrTake(c, m) {
  const k = 'mu.' + c.nn + '.' + c.tk; if (adGet(k)) return;
  adSet(k, 1);
  const S = c.kind;
  if (S.sort === 'pot') { adGive('mu.' + c.tk, { [S.item]: 2, x: 1 }); _adrThistle('“' + S.say + '” Two field mushrooms are in your basket.', m); }
  else if (S.sort === 'look') { const first = adKeep(S.keep); if (!first) adGive('mu.' + c.tk, { x: 1 }); _adrThistle('“' + S.say + '”' + (first ? '' : ' You leave it where it is, and remember it.'), m); }
  else { const n = (Number(adGet('ag')) || 0) + 1; adSet('ag', n); _adrThistle('“' + S.say + '”' + (n >= 3 && !adHas('toadstool-cap') ? ' You leave it. Somebody notices: a little red cap turns up in your pocket, for being sensible.' : ''), m); if (n >= 3) adKeep('toadstool-cap'); }
  try { _glFx(c.x, c.y, 'sparkle', { lift: 6 }); } catch (e) { /* no fx */ }
}
/** One morning in three, a full ring on open grass among trees (the star-fall places, with two trees near): the same for every visitor. */
function _adrRingSpot(m, N) {
  const dn = gtgDayNum(N.day), key = dn + '|' + N.key + '|' + (m.areas || []).length;
  if (_adr.ringKey === key) return _adr.ring;
  _adr.ringKey = key; _adr.ring = null;
  if (gardenHash(N.key + '|ring|' + dn) % AD_SHROOM.ring !== 0 && !_ad.dev.wet) return null;
  const C = typeof _adf !== 'undefined' && _adf.done ? _adf.cands : null; if (!C || !C.length) { _adr.ringKey = ''; return null; }
  const T = adTrees(), near = C.filter(p => adOpen(p.x, p.y, m) && T.filter(t => Math.abs(t.x - p.x) < 5 && Math.abs(t.y - p.y) < 5).length >= 2);
  if (near.length) { const p = near[gardenHash(N.key + '|ringp|' + dn) % near.length]; _adr.ring = { x: p.x, y: p.y, dn }; }
  return _adr.ring;
}
function _adrRingSvg(R, glow) {
  let s = glow ? `<ellipse class="ad-glow-b" rx="34" ry="12" fill="#f0e0ff" opacity="${(0.12 + 0.07 * glow).toFixed(2)}"/>` : '';
  const S = AD_SHROOMS[0], r = gardenRand('ring|' + R.dn);
  const caps = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, x = Math.cos(a) * 26, y = Math.sin(a) * 9; caps.push([x, y, 0.7 + r() * 0.35]); }
  caps.sort((a, b) => a[1] - b[1]);
  s += '<ellipse rx="27" ry="9.4" fill="none" stroke="#4e7a34" stroke-width="5" opacity="0.35"/>';
  for (const [x, y, k] of caps) s += _adrCapSvg(S, x, y, k, r);
  if (glow) for (let i = 0; i < 6 + glow * 3; i++) { const a = i / (6 + glow * 3) * Math.PI * 2, x = Math.cos(a) * 18, y = Math.sin(a) * 6 - 8; s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="ad-twinkle" style="animation-delay:${(-i * 0.21).toFixed(2)}s"><path d="M0 -2.4L0.5 -0.5L2.4 0L0.5 0.5L0 2.4L-0.5 0.5L-2.4 0L-0.5 -0.5Z" fill="#fff4ff"/></g></g>`; }
  return s;
}
/** Everyone standing inside the ring now: you and friends here (their figures are on every screen already: nothing is sent). */
function _adrInRing(R) {
  let n = 0; const inside = (x, y) => Math.hypot(x - R.x, (y - R.y) * 1.4) < 0.62;
  if (typeof _gw !== 'undefined' && inside(_gw.px, _gw.py)) n++;
  try { if (typeof _gll !== 'undefined' && _gll.actors) for (const A of _gll.actors.values()) if (A && !A.me && !A.rm && !A.away && Number.isFinite(A.x) && inside(A.x, A.y)) n++; } catch (e) { /* alone */ }
  return n;
}
function _adrRingTick(m, N, R, want) {
  const dusk = N.tod === 'dusk', people = dusk ? _adrInRing(R) : 0, me = typeof _gw !== 'undefined' && Math.hypot(_gw.px - R.x, (_gw.py - R.y) * 1.4) < 0.62;
  want.add('ring');
  adSprite('ring', { x: R.x, y: R.y, z: R.y - 0.7, svg: _adrRingSvg(R, people ? Math.min(4, people) : 0), hit: 0 });
  if (people) wdGlow('ad-ring', adGlowSvg('pink', 26 + people * 8, 4), R.x, R.y); else wdGlowOff('ad-ring');
  if (!dusk || !me) { _adr.hold = 0; return; }
  _adr.hold++;
  if (_adr.hold === 2) wdAmbient(people > 1 ? 'The ring shimmers round you all. Stay a moment.' : 'The ring shimmers. Stay a moment.', 4000, 'ring');
  if (_adr.hold >= AD_SHROOM.hold && !adGet('ring.' + R.dn)) {
    adSet('ring.' + R.dn, 1);
    adKeep('ad-fairy-dust');
    adGive('ring.' + R.dn, { 'seed:glowcap': Math.min(4, Math.max(1, people)), x: 2 }, `Fairy dust on your sleeves, and ${_wdPlural(Math.min(4, Math.max(1, people)), 'glowcap seed')} in the grass`);
  }
}
/* ---------- the rainbow's foot ---------- */
/** The open grass or sand nearest the end of the arc, that you can walk to and that is open land (a cell's middle). */
function _adrFootNear(x, y, m) {
  for (let r = 0; r <= 7; r += 0.5) for (let i = 0; i < Math.max(1, Math.round(r * 6)); i++) {
    const a = i / Math.max(1, Math.round(r * 6)) * Math.PI * 2, cx = Math.floor(x + Math.cos(a) * r) + 0.5, cy = Math.floor(y + Math.sin(a) * r * 0.7) + 0.5, t = gardenTerrainAt(cx, cy);
    if (t !== 'open-grass' && t !== 'snow' && t !== 'sand' && t !== 'slope') continue;
    if (!adOpen(cx, cy, m) || (typeof _gwFree === 'function' && !_gwFree(cx, cy)) || gardenAffordOverlap(cx, cy) || adHidden(cx, cy)) continue;
    return { x: cx, y: cy };
  }
  return null;
}
/** The rainbow surprise's arc is drawn (94-garden-wonder-a-weather.js asks first): the host puts its foot down and tells friends. True: the
 *  foot is ours (the old pot is not placed). */
function gardenNightRainbowFoot(e, cfg, W) {
  if (!adOn() || !W || !W.own || gardenFun() === 'off') return false;
  const m = gardenHere(); if (m.visit) return false;
  const G = GARDEN_WORLD, v = W.view(), cx = (v.x0 + v.x1) / 2, span = (v.x1 - v.x0) * 0.44, side = Math.random() < 0.5 ? -1 : 1, base = (_glStage(0, v.y0).y + (v.x1 - v.x0) * G.cellW * 0.44 * 0.72 - G.sky) / G.cellH;
  const foot = _adrFootNear(cx + side * span, base, m); if (!foot) return false;
  const i = 'rb' + Math.floor(Date.now() / 1000).toString(36);   // clock-ok: a round's id
  _adrBowStart({ i, x: foot.x, y: foot.y, tt: 240, host: true });
  if (adHostLive()) adLive('bow', { i, x: Math.floor(foot.x), y: Math.floor(foot.y), tt: 240 });
  return true;
}
function _adrBowStart(o) { _adr.bow = { i: o.i, x: o.x, y: o.y, until: performance.now() + o.tt * 1000, t0: performance.now(), tt: o.tt, host: !!o.host, order: [], asked: false, paid: false }; wdSound([[784, 0.5, 'sine', 0.012], [988, 0.6, 'sine', 0.01, 0.12]]); }
function _adrBowSvg(B) {
  const cols = ['#e8504e', '#f09a3e', '#f2d44a', '#62b85a', '#4a8ae0', '#5a5ac8', '#9a5ac0'], left = Math.max(0.15, (B.until - performance.now()) / (B.tt * 1000));
  let s = `<ellipse rx="${(30 * left + 6).toFixed(1)}" ry="${(10 * left + 2).toFixed(1)}" fill="none" stroke="#fff8e0" stroke-width="1.2" opacity="0.7"/>`;
  cols.forEach((c, k) => { s += `<rect class="ad-band" style="animation-delay:${(-k * 0.3).toFixed(1)}s" x="${(-10.5 + k * 3).toFixed(1)}" y="-120" width="3.2" height="120" fill="${c}" opacity="0.32"/>`; });
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, x = Math.cos(a) * 14, y = Math.sin(a) * 4.6; s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="ad-twinkle" style="animation-delay:${(-k * 0.19).toFixed(2)}s"><path d="M0 -2.6L0.6 -0.6L2.6 0L0.6 0.6L0 2.6L-0.6 0.6L-2.6 0L-0.6 -0.6Z" fill="${cols[k]}"/></g></g>`; }
  return s;
}
function _adrBowTick(m, want) {
  const B = _adr.bow; if (!B) return;
  if (performance.now() > B.until) { _adr.bow = null; adSprite('bow', null); wdGlowOff('ad-bow'); return; }
  want.add('bow');
  adSprite('bow', { x: B.x, y: B.y, z: B.y - 0.2, svg: _adrBowSvg(B), hit: 0 });
  wdGlow('ad-bow', '<ellipse class="ad-glow-b" cy="-40" rx="22" ry="60" fill="#fff4d8" opacity="0.2"/>', B.x, B.y);
  if (B.paid || typeof _gw === 'undefined' || Math.hypot(_gw.px - B.x, (_gw.py - B.y) * 1.3) > 1.2) return;
  if (B.host || !adRole() || adRole() === 'host') {   // (your own garden: you rank yourself)
    if (!B.order.includes(0)) { B.order.push(0); if (adHostLive()) _adrBowTell(B); }
    _adrPay(B, B.order.indexOf(0) + 1);
  } else if (!B.asked) { B.asked = true; adLive('bowin', { i: B.i }); }
}
function _adrBowTell(B) { adLive('bowgot', { i: B.i, l: B.order.slice(0, GL_PEOPLE).map((s, k) => [s, k + 1, 0]) }); }
/** You reached the foot: the first gets a colour they have not got, everyone after a colour too (a second of one: a seed packet); the
 *  day's first claim still finds the pot's six coins. Paid once a round, on your own app. */
function _adrPay(B, rank) {
  if (B.paid) return; B.paid = true;
  const dn = gtgDayNum(gtgToday()), k = 'rbp.' + dn + '.' + B.i; if (adGet(k)) return; adSet(k, 1);
  const missing = AD_RAINBOW.filter(c => !adHas('ad-rainbow-' + c)), col = rank === 1 && missing.length ? missing[0] : AD_RAINBOW[Math.floor(Math.random() * AD_RAINBOW.length)];
  const isNew = adKeep('ad-rainbow-' + col);
  const g = _gdG(), today = gtgToday(), pot = !g.led['wdrb.' + today];
  if (pot) { g.led['wdrb.' + today] = { d: today, k: 'wd', c: 6, x: 2, n: 1 }; _gdSave(); }
  if (!isNew) { const pool = typeof _gdSeedPool === 'function' ? _gdSeedPool(p => p.rarity === 'common' || p.rarity === 'uncommon') : []; if (pool.length) adGive('rbs.' + B.i, { ['seed:' + pool[gardenHash(B.i) % pool.length]]: 1 }); }
  const all = AD_RAINBOW.every(c => adHas('ad-rainbow-' + c));
  if (all) adGrant('rainbow-arch', { 'decor:rainbow-arch': 1 }, 'All seven colours: a rainbow arch is in your bag');
  setTimeout(() => { if (_wd.on) wdAmbient((rank === 1 ? 'First to the foot of the rainbow! ' : 'You reached the rainbow’s foot. ') + `A ${col} scale${isNew ? '' : ' (you had one: a seed packet with it)'}${pot ? ', and six coins in an old pot' : ''}.`, 7000, 'rainbow'); }, isNew ? 2600 : 300);
  try { _glFx(B.x, B.y, 'sparkle', { lift: 20 }); } catch (e) { /* no fx */ }
}
/** The host's own trigger: a rainbow a few minutes after a shower stops (dawn, day or dusk), at most two a day. */
function _adrRainbowTrigger(m) {
  if (m.visit || !_gl || !_gl.W || !_gl.W.own || m.tod === 'night') return;
  const wet = !!(m.rain && m.rain.now);
  if (_adr.wasWet === true && !wet) _adr.dryAt = m.now;
  _adr.wasWet = wet;
  if (wet || _adr.bow) return;
  let w = null; try { w = _gdWeather(); } catch (e) { w = null; }
  const stop = _adr.dryAt || (m.rain && m.rain.last ? m.rain.last + (w ? 30 : 50) * 60000 : 0), ago = (m.now - stop) / 60000;
  if (!stop || ago < 2 || ago > 25 || _wd.t - _adr.rbT < 900) return;
  const k = 'rb.' + gtgDayNum(m.today), n = Number(adGet(k)) || 0; if (n >= 2) return;
  adSet(k, n + 1); _adr.rbT = _wd.t;
  const e = GL_EGG.get('rainbow'); if (!e) return;
  try { GARDEN_LIFE_EFFECTS.rainbow(e, e.effect, _gl.W); if (typeof gardenLiveEgg === 'function') gardenLiveEgg('rainbow'); } catch (err) { /* no sky layer */ }
}
adHear('bow', (A, ev) => { if (adRole() !== 'visit') return; _adrBowStart({ i: String(ev.i), x: ev.x + 0.5, y: ev.y + 0.5, tt: Number(ev.tt) || 120 }); });
adHear('bowin', (A, ev) => { const B = _adr.bow, w = Number.isInteger(ev.w) ? ev.w : A && A.w; if (adRole() !== 'host' || !B || B.i !== ev.i || !Number.isInteger(w)) return; if (!B.order.includes(w)) { B.order.push(w); _adrBowTell(B); } });   // (ev.w: the slot of whoever sent it)
adHear('bowgot', (A, ev) => { const B = _adr.bow; if (adRole() !== 'visit' || !B || B.i !== ev.i) return; let me = -1; try { me = _glv.w; } catch (e) { me = -1; } const row = (ev.l || []).find(r => r[0] === me); if (row) _adrPay(B, row[1]); });
adJoin((f) => { const B = _adr.bow; if (B && B.host && performance.now() < B.until) adLiveTo(f, 'bow', { i: B.i, x: Math.floor(B.x), y: Math.floor(B.y), tt: Math.max(1, Math.round((B.until - performance.now()) / 1000)) }); });
/* ---------- weather sayings ---------- */
/** What the garden's weather says (your own garden): { wet, snow, frost } for tomorrow, wetToday, early (rain before seven this morning). */
function adForecast(m, N) {
  const D = _ad.dev, tm = _gdAddDays(N.day, 1); let w = null; try { w = _gdWeather(); } catch (e) { w = null; }
  const out = { wet: false, snow: false, frost: false, wetToday: false, early: false };
  const lastT = Number(m.rain && m.rain.last) || 0, today0 = _gdDayMs(N.day, 0), rainedToday = lastT >= today0 || adGet('wx.' + N.dn) === 1;
  if (w && w.tomorrow) {
    const t = w.tomorrow, d = w.today || {};
    out.wet = _GD_WET.has(t.cond) || Number(t.rainChance) >= 60; out.snow = t.cond === 'snow'; out.frost = Number.isFinite(Number(t.lo)) && Number(t.lo) <= 1;
    out.wetToday = rainedToday || _GD_WET.has(d.cond) || Number(d.rainChance) >= 60;
    out.early = rainedToday && lastT && lastT < _gdDayMs(N.day, 7 * 60);
  } else {
    out.wet = !!_gdShowerAt(tm); out.snow = out.wet && m.season === 'winter'; out.frost = m.season === 'winter' && !out.wet && gardenHash('ad-frost|' + tm) % 3 === 0;
    const sh = _gdShowerAt(N.day); out.wetToday = !!sh || rainedToday; out.early = !!sh && sh < _gdDayMs(N.day, 7 * 60);
  }
  if (D.wet) { out.wet = true; out.wetToday = true; }
  return out;
}
/** The sayings whose sign shows now (at most two at once; your own garden). */
function _adrSigns(m, N) {
  const key = N.dn + '|' + m.tod + '|' + Math.floor(N.hour) + '|' + _ad.devV;
  if (_adr.signKey === key) return _adr.signs;
  _adr.signKey = key;
  if (m.visit || m.rain && (m.rain.now || m.rain.snow)) { _adr.signs = []; return []; }
  const F = adForecast(m, N), out = [];
  for (const s of AD_SAYINGS) {
    if (s.tod && !s.tod.includes(m.tod)) continue;
    if (s.season && !s.season.includes(m.season)) continue;
    const ok = s.when === 'wet' ? F.wet : s.when === 'fair' ? !F.wet : s.when === 'fair-today' ? !F.wetToday : s.when === 'wet-today' ? F.wetToday : s.when === 'frost' ? F.frost && !F.wet : s.when === 'early-rain' ? F.early && N.hour >= 7 && N.hour < 11.5 : false;
    if (ok) out.push(s);
  }
  out.sort((a, b) => gardenHash(a.id + N.dn) - gardenHash(b.id + N.dn));
  return _adr.signs = out.slice(0, 2);
}
function adSayingSign(id) { return _adr.signs.some(s => s.sign === id); }
const _AD_SIGN_ART = {
  gulls: () => { let s = ''; for (const [x, y, f, pk] of [[-10, 0, 1, 0], [6, 2, -1, 1], [16, -1, 1, 0]]) s += `<g transform="translate(${x} ${y}) scale(${f} 1)">${GART.P('#000000', GART.ell(0, 0.5, 5, 1.2), 0.2)}${GART.S('#e0a030', 0.8, 'M-1 0V-2.4M1 0V-2.4')}<g class="${pk ? 'ad-peck' : ''}">${GART.P('#f4f4f0', 'M-5 -4Q-5 -8 0 -8Q4 -8 5 -5Q4 -2 0 -2.4Q-4 -2.4 -5 -4Z')}${GART.P('#9aa4ac', 'M-4 -5.4Q0 -7.6 4 -5.6Q1 -4 -4 -5.4Z')}${GART.P('#f4f4f0', GART.circ(4.6, -8.4, 2))}${GART.P('#e8b030', 'M6.4 -8.6L9 -8L6.4 -7.6Z')}${GART.P('#1a1a1a', GART.circ(5.2, -8.8, 0.5))}</g></g>`; return s; },
  swallows: (low) => { let s = ''; for (let i = 0; i < 3; i++) s += `<g transform="translate(${-14 + i * 14} ${low ? -10 - i * 2 : -92 - i * 7})"><g class="ad-swoop" style="animation-delay:${(-i * 0.7).toFixed(1)}s"><path d="M-5 0Q-2 -1 0 0Q2 -1 5 0Q2 -0.2 1 1L0 3L-1 1Q-2 -0.2 -5 0Z" fill="#2a3448"/><path d="M-5 0Q-7 -2 -9 -1M5 0Q7 -2 9 -1" stroke="#2a3448" stroke-width="0.8" fill="none"/></g></g>`; return s; },
  dew: () => { let s = ''; for (let i = 0; i < 8; i++) { const x = -18 + (i * 29) % 36, y = -2 + ((i * 13) % 7) - 3; s += `<g transform="translate(${x} ${y})"><g class="ad-twinkle" style="animation-delay:${(-i * 0.37).toFixed(2)}s"><circle r="0.9" fill="#f0f8ff"/><path d="M0 -2L0.4 -0.4L2 0L0.4 0.4L0 2L-0.4 0.4L-2 0L-0.4 -0.4Z" fill="#ffffff" opacity="0.8"/></g></g>`; } return s; },
  webs: () => `<g opacity="0.75">${GART.S('#f4f6f8', 0.45, 'M0 -16L-9 -6M0 -16L9 -7M0 -16L-11 -14M0 -16L11 -15M0 -16L-4 -4M0 -16L5 -4M0 -16L0 -26')}<ellipse cy="-14" rx="4" ry="3" fill="none" stroke="#f4f6f8" stroke-width="0.4"/><ellipse cy="-13" rx="7.4" ry="5.6" fill="none" stroke="#f4f6f8" stroke-width="0.4"/><circle cx="-5" cy="-9" r="0.7" fill="#ffffff"/><circle cx="4" cy="-10" r="0.6" fill="#ffffff"/><circle cx="-1" cy="-20" r="0.6" fill="#ffffff"/></g>`,
};
function _adrSignDraw(m, N, want) {
  for (const s of _adr.signs) {
    if (s.sign === 'gulls') { for (const p of adSpots('grass', 2, 'gulls', m).filter(p => typeof gardenIslandCoastDistance !== 'function' || gardenIslandCoastDistance(p.x, p.y) >= 8)) { const id = 'sg-' + p.id; want.add(id); adSprite(id, { x: p.x, y: p.y, svg: _AD_SIGN_ART.gulls(), hit: 0 }); } }
    else if (s.sign === 'swallows-high' || s.sign === 'swallows-low') { for (const p of adSpots('grass', 1, 'swallows', m)) { const id = 'sw-' + p.id; want.add(id); adSprite(id, { x: p.x, y: p.y, z: p.y + 3, svg: _AD_SIGN_ART.swallows(s.sign === 'swallows-low'), hit: 0 }); } }
    else if (s.sign === 'dew') { for (const p of adSpots('grass', 3, 'dew', m)) { const id = 'dw-' + p.id; want.add(id); adSprite(id, { x: p.x, y: p.y, z: p.y - 0.4, svg: _AD_SIGN_ART.dew(), hit: 0 }); } }
    else if (s.sign === 'webs') { for (const p of adSpots('edge', 2, 'webs', m)) { const id = 'wb-' + p.id; want.add(id); adSprite(id, { x: p.x, y: p.y, svg: _AD_SIGN_ART.webs(), hit: 0 }); } }
    else if (s.sign === 'moon-ring' || s.sign === 'red-dusk' || s.sign === 'red-dawn' || s.sign === 'clear-moon') {
      for (const w of adStill()) {
        if (!adInView(w.x, w.y, 3)) continue;
        const id = 'sv-' + s.sign + '-' + w.id, rx = Math.min(140, (w.box.x1 - w.box.x0) * 20), ry = Math.min(70, (w.box.y1 - w.box.y0) * 11); want.add(id);
        const svg = s.sign === 'moon-ring' ? `<ellipse rx="${(rx * 0.3).toFixed(0)}" ry="${(ry * 0.3).toFixed(0)}" fill="none" stroke="#e8eef8" stroke-width="2" opacity="0.32"/><ellipse rx="${(rx * 0.34).toFixed(0)}" ry="${(ry * 0.34).toFixed(0)}" fill="none" stroke="#c8d8f0" stroke-width="5" opacity="0.1"/>`
          : s.sign === 'clear-moon' ? Array.from({ length: 26 }, (_, i) => `<circle cx="${((gardenHash(w.id + 'cx' + i) % 200) - 100) / 100 * rx * 0.8}" cy="${((gardenHash(w.id + 'cy' + i) % 200) - 100) / 100 * ry * 0.7}" r="0.9" fill="#ffffff" opacity="0.7"/>`).join('')
          : `<ellipse rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="#ff7a52" opacity="0.16"/>`;
        wdGlow('ad-' + id, svg, w.x, w.y);
      }
    }
  }
}
/** A villager near you, when a sign shows, says its saying (once a day each). Otherwise Wick's card on the notice board has it. */
function _adrSay(m, N) {
  if (m.visit || !_adr.signs.length || typeof gardenFolkFeet !== 'function' || typeof _gw === 'undefined') return;
  let who = null; try { for (const f of gardenFolkFeet()) if (Math.hypot(f.x - _gw.px, f.y - _gw.py) < 6) { who = f; break; } } catch (e) { who = null; }
  if (!who) return;
  for (const s of _adr.signs) {
    const k = N.dn + s.id; if (_adr.said.has(k) || adGet('say.' + N.dn + '.' + s.id)) continue;
    _adr.said.add(k); adSet('say.' + N.dn + '.' + s.id, 1); if (!adGet('sy.' + s.id)) adSet('sy.' + s.id, N.day);
    const at = { gulls: 'looking at the gulls', 'swallows-high': 'watching the swallows', 'swallows-low': 'watching the swallows', dew: 'looking at the grass', 'moon-ring': 'looking up', 'red-dusk': 'looking at the water', 'red-dawn': 'looking at the water', 'clear-moon': 'looking up', webs: 'stopping at a hedge', 'early-rain': 'shaking out a coat' }[s.sign] || 'looking about';
    wdAmbient(`${String(who.name)}, ${at}: “${s.words}”`, 7000, 'saying');
    adGive('sy.' + s.id, { x: 1 });
    break;
  }
}
/* ---------- the weathervane ---------- */
const AD_GUESS = Object.freeze(['', 'Fair', 'Rain', 'Snow']);
adWire(o => { try { const dn = gtgDayNum(gtgToday()), g = Number(adGet('vg.' + dn)) || 0; if (g >= 1 && g <= 3) o.g = [dn, g]; } catch (e) { /* none */ } });
function adGuess(v) {
  const dn = gtgDayNum(gtgToday()); if (adGet('vg.' + dn) === v) return;
  adSet('vg.' + dn, v); gtgPublishSoon();
  wdSound([[523, 0.2, 'triangle', 0.02], [659, 0.3, 'triangle', 0.018, 0.12]]);
  gpNote(`The weathervane says ${AD_GUESS[v].toLowerCase()} for tomorrow, if you say so. Come back after noon tomorrow`);
}
/** After noon: was yesterday's guess right about today? Right: a seed packet (once a day). Nothing is lost for a wrong guess. */
function _adrVaneCheck(m, N) {
  if (m.visit || N.hour < 12) return;
  const dn = N.dn, g = Number(adGet('vg.' + (dn - 1))) || 0; if (!g || adGet('vr.' + dn)) return;
  const F = adForecast(m, N), snow = adGet('wx.' + dn) === 2 || (m.rain && m.rain.snow), wet = F.wetToday || adGet('wx.' + dn) === 1, real = snow ? 3 : wet ? 2 : 1, right = g === real || (g === 2 && real === 3);
  adSet('vr.' + dn, right ? 1 : 2);
  if (right) { const pool = typeof _gdSeedPool === 'function' ? _gdSeedPool(p => p.rarity === 'common' || p.rarity === 'uncommon') : []; adGive('vane.' + dn, Object.assign({ x: 2 }, pool.length ? { ['seed:' + pool[gardenHash('vane' + dn) % pool.length]]: 1 } : {})); }
  setTimeout(() => { if (_wd.on) wdAmbient(right ? `The weathervane was right: ${AD_GUESS[real].toLowerCase()} it is. A seed packet is in your bag.` : `Not this time: it is ${AD_GUESS[real].toLowerCase()} today. Tell the weathervane what you think tomorrow will be.`, 7000, 'vane'); }, 3000);
}
/** Your guess (at home) or your friend's (on a visit, their `nt.g`), for the vane to point at: 0 none, 1 fair, 2 rain, 3 snow. */
function _adrGuessHere(m, N) { if (m.visit) { const g = adTheirs(m).g; return Array.isArray(g) && g[0] === N.dn ? g[1] : 0; } return Number(adGet('vg.' + N.dn)) || 0; }
function _adrVaneMarks(m, N, want) {
  const g = _adrGuessHere(m, N); if (!g) return;
  const sym = g === 1 ? `<circle r="4" fill="#f4c84a"/><path d="M0 -7V-5.4M0 5.4V7M-7 0H-5.4M5.4 0H7M-5 -5L-3.8 -3.8M3.8 3.8L5 5M-5 5L-3.8 3.8M3.8 -3.8L5 -5" stroke="#f4c84a" stroke-width="1.1"/>` : g === 2 ? '<path d="M0 -6C2 -3 3.4 -1.4 3.4 0.4A3.4 3 0 0 1 -3.4 0.4C-3.4 -1.4 -2 -3 0 -6Z" fill="#6aa8e8"/><ellipse cx="-1" cy="-0.6" rx="0.8" ry="1.2" fill="#ffffff" opacity="0.8"/>' : '<path d="M0 -6V6M-5.2 -3L5.2 3M-5.2 3L5.2 -3" stroke="#e8f4ff" stroke-width="1.3" stroke-linecap="round"/>';
  for (const d of m.decor) {
    if (d.def.id !== 'weathervane') continue;
    const x = d.x + 0.5, y = d.y + 1; if (!adInView(x, y, 2)) continue;
    const id = 'vn-' + d.x + '-' + d.y; want.add(id);
    adSprite(id, { x: x + 0.42, y: y + 0.02, svg: `<g transform="translate(0 -104)"><g class="ad-bob"><circle r="9" fill="#fffaf0" opacity="0.85"/>${sym}</g></g>`, hit: 0 });
  }
}
function gardenNightVaneOpen() {
  gpStage('The weathervane', (el) => {
    const m = gardenHere(), N = adNow(m);
    el.appendChild(gpEl('p', 'gp-lead', 'Tell the weathervane what you think tomorrow will be. After noon tomorrow it will say if you were right. A right guess is worth a seed packet; a wrong one costs nothing.'));
    if (m.visit) { const g = _adrGuessHere(m, N), who = (m.visit.name || 'Your friend').split(/\s+/)[0]; el.appendChild(gpEl('p', null, g ? `${who} thinks tomorrow will be ${AD_GUESS[g].toLowerCase()}.` : `${who} has not told their weathervane anything today.`)); el.appendChild(gpEl('p', 'muted', 'Guess for your own garden at your own weathervane.')); return; }
    const now = Number(adGet('vg.' + N.dn)) || 0, row = gpEl('div', 'ad-vane-go');
    for (const v of (m.season === 'winter' ? [1, 2, 3] : [1, 2])) { const b = gpEl('button', 'btn ' + (now === v ? 'btn-primary' : 'btn-secondary'), AD_GUESS[v]); b.type = 'button'; b.setAttribute('aria-pressed', now === v ? 'true' : 'false'); b.onclick = () => { adGuess(v); gardenNightVaneOpen(); }; row.appendChild(b); }
    el.appendChild(row);
    if (now) el.appendChild(gpEl('p', 'muted', `You have said ${AD_GUESS[now].toLowerCase()} for tomorrow. You can change your mind until midnight.`));
    const r = adGet('vr.' + N.dn), y = Number(adGet('vg.' + (N.dn - 1))) || 0;
    if (r) el.appendChild(gpEl('p', null, r === 1 ? `Yesterday you said ${AD_GUESS[y].toLowerCase()}, and you were right.` : `Yesterday you said ${AD_GUESS[y].toLowerCase()}. Not this time.`));
    else if (y) el.appendChild(gpEl('p', 'muted', `Yesterday you said ${AD_GUESS[y].toLowerCase()} for today. The weathervane will tell you after noon.`));
    const heard = AD_SAYINGS.filter(s => adGet('sy.' + s.id));
    el.appendChild(gpEl('h3', 'gd-h3', 'Weather sayings heard'));
    el.appendChild(gpEl('p', 'muted', heard.length ? `${heard.length} of ${AD_SAYINGS.length}. The vale’s folk say them when the sign is there to see.` : 'The vale’s folk have old sayings for the weather. They say them when the sign is there to see.'));
    for (const s of heard) el.appendChild(gpEl('p', 'ad-saying', `“${s.words}” ${s.note}`));
  });
}
gardenPlayAdd({ id: 'weather-vane', name: 'The weathervane', verb: 'Guess tomorrow', icon: 'compass', group: 'secret', blurb: 'Say what tomorrow’s weather will be. A right guess is worth a seed packet.',
  status: () => { try { const v = Number(adGet('vg.' + gtgDayNum(gtgToday()))) || 0; return v ? 'Tomorrow: ' + AD_GUESS[v].toLowerCase() : ''; } catch (e) { return ''; } },
  open: gardenNightVaneOpen,
  bubble: (d, items) => { if (gardenHere().visit) return; const m = gardenHere(); for (const v of (m.season === 'winter' ? [1, 2, 3] : [1, 2])) items.push({ ic: v === 1 ? 'sun' : v === 2 ? 'umbrella' : 'snowflake', label: AD_GUESS[v] + ' tomorrow', run: () => { gardenBubbleClose(); adGuess(v); } }); } });
/* ---------- the loop ---------- */
wdMod({
  id: 'ad-rain', pref: 'night', visit: true,
  begin() { _adr.ids = new Set(); _adr.hold = 0; },
  tick(m) {
    if (!adOn()) { if (_adr.ids.size) { for (const id of _adr.ids) { adSprite(id, null); _ad.picks.delete(id); wdGlowOff('ad-' + id); } _adr.ids = new Set(); } return; }
    const N = adNow(m), want = new Set();
    _adrWetTrack(m);
    {
      const shrooms = m.season !== 'winter' && !(m.rain && m.rain.snow) && adRainedLast(m, N);
      if (shrooms && N.hour >= 5 && N.hour < 13) for (const c of _adrClusters(m, N)) {
        want.add(c.id);
        const done = adGet('mu.' + c.nn + '.' + c.tk), svg = _adrClusterSvg(c);
        if (done) adSprite(c.id, { x: c.x, y: c.y, svg, hit: 0, update: adCacheStatic });
        else adPick(c.id, { x: c.x, y: c.y, svg, words: c.kind.sort === 'leave' ? 'Look at the mushrooms' : 'Pick the mushrooms', hitUp: 4, run: () => _adrTake(c, gardenHere()) });
      }
      const R = shrooms && N.tod !== 'night' ? _adrRingSpot(m, N) : null;
      if (R && adInView(R.x, R.y, 3)) _adrRingTick(m, N, R, want);
      _adrSigns(m, N); _adrSignDraw(m, N, want); _adrSay(m, N);
      _adrVaneMarks(m, N, want);
    }
    _adrRainbowTrigger(m); _adrBowTick(m, want); _adrVaneCheck(m, N);
    for (const id of _adr.ids) if (!want.has(id)) { adSprite(id, null); _ad.picks.delete(id); wdGlowOff('ad-' + id); }
    _adr.ids = want;
  },
  end() { for (const id of _adr.ids) { adSprite(id, null); _ad.picks.delete(id); wdGlowOff('ad-' + id); } _adr.ids = new Set(); _adr.bow = null; },
});
