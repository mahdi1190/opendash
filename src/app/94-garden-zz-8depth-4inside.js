/* ============================================================
   DEPTH: THE INSIDE OF A TUNNEL (26 Nov 2026, the depth lane). What you see underground: the world above veiled, the tunnel's own floor,
   walls and dark drawn over it at its own place under the ground, lit by your light (a lantern if you have one, else a candle), by the old
   lamps hung in its chambers and by the daylight down an open stair. Drips fall from the roof; footsteps ring on the stone.

   THE STAGE (one per scene, made the first time anyone goes underground, kept hidden after): a scene-level container above everything the
   world draws (depth GDI.depth), holding, bottom to top:
     the veil        one 1x1 image tinted dark and stretched over the world: the world above fades out of sight
     the insides     each tunnel's picture (baked once, a canvas image) at its own place, and its standing pieces (a well head)
     the figures     your figure (moved here from the world's objects while you are inside) and friends' inside the same tunnel
     the dark        a render texture a quarter of the view's size: dark, with a soft hole cut out at each light (drawn again each frame
                     only while you are underground: one fill and a few erases, no allocation)
     the light       the warm glow of each light (added), the daylight down open stairs, the drips
   THE PICTURE of a tunnel is painted in slices (GDI.slice ms each, through gardenBakeRoom), nearest first, while you walk up to its mouth or
   during the walk in; a plain dark floor shows until it is done (rule 16). Kept while you are near; let go a minute after (GDI.keepMs), all
   of them together under GDI.budgetMB.
   Painted in the vale's house style (lit from the upper left, no outlines), as a cut-away: the back walls stand up in their faces of brick,
   rock or dressed stone, the near walls are cut at the floor (a pale section line), so the whole floor is seen. Sizes in H (GARDEN_H).
   ============================================================ */
const GDI = Object.freeze({ depth: 89900, K: 1.6, slice: 8, budgetMB: 7, keepMs: 60000, veil: 0.93, dark: 0.9, q: 4, darkCol: 0x06080b });
const _gdi = { st: null, bakes: new Map(), lightTex: '', glowTex: '', pxTex: '', last: 0, sortDue: false, drips: [], dripT: 0, ambT: 0 };
function _gdiScene() { try { return window.GardenNative && GardenNative.scene ? GardenNative.scene() : null; } catch (e) { return null; } }
function _gdiH() { return typeof GARDEN_H === 'number' ? GARDEN_H : 41.44; }
function _gdiRng(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function _gdiHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** Your own light: a lantern if you have one (the bug lantern, the old lantern from the ruins), else a candle. */
function gardenTunnelLight() {
  let lantern = false;
  try { lantern = (typeof gardenHas === 'function' && gardenHas('gear:bug-lantern') > 0) || (typeof gardenGateHas === 'function' && gardenGateHas('lantern')); } catch (e) { lantern = false; }
  return { lantern, r: lantern ? GARDEN_TUNNEL.light.lantern : GARDEN_TUNNEL.light.candle };
}
/* ---------- textures shared by every stage ---------- */
function _gdiTextures(sc) {
  const id = sc.sys && sc.sys.settings ? sc.sys.settings.key : 'garden';
  _gdi.pxTex = 'gdi-px|' + id; _gdi.lightTex = 'gdi-light|' + id; _gdi.glowTex = 'gdi-glow|' + id; _gdi.dropTex = 'gdi-drop|' + id;
  if (!sc.textures.exists(_gdi.pxTex)) { const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 4, 4); sc.textures.addImage(_gdi.pxTex, c); }
  if (!sc.textures.exists(_gdi.lightTex)) {   // the shape of a light's reach: whole in the middle, softly gone at its edge
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.38, 'rgba(255,255,255,.96)'); g.addColorStop(.62, 'rgba(255,255,255,.62)'); g.addColorStop(.82, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); sc.textures.addImage(_gdi.lightTex, c);
  }
  if (!sc.textures.exists(_gdi.glowTex)) {   // the colour a light casts (added): warm and strongest at the flame
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.12, 'rgba(255,255,255,.62)'); g.addColorStop(.4, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); sc.textures.addImage(_gdi.glowTex, c);
  }
  if (!sc.textures.exists(_gdi.dropTex)) { const c = document.createElement('canvas'); c.width = 4; c.height = 12; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 12); g.addColorStop(0, 'rgba(220,236,255,0)'); g.addColorStop(.6, 'rgba(220,236,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.beginPath(); x.ellipse(2, 8, 1.6, 4, 0, 0, Math.PI * 2); x.fill(); sc.textures.addImage(_gdi.dropTex, c); }
}
/* ---------- the stage ---------- */
function _gdiStage() {
  const sc = _gdiScene(); if (!sc || !sc.add) return null;
  let st = _gdi.st;
  if (st && (st.scene !== sc || !st.root || !st.root.active)) { _gdiDrop(st); st = _gdi.st = null; }
  if (st) return st;
  _gdiTextures(sc);
  const W = GARDEN_WORLD, root = sc.add.container(0, 0).setDepth(GDI.depth).setVisible(false).setName('gdi-stage');
  const veil = sc.add.image(-2000, -2000, _gdi.pxTex).setOrigin(0, 0).setTint(0x080a0d).setAlpha(0);
  veil.setDisplaySize(W.cols * W.cellW + 4000, W.sky + W.rows * W.cellH + 4000);
  const insides = sc.add.container(0, 0);
  const figs = GardenNativeArt.element(sc, 'g', { class: 'gdi-figs' });
  const dark = sc.add.renderTexture(0, 0, 64, 64).setOrigin(0, 0).setAlpha(0);
  const lightIm = sc.make.image({ x: 0, y: 0, key: _gdi.lightTex, add: false }).setOrigin(.5, .5);
  const glows = sc.add.container(0, 0), drips = sc.add.container(0, 0);
  root.add([veil, insides, figs.target, dark, glows, drips]);
  st = _gdi.st = { scene: sc, root, veil, insides, figs, dark, lightIm, glows, drips, glowPool: [], dripPool: [], T: null, rec: null, vw: 0, vh: 0, a: 0, adopted: new Set(), shown: false, placeholder: null };
  return st;
}
function _gdiDrop(st) {
  try { for (const n of st.adopted) { try { n._gdtIn = false; } catch (e) { /* gone */ } } st.adopted.clear(); } catch (e) { /* gone */ }
  try { st.root.destroy(true); } catch (e) { /* gone */ }
  for (const rec of _gdi.bakes.values()) rec.im = null;
}
/** Take a figure (a NativeNode: yours, or a friend's sprite) into the tunnel's drawing, over the veil. Idempotent. */
function gardenTunnelStageAdopt(node) {
  const st = _gdiStage(); if (!st || !node || !node.target) return false;
  if (node._gdtIn && node.parentNode === st.figs) return true;
  try { st.figs.appendChild(node); node._gdtIn = true; st.adopted.add(node); _gdi.sortDue = true; return true; } catch (e) { console.error('[garden depth] adopt', e); return false; }
}
/** Put a figure back among the things of the world above. me: it is yours (the world's own objects layer). */
function gardenTunnelStageRelease(node, me) {
  const st = _gdi.st; if (!node || !node._gdtIn) return;
  node._gdtIn = false; if (st) st.adopted.delete(node);
  try { const w = window.GardenNative && GardenNative.world(); const objs = w && w.objectsNode; if (objs && objs.target && objs.target.active) { objs.appendChild(node); if (w.depthChanged) w.depthChanged(); } else if (node.parentNode) node.parentNode.removeChild(node); } catch (e) { console.error('[garden depth] release', e); }
  void me;
}
function gardenTunnelStageSorted() { _gdi.sortDue = true; }
/** Going in: the stage for this tunnel, its picture begun (or ready). */
function gardenTunnelStageOpen(T) {
  const st = _gdiStage(); if (!st) return;
  st.T = T; st.rec = _gdiBake(T, st.scene); st.root.setVisible(true); st.shown = true;
  for (const r of _gdi.bakes.values()) { if (r.im) r.im.setVisible(r === st.rec); for (const p of r.pieces || []) p.setVisible(r === st.rec); for (const s of r.shut || []) s.im.setVisible(false); }
}
/** Out again: hidden (the pictures kept a while). force: at once. */
function gardenTunnelStageClose(force) {
  const st = _gdi.st; if (!st) return;
  for (const n of [...st.adopted]) gardenTunnelStageRelease(n, false);
  st.root.setVisible(false); st.shown = false; st.a = 0; st.veil.setAlpha(0); st.dark.setAlpha(0);
  for (const g of st.glowPool) g.setVisible(false);
  for (const d of st.dripPool) { d.im.setVisible(false); d.ring.setVisible(false); d.on = false; }
  if (st.rec) st.rec.left = performance.now();
  st.T = null; st.rec = null; void force;
}
/** Outside, walking up to a mouth: its picture painted ahead, in what time the frames leave (low priority). */
function gardenTunnelPrebake(T) {
  const sc = _gdiScene(); if (!sc || !_gdiStage()) return false;   // (the stage made, hidden: what is baked goes straight into it)
  const rec = _gdiBake(T, sc); if (!rec.done) _gdiBakeSome(rec, true);
  if (rec.done) _gdiForget();
  return rec.done;
}
/** Now and then outside: pictures not looked at for a minute are let go. */
function gardenTunnelForget() { if (_gdi.bakes.size) _gdiForget(); }
/** Pictures not looked at for a while are let go (a minute after you left), and the oldest while over budget. */
function _gdiForget() {
  const now = performance.now(); let bytes = 0;
  const st = _gdi.st, list = [..._gdi.bakes.values()].sort((a, b) => (b.used || 0) - (a.used || 0));
  for (const r of list) {
    const live = st && st.rec === r; if (!live && _gdt && _gdt.near && _gdt.near.key === r.T.key) { r.used = now; }
    bytes += r.bytes || 0;
    if (!live && r.used && now - r.used > GDI.keepMs || !live && bytes > GDI.budgetMB * 1048576) _gdiFree(r);
  }
}
function _gdiFree(r) {
  _gdi.bakes.delete(r.T.key);
  try { if (r.im) r.im.destroy(); for (const p of r.pieces || []) p.destroy(); for (const s of r.shut || []) s.im.destroy(); if (r.ph) r.ph.destroy(); } catch (e) { /* gone */ }
  try { const sc = _gdiScene(); if (sc && r.key && sc.textures.exists(r.key)) sc.textures.remove(r.key); for (const k of r.keys || []) if (sc && sc.textures.exists(k)) sc.textures.remove(k); } catch (e) { /* gone */ }
}
/* ---------- each frame while you are underground (or on the way) ---------- */
function gardenTunnelStageFrame(C, now) {
  const st = _gdi.st; if (!st || !st.shown || !C) return;
  const dt = Math.min(0.1, Math.max(0, (now - (_gdi.last || now)) / 1000)); _gdi.last = now;
  const rec = st.rec;
  if (rec && !rec.done) _gdiBakeSome(rec, false);
  if (rec) rec.used = now;
  // how far in: the veil comes over the world first, then the inside and its dark
  const k = C.phase === 'in' ? C.k : C.phase === 'out' ? 1 - C.k : 1;
  const veilA = GDI.veil * _gdtEase((k - 0.12) / 0.45), inA = _gdtEase((k - 0.3) / 0.4);
  if (Math.abs(st.veil.alpha - veilA) > .004) st.veil.setAlpha(veilA);
  if (rec && rec.im && Math.abs(rec.im.alpha - inA) > .004) { rec.im.setAlpha(inA); for (const p of rec.pieces) p.setAlpha(inA); }
  if (rec && rec.ph) rec.ph.setAlpha(inA * 0.95);
  if (rec) _gdiShut(rec, C.T, inA);
  _gdiDark(st, C, inA, now);
  _gdiDrips(st, C, inA, now, dt);
  if (rec && (rec.pieces.length || rec.shut.length)) {   // (your feet in front of or behind a standing piece: sorted again only when that changes)
    const y = GARDEN_WORLD.sky + _gw.py * GARDEN_WORLD.cellH; let band = 0;
    for (let i = 0; i < rec.pieces.length; i++) if (rec.pieces[i].depth < y) band++;
    for (let i = 0; i < rec.shut.length; i++) if (rec.shut[i].im.visible && rec.shut[i].im.depth < y) band += 100;
    if (band !== _gdi.band) { _gdi.band = band; _gdi.sortDue = true; }
  }
  if (_gdi.sortDue) { _gdi.sortDue = false; try { const L = st.figs._inner || st.figs.target; if (L.sort) L.sort('depth'); } catch (e) { /* as it is */ } }
}
/** The shut stairs (a rockfall, a locked gate) shown while their land is shut. */
function _gdiShut(rec, T, a) {
  if (!rec.shut || !rec.shut.length) return;
  const open = _gdtOpen(T);
  for (const s of rec.shut) { const on = !open[s.m] && a > 0.02; if (s.im.visible !== on) s.im.setVisible(on); if (on && Math.abs(s.im.alpha - a) > .01) s.im.setAlpha(a); }
}
/** The lights now: yours (at your hand), friends' with you, the old lamps in the chambers, daylight down open stairs. Reused list. */
const _gdiL = [];
function _gdiLights(C, now) {
  const W = GARDEN_WORLD, H = _gdiH(), T = C.T, out = _gdiL; let n = 0;
  const put = (x, y, r, col, a, day) => { let L = out[n]; if (!L) L = out[n] = { x: 0, y: 0, rx: 0, ry: 0, col: 0, a: 0, day: false }; L.x = x; L.y = y; L.rx = r * W.cellW; L.ry = r * W.cellH * 1.25; L.col = col; L.a = a; L.day = !!day; n++; };
  const t = now / 1000, flick = (s) => 1 + 0.03 * Math.sin(t * 8.7 + s) + 0.02 * Math.sin(t * 21.3 + s * 3) + 0.015 * Math.sin(t * 2.1 + s);
  const me = gardenTunnelLight();
  put(_gw.px * W.cellW + 6, W.sky + _gw.py * W.cellH - H * 0.55, me.r * flick(0), me.lantern ? 0xffb860 : 0xffc888, me.lantern ? 0.32 : 0.26);
  try { if (typeof _gll !== 'undefined' && _gll.actors) for (const A of _gll.actors.values()) { if (!A || A.me || A.dpT !== T.id || !Number.isFinite(A.x)) continue; put(A.x * W.cellW + 6, W.sky + A.y * W.cellH - H * 0.55, GARDEN_TUNNEL.light.lantern * flick(A.w * 1.7 + 1), 0xffb860, 0.3); if (n > 6) break; } } catch (e) { /* alone */ }
  for (const c of T.ells) { const R = GARDEN_CHAMBERS[c.what]; if (R && R.lamp) put(c.x + (c.lampDx || 0), c.y - c.ry - 26, GARDEN_TUNNEL.light.lamp * flick(c.i * 2.3 + 4), 0xffb050, 0.28); if (R && R.glow) put(c.x, c.y - c.ry * 0.4, 1.7 * (1 + 0.06 * Math.sin(t * 1.3 + c.i)), 0x8fd0ff, 0.2); }
  const open = _gdtOpen(T), dayK = _gdiDaylight();
  for (const m of T.mouths) if (open[m.i] && dayK > 0.05) put(m.pout.x * 0.7 + m.pin.x * 0.3, m.pout.y * 0.7 + m.pin.y * 0.3 - 6, 1.75 * (0.6 + 0.4 * dayK), dayK > 0.5 ? 0xfff6dc : 0xb8c8f0, 0.34 * dayK, true);
  out.n = n;
  return out;
}
/** How bright it is outside (1 day, about .25 at night: moonlight down a stair). */
function _gdiDaylight() {
  try { const lt = window.GardenNative && GardenNative.lighting && GardenNative.lighting(), d = lt && lt.environment ? lt.environment().daylight : 1; return Math.max(0.25, Math.min(1, d == null ? 1 : d)); } catch (e) { return 1; }
}
/** The dark: a quarter-size render texture over the view, dark everywhere but where a light reaches. */
function _gdiDark(st, C, a, now) {
  const sc = st.scene, cam = sc.cameras && sc.cameras.main; if (!cam) return;
  const v = cam.worldView, q = GDI.q, w = Math.ceil(v.width / q) + 4, h = Math.ceil(v.height / q) + 4;
  if (w > st.vw || h > st.vh || w < st.vw * 0.6) { const nw = Math.min(1024, w + 16), nh = Math.min(1024, h + 16); try { st.dark.resize(nw, nh); } catch (e) { /* as it was */ } st.vw = nw; st.vh = nh; }
  const ox = v.x - 2 * q, oy = v.y - 2 * q;
  st.dark.setPosition(ox, oy).setScale(q);
  const L = _gdiLights(C, now), im = st.lightIm;
  st.dark.clear(); st.dark.fill(GDI.darkCol, 1);
  for (let i = 0; i < L.n; i++) { const l = L[i]; im.setScale(l.rx * 2 / 128 / q, l.ry * 2 / 128 / q); st.dark.erase(im, (l.x - ox) / q, (l.y - oy) / q); }
  st.dark.render();
  const da = GDI.dark * a; if (Math.abs(st.dark.alpha - da) > .004) st.dark.setAlpha(da);
  // the colour each light casts, added over the dark
  let gi = 0;
  for (let i = 0; i < L.n; i++) {
    const l = L[i]; let g = st.glowPool[gi]; if (!g) { g = sc.add.image(0, 0, _gdi.glowTex).setBlendMode(Phaser.BlendModes.ADD); st.glows.add(g); st.glowPool[gi] = g; }
    gi++; g.setVisible(true).setPosition(l.x, l.y).setTint(l.col).setAlpha(l.a * a).setDisplaySize(l.rx * (l.day ? 1.6 : 1.25), l.ry * (l.day ? 1.6 : 1.25));
  }
  for (; gi < st.glowPool.length; gi++) if (st.glowPool[gi].visible) st.glowPool[gi].setVisible(false);
}
/** Drips from the roof near you: a bright drop falling, a ring on the floor, now and then a drip you hear. */
function _gdiDrips(st, C, a, now, dt) {
  const S = GARDEN_TUNNEL_STYLES[C.T.style] || GARDEN_TUNNEL_STYLES.drift, sc = st.scene, W = GARDEN_WORLD, motion = typeof gardenMotionOn !== 'function' || gardenMotionOn();
  if (C.phase === 'inside' && motion && now > _gdi.dripT) {
    _gdi.dripT = now + 600 + (1 - S.drip) * 2600 * Math.random() + 300 * Math.random();
    let d = st.dripPool.find(q => !q.on); if (!d && st.dripPool.length < 6) { d = { im: sc.add.image(0, 0, _gdi.dropTex).setVisible(false), ring: sc.add.image(0, 0, _gdi.glowTex).setVisible(false).setTint(0xcfe4ff).setBlendMode(Phaser.BlendModes.ADD), on: false }; st.drips.add([d.im, d.ring]); st.dripPool.push(d); }
    if (d) for (let tries = 0; tries < 6; tries++) {
      const x = _gw.px + (Math.random() - 0.5) * 4.2, y = _gw.py + (Math.random() - 0.5) * 2.6;
      if (!gardenTunnelFree(C.T, x * W.cellW, W.sky + y * W.cellH, 4, null)) continue;
      d.on = true; d.t0 = now; d.x = x * W.cellW; d.y = W.sky + y * W.cellH; d.top = d.y - _gdiH() * 1.5; d.ms = 520;
      if (Math.random() < 0.55) try { gardenSfx('drip'); } catch (e) { /* quiet */ }
      break;
    }
  }
  for (const d of st.dripPool) {
    if (!d.on) continue;
    const k = (now - d.t0) / d.ms;
    if (k < 1) { const y = d.top + (d.y - d.top) * k * k; d.im.setVisible(true).setPosition(d.x, y).setAlpha(0.8 * a); d.ring.setVisible(false); }
    else if (k < 2.2) { const r = (k - 1) / 1.2; d.im.setVisible(false); d.ring.setVisible(true).setPosition(d.x, d.y).setDisplaySize(6 + r * 26, 2 + r * 8).setAlpha((1 - r) * 0.35 * a); }
    else { d.on = false; d.im.setVisible(false); d.ring.setVisible(false); }
  }
}
/* ---------- a friend underground, seen from outside: a faint warm glow moving under the hill ---------- */
const _gdiFriendGlow = new Map();
function gardenTunnelGlow(A, on) {
  let g = _gdiFriendGlow.get(A.w);
  if (!on) { if (g && g.active && g.visible) g.setVisible(false); return; }
  const sc = _gdiScene(); if (!sc) return;
  if (!g || !g.active || g.scene !== sc) { _gdiTextures(sc); g = sc.add.image(0, 0, _gdi.glowTex).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc070).setDepth(80004); _gdiFriendGlow.set(A.w, g); }
  const W = GARDEN_WORLD, t = performance.now() / 1000;
  g.setVisible(true).setPosition(A.x * W.cellW, W.sky + A.y * W.cellH - 6).setDisplaySize(W.cellW * 2.2, W.cellH * 2.2).setAlpha(0.26 + 0.05 * Math.sin(t * 3.1 + A.w));
}
/** A friend gone from the garden, or back in the daylight: their glow goes too. */
function gardenTunnelGlowSweep() {
  for (const [w, g] of _gdiFriendGlow) { const A = typeof _gll !== 'undefined' && _gll.actors ? _gll.actors.get(w) : null; if (!A || !A.dpT) { if (g.active && g.visible) g.setVisible(false); if (!A) { try { g.destroy(); } catch (e) { /* gone */ } _gdiFriendGlow.delete(w); } } }
}
/* ---------- the picture of a tunnel, painted in slices ---------- */
/** The bake record of a tunnel's picture (made on first need). */
function _gdiBake(T, sc) {
  let rec = _gdi.bakes.get(T.key);
  if (rec && rec.scene !== sc) { _gdiFree(rec); rec = null; }
  if (rec) { rec.used = performance.now(); return rec; }
  const W = GARDEN_WORLD, H = _gdiH(), FACE = Math.round(GARDEN_TUNNEL.face * H), m = GARDEN_TUNNEL.margin;
  const x0 = Math.floor(T.box[0] - m * W.cellW), y0 = Math.floor(T.box[1] - FACE - m * W.cellH), x1 = Math.ceil(T.box[2] + m * W.cellW), y1 = Math.ceil(T.box[3] + m * W.cellH * 0.8);
  rec = { T, scene: sc, key: 'gdi|' + T.id + '|' + Math.round(T.box[0]) + ',' + Math.round(T.box[1]) + '|' + Date.now().toString(36), K: GDI.K, x0, y0, w: x1 - x0, h: y1 - y0, FACE, i: 0, done: false, im: null, pieces: [], shut: [], keys: [], used: performance.now(), seed: _gdiHash(T.id), ms: 0 };
  rec.steps = [_gdiStepMask, _gdiStepSweep, _gdiStepRock, _gdiStepFace, _gdiStepFloor, _gdiStepEdges, _gdiStepStairs, _gdiStepPieces, _gdiStepUpload];
  _gdi.bakes.set(T.key, rec);
  // a plain dark floor shows at once, until the picture is done (rule 16: never a gap)
  try { const st = _gdi.st; if (st) { const g = sc.add.graphics(); const S = GARDEN_TUNNEL_STYLES[T.style].col; g.fillStyle(parseInt(S.floorLo.slice(1), 16), 1); for (const s of T.segs.concat(T.stairs)) { g.fillCircle(s.ax, s.ay, s.r); g.fillCircle(s.bx, s.by, s.r); const L = Math.hypot(s.bx - s.ax, s.by - s.ay) || 1, nx = -(s.by - s.ay) / L * s.r, ny = (s.bx - s.ax) / L * s.r; g.fillPoints([{ x: s.ax + nx, y: s.ay + ny }, { x: s.bx + nx, y: s.by + ny }, { x: s.bx - nx, y: s.by - ny }, { x: s.ax - nx, y: s.ay - ny }], true); } for (const c of T.ells) { if (c.rect) g.fillRect(c.x - c.rx, c.y - c.ry, c.rx * 2, c.ry * 2); else g.fillEllipse(c.x, c.y, c.rx * 2, c.ry * 2); } st.insides.add(g); rec.ph = g; g.setAlpha(0); } } catch (e) { rec.ph = null; }
  return rec;
}
/** Paint the next slices of a picture, while this frame has room for it. low: only what the frames leave over (a prebake). */
function _gdiBakeSome(rec, low) {
  if (rec.done) return;
  const room = typeof gardenBakeRoom === 'function' ? gardenBakeRoom(GDI.slice, low) : GDI.slice; if (!room) return;
  const t0 = performance.now();
  try { while (rec.i < rec.steps.length && performance.now() - t0 < room) { const s0 = performance.now(); rec.steps[rec.i](rec); rec.i++; rec.ms = Math.max(rec.ms, performance.now() - s0); if (rec.i < rec.steps.length && performance.now() - t0 > room * 0.5) break; } }
  catch (e) { console.error('[garden depth] inside', rec.T.id, e); rec.i = rec.steps.length; rec.done = true; }
  if (typeof gardenBakeSpent === 'function') gardenBakeSpent(performance.now() - t0);
}
function _gdiCanvas(rec) { const c = document.createElement('canvas'); c.width = Math.ceil(rec.w * rec.K); c.height = Math.ceil(rec.h * rec.K); const x = c.getContext('2d'); x.setTransform(rec.K, 0, 0, rec.K, -rec.x0 * rec.K, -rec.y0 * rec.K); return [c, x]; }
/** The floor's outline, as one path: passages (capsules), chambers (ellipses), the stairs. */
function _gdiFloorPath(x, T, grow) {
  const g = grow || 0;
  x.beginPath();
  for (const s of T.segs.concat(T.stairs)) {
    const L = Math.hypot(s.bx - s.ax, s.by - s.ay) || 1, ux = (s.bx - s.ax) / L, uy = (s.by - s.ay) / L, r = s.r + g, a = Math.atan2(uy, ux);
    x.moveTo(s.ax - uy * r, s.ay + ux * r); x.arc(s.ax, s.ay, r, a + Math.PI / 2, a + Math.PI * 1.5); x.lineTo(s.bx + uy * r, s.by - ux * r); x.arc(s.bx, s.by, r, a - Math.PI / 2, a + Math.PI / 2); x.closePath();
  }
  for (const c of T.ells) { if (c.rect) { const w = c.rx + g, h = c.ry + g * 0.7; if (x.roundRect) { x.moveTo(c.x + w, c.y); x.roundRect(c.x - w, c.y - h, w * 2, h * 2, 7); } else x.rect(c.x - w, c.y - h, w * 2, h * 2); continue; } x.moveTo(c.x + c.rx + g, c.y); x.ellipse(c.x, c.y, c.rx + g, c.ry + g * 0.7, 0, 0, Math.PI * 2); }
}
function _gdiStepMask(rec) {
  const [c, x] = _gdiCanvas(rec); rec.M = c;
  x.fillStyle = '#fff'; _gdiFloorPath(x, rec.T, 0); x.fill('nonzero');
}
function _gdiStepSweep(rec) {   // the floor swept up the height of the back walls: their faces are what lies between
  const c = document.createElement('canvas'); c.width = rec.M.width; c.height = rec.M.height; const x = c.getContext('2d');
  const step = Math.max(2, Math.round(4 * rec.K));
  for (let k = 0; k <= rec.FACE * rec.K; k += step) x.drawImage(rec.M, 0, -k);
  x.drawImage(rec.M, 0, -rec.FACE * rec.K);
  rec.S = c;
}
function _gdiStepRock(rec) {   // the rock all round (seen where a light reaches past the walls): dark, with beds and stones
  const [c, x] = _gdiCanvas(rec); rec.c = c; rec.x = x;
  const T = rec.T, S = GARDEN_TUNNEL_STYLES[T.style].col, r = _gdiRng(rec.seed);
  x.fillStyle = S.rock; x.fillRect(rec.x0, rec.y0, rec.w, rec.h);
  // beds of rock or earth, gently dipping
  for (let yy = rec.y0 + 6; yy < rec.y0 + rec.h; yy += 11 + r() * 16) {
    x.beginPath(); x.moveTo(rec.x0, yy); for (let xx = rec.x0; xx <= rec.x0 + rec.w + 20; xx += 24) x.lineTo(xx, yy + Math.sin(xx * 0.011 + r() * 0.6) * 3 + (xx - rec.x0) * 0.02);
    x.strokeStyle = r() < 0.5 ? S.rockHi : '#15120f'; x.globalAlpha = 0.35 + r() * 0.3; x.lineWidth = 1 + r() * 1.6; x.stroke(); x.globalAlpha = 1;
  }
  // stones in it, lit from the upper left
  for (let i = 0; i < rec.w * rec.h / 900; i++) {
    const sx = rec.x0 + r() * rec.w, sy = rec.y0 + r() * rec.h, rx = 2 + r() * 6, ry = rx * (0.5 + r() * 0.3);
    x.fillStyle = '#17130f'; x.globalAlpha = 0.55; x.beginPath(); x.ellipse(sx + 1, sy + 1, rx, ry, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = S.rockHi; x.globalAlpha = 0.6; x.beginPath(); x.ellipse(sx - rx * 0.2, sy - ry * 0.25, rx * 0.8, ry * 0.7, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
  }
  // under a building or turf (a cellar, the way under the yard): roots and soil near its top
  if (T.style === 'cellar' || T.style === 'drift') for (let i = 0; i < rec.w / 30; i++) { const sx = rec.x0 + r() * rec.w, sy = rec.y0 + r() * rec.h * 0.4; x.beginPath(); x.moveTo(sx, sy); x.bezierCurveTo(sx + (r() - .5) * 20, sy + 10, sx + (r() - .5) * 24, sy + 18, sx + (r() - .5) * 30, sy + 26 + r() * 14); x.strokeStyle = '#3a2c20'; x.globalAlpha = 0.5; x.lineWidth = 1.2; x.stroke(); x.globalAlpha = 1; }
}
function _gdiStepFace(rec) {   // the back walls' faces: brick, rock beds or dressed stone, lit from above
  const T = rec.T, St = GARDEN_TUNNEL_STYLES[T.style], S = St.col, r = _gdiRng(rec.seed + 11), F = rec.FACE;
  const [c, x] = _gdiCanvas(rec), b = rec.T.box, X0 = b[0] - 6, Y0 = b[1] - F - 6, WW = b[2] - b[0] + 12, HH = b[3] - b[1] + F + 12;
  const g = x.createLinearGradient(0, Y0, 0, Y0 + HH); g.addColorStop(0, S.wallLo); g.addColorStop(1, S.wall);
  x.fillStyle = g; x.fillRect(X0, Y0, WW, HH);
  if (St.wall === 'brick') {
    for (let yy = Y0, row = 0; yy < Y0 + HH; yy += 6, row++) for (let xx = X0 - (row % 2) * 7; xx < X0 + WW; xx += 14) { const t = r(); x.fillStyle = t < 0.3 ? S.wallLo : t < 0.8 ? S.wall : S.wallHi; x.fillRect(xx + 0.7, yy + 0.7, 12.6, 4.6); }
    x.fillStyle = S.mortar; x.globalAlpha = 0.25; for (let yy = Y0; yy < Y0 + HH; yy += 6) x.fillRect(X0, yy, WW, 0.8); x.globalAlpha = 1;
  } else if (St.wall === 'stone') {
    for (let yy = Y0, row = 0; yy < Y0 + HH; yy += 10, row++) for (let xx = X0 - (row % 2) * 11; xx < X0 + WW; xx += 22 + Math.floor(r() * 6)) { const t = r(); x.fillStyle = t < 0.3 ? S.wallLo : t < 0.8 ? S.wall : S.wallHi; x.fillRect(xx + 1, yy + 1, 20, 8); x.fillStyle = '#ffffff'; x.globalAlpha = 0.12; x.fillRect(xx + 1, yy + 1, 20, 1.6); x.globalAlpha = 1; }
  } else {   // rough rock: beds, joints, the tool marks of whoever cut it
    for (let yy = Y0; yy < Y0 + HH; yy += 5 + r() * 7) { x.beginPath(); x.moveTo(X0, yy); for (let xx = X0; xx <= X0 + WW + 16; xx += 16) x.lineTo(xx, yy + (r() - 0.5) * 2.4); x.strokeStyle = r() < 0.5 ? S.wallHi : S.wallLo; x.globalAlpha = 0.5; x.lineWidth = 1 + r() * 2; x.stroke(); x.globalAlpha = 1; }
    for (let i = 0; i < WW * HH / 260; i++) { const sx = X0 + r() * WW, sy = Y0 + r() * HH; x.strokeStyle = S.mortar; x.globalAlpha = 0.5; x.lineWidth = 1; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (r() - 0.5) * 6, sy + 3 + r() * 6); x.stroke(); x.globalAlpha = 1; }
    if (St.props) for (let i = 0; i < WW * HH / 700; i++) { const sx = X0 + r() * WW, sy = Y0 + r() * HH; x.fillStyle = r() < 0.5 ? '#c9a95a' : '#d8d2c0'; x.globalAlpha = 0.55; x.fillRect(sx, sy, 1.6, 1.2); x.globalAlpha = 1; }   // (glints of ore)
  }
  // light falls from above: the top of each face darker, wet streaks where the water comes through
  x.globalCompositeOperation = 'destination-in'; x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(rec.S, 0, 0); x.setTransform(rec.K, 0, 0, rec.K, -rec.x0 * rec.K, -rec.y0 * rec.K); x.globalCompositeOperation = 'source-over';
  rec.x.drawImage(c, rec.x0, rec.y0, rec.w, rec.h);
  // shade: each face darker towards its top (away from the floor's light)
  const sh = document.createElement('canvas'); sh.width = c.width; sh.height = c.height; const y = sh.getContext('2d');
  y.drawImage(rec.S, 0, 0); y.globalCompositeOperation = 'source-in'; y.fillStyle = '#000'; y.fillRect(0, 0, sh.width, sh.height);
  y.globalCompositeOperation = 'destination-out'; y.drawImage(rec.M, 0, Math.round(-F * 0.45 * rec.K)); y.drawImage(rec.M, 0, Math.round(-F * 0.2 * rec.K)); y.drawImage(rec.M, 0, 0);
  rec.x.globalAlpha = 0.3; rec.x.drawImage(sh, rec.x0, rec.y0, rec.w, rec.h); rec.x.globalAlpha = 1;
}
function _gdiStepFloor(rec) {   // the floor: flags, packed earth or gravel, worn paler down the middle of the way
  const T = rec.T, St = GARDEN_TUNNEL_STYLES[T.style], S = St.col, r = _gdiRng(rec.seed + 23);
  const [c, x] = _gdiCanvas(rec), b = T.box, bx0 = b[0] - 4, by0 = b[1] - 4, bw = b[2] - b[0] + 8, bh = b[3] - b[1] + 8;
  x.fillStyle = S.floor; x.fillRect(bx0, by0, bw, bh);
  if (St.floor === 'flags') {   // big worn flags of every size, laid in rough courses, a few cracked, the joints dark with dust
    x.fillStyle = S.grout; x.fillRect(bx0, by0, bw, bh);
    for (let yy = by0, row = 0; yy < by0 + bh; row++) {
      const hh = 11 + Math.floor(r() * 7);
      for (let xx = bx0 - r() * 18; xx < bx0 + bw; ) {
        const w = 15 + r() * 17, t = r(), sk = (r() - 0.5) * 1.6, x0 = xx + 1, y0 = yy + 1 + sk, w0 = w - 2, h0 = hh - 2;
        x.fillStyle = t < 0.22 ? S.floorLo : t < 0.78 ? S.floor : S.floorHi;
        x.beginPath(); x.moveTo(x0 + 1.4, y0); x.lineTo(x0 + w0 - 1, y0 + (r() - 0.5)); x.lineTo(x0 + w0, y0 + h0 - 1.2); x.lineTo(x0 + w0 - 1.6, y0 + h0); x.lineTo(x0 + 0.6, y0 + h0 + (r() - 0.5)); x.lineTo(x0, y0 + 1.4); x.closePath(); x.fill();
        x.fillStyle = '#ffffff'; x.globalAlpha = 0.11; x.fillRect(x0 + 1.5, y0 + 0.8, w0 - 4, 1.5); x.globalAlpha = 1;
        x.fillStyle = '#000000'; x.globalAlpha = 0.12; x.fillRect(x0 + 1, y0 + h0 - 1.6, w0 - 2, 1.6); x.globalAlpha = 1;
        if (r() < 0.12) { x.strokeStyle = S.grout; x.globalAlpha = 0.8; x.lineWidth = 0.7; x.beginPath(); x.moveTo(x0 + w0 * r(), y0); x.lineTo(x0 + w0 * (0.3 + r() * 0.4), y0 + h0 * 0.5); x.lineTo(x0 + w0 * r(), y0 + h0); x.stroke(); x.globalAlpha = 1; }
        xx += w;
      }
      yy += hh;
    }
    for (let i = 0; i < bw * bh / 260; i++) { const sx = bx0 + r() * bw, sy = by0 + r() * bh; x.fillStyle = r() < 0.5 ? '#c8b88a' : '#5a5040'; x.globalAlpha = 0.35; x.fillRect(sx, sy, 2 + r() * 3, 0.7); x.globalAlpha = 1; }
  } else {
    x.save(); x.filter = 'blur(' + Math.round(3 * rec.K) + 'px)';
    for (let i = 0; i < bw * bh / 700; i++) { const sx = bx0 + r() * bw, sy = by0 + r() * bh, rr = 6 + r() * 14; x.fillStyle = r() < 0.5 ? S.floorLo : S.floorHi; x.globalAlpha = 0.35; x.beginPath(); x.ellipse(sx, sy, rr, rr * 0.55, 0, 0, Math.PI * 2); x.fill(); }
    x.restore(); x.globalAlpha = 1;
    const grit = St.floor === 'gravel' ? 120 : 210;
    for (let i = 0; i < bw * bh / grit; i++) { const sx = bx0 + r() * bw, sy = by0 + r() * bh, big = r() < 0.08, rr = big ? 2.6 + r() * 2.6 : St.floor === 'gravel' ? 0.5 + r() * 1.1 : 0.5 + r() * 1.4, t = r();
      if (big) { x.fillStyle = '#1e1a16'; x.globalAlpha = 0.4; x.beginPath(); x.ellipse(sx + 0.8, sy + 0.8, rr, rr * 0.55, 0, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = t < 0.45 ? S.floorLo : t < 0.9 ? S.floorHi : '#2e2822'; x.globalAlpha = big ? 0.95 : 0.55; x.beginPath(); x.ellipse(sx, sy, rr, rr * 0.55, r() * 0.6, 0, Math.PI * 2); x.fill();
      if (big) { x.fillStyle = '#ffffff'; x.globalAlpha = 0.18; x.beginPath(); x.ellipse(sx - rr * 0.3, sy - rr * 0.18, rr * 0.45, rr * 0.2, 0, 0, Math.PI * 2); x.fill(); }
      x.globalAlpha = 1; }
  }
  // the way worn by feet: paler down the middle of each passage
  x.lineCap = 'round'; for (const s of T.segs) { x.strokeStyle = S.floorHi; x.globalAlpha = 0.22; x.lineWidth = s.r * 0.9; x.beginPath(); x.moveTo(s.ax, s.ay); x.lineTo(s.bx, s.by); x.stroke(); x.globalAlpha = 1; }
  // a puddle or two where the drips fall
  for (let i = 0; i < 2 + St.drip * 6; i++) { const s = T.segs[Math.floor(r() * T.segs.length)] || T.segs[0]; if (!s) break; const t = r(), px = s.ax + (s.bx - s.ax) * t + (r() - 0.5) * s.r, py = s.ay + (s.by - s.ay) * t + (r() - 0.5) * s.r * 0.6, w = 6 + r() * 9; x.fillStyle = '#3e4a52'; x.globalAlpha = 0.5; x.beginPath(); x.ellipse(px, py, w, w * 0.36, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#c8dce6'; x.globalAlpha = 0.28; x.beginPath(); x.ellipse(px - w * 0.25, py - w * 0.08, w * 0.4, w * 0.1, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; }
  x.globalCompositeOperation = 'destination-in'; x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(rec.M, 0, 0); x.globalCompositeOperation = 'source-over';
  rec.x.drawImage(c, rec.x0, rec.y0, rec.w, rec.h);
}
function _gdiStepEdges(rec) {   // the cut: a pale section line round the floor's near edges, the dark where each face meets the floor, the top of the walls
  const x = rec.x, T = rec.T, K = rec.K, F = rec.FACE;
  const band = (dy, src, out) => { const c = document.createElement('canvas'); c.width = rec.M.width; c.height = rec.M.height; const y = c.getContext('2d'); y.drawImage(src, 0, Math.round(dy * K)); y.globalCompositeOperation = 'destination-out'; y.drawImage(out || src, 0, 0); return c; };
  const tint = (c, col, a) => { const y = c.getContext('2d'); y.globalCompositeOperation = 'source-in'; y.fillStyle = col; y.fillRect(0, 0, c.width, c.height); x.globalAlpha = a; x.drawImage(c, rec.x0, rec.y0, rec.w, rec.h); x.globalAlpha = 1; };
  // the floor's near (south) edge, cut: the rock below it in shadow, a lit stone section line on top
  tint(band(5.5, rec.M), '#0c0a08', 0.55); tint(band(2.2, rec.M), '#d8cbb0', 0.75);
  // the side edges (east, west) cut too, thinner
  for (const dx of [-2, 2]) { const c = document.createElement('canvas'); c.width = rec.M.width; c.height = rec.M.height; const y = c.getContext('2d'); y.drawImage(rec.M, Math.round(dx * K), 0); y.globalCompositeOperation = 'destination-out'; y.drawImage(rec.S, 0, 0); tint(c, '#c8bba0', 0.45); }
  // where a face meets the floor: dark (nothing reaches under its foot)
  const foot = document.createElement('canvas'); foot.width = rec.M.width; foot.height = rec.M.height; const fy = foot.getContext('2d'); fy.drawImage(rec.M, 0, 0); fy.globalCompositeOperation = 'destination-out'; fy.drawImage(rec.M, 0, Math.round(5 * K)); tint(foot, '#000000', 0.45);
  // the top of each face: the rock over it in shadow, and its lip
  tint(band(-5, rec.S), '#000000', 0.35); tint(band(-1.6, rec.S), '#5e564a', 0.85);
  // soft shade along every wall over the floor (light lies in the middle of a passage)
  const ao = document.createElement('canvas'); ao.width = rec.M.width; ao.height = rec.M.height; const ay = ao.getContext('2d');
  ay.fillStyle = '#000'; ay.fillRect(0, 0, ao.width, ao.height); ay.globalCompositeOperation = 'destination-out'; ay.filter = 'blur(' + Math.round(7 * K) + 'px)'; ay.drawImage(rec.M, 0, 0); ay.filter = 'none';
  ay.globalCompositeOperation = 'destination-in'; ay.drawImage(rec.M, 0, 0);
  x.globalAlpha = 0.5; x.drawImage(ao, rec.x0, rec.y0, rec.w, rec.h); x.globalAlpha = 1;
  void T; void F;
}
function _gdiStepStairs(rec) {   // each mouth's stair: treads rising to the daylight, its jambs; a shut one is drawn over it by a piece of its own
  const x = rec.x, T = rec.T, S = GARDEN_TUNNEL_STYLES[T.style].col, H = _gdiH();
  for (const m of T.mouths) {
    const ax = m.pin.x, ay = m.pin.y, bx = m.pout.x, by = m.pout.y, L = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux, hw = GARDEN_TUNNEL.stairR + 3;
    const n = 6;
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 0.82) / n, lit = 0.25 + 0.75 * (k / (n - 1));
      const P = (t, s) => [ax + ux * L * t + nx * s, ay + uy * L * t + ny * s];
      x.beginPath(); const p1 = P(t0, -hw), p2 = P(t1, -hw), p3 = P(t1, hw), p4 = P(t0, hw); x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.lineTo(p3[0], p3[1]); x.lineTo(p4[0], p4[1]); x.closePath();
      x.fillStyle = S.floorHi; x.globalAlpha = 0.45 + 0.5 * lit; x.fill();
      x.fillStyle = '#ffffff'; x.globalAlpha = 0.12 * lit; x.fill(); x.globalAlpha = 1;
      const e1 = P(t0, -hw), e2 = P(t0, hw); x.strokeStyle = '#1a1612'; x.globalAlpha = 0.55; x.lineWidth = 1.4; x.beginPath(); x.moveTo(e1[0], e1[1]); x.lineTo(e2[0], e2[1]); x.stroke(); x.globalAlpha = 1;   // (each tread's riser in shadow)
    }
    // a stair that rises through the back wall (you walk out northwards): the opening up to the daylight in its face, and its jambs,
    // worked stone or (an adit) timber. A stair that rises to the side or towards you comes up through the cut: its top step is lit.
    if (m.face === 's') {
      const F = rec.FACE, ow = hw + 2, oy = by - 2;
      const g = x.createLinearGradient(0, oy - F, 0, oy); g.addColorStop(0, '#f4f1e2'); g.addColorStop(0.55, '#d8d0b4'); g.addColorStop(1, S.floorHi);
      x.fillStyle = g; x.beginPath(); x.moveTo(bx - ow, oy); x.lineTo(bx - ow, oy - F * 0.7); x.quadraticCurveTo(bx, oy - F * 1.02, bx + ow, oy - F * 0.7); x.lineTo(bx + ow, oy); x.closePath(); x.fill();
      x.fillStyle = '#8ea86a'; x.globalAlpha = 0.7; x.beginPath(); x.ellipse(bx, oy - F * 0.78, ow * 0.9, 4, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;   // (turf at the top, seen against the sky)
      const jc = m.by === 'adit' ? '#6e5236' : S.wallHi;
      for (const s of [-1, 1]) { const jx = bx + s * (ow + 2); x.fillStyle = '#0c0a08'; x.globalAlpha = 0.5; x.fillRect(jx - 3, oy - F * 0.82, 7, F * 0.84); x.globalAlpha = 1; x.fillStyle = jc; x.fillRect(jx - 3, oy - F * 0.84, 6, F * 0.84); x.fillStyle = '#ffffff'; x.globalAlpha = 0.18; x.fillRect(jx - 3, oy - F * 0.84, 1.8, F * 0.84); x.globalAlpha = 1; }
    } else {
      const p1 = [bx - nx * hw, by - ny * hw], p2 = [bx + nx * hw, by + ny * hw];
      x.strokeStyle = '#f0e8d0'; x.globalAlpha = 0.7; x.lineWidth = 2.4; x.beginPath(); x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.stroke(); x.globalAlpha = 1;
    }
    void H;
  }
}
function _gdiStepPieces(rec) {   // each chamber's piece against its back wall (shelves, barrels, a bench, the ore tub on its rails, crystals, a pool), the mine's props and rails, the old lamps
  const x = rec.x, T = rec.T, St = GARDEN_TUNNEL_STYLES[T.style], S = St.col, H = _gdiH(), F = rec.FACE, r = _gdiRng(rec.seed + 41);
  if (St.rail) for (const s of T.segs) {   // the rails down the middle of the way
    const L = Math.hypot(s.bx - s.ax, s.by - s.ay) || 1, ux = (s.bx - s.ax) / L, uy = (s.by - s.ay) / L, nx = -uy, ny = ux;
    for (let t = 0; t < L; t += 9) { const px = s.ax + ux * t, py = s.ay + uy * t; x.strokeStyle = '#4a3624'; x.lineWidth = 3; x.beginPath(); x.moveTo(px - nx * 9, py - ny * 9); x.lineTo(px + nx * 9, py + ny * 9); x.stroke(); }
    for (const o of [-6, 6]) { x.strokeStyle = '#5a5e62'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(s.ax + nx * o, s.ay + ny * o); x.lineTo(s.bx + nx * o, s.by + ny * o); x.stroke(); x.strokeStyle = '#a8acae'; x.globalAlpha = 0.5; x.lineWidth = 0.6; x.stroke(); x.globalAlpha = 1; }
  }
  if (St.props) {   // timber props against the back wall of the way: a post where the wall really stands (not in a chamber, not over the way), its cap and a brace
    const inRoom = (px, py) => T.ells.some(c => ((px - c.x) / (c.rx + 20)) ** 2 + ((py - c.y) / (c.ry + 16)) ** 2 < 1);
    for (const s of T.segs) {
      const L = Math.hypot(s.bx - s.ax, s.by - s.ay); if (L < 40) continue;
      for (let t = 24; t < L - 16; t += 58) {
        const cx = s.ax + (s.bx - s.ax) * t / L; let wy = null;
        for (let yy = s.ay + (s.by - s.ay) * t / L; yy > s.ay + (s.by - s.ay) * t / L - s.r - 20; yy -= 2) if (!gardenTunnelFree(T, cx, yy, 0, null)) { wy = yy + 2; break; }
        if (wy == null || inRoom(cx, wy) || !gardenTunnelFree(T, cx, wy + 6, 0, null)) continue;
        const top = wy - F * 0.95, base = wy + 3;
        x.fillStyle = '#1a120c'; x.globalAlpha = 0.5; x.fillRect(cx - 2, top + 2, 8, base - top); x.globalAlpha = 1;
        x.fillStyle = '#4a3624'; x.fillRect(cx - 3.4, top, 6.8, base - top); x.fillStyle = '#7a5a3a'; x.fillRect(cx - 3.4, top, 2.2, base - top);
        x.fillStyle = '#5e4630'; x.fillRect(cx - 11, top - 5, 22, 6); x.fillStyle = '#8a6a48'; x.fillRect(cx - 11, top - 5, 22, 1.6);
        x.strokeStyle = '#4a3624'; x.lineWidth = 2.6; x.beginPath(); x.moveTo(cx + 3, top + 10); x.lineTo(cx + 13, top + 1); x.stroke();
      }
      // a passage running up the screen: its props stand against its side walls, seen from above (a square of timber, its lit top)
      const ux = (s.bx - s.ax) / L, uy = (s.by - s.ay) / L; if (Math.abs(uy) < 0.6) continue;
      for (let t = 22; t < L - 14; t += 46) for (const sd of [-1, 1]) {
        const px = s.ax + ux * t - uy * (s.r - 2) * sd, py = s.ay + uy * t + ux * (s.r - 2) * sd;
        if (inRoom(px, py) || T.mouths.some(m => Math.hypot(m.pin.x - px, m.pin.y - py) < 26)) continue;
        x.fillStyle = '#120c08'; x.globalAlpha = 0.5; x.fillRect(px - 3, py - 2, 9, 7); x.globalAlpha = 1;
        x.fillStyle = '#4a3624'; x.fillRect(px - 4, py - 6, 8, 9); x.fillStyle = '#8a6a48'; x.fillRect(px - 4, py - 6, 8, 2.6); x.fillStyle = '#6e5236'; x.fillRect(px - 4, py - 6, 2.4, 9);
        x.strokeStyle = '#5e4630'; x.globalAlpha = 0.55; x.lineWidth = 3; x.beginPath(); x.moveTo(px - sd * 4, py - 4); x.lineTo(px + sd * (s.r - 12), py - 4); x.stroke(); x.globalAlpha = 1;   // (its cap reaching out over the way)
      }
    }
  }
  // what lies about at the floor's edges: rubble and old timber in a mine or a passage; sacks and crates in a cellar or a vault
  { const r2 = _gdiRng(rec.seed + 77), built = St.wall === 'brick' || St.wall === 'stone';
    for (let i = 0; i < (built ? 6 : 14); i++) {
      const c = T.ells[Math.floor(r2() * T.ells.length)], s = T.segs[Math.floor(r2() * T.segs.length)]; let px, py;
      if (built && c) { px = c.x + (r2() < 0.5 ? -1 : 1) * (c.rx - 10 - r2() * 8); py = c.y - c.ry * (0.2 - r2() * 0.9); } else if (s) { const t = r2(); px = s.ax + (s.bx - s.ax) * t; py = s.ay + (s.by - s.ay) * t; const L = Math.hypot(s.bx - s.ax, s.by - s.ay) || 1, side = r2() < 0.5 ? -1 : 1; px += -(s.by - s.ay) / L * (s.r - 7) * side; py += (s.bx - s.ax) / L * (s.r - 7) * side; } else continue;
      if (!gardenTunnelFree(T, px, py, 0, null) || T.mouths.some(m => Math.hypot(m.pin.x - px, m.pin.y - py) < 30)) continue;
      if (built) { if (r2() < 0.5) { x.fillStyle = '#1a140e'; x.globalAlpha = 0.45; x.fillRect(px - 6, py - 1, 14, 3); x.globalAlpha = 1; x.fillStyle = '#7a5a3a'; x.fillRect(px - 7, py - 10, 13, 10); x.fillStyle = '#a07e58'; x.fillRect(px - 7, py - 10, 13, 2); x.strokeStyle = '#4a3624'; x.lineWidth = 0.8; x.strokeRect(px - 7, py - 10, 13, 10); } else { x.fillStyle = '#1a140e'; x.globalAlpha = 0.4; x.beginPath(); x.ellipse(px + 1, py + 1, 7, 2.4, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; x.fillStyle = '#b09a70'; x.beginPath(); x.ellipse(px, py - 5, 6, 6.4, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#ccb88c'; x.beginPath(); x.ellipse(px - 1.6, py - 7, 3, 3, 0, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#7a6440'; x.lineWidth = 1; x.beginPath(); x.moveTo(px - 2, py - 11); x.lineTo(px + 2, py - 10); x.stroke(); } }
      else for (let k = 0; k < 4; k++) { const bx = px + (r2() - 0.5) * 9, by = py + (r2() - 0.5) * 4, rr = 1.6 + r2() * 2.6; x.fillStyle = '#1e1a16'; x.globalAlpha = 0.45; x.beginPath(); x.ellipse(bx + 0.8, by + 0.8, rr, rr * 0.6, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; x.fillStyle = r2() < 0.5 ? S.wall : S.wallHi; x.beginPath(); x.ellipse(bx, by, rr, rr * 0.6, 0, 0, Math.PI * 2); x.fill(); }
    }
  }
  for (const c of T.ells) {
    const R = GARDEN_CHAMBERS[c.what], back = c.y - c.ry, cx = c.x + (c.pieceDx || 0);
    if (!R) continue;
    if (R.piece === 'shelves') {   // shelves of boxes, ledgers and jars against the back wall
      for (const side of [-1, 1]) { const sx = cx + side * c.rx * 0.42, w = c.rx * 0.62; for (let k = 0; k < 3; k++) { const yy = back - 6 - k * 13; x.fillStyle = '#3a2a1c'; x.fillRect(sx - w / 2, yy, w, 3); x.fillStyle = '#7a5a3a'; x.fillRect(sx - w / 2, yy, w, 1.2); for (let i = 0; i < w / 6; i++) { const bx = sx - w / 2 + 2 + i * 6 + r() * 2, bh = 5 + r() * 6, t = r(); x.fillStyle = t < 0.3 ? '#a8865a' : t < 0.55 ? '#6a4a3a' : t < 0.75 ? '#8e9a7a' : '#c8b890'; x.fillRect(bx, yy - bh, 4 + r() * 2, bh); } } x.fillStyle = '#2e2218'; x.fillRect(sx - w / 2 - 2, back - 46, 3, 44); x.fillRect(sx + w / 2 - 1, back - 46, 3, 44); }
      x.fillStyle = '#5e4630'; x.fillRect(cx - 14, back - 10, 28, 12); x.fillStyle = '#8a6a48'; x.fillRect(cx - 14, back - 10, 28, 2.4); x.fillStyle = '#c4a478'; x.fillRect(cx - 12, back - 7, 24, 1.2);   // (the old plan chest)
    } else if (R.piece === 'barrels') {   // barrels on their sides on chocks, a row against the back wall
      for (let i = -2; i <= 2; i++) { const bx = cx + i * 17, by = back - 9; x.fillStyle = '#1a120c'; x.globalAlpha = 0.5; x.beginPath(); x.ellipse(bx + 2, by + 9, 9, 3, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; x.fillStyle = '#6a4626'; x.beginPath(); x.ellipse(bx, by, 8.5, 8, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#9a6a3a'; x.beginPath(); x.ellipse(bx - 1.5, by - 1.5, 6, 5.5, 0, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#2f3336'; x.lineWidth = 1.3; x.beginPath(); x.ellipse(bx, by, 8.5, 8, 0, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.ellipse(bx, by, 4.5, 4.2, 0, 0, Math.PI * 2); x.stroke(); x.fillStyle = '#c4a478'; x.fillRect(bx - 1, by - 1, 2, 2); }
    } else if (R.piece === 'bench') {   // a bench cut into the rock, a few marks scratched above it
      x.fillStyle = '#1a1612'; x.globalAlpha = 0.45; x.fillRect(cx - c.rx * 0.55, back - 3, c.rx * 1.1, 5); x.globalAlpha = 1; x.fillStyle = S.wallHi; x.fillRect(cx - c.rx * 0.55, back - 12, c.rx * 1.1, 9); x.fillStyle = '#ffffff'; x.globalAlpha = 0.15; x.fillRect(cx - c.rx * 0.55, back - 12, c.rx * 1.1, 2); x.globalAlpha = 1;
      x.strokeStyle = '#2a2420'; x.lineWidth = 1; for (let i = 0; i < 7; i++) { const mx = cx - 18 + i * 6; x.beginPath(); x.moveTo(mx, back - 34); x.lineTo(mx + 1, back - 25); x.stroke(); } x.beginPath(); x.moveTo(cx - 20, back - 28); x.lineTo(cx + 22, back - 31); x.stroke();
    } else if (R.piece === 'tub') {   // an ore tub on its rails, a heap of spoil, a pick leant on the wall
      x.fillStyle = '#4a4036'; x.beginPath(); x.moveTo(cx + 14, back + 2); x.quadraticCurveTo(cx + 26, back - 18, cx + 40, back + 2); x.fill(); x.fillStyle = '#6a5e50'; x.beginPath(); x.moveTo(cx + 18, back); x.quadraticCurveTo(cx + 26, back - 14, cx + 34, back); x.fill();
      x.fillStyle = '#2f3336'; x.fillRect(cx - 22, back - 16, 26, 14); x.fillStyle = '#5a5e62'; x.fillRect(cx - 22, back - 16, 26, 2.5); x.fillStyle = '#6a5e50'; x.beginPath(); x.ellipse(cx - 9, back - 16, 11, 4, 0, Math.PI, 0); x.fill(); x.fillStyle = '#1a1a1a'; for (const wx of [cx - 17, cx - 1]) { x.beginPath(); x.ellipse(wx, back - 1, 3.4, 3.4, 0, 0, Math.PI * 2); x.fill(); }
      x.strokeStyle = '#6e5236'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 34, back - 2); x.lineTo(cx - 28, back - 34); x.stroke(); x.strokeStyle = '#5a5e62'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(cx - 34, back - 32); x.quadraticCurveTo(cx - 28, back - 37, cx - 21, back - 33); x.stroke();
    } else if (R.piece === 'crystals') {   // clusters of six-sided points out of the back wall and the floor's edges, a lit facet and a dark one, a cold glow at each foot
      const cluster = (kx, ky, n, big) => {
        const g = x.createRadialGradient(kx, ky - 4, 0, kx, ky - 4, 18 * big); g.addColorStop(0, 'rgba(160,220,255,.45)'); g.addColorStop(1, 'rgba(160,220,255,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(kx, ky - 4, 18 * big, 12 * big, 0, 0, Math.PI * 2); x.fill();
        for (let k = 0; k < n; k++) { const a = (k - (n - 1) / 2) * 0.32 + (r() - 0.5) * 0.2, h = (9 + r() * 12) * big, w = (2.4 + r() * 1.4) * big; x.save(); x.translate(kx + (k - (n - 1) / 2) * 2.4 * big, ky); x.rotate(a);
          x.fillStyle = '#4a6a8a'; x.beginPath(); x.moveTo(-w, 0); x.lineTo(-w, -h * 0.72); x.lineTo(0, -h); x.lineTo(w, -h * 0.72); x.lineTo(w, 0); x.closePath(); x.fill();
          x.fillStyle = '#a8d8f8'; x.beginPath(); x.moveTo(-w, 0); x.lineTo(-w, -h * 0.72); x.lineTo(0, -h); x.lineTo(0, 0); x.closePath(); x.fill();
          x.fillStyle = '#e8f8ff'; x.globalAlpha = 0.8; x.beginPath(); x.moveTo(-w * 0.6, -h * 0.7); x.lineTo(0, -h * 0.98); x.lineTo(-w * 0.15, -h * 0.66); x.closePath(); x.fill(); x.globalAlpha = 1; x.restore(); }
      };
      for (let i = 0; i < 4; i++) cluster(cx + (i - 1.5) * c.rx * 0.48 + (r() - 0.5) * 8, back - 3 - r() * F * 0.45, 3 + Math.floor(r() * 3), 0.9 + r() * 0.35);
      for (const s of [-1, 1]) cluster(c.x + s * (c.rx - 12), c.y + c.ry * 0.25, 2 + Math.floor(r() * 2), 0.7);
    } else if (R.piece === 'pool') {   // a still pool with a lip of stone (it holds the feet off: its hole in the floor)
      const px = c.x + c.rx * 0.12, py = c.y + c.ry * 0.12, prx = c.rx * 0.5, pry = c.ry * 0.45;
      x.fillStyle = '#2a2622'; x.beginPath(); x.ellipse(px, py, prx + 3, pry + 2.4, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#20343c'; x.beginPath(); x.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2); x.fill();
      const g = x.createLinearGradient(0, py - pry, 0, py + pry); g.addColorStop(0, 'rgba(120,170,180,.5)'); g.addColorStop(1, 'rgba(40,70,80,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#d8eef2'; x.globalAlpha = 0.35; x.lineWidth = 0.8; x.beginPath(); x.ellipse(px - prx * 0.2, py - pry * 0.3, prx * 0.4, pry * 0.12, 0, 0, Math.PI * 2); x.stroke(); x.globalAlpha = 1;
    }
    if (R.lamp) {   // the old lamp on its bracket high on the back wall
      const lx = c.x + (c.lampDx || 0), ly = back - F * 0.62;
      x.strokeStyle = '#2f3336'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(lx, ly - 10); x.lineTo(lx, ly - 4); x.moveTo(lx - 5, ly - 10); x.lineTo(lx + 2, ly - 10); x.stroke();
      x.fillStyle = '#2f3336'; x.fillRect(lx - 4, ly - 4, 8, 10); x.fillStyle = '#ffd890'; x.fillRect(lx - 2.6, ly - 2.4, 5.2, 6.4); x.fillStyle = '#fff4d8'; x.fillRect(lx - 1, ly - 1, 2, 3);
    }
  }
}
function _gdiStepUpload(rec) {   // into a texture, at its place; the standing pieces (a well head) and the shut stairs as images of their own
  const sc = rec.scene, st = _gdi.st; if (!sc || !sc.textures) { rec.done = true; return; }
  sc.textures.addImage(rec.key, rec.c); rec.keys.push(rec.key);
  rec.bytes = rec.c.width * rec.c.height * 4;
  const im = sc.add.image(rec.x0, rec.y0, rec.key).setOrigin(0, 0).setScale(1 / rec.K).setAlpha(0);
  if (st) st.insides.add(im); rec.im = im;
  const T = rec.T, H = _gdiH();
  // the well head: it stands in the chamber (its hole in the floor holds the feet off), sorted with you
  for (const c of T.ells) if (GARDEN_CHAMBERS[c.what] && GARDEN_CHAMBERS[c.what].piece === 'well') {
    const key = rec.key + '|well' + c.i, w = 64, h = 60;
    if (!sc.textures.exists(key)) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const x = cv.getContext('2d'); x.scale(2, 2); x.translate(w / 2, h - 8); _gdiWell(x, H); sc.textures.addImage(key, cv); rec.keys.push(key); }
    const p = sc.add.image(c.x, c.y + 4, key).setOrigin(0.5, (h - 8) / h).setScale(0.5).setAlpha(0); p.setDepth(c.y + 4);
    if (st) { const L = st.figs._inner || st.figs.target; L.add(p); _gdi.sortDue = true; } rec.pieces.push(p);
  }
  // a shut stair: fallen rock with daylight through a crack (steps, a hatch), or an iron gate (an arch, an adit)
  for (const m of T.mouths) {
    const key = rec.key + '|shut' + m.i, w = 64, h = 64, rock = m.by === 'steps' || m.by === 'hatch';
    if (!sc.textures.exists(key)) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const x = cv.getContext('2d'); x.scale(2, 2); x.translate(w / 2, h - 10); if (rock) _gdiRockfall(x, _gdiRng(rec.seed + m.i * 7)); else _gdiGate(x); sc.textures.addImage(key, cv); rec.keys.push(key); }
    const mx = (m.pin.x + m.pout.x) / 2 + m.fx * 4, my = Math.max(m.pin.y, m.pout.y) + 2;
    const s = sc.add.image(mx, my, key).setOrigin(0.5, (h - 10) / h).setScale(0.5).setVisible(false); s.setDepth(my);
    if (st) { const L = st.figs._inner || st.figs.target; L.add(s); _gdi.sortDue = true; } rec.shut.push({ m: m.i, im: s });
  }
  if (rec.ph) { try { rec.ph.destroy(); } catch (e) { /* gone */ } rec.ph = null; }
  rec.M = rec.S = null; rec.c = null; rec.x = null;
  rec.done = true;
  if (st && st.rec === rec) { im.setVisible(true); for (const p of rec.pieces) p.setVisible(true); }
  else { im.setVisible(false); for (const p of rec.pieces) p.setVisible(false); }
}
function _gdiWell(x, H) {   // a round well head of dressed stone, its windlass and rope, the dark of the shaft
  x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(3, 2, 24, 6, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#6a6256'; x.beginPath(); x.ellipse(0, -10, 21, 7, 0, 0, Math.PI * 2); x.fill(); x.fillRect(-21, -10, 42, 12); x.beginPath(); x.ellipse(0, 2, 21, 7, 0, 0, Math.PI); x.fill();
  for (let i = -3; i <= 3; i++) { x.fillStyle = i % 2 ? '#8a8272' : '#9e9684'; x.fillRect(i * 6 - 2.6, -9, 5.4, 10); }
  x.fillStyle = '#b8b0a0'; x.beginPath(); x.ellipse(0, -10, 21, 7, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#0a0c0e'; x.beginPath(); x.ellipse(0, -10, 15.5, 4.6, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#4a3624'; x.fillRect(-19, -10 - H * 0.72, 3.4, H * 0.72); x.fillRect(16, -10 - H * 0.72, 3.4, H * 0.72); x.fillStyle = '#7a5a3a'; x.fillRect(-19, -10 - H * 0.72, 1.4, H * 0.72);
  x.fillStyle = '#5e4630'; x.fillRect(-20, -10 - H * 0.62, 40, 4.4); x.strokeStyle = '#c9b07a'; x.lineWidth = 1; x.beginPath(); x.moveTo(1, -8 - H * 0.6); x.lineTo(1, -12); x.stroke();
  x.fillStyle = '#2f3336'; x.fillRect(19, -12 - H * 0.6, 7, 2); x.fillRect(25, -12 - H * 0.6, 2, 7);
}
function _gdiRockfall(x, r) {   // fallen rock filling the stair, daylight through a crack at its top
  x.fillStyle = 'rgba(255,244,210,.85)'; x.beginPath(); x.moveTo(-3, -44); x.lineTo(2, -44); x.lineTo(0, -30); x.closePath(); x.fill();
  for (let i = 0; i < 14; i++) { const bx = (r() - 0.5) * 44, by = -r() * 40, rx = 5 + r() * 8, ry = rx * 0.7; x.fillStyle = '#3e3832'; x.beginPath(); x.ellipse(bx + 1.5, by + 1.5, rx, ry, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = r() < 0.5 ? '#7a7062' : '#8e8474'; x.beginPath(); x.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#b4aa98'; x.globalAlpha = 0.6; x.beginPath(); x.ellipse(bx - rx * 0.3, by - ry * 0.35, rx * 0.45, ry * 0.3, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; }
}
function _gdiGate(x) {   // an iron gate across the way, locked, a padlock on its chain
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(-24, -2, 48, 4);
  x.strokeStyle = '#2a2d30'; x.lineWidth = 2.4; for (let i = -20; i <= 20; i += 6.6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, -44); x.stroke(); }
  x.lineWidth = 3; x.beginPath(); x.moveTo(-23, -40); x.lineTo(23, -40); x.moveTo(-23, -8); x.lineTo(23, -8); x.stroke();
  x.strokeStyle = '#7a8086'; x.lineWidth = 0.8; for (let i = -20; i <= 20; i += 6.6) { x.beginPath(); x.moveTo(i - 0.8, -2); x.lineTo(i - 0.8, -42); x.stroke(); }
  x.fillStyle = '#8a6a3a'; x.fillRect(-3, -26, 6, 7); x.strokeStyle = '#5a5e62'; x.lineWidth = 1.6; x.beginPath(); x.arc(0, -27, 3, Math.PI, 0); x.stroke();
}
/* ---------- the sounds underground: drips, footsteps on stone that ring, the world above hushed ---------- */
if (typeof _gsSfx === 'object' && _gsSfx && typeof _gsTone === 'function') {
  Object.assign(_gsSfx, {
    drip: (c, o, t, R) => { const f = 1400 + R() * 1400; _gsTone(c, o, t, { f, f2: f * 1.9, d: 0.035, peak: 0.035, pan: (R() - 0.5) * 1.2 }); _gsTone(c, o, t + 0.16 + R() * 0.08, { f: f * 1.02, f2: f * 1.8, d: 0.03, peak: 0.012, pan: (R() - 0.5) * 1.2 }); },
  });
}
if (typeof _gsSteps === 'object' && _gsSteps && _gsSteps.path) {
  _gsSteps.cave = (c, o, t, R, k, p) => { _gsSteps.path(c, o, t, R, k * 0.85, p); _gsSteps.path(c, o, t + 0.17 + R() * 0.04, R, k * 0.22, -p); };   // (each step comes back off the rock)
}
if (typeof _gsSurface === 'function') {
  const _gdiSurf0 = _gsSurface;
  _gsSurface = function (x, y) { return typeof _gdt !== 'undefined' && _gdt.cur && _gdt.cur.phase === 'inside' ? 'cave' : _gdiSurf0(x, y); };   // eslint-disable-line no-func-assign
}
if (typeof _gsAmbience === 'function') {   // underground the world above is muffled to a murmur, and the rock drips
  const _gdiAmb0 = _gsAmbience;
  _gsAmbience = function (c) {   // eslint-disable-line no-func-assign
    _gdiAmb0(c);
    try {
      const C = typeof _gdt !== 'undefined' ? _gdt.cur : null, A = _gsn && _gsn.amb, G = _gsn && _gsn.g; if (!A || !G) return;
      if (!C || C.phase !== 'inside') { if (_gdi.ambOn) { _gdi.ambOn = false; } return; }
      _gdi.ambOn = true;
      const t = c.currentTime;
      for (const k of ['wind', 'sea', 'lap', 'brook', 'falls', 'crick', 'rain']) if (A[k] && A[k].gain) A[k].gain.setTargetAtTime(A[k].gain.value * 0.12, t, 0.4);
      if (G.ambLP) G.ambLP.frequency.setTargetAtTime(600, t, 0.3);
      const S = GARDEN_TUNNEL_STYLES[C.T.style] || GARDEN_TUNNEL_STYLES.drift;
      if (_gsPrefs().amb) for (let at = t + Math.random() * 0.4; at < t + 1.15; at += 0.35 + (1 - S.drip) * 1.4 * Math.random()) _gsTone(c, G.amb, at, { f: 1500 + Math.random() * 1500, f2: 2800, d: 0.03, peak: 0.009, pan: (Math.random() - 0.5) * 1.4 });
    } catch (e) { /* as above */ }
  };
}
