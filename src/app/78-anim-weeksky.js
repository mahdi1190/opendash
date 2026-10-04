/* ============================================================
   THE SKY ACROSS THE WEEK VIEW (v2.2 wave 6; skipped in wave 4). Each day
   column of the week and day views carries a quiet sky behind its hours:
   night, dawn at that day's sunrise, day, dusk at its sunset (the almanac,
   offline, at the weather town; 06:00 and 18:00 without one). Today's column
   also gets a small sun or moon riding beside the now-line.
     animWeekSkyVars(iso)   'style' text for a column ('' when off): --sky-rise / --sky-set in %
     animWeekSkyOrb(nowMin, iso)  the orb's markup for today ('' when off)
   Off with animations off or reduced motion is fine: the sky is still, the orb does not move
   (71-anim-make.css). Turned off entirely with the "Calm" intensity off switch (anim-off).
   ============================================================ */
function _awsOn() {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('anim-off')) return false;
  return true;
}
function _awsMin(ms, fallback) {
  if (!isFinite(ms)) return fallback;
  try { const p = Clock.parts(ms); return p.h * 60 + p.mi; } catch (e) { return fallback; }
}
function animWeekSkyVars(iso) {
  if (!_awsOn()) return '';
  const loc = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.location && typeof APP_CONFIG.location === 'object' ? APP_CONFIG.location : null;
  let rise = 360, set = 1080;
  if (loc && typeof almSunTimes === 'function') {
    const t = almSunTimes(iso, +loc.lat, +loc.lon);
    if (t.polar === 'day') { rise = 0; set = 1440; } else if (t.polar === 'night') { rise = 720; set = 720; } else { rise = _awsMin(t.rise, 360); set = _awsMin(t.set, 1080); }
  }
  if (set < rise) set = rise;
  const pct = (m) => Math.round(m / 1440 * 1000) / 10;
  return `--sky-rise:${pct(rise)}%;--sky-set:${pct(set)}%`;
}
function animWeekSkyOrb(nowMin, iso) {
  if (!_awsOn()) return '';
  const v = animWeekSkyVars(iso);
  const m = /--sky-rise:([\d.]+)%;--sky-set:([\d.]+)%/.exec(v);
  const p = nowMin / 1440 * 100;
  const day = m ? p >= +m[1] && p < +m[2] : nowMin >= 360 && nowMin < 1080;
  return `<span class="wv-sky-orb ${day ? 'is-sun' : 'is-moon'}" aria-hidden="true"></span>`;
}
