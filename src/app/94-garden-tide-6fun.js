/* ============================================================
   THE SHORE'S GAMES, the kit (FUN-ROADMAP phase 2, "The tide comes in": the small delights). Shared by the sandcastles
   (94-garden-tide-7castle.js), the crab races (-7crabs.js), the bottles that wash up (-9bottle.js), lost and found (-a-lost.js),
   the skimming league (-b-skim.js), pebble pits (-c-pits.js) and the weekly spotter card (-d-spot.js).

   Everything here is a function declaration (hoisted), so the modules can call it whatever order they load in; nothing runs at load.
     gardenShoreVisit()            a friend's garden you are visiting (their snapshot), or null in your own
     gardenShoreFriends()          [{id, name, ti, f}] your friends' strands as this page holds them (each `ti` cleaned), cached a few seconds
     gardenShoreGive(key, gift, say)  a reward once per ledger key: {c coins, x xp, i items}; a line or a toast when it lands
     gardenShoreEmit(what, o)      tells the rest of the garden (the spotter card listens): _gdEmit('shore', {what, ...})
     gardenShoreFx(A, ev)          the shore games' live steps (94-garden-tide-8live.js sends what GT_FX does not know here)
     gardenShoreFolkTalk(row, F, S)  what a villager adds to their talk (something lost, a game of pebble pits): asked by 94-garden-wonder-1folk.js
     gardenShoreBake(scene, key, box, draw, K)  a small picture painted once with the vale's own brush (lit from the upper left, no outlines)
     gardenShoreFloat(x, y, text)  a word that floats up over a place in the world ("Go on!")
     gardenShoreLive()             'host' | 'guest' | '' (a live session in this garden, and which side of it you are)
   Days and weeks are numbers from 2026 (gtgDayNum), so a friend's screen counts the same.
   ============================================================ */
const _gsfk = { friends: null, friendsAt: 0, folk: [], fx: {} };
function gardenShoreVisit() { try { const m = gardenHere(); return m && m.visit ? m.visit.snap || {} : null; } catch (e) { return null; } }
function gardenShoreLive() {
  try {
    if (typeof _gll === 'undefined') return '';
    if (_gll.role === 'host' && typeof _glh !== 'undefined' && _glh.on && typeof _glhAnyone === 'function' && _glhAnyone()) return 'host';
    if (_gll.role === 'visit' && typeof _glvLive === 'function' && _glvLive()) return 'guest';
  } catch (e) { /* alone */ }
  return '';
}
/** A day as a number (days since 2026), the same on every screen (the bottle post's own count). */
function gardenShoreDay(iso) { return typeof gtgDayNum === 'function' ? gtgDayNum(iso) : Math.max(0, Math.round((Date.parse((iso || _gdToday()) + 'T12:00:00Z') - Date.parse('2026-01-01T12:00:00Z')) / 86400000)); }   // clock-ok: day maths
/** The week (Monday to Sunday) as a number: weeks since Monday 5 January 2026. */
function gardenShoreWeek(iso) { return Math.max(0, Math.floor((gardenShoreDay(iso) - 4) / 7)); }
/** The month as a number: months since January 2026. */
function gardenShoreMonth(iso) { const d = String(iso || _gdToday()); return Math.max(0, (Number(d.slice(0, 4)) - 2026) * 12 + Number(d.slice(5, 7)) - 1); }
/** Your friends' strands: [{id, name, ti, f}] (ti cleaned as the rest of the snapshot is; {} when they have none yet). */
function gardenShoreFriends() {
  const now = performance.now(); if (_gsfk.friends && now - _gsfk.friendsAt < 4000) return _gsfk.friends;
  const out = [];
  try {
    const d = typeof gardenSocialView === 'function' ? gardenSocialView() : null;
    if (d && d.gardens && typeof _gscFriendList === 'function') for (const f of _gscFriendList()) { const g = d.gardens[f.id]; if (!g) continue; out.push({ id: f.id, name: typeof _gscFirst === 'function' ? _gscFirst(f.id) : 'A friend', ti: (typeof gardenTideSnapClean === 'function' && gardenTideSnapClean(g.snap && g.snap.ti)) || {}, f }); }
  } catch (e) { /* none yet */ }
  _gsfk.friends = out; _gsfk.friendsAt = now; return out;
}
/** A reward once per key (a ledger key, so two devices of yours give it once): gift {c, x, i}. Returns true when it was given now. */
function gardenShoreGive(key, gift, say, o) {
  const g = _gdG(); if (!key || g.led[key]) return false;
  const e = { d: _gdToday(), k: 'tf', n: 1 }; if (gift && gift.c) e.c = gift.c; if (gift && gift.x) e.x = gift.x; if (gift && gift.i && Object.keys(gift.i).length) e.i = Object.assign({}, gift.i);
  g.led[key] = e; _gdSave();
  if (say) setTimeout(() => { try { gardenToast(say, { icon: (o && o.icon) || 'gift', timeout: (o && o.ms) || 5500 }); } catch (err) { /* fine */ } }, (o && o.after) || 0);
  return true;
}
/** A few words about what a gift was: "12 coins and a bronze rosette". */
function gardenShoreGiftWords(gift) {
  const out = []; if (!gift) return '';
  if (gift.c) out.push(gift.c + ' coins');
  for (const [k, n] of Object.entries(gift.i || {})) { const name = typeof gardenCraftItemName === 'function' ? gardenCraftItemName(k) : k; out.push((n > 1 ? n + ' ' : /^[aeiou]/i.test(name) ? 'an ' : 'a ') + String(name).replace(/^(A|An|The) /, '').toLowerCase()); }
  return out.length > 1 ? out.slice(0, -1).join(', ') + ' and ' + out[out.length - 1] : out[0] || '';
}
function gardenShoreEmit(what, o) { try { _gdEmit('shore', Object.assign({ what }, o || {})); } catch (e) { /* only news */ } }
/** The shore games' live steps: each module puts its handler here at its first use (gardenShoreFxOn), and 94-garden-tide-8live.js sends them on. */
function gardenShoreFxOn(step, fn) { _gsfk.fx[step] = fn; }
function gardenShoreFx(A, ev) { const f = _gsfk.fx[String(ev && ev.e || '')]; if (f) { try { f(A, ev); } catch (e) { console.error('[garden shore]', e); } } }
/** What the villagers add to their talk: each module registers fn(row, F, S) -> {lines, actions} | null (gardenShoreFolkOn). */
function gardenShoreFolkOn(fn) { if (!_gsfk.folk.includes(fn)) _gsfk.folk.push(fn); }
function gardenShoreFolkTalk(row, F, S) {
  const out = { lines: [], actions: [] };
  for (const fn of _gsfk.folk) { try { const r = fn(row, F, S); if (r) { if (r.lines) out.lines.push(...r.lines); if (r.actions) out.actions.push(...r.actions); } } catch (e) { console.error('[garden shore]', e); } }
  return out.lines.length || out.actions.length ? out : null;
}
/** A small picture painted once with the vale's own brush into a texture (key), at K pixels per world px. box [x0, y0, x1, y1] world px
 *  round the foot. addImage, no read-back (rule 16). Returns true when the texture is there. */
function gardenShoreBake(scene, key, box, draw, K) {
  if (!scene || !scene.textures) return false;
  if (scene.textures.exists(key)) return true;
  const kit = window.GardenPaintTerrainKit; if (!kit) return false;
  K = K || 2.5;
  const [x0, y0, x1, y1] = box, w = Math.ceil((x1 - x0) * K), h = Math.ceil((y1 - y0) * K); if (w < 2 || h < 2 || w > 2048 || h > 2048) return false;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'); cx.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
  try { draw(kit.brush(cx), cx); } catch (e) { console.error('[garden shore] paint', e); return false; }
  scene.textures.addImage(key, c);
  return true;
}
/** An image of a baked picture at world (x, y) px, its foot there (box as baked), in a container. */
function gardenShoreImage(scene, parent, key, box, x, y, K) {
  const [x0, y0, x1, y1] = box, im = scene.add.image(x, y, key).setOrigin(-x0 / (x1 - x0), -y0 / (y1 - y0)).setScale(1 / (K || 2.5));
  if (parent) parent.add(im);
  return im;
}
/** A word that floats up and fades over a place in the world (cells). */
function gardenShoreFloat(x, y, text, o) {
  const box = typeof _gw !== 'undefined' && _gw.box; if (!box || typeof _ghProject !== 'function') return;
  const s = _ghProject(x, y); if (!s) return;
  const el = document.createElement('div'); el.className = 'gt-float'; el.textContent = text; el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;z-index:6;font:700 13px/1.2 system-ui,sans-serif;color:${(o && o.color) || '#fffdf4'};text-shadow:0 1px 2px rgba(40,30,20,.7),0 0 6px rgba(40,30,20,.35);white-space:nowrap;transform:translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%)`;
  box.appendChild(el);
  const motion = typeof gardenMotionOn !== 'function' || gardenMotionOn();
  if (motion && el.animate) el.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0', offset: .2 }, { opacity: 1, translate: '0 -10px', offset: .7 }, { opacity: 0, translate: '0 -18px' }], { duration: (o && o.ms) || 1100, easing: 'ease-out', fill: 'forwards' });
  setTimeout(() => el.remove(), (o && o.ms) || 1100);
}
/** A plain line in the garden's message strip (shown, never only kept in Recent). */
function gardenShoreSay(text, icon, ms) { try { gardenMessage(text, { icon: icon || 'waves', ms: ms || 5000 }); } catch (e) { /* no strip */ } }
/** Somewhere you could kneel or stand at (cells), the nearest free point to p within r (or p itself). */
function gardenShoreFree(p, r) { try { if (typeof _gwFree === 'function' && _gwFree(p.x, p.y)) return p; const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(p.x, p.y, r || 1) : null; return f || p; } catch (e) { return p; } }
/** One of the vale's folk who is out and about near (x, y) (cells), within r: {id, name, x, y} or null. Only where the folk live their days. */
function gardenShoreFolkNear(x, y, r) {
  try {
    const list = typeof _vfr !== 'undefined' && _vfr.on ? _vfr.list || [] : typeof _vfg !== 'undefined' ? [..._vfg.V.values()] : [];
    let best = null, bd = r || 6;
    for (const V of list) { if (!V || V.inside || !V.S || !V.row) continue; const d = Math.hypot(V.x - x, (V.y - y) * 1.3); if (d < bd) { bd = d; best = { id: V.id, name: V.row.name, x: V.x, y: V.y }; } }
    return best;
  } catch (e) { return null; }
}
/** The villagers who play the shore's games with you (the ones who talk: their rows in WD_FOLK), by id. */
const GT_SHORE_FOLK = Object.freeze(['pip', 'quince', 'bramble', 'tam', 'thistle', 'wick']);
function gardenShoreFolkName(id) { try { const r = typeof VALE_FOLK_ROW !== 'undefined' ? VALE_FOLK_ROW.get(id) : null; return r ? r.name : id.charAt(0).toUpperCase() + id.slice(1); } catch (e) { return id; } }
