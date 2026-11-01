/* ============================================================
   GARDEN WONDER, sitting a while (docs/dev/HUNDRED_WORLD.md, row 11). On any seat, or the old bench by the reeds. The menus go, a whole day passes over you in two minutes, and nothing asks you anything.
   Not saved and not counted, on purpose. Any key or click gets you up. Calm mode pauses the stage's animations and keeps this sky moving: it is only a few layers of opacity.
   ============================================================ */
const _wds = { el: null, t0: 0, keys: null, bench: null };
const _WD_STILL_LINES = Object.freeze(['Nothing needed you.', 'The garden carried on. It does that.', 'Somewhere, a kettle. Not yours.', 'That was all right.', 'You could do that again.', 'Nobody asked where you had been.']);
function gardenWonderSeatItem(d) {
  const def = d.def;
  return { ic: 'armchair', label: 'Sit a while', cls: 'is-go', run: () => gardenWonderSit({ x: d.x + (def.w || 1) / 2, y: d.y + (def.h || 1) + 0.3 }) };
}
function gardenWonderSit(at) {
  gardenBubbleClose();
  if (!gardenWalkToPoint({ x: at.x, y: at.y }, () => _wdStillOn(), { radius: 1.5 })) { wdWhisper('You cannot get to it from here.'); }
}
function _wdStillOn() {
  const box = _wdBox(); if (!box || _wds.el) return;
  if (typeof gartEmoteRun === 'function') { try { gartEmoteRun('sit', { quiet: true }); } catch (e) { /* standing will do */ } }
  wdTalkClose(true);
  _wd.still = true; box.classList.add('wd-hush', 'wd-sitting');
  const el = document.createElement('button'); el.type = 'button'; el.className = 'wd-still'; el.setAttribute('aria-label', 'You are sitting quietly. Press to get up.');
  let stars = '';
  for (let i = 0; i < 60; i++) stars += `<circle cx="${gardenHash('s' + i) % 1000}" cy="${gardenHash('y' + i) % 380}" r="${0.6 + (gardenHash('r' + i) % 12) / 10}" fill="#fff" opacity="${(0.3 + (gardenHash('o' + i) % 7) / 10).toFixed(2)}"/>`;
  el.innerHTML = `<span class="wd-st wd-st-gold"></span><span class="wd-st wd-st-dusk"></span><span class="wd-st wd-st-night"></span><svg class="wd-st wd-st-stars" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${stars}</svg><span class="wd-st wd-st-dawn"></span><span class="wd-cloud wd-c1"></span><span class="wd-cloud wd-c2"></span><span class="wd-getup">Get up</span>`;
  const up = () => _wdStillOff();
  el.onclick = up;
  const key = (ev) => { if (ev.key === 'Shift' || ev.key === 'Control' || ev.key === 'Alt' || ev.key === 'Meta' || ev.key === 'Tab') return; ev.preventDefault(); ev.stopPropagation(); up(); };
  document.addEventListener('keydown', key, true); _wds.keys = key;
  box.appendChild(el); _wds.el = el; _wds.t0 = performance.now();
  try { el.focus({ preventScroll: true }); } catch (e) { /* fine */ }
}
function _wdStillOff(quiet) {
  const el = _wds.el; if (!el) return;
  _wds.el = null; _wd.still = false;
  document.removeEventListener('keydown', _wds.keys, true); _wds.keys = null;
  const box = _wdBox(), secs = (performance.now() - _wds.t0) / 1000;
  if (box) { box.classList.remove('wd-sitting'); if (!(typeof _wdOnIsle === 'function' && _wdOnIsle())) box.classList.remove('wd-hush'); }
  el.classList.add('is-out'); setTimeout(() => el.remove(), 700);
  if (typeof gartEmoteStop === 'function') { try { gartEmoteStop(); } catch (e) { /* fine */ } }
  if (typeof _gwBody === 'function') { try { _gwBody(); } catch (e) { /* fine */ } }
  if (!quiet && secs > 90) wdWhisper(_WD_STILL_LINES[Math.floor(Math.random() * _WD_STILL_LINES.length)], 5000);
}
/* the old bench by the reeds: always there, so anyone can sit from the first day. When the story is done it has a letter cut in it. */
function _wdBenchSvg(carved) {
  const A = GART;
  return A.P('#000000', A.ell(0, 0.5, 26, 4), 0.16) + A.P('#5e452c', A.rect(-22, -9, 3.6, 9) + A.rect(18.4, -9, 3.6, 9)) + A.P('#7e5e3a', A.rrect(-25, -12, 50, 4.4, 1.2)) + A.P('#6e5030', A.rect(-22, -25, 3, 14) + A.rect(19, -25, 3, 14)) + A.P('#8a6a44', A.rrect(-24, -27, 48, 3.8, 1.2) + A.rrect(-24, -21, 48, 3.8, 1.2)) + (carved ? A.S('#3a2a16', 0.8, 'M-5 -20.4l1.2 2.4l1.2 -2.4l1.2 2.4l1.2 -2.4M3 -19.2h4M5 -21v3.6') : '');
}
wdMod({
  id: 'quiet', fun: false, visit: true,
  begin(m) { const carved = m.visit ? !!_wdTheir(m).w : !!_wdGet('lr.w7'); _wds.bench = wdSprite({ id: 'wd-bench', x: WD_AT.bench.x, y: WD_AT.bench.y, z: WD_AT.bench.y + 0.05, still: true, hit: 0.9, hitUp: 10, label: 'Sit a while', cursor: 'hand', svg: _wdBenchSvg(carved), onClick: () => gardenWonderSit({ x: WD_AT.bench.x, y: WD_AT.bench.y - 0.3 }) }); },
  tick(m) { if (_wds.bench) wdArt(_wds.bench, _wdBenchSvg(m.visit ? !!_wdTheir(m).w : !!_wdGet('lr.w7'))); if (_wds.el && typeof _gw !== 'undefined' && _gw.path && _gw.path.length) _wdStillOff(true); },
  end() { _wdStillOff(true); _wds.bench = null; },
});
