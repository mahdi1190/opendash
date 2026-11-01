/* ============================================================
   HIDDEN ROOMS (the owner: "more easter eggs like rooms we can enter"). Small places you walk into, drawn over the garden like the room behind the garden (94-garden-world-3back.js), whose people and walking they share.
   This file is the engine and the things you can do in a room (GRM_PLAY, with its small games in 94-garden-world-4rooms4games.js). The rooms are one row each in GRM_ROOMS (94-garden-world-5rooms.js), their doors and symbols in 94-garden-world-6doors.js. Fishing and netting in a room are the real game (94-garden-world-4rooms3water.js).

     gardenRoomItems(id, items)   a bubble on the land is opening: rows for a door on this sight or feature (94-garden-lands-3page.js)
     gardenRoomHear(A, ev)        somebody else went in, walked or left (gl:fx 'hall' with `i`, the room's id: the same event as the stage, which has no `i`)
     gardenRoomTell(fid)          the host: tell a person who has just arrived where you are

   A friend is not pulled in. They see you go, with a button to follow, and from then on you see each other walk.
   SAVES: nothing new. Marks are gpSet ('rm.<room>.<what>'), gifts are ledger lines: _grGive once a day per room (inside GP_ECON and GR_ECON.matDay), gpGrant once ever. Never coins. As a guest nothing is saved and nothing is paid: it is your friend's.
   ============================================================ */
const GRM = Object.freeze({ W: 960, H: 600, U: 16, speed: 200, floor: Object.freeze({ x0: 44, x1: 916, y0: 400, y1: 556 }), door: Object.freeze({ x: 66, y: 540, x0: 14, x1: 112, y0: 396, y1: 560 }), spawn: Object.freeze({ x: 160, y: 500 }), firstFind: Object.freeze({ ticket: 3 }) });
const GRM_WORDS = Object.freeze({ ticket: 'tickets', 'mat:peg': 'survey pegs', 'mat:timber': 'timber', 'mat:stone': 'field stone', 'mat:reed': 'reeds' });
const _grm = { on: false, closing: false, R: null, S: null, root: null, svg: null, actors: null, props: null, game: null, school: null, bugL: null, raf: 0, last: 0, t: 0, m: new Map(), me: null, keys: new Set(), sentAt: 0, sayT: 0, chipT: 0 };

/* ---------- marks and gifts ---------- */
function _grmG(R, k, d) { return gpGet('rm.' + R.id + '.' + k, d); }
function _grmP(R, k, v) { if (!gpVisiting()) gpSet('rm.' + R.id + '.' + k, v); }
function _grmDone(R) { return !gpVisiting() && _grmG(R, 'p') === _gdToday(); }
function _grmHash(R, salt) { return gardenHash('room|' + R.id + '|' + (salt || '') + '|' + _gdToday()); }
function _grmSay(text, ms) {
  // what somebody says or a page reads, in quotation marks, stays on the room's strip at the bottom. Any other message is the same line as everywhere
  if (!/[“”]/.test(String(text)) && gardenMessage(text, { ms })) return;
  const el = _grm.root && _grm.root.querySelector('.grm-say'); if (!el) return;
  el.textContent = text; el.classList.remove('is-gone');
  clearTimeout(_grm.sayT); _grm.sayT = setTimeout(() => el.classList.add('is-gone'), ms || Math.max(5000, String(text).length * 75));
}
function _grmGiftWords(gift) { return Object.entries(gift).filter(([k]) => GRM_WORDS[k]).map(([k, n]) => `${n} ${n === 1 ? GRM_WORDS[k].replace(/^(ticket|survey peg)s$/, '$1') : GRM_WORDS[k]}`).join(', '); }
/** The day's gift for this room. say: what happened. A guest gets the words and leaves the thing where it is. */
function _grmPay(R, say, gift) {
  const S = _grm.S; if (S) S.won = true;
  if (gpVisiting()) { _grmSay(say + ' It is your friend’s, so you leave it where it is.'); return false; }
  _grmP(R, 'p', _gdToday());
  const G = Object.assign({}, gift || R.gift); let listed = false;
  try { const A = _gdAct(), t = _gdToday(); if (A.days.has(t) && A.days.get(t).n > 0) { G.ticket = (G.ticket || 0) + 1; listed = true; } } catch (e) { /* no list here */ }   // you got something done on your list today: one more ticket
  const got = _grGive('room.' + R.id, G);
  if (got) { try { _glSound('twinkle'); gardenTickSoon(); } catch (e) { /* no sound, no matter */ } }
  const w = _grmGiftWords(G);
  _grmSay(say + (got && w ? ` You take away ${w}${listed ? ', one of them for what you got done on your list today' : ''}.` : ' Your pockets are full for today, but it will all be here tomorrow.'));
  return got;
}
function _grmOnce(R, k, items) { return !gpVisiting() && gpGrant('rm-' + R.id + '-' + k, items); }
/** The crop you have most of, or ''. */
function _grmCrop() { let best = '', n = 0; for (const [k, v] of Object.entries(gardenWallet().items)) if (k.startsWith('crop:') && v > n) { best = k; n = v; } return best; }
function _grmCropName(k) { const p = gardenPlant(String(k).slice(5)); return p ? p.name.toLowerCase() : 'something you picked'; }
function _grmDoneLine(R) { return R.doneLine || 'Nothing more here today. Come back tomorrow.'; }
function _grmAsk(q, opts, pick) {
  const el = _grm.root && _grm.root.querySelector('.grm-ask'); if (!el) return;
  el.innerHTML = ''; el.appendChild(gpEl('p', 'grm-q', q));
  opts.forEach((o, i) => { const b = gpEl('button', 'btn btn-secondary btn-sm', o); b.type = 'button'; b.onclick = () => { el.innerHTML = ''; pick(i); }; el.appendChild(b); });
}

/* ---------- what there is to do: spots(R, S) is what you can click, act(R, S, id) is a click, begin(R, S) sets up the day, frame(R, S, dt) only if it moves ---------- */
const GRM_PLAY = {
  /* A book that gets one page further each day you come. */
  serial: {
    begin(R, S) { S.n = _grmG(R, 'n', 0); S.won = _grmDone(R); },
    spots(R, S) { return [{ id: 0, x: R.book.x, y: R.book.y, w: 120, h: 110, tip: R.tip, art: R.book.art(S.n) }]; },
    act(R, S) {
      const P = R.pages, last = P.length - 1;
      if (S.won) { _grmSay(P[Math.min(Math.max(0, S.n - 1), last)] + ' The next page is stuck until tomorrow.'); return; }
      const i = S.n; S.n++; _grmP(R, 'n', S.n);
      const first = i <= last, page = first ? P[i] : P[_grmHash(R) % P.length];
      _grmPay(R, page, first ? R.gift : R.after);
      if (i === last && R.end && _grmOnce(R, 'end', R.end.items)) setTimeout(() => _grmSay(R.end.say, 9000), 7000);
      _grmPaint();
    },
  },
  /* Play the marks on the wall, in order: a different tune each day. */
  tune: {
    begin(R, S) { const h = _grmHash(R); S.seq = []; for (let k = 0; k < 4; k++) { let v = (h >>> (k * 5)) % R.things.length; if (k && v === S.seq[k - 1]) v = (v + 1 + (h >>> (k + 20)) % (R.things.length - 1)) % R.things.length; S.seq.push(v); } S.i = 0; S.won = _grmDone(R); },   // (never the same note twice running: that was no tune)
    spots(R, S) { return R.things.map((t, i) => ({ id: i, x: t.x, y: t.y, w: t.w || 90, h: t.h || 130, now: true, tip: R.tip, art: t.art(S.hot === i) })).concat([{ id: 'chart', x: R.chart.x, y: R.chart.y, w: 0, h: 0, art: R.chart.art(S.seq, S.i), still: true }]); },
    act(R, S, i) {
      gpTone([R.things[i].f], { force: true, type: R.wave || 'triangle', len: R.len || 0.7, vol: 0.12 });
      S.hot = i; _grmPaint(); setTimeout(() => { if (_grm.S === S) { S.hot = null; _grmPaint(); } }, 260);
      if (S.won) return;
      if (i === S.seq[S.i]) { S.i++; if (S.i >= S.seq.length) { _grmPay(R, R.gotLine); gpTone(S.seq.map(q => R.things[q].f), { force: true, type: R.wave || 'triangle', gap: 0.24, len: 0.7, vol: 0.1 }); } }
      else { S.i = i === S.seq[0] ? 1 : 0; _grmSay(R.missLine); }
      _grmPaint();
    },
  },
  /* Five wicks on one wire: touch one and it and its neighbours change. Light them all. */
  wicks: {
    begin(R, S) {
      const h = _grmHash(R); S.l = [true, true, true, true, true]; S.won = _grmDone(R);
      if (S.won) return;
      const flip = (i) => { for (const j of [i - 1, i, i + 1]) if (j >= 0 && j < 5) S.l[j] = !S.l[j]; };
      flip(h % 5); flip((h % 5 + 1 + (h >>> 4) % 4) % 5);
    },
    spots(R, S) { return [{ id: 'dim', still: true, x: 0, y: 0, w: 0, h: 0, art: R.dim ? R.dim(S.l.filter(Boolean).length) : '' }].concat(S.l.map((on, i) => ({ id: i, x: 280 + i * 100, y: 330, w: 80, h: 110, now: true, tip: R.tip, art: R.wick(on) }))); },
    act(R, S, i) {
      if (S.won) { _grmSay(_grmDoneLine(R)); return; }
      for (const j of [i - 1, i, i + 1]) if (j >= 0 && j < 5) S.l[j] = !S.l[j];
      gpTone([520 + i * 60], { force: true, len: 0.16, vol: 0.05 });
      if (S.l.every(Boolean)) _grmPay(R, R.gotLine);
      _grmPaint();
    },
  },
  /* Something that grows by one each day you come. It stays. */
  grow: {
    begin(R, S) { S.n = _grmG(R, 'n', 0); S.won = _grmDone(R); },
    spots(R, S) { return [{ id: 0, x: R.tend.x, y: R.tend.y, w: 120, h: 110, tip: R.tip, art: R.tend.art(S.won) }, { id: 'grown', x: 0, y: 0, w: 0, h: 0, art: R.grown(gpVisiting() ? Math.max(3, S.n) : S.n), still: true }]; },
    act(R, S) {
      if (S.won) { _grmSay(_grmDoneLine(R)); return; }
      S.n = Math.min(R.max, S.n + 1); _grmP(R, 'n', S.n);
      _grmPay(R, R.lines[Math.min(S.n, R.lines.length) - 1]);
      if (S.n >= R.goal && R.end && _grmOnce(R, 'end', R.end.items)) setTimeout(() => _grmSay(R.end.say, 9000), 7000);
      _grmPaint();
    },
  },
  /* A question about what you have seen out on the land. One try a day. */
  quiz: {
    begin(R, S) { S.won = _grmDone(R); },
    spots(R, S) { return [{ id: 0, x: R.who.x, y: R.who.y, w: 130, h: 170, tip: R.tip, art: R.who.art(S.won) }]; },
    act(R, S) {
      if (S.won) { _grmSay(_grmDoneLine(R)); return; }
      const h = _grmHash(R), Q = R.qs[h % R.qs.length], turn = (h >>> 8) % 3, opts = [0, 1, 2].map(i => Q.a[(i + turn) % 3]);
      _grmAsk(Q.q, opts, (i) => {
        if (opts[i] === Q.a[0]) { _grmPay(R, R.gotLine); S.won = true; _grmPaint(); return; }
        _grmP(R, 'p', _gdToday()); S.won = true; _grmPaint();
        _grmSay(R.missLine, 8000);
      });
    },
  },
  /* Three mirrors: turn each until the light goes on. */
  mirrors: {
    begin(R, S) { const h = _grmHash(R); S.want = [h % 3, (h >>> 3) % 3, (h >>> 6) % 3]; S.won = _grmDone(R); S.a = S.won ? S.want.slice() : S.want.map(w => (w + 1) % 3); },
    spots(R, S) {
      let upto = 0; while (upto < 3 && S.a[upto] === S.want[upto]) upto++;
      return R.at3.map((m, i) => ({ id: i, x: m.x, y: m.y, w: 90, h: 120, now: true, tip: R.tip, art: R.mirror(S.a[i]) })).concat([{ id: 'ray', x: 0, y: 0, w: 0, h: 0, art: R.ray(upto), still: true }]);
    },
    act(R, S, i) {
      if (S.won) { _grmSay(_grmDoneLine(R)); return; }
      S.a[i] = (S.a[i] + 1) % 3; gpTone([700 + i * 90], { force: true, len: 0.1, vol: 0.05 });
      if (S.a.every((v, k) => v === S.want[k])) _grmPay(R, R.gotLine);
      _grmPaint();
    },
  },
  /* They would like something you picked. */
  give: {
    begin(R, S) { S.won = _grmDone(R); },
    spots(R, S) { return [{ id: 0, x: R.who.x, y: R.who.y, w: 150, h: 130, tip: R.tip, art: R.who.art(S.won) }]; },
    act(R, S) {
      if (S.won) { _grmSay(_grmDoneLine(R)); return; }
      if (gpVisiting()) { _grmSay(R.guestLine); return; }
      const k = _grmCrop(); if (!k) { _grmSay(R.emptyLine); return; }
      _gdLed('pl', { i: { [k]: -1 }, n: 1, w: 'room' }); _gdSave();
      _grmPay(R, R.gotLine.replace('{crop}', _grmCropName(k))); _grmPaint();
    },
  },
  /* Leave something today. It is here tomorrow, and a little more. */
  keep: {
    begin(R, S) { S.k = _grmG(R, 'k', ''); S.d = _grmG(R, 'kd', ''); S.won = _grmDone(R); },
    spots(R, S) { return [{ id: 0, x: R.box.x, y: R.box.y, w: 170, h: 130, tip: R.tip, art: R.box.art(!!S.k) }]; },
    act(R, S) {
      if (gpVisiting()) { _grmSay(R.guestLine); return; }
      if (S.k) {
        if (S.d === _gdToday()) { _grmSay(R.waitLine); return; }
        const k = S.k; _gdLed('pl', { i: { [k]: 1 }, n: 1, w: 'room' }); _gdSave();
        S.k = ''; _grmP(R, 'k', ''); _grmPay(R, R.gotLine.replace('{crop}', _grmCropName(k))); _grmPaint(); return;
      }
      if (S.won) { _grmSay(_grmDoneLine(R)); return; }
      const k = _grmCrop(); if (!k) { _grmSay(R.emptyLine); return; }
      _gdLed('pl', { i: { [k]: -1 }, n: 1, w: 'room' }); _gdSave();
      S.k = k; S.d = _gdToday(); _grmP(R, 'k', k); _grmP(R, 'kd', S.d);
      _grmSay(R.leftLine.replace('{crop}', _grmCropName(k))); _grmPaint();
    },
  },
  /* The kinds that live in this room, as real bugs: the same ones all day. Creep up and swing. */
  net: {
    begin(R, S) { S.bugs = _grbMake(R, S); S.won = _grmDone(R); },
    spots() { return []; },
    frame() { _grbFrame(_grm.dtNow); },
    act() {},
  },
  /* Stop it when the mark comes round, three times. */
  catchIt: {
    begin(R, S) { S.a = 0; S.hits = 0; S.goal = (_grmHash(R) % 6) * Math.PI / 3; S.won = _grmDone(R); },
    spots(R, S) { return [{ id: 0, x: R.lever.x, y: R.lever.y, w: 130, h: 150, now: true, tip: R.tip, art: R.lever.art(S.hits) }, { id: 'wheel', x: R.wheel.x, y: R.wheel.y, w: 0, h: 0, art: R.wheel.art(S.goal), still: true }]; },
    frame(R, S, dt) {
      if (S.won) return;
      S.a = (S.a + dt * (1.5 + S.hits * 0.7)) % (Math.PI * 2);
      const g = _grm.props && _grm.props.querySelector('.grm-turn'); if (g) g.setAttribute('transform', `rotate(${(S.a * 180 / Math.PI).toFixed(1)})`);
    },
    act(R, S) {
      if (S.won) { _grmSay(_grmDoneLine(R)); return; }
      const d = Math.abs(Math.atan2(Math.sin(S.a - S.goal), Math.cos(S.a - S.goal)));
      if (d > 0.42) { S.hits = 0; _grmSay(R.missLine); gpTone([180], { force: true, len: 0.2, vol: 0.07 }); _grmPaint(); return; }
      S.hits++; gpTone([360 + S.hits * 110], { force: true, len: 0.2, vol: 0.08 }); S.goal = (S.goal + Math.PI * (0.6 + S.hits * 0.3)) % (Math.PI * 2);
      if (S.hits >= 3) _grmPay(R, R.gotLine);
      _grmPaint();
    },
  },
};

/* ---------- drawing what you can click ---------- */
function _grmPaint() {
  const R = _grm.R, S = _grm.S; if (!R || !_grm.props) return;
  let s = '';
  for (const q of _grmAllSpots(R, S)) {
    if (q.still) { s += `<g transform="translate(${q.x} ${q.y})">${q.art}</g>`; continue; }
    s += `<g class="grm-spot${q.cls ? ' ' + q.cls : ''}" data-s="${q.id}" transform="translate(${q.x} ${q.y})"><title>${esc(q.tip || '')}</title><rect x="${-q.w / 2}" y="${-q.h}" width="${q.w}" height="${q.h}" fill="transparent"/>${q.art}</g>`;
  }
  _grm.props.innerHTML = s;
}
function _grmSpot(id) { return _grmAllSpots(_grm.R, _grm.S).find(q => String(q.id) === String(id) && !q.still) || null; }
function _grmAct(id) {
  if (_grmExtraAct(id)) return;
  const n = /^\d+$/.test(String(id)) ? Number(id) : id;
  try { GRM_PLAY[_grm.R.play].act(_grm.R, _grm.S, n); } catch (e) { console.error('[garden rooms]', e); }
}

/* ---------- people: the stage's figures and steps (_eeFigure, _eeMove, _eePaint) ---------- */
function _grmMake(M) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ee-p' + (M.me ? ' is-me' : ''));
  g.innerHTML = '<ellipse class="ee-pshadow" cx="0" cy="1" rx="17" ry="4.6"/><g class="ee-pb"><g class="ee-pin"></g></g><text class="ee-pname" y="-112" text-anchor="middle"></text>';
  g.querySelector('.ee-pname').textContent = M.me ? 'You' : M.n;
  M.g = g; M.bob = g.querySelector('.ee-pb'); M.in = g.querySelector('.ee-pin'); M.key = '';
  _grm.actors.appendChild(g);
}
function _grmAdd(A, x, y) {
  const M = { w: A.w, n: String(A.n || 'A friend').slice(0, 40), a: A.a || null, x, y, tx: null, ty: null, face: 1, dir: 'e', moving: false, me: false, ph: (A.w || 0) * 1.3 };
  _grm.m.set(A.w, M); _grmMake(M);
  return M;
}
function _grmClamp(x, y) {
  const F = (_grm.R && _grm.R.floor) || GRM.floor; let cx = Math.max(F.x0, Math.min(F.x1, x)), cy = Math.max(F.y0, Math.min(F.y1, y));
  const w = _grwa.w;
  if (w) for (const [ex, ey, rx, ry] of w.e) {   // you walk round the water, not over it
    const a = (cx - ex) / rx, b = (cy - ey) / ry, n = Math.hypot(a, b);
    if (n < 1 && n > 0) { cx = ex + a / n * rx; cy = ey + b / n * ry; }
    else if (n === 0) cy = ey - ry;
  }
  for (const [bx, by, rx, ry] of (_grm.R && _grm.R.blocks) || []) {   // what stands on the floor
    const a = (cx - bx) / rx, b = (cy - by) / ry, n = Math.hypot(a, b);
    if (n < 1 && n > 0) { cx = bx + a / n * rx; cy = by + b / n * ry; }
  }
  return { x: Math.max(F.x0, Math.min(F.x1, cx)), y: Math.max(F.y0, Math.min(F.y1, cy)) };
}
function _grmSend(x, y, e) {
  try { if (typeof gardenLiveFx === 'function' && _grm.R) gardenLiveFx('hall', e || 'at', { i: _grm.R.id, x: Math.max(0, Math.min(59, Math.round(x / GRM.U))), y: Math.max(0, Math.min(37, Math.round(y / GRM.U))) }); } catch (err) { /* only a message */ }
}

/* ---------- the loop ---------- */
function _grmFrame(ts) {
  _grm.raf = 0;
  if (!_grm.on) return;
  if (!_gw.on) { gardenRoomLeave(); return; }
  const dt = Math.min(0.05, _grm.last ? (ts - _grm.last) / 1000 : 0.016); _grm.last = ts; _grm.t += dt; _grm.dtNow = dt;
  const M = _grm.me, K = _grm.keys, t = _grm.t, P0 = GRM_PLAY[_grm.R.play], locked = _gwFishBusy() || (P0.lock && P0.lock(_grm.R, _grm.S));
  let vx = (K.has('ArrowRight') || K.has('d') ? 1 : 0) - (K.has('ArrowLeft') || K.has('a') ? 1 : 0), vy = (K.has('ArrowDown') || K.has('s') ? 1 : 0) - (K.has('ArrowUp') || K.has('w') ? 1 : 0);
  if (locked) { M.moving = false; if (M.tx != null && !_gwFishBusy()) M.tx = M.ty = null; }   // a line out, or a game in your hands: you stand still
  else if (vx || vy) {
    const n = Math.hypot(vx, vy); vx /= n; vy /= n; M.tx = M.ty = null; M.go = null;
    const speed = K.has('shift') ? GRB.sneak : GRM.speed;
    const p = _grmClamp(M.x + vx * speed * dt, M.y + vy * speed * dt * 0.8); M.x = p.x; M.y = p.y; M.moving = true; M.keyed = true;
    if (vx) M.face = vx > 0 ? 1 : -1; M.dir = Math.abs(vx) >= Math.abs(vy) ? 'e' : vy > 0 ? 's' : 'n';
    if (ts - _grm.sentAt > 420) { _grm.sentAt = ts; _grmSend(M.x + vx * 70, M.y + vy * 50); }
  } else {
    if (M.keyed) { M.keyed = false; M.moving = false; _grmSend(M.x, M.y); }
    const x0 = M.x, y0 = M.y;
    _eeMove(M, dt, M.net || K.has('shift') ? GRB.sneak : GRM.speed);
    if (M.tx != null) { const c = _grmClamp(M.x, M.y); M.x = c.x; M.y = c.y; if (Math.hypot(M.x - x0, M.y - y0) < 0.1) { M.stuck = (M.stuck || 0) + dt; if (M.stuck > 0.5) { M.tx = M.ty = null; M.stuck = 0; } } else M.stuck = 0; }   // (round the water; stopped dead, you stop)
    if (M.tx == null && M.go) { const go = M.go; M.go = null; go(); if (!_grm.on) return; }
  }
  _grmPaintFig(M, t);
  for (const [w, Q] of _grm.m) {
    if (!_gll.actors.has(w)) { Q.g.remove(); if (Q.fxr) Q.fxr.remove(); _grm.m.delete(w); continue; }
    _eeMove(Q, dt, GRM.speed * 1.2); _grmPaintFig(Q, t);
  }
  const P = P0; if (P.frame) P.frame(_grm.R, _grm.S, dt);
  _grmExtraFrame(ts);
  if (_grwa.w) _grwFishFrame(dt);
  const all = [..._grm.m.values(), M].sort((a, b) => a.y - b.y), kids = _grm.actors.children;
  if (all.some((r, i) => kids[i] !== r.g)) for (const r of all) _grm.actors.appendChild(r.g);
  _grm.raf = requestAnimationFrame(_grmFrame);
}
function _grmStartLoop() { if (_grm.on && !_grm.raf && !document.hidden) { _grm.last = 0; _grm.raf = requestAnimationFrame(_grmFrame); } }

/* ---------- walking and clicking ---------- */
function _grmPt(ev) {
  const r = _grm.svg.getBoundingClientRect(), k = Math.min(r.width / GRM.W, r.height / GRM.H);
  return { x: (ev.clientX - (r.left + (r.width - GRM.W * k) / 2)) / k, y: (ev.clientY - (r.top + (r.height - GRM.H * k) / 2)) / k };
}
function _grmWalk(x, y, go) {
  const M = _grm.me, p = _grmClamp(x, y);
  M.tx = p.x; M.ty = p.y; M.go = go || null; M.keyed = false;
  _grmSend(p.x, p.y);
}
function _grmClick(ev) {
  if (!_grm.on || _grm.closing || (ev.target.closest && ev.target.closest('.ee-ui, .grm-ask, .grm-bag, .gd-fishhud-b, .gd-catchcard'))) return;
  if (_gwFishBusy()) { _gwFishPress(true); return; }   // a line out: the click is the strike, as outside
  const a = _grm.root.querySelector('.grm-ask'); if (a) a.innerHTML = '';
  if (_grmCarryClick(ev)) return;
  const sp = ev.target.closest && ev.target.closest('[data-s]'), p = _grmPt(ev), D = GRM.door, R = _grm.R, F = R.floor || GRM.floor, P = GRM_PLAY[R.play];
  if (sp) {
    const id = sp.getAttribute('data-s'), q = _grmSpot(id);
    if (q && q.now) { _grmAct(id); return; }   // part of a game in front of you
    if (q) { _grmWalk(q.x, Math.max(q.y + 26, F.y0 + 8), () => _grmAct(id)); return; }
  }
  if (P.tap && P.tap(R, _grm.S, p)) return;
  if (p.x >= D.x0 - 6 && p.x <= D.x1 + 6 && p.y >= D.y0 - 20 && p.y <= D.y1 + 6) { _grmWalk(D.x, D.y, gardenRoomLeave); return; }
  if (_grwa.w && _grwIn(_grwa.w, p.x, p.y)) { _grwCastAt(p.x, p.y); return; }
  if (R.play === 'net' && _grm.S.bugs) {   // a bug is small: near enough counts
    let best = null, bd = 56; for (const b of _grm.S.bugs) { const d = Math.hypot(b.x - p.x, b.y - (b.lift || 0) - p.y); if (d < bd) { bd = d; best = b; } }
    if (best) { _grbChase(best); return; }
  }
  _grmWalk(p.x, p.y);
}
function _grmUp() { if (!_grm.on) return; const P = GRM_PLAY[_grm.R.play]; if (P.up) P.up(_grm.R, _grm.S); }
function _grmKey(ev) {
  if (!_grm.on || ev.ctrlKey || ev.metaKey || ev.altKey || /^F\d+$/.test(ev.key)) return;
  const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key, down = ev.type === 'keydown';
  if (ev.target && ev.target.closest && ev.target.closest('.ee-ui, .grm-ask, .grm-bag') && k !== 'Escape') return;   // a button you are on is yours to use
  ev.stopImmediatePropagation();
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', ' ', 'Enter', 'Escape', 'e'].includes(k)) ev.preventDefault();
  if (k === 'Shift') { if (down) _grm.keys.add('shift'); else _grm.keys.delete('shift'); return; }
  const busy = _gwFishBusy();
  if (!down) { _grm.keys.delete(k); if (k === ' ' || k === 'e' || k === 'Enter' || (k === 'ArrowUp' && busy)) { _gwFishRelease(); _grmUp(); } return; }
  if (k === 'Escape') { if (busy) { _gwFishCancel(); return; } gardenRoomLeave(); return; }
  if (ev.repeat && (k === ' ' || k === 'e' || k === 'Enter')) return;
  if (busy) { if (k === ' ' || k === 'e' || k === 'Enter') _gwFishPress(); else if (k === 'ArrowUp' && _gw.reel) _gw.reel.hold = true; return; }   // as outside: strike, then hold to lift the bar
  { const P = GRM_PLAY[_grm.R.play]; if (P.key && P.key(_grm.R, _grm.S, k)) return; }
  if (k === 'e' || k === 'Enter' || k === ' ') {
    const M = _grm.me;
    if (Math.hypot(M.x - GRM.door.x, M.y - GRM.door.y) < 70) { gardenRoomLeave(); return; }
    let best = null, bd = 130;
    for (const q of _grmAllSpots(_grm.R, _grm.S)) { if (q.still) continue; const d = Math.hypot(M.x - q.x, Math.max(0, M.y - q.y)); if (d < bd) { bd = d; best = q; } }
    if (best) { _grmAct(best.id); return; }
    if (_grm.R.play === 'net') { _grbSwingNear(); return; }
    if (_grwa.w) _grwFront();
    return;
  }
  _grm.keys.add(k);
}

/* ---------- coming in and going out ---------- */
/**
 * A room's picture in layers. One picture with one thing moving in it (the person breathing is enough) is laid out, painted and put on the screen again, all of it, every frame: on a 165 Hz screen a fifth of a core with nothing happening.
 * So what never moves goes in a picture of its own, on its own layer, and is drawn once. What moves goes in pictures between them, in the order the room drew them, with the people on top as before.
 * One viewBox for all of them, so they line up at any window size; only the top one takes the pointer. A little still detail between two moving things stays with them, or a room would be a dozen layers.
 */
const GRM_MOVES = /(^|\s)(grm-(tw|mote|rip|ray|bub|cloud|spray|sail|fall|steam|sway|drip|dripr|glowp|pop|fire)|ee-flame)(\s|$)/;
const GRM_LAYERS_MAX = 7;
function _grmMoves(el) {
  if (GRM_MOVES.test(el.getAttribute('class') || '')) return true;
  for (const k of el.querySelectorAll('[class]')) if (GRM_MOVES.test(k.getAttribute('class'))) return true;
  return false;
}
function _grmArtLayers(R, root) {
  const NS = 'http://www.w3.org/2000/svg', top = root.querySelector('.ee-svg'), art = document.createElementNS(NS, 'svg');
  art.innerHTML = R.art();
  _grmMergeMotion(art);
  const runs = [];
  for (const el of [...art.children]) {
    const moves = el.tagName.toLowerCase() !== 'defs' && _grmMoves(el), last = runs[runs.length - 1];
    if (last && last.moves === moves) last.els.push(el); else runs.push({ moves, els: [el] });
  }
  // never more than a few layers: each one costs the graphics card a window's worth of memory, so the smallest still parts join what moves next to them until it fits (the lamp room would be 41)
  let out = [];
  for (let small = 6; ; small *= 2) {
    out = [];
    for (const r of runs) {
      const prev = out[out.length - 1];
      if (prev && (prev.moves === r.moves || (!r.moves && r.els.length < small))) prev.els = prev.els.concat(r.els);
      else out.push({ moves: r.moves, els: r.els });
    }
    if (out.length <= GRM_LAYERS_MAX || small > 1000) break;
  }
  for (const r of out) {
    const svg = document.createElementNS(NS, 'svg'), g = document.createElementNS(NS, 'g');
    svg.setAttribute('class', 'ee-svg grm-layer' + (r.moves ? '' : ' is-still')); svg.setAttribute('viewBox', `0 0 ${GRM.W} ${GRM.H}`); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet'); svg.setAttribute('aria-hidden', 'true');
    g.setAttribute('clip-path', 'url(#grmc)'); for (const el of r.els) g.appendChild(el);
    svg.appendChild(g); root.insertBefore(svg, top);
  }
}
/**
 * The little things that come and go (motes, twinkles, ripples, bubbles, spray, steam, clouds) were one animation each: 159 in the grotto, and the browser styled every one of them every frame.
 * A run of them side by side now moves in a few groups, each one animation on its own beat: the same specks in the same places.
 * Only for a thing with no transform of its own (a moving one overrode it, and in a group it would apply). The things on the list move by nothing that depends on their own box.
 */
const GRM_MERGE = Object.freeze({ 'grm-tw': 3.6, 'grm-mote': 9, 'grm-rip': 4.2, 'grm-bub': 5, 'grm-spray': 1.5, 'grm-steam': 2.4, 'grm-cloud': 26 });
const GRM_MERGE_OWN_LOOK = new Set(['grm-mote', 'grm-cloud']);   // these move and do not fade: their own opacity stays theirs
function _grmMergeMotion(svg) {
  const NS = 'http://www.w3.org/2000/svg', beats = 5;
  for (const [cls, cycle] of Object.entries(GRM_MERGE)) {
    const seen = new Set();
    for (const first of svg.querySelectorAll('.' + cls)) {
      if (seen.has(first)) continue;
      const run = []; for (let n = first; n && n.classList.contains(cls) && !n.hasAttribute('transform'); n = n.nextElementSibling) { run.push(n); seen.add(n); }
      if (run.length < 3) continue;
      const groups = new Map(), parent = run[0].parentNode, at = run[run.length - 1].nextSibling;
      for (const el of run) {
        const del = Math.abs(parseFloat(el.style.animationDelay) || 0), dur = parseFloat(el.style.animationDuration) || 0, b = Math.floor(((del % cycle) / cycle) * beats) % beats;
        let G = groups.get(b);
        if (!G) { G = document.createElementNS(NS, 'g'); G.setAttribute('class', cls); G.style.animationDelay = '-' + (b * cycle / beats).toFixed(2) + 's'; if (dur) G.style.animationDuration = dur + 's'; if (!GRM_MERGE_OWN_LOOK.has(cls) && el.hasAttribute('opacity')) G.setAttribute('opacity', el.getAttribute('opacity')); groups.set(b, G); }
        el.removeAttribute('class'); el.style.animationDelay = ''; el.style.animationDuration = ''; if (!el.style.length) el.removeAttribute('style');
        if (!GRM_MERGE_OWN_LOOK.has(cls)) el.removeAttribute('opacity');
        G.appendChild(el);
      }
      for (const G of groups.values()) parent.insertBefore(G, at);
    }
  }
}
function _grmMayEnter() { return !_grm.on && !_grm.closing && !(typeof _ee !== 'undefined' && _ee.on) && !!(typeof _gw !== 'undefined' && _gw.on && _gw.box); }
function _grmMarkFound(R) {
  if (gpVisiting()) return false;
  const today = _gdToday(), first = !_grmG(R, 'f');
  if (first) _grmP(R, 'f', today);
  if (_grmG(R, 'v') !== today) { _grmP(R, 'v', today); _grmP(R, 'c', (Number(_grmG(R, 'c', 0)) || 0) + 1); }
  return first && _grmOnce(R, 'found', GRM.firstFind);
}
function gardenRoomEnter(R) {
  if (!_grmMayEnter() || !R) return false;
  try { _gw.keys.clear(); _gw.path = []; gardenBubbleClose(); if (typeof _gwFishBusy === 'function' && _gwFishBusy()) _gwFishCancel(''); } catch (e) { /* not in the way */ }
  const root = document.createElement('div'); root.className = `ee-room grm-room grm-r-${R.id}`; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', R.name);
  const w = _grwOf(R), clipW = w ? `<clipPath id="grmwc">${w.e.map(([x, y, a, b]) => `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}"/>`).join('')}</clipPath>` : '';
  root.innerHTML = `<svg class="ee-svg" viewBox="0 0 ${GRM.W} ${GRM.H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><clipPath id="grmc"><rect width="${GRM.W}" height="${GRM.H}"/></clipPath>${clipW}<g clip-path="url(#grmc)">${_grmDoorArt(R)}${w ? `<g class="grm-school" clip-path="url(#grmwc)"><g class="grm-school-in" transform="scale(${GRW.k})"></g></g>${R.waterTop ? R.waterTop() : ''}` : ''}<g class="grm-props"></g><g class="grm-bugs"></g></g><g class="ee-actors"></g>${R.front ? `<g clip-path="url(#grmc)">${R.front()}</g>` : ''}<g class="grm-game" transform="scale(${GRW.k})"></g></svg>`
    + `<div class="ee-ui"><button type="button" class="btn btn-secondary btn-sm ee-leave">${icon('log-out')}<span>Leave</span></button>${R.furnish && !gpVisiting() ? `<button type="button" class="btn btn-secondary btn-sm grm-furn">${icon('armchair')}<span>Furnish</span></button>` : ''}</div><div class="grm-bag"></div><div class="grm-ask"></div><p class="grm-say" role="status"></p>`;
  _grmArtLayers(R, root);
  root.style.background = R.edge ? `linear-gradient(${R.edge[0]}, ${R.edge[1]})` : (R.bg || '');
  document.body.appendChild(root);
  _grm.root = root; _grm.svg = root.querySelector('.ee-svg:not(.grm-layer)'); _grm.actors = root.querySelector('.ee-actors'); _grm.props = root.querySelector('.grm-props'); _grm.game = root.querySelector('.grm-game'); _grm.school = root.querySelector('.grm-school-in'); _grm.bugL = root.querySelector('.grm-bugs');
  _grwa.w = w;
  _grm.R = R; _grm.S = {}; _grm.fu = false; _grm.carry = ''; _grm.icons = null; _grm.fuKey = ''; _grm.fuAt = 0; _grm.m.clear(); _grm.keys.clear(); _grm.t = 0; _grm.last = 0; _grm.closing = false;
  GRM_PLAY[R.play].begin(R, _grm.S);
  _grmPaint();
  const sp0 = R.spawn || GRM.spawn, p0 = _grmClamp(sp0.x + Math.random() * 40 - 20, sp0.y + Math.random() * 24 - 12);
  const me = { w: -1, n: 'You', a: (function () { try { return typeof profileGet === 'function' ? profileGet().avatar : null; } catch (e) { return null; } })(), x: p0.x, y: p0.y, tx: null, ty: null, face: 1, dir: 'e', moving: false, me: true, ph: 0 };
  _grm.me = me; _grmMake(me); _grm.on = true; _grmPaintFig(me, 0);
  _grwStock(R);
  root.addEventListener('pointerdown', _grmClick); window.addEventListener('pointerup', _grmUp); window.addEventListener('pointercancel', _grmUp);
  root.querySelector('.ee-leave').onclick = () => gardenRoomLeave();
  { const fb = root.querySelector('.grm-furn'); if (fb) fb.onclick = () => gardenRoomFurnish(); }
  window.addEventListener('keydown', _grmKey, true); window.addEventListener('keyup', _grmKey, true);
  document.addEventListener('visibilitychange', _grmStartLoop);
  requestAnimationFrame(() => root.classList.add('is-on'));
  const first = _grmMarkFound(R);
  _grmSay(R.say + (first ? ' You have not been here before: you find 3 tickets on the way in.' : ''), 9000);
  if (R.how) { clearTimeout(_grm.howT); _grm.howT = setTimeout(() => { if (_grm.R === R && !_gwFishBusy()) _grmSay(R.how, 9000); }, 9200); }
  _grmStartLoop();
  clearTimeout(_grm.hideT); _grm.hideT = setTimeout(() => { if (_grm.on) _gwIndoors(true); }, 760);   // (once the room has faded in: .7s, .ee-room)
  _grmSend(me.x, me.y, 'in');
  return true;
}
function gardenRoomLeave() {
  if (!_grm.on || _grm.closing) return;
  try { if (_gwFishBusy()) _gwFishCancel(); gardenMomentEnd(); _gwReelClose(); } catch (e) { /* nothing was out */ }   // (while the helpers still answer for the room)
  _grwFishForget();
  _grmSend(0, 0, 'out');
  _grm.closing = true; _grm.on = false;
  window.removeEventListener('keydown', _grmKey, true); window.removeEventListener('keyup', _grmKey, true);
  window.removeEventListener('pointerup', _grmUp); window.removeEventListener('pointercancel', _grmUp);
  document.removeEventListener('visibilitychange', _grmStartLoop);
  cancelAnimationFrame(_grm.raf); _grm.raf = 0; clearTimeout(_grm.sayT); clearTimeout(_grm.howT); clearTimeout(_grm.hideT);
  _gwIndoors(false);
  const root = _grm.root;
  if (root) { root.classList.remove('is-on'); root.classList.add('is-out'); setTimeout(() => root.remove(), 420); }
  { const S = _grm.S; if (S && S.leave) S.leave(); }
  for (const Q of _grm.m.values()) if (Q.fxr) Q.fxr.remove();
  _grm.root = _grm.svg = _grm.actors = _grm.props = _grm.game = _grm.school = _grm.bugL = _grm.me = _grm.R = _grm.S = null; _grwa.w = null; _grm.m.clear(); _grm.keys.clear(); _grm.carry = ''; _grm.fu = false;
  setTimeout(() => { _grm.closing = false; }, 450);
  try { if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop(); } catch (e) { /* the garden's own loop */ }
}

/* ---------- doors: rows in a bubble ---------- */
function gardenRoomItems(id, items) {
  for (const R of GRM_ROOMS) if (R.at === id) items.push({ svg: gardenRoomSym(R, 26), label: R.verb, cls: 'is-go grm-way', run: () => gardenRoomGo(R) });
}

/* ---------- other people ---------- */
function _grmShow(A, inside) { try { if (A.root) A.root.style.visibility = inside ? 'hidden' : ''; } catch (e) { /* only a look */ } }
function gardenRoomHear(A, ev) {
  if (!A || A.me || !ev) return;
  const e = String(ev.e || ''), R = GRM_ROOMS.find(r => r.id === ev.i); if (!R) return;
  if (e === 'out') { A.rm = ''; _grmShow(A, false); const Q = _grm.m.get(A.w); if (Q && _grm.R === R) { Q.g.remove(); if (Q.fxr) Q.fxr.remove(); _grm.m.delete(A.w); } return; }
  if ((e !== 'in' && e !== 'at') || !Number.isInteger(ev.x) || !Number.isInteger(ev.y)) return;
  _grmShow(A, true); A.rm = R.id;
  if (typeof _gll !== 'undefined' && _gll.role === 'host') _grwStock(R);   // (a fish for them, from whoever runs the water)
  if (!_grm.on || _grm.R !== R) { if (e === 'in') _grmChip(A, R); return; }
  const x = ev.x * GRM.U, y = ev.y * GRM.U;
  let Q = _grm.m.get(A.w);
  if (!Q) Q = _grmAdd(A, x, y);
  Q.a = A.a || Q.a; Q.n = String(A.n || Q.n).slice(0, 40);
  if (e === 'in') { Q.x = x; Q.y = y; Q.tx = Q.ty = null; if (_grm.me) _grmSend(_grm.me.x, _grm.me.y); }   // (somebody new: they see where you are)
  else { Q.tx = x; Q.ty = y; }
}
/** Someone went in somewhere: a quiet line in the corner, and a way to follow them. Never a pull. */
function _grmChip(A, R) {
  const box = typeof _gw !== 'undefined' ? _gw.box : null; if (!box || !_gw.on) return;
  let c = box.querySelector(':scope > .grm-chip');
  if (!c) { c = gpEl('div', 'grm-chip'); box.appendChild(c); }
  c.innerHTML = gardenRoomSym(R, 26);   // (the same picture as the door)
  c.appendChild(gpEl('span', null, `${String(A.n || 'A friend').slice(0, 40)} went into ${R.name.replace(/^The /, 'the ')}`));
  const b = gpEl('button', 'btn btn-secondary btn-sm', 'Go in too'); b.type = 'button'; b.onclick = () => { c.remove(); gardenRoomGo(R, true); }; c.appendChild(b);
  clearTimeout(_grm.chipT); _grm.chipT = setTimeout(() => c.remove(), 14000);
}
function gardenRoomTell(fid) {
  if (!_grm.on || !_grm.me || typeof _glhSend !== 'function' || !/^[A-Za-z0-9_-]{1,64}$/.test(String(fid || ''))) return;
  const say = () => { if (_grm.on && _grm.me && !_grm.closing) _glhSend(fid, 'fx', { c: 'hall', e: 'in', i: _grm.R.id, x: Math.max(0, Math.min(59, Math.round(_grm.me.x / GRM.U))), y: Math.max(0, Math.min(37, Math.round(_grm.me.y / GRM.U))) }); };
  setTimeout(say, 1500); setTimeout(say, 6000);
}

/* ---------- the shared kit for drawing a room ---------- */
const _grmA = Object.freeze({
  r: (x, y, w, h, f, o, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${o != null ? ` opacity="${o}"` : ''}${rx ? ` rx="${rx}"` : ''}/>`,
  c: (x, y, r, f, o) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${o != null ? ` opacity="${o}"` : ''}/>`,
  e: (x, y, a, b, f, o) => `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${f}"${o != null ? ` opacity="${o}"` : ''}/>`,
  p: (d, f, o) => `<path d="${d}" fill="${f}"${o != null ? ` opacity="${o}"` : ''}/>`,
  s: (d, c, w, o) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${o != null ? ` opacity="${o}"` : ''}/>`,
  /* the room's shell: wall and floor from two pairs of colours */
  shell: (w0, w1, f0, f1) => `<defs><linearGradient id="grmw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w0}"/><stop offset="1" stop-color="${w1}"/></linearGradient><linearGradient id="grmf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f0}"/><stop offset="1" stop-color="${f1}"/></linearGradient><radialGradient id="grmg"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="960" height="392" fill="url(#grmw)"/><rect y="392" width="960" height="208" fill="url(#grmf)"/><rect y="388" width="960" height="8" fill="#000" opacity=".28"/>`,
  /* a pool of light */
  glow: (x, y, r, o) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#grmg)" opacity="${o}"/>`,
  flame: (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k || 1})"><path class="ee-flame" d="M0 0Q-8 -10 0 -24Q8 -10 0 0z" fill="#ffa02e"/><path class="ee-flame" d="M0 -2Q-3.6 -8 0 -15Q3.6 -8 0 -2z" fill="#ffe59a"/></g>`,
  /* rows of stone blocks across a wall */
  stones(y0, y1, c, o) { let s = ''; for (let y = y0, r = 0; y < y1; y += 42, r++) for (let x = (r % 2) * -48; x < 960; x += 96) s += `<rect x="${x + 2}" y="${y + 2}" width="92" height="38" rx="5" fill="${c}" opacity="${o}"/>`; return s; },
  planks(y0, y1, c, o, gap) { let s = ''; for (let x = 0; x < 960; x += gap || 62) s += `<rect x="${x}" y="${y0}" width="3" height="${y1 - y0}" fill="${c}" opacity="${o}"/>`; return s; },
  /* one pseudo-random stream per room: the same picture every time */
  rng: (seed) => gardenRand('grm-art|' + seed),
  lin: (id, stops, x2, y2) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2 == null ? 0 : x2}" y2="${y2 == null ? 1 : y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`,
  rad: (id, stops, cx, cy, r) => `<radialGradient id="${id}" cx="${cx == null ? 0.5 : cx}" cy="${cy == null ? 0.5 : cy}" r="${r == null ? 0.5 : r}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`,
  /* a soft shape: an uneven rounded outline */
  blob(cx, cy, rx, ry, seed, wob, f, o) { const r = gardenRand('grm-b|' + seed), n = 12, P = []; for (let i = 0; i < n; i++) { const a = i / n * 6.283, k = 1 + (r() - 0.5) * (wob == null ? 0.3 : wob); P.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } const m = (a, b) => `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`; let d = 'M' + m(P[n - 1], P[0]); for (let i = 0; i < n; i++) d += `Q${P[i][0].toFixed(1)} ${P[i][1].toFixed(1)} ${m(P[i], P[(i + 1) % n])}`; return `<path d="${d}z" fill="${f}"${o != null ? ` opacity="${o}"` : ''}/>`; },
  /* little lights that come and go */
  twinkles(n, seed, x0, x1, y0, y1, c, k) { const r = gardenRand('grm-t|' + seed); let s = ''; for (let i = 0; i < n; i++) s += `<circle class="grm-tw" cx="${(x0 + r() * (x1 - x0)).toFixed(0)}" cy="${(y0 + r() * (y1 - y0)).toFixed(0)}" r="${((k || 1.6) * (0.6 + r() * 0.8)).toFixed(1)}" fill="${c}" style="animation-delay:-${(r() * 5).toFixed(1)}s"/>`; return s; },
  /* specks hanging in the light, drifting */
  motes(n, seed, x0, x1, y0, y1, c, o) { const r = gardenRand('grm-m|' + seed); let s = ''; for (let i = 0; i < n; i++) s += `<circle class="grm-mote" cx="${(x0 + r() * (x1 - x0)).toFixed(0)}" cy="${(y0 + r() * (y1 - y0)).toFixed(0)}" r="${(0.9 + r() * 1.6).toFixed(1)}" fill="${c}" opacity="${o || 0.6}" style="animation-delay:-${(r() * 9).toFixed(1)}s;animation-duration:${(7 + r() * 7).toFixed(1)}s"/>`; return s; },
  fern(x, y, k, c, flip) { let s = ''; for (const [a, l] of [[-70, 44], [-40, 58], [-10, 66], [18, 60], [46, 48], [74, 34]]) { const r = a * Math.PI / 180, ex = Math.sin(r) * l, ey = -Math.cos(r) * l; s += `<path d="M0 0Q${(ex * 0.3).toFixed(1)} ${(ey * 0.9).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}Q${(ex * 0.6).toFixed(1)} ${(ey * 0.6).toFixed(1)} 0 0z" fill="${c}"/>`; } return `<g class="grm-sway" transform="translate(${x} ${y}) scale(${flip ? -k : k} ${k})">${s}</g>`; },
  jar: (c, h) => `<rect x="-14" y="${-h}" width="28" height="${h}" rx="6" fill="${c}" opacity=".9"/><rect x="-11" y="${-h - 8}" width="22" height="9" rx="2" fill="#6a5a44"/><rect x="-9" y="${-h + 6}" width="5" height="${h - 14}" rx="2" fill="#fff" opacity=".28"/>`,
});
