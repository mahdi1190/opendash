/* ============================================================
   GARDEN LIFE, the behaviour library (2.23). A creature's row lists these by name, with parameters: nothing here knows an id or a kind of animal.

     GARDEN_LIFE_BEHAVIOURS[name] = {
       reflex   true: looked at every frame and interrupts whatever is going on (want must be cheap)
       want(c, W, p)  how much it would like to do this now (0 = not now). The brain draws among what the row's behaviours want when the last one ends.
       start(c, W, p) begin; step(c, W, dt, p) a frame, returns true when done; stop(c, W, p) tidy up, however it ended
     }
   c: the creature: {def, S (the world's sprite: x, y, lift, z in cells and px), t (its age), perched (the surface it is on), medium ('air' | 'ground' | 'water'), mem (this behaviour's notes, new on each start)}.
   W: the world this garden offers (94-garden-life-3engine.js): objects, find(selectors), free, water, player(), pets(), scare and the rest.
   The moving itself is in the engine's helpers: _glFly, _glWalkTo, _glHopTo, _glSwim, _glSettle, _glTakeOff. A new behaviour is one entry here (the recipe is in docs/dev/GARDEN.md).
   ============================================================ */
function _glR(a, b) { return a + Math.random() * (b - a); }
function _glRange(v, a, b) { return Array.isArray(v) ? _glR(v[0], v[1]) : v != null ? v : _glR(a, b); }
function _glDist(ax, ay, bx, by) { return Math.hypot((ax - bx) * GARDEN_WORLD.cellW, (ay - by) * GARDEN_WORLD.cellH) / GARDEN_WORLD.cellW; }   // in cell widths, true on the screen

const GARDEN_LIFE_BEHAVIOURS = {
  /* ---------- getting about ---------- */
  'wander': {
    want(c, W) { return c.medium === 'ground' && !c.perched && !c.hidden ? 1 : 0; },
    start(c, W, p) { c.mem.pause = _glRange(p.pause, 1, 4); c.mem.t = 0; const pt = _glFreeNear(c, W, p.range || 3); c.mem.go = pt ? _glRouteTo(c, W, pt.x, pt.y) : false; _glClip(c, c.mem.go ? 'walk' : 'rest'); },
    step(c, W, dt, p) {
      if (c.mem.go && !_glFollow(c, W, dt, c.def.speed || 0.6)) return false;
      if (c.mem.go) { c.mem.go = false; _glClip(c, p.sniff && Math.random() < 0.6 ? 'sniff' : 'rest'); }
      return (c.mem.t += dt) > c.mem.pause;
    },
  },
  'fly-with-curves': {
    want(c) { return c.medium === 'air' ? (c.perched ? (c.mem0 && c.mem0.rested ? 2 : 0.2) : 1) : 0; },
    start(c, W) { _glTakeOff(c, W); const v = W.view(), m = 1.5; c.mem.x = _glR(v.x0 + m, v.x1 - m); c.mem.y = Math.max(0.5, _glR(v.y0 + m, v.y1 - m)); c.mem.tl = Math.max(8, (c.def.alt || 30) * _glR(0.7, 1.4)); c.mem.t = 0; _glClip(c, 'fly'); },
    step(c, W, dt) { c.mem.t += dt; return _glFly(c, W, dt, c.mem.x, c.mem.y, c.mem.tl, { wobble: 1 }) || c.mem.t > 12; },
  },
  'hop': {
    want(c) { return c.medium === 'ground' && !c.perched && !c.hidden ? 1.1 : 0; },
    start(c, W, p) { c.mem.n = Math.ceil(_glR(1, 4)); c.mem.wait = 0; _glClip(c, 'rest'); void p; },
    step(c, W, dt, p) {
      if (c.clip === 'hop') _glClip(c, 'rest');
      if ((c.mem.wait -= dt) > 0) return false;
      if (c.mem.n-- <= 0) return true;
      const pt = _glHopSpot(c, W, p);
      if (!pt) return true;
      _glHopTo(c, pt.x, pt.y, Math.min(0.55, 0.28 + _glDist(c.S.x, c.S.y, pt.x, pt.y) * 0.16), 8 + _glDist(c.S.x, c.S.y, pt.x, pt.y) * 6); _glClip(c, 'hop'); c.mem.wait = _glR(0.25, 1.1);
      return false;
    },
  },
  'swim': {
    want(c, W) { return c.medium === 'water' ? 2 : c.medium === 'ground' && !c.perched && W.waterNear(c.S.x, c.S.y, 2.5) ? 0.5 : 0; },
    start(c, W, p) {
      c.mem.t = 0; c.mem.dur = _glRange(p.dur, 6, 14);
      if (c.medium !== 'water') { const q = W.waterNear(c.S.x, c.S.y, 2.5); if (q) { _glHopTo(c, q.x, q.y, 0.5, 13); c.mem.diving = true; _glClip(c, 'hop'); } else c.mem.dur = 0; }
      else _glClip(c, 'swim');
    },
    step(c, W, dt, p) {
      if (c.mem.diving) { c.mem.diving = false; _glEnterWater(c, W); _glClip(c, 'swim'); return false; }
      if (c.medium !== 'water') return true;
      c.mem.t += dt;
      if (!c.mem.tx || _glDist(c.S.x, c.S.y, c.mem.tx, c.mem.ty) < 0.15) { const q = W.waterNear(c.S.x + _glR(-2.5, 2.5), c.S.y + _glR(-1.5, 1.5), 2); if (q) { c.mem.tx = q.x; c.mem.ty = q.y; } }
      if (c.mem.tx) _glSwim(c, W, dt, c.mem.tx, c.mem.ty, p.speed || 0.4);
      if (c.mem.t <= c.mem.dur) return false;
      if (c.def.habitat === 'water') return true;   // a duck stays; a frog hops out
      const s = _glShoreNear(c, W); if (!s) { c.mem.dur += 4; return false; }
      _glLeaveWater(c); _glHopTo(c, s.x, s.y, 0.45, 12); _glClip(c, 'hop'); return false;
    },
  },
  'dart': {
    want(c) { return c.medium === 'air' ? (c.perched ? (c.mem0 && c.mem0.rested ? 3 : 0.3) : 2) : 0; },
    start(c, W, p) { _glTakeOff(c, W); c.mem.t = 0; c.mem.hold = 0; c.mem.over = p.over; c.mem.n = Math.ceil(_glR(3, 8)); _glDartNext(c, W); _glClip(c, 'fly'); },
    step(c, W, dt) {
      if (c.mem.hold > 0) { c.mem.hold -= dt; _glHover(c, dt, 0.6); return false; }
      if (_glFly(c, W, dt, c.mem.x, c.mem.y, c.mem.tl, { sharp: true })) { if (c.mem.n-- <= 0) return true; c.mem.hold = _glR(0.5, 1.8); _glDartNext(c, W); }
      return false;
    },
  },
  'orbit': {
    want(c, W, p) { return c.medium === 'air' && !c.perched && _glNearestOf(c, W, p.around, 7) ? 2 : c.perched && c.mem0 && c.mem0.rested ? 2 : 0; },
    start(c, W, p) { _glTakeOff(c, W); const o = _glNearestOf(c, W, p.around, 7); c.mem.o = o; c.mem.t = 0; c.mem.a = Math.random() * 6.28; c.mem.dur = _glR(9, 26); c.mem.dir = Math.random() < 0.5 ? 1 : -1; _glClip(c, 'fly'); },
    step(c, W, dt, p) {
      const o = c.mem.o; if (!o) return true;
      c.mem.t += dt; c.mem.a += dt * c.mem.dir * (p.slow ? 0.5 : 2.1) * (1 + 0.3 * Math.sin(c.t * 2.2));
      const r = (p.r || 1) * (1 + 0.25 * Math.sin(c.t * 0.7)), top = o.top;
      const tl = p.slow ? Math.max(8, (c.def.alt || 20) + 10 * Math.sin(c.t * 0.5)) : Math.max(10, top.lift * 0.95 + 8 * Math.sin(c.t * 1.7));
      _glFly(c, W, dt, top.x + Math.cos(c.mem.a) * r, top.y + Math.sin(c.mem.a) * r * 0.55, tl, { keep: true, near: true });
      return c.mem.t > c.mem.dur;
    },
  },
  'land-on': {
    want(c, W, p) { if (c.perched || c.hidden || (c.medium === 'water' && !p.leap)) return 0; if (W.still) return 3; return _glCanLand(c, W, p) ? (p.weight == null ? 2.2 : p.weight) : 0; },
    start(c, W, p) {
      const s = _glPickSurface(c, W, p); c.mem.s = s; c.mem.t = 0;
      if (!s) return;
      _glReserve(c, W, s);
      if (c.medium === 'air') _glClip(c, 'fly');
      else if (c.medium === 'water') { _glLeaveWater(c); c.mem.up = 'leap'; c.mem.f = 0; c.mem.x0 = c.S.x; c.mem.y0 = c.S.y; c.S.z = s.obj.z + 0.01; _glClip(c, 'hop'); }   // up out of the water, straight onto it
      else if (!_glRouteToFoot(c, W, s.obj)) { c.mem.s = null; _glRelease(c, W); } else _glClip(c, 'walk');
    },
    step(c, W, dt, p) {
      const s = c.mem.s; if (!s) return true;
      c.mem.t += dt;
      if (c.mem.t > 26 || !W.alive(s.obj)) return true;
      if (c.medium === 'air') { if (_glArrive(c, W, dt, s)) { _glSettle(c, s); return true; } return false; }
      // on foot: walk to its foot, then a leap (or a slow climb) up to the surface
      if (!c.mem.up) { if (_glFollow(c, W, dt, c.def.speed || 0.6)) { c.mem.up = p.climb ? 'climb' : 'leap'; c.mem.f = 0; c.mem.x0 = c.S.x; c.mem.y0 = c.S.y; c.S.z = s.obj.z + 0.01; _glClip(c, p.climb ? 'walk' : 'hop'); } return false; }
      const dur = p.climb ? Math.max(5, s.lift / 6) : 0.42 + s.lift / 260 + _glDist(c.mem.x0, c.mem.y0, s.x, s.y) * 0.08;
      c.mem.f = Math.min(1, c.mem.f + dt / dur);
      const f = c.mem.f, e = p.climb ? f : f * f * (3 - 2 * f);
      c.S.x = c.mem.x0 + (s.x - c.mem.x0) * e; c.S.y = c.mem.y0 + (s.y - c.mem.y0) * e; c.S.lift = s.lift * e + (p.climb ? 0 : Math.sin(f * Math.PI) * 12);
      if (f >= 1) { _glSettle(c, s); return true; }
      return false;
    },
    stop(c, W) { if (!c.perched) _glRelease(c, W); },
  },
  /* ---------- resting ---------- */
  'perch-and-preen': {
    want(c) { return c.perched && !(c.mem0 && c.mem0.rested) ? 6 : 0; },
    start(c, W, p) { c.mem.dur = _glRange(p.dur, 4, 12); c.mem.t = 0; c.mem.nx = 0; c.mem.i = 0; c.mem.clips = p.clips || [p.clip || 'rest', 'preen', 'rest', 'rest']; },
    step(c, W, dt) {
      c.mem.t += dt; c.mem.nx -= dt;
      if (c.mem.nx <= 0) { _glClip(c, c.mem.clips[c.mem.i++ % c.mem.clips.length]); c.mem.nx = _glR(1.6, 4.2); }
      if (c.mem.t <= c.mem.dur) return false;
      c.mem0 = { rested: true };
      return true;
    },
  },
  'sleep': {
    deep: true,   // you can walk past; it takes a click, or the pet, to wake it
    want(c, W) { return !c.hidden && c.medium !== 'water' && (c.perched || W.tod === 'night' || c.def.habitat === 'ground') && !(c.mem0 && c.mem0.rested) ? (c.perched ? 6 : 0.7) : 0; },
    start(c, W, p) { c.mem.dur = _glRange(p.dur, 10, 30); c.mem.t = 0; c.mem.zz = 1; _glClip(c, 'sleep'); },
    step(c, W, dt) {
      c.mem.t += dt; c.mem.zz -= dt;
      if (c.mem.zz <= 0) { c.mem.zz = _glR(2.6, 4); if (c.onScreen) _glMark(c, 'zzz'); }
      if (c.mem.t <= c.mem.dur) return false;
      c.mem0 = { rested: true };
      return true;
    },
    stop(c) { c.mem0 = { rested: true }; _glClip(c, 'rest'); },
  },
  'peck': {
    want(c, W, p) { return !c.perched && !c.hidden && (c.medium === 'ground' || c.medium === 'water') ? (p.weight == null ? 1 : p.weight) : c.medium === 'air' && !c.perched ? (p.weight || 1) * 0.6 : 0; },
    start(c, W) {
      c.mem.t = 0; c.mem.dur = _glR(2, 5);
      if (c.medium === 'air') { const q = _glFreeNear(c, W, 3); c.mem.land = q; _glClip(c, 'fly'); if (!q) c.mem.dur = 0; } else _glClip(c, 'peck');
    },
    step(c, W, dt) {
      if (c.mem.land) { if (_glFly(c, W, dt, c.mem.land.x, c.mem.land.y, 0, { arrive: true })) { c.mem.land = null; c.S.lift = 0; c.perched = { ground: true, x: c.S.x, y: c.S.y, lift: 0, obj: null }; _glClip(c, 'peck'); } return false; }
      if (c.perched && c.perched.ground && Math.random() < dt * 0.5) { _glClip(c, Math.random() < 0.5 ? 'peck' : 'rest'); }
      if (c.perched && c.perched.ground && Math.random() < dt * 0.35) { const q = _glFreeNear(c, W, 0.8); if (q) { _glHopTo(c, q.x, q.y, 0.24, 4); c.perched.x = q.x; c.perched.y = q.y; } }
      return (c.mem.t += dt) > c.mem.dur;
    },
    stop(c) { if (c.perched && c.perched.ground) { c.mem0 = { rested: true }; } },
  },
  'burrow': {
    want(c, W, p) { return c.medium === 'ground' && !c.perched && !c.hidden && !c.hop ? (p.weight || 0.5) : 0; },
    start(c, W) { c.mem.ph = 'dig'; c.mem.t = 0; c.mem.at = _glFreeNear(c, W, 7) || { x: c.S.x, y: c.S.y }; _glClip(c, 'dig'); _glFx(c.S.x, c.S.y, 'soil'); },
    step(c, W, dt) {
      c.mem.t += dt;
      if (c.mem.ph === 'dig') { _glSink(c, Math.min(1, c.mem.t / 0.7)); if (c.mem.t >= 0.7) { c.mem.ph = 'under'; c.mem.t = 0; c.hidden = true; c.mem.wait = _glR(1.6, 4); } return false; }
      if (c.mem.ph === 'under') { if (c.mem.t >= c.mem.wait) { c.S.x = c.mem.at.x; c.S.y = c.mem.at.y; c.hidden = false; c.mem.ph = 'up'; c.mem.t = 0; _glFx(c.S.x, c.S.y, 'soil'); _glClip(c, 'alert'); } return false; }
      _glSink(c, Math.max(0, 1 - c.mem.t / 0.5));
      return c.mem.t >= 0.5;
    },
    stop(c) { c.hidden = false; _glSink(c, 0); },
  },
  /* ---------- wanting something ---------- */
  'follow-scent': {
    want(c, W, p) { return c.perched || c.hidden || c.medium === 'water' ? 0 : _glNearestOf(c, W, p.scent, 9) ? 2.2 : 0; },
    start(c, W, p) {
      const list = W.find(p.scent).filter(o => _glDist(o.top.x, o.top.y, c.S.x, c.S.y) < 9 && !(c.mem0 && c.mem0.last === o.uid));
      const o = list.length ? list[Math.floor(Math.random() * Math.min(list.length, 5))] : null;
      c.mem.o = o; c.mem.t = 0;
      if (!o) return;
      c.mem0 = Object.assign(c.mem0 || {}, { last: o.uid });
      if (c.medium === 'air') { c.mem.s = _glSurfaceOf(o, W); _glClip(c, 'fly'); }
      else { c.mem.go = _glRouteToFoot(c, W, o); _glClip(c, c.mem.go ? 'walk' : 'sniff'); c.mem.sn = _glR(1, 3); }
    },
    step(c, W, dt, p) {
      const o = c.mem.o; if (!o) return true;
      c.mem.t += dt;
      if (c.mem.t > 24) return true;
      if (c.medium === 'air') {
        if (c.mem.sip > 0) { c.mem.sip -= dt; _glHover(c, dt, 1.3); return c.mem.sip <= 0; }
        const s = c.mem.s, gap = p.hover ? 5 : 0;
        // the last stretch: it sorts in front of the flower it has come to, hovering just off a petal
        if (_glDist(c.S.x, c.S.y, s.x, s.y) < 1.1) c.S.z = s.obj.z + 0.01;
        if (_glFly(c, W, dt, s.x + (c.S.x < s.x ? -0.12 : 0.12), s.y, s.lift + gap, { arrive: true, wobble: 0.5 })) { c.mem.sip = _glR(1.6, 4.2); c.faceTo = s.x > c.S.x ? 1 : -1; }
        return false;
      }
      if (c.mem.go) { if (_glFollow(c, W, dt, c.def.speed || 0.6)) { c.mem.go = false; _glClip(c, 'sniff'); } return false; }
      if ((c.mem.sn -= dt) > 0) return false;
      return true;
    },
    stop(c) { if (c.medium === 'air') c.zHold = 0.8; },
  },
  'chase': {
    want(c, W, p) { if (c.perched && !(c.mem0 && c.mem0.rested)) return 0; if (c.hidden || c.medium === 'water') return 0; return _glPrey(c, W, p) ? (p.weight == null ? 1.5 : p.weight) : 0; },
    start(c, W, p) { if (c.perched) _glTakeOff(c, W); c.mem.prey = _glPrey(c, W, p); c.mem.t = 0; c.mem.goT = 0; _glClip(c, 'run'); },
    step(c, W, dt, p) {
      const v = c.mem.prey; if (!v || !v.S || v.gone) return true;
      c.mem.t += dt; if (c.mem.t > (p.dur || 6)) return true;
      // (it runs for the ground under what it is after, wherever that is: over a bed, over the water, the nearest place it can get to)
      if ((c.mem.goT -= dt) <= 0) { c.mem.goT = 0.6; const q = _glFreeAround(W, v.S.x, v.S.y, c.def.foot, 2.5); if (!q || !_glRouteTo(c, W, q.x, q.y)) return true; }
      if (_glFollow(c, W, dt, (c.def.speed || 0.6) * 1.9) && _glDist(c.S.x, c.S.y, v.S.x, v.S.y) > 1.2) _glClip(c, 'alert'); else if (c.clip !== 'run') _glClip(c, 'run');
      if (_glDist(c.S.x, c.S.y, v.S.x, v.S.y) < 1.2) { _glScareOne(v, W, c.S.x, c.S.y); return true; }
      return false;
    },
  },
  /* ---------- noticing you and your pet ---------- */
  'startled-by-player': {
    reflex: true,
    want(c, W, p) {
      if (c.hidden || c.calm > 0 || c.scared > 0) return 0;
      const P = W.player(); if (!P) return 0;
      // creep up and it stays; stand still and it hardly minds; on the wing it just goes round you
      const R = (p.r == null ? 1.5 : p.r) * (P.sneak ? 0.45 : P.moving ? 1 : 0.5) * (c.medium === 'air' && !c.perched ? 0.5 : 1);
      return _glDist(c.S.x, c.S.y, P.x, P.y) < R ? 10 : 0;
    },
    start(c, W, p) { const P = W.player(); _glStartle(c, W, P.x, P.y, p); },
    step(c, W, dt, p) { return _glFleeStep(c, W, dt, p); },
    stop(c, W, p) { _glFleeStop(c, W, p); },
  },
  'startled-by-pet': {
    reflex: true,
    want(c, W, p) {
      if (c.hidden || c.calm > 0 || c.scared > 0) return 0;
      const R = p.r == null ? 2.2 : p.r;
      for (const q of W.pets()) if (_glDist(c.S.x, c.S.y, q.x, q.y) < R) { c.mem1 = q; return 10; }
      return 0;
    },
    start(c, W, p) { const q = c.mem1 || W.pets()[0] || c.S; _glStartle(c, W, q.x, q.y, p); },
    step(c, W, dt, p) { return _glFleeStep(c, W, dt, p); },
    stop(c, W, p) { _glFleeStop(c, W, p); },
  },
  'notice-player': {
    reflex: true,
    want(c, W) {
      if (c.hidden || c.greeted > 0 || c.medium === 'water' || (c.cur && c.cur.B.deep)) return 0;
      const P = W.player(); return P && _glDist(c.S.x, c.S.y, P.x, P.y) < 1.5 ? 9 : 0;
    },
    start(c, W, p) { c.greeted = _glR(16, 40); c.mem.t = 0; const P = W.player(); if (P) c.faceTo = P.x > c.S.x ? 1 : -1; _glClip(c, p.clip || 'alert'); if (p.mark) _glMark(c, p.mark); if (p.sound) _glSound(p.sound); },
    step(c, W, dt) { return (c.mem.t += dt) > 1.6; },
  },
  /* ---------- going home ---------- */
  'leave-when-over': {
    reflex: true,
    want(c) { return c.leaving && !c.left ? 8 : 0; },
    start(c, W) {
      c.left = true; c.mem.t = 0; _glRelease(c, W);
      if (c.perched) _glTakeOff(c, W);
      if (c.medium === 'air') { const v = W.view(), ang = Math.random() * 6.28; c.mem.x = (v.x0 + v.x1) / 2 + Math.cos(ang) * (v.x1 - v.x0); c.mem.y = (v.y0 + v.y1) / 2 + Math.sin(ang) * (v.y1 - v.y0); _glClip(c, 'fly'); }
      else if (c.medium === 'ground') { const q = _glExitPoint(c, W); c.mem.go = q ? _glRouteTo(c, W, q.x, q.y) : false; _glClip(c, 'walk'); }
    },
    step(c, W, dt) {
      c.mem.t += dt;
      if (c.medium === 'air') { _glFly(c, W, dt, c.mem.x, c.mem.y, 90, { keep: true }); }
      else if (c.mem.go && !_glFollow(c, W, dt, c.def.speed || 0.6)) { /* on its way */ }
      if (!c.onScreen || c.mem.t > 18) { _glRemove(c); return true; }
      if (c.mem.t > 15 || (c.medium !== 'air' && !c.mem.go)) c.fadeOut = true;
      return false;
    },
  },
};
