/* ============================================================
   GARDEN WONDER, weather you can feel, and the world noticing you (docs/dev/HUNDRED_WORLD.md, rows 19 to 22).
     Footprints: you leave them in snow and after rain. So does something else, once a day, and you can follow them to where it went. One path in one sprite, kept in memory and redrawn after a repaint.
     Rainbow's end: the rainbow surprise really does end somewhere now (wraps GARDEN_LIFE_EFFECTS.rainbow).
     A bird on your head: stand still long enough.
     Coming back: being away is never a failure. Saved: lastIn (the last day you were here), away (how long you had been gone), tr.<day> (those tracks followed).
   ============================================================ */
const _wdw = { prints: [], S: null, lx: 0, ly: 0, side: 1, mode: '', track: null, trackS: null, bird: null, still: 0, tufts: [], birdT: 0 };
function _wdGround(m) { if (m.rain && m.rain.snow) return 'snow'; if (m.rain && (m.rain.now || (m.rain.last && m.now - m.rain.last < 3 * 3600000))) return 'wet'; return ''; }
function _wdPrintMark(x, y, side, mode, k) {
  const G = GARDEN_WORLD, px = (x * G.cellW + side * 3).toFixed(1), py = (y * G.cellH).toFixed(1);
  return mode === 'snow' ? `<ellipse cx="${px}" cy="${py}" rx="${3.2 * k}" ry="${1.7 * k}" fill="#a8bcd4" opacity="0.72"/><ellipse cx="${px}" cy="${(y * G.cellH + 0.5).toFixed(1)}" rx="${2.2 * k}" ry="${1 * k}" fill="#8fa8c4" opacity="0.5"/>` : `<ellipse cx="${px}" cy="${py}" rx="${3 * k}" ry="${1.5 * k}" fill="#4a3a24" opacity="0.26"/>`;
}
function _wdPrintsDraw() {
  if (!_wdw.S) _wdw.S = wdSprite({ id: 'wd-prints', x: 0, y: 0, z: -1, still: true, svg: '' });
  wdArt(_wdw.S, _wdw.prints.map(p => _wdPrintMark(p.x, p.y, p.s, _wdw.mode, 1)).join(''));
}
function _wdTrackFor(m, mode) {
  const today = m.today, h = gardenHash('wd-track|' + today), W = _wdG();
  if (W['tr.' + today]) return null;
  const pool = ['fox', 'hedgehog', 'rabbit', 'hare', 'badger', 'white-stag'].filter(id => GL_CREATURE.has(id)), who = pool.length ? pool[h % pool.length] : '';
  const p0 = _wdPt('notice-board', -6 + (h % 12), -3 + ((h >> 4) % 3)), p1 = wdFreeNear(p0.x, p0.y, 4), end = wdFreeNear(p0.x + 7 + ((h >> 8) % 6), p0.y + 1 + ((h >> 6) % 2), 4);
  if (!p1 || !end) return null;
  const n = 18, pts = []; let s = '';
  for (let i = 0; i <= n; i++) { const t = i / n, x = p1.x + (end.x - p1.x) * t + Math.sin(t * 7 + h % 5) * 0.5, y = p1.y + (end.y - p1.y) * t + Math.cos(t * 5 + h % 3) * 0.3; pts.push({ x, y }); s += _wdPrintMark(x, y, i % 2 ? 1.6 : -1.6, mode, 0.62); s += _wdPrintMark(x + 0.14, y + 0.1, i % 2 ? -1.6 : 1.6, mode, 0.5); }
  return { who, end, svg: s };
}
function _wdTrackUp(m, mode) {
  if (_wdw.track !== null) return;
  _wdw.track = _wdTrackFor(m, mode) || false;
  if (_wdw.track) _wdw.trackS = wdSprite({ id: 'wd-track', x: 0, y: 0, z: -0.5, still: true, svg: _wdw.track.svg });
}
function _wdTrackOff() { if (_wdw.trackS) { _wdw.trackS.remove(); _wdw.trackS = null; } _wdw.track = null; }
/* ---------- rainbow's end ---------- */
const _wdRainbow0 = GARDEN_LIFE_EFFECTS.rainbow;
GARDEN_LIFE_EFFECTS.rainbow = function (e, cfg, W) {
  const ok = _wdRainbow0(e, cfg, W);
  try {
    if (ok !== false && W && W.own && gardenFun() !== 'off') {
      const G = GARDEN_WORLD, v = W.view(), cx = (v.x0 + v.x1) / 2, span = (v.x1 - v.x0) * 0.44, side = Math.random() < 0.5 ? -1 : 1, base = (_glStage(0, v.y0).y + (v.x1 - v.x0) * G.cellW * 0.44 * 0.72 - G.sky) / G.cellH;
      const at = wdFreeNear(cx + side * span, base, 4);
      if (at) {
        const S = wdSprite({ id: 'wd-pot', x: at.x, y: at.y, hit: 0.9, hitUp: 8, label: 'Where the rainbow ends', cursor: 'hand', t: 0,
          svg: `<g class="gl-twinkle" transform="translate(0 -20)"><path d="M0 -6L1.4 -1.4L6 0L1.4 1.4L0 6L-1.4 1.4L-6 0L-1.4 -1.4z" fill="#fff4b8"/></g>${GART.P('#000000', GART.ell(0, 0.5, 9, 2.2), 0.16)}${GART.P('#2a2a30', 'M-8 -10C-10 -3 -6 0 0 0C6 0 10 -3 8 -10z')}${GART.P('#d8b24a', GART.ell(0, -10, 8, 2.8))}`,
          update(dt, Sp) { Sp.t += dt; if (Sp.t > 60) Sp.remove(); },
          onClick(Sp) {
            const g = _gdG(), today = _wdToday(), first = !g.led['wdrb.' + today];
            if (first) { g.led['wdrb.' + today] = { d: today, k: 'wd', c: 6, x: 2, n: 1 }; _gdSave(); }
            _glFx(Sp.x, Sp.y, 'sparkle', { lift: 12 }); _glSound('twinkle');
            wdPage({ title: 'It does end somewhere', text: first ? ['An old pot, right where the colours come down. Six coins, and a note: ONLY SIX. SORRY. IT HAS BEEN A LONG YEAR.'] : ['An old pot. It has been emptied already today, by somebody who looks a lot like you.'] });
            Sp.remove();
          } });
      }
    }
  } catch (err) { console.error('[garden wonder]', err); }
  return ok;
};
/* ---------- a bird on your head ---------- */
function _wdBirdOff() { const B = _wdw.bird; if (!B) return; B.leaving = true; }
function _wdBirdCome(m) {
  const def = GL_CREATURE.get('robin') || GL_CREATURE.get('blackbird'); if (!def) return;
  let art = ''; try { art = gardenLifeArt(def).svg; } catch (e) { return; }
  const S = wdSprite({ id: 'wd-bird', x: _gw.px, y: _gw.py, lift: 240, svg: `<g transform="scale(${_gw.face || 1} 1)"><g class="gl-art gl-still" data-clip="">${art}</g></g>`, z: _gw.py + 0.05, t: 0,
    update(dt, Sp) {
      Sp.t += dt;
      Sp.x = _gw.px; Sp.y = _gw.py; Sp.z = _gw.py + 0.05;
      if (Sp.leaving) { Sp.lift += 260 * dt; Sp.x += 0.8 * Sp.t * 0.1; if (Sp.lift > 300) { Sp.remove(); _wdw.bird = null; } return; }
      const head = 53; if (Sp.lift > head) Sp.lift = Math.max(head, Sp.lift - 170 * dt);
    } });
  _wdw.bird = S;
  void m;
  if (!_wdGet('bird')) { _wdSet('bird', _wdToday()); gardenRewardDid('bird'); setTimeout(() => wdWhisper('A bird has landed close by. Stay still.', 4000), 1500); }
  _glSound('chirp');
}
/* ---------- coming back ---------- */
const _WD_WELCOME = Object.freeze([[3, 'The garden kept going without you. It seems pleased to see you, in its way.'], [7, 'Everything grew. Nothing minded. There is a web across the path, and you walk through it.'], [30, 'It has been a while. The grass has got long and it suits it. Nothing was lost.'], [120, 'Look at you. Look at it. Nobody here was counting.']]);
function _wdComeBack(m) {
  const W = _wdG(), last = W.lastIn, gap = last ? _wdDaysBetween(last, m.today) : 0;
  if (last === m.today) return;
  W.lastIn = m.today; if (gap >= 1) W.away = gap;
  _wdSave();
  if (gap < 3) return;
  let line = ''; for (const [n, t] of _WD_WELCOME) if (gap >= n) line = t;
  setTimeout(() => { if (_wd.on) wdWhisper(line, 8000); }, 3500);
  // long grass and a web: gone as you walk through them, and never there again
  const cols = gap >= 30 ? 3 : gap >= 7 ? 2 : 1;
  for (let i = 0; i < cols; i++) {
    const at = wdFreeNear(_gw.px + (i - 1) * 2.2 + 1, _gw.py + (i % 2 ? 1.2 : -1.1), 2); if (!at) continue;
    const web = i === 0 && gap >= 7;
    const S = wdSprite({ id: 'wd-tuft' + i, x: at.x, y: at.y, t: 0, svg: web ? '<g stroke="#f4f4f4" stroke-width="0.5" fill="none" opacity="0.8"><path d="M-14 -24L14 -2M14 -24L-14 -2M0 -28V0M-16 -13H16"/><ellipse cy="-13" rx="5" ry="5"/><ellipse cy="-13" rx="10" ry="10"/></g>' : GART.S('#6e9a48', 1.6, 'M-7 0Q-9 -9 -6 -16M-3 0Q-3 -12 -1 -20M1 0Q2 -9 5 -15M5 0Q6 -7 9 -12') + GART.P('#e8d84a', GART.circ(-1, -21, 1.6)),
      update(dt, Sp) { Sp.t += dt; if (Sp.t > 1 && wdNear(Sp.x, Sp.y, 0.55)) { if (typeof _glFx === 'function') _glFx(Sp.x, Sp.y, 'sparkle', { lift: 6 }); Sp.remove(); } if (Sp.t > 900) Sp.remove(); } });
    _wdw.tufts.push(S);
  }
}
wdMod({
  id: 'weather', pref: 'weather',
  begin(m) { _wdw.prints = []; _wdw.S = null; _wdw.mode = ''; _wdw.track = null; _wdw.trackS = null; _wdw.lx = _gw.px; _wdw.ly = _gw.py; void m; },
  frame() {
    if (!_wdw.mode || !_gw.moving) return;
    if (Math.hypot(_gw.px - _wdw.lx, (_gw.py - _wdw.ly) * 1.2) < 0.42) return;
    _wdw.lx = _gw.px; _wdw.ly = _gw.py; _wdw.side = -_wdw.side;
    _wdw.prints.push({ x: _gw.px, y: _gw.py, s: _wdw.side });
    if (_wdw.prints.length > 70) _wdw.prints.shift();
    _wdPrintsDraw();
  },
  tick(m) {
    if (m.visit) return;
    const mode = _wdGround(m);
    if (mode !== _wdw.mode) { _wdw.mode = mode; if (!mode) { _wdw.prints = []; if (_wdw.S) { _wdw.S.remove(); _wdw.S = null; } _wdTrackOff(); } }
    if (mode) _wdTrackUp(m, mode);
    const T = _wdw.track;
    if (T && !_wdGet('tr.' + m.today) && wdNear(T.end.x, T.end.y, 1.3)) {
      _wdSet('tr.' + m.today, 1); gardenRewardDid('tracks');
      const c = T.who && _gl.W && _gl.W.own ? gardenLifeSpawn(T.who, { at: { x: T.end.x + 0.9, y: T.end.y, fade: 0 } }) : null;
      wdWhisper(c ? 'That explains the tracks.' : 'The tracks stop here, as if whatever made them simply left the ground.', 6000);
    }
  },
  end() { _wdw.S = null; _wdw.trackS = null; _wdw.track = null; _wdw.prints = []; },
});
wdMod({
  id: 'still', pref: 'still',
  begin() { _wdw.bird = null; _wdw.still = 0; _wdw.birdT = 0; },
  tick(m) {
    if (m.visit) return;
    const idle = !_gw.moving && !_gw.path.length && !(_gw.fishing && _gw.fishing.state !== 'idle') && !(typeof _gdp !== 'undefined' && _gdp.pop) && !_wdk.el && !_wd.talk;
    _wdw.still = idle ? _wdw.still + 1 : 0;
    if (_wdw.bird && _wdw.still === 0) _wdBirdOff();
    const need = _wd.still ? 25 : 45;
    if (!_wdw.bird && _wdw.still >= need && !m.rain.now && !m.rain.snow && ['dawn', 'day', 'dusk'].includes(m.tod) && _wd.t - _wdw.birdT > 240) { _wdw.birdT = _wd.t; _wdBirdCome(m); }
  },
  end() { _wdw.bird = null; },
});
wdMod({ id: 'back', begin(m) { if (!m.visit) { _wdw.tufts = []; _wdComeBack(m); } } });
