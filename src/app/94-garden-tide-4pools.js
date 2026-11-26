/* ============================================================
   ROCK POOLS, PLAYED (the tide, phase 2). At low water, by every rock pool (94-garden-tide-2rocks.js), a stone or two wobbles.
     "Lift the stone"          you crouch and tip it back: under it a shore crab, a shanny, a goby, a shrimp (the Field Journal's
                               own creatures, 94-garden-fish-0catalog.js), or nothing but a funny line. A creature makes a run for it:
                               "Quick, scoop it up!" (E, Space or a click, about a second) and it is yours, as a catch: the journal's
                               page, the bag, the tank, a friend or the market, like any catch.
     "Look into the rock pool" you kneel and watch: an anemone, a starfish, a hermit crab... and now and then a shell to keep.
   What is under each stone is worked out from the strand's number and the low water, so friends find the same; each person lifts
   their own stones (a friend lifting one never empties yours: you see their stone tip and settle back).
   Saved: g.wd['tdl.<w>'] the stones you lifted at your own low water w (a bit each), g.wd['tdlv.<friend>.<w>'] on a friend's strand
   (the last few kept), g.led['tdq.<w>.<pool>'] a pool's find.
   ============================================================ */
const _gtq = { imgs: [], atlas: false, quick: null, peek: new Map() };
const GT_POOL_LIFE = Object.freeze([
  Object.freeze({ id: 'mud-crab', w: 8 }), Object.freeze({ id: 'shanny', w: 7 }), Object.freeze({ id: 'common-goby', w: 6 }), Object.freeze({ id: 'weed-goby', w: 4 }),
  Object.freeze({ id: 'sand-goby', w: 4 }), Object.freeze({ id: 'fairy-shrimp', w: 3 }), Object.freeze({ id: 'fiddler-crab', w: 1.5 }), Object.freeze({ id: 'lumpsucker', w: 1 }),
  Object.freeze({ id: 'golden-crab', w: .4 }), Object.freeze({ id: 'ghost-shrimp', w: .4 }), Object.freeze({ id: 'flounder', w: 1 }),
]);
const GT_POOL_NONE = Object.freeze([
  'Nothing under it but a very surprised sand hopper.', 'A cold, wet stone. The underneath is very interesting to a worm.', 'A tiny crab waves a claw at you and goes back to sleep. Too small to take.',
  'Just weed, and the smell of the sea.', 'A family of periwinkles, holding on tight. You put the stone back gently.', 'Something shot off into the weed before you saw what it was.',
]);
const GT_POOL_PEEK = Object.freeze([
  'A red anemone, closed up tight like a sweet.', 'A starfish, going nowhere very slowly.', 'A hermit crab trying on a new shell. It does not fit.', 'Tiny shrimps, clear as glass, ticking about.',
  'A blenny watches you from under the weed.', 'Your own face, and the sky behind it.', 'A sea slug like a little purple flower.', 'Two gobies having a quiet argument.',
  'Limpets on the rocks, every one facing a different way.', 'A green crab pretending to be a stone.',
]);
function _gtqVisit() { try { return typeof gardenVisitOn === 'function' && gardenVisitOn(); } catch (e) { return false; } }
/** The stones that wobble at low water w: [{k (number), pool, x, y, ph}] (k = pool's number x 2 + which). */
function gardenTideStones() {
  const out = [];
  for (const p of gardenTidePools()) for (let j = 0; j < p.stones; j++) {
    const a = (gardenHash('tide-stone|' + p.id) % 628) / 100 + j * 2.3, W = GARDEN_WORLD, d = p.rx * 1.45 + 3;
    out.push({ k: p.n * 2 + j, pool: p, x: Math.round((p.x + Math.cos(a) * d / W.cellW) * 100) / 100, y: Math.round((p.y + Math.abs(Math.sin(a)) * d * .5 / W.cellH + .05) * 100) / 100, ph: (a * 13) % 1 });
  }
  return out;
}
function _gtqMaskKey(w) { return _gtqVisit() && typeof _gtcFriendTag === 'function' ? 'tdlv.' + _gtcFriendTag() + '.' + w : 'tdl.' + w; }
function _gtqLifted(w, k) { const v = Number(_gdG().wd[_gtqMaskKey(w)]) || 0; return !!(v & (1 << (k % 31))); }
function _gtqSetLifted(w, k) {
  const g = _gdG(), key = _gtqMaskKey(w); g.wd[key] = (Number(g.wd[key]) || 0) | (1 << (k % 31));
  // keep the last few low waters only
  const pre = key.slice(0, key.lastIndexOf('.') + 1), olds = Object.keys(g.wd).filter(q => q.startsWith(pre)).map(q => Number(q.slice(pre.length))).filter(Number.isFinite).sort((a, b) => b - a);
  for (const o of olds.slice(4)) delete g.wd[pre + o];
}
/** What is under stone k at low water w: a creature's id from the Field Journal (that this season and hour allow), or null. */
function gardenTideUnder(st, w) {
  const seed = gardenTideSeed(), r = gardenRand(gardenHash('tide-under|' + seed + '|' + w + '|' + st.k));
  if (r() < .3) return null;
  let season = 'autumn', tod = 'day'; try { const m = gardenHere(); season = m.season; tod = m.tod; } catch (e) { /* the usual */ }
  const rows = GT_POOL_LIFE.filter(L => { const d = typeof gardenFishDef === 'function' ? gardenFishDef(L.id) : null; if (!d) return false; if (Array.isArray(d.seasons) && d.seasons.length && !d.seasons.includes(season)) return false; if (Array.isArray(d.tod) && d.tod.length && !d.tod.includes(tod)) return false; return true; });
  let tot = 0; for (const L of rows) tot += L.w; let v = r() * tot;
  for (const L of rows) { v -= L.w; if (v <= 0) return L.id; }
  return rows.length ? rows[0].id : null;
}
function _gtqExposed(p, T) { const h = GardenTide.h(p.x, p.y); return Number.isFinite(h) && h > T.line + 3; }
/** Rows for the prompt at low water: a wobbling stone to lift, a pool to look into. */
function gardenTidePoolRows(px, py, T) {
  const out = []; if (T.level > .45) return out;
  for (const st of gardenTideStones()) {
    if (Math.hypot(st.x - px, (st.y - py) * 1.3) > 1.7 || _gtqLifted(T.w, st.k) || !_gtqExposed(st.pool, T)) continue;
    out.push({ key: 'tide:s:' + T.w + '.' + st.k, act: 'lift', tide: { kind: 'stone', w: T.w, k: st.k }, words: 'Lift the stone', name: 'the stone', x: st.x, y: st.y, stand: { x: st.x, y: st.y + .32 }, pri: .6 });
  }
  for (const p of gardenTidePools()) {
    if (Math.hypot(p.x - px, (p.y - py) * 1.3) > 2 || !_gtqExposed(p, T)) continue;
    out.push({ key: 'tide:p:' + p.id, act: 'peer', tide: { kind: 'pool', id: p.id }, words: 'Look into the rock pool', name: 'the rock pool', x: p.x, y: p.y, stand: gardenTideStandFree([{ x: p.x - .45, y: p.y + .66 }, { x: p.x + .5, y: p.y + .64 }, { x: p.x - 1.05, y: p.y + .2 }, { x: p.x + 1.1, y: p.y + .18 }], px, py), pri: .3 });
  }
  return out;
}
function gardenTidePoolRun(spot) {
  const t = spot.tide, T = gardenTideNow();
  if (t.kind === 'stone') {
    const st = gardenTideStones().find(s => s.k === t.k); if (!st) return false;
    return _gtcDo('lift', spot, () => _gtqReveal(st, t.w), .55);
  }
  if (t.kind === 'pool') {
    const p = gardenTidePools().find(q => q.id === t.id); if (!p) return false;
    return _gtcDo('peer', spot, () => setTimeout(() => _gtqPeek(p, T.w), 900), .9);
  }
  return false;
}
/** The stone tips back: what was under it runs for it (or a line), and friends see the stone tip on their screen. */
function _gtqReveal(st, w) {
  if (_gtqLifted(w, st.k)) return;
  _gtqSetLifted(w, st.k); _wdSave(); GardenTideStoneSprites.maskW = null;
  const id = gardenTideUnder(st, w);
  _gtq.peek.set(st.k, { t: performance.now(), lift: true, id, w });
  try { if (typeof gardenLiveFx === 'function') gardenLiveFx('tide', 'lift', { n: st.k % 1000, i: id || 'none', x: Math.max(0, Math.min(GARDEN_WORLD.cols - 1, Math.floor(st.x))), y: Math.max(0, Math.min(GARDEN_WORLD.rows - 1, Math.floor(st.y))) }); } catch (e) { /* alone */ }
  if (!id) { const r = gardenRand(gardenHash('tide-none|' + w + '|' + st.k)); try { gardenMessage(GT_POOL_NONE[Math.floor(r() * GT_POOL_NONE.length)], { icon: 'waves', ms: 4200 }); } catch (e) { /* fine */ } return; }
  _gtqQuick(st, id);
}
/** "Quick, scoop it up!": E, Space or a click within a moment. */
function _gtqQuick(st, id) {
  _gtqQuickEnd();
  const box = typeof _gw !== 'undefined' && _gw.box; if (!box) return;
  const el = document.createElement('button'); el.type = 'button'; el.className = 'ga-prompt gt-quick'; el.innerHTML = '<kbd>E</kbd><span>Quick, scoop it up!</span>'; el.setAttribute('aria-label', 'Quick, scoop it up! (E)');
  box.appendChild(el);
  // (while it shows, it is the only prompt: the usual one and its chooser stand aside)
  if (!document.getElementById('gt-quick-css')) { const css = document.createElement('style'); css.id = 'gt-quick-css'; css.textContent = '.gt-quick-on .ga-prompt:not(.gt-quick),.gt-quick-on .ga-choose{visibility:hidden}.gt-quick{z-index:7}'; document.head.appendChild(css); }
  box.classList.add('gt-quick-on');
  const place = () => { const s = typeof _ghProject === 'function' ? _ghProject(_gw.px, _gw.py - 2.3) : null; if (s) el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%)`; };
  place();
  const motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(), ms = motion ? 1500 : 2600, Q = _gtq.quick = { el, st, id, done: false };
  Q.critter = _gtqCritter(st, id, ms, motion);
  const win = (ev) => { if (Q.done) return; if (ev && ev.type === 'keydown' && !(ev.key === 'e' || ev.key === 'E' || ev.key === ' ')) return; if (ev) { ev.preventDefault(); ev.stopPropagation(); } Q.done = true; Q.caught = true; _gtqQuickEnd(); _gtqCatch(st, id); };
  el.addEventListener('click', win); el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  document.addEventListener('keydown', win, true);
  Q.off = () => document.removeEventListener('keydown', win, true);
  Q.timer = setTimeout(() => { if (Q.done) return; Q.done = true; _gtqQuickEnd(); const d = gardenFishDef(id); try { gardenMessage((d ? 'The ' + d.name.toLowerCase() : 'It') + ' was too quick for you, and scuttled off under the weed.', { icon: 'waves', ms: 4000 }); } catch (e) { /* fine */ } }, ms);
  Q.iv = setInterval(place, 120);
}
function _gtqQuickEnd() { const Q = _gtq.quick; if (!Q) return; _gtq.quick = null; if (Q.el && Q.el.parentNode) Q.el.parentNode.classList.remove('gt-quick-on'); clearTimeout(Q.timer); clearInterval(Q.iv); if (Q.off) Q.off(); if (Q.el) Q.el.remove(); if (Q.critter) { const c = Q.critter; setTimeout(() => c.remove(), Q.done && !Q.caught ? 700 : 0); } }
/** The creature itself, out from under the stone and making for the pool (its own Field Journal picture, small, on the ground). */
function _gtqCritter(st, id, ms, motion) {
  const box = typeof _gw !== 'undefined' && _gw.box; if (!box || typeof gardenCatchSvg !== 'function' || typeof _ghProject !== 'function') return null;
  const s = _ghProject(st.x, st.y), to = _ghProject(st.pool.x, st.pool.y); if (!s || !to) return null;
  const el = document.createElement('div'); el.className = 'gt-critter'; el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:5;filter:drop-shadow(0 2px 1px rgba(40,30,20,.35))';
  let art = ''; try { art = gardenCatchSvg('fish', id, 30, { uid: 'gtq' + id }); } catch (e) { art = ''; }
  el.innerHTML = art; box.appendChild(el);
  const dx = (to.x - s.x) * .7, dy = (to.y - s.y) * .7, at = (k) => 'translate(' + Math.round(s.x + dx * k - 15) + 'px, ' + Math.round(s.y + dy * k - 22) + 'px)';
  el.style.transform = at(0);
  if (motion && el.animate) el.animate([{ transform: at(0) }, { transform: at(.35), offset: .3 }, { transform: at(.5), offset: .55 }, { transform: at(1) }], { duration: ms + 600, easing: 'ease-in', fill: 'forwards' });
  return el;
}
function _gtqCatch(st, id) {
  const d = gardenFishDef(id); if (!d) return;
  const r = gardenRand(gardenHash('tide-cm|' + st.k + '|' + Date.now())), cm = d.cm ? Math.round(d.cm[0] + (d.cm[1] - d.cm[0]) * r() * r()) : 0;   // clock-ok: luck
  const res = gardenCatchFish({ def: d, cm }, { perfect: true });
  if (!res || !res.ok) return;
  try { gardenCatchMoment('fish', d.id, { cm: res.cm, q: res.q, isNew: res.isNew, record: res.record, v: res.v }); } catch (e) { /* only a picture */ }
  _gdEmit('tide', { pool: d.id, isNew: res.isNew });
}
/** Kneeling at the pool: a line about what you see; now and then a shell (one a pool a low water). */
function _gtqPeek(p, w) {
  const cur = typeof _ga !== 'undefined' ? _ga.cur : null; if (!cur || !cur.doing || cur.id !== 'peer') return;
  const r = gardenRand(gardenHash('tide-peek|' + gardenTideSeed() + '|' + w + '|' + p.id + '|' + Math.floor(performance.now() / 6000)));
  try { gardenMessage(GT_POOL_PEEK[Math.floor(r() * GT_POOL_PEEK.length)], { icon: 'eye', ms: 4200 }); } catch (e) { /* fine */ }
  const key = (_gtqVisit() ? 'tdqv.' + _gtcFriendTag() + '.' : 'tdq.') + w + '.' + p.n, g = _gdG();
  if (!g.led[key] && gardenRand(gardenHash('tide-peekfind|' + gardenTideSeed() + '|' + w + '|' + p.id))() < .4) {
    const find = gardenTideFindPick(2, gardenRand(gardenHash('tide-pf|' + w + '|' + p.id)), 0, false);
    setTimeout(() => { try { gardenTideTake({ i: p.n, find, x: p.x, y: p.y }, w, key); } catch (e) { /* fine */ } }, 1800);
  }
}

/* ---------- the stones, drawn: small sprites by the pools that wobble at low water ---------- */
function _gtqAtlas(scene) {
  if (_gtq.atlas && scene.textures.exists('gt-stones')) return true;
  const tex = scene.textures.exists('gt-stones') ? scene.textures.get('gt-stones') : scene.textures.createCanvas('gt-stones', 192, 48); if (!tex) return false;
  const cx = tex.context, P = GT_ROCK;
  for (let i = 0; i < 4; i++) {
    const x0 = i * 48, r = gardenRand(77 + i * 31), w = 15 + r() * 5, h = 9 + r() * 3, x = x0 + 24, y = 30;
    if (!tex.has('s' + i)) tex.add('s' + i, 0, x0, 0, 48, 48);
    const g = cx.createRadialGradient(x + 2, y + 5, 1, x + 2, y + 5, w); g.addColorStop(0, 'rgba(46,40,30,0.42)'); g.addColorStop(1, 'rgba(46,40,30,0)'); cx.fillStyle = g; cx.beginPath(); cx.ellipse(x + 2, y + 5, w, h * .55, 0, 0, Math.PI * 2); cx.fill();
    const blob = (bx, by, rx, ry, col) => { cx.fillStyle = col; cx.beginPath(); for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI * 2, q = 1 + (r() - .5) * .22; const px = bx + Math.cos(a) * rx * q, py = by + Math.sin(a) * ry * q; if (k) cx.lineTo(px, py); else cx.moveTo(px, py); } cx.closePath(); cx.fill(); };
    blob(x, y, w * .5, h * .5, P.rockLo); blob(x - 2, y - 2, w * .4, h * .36, P.rock); blob(x - 4, y - 3.4, w * .2, h * .16, P.rockHi);
    cx.fillStyle = '#4f6a34'; for (let k = 0; k < 4; k++) { cx.beginPath(); cx.ellipse(x - w * .3 + k * w * .2, y + h * .38, 2.4, 1, 0, 0, Math.PI * 2); cx.fill(); }
  }
  tex.refresh(); _gtq.atlas = true; return true;
}
const GardenTideStoneSprites = {
  id: 'stones',
  paint(scene, root) { this.scene = scene; this.root = root; this.listT = 0; this.list = []; },
  clear() { for (const im of _gtq.imgs) { try { im.destroy(); } catch (e) { /* gone */ } } _gtq.imgs = []; this.scene = null; },
  tick(time, view, T, vis) {
    const scene = this.scene; if (!scene || !_gtqAtlas(scene)) return;
    const W = GARDEN_WORLD;
    if (time - this.listT > 600) {
      this.listT = time; const m = 100, list = [];
      if (vis && T.level < .5) for (const st of gardenTideStones()) { const x = st.x * W.cellW, y = W.sky + st.y * W.cellH; if (x < view.x - m || x > view.x + view.w + m || y < view.y - m || y > view.y + view.h + m) continue; if (!_gtqExposed(st.pool, T)) continue; list.push(st); if (list.length >= 16) break; }
      this.list = list;
      while (_gtq.imgs.length < list.length) { const im = scene.add.image(0, 0, 'gt-stones', 's0').setDepth(-9345.18).setOrigin(.5, .66); this.root.add(im); _gtq.imgs.push(im); if (this.root.sort) this.root.sort('depth'); }   // (a stone you could lift, about a third of your height)
      _gtq.imgs.forEach((im, k) => { const st = list[k]; im.setVisible(!!st); if (st) { im.setFrame('s' + (st.k % 4)).setPosition(st.x * W.cellW, W.sky + st.y * W.cellH).setScale(1); im._st = st; } else im._st = null; });
    }
    const t = time / 1000, motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(), rev = typeof _gd !== 'undefined' ? _gd.rev : 0;
    if (this.maskW !== T.w || this.maskRev !== rev) { this.maskW = T.w; this.maskRev = rev; this.mask = Number(_gdG().wd[_gtqMaskKey(T.w)]) || 0; }   // (once when it changes, not every frame)
    for (const im of _gtq.imgs) {
      const st = im._st; if (!st) continue;
      const lifted = !!(this.mask & (1 << (st.k % 31))), peek = _gtq.peek.get(st.k), baseY = W.sky + st.y * W.cellH;
      if (peek && peek.w !== T.w) _gtq.peek.delete(st.k);
      else if (peek && (peek.lift || performance.now() - peek.t < 2600)) {
        // tipped back: on its edge beside the hollow it lay in (yours stays so; a friend's settles back after a moment)
        const k = Math.min(1, (performance.now() - peek.t) / 450); im.setRotation(-.9 * k).setY(baseY - 3 * k).setX(st.x * W.cellW + 6 * k);
        continue;
      }
      else if (peek) _gtq.peek.delete(st.k);
      if (lifted) { im.setRotation(-.9).setY(baseY - 3).setX(st.x * W.cellW + 6); continue; }
      // a wobble now and then: something under it
      const u = ((t + st.ph * 5) % 3.2) / 3.2, a = motion && u < .2 ? Math.sin(u / .2 * Math.PI * 5) * .12 * Math.sin(u / .2 * Math.PI) : 0;
      im.setRotation(a).setY(baseY).setX(st.x * W.cellW);
    }
  },
};
if (window.GardenPaintTide) GardenPaintTide.parts.push(GardenTideStoneSprites);
GT_ROW_SOURCES.push((px, py, T) => gardenTidePoolRows(px, py, T));
GT_RUN.pool = GT_RUN.stone = (spot) => gardenTidePoolRun(spot);
/** A friend lifted a stone: yours tips on your screen for a moment and settles back (you can still lift your own). */
function gardenTideStoneSeen(k) { if (!_gtq.peek.has(k)) _gtq.peek.set(k, { t: performance.now(), lift: false, w: gardenTideNow().w }); }
