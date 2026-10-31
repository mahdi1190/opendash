/* ============================================================
   THE EFFECTS LIBRARY (2.23, agent 'craft'). The owner: "a top tier of spectacular wow animations that blow people away ... a reusable effects library (particles, glows,
   trails, screen tints, camera nudge, world reactions), so one data entry can combine effects into a new spectacle". The entries are in 97-pets-tricks-3wow.js.

   A SPECTACLE IS DATA: {id, ms, still, steps: [[at seconds, kind, params], ...]}. Every kind below is a row of PET_FX. Nothing here knows an id.
     light     tint vignette glow rays ring beam
     particles emit (from pet, ground, sky, edge, ring; sprites glow spark star petal ember feather flower note heart leaf butterfly bubble ash)
     pictures  constellation rainbow dragon timestop portal meteors galaxy aurora swarm comet wings
     the pet   pet {clip} hide {on} lift {y, dur} hop (it moves somewhere else)
     the world nudge {px, dur} shake (the plants around it answer) freeze {on} (the garden's own animations really stop) react {clip} (others turn to look) sound {s}

   One canvas, made when a spectacle starts and thrown away when it ends: nothing is left running, nothing costs anything when idle, and a spectacle never repeats by itself.
   Particles are capped (FX_CAP, halved on a small screen or if frames run long) and are small bitmaps drawn once and then stamped. It stops with the tab. Reduced motion: one calm still frame that fades in and out.

     petFxRun(def, host, o)  -> {stop()}   host: see _fxStageHost, _fxGardenHost in 97-pets-tricks-3wow.js: {pos() -> {x, y (the feet, window px), h}, pet: {play, hide, lift, far}, world: {freeze, shake, nudge, react}, outline()}
   ============================================================ */
const FX_CAP = 240;
const _fxS = { live: null, spr: new Map(), ac: null };
const _fxE = Object.freeze({ o: (u) => 1 - Math.pow(1 - u, 3), i: (u) => u * u * u, io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2), b: (u) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }, s: (u) => u * u * (3 - 2 * u) });
const _fxClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _fxLerp = (a, b, k) => a + (b - a) * k;
const _fxR = (a, b) => a + Math.random() * (b - a);   // clock-ok: looks only
const _fxPick = (v) => (Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v);
const _fxRng = (v, d) => (Array.isArray(v) ? _fxR(v[0], v[1]) : v == null ? d : v);
/** How strong a layer is at u (0 to 1): in, hold, out. */
const _fxEnv = (u, a, b) => (u <= 0 || u >= 1 ? 0 : u < a ? _fxE.s(u / a) : u > 1 - b ? _fxE.s((1 - u) / b) : 1);

/* ---------- sprites: drawn once, stamped many times ---------- */
function _fxSprite(kind, c) {
  const key = kind + c, hit = _fxS.spr.get(key);
  if (hit) return hit;
  const S = kind === 'glow' ? 128 : 64, can = document.createElement('canvas'); can.width = can.height = S;
  const g = can.getContext('2d'), m = S / 2;
  const path = (d, fill) => { g.fillStyle = fill || c; g.fill(new Path2D(d)); };
  const soft = (r, a) => { const G = g.createRadialGradient(m, m, 0, m, m, r); G.addColorStop(0, c); G.addColorStop(0.35, c); G.addColorStop(1, c + '00'); g.globalAlpha = a; g.fillStyle = G; g.fillRect(0, 0, S, S); g.globalAlpha = 1; };
  g.lineJoin = 'round';
  if (kind === 'glow') { const G = g.createRadialGradient(m, m, 0, m, m, m); G.addColorStop(0, c); G.addColorStop(0.25, c + 'a0'); G.addColorStop(0.6, c + '30'); G.addColorStop(1, c + '00'); g.fillStyle = G; g.fillRect(0, 0, S, S); }
  else if (kind === 'dot') { soft(m, 1); }
  else if (kind === 'spark') { soft(m * 0.5, 0.55); path('M32 2Q34 30 62 32Q34 34 32 62Q30 34 2 32Q30 30 32 2z', '#ffffff'); g.globalAlpha = 0.55; path('M32 2Q34 30 62 32Q34 34 32 62Q30 34 2 32Q30 30 32 2z'); g.globalAlpha = 1; }
  else if (kind === 'star') { soft(m * 0.45, 0.8); path('M32 8Q33.500 30.500 56 32Q33.500 33.500 32 56Q30.500 33.500 8 32Q30.500 30.500 32 8z', '#ffffff'); }
  else if (kind === 'ember') { soft(m * 0.8, 1); g.globalAlpha = 0.9; g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(m, m, m * 0.2, 0, 7); g.fill(); g.globalAlpha = 1; }
  else if (kind === 'petal') { path('M32 6C46 16 50 38 32 58C14 38 18 16 32 6z'); g.globalAlpha = 0.28; path('M32 6C46 16 50 38 32 58z', '#ffffff'); g.globalAlpha = 0.4; g.strokeStyle = '#a0406a'; g.lineWidth = 1.5; g.stroke(new Path2D('M32 12Q32 34 32 52')); g.globalAlpha = 1; }
  else if (kind === 'feather') { path('M14 54Q20 26 52 10Q50 40 22 50z'); g.globalAlpha = 0.4; g.strokeStyle = '#9ab0d0'; g.lineWidth = 2; g.stroke(new Path2D('M10 58Q26 34 50 12')); g.globalAlpha = 1; }
  else if (kind === 'leaf') { path('M12 52Q10 18 52 10Q56 46 12 52z'); g.globalAlpha = 0.5; g.strokeStyle = '#3a6a2a'; g.lineWidth = 2; g.stroke(new Path2D('M12 52Q28 32 50 12')); g.globalAlpha = 1; }
  else if (kind === 'note') { path('M22 48a9 7 -18 1 1 -1 -5V14L50 8V40a9 7 -18 1 1 -1 -5V18L26 23V48z'); }
  else if (kind === 'heart') { path('M32 56C4 34 8 12 22 12C28 12 31 16 32 21C33 16 36 12 42 12C56 12 60 34 32 56z'); g.globalAlpha = 0.45; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(22, 22, 5, 3.5, -0.6, 0, 7); g.fill(); g.globalAlpha = 1; }
  else if (kind === 'flower') { for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.57; g.fillStyle = c; g.beginPath(); g.ellipse(m + Math.cos(a) * 15, m + Math.sin(a) * 15, 12, 12, 0, 0, 7); g.fill(); } g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(m, m, 9, 0, 7); g.fill(); g.globalAlpha = 0.55; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(m - 3, m - 3, 3, 0, 7); g.fill(); g.globalAlpha = 1; }
  else if (kind === 'butterfly') { path('M32 32C22 12 6 12 8 26C9 36 22 38 32 32zM32 32C42 12 58 12 56 26C55 36 42 38 32 32zM32 34C24 50 12 50 14 40zM32 34C40 50 52 50 50 40z'); g.fillStyle = '#3a2a2a'; g.fillRect(30.5, 22, 3, 22); }
  else if (kind === 'bubble') { g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.globalAlpha = 0.85; g.beginPath(); g.arc(m, m, m - 4, 0, 7); g.stroke(); g.globalAlpha = 0.22; g.fillStyle = c; g.fill(); g.globalAlpha = 0.9; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(m - 11, m - 12, 6, 4, -0.7, 0, 7); g.fill(); g.globalAlpha = 1; }
  else if (kind === 'ash') { g.globalAlpha = 0.85; path('M26 26L40 24L44 36L32 42L22 36z'); g.globalAlpha = 1; }
  else soft(m, 1);
  _fxS.spr.set(key, can);
  return can;
}

/* ---------- particles: one pool, capped ---------- */
function _fxAdd(F, o) { if (F.parts.length >= F.cap) return null; F.parts.push(o); return o; }
function _fxStep(F, dt) {
  const list = F.parts;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i], d = p.frozen ? 0 : dt;
    p.a += d;
    if (p.a >= p.l) { list[i] = list[list.length - 1]; list.pop(); continue; }
    if (p.at) { const dx = p.cx - p.x, dy = p.cy - p.y, q = Math.hypot(dx, dy) + 8; p.vx += (dx / q) * p.at * d; p.vy += (dy / q) * p.at * d; }
    if (p.sw) { const dx = p.x - p.cx, dy = p.y - p.cy, q = Math.hypot(dx, dy) + 8; p.vx += (-dy / q) * p.sw * d; p.vy += (dx / q) * p.sw * d; }
    p.vy += (p.g || 0) * d;
    if (p.sway) p.x += Math.sin(p.a * p.sway + p.ph) * 26 * d;
    const dr = p.dr ? Math.pow(p.dr, d) : 1;
    p.vx *= dr; p.vy *= dr;
    p.x += p.vx * d; p.y += p.vy * d; p.r += (p.vr || 0) * d;
  }
}
function _fxDraw(F, g) {
  for (const add of [false, true]) {
    g.globalCompositeOperation = add ? 'lighter' : 'source-over';
    for (const p of F.parts) {
      if (!!p.add !== add) continue;
      const u = p.a / p.l, op = (p.o == null ? 1 : p.o) * _fxEnv(u, p.fi == null ? 0.12 : p.fi, p.fo == null ? 0.4 : p.fo);
      if (op < 0.01) continue;
      let s = p.s0 + (p.s1 - p.s0) * u;
      if (p.pop) s *= _fxE.b(_fxClamp(p.a / 0.45, 0, 1));
      g.globalAlpha = op;
      if (p.r) { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.drawImage(p.sp, -s / 2, -s / 2, s, s); g.restore(); }
      else g.drawImage(p.sp, p.x - s / 2, p.y - s / 2, s, s);
    }
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
/** Where a new particle starts, by name. */
function _fxOrigin(F, p) {
  const P = F.P, sp = p.spread == null ? 30 : p.spread;
  switch (p.from) {
    case 'ground': return { x: P.x + _fxR(-sp, sp), y: P.y + _fxR(-10, 14) };
    case 'sky': return { x: _fxR(-40, F.W + 40), y: _fxR(-30, 6) };
    case 'wide': return { x: _fxR(0, F.W), y: _fxR(0, F.H) };
    case 'edge': { const k = Math.random(); return k < 0.5 ? { x: Math.random() < 0.5 ? -10 : F.W + 10, y: _fxR(0, F.H) } : { x: _fxR(0, F.W), y: Math.random() < 0.5 ? -10 : F.H + 10 }; }
    case 'ring': { const a = _fxR(0, 6.283), R = _fxRng(p.r, 80); return { x: P.x + Math.cos(a) * R, y: P.y - P.h * 0.5 + Math.sin(a) * R * 0.5 }; }
    default: return { x: P.x + _fxR(-sp, sp), y: P.y - P.h * (p.y == null ? 0.5 : p.y) + _fxR(-sp * 0.5, sp * 0.5) };
  }
}
function _fxSpawn(F, p) {
  const O = _fxOrigin(F, p), speed = _fxRng(p.speed, 40), dir = (_fxRng(p.dir, -90) + _fxR(-(p.arc == null ? 360 : p.arc) / 2, (p.arc == null ? 360 : p.arc) / 2)) * Math.PI / 180;
  const s = _fxRng(p.size, 14), P = F.P;
  return _fxAdd(F, { x: O.x, y: O.y, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed, g: p.g || 0, dr: p.drag, a: 0, l: _fxRng(p.life, 1.4), s0: s, s1: s * (p.end == null ? 1 : p.end), sp: _fxSprite(p.spr || 'glow', _fxPick(p.c) || '#ffe9a8'), r: p.spin ? _fxR(0, 6.28) : 0, vr: p.spin ? _fxR(-p.spin, p.spin) : 0, add: p.add !== false, o: p.o, fi: p.fi, fo: p.fo, sw: p.swirl, at: p.attract, cx: P.x, cy: P.y - P.h * (p.toY == null ? 0.5 : p.toY), sway: p.sway ? _fxR(1.5, 3) : 0, ph: _fxR(0, 6.28), pop: p.pop });
}

/* ---------- THE KINDS ----------
   each makes {update(dt, u), draw(g, u)}: u goes 0 to 1 over dur seconds; one-shots just do it at the start. F: {W, H, P (the pet: x, y feet, h), parts, cap, q (quality), host}. */
const PET_FX = {
  tint: (F, p) => ({ draw(g, u) { g.globalAlpha = (p.a == null ? 0.35 : p.a) * _fxEnv(u, p.in == null ? 0.12 : p.in, p.out == null ? 0.18 : p.out); g.fillStyle = p.c || '#0a0a24'; g.globalCompositeOperation = p.blend || 'source-over'; g.fillRect(0, 0, F.W, F.H); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; } }),
  vignette: (F, p) => { let G = null; return { draw(g, u) { if (!G) { G = g.createRadialGradient(F.P.x, F.P.y - F.P.h * 0.5, Math.min(F.W, F.H) * 0.18, F.P.x, F.P.y - F.P.h * 0.5, Math.max(F.W, F.H) * 0.78); G.addColorStop(0, (p.c || '#04041a') + '00'); G.addColorStop(1, p.c || '#04041a'); } g.globalAlpha = (p.a == null ? 0.6 : p.a) * _fxEnv(u, 0.15, 0.2); g.fillStyle = G; g.fillRect(0, 0, F.W, F.H); g.globalAlpha = 1; } }; },
  glow: (F, p) => ({ draw(g, u) { const P = F.P, sp = _fxSprite('glow', p.c || '#ffe9a8'), R = (p.r || 160) * (1 + (p.pulse || 0) * Math.sin(u * (p.dur || 1) * 6)) * (p.grow ? _fxLerp(0.3, 1, _fxE.o(u)) : 1), x = (p.x == null ? P.x : p.x * F.W), y = p.top ? -R * 0.1 : (p.yy == null ? P.y - P.h * (p.y == null ? 0.5 : p.y) : p.yy * F.H); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (p.a == null ? 0.8 : p.a) * _fxEnv(u, p.in == null ? 0.2 : p.in, p.out == null ? 0.3 : p.out); g.drawImage(sp, x - R, y - R, R * 2, R * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } }),
  rays: (F, p) => { const n = p.n || 12, seed = Array.from({ length: n }, () => _fxR(0.35, 1.15)); return { draw(g, u) { const P = F.P, cx = P.x, cy = P.y - P.h * (p.y == null ? 0.5 : p.y), L = (p.len || 420) * _fxE.o(_fxClamp(u * 3, 0, 1)), a0 = (p.spin || 0.3) * u * (p.dur || 1); g.save(); g.translate(cx, cy); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (p.a == null ? 0.32 : p.a) * _fxEnv(u, 0.15, 0.3); for (let i = 0; i < n; i++) { const a = a0 + (i / n) * 6.283, w = (p.w || 0.09) * seed[i], l = L * seed[i]; const G = g.createLinearGradient(0, 0, Math.cos(a) * l, Math.sin(a) * l); G.addColorStop(0, p.c || '#fff0c0'); G.addColorStop(1, (p.c || '#fff0c0') + '00'); g.fillStyle = G; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - w) * l, Math.sin(a - w) * l); g.lineTo(Math.cos(a + w) * l, Math.sin(a + w) * l); g.closePath(); g.fill(); } g.restore(); g.globalAlpha = 1; } }; },
  ring: (F, p) => ({ draw(g, u) { const P = F.P, k = _fxE.o(u), R = _fxLerp(p.r0 || 10, p.r1 || 320, k), w = (p.w || 10) * (1 - u); g.save(); g.translate(P.x, P.y - P.h * (p.y == null ? 0.3 : p.y)); g.scale(1, p.flat || 0.5); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (p.a == null ? 0.85 : p.a) * (1 - u); g.lineWidth = Math.max(0.6, w); g.strokeStyle = p.c || '#fff0c0'; g.beginPath(); g.arc(0, 0, R, 0, 6.283); g.stroke(); g.globalAlpha *= 0.4; g.lineWidth = w * 3; g.stroke(); g.restore(); g.globalAlpha = 1; } }),
  beam: (F, p) => ({ draw(g, u) { const P = F.P, w = (p.w || 70) * _fxE.o(_fxClamp(u * 4, 0, 1)) * (1 + 0.05 * Math.sin(u * 40)), x = P.x, y = P.y + 8, G = g.createLinearGradient(0, 0, 0, y); G.addColorStop(0, (p.c || '#fff6d0') + 'e0'); G.addColorStop(0.8, (p.c || '#fff6d0') + '90'); G.addColorStop(1, (p.c || '#fff6d0') + '20'); g.globalCompositeOperation = 'lighter'; g.fillStyle = G; const env = _fxEnv(u, 0.08, 0.2); for (const [k, a] of [[1, 0.22], [0.55, 0.32], [0.22, 0.6]]) { g.globalAlpha = a * env; g.beginPath(); g.moveTo(x - w * k * 0.55, 0); g.lineTo(x + w * k * 0.55, 0); g.lineTo(x + w * k, y); g.lineTo(x - w * k, y); g.closePath(); g.fill(); } g.globalAlpha = 0.6 * env; const sp = _fxSprite('glow', p.c || '#fff6d0'); g.save(); g.translate(x, y); g.scale(1, 0.28); g.drawImage(sp, -w * 2, -w * 2, w * 4, w * 4); g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } }),
  emit: (F, p) => { let acc = 0, did = false; return { update(dt, u) { if (!did) { did = true; for (let i = 0; i < (p.n || 0) * F.q; i++) _fxSpawn(F, p); } if (p.rate) { acc += p.rate * dt * F.q; while (acc >= 1) { acc--; _fxSpawn(F, p); } } } }; },
  /* your own pet, in stars: every part's outline is a chain of stars, it rises, sweeps across the sky, and falls back as shooting stars */
  constellation: (F, p) => {
    let C = null, stars = null, cx0 = 0, cy0 = 0;
    const build = () => {
      const lines = (F.host.outline && F.host.outline()) || [], out = [];
      for (const L of lines) { const base = out.length; L.forEach((q, i) => out.push({ x: q.x, y: q.y, next: i < L.length - 1 ? base + i + 1 : (L.closed ? base : -1), tw: _fxR(0, 6.28), big: i % 3 === 0, fall: _fxR(0, 0.5), px: 0, py: 0 })); }
      if (!out.length) for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283; out.push({ x: F.P.x + Math.cos(a) * F.P.h * 0.5, y: F.P.y - F.P.h * 0.5 + Math.sin(a) * F.P.h * 0.5, next: (i + 1) % 16, tw: _fxR(0, 6.28), big: i % 3 === 0, fall: _fxR(0, 0.5) }); }
      stars = out; cx0 = F.P.x; cy0 = F.P.y - F.P.h * 0.5; C = true;
    };
    const K = p.scale || Math.min(4.4, F.H * 0.52 / Math.max(40, F.P.h));
    const place = (u) => {  // the middle of the figure, and how big it is
      if (u < 0.3) { const k = _fxE.io(u / 0.3); return { x: _fxLerp(cx0, F.W * 0.26, k), y: _fxLerp(cy0, F.H * 0.34, k), s: _fxLerp(1, K, k), r: _fxLerp(0, -0.12, k) }; }
      if (u < 0.74) { const k = _fxE.s((u - 0.3) / 0.44); return { x: _fxLerp(F.W * 0.26, F.W * 0.7, k), y: F.H * 0.34 - Math.sin(k * 3.14) * F.H * 0.06, s: K, r: _fxLerp(-0.12, 0.08, k) }; }
      return { x: F.W * 0.7, y: F.H * 0.34, s: K, r: 0.08 };
    };
    return { update(dt, u) { if (!C) build(); },
      draw(g, u) {
        if (!C) return;
        const T = place(u), cos = Math.cos(T.r), sin = Math.sin(T.r), now = u * (p.dur || 1), fallU = _fxClamp((u - 0.76) / 0.24, 0, 1);
        const pos = stars.map(q => { const dx = (q.x - cx0) * T.s, dy = (q.y - cy0) * T.s; let x = T.x + dx * cos - dy * sin, y = T.y + dx * sin + dy * cos; if (fallU > 0) { const fk = _fxE.i(_fxClamp((fallU - q.fall * 0.6) / 0.4, 0, 1)); x = _fxLerp(x, cx0 + (q.x - cx0) * 0.6, fk); y = _fxLerp(y, cy0 + (q.y - cy0) * 0.6, fk); } return { x, y }; });
        const vis = _fxClamp(u / 0.08, 0, 1), line = _fxClamp((u - 0.1) / 0.22, 0, 1);
        g.globalCompositeOperation = 'lighter';
        // the lines draw themselves in as it rises, and go first when it falls
        if (fallU <= 0) {
          g.lineWidth = 1 + T.s * 0.32; g.strokeStyle = '#b8d0ff'; g.globalAlpha = 0.75 * line * (u > 0.72 ? 1 - (u - 0.72) / 0.04 : 1);
          g.beginPath(); const cut = Math.floor(stars.length * line);
          for (let i = 0; i < cut; i++) { const q = stars[i]; if (q.next >= 0) { g.moveTo(pos[i].x, pos[i].y); g.lineTo(pos[q.next].x, pos[q.next].y); } }
          g.stroke();
        }
        const spS = _fxSprite('star', '#dce8ff'), spG = _fxSprite('glow', '#7fa8ff');
        for (let i = 0; i < stars.length; i++) {
          const q = stars[i], tw = 0.72 + 0.28 * Math.sin(now * 3.4 + q.tw), s = (q.big ? 15 : 10) * (0.7 + T.s * 0.3) * tw;
          g.globalAlpha = vis * tw;
          if (q.big) g.drawImage(spG, pos[i].x - s * 1.6, pos[i].y - s * 1.6, s * 3.2, s * 3.2);
          g.drawImage(spS, pos[i].x - s / 2, pos[i].y - s / 2, s, s);
          if (fallU > 0 && q.px != null) { const dx = pos[i].x - q.px, dy = pos[i].y - q.py; if (dx * dx + dy * dy > 4) { const G = g.createLinearGradient(pos[i].x - dx * 4, pos[i].y - dy * 4, pos[i].x, pos[i].y); G.addColorStop(0, '#a8c8ff00'); G.addColorStop(1, '#ffffff'); g.strokeStyle = G; g.lineWidth = 2.2; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(pos[i].x - dx * 4, pos[i].y - dy * 4); g.lineTo(pos[i].x, pos[i].y); g.stroke(); } }
          q.px = pos[i].x; q.py = pos[i].y;
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      } };
  },
  /* a rainbow grows from the pet to the far side, and flowers come up under it as it passes */
  rainbow: (F, p) => {
    const cols = ['#ff5a5a', '#ff9a3c', '#ffe14a', '#5fd86a', '#4ab8ff', '#6a6aff', '#b45aff'];
    const dirR = F.P.x < F.W * 0.55 ? 1 : -1, Sx = F.P.x, Sy = F.P.y, Ex = dirR > 0 ? F.W * 0.94 : F.W * 0.06, Ey = _fxLerp(F.P.y, F.H * 0.74, 0.5), cx = (Sx + Ex) / 2, cy = (Sy + Ey) / 2, Rx = Math.abs(Ex - Sx) / 2, ry = Math.min(Rx * 0.8, F.P.y * 0.85);
    let lastK = 0, gap = 0, bloom = 0;
    const flowers = ['#ff7a9a', '#ffb0d0', '#ffe14a', '#c89aff', '#7ac8ff', '#ff9a5a', '#ffffff'];
    return { update(dt, u) { const k = _fxE.io(_fxClamp(u / 0.5, 0, 1)); gap -= dt;
        if (k > lastK + 0.002 && gap <= 0) { gap = 0.03; const a = Math.PI * k, hx = cx - dirR * Math.cos(a) * Rx, hy = cy - Math.sin(a) * ry;
          _fxAdd(F, { x: hx, y: hy, vx: _fxR(-30, 30), vy: _fxR(-20, 50), g: 60, a: 0, l: 1.1, s0: 18, s1: 4, sp: _fxSprite('spark', '#ffffff'), r: 0, add: true });
          if (bloom++ % 2 === 0) { const gx = _fxLerp(Sx, Ex, k) + _fxR(-30, 30), gy = _fxLerp(Sy, Ey, k) + _fxR(-14, 44); _fxAdd(F, { x: gx, y: gy, vx: 0, vy: 0, a: 0, l: 3.8 - 2 * u + _fxR(0, 0.5), s0: _fxR(18, 34), s1: _fxR(24, 40), sp: _fxSprite('flower', flowers[bloom % 7]), r: _fxR(-0.4, 0.4), add: false, pop: true, fi: 0.02, fo: 0.18 }); if (bloom % 6 === 0) _fxAdd(F, { x: gx, y: gy - 10, vx: _fxR(-20, 20), vy: _fxR(-60, -30), a: 0, l: 2.6, s0: 22, s1: 16, sp: _fxSprite('butterfly', flowers[(bloom + 3) % 7]), r: _fxR(-0.3, 0.3), add: false, sway: 3, ph: _fxR(0, 6), fi: 0.05, fo: 0.3 }); }
        }
        lastK = k; },
      draw(g, u) { const k = _fxE.io(_fxClamp(u / 0.5, 0, 1)), env = _fxEnv(u, 0.02, 0.28), w = Math.max(7, Rx * 0.026); g.save(); g.translate(cx, cy); g.scale(1, ry / Rx); const a0 = dirR > 0 ? Math.PI : 0, a1 = a0 + dirR * Math.PI * k; g.lineCap = 'round';
        g.globalCompositeOperation = 'lighter'; cols.forEach((c, i) => { const R = Rx - i * w; g.strokeStyle = c; g.globalAlpha = 0.15 * env; g.lineWidth = w * 2.8; g.beginPath(); g.arc(0, 0, R, a0, a1, dirR < 0); g.stroke(); });
        g.globalCompositeOperation = 'source-over'; cols.forEach((c, i) => { const R = Rx - i * w; g.strokeStyle = c; g.globalAlpha = 0.72 * env; g.lineWidth = w + 0.6; g.beginPath(); g.arc(0, 0, R, a0, a1, dirR < 0); g.stroke(); }); g.restore(); g.globalAlpha = 1; } };
  },
  /* a long dragon of gold fire rises behind the pet, coils, and roars */
  dragon: (F, p) => {
    const L = Math.max(160, F.P.y - F.P.h * 0.2 - Math.max(130, F.H * 0.16)), W0 = Math.max(24, Math.min(58, F.W * 0.045)), amp = Math.min(F.W * 0.2, 250), N = 54;
    const spine = (s0, t, reveal) => { const s = s0 * reveal, e = Math.min(1, s * 1.5), y = F.P.y - F.P.h * 0.2 - s * L, x = F.P.x + Math.sin(s * 8.4 + t * 1.9) * amp * e * (1 - s * 0.35) + Math.sin(s * 3 - t) * 18; return { x, y }; };
    let sparkT = 0;
    return { update(dt, u) { sparkT -= dt; const rev = _fxE.io(_fxClamp(u / 0.42, 0, 1)), t = u * (p.dur || 1); if (sparkT <= 0 && u < 0.86) { sparkT = 0.016; const s = Math.random(), q = spine(s, t, rev); _fxAdd(F, { x: q.x + _fxR(-14, 14), y: q.y + _fxR(-14, 14), vx: _fxR(-30, 30), vy: _fxR(-120, -40), g: -20, dr: 0.8, a: 0, l: _fxR(0.5, 1.2), s0: _fxR(8, 18), s1: 3, sp: _fxSprite('ember', _fxPick(['#ffb040', '#ffd060', '#ff7a30'])), r: 0, add: true }); } },
      draw(g, u) {
        const t = u * (p.dur || 1), rev = _fxE.io(_fxClamp(u / 0.42, 0, 1)), env = _fxEnv(u, 0.04, 0.2), pts = [];
        for (let i = 0; i <= N; i++) { const s = i / N; pts.push(spine(s, t, rev)); }
        const wid = (s) => W0 * (s < 0.06 ? s / 0.06 * 0.3 : 0.3 + 0.7 * Math.sin(Math.min(1, (s - 0.06) / 0.94 * 1.08) * Math.PI * 0.62)) * (1 + 0.06 * Math.sin(s * 40 + t * 6));
        const norm = (i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], dx = b.x - a.x, dy = b.y - a.y, q = Math.hypot(dx, dy) || 1; return [-dy / q, dx / q]; };
        g.save(); g.globalCompositeOperation = 'lighter';
        // the body: three skins from wide and soft to thin and bright
        for (const [k, c, a] of [[1.5, '#ff6a20', 0.16], [1, '#ffa030', 0.34], [0.55, '#ffe08a', 0.42]]) {
          g.fillStyle = c; g.globalAlpha = a * env; g.beginPath();
          for (let i = 0; i <= N; i++) { const n = norm(i), w = wid(i / N) * k; const x = pts[i].x + n[0] * w, y = pts[i].y + n[1] * w; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
          for (let i = N; i >= 0; i--) { const n = norm(i), w = wid(i / N) * k; g.lineTo(pts[i].x - n[0] * w, pts[i].y - n[1] * w); }
          g.closePath(); g.fill();
        }
        // spines along the back, every few segments
        g.fillStyle = '#ffd070'; g.globalAlpha = 0.65 * env; g.beginPath();
        for (let i = 6; i < N - 2; i += 3) { const n = norm(i), w = wid(i / N), bx = pts[i].x + n[0] * w, by = pts[i].y + n[1] * w, nx = pts[i + 2]; g.moveTo(bx, by); g.lineTo(bx + n[0] * W0 * 0.55, by + n[1] * W0 * 0.55); g.lineTo(nx.x + n[0] * w, nx.y + n[1] * w); g.closePath(); }
        g.fill();
        // scales: little bright marks that run along it
        g.strokeStyle = '#fff2c0'; g.lineWidth = 1.5; g.globalAlpha = 0.5 * env; g.beginPath();
        for (let i = 4; i < N - 1; i += 2) { const n = norm(i), w = wid(i / N) * 0.5; g.moveTo(pts[i].x + n[0] * w, pts[i].y + n[1] * w); g.quadraticCurveTo(pts[i + 1].x, pts[i + 1].y, pts[i].x - n[0] * w, pts[i].y - n[1] * w); }
        g.stroke();
        // the head: drawn along the way the neck is going
        const H = pts[N], N1 = pts[N - 3], ang = Math.atan2(H.y - N1.y, H.x - N1.x), hs = W0 * 1.5 * (1 + (u > 0.46 && u < 0.6 ? 0.2 * Math.sin((u - 0.46) / 0.14 * 3.14) : 0));
        g.translate(H.x, H.y); g.rotate(ang + (Math.cos(ang) < 0 ? 0 : 0)); if (Math.cos(ang) < 0) g.scale(1, -1); g.scale(hs / 50, hs / 50);
        const roar = u > 0.46 && u < 0.62 ? 1 : 0.35;
        const skull = new Path2D('M-34 -18C-16 -32 8 -34 26 -22C40 -14 56 -12 66 -6C72 -2 70 4 60 5C44 7 26 7 12 9L-6 26L-30 18C-44 8 -44 -8 -34 -18z'), jaw = new Path2D(`M-14 14C4 ${14 + roar * 8} 30 ${16 + roar * 16} 54 ${12 + roar * 22}C40 ${26 + roar * 24} 6 ${34 + roar * 12} -20 24z`);
        g.fillStyle = '#ffb040'; g.globalAlpha = 0.72 * env; g.fill(skull); g.fill(jaw);
        g.fillStyle = '#ffe9a8'; g.globalAlpha = 0.5 * env; g.fill(new Path2D('M-24 -16C-8 -26 12 -28 24 -18C10 -18 -6 -14 -20 -6z'));
        // horns and whiskers
        g.strokeStyle = '#ffe08a'; g.lineCap = 'round'; g.globalAlpha = 0.9 * env; g.lineWidth = 5; g.beginPath(); g.moveTo(-22, -24); g.quadraticCurveTo(-46, -46 - Math.sin(t * 3) * 3, -84, -52); g.moveTo(-4, -30); g.quadraticCurveTo(-24, -56, -58, -74); g.stroke();
        g.lineWidth = 2.2; g.beginPath(); g.moveTo(48, -6); g.quadraticCurveTo(70 + Math.sin(t * 4) * 10, -36, 100, -28 + Math.sin(t * 3) * 14); g.moveTo(44, 10); g.quadraticCurveTo(70, 34 + Math.sin(t * 3.4) * 10, 104, 26 - Math.sin(t * 3) * 12); g.stroke();
        // the mane
        g.fillStyle = '#ff7a30'; g.globalAlpha = 0.6 * env; for (let i = 0; i < 6; i++) { const a = 2.1 + i * 0.32, l = 34 + Math.sin(t * 5 + i) * 8; g.beginPath(); g.moveTo(-30 + Math.cos(a) * 8, 2 + Math.sin(a) * 8); g.lineTo(-38 + Math.cos(a) * l, 2 + Math.sin(a) * l); g.lineTo(-30 + Math.cos(a + 0.5) * 12, 2 + Math.sin(a + 0.5) * 12); g.closePath(); g.fill(); }
        // the eye
        g.globalAlpha = env; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(18, -13, 7, 5, 0.2, 0, 7); g.fill(); g.fillStyle = '#ff3a10'; g.beginPath(); g.ellipse(20, -13, 3, 4.4, 0, 0, 7); g.fill();
        g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      } };
  },
  /* petals fall, time stops: they hang in the air, then spiral round the pet while a great clock turns backwards, and then it all lets go */
  timestop: (F, p) => {
    const n = Math.round(190 * F.q), list = [], cols = ['#ffc0d8', '#ffd8e8', '#ffa8c8', '#ffe8f0', '#ffb8a8'].map(c => _fxSprite('petal', c));
    for (let i = 0; i < n; i++) list.push({ x: _fxR(0, F.W), y: _fxR(-F.H * 0.9, F.H), vy: _fxR(36, 90), sw: _fxR(10, 34), ph: _fxR(0, 6.28), r: _fxR(0, 6.28), vr: _fxR(-2, 2), s: _fxR(16, 34), sp: cols[i % 5], fx: 0, fy: 0, ang: _fxR(0, 6.283), rad: _fxR(0.45, 1.25), hgt: _fxR(-0.6, 0.6), delay: _fxR(0, 0.2) });
    const FR = p.freeze || 0.26, SP = p.spiral || 0.42, GO = p.go || 0.84; let t = 0, frozen = false, burst = false;
    return { update(dt, u) { t += dt;
        if (!frozen && u >= FR) { frozen = true; for (const q of list) { q.fx = q.x; q.fy = q.y; } }
        if (!burst && u >= GO) { burst = true; const cx = F.P.x, cy = F.P.y - F.P.h * 0.6; for (const q of list) { const a = Math.atan2(q.y - cy, q.x - cx), sp = _fxR(260, 900); q.bx = Math.cos(a) * sp; q.by = Math.sin(a) * sp - 40; } }
        if (!frozen) for (const q of list) { q.y += q.vy * dt; q.x += Math.sin(t * 1.4 + q.ph) * q.sw * dt; q.r += q.vr * dt; if (q.y > F.H + 20) q.y = -20; }
        if (burst) for (const q of list) { q.x += q.bx * dt; q.y += q.by * dt; q.by += 120 * dt; q.r += q.vr * 6 * dt; }
      },
      draw(g, u) {
        const cx = F.P.x, cy = F.P.y - F.P.h * 0.6, R = Math.max(90, Math.min(F.W, F.H) * 0.3), spU = _fxClamp((u - SP) / (GO - SP), 0, 1), env = u > 0.95 ? (1 - u) / 0.05 : u < 0.04 ? u / 0.04 : 1;
        // the clock
        const clockA = _fxEnv(_fxClamp((u - FR) / (GO - FR + 0.04), 0, 1), 0.12, 0.08);
        if (clockA > 0) {
          g.save(); g.translate(cx, cy); g.scale(1, 0.55); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffe8b0'; g.globalAlpha = 0.9 * clockA; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, R * 1.3, 0, 6.283); g.stroke(); g.lineWidth = 14; g.globalAlpha = 0.2 * clockA; g.stroke(); g.globalAlpha = 0.95 * clockA; g.lineWidth = 3.5;
          for (let i = 0; i < 12; i++) { const a = i * 0.5236, r0 = R * (i % 3 ? 1.22 : 1.15); g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * R * 1.3, Math.sin(a) * R * 1.3); g.stroke(); }
          const back = -spU * spU * 18, h1 = back - 1.57, h2 = back * 0.2 - 0.6; g.lineCap = 'round'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(h1) * R * 1.05, Math.sin(h1) * R * 1.05); g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(h2) * R * 0.66, Math.sin(h2) * R * 0.66); g.stroke();
          g.restore();
        }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.95 * env;
        for (const q of list) {
          let x = q.x, y = q.y, r = q.r;
          if (frozen && !burst) { const k = _fxE.io(_fxClamp((spU - q.delay) / (1 - q.delay), 0, 1)); if (k > 0) { const a = q.ang + k * 7 + spU * spU * 4, rr = R * q.rad * (1 - 0.15 * Math.sin(spU * 6)), ox = cx + Math.cos(a) * rr, oy = cy + Math.sin(a) * rr * 0.42 + q.hgt * R * 0.5; x = _fxLerp(q.fx, ox, k); y = _fxLerp(q.fy, oy, k); r = q.r + k * 9; q.x = x; q.y = y; } }
          g.save(); g.translate(x, y); g.rotate(r); g.drawImage(q.sp, -q.s / 2, -q.s / 2, q.s, q.s); g.restore();
        }
        g.globalAlpha = 1;
      } };
  },
  /* a round doorway in the air */
  portal: (F, p) => {
    const at = p.far ? null : { x: F.P.x, y: F.P.y }; const dots = Array.from({ length: Math.round(46 * F.q) }, () => ({ a: _fxR(0, 6.28), r: _fxR(0.6, 1.3), v: _fxR(1.6, 4), s: _fxR(4, 11) }));
    return { update(dt, u) { for (const d of dots) { d.a += d.v * dt; d.r -= dt * 0.22; if (d.r < 0.2) d.r = 1.25; } },
      draw(g, u) { const Q = at || F.far || F.P, R = (p.r || 62) * _fxE.b(_fxClamp(u / 0.2, 0, 1)) * _fxClamp((1 - u) / 0.14, 0, 1), cy = Q.y - 2; if (R <= 0) return; g.save(); g.translate(Q.x, cy); g.scale(1, 0.34); const G = g.createRadialGradient(0, 0, R * 0.1, 0, 0, R); G.addColorStop(0, '#04021a'); G.addColorStop(0.7, '#1a0a50'); G.addColorStop(1, '#6a3aff'); g.fillStyle = G; g.globalAlpha = 0.95; g.beginPath(); g.arc(0, 0, R, 0, 6.283); g.fill(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 7; g.strokeStyle = '#b48aff'; g.globalAlpha = 0.9; g.beginPath(); g.arc(0, 0, R, 0, 6.283); g.stroke(); g.lineWidth = 16; g.strokeStyle = '#7a4aff'; g.globalAlpha = 0.35; g.stroke(); const sp = _fxSprite('spark', '#c8a8ff'); g.globalAlpha = 1; for (const d of dots) { const x = Math.cos(d.a) * R * d.r, y = Math.sin(d.a) * R * d.r; g.drawImage(sp, x - d.s, y - d.s * 2.6, d.s * 2, d.s * 5.2); } g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } };
  },
  /* shooting stars by the handful */
  meteors: (F, p) => {
    const list = [], beats = p.beats || [0.05, 0.14, 0.2, 0.3, 0.36, 0.4, 0.5, 0.56, 0.6, 0.64, 0.7, 0.76];
    for (const b of beats) { const n = 1 + Math.floor(Math.random() * 2.2); for (let i = 0; i < n; i++) { const big = Math.random() < 0.2, x0 = _fxR(F.W * 0.25, F.W * 1.2), y0 = _fxR(-120, F.H * 0.1), len = _fxR(0.55, 1) * Math.max(F.W, F.H) * 0.85; list.push({ t: b + _fxR(0, 0.03), d: _fxR(0.09, 0.15), x0, y0, x1: x0 - len, y1: y0 + len * 0.62, w: big ? 7 : _fxR(2.4, 4.4), c: _fxPick(['#ffe9c0', '#bcd8ff', '#ffd090', '#ffffff']), hit: false }); } }
    if (p.finale !== false) list.push({ t: p.finale || 0.82, d: 0.1, x0: F.W * 1.05, y0: -60, x1: F.P.x + F.W * 0.14, y1: F.P.y - F.P.h * 1.5, w: 13, c: '#fff6d8', big: true, hit: false });
    return { update(dt, u) { for (const m of list) if (!m.hit && u >= m.t + m.d) { m.hit = true; for (let i = 0; i < (m.big ? 26 : 6) * F.q; i++) { const a = _fxR(0, 6.28), sp = _fxR(30, m.big ? 300 : 120); _fxAdd(F, { x: m.x1, y: m.y1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 70, dr: 0.5, a: 0, l: _fxR(0.4, 1), s0: m.big ? 20 : 11, s1: 2, sp: _fxSprite('spark', m.c), r: 0, add: true }); } if (m.big && F.host.world && F.host.world.nudge) { F.host.world.nudge(10, 500); F.flash = 0.5; _fxSound('boom'); } } },
      draw(g, u) { g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; for (const m of list) { const k = (u - m.t) / m.d; if (k <= 0 || k > 1.4) continue; const kk = Math.min(1, k), x = _fxLerp(m.x0, m.x1, kk), y = _fxLerp(m.y0, m.y1, kk), tail = k > 1 ? (1.4 - k) / 0.4 : 1, lk = Math.max(0, kk - 0.4), tx = _fxLerp(m.x0, m.x1, lk), ty = _fxLerp(m.y0, m.y1, lk), G = g.createLinearGradient(tx, ty, x, y); G.addColorStop(0, m.c + '00'); G.addColorStop(1, m.c); g.strokeStyle = G; g.globalAlpha = tail; g.lineWidth = m.w; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke(); g.lineWidth = m.w * 3.2; g.globalAlpha = tail * 0.2; g.stroke(); if (k <= 1) { g.globalAlpha = 1; const S = m.w * 5, sp = _fxSprite('glow', m.c); g.drawImage(sp, x - S, y - S, S * 2, S * 2); } } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } };
  },
  /* a tiny galaxy, turning in its paws */
  galaxy: (F, p) => {
    const n = Math.round(240 * F.q), stars = [], arms = 3;
    for (let i = 0; i < n; i++) { const r = Math.pow(Math.random(), 0.7), arm = i % arms; stars.push({ r, a: arm * (6.283 / arms) + r * 4.4 + _fxR(-0.4, 0.4) * (1.1 - r), s: _fxR(3, 9) * (1.2 - r * 0.6), sp: _fxSprite(i % 5 ? 'dot' : 'spark', r < 0.3 ? '#fff0c8' : _fxPick(['#a8c8ff', '#c8a8ff', '#ffb8e0', '#8ad0ff'])), tw: _fxR(0, 6.28) }); }
    let burst = false;
    return { update(dt, u) { if (!burst && u >= (p.go || 0.8)) { burst = true; const c = F.P, cx = c.x + (p.dx || 0), cy = c.y - c.h * (p.y || 1.2); for (let i = 0; i < 90 * F.q; i++) { const a = _fxR(0, 6.28), sp = _fxR(60, 480); _fxAdd(F, { x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, g: 24, dr: 0.45, a: 0, l: _fxR(0.8, 2.2), s0: _fxR(8, 20), s1: 2, sp: _fxSprite('spark', _fxPick(['#ffffff', '#a8c8ff', '#ffb8e0', '#ffe9a8'])), r: 0, add: true }); } } },
      draw(g, u) {
        const go = p.go || 0.8; if (u > go + 0.02) return;
        const t = u * (p.dur || 1), R = (p.r || 150) * (u < go - 0.08 ? _fxE.o(_fxClamp(u / 0.45, 0, 1)) : _fxLerp(1, 0.02, _fxE.i(_fxClamp((u - (go - 0.08)) / 0.08, 0, 1)))), cx = F.P.x + (p.dx || 0), cy = F.P.y - F.P.h * (p.y || 1.2), spin = t * 0.9 + (u > go - 0.12 ? (u - (go - 0.12)) * 30 : 0);
        g.save(); g.translate(cx, cy); g.rotate(-0.3); g.scale(1, 0.46); g.globalCompositeOperation = 'lighter';
        const core = _fxSprite('glow', '#ffe8c0'), halo = _fxSprite('glow', '#6a4aff'); g.globalAlpha = 0.55; g.drawImage(halo, -R * 1.5, -R * 1.5, R * 3, R * 3); g.globalAlpha = 0.95; g.drawImage(core, -R * 0.5, -R * 0.5, R, R);
        for (const q of stars) { const a = q.a + spin * (1.6 - q.r), x = Math.cos(a) * q.r * R, y = Math.sin(a) * q.r * R; g.globalAlpha = 0.65 + 0.35 * Math.sin(t * 5 + q.tw); g.drawImage(q.sp, x - q.s / 2, y - q.s / 2, q.s, q.s); }
        g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      } };
  },
  /* curtains of northern light */
  aurora: (F, p) => {
    const strip = document.createElement('canvas'); strip.width = 4; strip.height = 256; { const g2 = strip.getContext('2d'), G = g2.createLinearGradient(0, 0, 0, 256); G.addColorStop(0, '#2aff9a00'); G.addColorStop(0.3, '#2aff9a'); G.addColorStop(0.62, '#3ac8ff'); G.addColorStop(0.86, '#a85aff90'); G.addColorStop(1, '#a85aff00'); g2.fillStyle = G; g2.fillRect(0, 0, 4, 256); }
    const curtains = [[0.02, 0.36, 0.7, 0.9], [0.08, 0.26, 1.1, 0.6], [0.0, 0.4, 0.45, 1.2]], step = 11;
    return { draw(g, u) { const t = u * (p.dur || 1), env = _fxEnv(u, 0.22, 0.28); g.globalCompositeOperation = 'lighter'; for (const [y0, h0, f, sp] of curtains) { for (let x = -step; x < F.W + step; x += step) { const q = x / F.W, wob = _fxClamp(Math.sin(q * 7 * f + t * sp) * 0.5 + Math.sin(q * 15 * f - t * sp * 1.4) * 0.2 + 0.5, 0, 1.2), h = F.H * h0 * (0.5 + wob * 0.8), y = F.H * y0 + Math.sin(q * 5 + t * 0.7) * F.H * 0.05, bright = 0.05 + Math.pow(wob, 2) * 0.17 + 0.02 * Math.sin(q * 70 + t * 2); g.globalAlpha = _fxClamp(bright, 0, 0.5) * env; g.drawImage(strip, x, y, step + 1, h); } } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } };
  },
  /* a crowd of little lights that gather into a shape round the pet (a heart), beat, and scatter */
  swarm: (F, p) => {
    const n = Math.round((p.n || 110) * F.q), sp = _fxSprite('ember', p.c || '#d8ff7a'), glow = _fxSprite('glow', p.c || '#d8ff7a'), list = [];
    const Rk = Math.max(70, Math.min(F.W, F.H) * 0.26), cx = F.P.x, cy = F.P.y - F.P.h * 0.9;
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, hx = 16 * Math.pow(Math.sin(a), 3), hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); list.push({ x: _fxR(0, F.W), y: _fxR(F.H * 0.35, F.H), tx: cx + hx / 16 * Rk, ty: cy + hy / 16 * Rk * 0.92, ph: _fxR(0, 6.28), w: _fxR(0.6, 1.6), s: _fxR(7, 14), d: _fxR(0, 0.14) }); }
    const IN = p.gather || 0.34, HOLD = p.hold || 0.72;
    return { update(dt, u) { const t = u * (p.dur || 1); for (const q of list) { const k = _fxClamp((u - IN + 0.22 - q.d) / 0.22, 0, 1), out = _fxClamp((u - HOLD) / 0.16, 0, 1), beat = u > IN && u < HOLD ? 1 + 0.1 * Math.max(0, Math.sin(t * 7)) : 1; if (k < 1 || out > 0) { const wx = Math.sin(t * q.w + q.ph) * 40, wy = Math.cos(t * q.w * 1.3 + q.ph) * 30; q.x += (wx * dt); q.y += (wy * dt) - (out > 0 ? 40 * dt : 0); } if (k > 0 && out <= 0) { const bx = cx + (q.tx - cx) * beat, by = cy + (q.ty - cy) * beat, e = _fxE.io(k); q.x = _fxLerp(q.x, bx, 0.06 + e * 0.3); q.y = _fxLerp(q.y, by, 0.06 + e * 0.3); } if (out > 0) { const a = Math.atan2(q.y - cy, q.x - cx); q.x += Math.cos(a) * 170 * out * dt; q.y += Math.sin(a) * 170 * out * dt; } } },
      draw(g, u) { const t = u * (p.dur || 1), env = _fxEnv(u, 0.1, 0.14); g.globalCompositeOperation = 'lighter'; for (const q of list) { const tw = 0.6 + 0.4 * Math.sin(t * 6 + q.ph); g.globalAlpha = env * tw * 0.4; g.drawImage(glow, q.x - q.s * 1.6, q.y - q.s * 1.6, q.s * 3.2, q.s * 3.2); g.globalAlpha = env * tw; g.drawImage(sp, q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } };
  },
  /* the pet as a streak of light, across the view and back */
  comet: (F, p) => {
    const path = (u) => { const k = _fxE.s(u), P = F.P, x = P.x + Math.sin(k * 6.283) * Math.min(F.W * 0.44, 560), y = P.y - P.h * 0.5 - Math.sin(k * 3.14) * Math.min(F.H * 0.42, P.y - 60) + Math.sin(k * 12.5) * 34; return { x, y }; };
    let last = null, acc = 0;
    return { update(dt, u) { const q = path(u); acc += 90 * dt * F.q; while (acc >= 1) { acc--; _fxAdd(F, { x: q.x + _fxR(-6, 6), y: q.y + _fxR(-6, 6), vx: _fxR(-30, 30), vy: _fxR(-18, 54), g: 40, a: 0, l: _fxR(0.6, 1.5), s0: _fxR(10, 24), s1: 2, sp: _fxSprite('spark', _fxPick(p.c || ['#ffffff', '#bfe0ff', '#ffe9a8'])), r: 0, add: true, fi: 0.01 }); } last = q; },
      draw(g, u) { const q = path(u), env = _fxEnv(u, 0.03, 0.05); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; for (let i = 14; i >= 1; i--) { const a = path(Math.max(0, u - i * 0.012)), b = path(Math.max(0, u - (i - 1) * 0.012)); g.strokeStyle = i < 5 ? '#ffffff' : '#a8d0ff'; g.globalAlpha = (1 - i / 15) * 0.55 * env; g.lineWidth = (15 - i) * 2.4; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } const S = 70; g.globalAlpha = env; g.drawImage(_fxSprite('glow', '#dff0ff'), q.x - S, q.y - S, S * 2, S * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } };
  },
  /* great wings of fire, thrown wide: an upper edge, and feathers along the lower one */
  wings: (F, p) => {
    const span = Math.min(F.W * 0.46, 620), up = Math.min(F.P.y * 0.82, 460), cx = F.P.x, cy = F.P.y - F.P.h * 0.8, FN = 9;
    const shape = (side, k, open, flap) => {
      const pts = [], tipX = cx + side * span * k * open, tipY = cy - up * 0.92 * k * (0.35 + 0.65 * open) + flap * 40, c1x = cx + side * span * 0.34 * open * k, c1y = cy - up * 1.05 * k * open + flap * 16, q = (s) => ({ x: (1 - s) * (1 - s) * cx + 2 * s * (1 - s) * c1x + s * s * tipX, y: (1 - s) * (1 - s) * cy + 2 * s * (1 - s) * c1y + s * s * tipY });
      for (let i = 0; i <= 10; i++) pts.push(q(i / 10));
      // the feathers, from the tip back to the body, each one longer towards the middle of the wing
      for (let i = 0; i <= FN; i++) { const s = 1 - i / FN, a = q(s), len = up * 0.62 * k * Math.sin(Math.min(1, s * 1.1 + 0.12) * 3.1) * open + 18, dx = side * (0.5 - s) * 40, tip = { x: a.x + dx * 0.5 + side * 8, y: a.y + len }; pts.push(tip); if (i < FN) { const b = q(1 - (i + 1) / FN); pts.push({ x: (tip.x + b.x) / 2 + side * 4, y: (a.y + b.y) / 2 + len * 0.42 }); } }
      return pts;
    };
    let acc = 0;
    return { update(dt, u) { const open = _fxE.o(_fxClamp(u / 0.3, 0, 1)), fade = 1 - _fxClamp((u - 0.74) / 0.26, 0, 1); acc += 240 * dt * F.q * fade; while (acc >= 1) { acc--; const pts = shape(Math.random() < 0.5 ? -1 : 1, 1, open, 0), q = pts[Math.floor(Math.random() * pts.length)]; _fxAdd(F, { x: q.x, y: q.y, vx: _fxR(-30, 30), vy: _fxR(-120, -20), g: -30, dr: 0.7, a: 0, l: _fxR(0.4, 1), s0: _fxR(12, 30), s1: 3, sp: _fxSprite('ember', _fxPick(['#ff6a20', '#ffa030', '#ffd060', '#fff0b0'])), r: 0, add: true, fi: 0.05 }); } },
      draw(g, u) {
        const open = _fxE.b(_fxClamp(u / 0.3, 0, 1)), flap = Math.sin(u * (p.dur || 1) * 3.4) * 0.5, env = _fxEnv(u, 0.06, 0.3);
        g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
        for (const side of [-1, 1]) for (const [k, c, a] of [[1, '#ff5a18', 0.42], [0.86, '#ff8a28', 0.36], [0.68, '#ffb840', 0.34], [0.46, '#ffe080', 0.34], [0.26, '#fff6d0', 0.4]]) {
          const pts = shape(side, k, open, flap); g.fillStyle = c; g.globalAlpha = a * env; g.beginPath(); g.moveTo(cx, cy); for (const q of pts) g.lineTo(q.x, q.y); g.lineTo(cx, cy + 30 * k); g.closePath(); g.fill();
        }
        // the bird between them: a bright body, a long tail of fire
        g.globalAlpha = 0.7 * env; g.fillStyle = '#ffd060'; g.beginPath(); g.moveTo(cx, cy - 70); g.quadraticCurveTo(cx + 34, cy, cx + 8, cy + 120); g.lineTo(cx, cy + 170 + Math.sin(u * 30) * 12); g.lineTo(cx - 8, cy + 120); g.quadraticCurveTo(cx - 34, cy, cx, cy - 70); g.fill();
        g.globalAlpha = 0.9 * env; g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(cx, cy - 66, 20, 0, 7); g.fill(); g.beginPath(); g.moveTo(cx + 14, cy - 76); g.lineTo(cx + 44, cy - 62); g.lineTo(cx + 12, cy - 56); g.fill();
        g.restore(); g.globalAlpha = 1;
      } };
  },
  /* one-shots: the pet, the world, a sound */
  pet: (F, p) => { let did = false; return { update() { if (!did) { did = true; const h = F.host.pet; if (h && h.play) h.play(p.clip, p); } } }; },
  hide: (F, p) => { let did = false; return { update() { if (!did) { did = true; const h = F.host.pet; if (h && h.hide) h.hide(p.on !== false, p.ms); } } }; },
  lift: (F, p) => { let did = false; return { update() { if (!did) { did = true; const h = F.host.pet; if (h && h.lift) h.lift(p.y || 0, (p.dur || 1) * 1000, p.ease); } } }; },
  hop: (F, p) => { let did = false; return { update() { if (!did) { did = true; const h = F.host.pet; if (h && h.hop) { h.hop(F.far); F.P = F.far || F.P; } } } }; },
  far: (F, p) => { let did = false; return { update() { if (!did) { did = true; const h = F.host.pet; F.far = h && h.far ? h.far(p) : { x: F.P.x + 260, y: F.P.y, h: F.P.h }; } } }; },
  nudge: (F, p) => { let did = false; return { update() { if (!did) { did = true; const w = F.host.world; if (w && w.nudge) w.nudge(p.px || 8, (p.dur || 0.5) * 1000); } } }; },
  shake: (F, p) => { let did = false; return { update() { if (!did) { did = true; const w = F.host.world; if (w && w.shake) w.shake(p); } } }; },
  freeze: (F, p) => { let did = false; return { update() { if (!did) { did = true; const w = F.host.world; if (w && w.freeze) w.freeze(p.on !== false); } } }; },
  react: (F, p) => { let did = false; return { update() { if (!did) { did = true; const w = F.host.world; if (w && w.react) w.react(p.clip || 'startled', p); } } }; },
  sound: (F, p) => { let did = false; return { update() { if (!did) { did = true; _fxSound(p.s); } } }; },
  flash: (F, p) => { let did = false; return { update() { if (!did) { did = true; F.flash = p.a == null ? 0.7 : p.a; F.flashC = p.c || '#ffffff'; } } }; },
};
/* ---------- sounds, only when Sounds is on: made here, nothing to download ---------- */
function _fxSoundOn() { try { return typeof _gmG === 'function' && _gmG().prefs.sounds && !document.hidden && (typeof gameOn !== 'function' || gameOn()); } catch (e) { return false; } }
function _fxSound(kind) {
  if (!_fxSoundOn()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = _fxS.ac || (_fxS.ac = new AC()); if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime + 0.01;
    const tone = (f, at, len, peak, type, f2) => { const o = ac.createOscillator(), v = ac.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, now + at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + at + len); v.gain.setValueAtTime(0, now + at); v.gain.linearRampToValueAtTime(peak, now + at + Math.min(0.4, len * 0.25)); v.gain.exponentialRampToValueAtTime(0.0001, now + at + len); o.connect(v); v.connect(ac.destination); o.start(now + at); o.stop(now + at + len + 0.02); };
    const noise = (at, len, peak, fr, fr2) => { const n = ac.sampleRate * len, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.setValueAtTime(fr, now + at); if (fr2) fl.frequency.exponentialRampToValueAtTime(fr2, now + at + len); const v = ac.createGain(); v.gain.setValueAtTime(0, now + at); v.gain.linearRampToValueAtTime(peak, now + at + len * 0.3); v.gain.exponentialRampToValueAtTime(0.0001, now + at + len); s.connect(fl); fl.connect(v); v.connect(ac.destination); s.start(now + at); };
    const S = {
      chime: () => [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.09, 1.1, 0.035, 'triangle')),
      choir: () => [261.63, 329.63, 392, 523.25, 659.25].forEach((f) => { tone(f, 0, 3.2, 0.02, 'sine'); tone(f * 1.005, 0.05, 3.2, 0.012, 'sine'); }),
      night: () => [196, 293.66, 392, 440].forEach((f, i) => tone(f, i * 0.4, 3.4, 0.018, 'sine')),
      whoosh: () => noise(0, 0.8, 0.06, 300, 2400),
      boom: () => { tone(120, 0, 0.8, 0.12, 'sine', 40); noise(0, 0.5, 0.05, 500, 90); },
      roar: () => { tone(90, 0, 1.3, 0.08, 'sawtooth', 55); noise(0, 1.2, 0.05, 700, 220); },
      tick: () => { tone(1800, 0, 0.05, 0.05, 'square'); tone(900, 0.28, 0.05, 0.04, 'square'); },
      sparkle: () => { for (let i = 0; i < 8; i++) tone(_fxR(1500, 3600), i * 0.07, 0.25, 0.014, 'sine'); },
      flame: () => noise(0, 1.6, 0.05, 900, 300),
      pop: () => tone(520, 0, 0.14, 0.06, 'sine', 980),
      splash: () => { noise(0, 0.28, 0.05, 1800, 500); tone(300, 0.02, 0.12, 0.03, 'sine', 140); },
      rise: () => tone(220, 0, 1.6, 0.04, 'sine', 880),
    };
    if (S[kind]) S[kind]();
  } catch (e) { /* no audio here */ }
}

/* ---------- the runner ---------- */
function _fxMotion() { return !(typeof _ptMotionOk === 'function' && !_ptMotionOk()); }
/** Play a spectacle. Only one at a time. Returns {stop()}; o.done when it ends. */
function petFxRun(def, host, o) {
  o = o || {};
  if (_fxS.live) _fxS.live.stop(true);
  const can = document.createElement('canvas'); can.className = 'pfx-canvas'; can.setAttribute('aria-hidden', 'true');
  const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.25) * (def.res || 1);   // res: the soft ones need fewer pixels
  can.width = Math.round(W * dpr); can.height = Math.round(H * dpr);
  document.body.appendChild(can);
  const g = can.getContext('2d'); g.scale(dpr, dpr);
  const small = W < 700, F = { W, H, g, host, parts: [], cap: small ? Math.round(FX_CAP / 2) : FX_CAP, q: small ? 0.6 : 1, P: host.pos(), flash: 0, flashC: '#ffffff', far: null };
  const steps = (def.steps || []).slice().sort((a, b) => a[0] - b[0]).map(([at, kind, p]) => ({ at, kind, p: p || {}, dur: (p && p.dur) || 0, L: null, done: false }));
  const total = def.ms / 1000;
  let t = 0, raf = 0, live = true, slow = 0, last = 0, frames = 0;
  const advance = (dt) => {
    t += dt;
    for (const s of steps) {
      if (s.done || t < s.at) continue;
      if (!s.L) { const mk = PET_FX[s.kind]; if (!mk) { s.done = true; continue; } s.p = Object.assign({}, s.p, { dur: s.dur || 0.0001 }); s.L = mk(F, s.p); }
      const u = s.dur ? _fxClamp((t - s.at) / s.dur, 0, 1) : 1;
      if (s.L.update) s.L.update(dt, u);
      if (u >= 1) s.done = true;
    }
    _fxStep(F, dt);
    if (F.flash > 0) F.flash = Math.max(0, F.flash - dt * 2.2);
  };
  const paint = () => {
    g.clearRect(0, 0, W, H);
    for (const s of steps) { if (s.L && s.L.draw && (!s.done || (s.dur && t - s.at <= s.dur + 0.02)) && t >= s.at) s.L.draw(g, s.dur ? _fxClamp((t - s.at) / s.dur, 0, 1) : 1); }
    _fxDraw(F, g);
    if (F.flash > 0) { g.globalAlpha = Math.min(1, F.flash); g.fillStyle = F.flashC; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  };
  const finish = (quiet) => { if (!live) return; live = false; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); try { if (host.end) host.end(); } catch (e) { /* gone */ } can.remove(); if (_fxS.live === Hn) _fxS.live = null; if (!quiet && o.done) o.done(); };
  const onVis = () => { if (document.hidden) finish(); };
  const Hn = { stop(quiet) { finish(quiet); }, seek(to) { const st = 1 / 30; while (t < to) advance(st); paint(); }, get t() { return t; } };
  _fxS.live = Hn;
  document.addEventListener('visibilitychange', onVis);
  // reduced motion: the telling moment, still, and it fades away; the pet holds its pose
  if (!_fxMotion()) {
    const still = def.still == null ? total * 0.6 : def.still, keepHost = F.host; F.host = { pos: keepHost.pos, outline: keepHost.outline };
    const st = 1 / 20; while (t < still) advance(st); paint();
    can.style.opacity = '0'; try { can.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 2600, easing: 'linear' }); } catch (e) { /* it just shows */ } can.style.opacity = '1';
    setTimeout(() => finish(), 2600);
    return Hn;
  }
  if (o.manual) return Hn;
  const frame = (now) => {
    raf = 0; if (!live) return;
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016); last = now; frames++;
    // every half second: if most frames ran long, fewer pieces and fewer paints. It only ever goes down, and the story still plays in time
    if (dt > 0.024) slow++;
    if (frames % 30 === 0) { if (slow > 15) { F.cap = Math.max(60, Math.round(F.cap * 0.6)); F.q = Math.max(0.35, F.q * 0.75); if (slow > 24) F.skip = Math.min(1, (F.skip || 0) + 1); } slow = 0; }
    advance(dt);
    if (!(F.skip && frames % 2)) paint();
    if (t >= total) { finish(); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return Hn;
}
