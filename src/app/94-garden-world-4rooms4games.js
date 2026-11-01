/* ============================================================
   HIDDEN ROOMS, the small games (the owner: "this is the same across everything"). Nothing in a room is a click that hands out a result: it is the same game as outside (fishing, the net) or one of these.
   A kind of play as in GRM_PLAY: begin, spots, act, and if it needs them frame, up (a button let go), key (true: used), tap (a click on nothing; true: used), lock (true: you stand still).
   _grmGated(game, after): a small game in front of something that pays (a book, a rock, a shelf): when it is done, `after` takes over, and stays open for the day.
   Nothing here is saved or sent: friends in the room each play their own, and a guest gets the words and leaves the thing where it is (_grmPay).
   ============================================================ */
function _grmGated(game, after, opened) {
  return {
    begin(R, S) { after.begin(R, S); S.open = !!S.won || !!(opened && opened(R, S)); if (!S.open) game.begin(R, S); },
    spots(R, S) { return S.open ? after.spots(R, S) : game.spots(R, S).concat(after.spots(R, S).filter(q => q.still)); },
    act(R, S, i) { if (S.open) after.act(R, S, i); else game.act(R, S, i); },
    frame(R, S, dt) { if (!S.open && game.frame) game.frame(R, S, dt); else if (S.open && after.frame) after.frame(R, S, dt); },
    up(R, S) { if (!S.open && game.up) game.up(R, S); },
    key(R, S, k) { return !S.open && game.key ? game.key(R, S, k) : false; },
    tap(R, S, p) { return !S.open && game.tap ? game.tap(R, S, p) : false; },
    lock(R, S) { return !S.open && game.lock ? game.lock(R, S) : false; },
  };
}
/** The small game is done: what it was in front of happens at once. */
function _grmSolved(R, S, after) { S.open = true; try { after.act(R, S, 0); } catch (e) { console.error('[garden rooms]', e); } _grmPaint(); }
const _grmTone = (f, o) => { try { gpTone(Array.isArray(f) ? f : [f], Object.assign({ force: true, len: 0.16, vol: 0.06 }, o)); } catch (e) { /* no sound, no matter */ } };
const _grmQ = (sel) => (_grm.props ? _grm.props.querySelector(sel) : null);

/* ---------- the jars: open two, find the pairs ---------- */
const _GRM_JARS = Object.freeze([
  ['pickle', '#6e8e3a', (A) => A.e(-4, -14, 5, 8, '#8fb04a') + A.e(5, -22, 5, 8, '#a4c25a') + A.e(-3, -30, 4, 6, '#7a9c40')],
  ['button', '#7a5a8a', (A) => [[-5, -12], [5, -19], [-4, -27], [5, -33]].map(([x, y]) => A.c(x, y, 4.2, '#e8d8f0') + A.c(x - 1, y, 0.8, '#5a3a6a') + A.c(x + 1, y, 0.8, '#5a3a6a')).join('')],
  ['sand', '#b89a5a', (A) => A.p('M-11 -6V-22Q0 -28 11 -20V-6Z', '#e8d090') + A.c(-3, -14, 1.2, '#b89a5a') + A.c(4, -11, 1, '#b89a5a')],
  ['fish', '#3f7a8a', (A) => A.p('M-8 -22Q0 -30 8 -22Q0 -14 -8 -22zM8 -22L13 -27V-17Z', '#ffd28a') + A.c(-4, -23, 1, '#222')],
]);
GRM_PLAY.pairs = {
  begin(R, S) {
    const h = gardenRand('rm-pairs|' + _gdToday()), d = [];
    for (let i = 0; i < 8; i++) d.push(i % 4);
    for (let i = 7; i > 0; i--) { const j = Math.floor(h() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    S.deck = d; S.up = []; S.got = new Set(); S.wait = false; S.won = _grmDone(R); if (S.won) d.forEach((_, i) => S.got.add(i));
  },
  spots(R, S) {
    const A = _grmA;
    return R.jars.map((P, i) => {
      const J = _GRM_JARS[S.deck[i]], open = S.up.includes(i) || S.got.has(i);
      return { id: i, x: P[0], y: P[1], w: 58, h: 74, now: true, tip: 'Open this jar', art: A.e(0, 2, 22, 4, '#000', 0.3)
        + A.r(-16, -44, 32, 44, open ? '#cfeee4' : '#3a5a58', open ? 0.34 : 0.92, 7) + (open ? J[2](A) : A.r(-13, -38, 26, 22, '#6a8a80', 0.34, 4) + A.c(-5, -28, 3, '#9ab8ae', 0.35))
        + A.r(-11, -42, 4, 36, '#fff', 0.2, 2) + (open ? `<g transform="translate(14 -50) rotate(32)">${A.r(-13, -3, 26, 7, '#b84a3a', null, 2)}</g>` : A.r(-14, -52, 28, 9, '#a8483a', null, 2) + A.r(-11, -54, 22, 3, '#c86a54', null, 1))
        + (S.got.has(i) ? A.c(0, -60, 5, '#fff4b8', 0.9) : '') };
    });
  },
  act(R, S, i) {
    if (S.won) { _grmSay(_grmDoneLine(R)); return; }
    if (S.wait || S.up.includes(i) || S.got.has(i)) return;
    S.up.push(i); _grmTone(620 + S.deck[i] * 70);
    if (S.up.length === 2) {
      const [a, b] = S.up;
      if (S.deck[a] === S.deck[b]) {
        S.got.add(a); S.got.add(b); S.up = []; _grmTone([700, 880], { gap: 0.09 });
        if (S.got.size === 8) _grmPay(R, R.gotLine);
      } else {
        S.wait = true; _grmSay(R.miss[(a + b) % R.miss.length], 2600);
        setTimeout(() => { if (_grm.S === S) { S.up = []; S.wait = false; _grmPaint(); } }, 1100);
      }
    }
    _grmPaint();
  },
};

/* ---------- the torn map: swap the pieces until the river joins ---------- */
const _grmMapfit = {
  begin(R, S) {
    const h = gardenRand('rm-map|' + R.id + '|' + _gdToday()), o = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let n = 0; n < 40 || o.every((v, i) => v === i); n++) { const a = Math.floor(h() * 9), b = Math.floor(h() * 9); [o[a], o[b]] = [o[b], o[a]]; }
    S.ord = o; S.sel = null; S.mapS = R.mapArt(h);
  },
  spots(R, S) {
    const B = R.board, tw = B.w / 3, th = B.h / 3;
    return S.ord.map((t, i) => {
      const cx = B.x + (i % 3) * tw + tw / 2, cy = B.y + Math.floor(i / 3) * th + th, sx = (t % 3) * tw, sy = Math.floor(t / 3) * th, on = S.sel === i;
      return { id: i, x: cx, y: cy, w: tw, h: th, now: true, tip: 'Move this piece', art: `<svg x="${-tw / 2}" y="${-th}" width="${tw}" height="${th}" viewBox="${sx} ${sy} ${tw} ${th}">${S.mapS}</svg><rect x="${-tw / 2 + 0.6}" y="${-th + 0.6}" width="${tw - 1.2}" height="${th - 1.2}" fill="none" stroke="${on ? '#ffd86a' : '#6a4a2a'}" stroke-width="${on ? 3.4 : 1}" stroke-opacity="${on ? 1 : 0.55}"/>` };
    });
  },
  act(R, S, i) {
    if (S.sel == null) { S.sel = i; _grmTone(520); _grmPaint(); return; }
    if (S.sel !== i) { const a = S.sel; [S.ord[a], S.ord[i]] = [S.ord[i], S.ord[a]]; _grmTone(420); }
    S.sel = null;
    if (S.ord.every((v, k) => v === k)) { _grmTone([523, 659, 784], { gap: 0.1 }); _grmSolved(R, S, GRM_PLAY.serial); return; }
    _grmPaint();
  },
};

/* ---------- the secret knock: listen at the tin, knock it back on the hatch ---------- */
const _grmKnock = {
  begin(R, S) { const h = _grmHash(R, 'knock'); S.pat = [0, 1, 2, 3].map(k => (h >>> (k * 3)) & 1 ? 0.56 : 0.28); S.tap = []; S.lastAt = 0; },
  spots(R, S) {
    const A = _grmA, Q = R.club; let dots = '', x = 0;
    S.pat.forEach((g, i) => { dots += A.c(x, 0, 7, S.tap.length > i ? '#c8483a' : '#3a2a1c'); x += g * 80; });
    dots += A.c(x, 0, 7, S.tap.length > S.pat.length ? '#c8483a' : '#3a2a1c');
    return [
      { id: 'can', x: Q.can[0], y: Q.can[1], w: 70, h: 100, now: true, tip: 'Listen to the knock', art: A.s('M0 -60V-300', '#c8b488', 2.4) + A.r(-15, -60, 30, 44, '#9aa8ac', null, 3) + A.r(-15, -60, 30, 5, '#6a7478') + A.e(0, -16, 15, 4, '#6a7478') + `<text x="0" y="-70" text-anchor="middle" font-size="26">👂</text>` },
      { id: 'sign', still: true, x: Q.sign[0], y: Q.sign[1], w: 0, h: 0, art: A.r(-12, -22, x + 24, 44, '#efe6cc', null, 3) + `<g transform="rotate(${0})">${dots}</g>` },
      { id: 'hatch', x: Q.hatch[0], y: Q.hatch[1], w: 170, h: 130, now: true, tip: 'Knock on the hatch', cls: 'grm-knockb', art: A.r(-78, -118, 156, 118, '#7a5230', null, 6) + A.r(-70, -110, 140, 102, '#92643a', null, 4) + A.s('M-34 -110V-8M0 -110V-8M34 -110V-8', '#5a3a20', 3, 0.6) + A.r(-84, -96, 16, 12, '#3a3a42', null, 2) + A.r(-84, -34, 16, 12, '#3a3a42', null, 2) + A.c(50, -60, 7, '#c8a23a') },
    ];
  },
  act(R, S, id) {
    if (id === 'can') {
      S.tap = []; _grmPaint(); let t = 0; const seq = [0].concat(S.pat.map(g => (t += g)));
      seq.forEach(at => setTimeout(() => { if (_grm.S === S) _grmTone(196, { len: 0.1, vol: 0.14, type: 'square' }); }, at * 1000));
      _grmSay('Listen, then knock the same on the hatch. The dots on the card show the gaps.', 5000);
      return;
    }
    const now = performance.now() / 1000;
    if (now - S.lastAt > 2.2) S.tap = [];
    S.lastAt = now; S.tap.push(now); _grmTone(220, { len: 0.09, vol: 0.14, type: 'square' });
    const n = S.tap.length;
    if (n >= 2) {
      const gap = S.tap[n - 1] - S.tap[n - 2], want = S.pat[n - 2];
      if (Math.abs(gap - want) > 0.17) { S.tap = []; _grmSay('A pause. A small voice says: “That is not the knock.”', 3000); _grmPaint(); return; }
    }
    if (n === S.pat.length + 1) { _grmTone([392, 523], { gap: 0.1 }); _grmSolved(R, S, GRM_PLAY.serial); return; }
    _grmPaint();
  },
  key(R, S, k) { if (k === ' ' || k === 'e' || k === 'Enter') { this.act(R, S, 'hatch'); return true; } return false; },
};

/* ---------- the stove: pump the bellows and keep the needle in the green ---------- */
GRM_PLAY.stoke = {
  begin(R, S) { S.h = 0.25; S.m = 0; S.won = _grmDone(R); },
  spots(R, S) {
    const A = _grmA, T = R.stove, a = -60 + S.h * 120;
    return [
      { id: 'stove', still: true, x: T.x, y: T.y, w: 0, h: 0, art: T.art(S.won)
        + `<g transform="translate(-118 -150)">${A.c(0, 0, 40, '#efe6cc')}${A.c(0, 0, 40, 'none')}<path d="M-20 -34.6A40 40 0 0 1 20 -34.6" fill="none" stroke="#c8d8b0" stroke-width="0"/><path d="${_grmArc(0, 0, 30, -6, 36)}" fill="none" stroke="#5aa84a" stroke-width="9"/><path d="${_grmArc(0, 0, 30, 36, 60)}" fill="none" stroke="#d8483a" stroke-width="9"/><path d="${_grmArc(0, 0, 30, -60, -6)}" fill="none" stroke="#c8c0a8" stroke-width="9"/><g class="grm-needle" transform="rotate(${a.toFixed(0)})">${A.s('M0 4V-30', '#2a2018', 3)}${A.c(0, 0, 5, '#2a2018')}</g></g>` },
      { id: 'bellows', x: T.x + 150, y: T.y, w: 130, h: 110, now: true, tip: 'Pump the bellows', art: `<g class="grm-bel">${A.p('M-50 -36L34 -62L34 -14Z', '#7a4a2a')}${A.p('M-50 -36L34 -10L34 -14L-50 -40z', '#5a3418')}${A.s('M34 -50H58M34 -26H58', '#3a2418', 5)}${A.s('M-50 -36H-74', '#6e7078', 6)}</g>` + A.e(0, 2, 56, 7, '#000', 0.2) },
    ];
  },
  act(R, S) {
    if (S.won) { _grmSay(_grmDoneLine(R)); return; }
    S.h += 0.14; _grmTone(150 + S.h * 80, { len: 0.08, vol: 0.05 });
    const g = _grmQ('.grm-bel'); if (g) { g.setAttribute('transform', 'translate(0 5)'); setTimeout(() => { if (g.isConnected) g.removeAttribute('transform'); }, 110); }
    if (S.h > 1) { S.h = 0.62; S.m *= 0.4; _grmSay(R.overLine, 2600); }
  },
  frame(R, S, dt) {
    if (S.won) return;
    S.h = Math.max(0, S.h - dt * 0.12);
    const inG = S.h >= 0.45 && S.h <= 0.8; S.m = Math.max(0, S.m + (inG ? dt / 6 : -dt / 16));
    const n = _grmQ('.grm-needle'); if (n) n.setAttribute('transform', `rotate(${(-60 + S.h * 120).toFixed(1)})`);
    const f = _grmQ('.grm-fire'); if (f) f.setAttribute('transform', `translate(0 -24) scale(${(0.5 + S.h * 1.1).toFixed(2)})`);
    const st = _grm.props.querySelectorAll('.grm-kettle-s'); st.forEach(e => e.setAttribute('opacity', String(Math.min(1, S.m * 1.3).toFixed(2))));
    if (S.m >= 1) { S.won = true; _grmTone([660, 880, 990], { gap: 0.12, len: 0.4 }); _grmPay(R, R.gotLine); _grmPaint(); if (R.won) R.won(R); }
  },
};
function _grmArc(cx, cy, r, a0, a1) { const p = (a) => { const t = (a - 90) * Math.PI / 180; return `${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + r * Math.sin(t)).toFixed(1)}`; }; return `M${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}`; }

/* ---------- pouring for the mice: hold to pour, let go on the line, three times ---------- */
const _grmPour = {
  begin(R, S) { S.fill = [0, 0, 0]; S.i = 0; S.pouring = false; },
  spots(R, S) {
    const A = _grmA, P = R.pour;
    const cups = P.cups.map((x, i) => { const f = S.fill[i]; return { id: 'c' + i, still: true, x, y: P.y, w: 0, h: 0, art: A.e(0, 2, 26, 5, '#000', 0.25) + A.p('M-22 -56L-18 0H18L22 -56Z', '#c8ccd0') + A.p('M-17 -50L-14 -6H14L17 -50Z', '#3a3430') + `<rect class="grm-lv grm-lv${i}" x="-15" y="${(-6 - f * 44).toFixed(1)}" width="30" height="${(f * 44).toFixed(1)}" fill="#c87a3a"/>` + A.r(-20, -46, 40, 2, '#ffd86a') + A.r(-20, -38, 40, 2, '#ffd86a') + [[-22, -46], [-22, -38]].map(([, y]) => A.r(-27, y - 1, 5, 4, '#ffd86a')).join('') + A.e(0, -56, 22, 4, '#e8ecf0') + (i === S.i ? A.p('M-7 -74L7 -74L0 -64z', '#ffd86a') : '') }; });
    const x = P.cups[Math.min(2, S.i)];
    return cups.concat([{ id: 'pot', x: x + 54, y: P.y - 70, w: 150, h: 110, now: true, tip: 'Hold to pour', art: `<g class="grm-pot">${A.e(0, -40, 34, 28, '#b8843a')}${A.c(-12, -66, 6, '#7a5a2a')}${A.p('M-30 -40Q-52 -48 -56 -66L-46 -66Q-42 -54 -24 -52Z', '#a8743a')}${A.s('M32 -54Q52 -40 32 -24', '#7a5a2a', 5)}</g><path class="grm-stream" d="M-56 -64Q-58 -30 -54 ${70 - 8}" fill="none" stroke="#c87a3a" stroke-width="4" opacity="0"/>` }]);
  },
  act(R, S) { if (_grmCrop() || gpVisiting()) { S.pouring = true; } else _grmSay(R.emptyLine); },
  up(R, S) {
    if (!S.pouring) return; S.pouring = false;
    const st = _grmQ('.grm-stream'); if (st) st.setAttribute('opacity', '0');
    const f = S.fill[S.i];
    if (f >= 0.72 && f <= 0.94) { _grmTone(700 + S.i * 90); S.i += 1; if (S.i >= 3) { _grmTone([660, 880], { gap: 0.1 }); _grmSolved(R, S, GRM_PLAY.give); return; } _grmPaint(); }
    else if (f > 0.94) { S.fill[S.i] = 0; _grmSay(R.spillLine, 2500); _grmPaint(); }
  },
  frame(R, S, dt) {
    if (!S.pouring) return;
    S.fill[S.i] = Math.min(1.02, S.fill[S.i] + dt * 0.42);
    const f = S.fill[S.i], e = _grmQ('.grm-lv' + S.i); if (e) { e.setAttribute('y', (-6 - Math.min(1, f) * 44).toFixed(1)); e.setAttribute('height', (Math.min(1, f) * 44).toFixed(1)); }
    const st = _grmQ('.grm-stream'); if (st) st.setAttribute('opacity', '1');
    if (f >= 1.02) { S.pouring = false; S.fill[S.i] = 0; _grmSay(R.spillLine, 2500); _grmPaint(); }
  },
  key(R, S, k) { if (k === ' ' || k === 'e' || k === 'Enter') { this.act(R, S); return true; } return false; },
};

/* ---------- the lamp: take hold, find the boat in the dark, hold the beam on it ---------- */
GRM_PLAY.beam = {
  begin(R, S) {
    const h = _grmHash(R, 'beam'); S.on = false; S.bx = 480; S.ox = 160 + (h % 640); S.vx = (h >> 4) % 2 ? 26 : -26; S.m = 0; S.won = _grmDone(R); S.t = 0;
    const move = (ev) => { if (S.on && _grm.S === S) { const p = _grmPt(ev); S.bx = Math.max(60, Math.min(900, p.x)); } };
    _grm.root.addEventListener('pointermove', move);
  },
  spots(R, S) {
    const A = _grmA, L = R.lamp;
    return [
      { id: 'beam', still: true, x: 0, y: 0, w: 0, h: 0, art: `<path class="grm-beamp" d="" fill="#fff4b8" opacity="${S.on ? 0.3 : 0}"/><g class="grm-boat" opacity="${S.won ? 1 : 0}" transform="translate(${S.ox} ${L.sea})">${A.p('M-30 -8H30L22 6H-22Z', '#b8623a')}${A.s('M0 -8V-34', '#f2e4c8', 2.4)}${A.p('M0 -34L18 -14H0Z', '#f4efe0')}${A.s('M-9 -9L-14 -24', '#e8c8a8', 3)}${A.c(-9, -16, 4, '#e8c8a8')}</g>` },
      { id: 'lamp', x: L.x, y: L.y, w: 130, h: 170, now: true, tip: S.on ? 'Let go of the lamp' : 'Take hold of the lamp', art: A.r(-40, -70, 80, 70, '#7a7468', null, 4) + A.e(0, -126, 54, 62, '#e8f4f8', 0.5) + A.s('M-54 -126H54M-48 -96H48M-48 -156H48', '#bfe0e8', 2, 0.7) + A.e(0, -126, 30, 40, '#fff7c8', 0.95) + A.flame(0, -108, 1.5) + A.glow(0, -126, 170, 0.45) + `<circle class="grm-beamm" cx="0" cy="-126" r="60" fill="none" stroke="#ffd86a" stroke-width="7" stroke-dasharray="${(S.m * 377).toFixed(0)} 377" transform="rotate(-90 0 -126)"/>` },
    ];
  },
  act(R, S) {
    if (S.won) { _grmSay(_grmDoneLine(R)); return; }
    S.on = !S.on; if (S.on) _grmSay(R.holdLine, 6000); _grmPaint();
  },
  tap(R, S) { return S.on; },
  lock(R, S) { return S.on; },
  frame(R, S, dt) {
    if (S.won) return;
    S.t += dt;
    if (S.on) {
      const K = _grm.keys; S.bx = Math.max(60, Math.min(900, S.bx + ((K.has('ArrowRight') || K.has('d') ? 1 : 0) - (K.has('ArrowLeft') || K.has('a') ? 1 : 0)) * 360 * dt));
      S.ox += S.vx * dt * (gardenMotionOn() ? 1 : 0); if (S.ox < 90 || S.ox > 870) S.vx = -S.vx;
      const d = Math.abs(S.bx - S.ox), lit = d < 70;
      S.m = Math.max(0, Math.min(1, S.m + (lit ? dt / 3 : -dt / 7)));
      const L = R.lamp, B = _grmQ('.grm-beamp'), b = _grmQ('.grm-boat'), mm = _grmQ('.grm-beamm');
      if (B) { B.setAttribute('d', `M${L.x - 20} ${L.y - 126}L${S.bx - 90} ${L.sea + 16}H${S.bx + 90}L${L.x + 20} ${L.y - 126}Z`); B.setAttribute('opacity', '0.32'); }
      if (b) { b.setAttribute('transform', `translate(${S.ox.toFixed(1)} ${L.sea})`); b.setAttribute('opacity', (lit ? 1 - d / 90 : 0).toFixed(2)); }
      if (mm) mm.setAttribute('stroke-dasharray', `${(S.m * 377).toFixed(0)} 377`);
      if (S.m >= 1) { S.on = false; S.won = true; _grmTone([523, 659, 784, 1046], { gap: 0.12, len: 0.4 }); _grmPay(R, R.gotLine); _grmPaint(); }
    }
  },
};

/* ---------- the heap: fork the hay, and the rattle tells you how near you are ---------- */
GRM_PLAY.fork = {
  begin(R, S) { const H = R.hay, n = H.cols * H.rows; S.key = _grmHash(R, 'fork') % n; S.dug = new Map(); S.left = R.forks; S.won = _grmDone(R); if (S.won) S.dug.set(S.key, 9); },
  spots(R, S) {
    const A = _grmA, H = R.hay, out = [], r = gardenRand('rm-hay|' + _gdToday());
    for (let j = 0; j < H.rows; j++) for (let i = 0; i < H.cols; i++) {
      const id = j * H.cols + i, x = H.x0 + (i + 0.5) * H.cw + (j % 2) * 16, y = H.y0 + (j + 1) * H.ch, c = ['#c8a44a', '#d8b65a', '#b8923e'][Math.floor(r() * 3)], d = S.dug.get(id);
      if (d == null) out.push({ id, x, y, w: H.cw + 8, h: H.ch + 40, now: true, tip: 'Fork this heap', art: A.p(`M${-H.cw * 0.62} 0Q${-H.cw * 0.5} ${-H.ch * 0.9} 0 ${-H.ch * 1.15}Q${H.cw * 0.5} ${-H.ch * 0.9} ${H.cw * 0.62} 0Z`, c) + [0, 1, 2, 3, 4].map(k => A.s(`M${-26 + k * 13} -4q${(k - 2) * 2} ${-14 - k % 2 * 8} ${(k - 2) * 5} ${-24}`, '#8a6a2a', 1.4, 0.5)).join('') });
      else out.push({ id: 'd' + id, still: true, x, y, w: 0, h: 0, art: A.e(0, -2, H.cw * 0.42, 8, '#5a4228', 0.7) + (d === 9 ? `<g transform="translate(0 -18)">${A.s('M-16 0H10M4 0V9M10 0V7', '#3a3a42', 4)}${A.c(-20, 0, 8, 'none')}<circle cx="-20" cy="0" r="7" fill="none" stroke="#3a3a42" stroke-width="4"/></g>` : [0, 1, 2].slice(0, d).map(k => A.c(-14 + k * 14, -18, 4.6, '#ffd86a')).join('')) });
    }
    return out;
  },
  act(R, S, id) {
    if (S.won) { _grmSay(_grmDoneLine(R)); return; }
    const H = R.hay, ix = id % H.cols, iy = Math.floor(id / H.cols), kx = S.key % H.cols, ky = Math.floor(S.key / H.cols), far = Math.max(Math.abs(ix - kx), Math.abs(iy - ky));
    _grmTone(130 + Math.random() * 40, { len: 0.07, vol: 0.05, type: 'sawtooth' });
    if (id === S.key) { S.dug.set(id, 9); _grmPay(R, R.gotLine); _grmPaint(); if (R.won) R.won(R); return; }
    S.dug.set(id, far === 1 ? 3 : far === 2 ? 2 : 1); S.left -= 1;
    _grmSay(far === 1 ? 'Something rattles, right next to you! (Three marks: very near.)' : far === 2 ? 'Something shifts, further along. (Two marks: not far.)' : R.miss[id % R.miss.length] + ' (One mark: nothing near.)', 3400);
    if (S.left <= 0) { S.dug.clear(); S.left = R.forks; _grmSay('The whole heap slides back. Fork it again: it is still in there.', 4000); }
    _grmPaint();
  },
};

/* ---------- the block of ice: slide it to the straw. It only stops against something ---------- */
const _GRM_ICE = Object.freeze([
  { pegs: [[2, 1], [4, 0], [1, 3], [5, 2]], goal: [3, 3] },
  { pegs: [[1, 0], [3, 2], [5, 3], [0, 2]], goal: [4, 0] },
  { pegs: [[2, 3], [4, 1], [0, 1], [3, 0]], goal: [5, 1] },
]);
function _grmIceMove(L, x, y, dx, dy, W, H) { for (;;) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || L.pegs.some(p => p[0] === nx && p[1] === ny)) return [x, y]; x = nx; y = ny; } }
const _grmSlide = {
  begin(R, S) {
    const h = _grmHash(R, 'ice'), L = _GRM_ICE[h % _GRM_ICE.length], W = 6, H = 4;
    // a start the block can get home from, a few moves away
    const dist = new Map(), start = [], back = [[L.goal[0], L.goal[1], 0]];
    const seen = (x, y) => x + ',' + y;
    const all = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!L.pegs.some(p => p[0] === x && p[1] === y)) all.push([x, y]);
    const bfs = (sx, sy) => { const q = [[sx, sy, 0]], m = new Set([seen(sx, sy)]); while (q.length) { const [x, y, d] = q.shift(); if (x === L.goal[0] && y === L.goal[1]) return d; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const [a, b] = _grmIceMove(L, x, y, dx, dy, W, H); if (!m.has(seen(a, b))) { m.add(seen(a, b)); q.push([a, b, d + 1]); } } } return -1; };
    for (const c of all) { const d = bfs(c[0], c[1]); dist.set(seen(c[0], c[1]), d); if (d >= 2) start.push({ c, d }); }
    void back;
    start.sort((a, b) => b.d - a.d || a.c[0] - b.c[0]);
    const pick = start[(h >>> 8) % Math.max(1, Math.min(4, start.length))] || { c: [0, 0] };
    S.L = L; S.x = pick.c[0]; S.y = pick.c[1]; S.px = S.x; S.py = S.y; S.grip = false; S.W = W; S.H = H; S.n = 0;
  },
  at(R, x, y) { const G = R.ice; return [G.x0 + (x + 0.5) * G.cw + (G.skew || 0) * (y - 1.5), G.y0 + (y + 1) * G.ch]; },
  spots(R, S) {
    const A = _grmA, G = R.ice, self = _grmSlide, out = []; let f = '';
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const [px, py] = self.at(R, x, y); f += A.r(px - G.cw / 2 + 1, py - G.ch + 1, G.cw - 2, G.ch - 2, (x + y) % 2 ? '#d8eef6' : '#c4e0ee', 0.86, 3); }
    { const [gx, gy] = self.at(R, S.L.goal[0], S.L.goal[1]); f += A.r(gx - G.cw / 2 + 4, gy - G.ch + 3, G.cw - 8, G.ch - 6, '#d8b65a', null, 3); for (let i = 0; i < 9; i++) f += A.s(`M${gx - 30 + i * 7} ${gy - 8 - (i % 3) * 7}l9 -3`, '#8a6a2a', 1.6); }
    for (const [x, y] of S.L.pegs) { const [px, py] = self.at(R, x, y); f += A.e(px, py - 4, 24, 8, '#000', 0.2) + A.blob(px, py - 16, 24, 18, 'p' + x + y, 0.3, '#7a8a94') + A.e(px - 6, py - 22, 9, 5, '#a8b8c0'); }
    out.push({ id: 'ice', still: true, x: 0, y: 0, w: 0, h: 0, art: f });
    const [bx, by] = self.at(R, S.px, S.py);
    out.push({ id: 'blk', still: true, x: 0, y: 0, w: 0, h: 0, art: `<g class="grm-block" transform="translate(${bx} ${by})">${A.e(0, -2, 34, 8, '#000', 0.25)}${A.r(-30, -52, 60, 48, '#bfe6f4', 0.95, 6)}${A.p('M-30 -52L-18 -62H40L30 -52Z', '#e4f6fc')}${A.p('M30 -52L40 -62V-14L30 -4Z', '#94c8dc')}${A.s('M-20 -40L-6 -20M4 -44L14 -30', '#fff', 2.4, 0.8)}</g>` });
    for (const [id, dx, dy, a] of [['r', 1, 0, 0], ['l', -1, 0, 180], ['d', 0, 1, 90], ['u', 0, -1, 270]]) {
      const [q, w] = _grmIceMove(S.L, S.x, S.y, dx, dy, S.W, S.H); if (q === S.x && w === S.y) continue;
      out.push({ id, x: bx + dx * 62, y: by - 18 + dy * 40 + 22, w: 54, h: 44, now: true, tip: 'Push the block this way', art: `<g transform="translate(0 -22) rotate(${a})">${A.c(0, 0, 18, '#1a3a4a', 0.82)}${A.p('M-8 -7L8 0L-8 7Z', '#ffe9a8')}</g>` });
    }
    return out;
  },
  act(R, S, id) {
    const D = { r: [1, 0], l: [-1, 0], d: [0, 1], u: [0, -1] }[id]; if (!D) return;
    const [a, b] = _grmIceMove(S.L, S.x, S.y, D[0], D[1], S.W, S.H); if (a === S.x && b === S.y) return;
    S.grip = true; S.x = a; S.y = b; S.n += 1; _grmTone(240, { len: 0.22, vol: 0.05, type: 'triangle' }); S.moving = true;
  },
  frame(R, S, dt) {
    if (!S.moving) return;
    const dx = S.x - S.px, dy = S.y - S.py, d = Math.hypot(dx, dy), st = Math.min(d, dt * 9);
    if (d < 0.01) {
      S.px = S.x; S.py = S.y; S.moving = false;
      if (S.x === S.L.goal[0] && S.y === S.L.goal[1]) { _grmTone([523, 659, 784], { gap: 0.1 }); _grmSolved(R, S, GRM_PLAY.keep); return; }
      _grmPaint(); return;
    }
    S.px += dx / d * st; S.py += dy / d * st;
    const g = _grmQ('.grm-block'); if (g) { const [x, y] = this.at(R, S.px, S.py); g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); }
  },
  key(R, S, k) { const id = { ArrowRight: 'r', ArrowLeft: 'l', ArrowDown: 'd', ArrowUp: 'u' }[k]; if (id && S.grip && !S.moving) { this.act(R, S, id); return true; } return false; },
  tap(R, S) { S.grip = false; return false; },
  lock(R, S) { return !!S.grip; },
};

/* ---------- the moss: tufts come up on the bare rock. Press them in before they dry ---------- */
const _grmPatch = {
  begin(R, S) { S.on = false; S.hits = 0; S.cur = -1; S.until = 0; S.wait = 0; },
  spots(R, S) {
    const A = _grmA, out = [];
    if (!S.on) out.push({ id: 'go', x: R.tend.x, y: R.tend.y, w: 120, h: 90, tip: 'Pick up a handful of moss', art: R.tend.art() });
    else {
      out.push({ id: 'pips', still: true, x: R.tend.x, y: R.tend.y, w: 0, h: 0, art: [0, 1, 2, 3, 4].map(i => A.c(-44 + i * 22, -30, 8, i < S.hits ? '#6eb060' : '#2a3a2e')).join('') });
      if (S.cur >= 0) { const [x, y] = R.tufts[S.cur]; out.push({ id: 'tuft', x, y, w: 90, h: 80, now: true, tip: 'Press it in', cls: 'grm-pop', art: A.e(0, 2, 34, 12, '#3a5a3a', 0.6) + A.e(-12, -8, 22, 13, '#6eb060') + A.e(12, -10, 20, 12, '#8acc78') + A.e(0, -18, 16, 10, '#a4dc90') }); }
    }
    return out;
  },
  act(R, S, id) {
    if (id === 'go') { S.on = true; S.wait = 0.5; _grmSay(R.holdLine, 4000); _grmPaint(); return; }
    if (id !== 'tuft' || S.cur < 0) return;
    S.hits += 1; S.cur = -1; S.wait = 0.45; _grmTone(420 + S.hits * 70, { len: 0.14 });
    if (S.hits >= 5) { _grmTone([523, 784], { gap: 0.1 }); _grmSolved(R, S, GRM_PLAY.grow); return; }
    _grmPaint();
  },
  frame(R, S, dt) {
    if (!S.on) return;
    if (S.cur >= 0) { S.until -= dt; if (S.until <= 0) { S.cur = -1; S.wait = 0.4; _grmPaint(); } return; }
    S.wait -= dt; if (S.wait <= 0) { S.cur = Math.floor(Math.random() * R.tufts.length); S.until = 1.7; _grmPaint(); }
  },
};

/* ---------- in the mist: every sign points at the same place. Walk there and the book is waiting ---------- */
GRM_PLAY.mistway = {
  begin(R, S) {
    GRM_PLAY.grow.begin(R, S);
    const h = _grmHash(R, 'way'), F = R.floor; S.tx = F.x0 + 260 + (h % (F.x1 - F.x0 - 300)); S.ty = F.y0 + 14 + ((h >>> 9) % (F.y1 - F.y0 - 20)); S.found = S.won;
  },
  spots(R, S) {
    const A = _grmA, out = [];
    for (const [x, y] of R.posts) {
      const d = S.tx >= x ? 1 : -1;
      out.push({ id: 'p' + x, still: true, x, y, w: 0, h: 0, art: A.e(0, 2, 16, 4, '#6a6a80', 0.22) + A.r(-3, -96, 6, 96, '#7a6a58') + `<g transform="translate(0 -84) scale(${d} 1)">${A.p('M0 -9H44L56 0L44 9H0Z', '#efe6cc')}${A.s('M6 0H34', '#7a6a58', 2)}</g>` });
    }
    out.push({ id: 'grown', still: true, x: 0, y: 0, w: 0, h: 0, art: R.grown(gpVisiting() ? Math.max(3, S.n) : S.n) });
    if (S.found) out.push({ id: 'book', x: S.tx, y: S.ty, w: 120, h: 100, tip: R.tip, art: A.glow(0, -40, 90, 0.8) + R.tend.art() });
    return out;
  },
  act(R, S) { if (S.won) { _grmSay(_grmDoneLine(R)); return; } GRM_PLAY.grow.act(R, S); },
  frame(R, S) {
    if (S.found || !_grm.me) return;
    if (Math.hypot(_grm.me.x - S.tx, (_grm.me.y - S.ty) * 1.2) < 70) { S.found = true; _grmTone([523, 784], { gap: 0.12 }); _grmSay(R.foundLine, 5000); _grmPaint(); }
  },
};

/* The rooms' plays made of two parts. Named here, used by the rows in 94-garden-world-5rooms.js. */
GRM_PLAY.mapBook = _grmGated(_grmMapfit, GRM_PLAY.serial);
GRM_PLAY.knockBook = _grmGated(_grmKnock, GRM_PLAY.serial);
GRM_PLAY.mossGrow = _grmGated(_grmPatch, GRM_PLAY.grow);
GRM_PLAY.pourGive = _grmGated(_grmPour, GRM_PLAY.give);
GRM_PLAY.iceKeep = _grmGated(_grmSlide, GRM_PLAY.keep, (R, S) => !!S.k && S.d === _gdToday());
