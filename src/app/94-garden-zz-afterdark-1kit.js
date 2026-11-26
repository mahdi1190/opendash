/* ============================================================
   AFTER DARK, the kit (FUN-ROADMAP Phase 8). Named moons, big skies, moths at the sheet, falling stars, mushrooms after rain, the
   rainbow's foot, weather sayings and glow trails all stand on this.

     adNow(m)              the night as the HOST has it, worked out once a minute: { day (their local ISO day), hour, night (the ISO day the
                           night began), nn (its day number), south, season, tod, dark, moon: { age, k (0 new .. 1 full), full, row (a named
                           moon of AD_MOONS on its full nights), mid (the middle night of that full moon) }, sky: { aurora, comet, shower } }.
                           On a visit it comes from the host's offset (snap.tz), their season and their sun, so host and guests agree with
                           nothing sent.
     adGet(k) / adSet(k, v)   saves in state.garden.wd under 'ad.' (synced entry by entry). Ids and day numbers only.
     adGive(key, gift, say)   a reward line for today (_grGive: XP and materials inside the day's limits)
     adGrant(key, items, say) once ever (gpGrant)           adKeep(id)   a keepsake found and held up (once ever, the life book pays)
     adSpots(kind, n, salt)   up to n places of a KIND near what you can see, the same on every screen: 'grass', 'tree', 'fruit', 'tall',
                           'bank', 'still', 'home', 'lived', 'edge'. Read from the layout's cells and the things found standing
                           (gardenAffordThings, the painters' trunks): never a named place or a fixed cell.
     adSprite(id, spec|null)  a thing in the world kept up to date      adPick(id, spec|null)   one you can click, or press E beside
     adWire(fn)            add to what the snapshot's `nt` says (gardenNightWire)
     adLive(e, o) / adHear(e, fn) / adJoin(fn)   the live family 'nt' (94-garden-live-0rules.js glNightFxOk)
     gardenNightDev(o)     DEVELOPER ONLY, from the console: force a sky for a sandbox ({ aurora, comet, moon, fall, wet, trail }). Never saved.
   window.GardenNightSky = { k, tint, aurora, comet, halo, blue }: numbers only, for the water painter's moon path (read in its own
   frame loop, nothing allocated). While After dark is off it says a full moon every night, as the water always drew it.
   ============================================================ */
const _ad = { N: null, key: '', lay: null, layD: null, trees: null, treeSig: '', tiles: new Map(), tileNight: '', picks: new Map(), sprites: new Map(), wire: [], hear: new Map(), joins: [], dev: {}, devV: 0, tidied: '', homes: null, homesKey: '' };
const AD_SKY_OFF = Object.freeze({ k: 1, tint: 0xd8e2f0, aurora: 0, comet: 0, halo: 0, blue: 0 });
window.GardenNightSky = Object.assign({}, AD_SKY_OFF);
for (const k of AD_KEEPS) if (!GL_KEEPSAKE.has(k.id)) GL_KEEPSAKE.set(k.id, k);   // the life book knows them: the Field Journal's shelf, the hold-up, a friend's copy

/* ---------- is it on ---------- */
function adOn() { return GARDEN_WORLD.v >= 3 && _wdOn('night') && gardenFun() !== 'off'; }

/* ---------- the host's clock and sky ---------- */
/** The host's local day and hour: yours at home, theirs on a visit (their offset from the snapshot). */
function adClock(m) {
  const s = m && m.visit && m.visit.snap;
  if (s && Number.isFinite(s.tz)) { const t = new Date(m.now + s.tz * 60000); return { iso: t.toISOString().slice(0, 10), h: t.getUTCHours() + t.getUTCMinutes() / 60 }; }   // clock-ok: their local hour, by their offset
  try { const p = Clock.parts(m.now); return { iso: p.iso, h: p.h + p.mi / 60 }; } catch (e) { return { iso: m.today, h: 12 }; }
}
/** South of the equator? At home your own clock says; on a visit, the host's season against their month says. */
function adSouth(m, iso) {
  if (!m.visit) return !!m.south;
  try { return gardenSeasonOf(iso, false) !== m.season; } catch (e) { return false; }
}
/** The moon on the night that began on this ISO day: the real one (wdMoon), named on its full nights. */
function adMoonOf(iso, south) {
  const P = wdMoon(iso), age = P.age, k = (1 - Math.cos(2 * Math.PI * age / _WD_SYN)) / 2, out = { age, k, full: P.full, toFull: P.toFull, name: P.name, row: null, mid: '' };
  if (!P.full) return out;
  const mid = _adMoonMid(iso); if (!mid) return out;
  const mo = Number(mid.slice(5, 7)), nm = south ? ((mo + 5) % 12) + 1 : mo, prev = _adMoonMid(_gdAddDays(mid, -29));
  out.mid = mid;
  out.row = prev && prev !== mid && prev.slice(0, 7) === mid.slice(0, 7) ? AD_MOON_BLUE : AD_MOONS.find(r => r.mo === nm) || null;   // (a second full moon in one calendar month is the Blue Moon)
  return out;
}
/** The middle night of the full moon round this day: the full night nearest the moon's own full age (null when none is near). */
function _adMoonMid(iso) {
  let best = 9, bi = '';
  for (let d = -3; d <= 3; d++) { const q = _gdAddDays(iso, d); if (!wdMoon(q).full) continue; const a = Math.abs(wdMoonAge(q) - _WD_SYN / 2); if (a < best) { best = a; bi = q; } }
  return bi;
}
/** The next named moon from this night on (today's counts): { iso (its middle night), row, days }. */
function adNextMoon(iso, south) {
  for (let d = 0; d < 34; d++) { const q = _gdAddDays(iso, d), M = adMoonOf(q, south); if (M.row && M.mid === q) return { iso: q, row: M.row, days: d }; }
  return null;
}
function adNow(m) {
  m = m || gardenHere();
  const C = adClock(m), min = Math.floor(m.now / 60000);
  let pk = ''; try { pk = gardenPlaceKey(); } catch (e) { pk = 'x'; }
  const key = pk + '|' + C.iso + '|' + min + '|' + m.tod + '|' + m.season + '|' + (m.visit ? 'v' : 'o') + '|' + _ad.devV;
  if (_ad.N && _ad.key === key) return _ad.N;
  const night = C.h < 12 ? _gdAddDays(C.iso, -1) : C.iso, south = adSouth(m, C.iso);
  const N = { day: C.iso, hour: C.h, night, nn: gtgDayNum(night), dn: gtgDayNum(C.iso), south, season: m.season, tod: m.tod, dark: m.tod === 'night' || m.tod === 'dusk', key: pk, visit: !!m.visit };
  N.moon = adMoonOf(night, south);
  if (_ad.dev.moon) { const row = _ad.dev.moon === 'blue' ? AD_MOON_BLUE : AD_MOONS.find(r => r.id === _ad.dev.moon); if (row) N.moon = Object.assign({}, N.moon, { full: true, k: 1, row, mid: night }); }
  N.sky = typeof adSkyOf === 'function' ? adSkyOf(N) : { aurora: 0, comet: 0, shower: null };
  _ad.N = N; _ad.key = key;
  return N;
}
/** What the water's moon path reads (numbers only). */
function adSkyPush(N, on) {
  const S = window.GardenNightSky;
  if (!on || !N) { Object.assign(S, AD_SKY_OFF); return; }
  const row = N.moon.full ? N.moon.row : null;
  S.k = Math.max(0, Math.min(1, N.moon.k));
  S.tint = row ? row.tint : AD_SKY_OFF.tint;
  S.aurora = N.sky.aurora && N.tod === 'night' ? 1 : 0;
  S.comet = N.tod === 'night' ? N.sky.comet || 0 : 0;
  S.blue = row && row.blue ? 1 : 0;
  S.halo = typeof adSayingSign === 'function' && adSayingSign('moon-ring') ? 1 : 0;
}

/* ---------- saves ---------- */
function adGet(k) { try { return _wdG()['ad.' + k]; } catch (e) { return undefined; } }
function adSet(k, v) { _wdSet('ad.' + k, v); }
/** Once a day: dated entries ('ad.<what>.<day number>...') older than 40 days go. Firsts and counts (no day in them) stay. */
function adTidy(dn) {
  if (_ad.tidied === String(dn)) return; _ad.tidied = String(dn);
  const W = _wdG(); let n = 0;
  for (const k of Object.keys(W)) { const x = /^ad\.[a-z]+\.(\d{1,5})(?:\.|$)/.exec(k); if (x && Number(x[1]) < dn - 40) { delete W[k]; n++; } }
  if (n) _wdSave();
}
/* ---------- rewards: real, small, inside the garden's own limits ---------- */
function adGive(key, gift, say) { let ok = false; try { ok = _grGive('ad.' + key, gift); } catch (e) { ok = false; } if (ok && say) gpNote(say); return ok; }
function adGrant(key, items, say) { let ok = false; try { ok = gpGrant('ad.' + key, items); } catch (e) { ok = false; } if (ok && say) gpNote(say); return ok; }
/** A keepsake found by your own hand: held up the first time (the life book pays once, ever). True when it was new. */
function adKeep(id) { try { return gardenLifeFound('k', id, { userAction: true }); } catch (e) { return false; } }
function adHas(id) { try { return gardenLifeHas('k', id); } catch (e) { return false; } }
/** A plain item's words and picture in the bag, the market and the crafting bench (94-garden-5extras.js, 94-garden-craft-0rules.js ask). */
const AD_ITEMS = Object.freeze({ 'star-stone': Object.freeze({ name: 'Star stone', keep: 'ad-star-stone' }) });
function gardenNightItemName(k) { const r = AD_ITEMS[k]; return r ? r.name : ''; }
function gardenNightItemIcon(k, px) { const r = AD_ITEMS[k], d = r && GL_KEEPSAKE.get(r.keep); return d ? `<svg viewBox="-10 -13 20 16" width="${px}" height="${px}" aria-hidden="true">${gardenKeepsakeSvg(d)}</svg>` : ''; }

/* ---------- where things are: read from the layout and what stands in it ---------- */
function adLay() {
  let D = null; try { D = gardenIslandData(); } catch (e) { return null; }
  if (!D) return null;
  if (_ad.lay && _ad.layD === D) return _ad.lay;
  const st = (D.anchors && D.anchors.start) || GARDEN_WORLD.start || { x: GARDEN_WORLD.cols / 2, y: GARDEN_WORLD.rows / 2 };
  _ad.layD = D; _ad.lay = { D, still: null, banks: null, arrival: { x: st.x, y: st.y } }; _ad.tiles.clear();
  return _ad.lay;
}
function _adInPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1] || 1e-9) + a[0]) c = !c; } return c; }
function _adArea(P) { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(s / 2); }
/** Still water: the layout's freshwater bodies of 6 cells or more that no river line runs through (two of its points inside: running
 *  water) and that are not the mill race. [{ id, poly, x, y (its middle), area, box }] */
function adStill() {
  const L = adLay(); if (!L) return [];
  if (L.still) return L.still;
  const D = L.D, P = D.presentation || {}, race = String(P.millRace || ''), lines = [];
  for (const r of Object.values(P.rivers || {})) if (r && Array.isArray(r.line)) lines.push(r.line);
  const out = [];
  for (const f of D.freshwater || []) {
    const B = f && f.boundary; if (!f || !f.id || f.id === race || !Array.isArray(B) || B.length < 3) continue;
    const area = _adArea(B); if (area < 6) continue;
    if (lines.some(line => line.filter(p => _adInPoly(p[0], p[1], B)).length >= 2)) continue;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, sx = 0, sy = 0; for (const p of B) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); sx += p[0]; sy += p[1]; }
    let cx = sx / B.length, cy = sy / B.length; if (!_adInPoly(cx, cy, B)) { const w = f.wet || f.area; if (w) { cx = w.x + w.w / 2; cy = w.y + w.h / 2; } }
    out.push({ id: f.id, poly: B, x: cx, y: cy, area, box: { x0, y0, x1, y1 } });
  }
  return L.still = out;
}
/** Is (x, y) on still water? */
function adStillAt(x, y) { for (const s of adStill()) if (x >= s.box.x0 && x <= s.box.x1 && y >= s.box.y0 && y <= s.box.y1 && _adInPoly(x, y, s.poly)) return s; return null; }
/** The dry ground right at the edge of still water, every cell or so round each body: [{ x, y, w (the body's id), nx, ny (towards the water) }].
 *  Land you can stand on (no water, rock, wall or building), worked out once a layout. */
function adBanks() {
  const L = adLay(); if (!L) return [];
  if (L.banks) return L.banks;
  const out = [];
  for (const s of adStill()) {
    const B = s.poly; let acc = 0;
    for (let i = 0; i < B.length; i++) {
      const a = B[i], b = B[(i + 1) % B.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.01) continue;
      for (let u = 1 - acc; u < len; u += 1.1) {
        const px = a[0] + (b[0] - a[0]) * u / len, py = a[1] + (b[1] - a[1]) * u / len; let nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
        if (_adInPoly(px + nx * 0.4, py + ny * 0.4, B)) { nx = -nx; ny = -ny; }   // (outward)
        const x = px + nx * 0.55, y = py + ny * 0.55, c = gardenIslandBaseCell(x, y);
        if (!c || !c.land || c.freshwater || c.ocean || c.solid || c.staticId) continue;
        out.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, w: s.id, nx: -nx, ny: -ny });
      }
      acc = (acc + len) % 1.1;
    }
  }
  return L.banks = out;
}
/** Every tree standing, from whichever painter drew it (the walker's trunk list): [{ x, y (the trunk's foot), w (its width), sp, kind
 *  ('tree' or 'fruit-tree'), tall }]. Kept until the trunks change. */
function adTrees() {
  if (_ad.trees && performance.now() - (_ad.treeAt || 0) < 5000) return _ad.trees;   // (the signature itself is a walk over every painter's list: looked at every few seconds)
  _ad.treeAt = performance.now();
  let sig = ''; try { sig = typeof _gwTrunkSig === 'function' ? _gwTrunkSig() : ''; } catch (e) { sig = ''; }
  if (_ad.trees && sig === _ad.treeSig) return _ad.trees;
  const out = []; let T = [];
  try { T = typeof _gwPaintedTrunks === 'function' ? _gwPaintedTrunks(gardenIslandData()) : []; } catch (e) { T = []; }
  for (const b of T) { if (b.sp === 'water') continue; const kind = gardenKindOf({ tree: b.sp || '' }); if (kind !== 'tree' && kind !== 'fruit-tree') continue; const w = b.x1 - b.x0; out.push({ x: (b.x0 + b.x1) / 2, y: b.y1, w, sp: b.sp || '', kind, tall: w >= 0.4 || /oak|beech|pine|ash|chestnut|lime|yew|willow/.test(String(b.sp)) }); }
  _ad.trees = out; _ad.treeSig = sig; _ad.tiles.clear();
  return out;
}
/** Is this ground open to the gardener here (bought and opened)? */
function adOpen(x, y, m) { try { return !gardenZoneLockOf(Math.floor(x), Math.floor(y), (m || gardenHere()).areas); } catch (e) { return true; } }
/** Would something small lying here be drawn over by what stands just south of it (a tree's crown, a building's roof)? Read from the
 *  trunks and the things found standing, any kind, any layout. */
function adHidden(x, y, near) {
  const R = near || 1.8, W = GARDEN_WORLD;
  for (const t of adTrees()) { const dy = t.y - y; if (dy > 0.1 && dy < 6 && Math.abs(t.x - x) < R) return true; }   // (a tree is 3.5 to 5 H: its crown reaches six cells up)
  // what a painter planted that stands up (the village's trees and shrubs), by its own drawn height (as 94-garden-zz-7act-1core.js gartActGroundClear reads it)
  try { const tall = window.GardenNativePainted && GardenNativePainted.tall ? GardenNativePainted.tall() : []; for (const t of tall) { const tx = t.x / W.cellW, ty = (t.y - W.sky) / W.cellH, hw = (t.w || 30) / 2 / W.cellW; if (Math.abs(tx - x) < hw + 0.4 && ty - y > 0.05 && ty - y < Math.max(0.6, (t.h || 0) / W.cellH)) return true; } } catch (e) { /* no planting list */ }
  try { for (const o of gardenAffordThings()) { if (o.src === 'decor') continue; const big = o.kind === 'building' || (o.h || 1) >= 1.5 || o.tall; if (!big) continue; const dy = o.y - y; if (dy > 0.05 && dy < 5.5 && Math.abs(o.x - x) < (o.w || 1) / 2 + 0.6) return true; } } catch (e) { /* nothing found yet */ }
  return false;
}
/** Can a small thing lie on the ground here: grass or snow (or a slope), open land, nothing standing on it, not hidden behind anything, and
 *  the walker can reach it. */
function adGround(x, y, m) {
  if (!adOpen(x, y, m)) return false;
  try { if (!gardenTerrainTakes('ad', x, y)) return false; } catch (e) { return false; }
  try { if (typeof _gwFree === 'function' && _gw.grid && !_gwFree(x, y)) return false; } catch (e) { /* no walker yet */ }
  return !adHidden(x, y);
}
/** Homes of the vale's folk standing here ({ x, y (the doorstep, in front of the foot), id, lived }). Lived: someone has moved in
 *  (gardenFolkSnap at home, the host's `fk` on a visit). */
function adHomes(m) {
  const things = gardenAffordThings(), fk = m.visit ? ((m.visit.snap && m.visit.snap.fk) || []) : (typeof gardenFolkSnap === 'function' ? gardenFolkSnap() || [] : []);
  const key = things.length + '|' + fk.length + '|' + (m.visit ? m.visit.fid : 'o');
  if (_ad.homes && _ad.homesKey === key) return _ad.homes;
  const lived = new Set(fk.map(r => String(r[1]).split(':')[0])), out = [];
  for (const t of things) { if (typeof valeFolkHomeOf !== 'function' || !valeFolkHomeOf(t) || t.kind === 'postbox') continue; out.push({ x: t.x, y: t.y + 0.42, id: t.id, lived: lived.has(t.id) || lived.has(String(t.id).replace(/^painted:/, '')) }); }
  _ad.homes = out; _ad.homesKey = key;
  return out;
}
/** Fences, walls and hedges found standing: by their kind and their own word, never their place. */
function _adEdges() { return gardenAffordThings().filter(t => t.kind === 'wall' || /fence|hedge|wall|hurdle|railing/.test(String(t.id) + ' ' + String(t.name || '') + ' ' + String(t.decor || ''))); }
/** The view in cells, a margin round it. */
function adView(pad) { const v = typeof _glCamView === 'function' ? _glCamView() : { x0: 0, y0: 0, x1: GARDEN_WORLD.cols, y1: GARDEN_WORLD.rows }, p = pad == null ? 2 : pad; return { x0: v.x0 - p, y0: v.y0 - p, x1: v.x1 + p, y1: v.y1 + p }; }
function adInView(x, y, pad) { const v = adView(pad); return x >= v.x0 && x <= v.x1 && y >= v.y0 && y <= v.y1; }
/* The vale is cut into tiles of AD_TILE cells; each tile holds at most one place of each kind for each thing that asks, chosen by the
   garden's own seed and the night, so the same place is chosen on every screen and stays put as you walk about. Worked out only for
   the tiles near the view, a few a second, and kept for the night. */
const AD_TILE = 11;
function _adTileSpot(kind, tx, ty, salt, nn, m) {
  const k = kind + '|' + salt + '|' + tx + ',' + ty;
  if (_ad.tiles.has(k)) return _ad.tiles.get(k);
  const r = gardenRand((_ad.N ? _ad.N.key : '') + '|' + nn + '|' + k), x0 = tx * AD_TILE, y0 = ty * AD_TILE, inTile = (p) => p.x >= x0 && p.x < x0 + AD_TILE && p.y >= y0 && p.y < y0 + AD_TILE;
  let spot = null;
  const pickOf = (list) => { const l = list.filter(inTile); for (let i = 0; i < 6 && l.length; i++) { const p = l.splice(Math.floor(r() * l.length), 1)[0]; if (adOpen(p.x, p.y, m)) return p; } return null; };
  if (kind === 'grass') { for (let i = 0; i < 14 && !spot; i++) { const x = x0 + 0.5 + r() * (AD_TILE - 1), y = y0 + 0.5 + r() * (AD_TILE - 1); if (adGround(x, y, m)) spot = { x, y }; } }
  else if (kind === 'tree' || kind === 'fruit' || kind === 'tall') {
    let pool = adTrees().filter(t => kind === 'fruit' ? t.kind === 'fruit-tree' : kind === 'tall' ? t.tall : true);
    if (kind === 'tall' && !pool.some(inTile)) { const own = adTrees().filter(inTile).sort((a, b) => b.w - a.w); pool = own.slice(0, 1); }   // (no tall tree here: the stoutest one)
    const T = pickOf(pool);
    if (T) { for (let i = 0; i < 8 && !spot; i++) { const a = r() * Math.PI * 2, d = 0.8 + r() * 0.9, x = T.x + Math.cos(a) * d, y = T.y + 0.25 + Math.abs(Math.sin(a)) * d * 0.6; if (adGround(x, y, m)) spot = { x, y, tree: T }; } }
  }
  else if (kind === 'bank') { const b = pickOf(adBanks()); if (b) spot = { x: b.x, y: b.y, nx: b.nx, ny: b.ny, w: b.w }; }
  else if (kind === 'still') { const S = adStill().filter(s => s.box.x1 >= x0 && s.box.x0 < x0 + AD_TILE && s.box.y1 >= y0 && s.box.y0 < y0 + AD_TILE); for (let i = 0; i < 16 && S.length && !spot; i++) { const s = S[Math.floor(r() * S.length)], x = Math.max(x0, s.box.x0) + r() * (Math.min(x0 + AD_TILE, s.box.x1) - Math.max(x0, s.box.x0)), y = Math.max(y0, s.box.y0) + r() * (Math.min(y0 + AD_TILE, s.box.y1) - Math.max(y0, s.box.y0)); if (_adInPoly(x, y, s.poly) && _adInPoly(x + 0.8, y, s.poly) && _adInPoly(x - 0.8, y, s.poly) && adOpen(x, y, m)) spot = { x, y, w: s.id }; } }
  else if (kind === 'home' || kind === 'lived') { const h = pickOf(adHomes(m).filter(q => (kind === 'home' || q.lived) && !adHidden(q.x, q.y, 1.2))); if (h) spot = { x: h.x, y: h.y, home: h.id }; }
  else if (kind === 'edge') { const e = pickOf(_adEdges().map(t => ({ x: t.x + (r() - 0.5) * Math.max(0, (t.w || 1) - 0.6), y: t.y + 0.32, id: t.id }))); if (e && adGround(e.x, e.y, m)) spot = e; }
  _ad.tiles.set(k, spot);
  return spot;
}
/** Up to n places of a kind in and round the view, the same on every screen (null spots skipped). Works out at most `budget` new tiles
 *  a call (the rest next second), so no tick runs long. Each: { x, y, id (stable: kind, salt and tile) ...extra }. */
function adSpots(kind, n, salt, m, budget) {
  const N = _ad.N; if (!N) return [];
  if (_ad.tileNight !== N.key + '|' + N.nn) { _ad.tileNight = N.key + '|' + N.nn; _ad.tiles.clear(); }
  const v = adView(2), out = []; let left = budget == null ? 3 : budget;
  const tx0 = Math.max(0, Math.floor(v.x0 / AD_TILE)), ty0 = Math.max(0, Math.floor(v.y0 / AD_TILE)), tx1 = Math.floor(Math.min(GARDEN_WORLD.cols - 1, v.x1) / AD_TILE), ty1 = Math.floor(Math.min(GARDEN_WORLD.rows - 1, v.y1) / AD_TILE);
  const order = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) order.push([tx, ty, gardenHash(salt + '|' + tx + ',' + ty) % 997]);
  order.sort((a, b) => a[2] - b[2]);
  for (const [tx, ty] of order) {
    if (out.length >= n) break;
    const k = kind + '|' + salt + '|' + tx + ',' + ty;
    if (!_ad.tiles.has(k)) { if (left <= 0) continue; left--; }
    const s = _adTileSpot(kind, tx, ty, salt, N.nn, m || gardenHere());
    if (s && s.x >= v.x0 && s.x <= v.x1 && s.y >= v.y0 && s.y <= v.y1) out.push(Object.assign({ id: kind + '-' + salt + '-' + tx + '-' + ty }, s));
  }
  return out;
}

/* ---------- things in the world ---------- */
/** Keep a thing in the world up to date (a repaint keeps it). spec null takes it away. */
function adSprite(id, spec) {
  let S = _ad.sprites.get(id);
  if (!spec) { if (S) { try { S.remove(); } catch (e) { /* gone */ } _ad.sprites.delete(id); } return null; }
  if (S && !_wd.sprites.has(S)) S = null;   // (the world's sprites went with the garden you left)
  if (!S) { S = wdSprite(Object.assign({ id: 'ad-' + id, still: true }, spec)); _ad.sprites.set(id, S); return S; }
  if (spec.svg != null) wdArt(S, spec.svg);
  S.x = spec.x; S.y = spec.y; if (spec.label != null) S.label = spec.label; if (spec.onClick) S.onClick = spec.onClick; if (spec.z != null) S.z = spec.z;
  return S;
}
/** Take away every thing whose id starts so (a part that has ended), but those in `keep`. */
function adSpritesOff(prefix, keep) { for (const id of [..._ad.sprites.keys()]) if (id.startsWith(prefix) && !(keep && keep.has(id))) { adSprite(id, null); _ad.picks.delete(id); wdGlowOff('ad-' + id); } }
/** Something you can pick up or use: a click walks you to it, and E beside it does it too.
 *  spec: { x, y, svg, words ('Pick up the star stone'), label, run(), hitUp, promptY } */
function adPick(id, spec) {
  if (!spec) { _ad.picks.delete(id); return adSprite(id, null); }
  const run = () => { try { spec.run(); } catch (e) { console.error('[after dark]', id, e); } };
  _ad.picks.set(id, { x: spec.x, y: spec.y, words: spec.words, run, promptY: spec.promptY, pri: spec.pri });
  return adSprite(id, { x: spec.x, y: spec.y, z: spec.z, svg: spec.svg, hit: spec.hit || 0.8, hitUp: spec.hitUp == null ? 8 : spec.hitUp, label: spec.label || spec.words, cursor: 'hand', onClick: run });
}
/** The E prompt's rows (94-garden-zz-7act-1core.js gartActNearby): each thing here you can pick up or use, within a step and a half. */
function gardenNightActRows(px, py) {
  if (!_ad.picks.size) return [];
  const out = [];
  for (const [id, p] of _ad.picks) {
    if (Math.hypot(p.x - px, (p.y - py) * 1.3) > 1.5) continue;
    out.push({ key: 'ad:' + id, src: 'ad:' + id, act: 'ad', words: p.words, x: p.x, y: p.y, promptY: p.promptY, pri: p.pri == null ? 0.3 : p.pri, run: () => { p.run(); return true; } });
  }
  return out;
}
/** A soft round glow over the night (wdGlow), coloured. */
const AD_GLOWS = Object.freeze({ warm: ['#ffc768', '#ffe2a0'], pink: ['#ffc8e0', '#fff0f6'], green: ['#c8ff8a', '#eaffc8'], blue: ['#8ab8ff', '#d8e8ff'], silver: ['#dfe8ff', '#ffffff'], gold: ['#ffd070', '#fff2c0'] });
function adGlowSvg(kind, r, up) { const c = AD_GLOWS[kind] || AD_GLOWS.warm, R = r || 18, y = -(up == null ? 8 : up); return `<circle class="ad-glow-b" cy="${y}" r="${R}" fill="${c[0]}" opacity="0.22"/><circle cy="${y}" r="${(R * 0.38).toFixed(1)}" fill="${c[1]}" opacity="0.5"/>`; }
/** A small glint that twinkles (CSS), for something to pick up. */
function adGlint(y, c) { return `<g transform="translate(0 ${y == null ? -14 : y})"><g class="ad-twinkle"><path d="M0 -5L1.2 -1.2L5 0L1.2 1.2L0 5L-1.2 1.2L-5 0L-1.2 -1.2z" fill="${c || '#fff4c8'}"/></g></g>`; }   // (the moving group is inside the placed one: a CSS transform replaces the element's own)

/* ---------- what friends see: the snapshot's `nt` ---------- */
function adWire(fn) { _ad.wire.push(fn); }
/** The same bounds as GARDEN_SCHEMA's `nt` (lib/friends/garden.mjs) and gardenSnapshotClean: one number out of them and a friend's server
 *  would refuse the whole garden. null when there is nothing to say. */
function gardenNightWire() {
  const o = {};
  for (const fn of _ad.wire) { try { fn(o); } catch (e) { console.error('[after dark] wire', e); } }
  const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi, out = {};
  if (int(o.w, 0, 99999)) out.w = o.w;
  if (Array.isArray(o.l)) { const l = o.l.filter(r => Array.isArray(r) && int(r[0], 0, 7) && int(r[1], 0, 3) && int(r[2], 0, 99999)).slice(0, 5).map(r => r.slice(0, 3)); if (l.length) out.l = l; }
  if (Array.isArray(o.s)) { const s = o.s.filter(r => Array.isArray(r) && typeof r[0] === 'string' && /^[a-z0-9-]{1,32}$/.test(r[0]) && int(r[1], 0, 15) && int(r[2], 0, 63) && int(r[3], 0, 63) && typeof r[4] === 'string' && /^[0-9a-z]{1,14}$/.test(r[4])).slice(0, 12).map(r => r.slice(0, 5)); if (s.length) out.s = s; }
  if (Array.isArray(o.g) && int(o.g[0], 0, 99999) && int(o.g[1], 0, 3)) out.g = [o.g[0], o.g[1]];
  return Object.keys(out).length ? out : null;
}
/** Their `nt` on a visit (gardenSnapshotClean has checked it). */
function adTheirs(m) { return (m && m.visit && m.visit.snap && m.visit.snap.nt) || {}; }

/* ---------- live: the family 'nt' (94-garden-live-0rules.js) ---------- */
function adLive(e, o) { try { if (typeof gardenLiveFx === 'function') gardenLiveFx('nt', e, o); } catch (err) { /* only a message */ } }
/** To one friend only (the host's answer to someone who has just come in). */
function adLiveTo(f, e, o) {
  try {
    if (typeof _gll === 'undefined' || _gll.role !== 'host' || typeof _glh === 'undefined' || !_glh.on) return;
    const body = Object.assign({ c: 'nt', e }, o || {}); for (const k of Object.keys(body)) if (body[k] == null) delete body[k];
    if (glFxOk(body)) return; _glhSend(f, 'fx', body);
  } catch (err) { /* only a message */ }
}
function adHear(e, fn) { _ad.hear.set(e, fn); }
function adJoin(fn) { _ad.joins.push(fn); }
function adRole() { try { return typeof _gll !== 'undefined' ? _gll.role : ''; } catch (e) { return ''; } }
function adHostLive() { try { return adRole() === 'host' && _glh.on && _glhAnyone(); } catch (e) { return false; } }
function gardenNightHeard(A, ev) { const fn = _ad.hear.get(String(ev && ev.e || '')); if (fn) { try { fn(A, ev); } catch (err) { console.error('[after dark] heard', err); } } }
function gardenNightJoin(f) { for (const fn of _ad.joins) { try { fn(f); } catch (err) { console.error('[after dark] join', err); } } }

/* ---------- for a developer's sandbox only ---------- */
/** gardenNightDev({ aurora: true, comet: 0.8, moon: 'owl', fall: true, wet: true, trail: true }) from the console: forces that sky until the
 *  page reloads (gardenNightDev() puts it back). Never saved, never sent. */
function gardenNightDev(o) { _ad.dev = Object.assign({}, o || {}); _ad.devV++; _ad.N = null; _ad.tiles.clear(); return Object.assign({}, _ad.dev); }

/* ---------- the night's clock in the world ---------- */
wdMod({
  id: 'ad-kit', pref: 'night', visit: true,
  begin(m) { _ad.N = null; if (adOn()) { const N = adNow(m); adSkyPush(N, true); } },
  tick(m) {
    if (!adOn()) { adSkyPush(null, false); return; }
    const N = adNow(m); adSkyPush(N, true);
    if (!m.visit) adTidy(N.dn);
  },
  end() { adSkyPush(null, false); for (const id of [..._ad.sprites.keys()]) adSprite(id, null); _ad.picks.clear(); _ad.tiles.clear(); },
});
