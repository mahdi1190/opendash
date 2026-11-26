/* ============================================================
   DEPTH: THE LID (26 Nov 2026, the depth lane). Whoever is beneath a raised thing has the thing's own picture drawn again over them,
   faded, so you see you are under it and are never lost from view; whoever stands on it is drawn on top.

   The lid is the thing's own picture, never a new drawing of it:
     'vale'  a footbridge: the vale painter's own drawing of it (94-garden-paint-vale-1places.js hands it over: GardenPaintVale.lids)
     'gate'  the hump bridge: the gate's own baked picture (94-garden-native-painted-props.js gardenDepthBridgeArt), its arch openings
             and the water below its face cut out, so a swimmer in an arch is seen whole in its shade, the stone round it over them
     'deck'  a pier: the world's own drawing of its deck (94-garden-native-world.js pierDecks), copied once
   Each is made the first time someone is beneath it, then kept (all of them together under GDL.budget bytes, the oldest let go).

   Over each figure beneath one: one small image of the lid, cropped to the figure (so nothing else on the deck is covered: a
   friend standing on it, a lantern, a boat beside it), just above the figure, faded in to GDL.alpha. Pooled; its texture, crop,
   depth and alpha are set only when they change. Nothing runs unless someone is in the water.
   ============================================================ */
const GDL = Object.freeze({ alpha: 0.56, fadeIn: 5, fadeOut: 4, budget: 4 * 1048576, box: Object.freeze([-27, -47, 27, -5]) });   // box: the figure, px round its feet
const _gdl = { tex: new Map(), bridge: new Map(), pool: [], covers: [], scene: null, stamp: 0, lastT: 0 };
function _gdlWorld() { try { return window.GardenNative && GardenNative.world ? GardenNative.world() : null; } catch (e) { return null; } }
function _gdlScene() { try { return window.GardenNative && GardenNative.scene ? GardenNative.scene() : null; } catch (e) { return null; } }
/** The hump bridge's own baked picture, handed over by its painter each time it draws the gate (H3). */
function gardenDepthBridgeArt(id, o) { if (id && o && o.key) _gdl.bridge.set(String(id), o); }
function _gdlBytes() { let n = 0; for (const L of _gdl.tex.values()) if (L && L.key) n += L.bytes || 0; return n; }
function _gdlEvict(keep) {
  while (_gdlBytes() > GDL.budget) {
    let old = null; for (const [id, L] of _gdl.tex) if (L && L.key && id !== keep && (!old || L.used < old[1].used)) old = [id, L];
    if (!old) return;
    const [id, L] = old; _gdl.tex.delete(id);
    for (const c of _gdl.pool) if (c.lid === L) { c.lid = null; if (c.im && c.im.active) c.im.setVisible(false); }
    try { const sc = _gdlScene(); if (sc && sc.textures.exists(L.key)) sc.textures.remove(L.key); if (L.rt && L.rt.active) L.rt.destroy(); } catch (e) { /* gone */ }
  }
}
/** The lid of a zone: made once, on first need. null while it cannot be made (its picture not drawn yet: tried again in a while). */
/** What a zone's lid is copied from now (the vale's drawing of it, the gate's baked picture, the world's deck node): when it changes (a
 *  gate opened, the season turned, the pier built longer) the lid is made again. */
function _gdlSource(z) {
  try {
    if (z.rule.lid === 'vale') { const V = window.GardenPaintVale; return V && V.lids ? V.lids.get(z.id) || null : null; }
    if (z.rule.lid === 'gate') { const o = _gdl.bridge.get(z.id); return o ? o.key : null; }
    if (z.rule.lid === 'deck') { const w = _gdlWorld(), decks = w && w.pierDecks ? w.pierDecks() : null; if (decks) for (const d of decks.values()) if (d.bounds && d.bounds.x <= z.rect[0] * GARDEN_WORLD.cellW + 4 && d.bounds.x + d.bounds.width >= z.rect[2] * GARDEN_WORLD.cellW - 4) return d.node; return null; }
  } catch (e) { /* none */ }
  return null;
}
function _gdlLid(z) {
  const have = _gdl.tex.get(z.id), now = performance.now(), sc = _gdlScene(); if (!sc || !sc.textures) return null;
  if (have && sc.textures.exists(have.key) && (now - (have.srcT || 0) < 1000 || ((have.srcT = now) && _gdlSource(z) === have.src))) { have.used = now; return have; }
  if (have) { _gdl.tex.delete(z.id); for (const c of _gdl.pool) if (c.lid === have) c.lid = null; try { if (sc.textures.exists(have.key)) sc.textures.remove(have.key); if (have.rt && have.rt.active) have.rt.destroy(); } catch (e) { /* gone */ } }   // (drawn afresh, or its picture changed: made again)
  const tried = _gdl.tex.get('try:' + z.id); if (tried && now - tried < 2500) return null; _gdl.tex.set('try:' + z.id, now);
  let L = null; const t0 = performance.now();
  try { L = z.rule.lid === 'vale' ? _gdlVale(sc, z) : z.rule.lid === 'gate' ? _gdlGate(sc, z) : z.rule.lid === 'deck' ? _gdlDeck(sc, z) : null; } catch (e) { console.error('[garden depth] lid', z.id, e); L = null; }
  if (!L) return null;
  _gdl.tex.delete('try:' + z.id); L.used = now; L.src = _gdlSource(z); L.srcT = now; L.ms = Math.round(performance.now() - t0); _gdl.tex.set(z.id, L); _gdlEvict(z.id);
  if (typeof gardenBakeSpent === 'function') gardenBakeSpent(performance.now() - t0);
  return L;
}
/** A footbridge: its painter's own drawing, without the soft shadow it lays on the water (that stays where it is, under you). */
function _gdlVale(sc, z) {
  const V = window.GardenPaintVale, rec = V && V.lids && V.lids.get(z.id), kit = window.GardenPaintTerrainKit; if (!rec || !kit) return null;
  const [x0, y0, x1, y1] = rec.box, K = 1.5, w = Math.ceil((x1 - x0) * K), h = Math.ceil((y1 - y0) * K); if (w < 2 || h < 2 || w > 2048 || h > 2048) return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'); cx.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
  rec.draw(kit.brush(cx));
  const key = 'gdl|vale|' + z.id + '|' + Math.round(x0) + ',' + Math.round(y0) + '|' + (_gdl.stamp++); sc.textures.addImage(key, c);
  return { key, x0, y0, K, w, h, bytes: w * h * 4 };
}
/** The hump bridge: a copy of the gate's baked base with its arch openings, and the water below its face, cut out. */
function _gdlGate(sc, z) {
  const o = _gdl.bridge.get(z.id); if (!o || !sc.textures.exists(o.key)) return null;
  const src = sc.textures.get(o.key).getSourceImage(), K = o.K || 2, [bx0, by0] = o.box; if (!src || !src.width) return null;
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const cx = c.getContext('2d');
  cx.drawImage(src, 0, 0);
  cx.globalCompositeOperation = 'destination-out'; cx.setTransform(K, 0, 0, K, -bx0 * K, -by0 * K);
  const cut = pts => { if (!pts || pts.length < 3) return; cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i][0], pts[i][1]); cx.closePath(); cx.fill(); };
  const art = o.openings || null;
  if (art) { cx.fillStyle = '#000'; for (const a of art.arches || []) cut(a); if (art.below) cut(art.below); }
  cx.globalCompositeOperation = 'source-over'; cx.setTransform(1, 0, 0, 1, 0, 0);
  const key = 'gdl|gate|' + z.id + '|' + o.key + '|' + (_gdl.stamp++); sc.textures.addImage(key, c);
  return { key, x0: o.x + bx0, y0: o.y + by0, K, w: c.width, h: c.height, bytes: c.width * c.height * 4 };
}
/** A pier: the world's own drawing of its deck, copied once into a texture of its own. */
function _gdlDeck(sc, z) {
  const w = _gdlWorld(), decks = w && w.pierDecks ? w.pierDecks() : null; if (!decks || !decks.size) return null;
  const W = GARDEN_WORLD, r = z.rect; let rec = null;
  for (const d of decks.values()) { const b = d.bounds; if (b && b.x <= r[0] * W.cellW + 4 && b.x + b.width >= r[2] * W.cellW - 4 && b.y <= W.sky + r[1] * W.cellH + 12 && b.y + b.height >= W.sky + r[3] * W.cellH - 12) { rec = d; break; } }
  if (!rec || !rec.node || !rec.node.target) return null;
  const b = rec.bounds, K = 1.5, tw = Math.ceil(b.width * K), th = Math.ceil(b.height * K); if (tw > 2048 || th > 2048) return null;
  const inner = rec.node._inner || rec.node.target, sx = inner.scaleX, sy = inner.scaleY;
  const rt = sc.add.renderTexture(0, 0, tw, th).setVisible(false);
  try { inner.setScale(K); rt.clear().draw(inner, -b.x * K, -b.y * K); if (rt.render) rt.render(); } finally { inner.setScale(sx, sy); }
  const key = 'gdl|deck|' + z.id + '|' + (_gdl.stamp++); rt.saveTexture(key);
  return { key, x0: b.x, y0: b.y, K, w: tw, h: th, bytes: tw * th * 4, rt };
}
/** One pooled crop image, for one figure (who: 'me' or a friend's number). */
function _gdlCrop(who) {
  for (const c of _gdl.pool) if (c.who === who) return c;
  for (const c of _gdl.pool) if (c.who == null) { c.who = who; return c; }
  const c = { who, im: null, lid: null, a: 0, cut: '', depth: NaN, zone: null, t: 0, box: [0, 0, 0, 0], on: false };
  _gdl.pool.push(c); return c;
}
/** Lay the lid of zone z over a figure with its feet at (px, py) world px, drawn at depth d. dt: seconds since its last frame. */
function _gdlOver(c, z, px, py, d, dt) {
  const sc = _gdlScene(), w = _gdlWorld(), host = w && w.objectsNode ? (w.objectsNode._inner || w.objectsNode.target) : null;
  if (!sc || !host) return;
  const L = z ? _gdlLid(z) : null;
  c.t = performance.now();
  if (L && (!c.im || !c.im.active || c.im.scene !== sc)) { try { c.im = sc.add.image(0, 0, L.key).setOrigin(0, 0).setVisible(false).setAlpha(0); host.add(c.im); c.lid = null; c.cut = ''; c.a = 0; c.depth = NaN; } catch (e) { c.im = null; return; } }
  if (!c.im || !c.im.active) { c.im = null; c.on = false; c.lid = null; return; }
  if (c.lid && !sc.textures.exists(c.lid.key)) { c.lid = null; c.cut = ''; }
  const want = L ? GDL.alpha : 0, a = c.a + Math.max(-GDL.fadeOut * dt, Math.min(GDL.fadeIn * dt, want - c.a));
  c.a = Math.abs(want - a) < .01 ? want : a;
  if (L && c.lid !== L) { c.lid = L; c.im.setTexture(L.key).setOrigin(0, 0).setScale(1 / L.K).setPosition(L.x0, L.y0); c.cut = ''; }
  const lid = c.lid; if (!lid) { if (c.im.visible) c.im.setVisible(false); c.on = false; return; }
  if (c.a <= 0) { if (c.im.visible) c.im.setVisible(false); c.on = false; if (!L) c.lid = null; return; }
  // the crop: the figure's own box, in the lid's texture pixels
  const B = GDL.box, K = lid.K, u0 = Math.max(0, Math.floor((px + B[0] - lid.x0) * K)), v0 = Math.max(0, Math.floor((py + B[1] - lid.y0) * K)), u1 = Math.min(lid.w, Math.ceil((px + B[2] - lid.x0) * K)), v1 = Math.min(lid.h, Math.ceil((py + B[3] - lid.y0) * K));
  if (u1 <= u0 || v1 <= v0) { if (c.im.visible) c.im.setVisible(false); c.on = false; return; }
  if (c.cut !== 'set' || c.u0 !== u0 || c.v0 !== v0 || c.u1 !== u1 || c.v1 !== v1) { c.cut = 'set'; c.u0 = u0; c.v0 = v0; c.u1 = u1; c.v1 = v1; c.im.setCrop(u0, v0, u1 - u0, v1 - v0); }
  if (c.depth !== d) { c.depth = d; c.im.setDepth(d); if (w.depthChanged) w.depthChanged(); }
  if (Math.abs(c.im.alpha - c.a) > .005) c.im.setAlpha(c.a);
  if (!c.im.visible) c.im.setVisible(true);
  c.on = true; c.box[0] = px + B[0]; c.box[1] = py + B[1]; c.box[2] = px + B[2]; c.box[3] = py + B[3]; c.zone = z;
}
/** Each frame: your own lid (you, swimming beneath something), and the end of any friend's that was not laid this frame. */
function _gdlFrame() {
  const now = performance.now(), dt = Math.min(.1, Math.max(0, (now - (_gdl.lastT || now)) / 1000)); _gdl.lastT = now;
  const swimming = typeof _ght !== 'undefined' && _ght.swim && _ght.swim.on && !_ght.swim.out;
  let mine = null; for (const c of _gdl.pool) if (c.who === 'me') { mine = c; break; }
  if (swimming || (mine && mine.on)) {
    const W = GARDEN_WORLD, z = swimming ? gardenUnderFigureAt(_gw.px, _gw.py) : null, px = _gw.px * W.cellW, py = W.sky + _gw.py * W.cellH;
    const node = _gw.node && _gw.node.target, d = Math.max(node && Number.isFinite(node.depth) ? node.depth : py, py + .001) + .5;
    _gdlOver(mine || _gdlCrop('me'), z, px, py, d, dt);
  }
  for (const c of _gdl.pool) if (c.who != null && c.who !== 'me' && c.on && now - c.t > 250) _gdlOver(c, null, (c.box[0] + c.box[2]) / 2, c.box[3] - GDL.box[3], c.depth, dt);
  for (const c of _gdl.pool) if (c.who != null && !c.on && c.a <= 0 && c.who !== 'me' && now - c.t > 2000) c.who = null;   // (a friend gone: the image waits for the next one)
}
/** Is someone standing on a passable deck at (x, y) (cells) covered by a lid laid over somebody beneath it? The depth to draw them at, so
 *  they stay on top of it (and of the swimmer under them), or null. */
function _gdlOverDepth(x, y, self) {
  const W = GARDEN_WORLD, px = x * W.cellW, py = W.sky + y * W.cellH; let top = null;
  for (const c of _gdl.pool) {
    if (!c.on || c.who === self || !c.zone) continue;
    if (px + 14 < c.box[0] || px - 14 > c.box[2] || py < c.box[1] || py - 44 > c.box[3] || !(c.depth >= py)) continue;
    const z = c.zone, on = z.rect ? x >= z.rect[0] && x <= z.rect[2] && y >= z.rect[1] - .1 && y <= z.rect[3] + .1 : gardenUnderInPoly(x, y, z.support);
    if (on) top = Math.max(top == null ? -Infinity : top, c.depth + .2);
  }
  return top;
}
if (typeof gartActFrame === 'function') {
  const _gdlFrame0 = gartActFrame;
  gartActFrame = function () {   // eslint-disable-line no-func-assign
    try { _gdlFrame(); } catch (e) { if (!_gdl.failT || performance.now() - _gdl.failT > 10000) { _gdl.failT = performance.now(); console.error('[garden depth] lid', e); } for (const c of _gdl.pool) { try { if (c.im && c.im.active) c.im.destroy(); } catch (e2) { /* gone */ } c.im = null; c.lid = null; c.on = false; c.a = 0; } }   // (a lid that went wrong is dropped, never left over you)
    return _gdlFrame0();
  };
}
/* You, standing on a deck while someone swims beneath you: on top of their lid. */
if (typeof gardenHeightDepth === 'function') {
  const _gdlDepth0 = gardenHeightDepth;
  gardenHeightDepth = function () {   // eslint-disable-line no-func-assign
    const d = _gdlDepth0(); if (d != null) return d;
    if (!_gdl.pool.length || typeof _ght === 'undefined' || _ght.lv || _ght.climb) return null;
    // beneath a lid: drawn at your own depth, under it (a crown in front, faded, never lifts you over the deck you are under)
    if (_ght.swim) { for (const c of _gdl.pool) if (c.who === 'me' && c.on) return GARDEN_WORLD.sky + _gw.py * GARDEN_WORLD.cellH + .001; return null; }
    return _gdlOverDepth(_gw.px, _gw.py, 'me');
  };
}
/* A friend's copy: their lid while they swim beneath something; on top of yours while they stand on its deck. */
if (typeof _gllStep === 'function') {
  const _gdlStep0 = _gllStep;
  _gllStep = function (A, dt, quiet) {   // eslint-disable-line no-func-assign
    const r = _gdlStep0(A, dt, quiet);
    try {
      if (A && !A.me && Number.isFinite(A.x) && Number.isFinite(A.y)) {
        const W = GARDEN_WORLD, wet = A.swimming || (A.ghtSwim && A.ghtSwim.on), z = wet ? gardenUnderFigureAt(A.x, A.y) : null;
        let had = false; if (!z) for (const q of _gdl.pool) if (q.who === A.w && q.on) { had = true; break; }
        const c = z || had ? _gdlCrop(A.w) : null;
        if (c) { const px = A.x * W.cellW, py = W.sky + A.y * W.cellH, rd = A.root && A.root.target && Number.isFinite(A.root.target.depth) ? A.root.target.depth : py; _gdlOver(c, z, px, py, Math.max(rd, py + .001) + .5, Math.min(.1, Math.max(.001, dt || .016))); }
        if (A._gdlZ != null && A.hZ === A._gdlZ) A.hZ = null; A._gdlZ = null;
        if (!wet && !A.hLv && !A.ghtClimb && A.hZ == null && _gdl.pool.length) { const top = _gdlOverDepth(A.x, A.y, A.w); if (top != null) { A.hZ = A._gdlZ = (top - W.sky) / W.cellH; } }
      }
    } catch (e) { /* drawn as before */ }
    return r;
  };
}
