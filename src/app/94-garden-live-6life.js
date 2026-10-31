/* ============================================================
   ONE LIVING GARDEN (2.28.0, docs/dev/GARDEN_TOGETHER.md section 12). The owner, 31 Oct 2026: "I want to see a bird that my friend's pet reacts to, and vice versa."
   In a live visit THE HOST OWNS the garden's life. Their engine (94-garden-life-*.js) spawns the creatures, moves them and decides what they do; this file tells everyone there:
     gl:cr   the whole list of creatures about, about every 0.7 s while one moves (never per frame): {u, e (kind), x, y (tenths of a cell), h (height), f (facing), k (the clip it is in)}.
             The list is complete each time, so a lost message costs nothing and a creature that is no longer listed has gone. Guests draw them (a ghost: the same art, clips and markup,
             no brain) and ease towards each position; with Fun Off or an id this version does not know, nothing is drawn.
     fx cr   react (the host: a creature answers someone's hello), poke (a guest clicked one: to the host alone), look and greet (what the pets do)
     fx egg  fire (the host's surprise: every screen runs it from its own tables, without a reward for the guest)
     fx pick spawn / claim / take / gone: something lying about that anyone may take (a creature's gift, a fish flopping on the shore). The FIRST CLAIM THE HOST HEARS WINS, once: it says
             `take` with the winner's slot; everyone else's copy goes. The winner's own app then records the one thing the host named, within the daily caps a gift has anyway.
     fx bug  claim (a guest's swing found it) / gone (the host: it is taken, `to` is who got it) / lost (the host: someone had it first; to the claimant alone). A bug is caught only
             when the host says so: the one who lost gets a clean miss and no reward.
   What a dishonest guest can do: poke a creature, claim a pick-up or a bug, as any honest guest can; never spawn, move, take for someone else or say "gone" (refused at both ends).
   What a dishonest host can do: show creatures, offer gifts and name a winner; a guest acts only on a pick-up or a claim it saw itself, only for the kinds it knows, within its caps.
   Creatures near a walking guest, and pets that notice them (and each other), are the host's doing too: the pet kit's own clips, one at a time for each pet.
   ============================================================ */
const _glc = { ghosts: new Map(), gpicks: new Map(), picks: new Map(), sig: '', sentAt: 0, tickT: 0, scareAt: new Map(), petAt: new Map(), greetAt: new Map(), fishT: 150, pu: 0, bpend: new Map(), spr: null, gspr: null };
const _GLC_ID = /^[A-Za-z0-9_-]{1,64}$/;
const _GLC_PICK_MS = 100000;   // a pick-up lies about this long
function gardenLiveActorAt(slot) { const A = _gll.actors.get(slot); return A ? { x: A.x, y: A.y } : null; }
/** The host says something about a creature to everyone (nothing when nobody is there). */
function gardenLiveCr(e, id, o) { if (_gll.role === 'host' && _glh.on && _glhAnyone() && _GLC_ID.test(String(id))) _glhSend('all', 'fx', Object.assign({ c: 'cr', e, i: String(id) }, o || {})); }
function gardenLiveEgg(id) { if (_gll.role === 'host' && _glh.on && _glhAnyone() && _GLC_ID.test(String(id))) _glhSend('all', 'fx', { c: 'egg', e: 'fire', i: String(id) }); }
const _glcNum = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));

/* ---------- the host: who is about, and what happens to them ---------- */
function _glcHostStart() {
  if (_glc.spr || typeof gardenWorldAdd !== 'function') return;
  _glc.spr = gardenWorldAdd({ id: 'gll-life', svg: '', x: 0, y: 0, still: true, update(dt) { _glcHostTick(dt); } });
}
function _glcHostStop() {
  if (_glc.spr) { _glc.spr.remove(); _glc.spr = null; }
  for (const P of _glc.picks.values()) { try { P.S.remove(); } catch (e) { /* gone */ } }
  _glc.picks.clear(); _glc.sig = ''; _glc.bpend.clear();
}
/** A person has just come in: the creatures and what lies about, at once. */
function _glcJoin(fid) {
  _glc.sig = '';
  for (const P of _glc.picks.values()) _glhSend(fid, 'fx', { c: 'pick', e: 'spawn', i: P.id, kd: P.kind, n: P.u, x: P.x, y: P.y });
}
function _glcHostTick(dt) {
  if (!_glh.on || !_glhAnyone() || typeof _gl === 'undefined' || !_gl.W || !_gl.W.own) return;
  _glc.tickT -= dt; if (_glc.tickT > 0) return;
  _glc.tickT = 0.7;
  const now = Date.now(), cs = [];   // clock-ok: spacing
  for (const c of _gl.list) { if (c.gone || c.left || !c.S) continue; cs.push(c); if (cs.length >= 8) break; }
  const l = cs.map(c => Object.assign({ u: c.id % 100000, e: c.def.id, x: _glcNum(c.S.x * 10, 0, 700), y: _glcNum(c.S.y * 10, 0, 500), h: _glcNum(c.S.lift || 0, 0, 255), f: c.faceTo > 0 ? 1 : 0 }, c.clip && _GLC_ID.test(c.clip) ? { k: c.clip } : {}));
  const sig = JSON.stringify(l);
  if (sig !== _glc.sig || (l.length && now - _glc.sentAt > 4000)) { _glc.sig = sig; _glc.sentAt = now; _glhSend('all', 'cr', { l }); }
  _glcNotice(cs, now);
  _glc.fishT -= 0.7;
  if (_glc.fishT <= 0) { _glc.fishT = 150 + Math.random() * 100; _glcShoreFish(); }
}
/** Walking people and their pets disturb and are noticed by what is about; pets greet each other. One at a time for each creature and each pet. */
function _glcNotice(cs, now) {
  const W = _gl.W, pets = [];
  if (typeof _ptw !== 'undefined' && _ptw.on) for (const P of _ptw.pets) pets.push({ P, w: 0 });
  for (const A of _gll.actors.values()) if (A.pp) pets.push({ P: A.pp, w: A.w });
  for (const c of cs) {
    if (c.leaving || c.scared > 0 || c.reacting > 0) continue;
    for (const A of _gll.actors.values()) {
      if (!A.moving || now - (_glc.scareAt.get(c.id) || 0) < 3000) continue;
      if (Math.hypot(A.x - c.S.x, (A.y - c.S.y) * 1.4) < 1.5) { _glc.scareAt.set(c.id, now); try { _glScareOne(c, W, A.x, A.y); } catch (e) { /* only a flutter */ } gardenLiveCr('react', c.id); }
    }
    for (const { P, w } of pets) {
      const k = w + '|' + (P.look && P.look.species);
      if (P.busy > 0 || P.tx != null || P.wow || P.pose === 'sleep' || now - (_glc.petAt.get(k) || 0) < 14000) continue;
      if (Math.hypot(P.x - c.S.x, (P.y - c.S.y) * 1.4) > 3.2 || Math.random() > 0.55) continue;
      _glc.petAt.set(k, now);
      gardenLiveCr('look', c.id, { to: w });
      _gllPetNotice(P, c.S.x, c.S.y);
      setTimeout(() => { if (!c.gone && !c.left && Math.random() < 0.6) { try { _glScareOne(c, _gl.W, P.x, P.y); } catch (e) { /* a flutter */ } gardenLiveCr('react', c.id); } }, 1100);
      break;
    }
  }
  for (let i = 0; i < pets.length; i++) for (let j = i + 1; j < pets.length; j++) {
    const a = pets[i], b = pets[j], k = a.w + ':' + j + (b.w);
    if (Math.hypot(a.P.x - b.P.x, (a.P.y - b.P.y) * 1.4) > 1.9 || now - (_glc.greetAt.get(k) || 0) < 30000 || a.P.busy > 0 || b.P.busy > 0) continue;
    _glc.greetAt.set(k, now);
    gardenLiveCr('greet', a.w, { to: b.w });
    _gllPetGreet(a.P, b.P);
  }
}
/** A pet looks, creeps and pounces: the pet kit's own clips. */
function _gllPetNotice(P, x, y) {
  if (!P || P.wow || typeof P.clip !== 'function') return;
  const near = Math.hypot(x - P.x, y - P.y) > 1.6;
  const act = () => { P.dir = x >= P.x ? 1 : -1; P.sit({ eyes: 'open', mouth: 'open' }); const n = typeof petClipDef === 'function' && petClipDef('pounce') && Math.random() < 0.5 ? 'pounce' : 'look'; P.clip(n, 900, () => { P.sit(); P.busy = 1.2; }, { quiet: true }); };
  if (near && typeof P.walkTo === 'function') P.walkTo(x + (P.x < x ? -1 : 1) * 1.1, y + 0.2, true, act); else act();
}
function _gllPetGreet(a, b) {
  for (const [P, Q] of [[a, b], [b, a]]) { if (!P || P.wow) continue; P.tx = null; P.dir = Q.x >= P.x ? 1 : -1; P.sit({ eyes: 'happy', mouth: 'open' }); P.clip('wiggle', 1400, () => { if (P.hearts) P.hearts(); P.sit(); P.busy = 1; }, { quiet: true }); }
}
function _glcPetOf(slot) {
  if (slot === 0) { if (_gll.role === 'host') return typeof _ptw !== 'undefined' && _ptw.on ? (_ptw.pets.find(q => q.me) || _ptw.pets[0] || null) : null; const A = _gll.actors.get(0); return A && A.pp ? A.pp : null; }
  const A = _gll.actors.get(slot); return A && A.pp ? A.pp : null;
}
/** Somebody said something about a creature, a pet, an egg or a pick-up (the host's, or a guest's claim and poke to the host). */
function _glcFx(A, ev) {
  const e = String(ev.e || ''), host = _gll.role === 'host';
  if (ev.c === 'cr') {
    if (e === 'poke') { if (!host || !_gl.W || !_gl.W.own) return; const now = Date.now(), c = [..._gl.list].find(q => q.id % 100000 === Number(ev.i)); if (!c || c.gone || c.left || now - (_glc.scareAt.get('p' + c.id) || 0) < 1500) return; _glc.scareAt.set('p' + c.id, now); _glReact(c, ev.w); return; }   // clock-ok: spacing
    if (host) return;   // (what the host says is for guests)
    if (e === 'react') { const g = _glc.ghosts.get(Number(ev.i)); if (g) _glcGhostReact(g); }
    else if (e === 'look') { const g = _glc.ghosts.get(Number(ev.i)), P = _glcPetOf(Number(ev.to)); if (g && P && Number(ev.to) !== _glv.w) _gllPetNotice(P, g.c.S.x, g.c.S.y); }
    else if (e === 'greet') { const a = _glcPetOf(Number(ev.i)), b = _glcPetOf(Number(ev.to)); if (a && b) _gllPetGreet(a, b); }
    return;
  }
  if (ev.c === 'egg') { if (!host) _glcEggIn(String(ev.i)); return; }
  if (ev.c === 'pick') {
    if (host) { if (e === 'claim') _glcClaim(Number(ev.n), ev.w); return; }
    if (e === 'spawn') _glcPickAdd(ev); else if (e === 'take') _glcPickTake(ev); else if (e === 'gone') _glcPickDrop(Number(ev.n), false);
  }
}
/* ---------- guests: the creatures, drawn ---------- */
function _glcGuestCr(l) {
  const W = typeof _gl !== 'undefined' ? _gl.W : null;
  if (!W || !W.visit || !_glvLive() || gardenFun() === 'off' || !Array.isArray(l)) return;
  const seen = new Set(), now = Date.now();   // clock-ok: when it was last heard of
  for (const c of [..._gl.list]) if (c.id > 0) _glRemove(c);   // (anything this screen made before the host's came: the host's are the garden's)
  for (const r of l.slice(0, 8)) {
    const def = typeof GL_CREATURE !== 'undefined' ? GL_CREATURE.get(r.e) : null;
    if (!def || !_GLC_ID.test(String(r.e))) continue;
    seen.add(r.u);
    let g = _glc.ghosts.get(r.u);
    if (g && (g.W !== W || g.c.gone)) { _glc.ghosts.delete(r.u); g = null; }
    if (!g) { if (_glc.ghosts.size >= 8) continue; g = _glcGhostNew(def, r, W); _glc.ghosts.set(r.u, g); }
    g.tx = r.x / 10; g.ty = r.y / 10; g.tl = r.h; g.c.faceTo = r.f ? 1 : -1; g.at = now;
    if (r.k && r.k !== g.c.clip && !g.reactUntil) _glClip(g.c, r.k);
  }
  for (const [u, g] of _glc.ghosts) if (!seen.has(u)) g.c.fadeOut = true;
}
function _glcGhostNew(def, r, W) {
  const c = { def, art: gardenLifeArt(def), id: -r.u, seed: r.u, medium: def.habitat, fx: r.f ? 1 : -1, faceTo: r.f ? 1 : -1, bank: 0, fade: 0, sink: 0, onScreen: true, perched: null, tokens: '' };
  const g = { c, W, tx: r.x / 10, ty: r.y / 10, tl: r.h, at: Date.now(), reactUntil: 0 };   // clock-ok: when it was last heard of
  _glClip(c, r.k || 'rest');
  c.S = W.add({
    id: 'gl-cr-' + r.u, svg: _glMarkup(c), x: g.tx, y: g.ty, lift: r.h, hit: def.hit || (def.habitat === 'air' ? 0.34 : 0.5), label: def.name, cursor: 'hand', ground: false,
    update: (dt) => _glcGhostStep(g, dt),
    onClick: () => { if (_glvLive()) _glvSend('fx', { c: 'cr', e: 'poke', i: String(r.u) }); },   // the host decides what it does
  });
  return g;
}
function _glcGhostStep(g, dt) {
  const c = g.c, S = c.S; if (!S || c.gone) { _glc.ghosts.delete(-c.id); return; }
  if (Date.now() - g.at > 9000) c.fadeOut = true;   // clock-ok: the host has gone quiet
  _glBind(c);
  const k = Math.min(1, dt * 5);
  S.x += (g.tx - S.x) * k; S.y += (g.ty - S.y) * k; S.lift += (g.tl - S.lift) * k;
  if (g.reactUntil && Date.now() > g.reactUntil) { g.reactUntil = 0; _glClip(c, 'rest'); }   // clock-ok: a reaction's length
  c.onScreen = true;
  _glPaint(c, dt);
  if (c.gone) _glc.ghosts.delete(-c.id);
}
function _glcGhostReact(g) {
  const c = g.c, R = c.def.react || {};
  _glClip(c, R.clip || 'react'); g.reactUntil = Date.now() + 1600;   // clock-ok: a reaction's length
  if (R.mark && typeof _glMark === 'function') _glMark(c, R.mark);
  if (R.sound && typeof _glSound === 'function') _glSound(R.sound);
}
function _glcGuestClear() {
  for (const g of _glc.ghosts.values()) { try { g.c.S.remove(); } catch (e) { /* gone */ } }
  _glc.ghosts.clear();
  for (const P of _glc.gpicks.values()) { try { P.S.remove(); } catch (e) { /* gone */ } }
  _glc.gpicks.clear(); _glc.bpend.clear();
}
/** Once a frame in a live visit's own loop (94-garden-life-3engine.js): a surprise the host fired runs its fireworks and its whirl of leaves here too. */
function _glcVisitFrame(dt) { if (typeof _glvLive === 'function' && _glvLive() && typeof _glEggFrame === 'function' && _gl.W) { try { _glEggFrame(dt, _gl.W); } catch (e) { /* a surprise only */ } } }
/** A surprise the host fired: this screen runs it from its own tables. Nothing is earned here, and no creature is made here (the host's are drawn). */
function _glcEggIn(id) {
  const e = typeof GL_EGG !== 'undefined' ? GL_EGG.get(id) : null, W = typeof _gl !== 'undefined' ? _gl.W : null;
  if (!e || !W || !W.visit || gardenFun() === 'off' || !e.effect || e.effect.kind === 'visitor') return;
  const fn = typeof GARDEN_LIFE_EFFECTS !== 'undefined' ? GARDEN_LIFE_EFFECTS[e.effect.kind] : null; if (!fn) return;
  const cfg = Object.assign({}, e.effect); delete cfg.guests;
  if (cfg.click) cfg.click = Object.assign({}, cfg.click, { keep: undefined });
  try { fn(Object.assign({}, e, { effect: cfg }), cfg, W); } catch (err) { console.error('[garden live] egg', err); }
}
/* ---------- what lies about: the first claim wins ---------- */
function _glcPickArt(kind, id) {
  if (kind === 'keep') { const k = GL_KEEPSAKE.get(id); return k ? `<g class="gl-gift"><g class="gl-glint">${GL_MARKS.spark()}</g>${gardenKeepsakeSvg(k)}</g>` : ''; }
  const d = gardenFishDef(id); return d && d.cat === 'fish' ? `<g class="gll-flop"><g transform="translate(0 -6) scale(.3)">${gardenFishArt(id, { uid: 'pk' + id })}</g></g>` : '';
}
function _glcPickName(kind, id) { const d = kind === 'keep' ? GL_KEEPSAKE.get(id) : gardenFishDef(id); return d ? d.name : ''; }
/** A pick-up on this screen (the host's copy and every guest's): a sprite anyone may click. */
function _glcPickAdd(ev) {
  const u = Number(ev.n), id = String(ev.i), kind = ev.kd;
  if (_glc.gpicks.has(u) || _glc.gpicks.size >= 6 || !['keep', 'fish'].includes(kind) || !_GLC_ID.test(id)) return null;
  const art = _glcPickArt(kind, id); if (!art || typeof gardenWorldAdd !== 'function') return null;
  const P = { u, kind, id, claimed: false };
  P.S = gardenWorldAdd({ id: 'gll-pk-' + u, svg: art, x: ev.x + 0.5, y: ev.y + 0.9, still: true, hit: 0.7, cursor: 'hand', label: _glcPickName(kind, id), onClick() { _glcPickClick(P); } });
  _glc.gpicks.set(u, P);
  setTimeout(() => _glcPickDrop(u, false), _GLC_PICK_MS);
  return P;
}
function _glcPickClick(P) {
  if (P.claimed) return;
  if (_gll.role === 'host') { _glcClaim(P.u, 0); return; }
  if (!_glvLive()) return;
  P.claimed = true; setTimeout(() => { P.claimed = false; }, 2500);   // (not twice at once; a lost claim may be tried again)
  _glvSend('fx', { c: 'pick', e: 'claim', n: P.u });
}
function _glcPickDrop(u, pop) {
  const P = _glc.gpicks.get(u); if (!P) return;
  _glc.gpicks.delete(u);
  if (pop && typeof gardenPop === 'function' && gardenMotionOn()) gardenPop(Math.floor(P.S.x), Math.floor(P.S.y), 1, 1, 'is-grow');
  try { P.S.remove(); } catch (e) { /* gone */ }
  if (_gll.role === 'host') { const H = _glc.picks.get(u); if (H) { _glc.picks.delete(u); if (H.G) { _glGifts.delete(H.G); try { H.G.remove(); } catch (e) { /* gone */ } } _glhSend('all', 'fx', { c: 'pick', e: 'gone', n: u }); } }
}
/** The host: something of theirs lies about (the creature gift sprite, or a fish on the shore). Returns its number. */
function gardenLivePickSpawn(S, kind, id, x, y) {
  if (_gll.role !== 'host' || !_glh.on || !_glhAnyone()) return null;
  const u = (_glc.pu = (_glc.pu + 1) % 1000);
  _glc.picks.set(u, { u, G: S, kind, id, x: Math.floor(x), y: Math.floor(y) });
  S.pu = u;
  _glhSend('all', 'fx', { c: 'pick', e: 'spawn', i: id, kd: kind, n: u, x: Math.floor(x), y: Math.floor(y) });
  setTimeout(() => { if (_glc.picks.has(u)) { _glc.picks.delete(u); _glGifts.delete(S); try { S.remove(); } catch (e) { /* gone */ } _glhSend('all', 'fx', { c: 'pick', e: 'gone', n: u }); } }, _GLC_PICK_MS);
  return u;
}
/** The host's own click on a gift they dropped: through the same claim as everyone's. */
function gardenLivePickGift(S) { if (S.pu != null && _glc.picks.has(S.pu)) { _glcClaim(S.pu, 0); return true; } return false; }
/** The first claim the host hears wins; the rest find it gone. Exactly once: the pick-up leaves the list before anything is told or given. */
function _glcClaim(u, w) {
  if (_gll.role !== 'host' || !Number.isInteger(u)) return;
  const H = _glc.picks.get(u); if (!H) return;
  if (w !== 0 && !_gll.actors.has(w)) return;
  _glc.picks.delete(u);
  _glhSend('all', 'fx', { c: 'pick', e: 'take', n: u, to: w });
  if (H.G) { _glGifts.delete(H.G); try { H.G.remove(); } catch (e) { /* gone */ } }
  const P = _glc.gpicks.get(u); if (P) { _glc.gpicks.delete(u); try { P.S.remove(); } catch (e) { /* gone */ } }
  if (w === 0) _glcGive(H.kind, H.id, u);
  else { const A = _gll.actors.get(w); if (A && !_gllOffscreen(A)) _gllFloat(_gw.svg, A.x, A.y - 1.4, '🎁', A.n); }
}
/** What the winner keeps, on their own computer, within the caps a gift has anyway. */
function _glcGive(kind, id, u) {
  if (kind === 'keep') { if (GL_KEEPSAKE.has(id) && typeof gardenLifeFound === 'function') gardenLifeFound('k', id); }
  else if (kind === 'fish') { const item = id + '-0'; if (_gll.role === 'visit') _glvGot('pk' + u, 'fish', item); else if (gsocGiftOk('fish', item)) { const g = _gdG(); g.led['gl.g.pk' + u] = { d: _gllToday(), k: 'gl', i: { ['fish:' + item]: 1 }, n: 0 }; if (typeof gardenCatchReceived === 'function') gardenCatchReceived('fish', item); _gdSave(); } }
  if (typeof gameCheer === 'function') gameCheer(null, { text: '🎁', tone: 'gold' });
}
function _glcPickTake(ev) {
  const u = Number(ev.n), P = _glc.gpicks.get(u);
  if (!P) return;   // (one this screen never saw: nothing is given for it)
  const mine = ev.to === _glv.w && _gll.role === 'visit';
  _glcPickDrop(u, true);
  if (mine) _glcGive(P.kind, P.id, u);
  else { const A = _gll.actors.get(ev.to); if (A && !_gllOffscreen(A)) _gllFloat(_gw.svg, A.x, A.y - 1.4, '🎁', A.n); }
}
/** Now and then a fish flops on the shore: the host's, for everyone to see, one winner. (The host's roll: a common fish of the shallows.) */
function _glcShoreFish() {
  if (!_glh.on || !_glhAnyone() || gardenFun() === 'off' || _glc.picks.size > 1 || typeof GARDEN_FISH_ONLY === 'undefined') return;
  const m = gardenModel(), defs = GARDEN_FISH_ONLY.filter(f => f.zone.includes('shallow') && f.lv <= m.level.level && (f.rarity === 'common' || f.rarity === 'uncommon'));
  if (!defs.length) return;
  const wa = gardenArea('lake').water, f = defs[Math.floor(Math.random() * defs.length)];
  for (let i = 0; i < 24; i++) {
    const x = 2 + Math.floor(Math.random() * 12), y = Math.floor(wa.y - 1);
    if (typeof _gwFree === 'function' && !_gwFree(x + 0.5, y + 0.9)) continue;
    const spec = { n: (_glc.pu + 1) % 1000, i: f.id, kd: 'fish', x, y }, P = _glcPickAdd(spec); if (!P) return;
    gardenLivePickSpawn(P.S, 'fish', f.id, x, y);
    _glc.picks.get(_glc.pu).G = P.S;
    return;
  }
}
/* ---------- a bug is caught once: the host decides ---------- */
/** Your swing found a bug. 'ok': take it now. 'wait': a guest asks the host first. 'lost': somebody had it first. */
function gardenLiveBugClaim(b) {
  const key = String(b.key), id = key.replace('.', '-');
  if (_gw.goneKeys && _gw.goneKeys.has(key)) return 'lost';
  if (_gll.role === 'host' && _glh.on && _glhAnyone()) {
    if (!_gw.goneKeys) _gw.goneKeys = new Set();
    _gw.goneKeys.add(key);
    _glhSend('all', 'fx', { c: 'bug', e: 'gone', i: id, to: 0 });
    return 'ok';
  }
  if (_gll.role === 'visit' && _glvLive()) {
    _glc.bpend.set(key, b);
    _glvSend('fx', { c: 'bug', e: 'claim', i: id });
    setTimeout(() => { const p = _glc.bpend.get(key); if (p) { _glc.bpend.delete(key); _gwBugMissed(p); } }, 3000);   // (no answer: a clean miss, nothing given)
    return 'wait';
  }
  return 'ok';
}
function _glcBugClaim(ev) {
  if (_gll.role !== 'host') return;
  const A = _gll.actors.get(ev.w), key = String(ev.i).replace('-', '.'); if (!A) return;
  const known = !!(_gw.bugs && _gw.bugs.has(key)) && !(_gw.goneKeys && _gw.goneKeys.has(key));
  if (!known) { _glhSend(A.f, 'fx', { c: 'bug', e: 'lost', i: String(ev.i), to: ev.w }); return; }
  const bug = _gw.bugs.get(key);
  _gllBugGone(key);
  _glhSend('all', 'fx', { c: 'bug', e: 'gone', i: String(ev.i), to: ev.w });
  if (typeof gardenContestBug === 'function') gardenContestBug(ev.w, bug);   // in a bug contest the host scores who it named
  if (typeof _glgBugWon === 'function') _glgBugWon(ev.w);   // (a shared goal counts a bug the host named a winner for)
}
/** The host has said who got a bug. */
function _glcBugVerdict(ev, e) {
  const key = String(ev.i).replace('-', '.'), p = _glc.bpend.get(key);
  if (e === 'lost') { if (p && ev.to === _glv.w) { _glc.bpend.delete(key); _gwBugMissed(p); } return; }
  if (p && ev.to === _glv.w) { _glc.bpend.delete(key); _gwBugTaken(p); return; }   // yours: the host said so
  if (p) { _glc.bpend.delete(key); _gwBugMissed(p); }
  _gllBugGone(key);
}
