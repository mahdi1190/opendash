/* ============================================================
   PLAYING TOGETHER, what both sides share (docs/dev/GARDEN_TOGETHER.md).
   The people in a garden (an "actor": who, where they are going, how they look), a speech bubble, an emote, a little float over the
   garden, the "Planted by" tip, and the talk with this computer's server (lib/friends/live.mjs). A visit is 94-garden-live-2visit.js,
   hosting is 94-garden-live-3host.js. Every name goes on the page with textContent; looks go through the avatar kit and petSanitize.

     gardenLiveOnEvent(d)           /api/events 'garden' {type: 'live', ev} (94-garden-social-1core.js passes it on)
     gardenLiveLoad(force)          GET /api/garden-live: levels, posts waiting, what the server sees
     gardenLiveLook()               how you look, for friends: allow-listed ids
   ============================================================ */
const _gll = {
  role: '', view: null, viewAt: 0, loading: null,
  actors: new Map(),   // slot -> actor. On a visit you are one of them (me: true). The host is slot 0.
  by: new Map(),       // 'p|x|y' or 'd|x|y' -> who placed it (a name; a visit only: the host's page reads its own garden)
  tipEl: null,
};
const _GL_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const GL_ACT_SPEED = 215, GL_ACT_SCALE = 0.74, GL_PET_H = 26;   // a pet comes up to the knee
const _GLL_TAB = Math.floor(Math.random() * 2176782336).toString(36) + Math.floor(Math.random() * 2176782336).toString(36);   // this tab, to the server: one tab hosts
function _gllNewId() { return Math.floor(Date.now()).toString(36).slice(-7) + Math.floor(Math.random() * 2176782336).toString(36);  /* clock-ok: only unique */ }
function _gllApi(path, body) { return _gscApi(path, body); }
function _gllEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function _gllSvgEl(tag, cls) { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); if (cls) e.setAttribute('class', cls); return e; }
function _gllToday() { return typeof _gdToday === 'function' ? _gdToday() : new Date().toISOString().slice(0, 10); }  // clock-ok: fallback
function _gllReduced() { return typeof gardenMotionOn === 'function' ? !gardenMotionOn() : false; }

/* ---------- how you look (ids only; the other side draws them through its own kit) ---------- */
function gardenLiveLook() {
  const out = {};
  try { if (typeof profileGet === 'function') { const p = profileGet(), w = typeof profileWire === 'function' ? profileWire(p, {}) : null; const a = (w && w.avatar) || p.avatar; if (a && typeof a === 'object') out.a = a; } } catch (e) { /* the default figure */ }
  try { if (typeof petGet === 'function' && typeof petWire === 'function') { const p = petGet(); if (p && p.species && p.walks !== false) { const w = petWire(p); if (w && w.species) out.pet = w; } } } catch (e) { /* no pet today */ }
  return out;
}
function _gllMyName() { try { if (typeof profileGet === 'function') { const n = String(profileGet().name || '').split(/\s+/)[0]; if (n) return n.slice(0, 40); } } catch (e) { /* below */ } try { const m = window.Friends && Friends.me && Friends.me(); if (m && m.name) return String(m.name).slice(0, 40); } catch (e) { /* below */ } return 'Host'; }

/* ---------- an actor: a person in the garden ---------- */
function _gllActor(o) {
  const A = { w: o.w, n: String(o.n || 'A friend').slice(0, 40), a: o.a || null, pet: o.pet || null, lv: o.lv || 'look', x: Number.isFinite(o.x) ? o.x : 9.5 + (Number(o.w) || 0) * 0.9, y: Number.isFinite(o.y) ? o.y : 9.5, tx: null, ty: null, then: null, face: 1, dir: 's', moving: false, pose: '', poseUntil: 0, me: !!o.me, key: '', root: null, inner: null, petNode: null, petX: 0, petY: 0, sit: false };
  A.petX = A.x - 1.1; A.petY = A.y + 0.2;
  return A;
}
/** Fill a node with this person: the shadow, the figure, their name. The name goes in with textContent. */
function _gllDress(A, root) {
  while (root.firstChild) root.removeChild(root.firstChild);
  root.classList.add('gll-actor');
  if (A.me) root.classList.add('is-me');
  const sh = _gllSvgEl('ellipse', 'gll-shadow'); sh.setAttribute('cx', '0'); sh.setAttribute('cy', '1'); sh.setAttribute('rx', '12'); sh.setAttribute('ry', '3.4');
  root.appendChild(sh);
  const bob = _gllSvgEl('g', 'gll-bob'), inner = _gllSvgEl('g', 'gll-in');
  bob.appendChild(inner); root.appendChild(bob);
  const tag = _gllSvgEl('text', 'gll-name'); tag.setAttribute('y', '-64'); tag.setAttribute('text-anchor', 'middle'); tag.textContent = A.me ? 'You' : A.n;
  root.appendChild(tag);
  A.root = root; A.inner = inner; A.bob = bob; A.key = '';
  _gllPaint(A);
}
function _gllPaint(A) {
  if (!A.inner) return;
  const motion = !_gllReduced(), now = Date.now();   // clock-ok: how long a pose lasts
  if (A.pose && now > A.poseUntil) A.pose = '';
  const pose = A.moving && motion ? 'walk' : A.pose || 'idle', dir = A.dir;
  const key = pose + dir + (motion ? 'm' : '');
  if (A.key !== key) {
    let s = '';
    try { s = typeof gartPlayerSvg === 'function' ? gartPlayerSvg(A.a, { dir, pose, motion }) : ''; } catch (e) { s = ''; }
    if (!s) s = '<ellipse cx="0" cy="0.6" rx="11" ry="1.8" fill="#000000" opacity="0.14"/><rect x="-6" y="-40" width="12" height="26" rx="5" fill="#5a8a5a"/><circle cx="0" cy="-48" r="8" fill="#e8b890"/><rect x="-5" y="-14" width="4" height="14" rx="2" fill="#4a5a7a"/><rect x="1" y="-14" width="4" height="14" rx="2" fill="#4a5a7a"/>';
    A.inner.innerHTML = s;   // allow-listed ids through the avatar kit (profileAvatarNormalize), or the fixed figure above
    A.key = key;
  }
  A.inner.setAttribute('transform', `scale(${dir === 'e' && A.face < 0 ? -GL_ACT_SCALE : GL_ACT_SCALE} ${GL_ACT_SCALE})`);
}
function _gllPose(A, pose, ms) { A.pose = pose; A.poseUntil = Date.now() + (ms || 900); A.key = ''; _gllPaint(A); setTimeout(() => { if (A.inner) _gllPaint(A); }, (ms || 900) + 30); }  // clock-ok: how long a pose lasts
/** Walk there. Destinations only: the walking is worked out on each side, or the host says which way round the beds (_gllWalkVia). */
function _gllWalkTo(A, x, y, then) { A.tx = x; A.ty = y; A.gx = x; A.gy = y; A.way = null; A.then = then || null; if (A.sit) { A.sit = false; _gllEmoteStop(A); } }
/** The same with the turns on the way: [[x, y], ...], then there. What they were going to do on arrival still happens. */
function _gllWalkVia(A, turns, x, y) { const then = A.then; _gllWalkTo(A, x, y, then); const way = (turns || []).map(p => [p[0], p[1]]).concat([[x, y]]); const n = way.shift(); A.tx = n[0]; A.ty = n[1]; A.way = way; }
/** One step along the way, by time. True while moving. */
function _gllStep(A, dt) {
  const W = GARDEN_WORLD;
  let moving = false;
  if (A.tx != null) {
    const dx = (A.tx - A.x) * W.cellW, dy = (A.ty - A.y) * W.cellH, d = Math.hypot(dx, dy);
    const step = (d > 170 ? GL_ACT_SPEED * 1.35 : GL_ACT_SPEED) * dt;
    if (d <= Math.max(step, 1.5)) {
      A.x = A.tx; A.y = A.ty;
      if (A.way && A.way.length) { const n = A.way.shift(); A.tx = n[0]; A.ty = n[1]; moving = true; }
      else {
        A.tx = null; A.ty = null; A.way = null;
        const th = A.then; A.then = null;
        if (th) { try { th(); } catch (e) { console.error('[garden-live]', e); } }
      }
    } else {
      A.x += dx / d * step / W.cellW; A.y += dy / d * step / W.cellH; moving = true;
      const dir = Math.abs(dx) >= Math.abs(dy) * 0.8 ? 'e' : dy > 0 ? 's' : 'n';
      if (Math.abs(dx) > 1) A.face = dx > 0 ? 1 : -1;
      if (dir !== A.dir) { A.dir = dir; A.key = ''; }
    }
  }
  if (moving !== A.moving) { A.moving = moving; A.key = ''; }
  if (A.bob) { const bt = moving && !_gllReduced() ? `translate(0 ${(-Math.abs(Math.sin(Date.now() / 90)) * 1.6).toFixed(2)})` : ''; if (A.bobT !== bt) { A.bobT = bt; A.bob.setAttribute('transform', bt); } }  // clock-ok: a little bob
  if (!A.key) _gllPaint(A);
  return moving;
}
/** The pet at their heel: it keeps a cell and a bit behind. */
function _gllPetStep(A, dt, svg) {
  if (!A.pet || !svg) { if (A.petNode) { A.petNode.remove(); A.petNode = null; } return; }
  const W = GARDEN_WORLD;
  if (!A.petNode || !A.petNode.isConnected) {
    let p = null;
    try { p = typeof petSanitize === 'function' ? petSanitize(A.pet) : null; } catch (e) { p = null; }
    if (!p || typeof petSvgGroup !== 'function') { A.pet = null; return; }
    const g = _gllSvgEl('g', 'gll-pet'); g.setAttribute('data-live', '1');
    A.petNode = g; A.petLook = p; A.petPose = '';
  }
  const dx = (A.x - A.petX) * W.cellW, dy = (A.y - A.petY) * W.cellH, d = Math.hypot(dx, dy);
  const pose = d > 60 ? 'walk' : 'sit';
  if (A.petPose !== pose) { A.petPose = pose; try { A.petNode.innerHTML = petSvgGroup(A.petLook, { h: GL_PET_H, pose, cls: _gllReduced() ? '' : 'pt-live' }); } catch (e) { /* no pet today */ } }   // petSanitize: known ids only, drawn from the kit
  if (d > 60) { const sp = Math.min(A.moving ? 260 : 170, d - 50) * dt; A.petX += dx / d * sp / W.cellW; A.petY += dy / d * sp / W.cellH; }
  const tf = `translate(${(A.petX * W.cellW).toFixed(1)} ${(W.sky + A.petY * W.cellH).toFixed(1)}) ${dx < 0 ? 'scale(-1 1)' : ''}`;
  if (A.petT !== tf) { A.petT = tf; A.petNode.setAttribute('transform', tf); }
  const z = Math.floor(A.petY * 3);
  if (A.petZ !== z || !A.petNode.parentNode) { A.petZ = z; A.petNode.setAttribute('data-z', A.petY.toFixed(2)); _gllPlace(svg, A.petNode, A.petY); }
}
/** Put a node in the row it stands in, among the plants, so what is in front of it hides it. */
function _gllPlace(svg, node, z) {
  const layer = svg && svg.querySelector('.gd-objects'); if (!layer) return;
  let ref = null;
  for (const el of layer.children) { if (el === node) continue; const ez = Number(el.getAttribute('data-z')); if (Number.isFinite(ez) && ez > z) { ref = el; break; } }
  if (node.parentNode === layer && node.nextSibling === ref) return;
  layer.insertBefore(node, ref);
}
/* ---------- what people do ---------- */
function _gllEmote(A, id) {
  if (!A.root || typeof GART_EMOTES === 'undefined') return false;
  const row = GART_EMOTES[id]; if (!row) return false;
  _gllEmoteStop(A);
  A.dir = 's'; A.pose = ''; A.key = ''; _gllPaint(A);
  const node = A.root.querySelector('.gpl'); if (!node) return false;
  let comp = _peCache.get(id); if (!comp) { comp = _peCompile(row); _peCache.set(id, comp); }
  const motion = !_gllReduced(), anims = [];
  for (const [part, frames] of comp) for (const el of node.querySelectorAll(_PE_SEL[part])) {
    try { const a = el.animate(frames, { duration: row.ms, fill: row.hold ? 'forwards' : 'none', easing: 'linear' }); if (!motion) { a.pause(); a.currentTime = row.ms * (row.hold ? 1 : 0.5); } anims.push(a); } catch (e) { /* an old browser stands still */ }
  }
  A.anims = anims; A.sit = !!row.hold;
  if (!row.hold) A.animT = setTimeout(() => _gllEmoteStop(A), motion ? row.ms : 1200);
  return true;
}
function _gllEmoteStop(A) { clearTimeout(A.animT); for (const a of A.anims || []) { try { a.cancel(); } catch (e) { /* gone */ } } A.anims = null; }
/** A speech bubble over someone. Phrases come from the table on this side. */
function _gllSay(A, id) {
  const row = GL_PHRASES.find(p => p.id === id); if (!row || !A.root) return;
  const old = A.root.querySelector(':scope > .gll-say'); if (old) old.remove();
  const g = _gllSvgEl('g', 'gll-say'); g.setAttribute('transform', 'translate(0 -74)');
  const w = row.t.length * 5.4 + 14;
  const r = _gllSvgEl('rect', 'gll-say-b'); r.setAttribute('x', String(-w / 2)); r.setAttribute('y', '-19'); r.setAttribute('width', String(w)); r.setAttribute('height', '17'); r.setAttribute('rx', '8');
  const tail = _gllSvgEl('path', 'gll-say-b'); tail.setAttribute('d', 'M-4 -3 L0 3 L4 -3Z');
  const t = _gllSvgEl('text', 'gll-say-t'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('y', '-7'); t.textContent = row.t;
  g.append(r, tail, t);
  A.root.appendChild(g);
  clearTimeout(A.sayT); A.sayT = setTimeout(() => g.remove(), 3600);
}
/** A little float over a cell: what happened, and who. */
function _gllFloat(svg, x, y, emoji, who) {
  const fx = svg && svg.querySelector('.gd-actors'); if (!fx || _gllReduced()) return;
  const W = GARDEN_WORLD, g = _gllSvgEl('g', 'gll-float');
  g.setAttribute('transform', `translate(${((x + 0.5) * W.cellW).toFixed(1)} ${(W.sky + y * W.cellH - 8).toFixed(1)})`);
  const inner = _gllSvgEl('g', 'gll-float-in');
  const t = _gllSvgEl('text', 'gll-float-t'); t.setAttribute('text-anchor', 'middle'); t.textContent = (emoji ? emoji + ' ' : '') + (who || '');
  inner.appendChild(t); g.appendChild(inner); fx.appendChild(g);
  setTimeout(() => g.remove(), 1900);
}
const _GL_EMOJI = Object.freeze({ plant: '🌱', water: '💧', weed: '✂️', harvest: '🧺', dig: '🪴', place: '🪑', move: '↔️', take: '📦', give: '🎁', drop: '🎁', pick: '🎁', catch: '🦋' });
const _GL_POSE = Object.freeze({ plant: 'dig', water: 'water', weed: 'pick', harvest: 'pick', dig: 'dig', place: 'pick', move: 'pick', take: 'pick', give: 'pick', drop: 'pick', pick: 'pick', catch: 'pick' });

/* ---------- "Planted by Taylor": a small tip that follows the pointer ---------- */
function _gllTip(box, text, ev) {
  let el = _gll.tipEl;
  if (!text) { if (el) el.hidden = true; return; }
  if (!el || !el.isConnected) { el = document.createElement('div'); el.className = 'gll-by'; document.body.appendChild(el); _gll.tipEl = el; }
  el.textContent = text; el.hidden = false;
  el.style.left = Math.round(ev.clientX + 14) + 'px'; el.style.top = Math.round(ev.clientY + 14) + 'px';
}
function _gllByLine(kind, name) { return name ? (kind === 'p' ? `Planted by ${name}` : `Placed by ${name}`) : ''; }

/** A popover over the pointer needs something to hang from. */
function _gllAnchorAt(ev) {
  let a = document.getElementById('gll-anchor');
  if (!a) { a = document.createElement('span'); a.id = 'gll-anchor'; a.setAttribute('aria-hidden', 'true'); a.style.position = 'fixed'; a.style.width = '1px'; a.style.height = '1px'; a.style.pointerEvents = 'none'; document.body.appendChild(a); }
  a.style.left = Math.round(ev.clientX) + 'px'; a.style.top = Math.round(ev.clientY) + 'px';
  return a;
}
/* ---------- what the server knows ---------- */
function gardenLiveLoad(force) {
  if (_gll.loading) return _gll.loading;
  if (!force && _gll.view && Date.now() - _gll.viewAt < 15000) return Promise.resolve(_gll.view);   // clock-ok: a cache age
  _gll.loading = _gllApi('/api/garden-live').then((d) => { _gll.view = d; _gll.viewAt = Date.now(); _gllApplyPosts(); return d; }).finally(() => { _gll.loading = null; });   // clock-ok: a cache age
  return _gll.loading;
}
/* ---------- things posted to you: a crop, something handed back ---------- */
function _gllApplyPosts() {
  const d = _gll.view; if (!d || !Array.isArray(d.posts) || !d.posts.length) return;
  if (typeof gardenReady !== 'function' || !gardenReady() || !state.garden || !state.garden.since) { setTimeout(_gllApplyPosts, 5000); return; }
  const g = _gdG(), today = _gllToday(), done = [];
  let changed = false;
  for (const p of d.posts) {
    if (!p || !_GL_ID_RE.test(String(p.id || ''))) continue;
    const key = 'gl.p.' + p.id;
    if (g.led[key]) { done.push(p.id); continue; }
    const debit = p.i ? g.led['gl.o.' + p.i] : null;
    const theirs = debit && debit.to === p.f;
    if (p.why === 'back') {
      if (theirs) { delete g.led['gl.o.' + p.i]; if (g.gv[p.i]) delete g.gv[p.i]; changed = true; }
      g.led[key] = { d: today, k: 'gl', n: 0 }; done.push(p.id); changed = true;
      continue;
    }
    if (p.why === 'crop') {
      // only for a plant you really planted there, and no more than that plant could have made by now
      const items = {};
      const mine = p.i ? g.gv[p.i] : null;   // a record of what you planted there: a crop for anything else is refused
      const planted = mine && mine.f === p.f ? gardenPlant(mine.p) : null;
      // (a quarter of the regrow time at the fastest: water, the season and friends' help all speed it up)
      const picks = planted && planted.yield ? (planted.yield.regrow > 0 ? 1 + Math.floor(Math.max(0, _gscNow() - (mine.at || 0)) / (planted.yield.regrow * 900000)) : 1) : 0;
      if (planted) for (const [item, n] of p.items || []) {
        if (!glPostItemOk(item)) continue;
        const m = /^crop:(.+)$/.exec(item);
        if (m) {
          const per = planted.yield ? (planted.yield.n[1] + 1) * 2 : 0;
          if (mine.p !== m[1] || n > per || (mine.got || 0) + n > picks * per) continue;
          mine.got = (mine.got || 0) + n;
        } else {
          if (n > 1 || (mine.sd || 0) + n > picks) continue;
          mine.sd = (mine.sd || 0) + n;
        }
        items[item] = (items[item] || 0) + n;
      }
      g.led[key] = { d: today, k: 'gl', i: items, n: 0 }; done.push(p.id); changed = true;
      const first = Object.entries(items)[0];
      if (first && typeof toast === 'function') { const m = /^crop:(.+)$/.exec(first[0]), def = m ? gardenPlant(m[1]) : null; toast(`From ${_gscFirst(p.f)}: ${first[1]} ${def ? def.name.toLowerCase() : 'things'} in your basket.`, { icon: 'shopping-basket', kind: 'ok', timeout: 5000 }); }
    }
  }
  if (changed) _gscSaveGarden();
  if (done.length) { d.posts = d.posts.filter(p => !done.includes(p.id)); _gllApi('/api/garden-live/applied', { ids: done }).catch(() => {}); }
}
/** What you spent long ago and never heard about (the garden was never open again): back in your bag after a week. */
function _gllRefundOld() {
  if (typeof gardenReady !== 'function' || !gardenReady() || !state.garden || !state.garden.since) return;
  const g = _gdG(); let changed = false;
  const cut = _gdAddDays(_gllToday(), -7);
  for (const [k, e] of Object.entries(g.led)) if (k.startsWith('gl.o.') && e && !e.ok && e.d < cut) { delete g.led[k]; changed = true; }
  if (changed) _gscSaveGarden();
}
/* ---------- /api/events ---------- */
function gardenLiveOnEvent(d) {
  const ev = d && d.ev;
  if (!ev || typeof ev !== 'object') return;
  if (ev.k === 'post') { gardenLiveLoad(true).catch(() => {}); return; }
  if (_gll.role === 'visit' && typeof _glvEvent === 'function') { try { _glvEvent(ev); } catch (e) { console.error('[garden-live]', e); } }
  else if (_gll.role === 'host' && typeof _glhEvent === 'function') { try { _glhEvent(ev); } catch (e) { console.error('[garden-live]', e); } }
}
setTimeout(function _gllBoot() {
  if (typeof _gscServer === 'function' && !_gscServer()) { setTimeout(_gllBoot, 30000); return; }
  // (what the assistant picked or put away while no page was open is posted now)
  Promise.resolve(window.Friends && Friends.ready).then(() => { if (_gscFriendList().length) return gardenLiveLoad(true).then(() => { _gllRefundOld(); if (typeof _glhFlushPosts === 'function' && typeof gardenReady === 'function' && gardenReady()) _glhFlushPosts(); }); return null; }).catch(() => {});
}, 8000);
