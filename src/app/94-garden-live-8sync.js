/* ============================================================
   STAYING IN STEP (2.34.1, docs/dev/GARDEN_TOGETHER.md section 21). The owner, 31 Oct and 1 Nov 2026: "how do you tell if we are synced or desynced, and how can we improve and fix it if it does happen".

   A visitor gets the whole garden when they arrive, then only the changes (gl:d). A change that was lost used to stay lost until they left and came back. Now:
     gl:sum        every 20 seconds the host says what it has told everyone: a fingerprint of the plants and decorations. Everything still on its way goes first.
     fx sync ask   a guest whose copy differs twice running asks for the whole garden again, by itself (at most GL_SYNC.autoAsks times a visit), or when you press Refresh garden.
     fx sync at    every 20 seconds each person says which cell they are in. Someone another screen shows more than 1.5 cells away walks there. Close enough is left alone,
                   so a person fishing or sitting is never disturbed.
   A change the host could not send at all sends the whole garden to everyone there, a moment later.

   The line in the garden says how you are connected: Connected (direct or through the relay), Catching up, Slow connection, Reconnecting. It also says when your connection to friends needs its update,
   and when a host is on an older version, so its fish are not shared.
   ============================================================ */
const GL_SYNC = Object.freeze({ sumMs: 20000, atMs: 20000, askGap: 20000, handGap: 4000, autoAsks: 6, asked: 8000, slowMs: 25000, near: 1.5, oldHostMs: 12000, relayMs: 300000 });
const _gly = { sumAt: 0, atAt: 0, heard: 0, bad: 0, asks: 0, askAt: 0, catching: 0, liveAt: 0, oldTold: false, failT: 0, asked: new Map(), paintAt: 0, relayAt: 0, stale: false, sig: '' };

/* ---------- the fingerprint: the same sum from what was sent and from what arrived ---------- */
function _glySum(rows) { return { h: gardenHash(rows.sort().join(';')) >>> 0, n: rows.length }; }
function _glyHostRows() {
  const rows = [];
  for (const r of _glh.sent.values()) rows.push(r.o === 'p' ? `p|${r.id}|${r.x}|${r.y}|${r.s || 0}` : `d|${r.id}|${r.x}|${r.y}|${r.r || 0}`);
  return rows;
}
function _glyGuestRows(s) {
  const layer = (id) => { const d = gardenDecor(id); return d && d.layer === 'ground' ? 'g' : 'd'; }, seen = new Map();
  for (const r of s.plants || []) seen.set('p|' + r[1] + '|' + r[2], `p|${r[0]}|${r[1]}|${r[2]}|${r[3] || 0}`);
  for (const r of s.decor || []) seen.set(layer(r[0]) + '|' + r[1] + '|' + r[2], `d|${r[0]}|${r[1]}|${r[2]}|${r[3] || 0}`);
  return [...seen.values()];
}
/** A garden too big for a snapshot can never match one: no sum for it. */
function _glyTooBig() {
  let p = 0, d = 0;
  for (const r of _glh.sent.values()) { if (r.o === 'p') p++; else d++; }
  return p > GARDEN_SNAPSHOT_MAX.plants || d > GARDEN_SNAPSHOT_MAX.decor;
}

/* ---------- the host ---------- */
function _glySendFailed() {
  if (_gly.failT) return;
  _gly.failT = setTimeout(() => { _gly.failT = 0; if (_glh.on && _glhAnyone()) for (const A of _gll.actors.values()) if (A.f) _glhSendSnap(A.f); }, 3000);
}
function _glyAsked(A) {
  if (_gll.role !== 'host' || !_glh.on || !A || !A.f) return;
  const now = Date.now();   // clock-ok: spacing
  if (now - (_gly.asked.get(A.w) || 0) < GL_SYNC.asked) return;
  _gly.asked.set(A.w, now);
  _glhSendSnap(A.f);
}
/* ---------- a guest ---------- */
function _glySumIn(ev) {
  _gly.heard = Date.now();   // clock-ok: when the host was last heard
  const s = _glv.snap; if (!s || !Number.isInteger(ev.h)) return;
  const mine = _glySum(_glyGuestRows(s));
  if (mine.h === ev.h) { _gly.bad = 0; _gly.catching = 0; return; }
  _gly.bad += 1;
  if (_gly.bad >= 2 && _gly.asks < GL_SYNC.autoAsks) _glyAsk(false);
}
function _glyAsk(byHand) {
  if (!_glvLive()) return;
  const now = Date.now();   // clock-ok: spacing
  if (now - _gly.askAt < (byHand ? GL_SYNC.handGap : GL_SYNC.askGap)) return;
  _gly.askAt = now; _gly.catching = now; if (!byHand) _gly.asks += 1;
  gardenLiveFx('sync', 'ask');
  _glyPaint(true);
  setTimeout(() => { if (_gly.catching === now) { _gly.catching = 0; _glyPaint(true); } }, 9000);
}
/** The whole garden has just arrived. */
function _glySnapIn() { _gly.bad = 0; _gly.catching = 0; _gly.heard = Date.now(); _glyPaint(true); }   // clock-ok: when the host was last heard
function gardenLiveRefresh() { _glyAsk(true); }
/** Where someone says they are. Close enough is left alone. */
function _glyAtIn(A, ev) {
  if (!A || A.moving || !Number.isInteger(ev.x) || !Number.isInteger(ev.y)) return;
  const x = ev.x + 0.5, y = ev.y + 0.5;
  if (Math.hypot(A.x - x, A.y - y) > GL_SYNC.near && typeof _gllWalkVia === 'function') _gllWalkVia(A, null, x, y);
}
/* ---------- the line in the garden ---------- */
function _glyPaint(force) {
  if (typeof _gw === 'undefined' || !_gw.box || !_gw.box.isConnected) return;
  const now = Date.now(), guest = _gll.role === 'visit', host = _gll.role === 'host' && _glh.on;   // clock-ok: how long it has been quiet
  if (!force && now - _gly.paintAt < 900) return;
  _gly.paintAt = now;
  let say = '', tone = '', btn = '';
  if (guest && _glvLive()) {
    const way = _glv.road ? 'through the relay' : 'direct';
    if (_gly.catching) { say = 'Catching up…'; tone = 'is-wait'; }
    else if (_gly.heard && now - _gly.heard > GL_SYNC.slowMs) { say = 'Slow connection…'; tone = 'is-wait'; btn = 'refresh'; }
    else { say = `Connected, ${way}`; btn = 'refresh'; }
  } else if (guest && _glv.fid && _glv.why === 'lost') { say = 'Reconnecting…'; tone = 'is-wait'; }
  else if (host && _glhAnyone()) { const v = _gll.view && _gll.view.host; say = `Connected, ${v && v.road ? 'through the relay' : 'direct'}`; }
  if (_gll.role !== 'visit' && _gly.stale) { btn = 'relay'; if (!say) say = 'Your connection to friends needs a quick update'; else say += '. Your connection to friends needs a quick update'; tone = tone || 'is-wait'; }
  const sig = say + '|' + tone + '|' + btn;
  let el = _gw.box.querySelector(':scope > .gll-link');
  if (!say) { if (el) el.remove(); _gly.sig = ''; return; }
  if (el && sig === _gly.sig) return;
  _gly.sig = sig;
  if (!el) { el = document.createElement('div'); el.className = 'gll-link'; el.setAttribute('role', 'status'); _gw.box.appendChild(el); }
  el.className = 'gll-link ' + tone; el.textContent = '';
  const t = document.createElement('span'); t.textContent = say; el.appendChild(t);
  if (btn) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'gll-link-b';
    b.textContent = btn === 'relay' ? 'Update' : 'Refresh garden';
    b.onclick = (e) => { e.stopPropagation(); if (btn === 'relay') { if (typeof _frOpenRelaySettings === 'function') _frOpenRelaySettings(false); } else gardenLiveRefresh(); };
    el.appendChild(b);
  }
}
/** Four times a second, from the fish's clock (which keeps going while the tab is hidden). */
function _glyTick() {
  const now = Date.now();   // clock-ok: spacing
  if (typeof _gll === 'undefined' || typeof _gw === 'undefined' || !_gw.on) return;
  if (now - _gly.relayAt > GL_SYNC.relayMs) { _gly.relayAt = now; _gllApi('/api/relay').then((st) => { _gly.stale = !!(st && st.mine && st.stale); _glyPaint(true); }).catch(() => {}); }
  const hostLive = _gll.role === 'host' && _glh.on && _glhAnyone(), guestLive = _gll.role === 'visit' && _glvLive();
  if (guestLive && !_gly.liveAt) { _gly.liveAt = now; _gly.asks = 0; _gly.bad = 0; _gly.heard = 0; _gly.oldTold = false; }
  if (!guestLive) _gly.liveAt = 0;
  if (hostLive && now - _gly.sumAt >= GL_SYNC.sumMs) {
    _gly.sumAt = now;
    _glhDiff();   // (what is still to go goes first)
    if (!_glyTooBig()) { const s = _glySum(_glyHostRows()); _glhSend('all', 'sum', s); }
  }
  if ((hostLive || guestLive) && now - _gly.atAt >= GL_SYNC.atMs && !_gw.moving) {
    _gly.atAt = now;
    gardenLiveFx('sync', 'at', { x: Math.max(0, Math.min(63, Math.floor(_gw.px))), y: Math.max(0, Math.min(63, Math.floor(_gw.py))) });
  }
  if (guestLive && !_gly.oldTold && now - _gly.liveAt > GL_SYNC.oldHostMs && typeof _gfs !== 'undefined' && !_gfs.hostSeen) {
    _gly.oldTold = true;
    if (typeof _gllFeed === 'function') _gllFeed('Their Freeflo is older, so you each see your own fish. Ask them to update.');
  }
  _glyPaint();
}
