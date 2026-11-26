/* ============================================================
   AFTER DARK, the big skies (FUN-ROADMAP Phase 8). A few times a year a bigger sky comes:
     The vale lights: three nights in each dark half of the year (north October to March, south April to September), the same in every
       vale (friends share the sky), and on Frost Moon nights one more chance in two. A slow green and violet curtain over the top of
       the view, the water's glints turn green and violet, frozen water glows.
     The comet: one week a year in the darkest months, brightening and fading (.3 .5 .75 1 .75 .5 .3). In the look-up view, and a long
       faint streak on still water. On its brighter nights the lake has shooting stars (rare fish rise).
     Falling-star nights: the real meteor showers' peaks (71-anim-almanac.js almMeteorShower): a streak every half minute or so while
       you are out after dark (those the small days already have, August's and December's, keep theirs). A star falls on each (5stars).
   Seen first: ad.bs.<what> (the night). Keepsakes: a thread of the vale lights, comet dust.
   ============================================================ */
const _ads = { on: false, el: null, starT: 0, watch: 0, comet: 0 };
const AD_COMET = Object.freeze([0.3, 0.5, 0.75, 1, 0.75, 0.5, 0.3]);
/** The dark half-year a night belongs to: its first year ('2026' for October 2026 to March 2027 in the north). */
function _adsDarkYear(iso, south) { const y = Number(iso.slice(0, 4)), mo = Number(iso.slice(5, 7)); return south ? (mo >= 4 && mo <= 9 ? y : null) : (mo >= 10 ? y : mo <= 3 ? y - 1 : null); }
function _adsStart(y, south) { return south ? y + '-04-01' : y + '-10-01'; }
/** The vale lights tonight? (0 or 1) */
function _adsAurora(iso, south, moonRow) {
  const y = _adsDarkYear(iso, south); if (y == null) return 0;
  const n = _wdDaysBetween(_adsStart(y, south), iso);
  for (let i = 0; i < 3; i++) if (gardenHash('ad-aurora|' + y + '|' + (south ? 's' : 'n') + '|' + i) % 182 === n) return 1;
  if (moonRow && moonRow.aurora === 2 && gardenHash('ad-aurora-frost|' + iso) % 2 === 0) return 1;
  return 0;
}
/** The comet's brightness tonight (0 when there is none): one week a year in the darkest months. */
function _adsComet(iso, south) {
  const y = Number(iso.slice(0, 4)), mo = Number(iso.slice(5, 7)), sy = south ? y : (mo >= 11 ? y : y - 1);   // (the season the darkest months belong to)
  const from = south ? sy + '-05-15' : sy + '-11-15', span = south ? 92 : 92;
  const start = gardenHash('ad-comet|' + sy + '|' + (south ? 's' : 'n')) % (span - 7), n = _wdDaysBetween(from, iso) - start;
  return n >= 0 && n < 7 ? AD_COMET[n] : 0;
}
/** A meteor shower's peak on this night (the date the night began, or the morning it ends): the almanac's row, or null. */
function _adsShower(iso) { if (typeof almMeteorShower !== 'function') return null; return almMeteorShower(iso) || almMeteorShower(_gdAddDays(iso, 1)) || null; }
/** The night's big sky (adNow asks): { aurora, comet, shower, stars (a falling-star night) }. */
function adSkyOf(N) {
  const D = _ad.dev, row = N.moon.full ? N.moon.row : null;
  const sky = { aurora: _adsAurora(N.night, N.south, row), comet: _adsComet(N.night, N.south), shower: _adsShower(N.night) };
  if (D.aurora != null) sky.aurora = D.aurora ? 1 : 0;
  if (D.comet != null) sky.comet = Math.max(0, Math.min(1, Number(D.comet) || 0));
  if (D.shower) sky.shower = { id: 'leonids', name: 'Leonids' };
  sky.stars = !!sky.shower;
  return sky;
}
/** The lake's shooting stars on a comet's bright nights and on a shower's night (gardenNightLakeEvents asks). */
function adSkyLakeEvents(iso, south) { return _adsComet(iso, south) >= 0.5 || _adsShower(iso) ? ['meteor'] : []; }
/** What is up there tomorrow night, a day ahead (the notice board): words or ''. */
function adSkyTomorrow(N) {
  const t = _gdAddDays(N.night, 1), row = adMoonOf(t, N.south).row, a = _adsAurora(t, N.south, row) && !_adsAurora(N.night, N.south, adMoonOf(N.night, N.south).row), c = _adsComet(t, N.south), c0 = _adsComet(N.night, N.south);
  if (a) return 'Wick says the sky may do something tomorrow night. Stay up if you can.';
  if (c && !c0) return 'Wick says there is a comet coming. From tomorrow night, for a week. Look up.';
  const sh = _adsShower(t); if (sh && !_adsShower(N.night)) return `Tomorrow night is the ${sh.name}: falling stars, if the sky is clear.`;
  return '';
}
/* ---------- the vale lights: one layer over the top of the view ---------- */
function _adsCurtain(on) {
  const box = typeof _gw !== 'undefined' && _gw.box;
  if (!on || !box) { if (_ads.el) { _ads.el.remove(); _ads.el = null; } return; }
  if (_ads.el && _ads.el.isConnected && _ads.el.parentNode === box) return;
  const el = document.createElement('div'); el.className = 'ad-aurora'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="ad-au a1"></i><i class="ad-au a2"></i><i class="ad-au a3"></i><i class="ad-au a4"></i>';
  const stage = box.querySelector('.gd-stage'); if (stage && stage.nextSibling) box.insertBefore(el, stage.nextSibling); else box.appendChild(el);
  _ads.el = el;
}
/** The comet on still water: a long pale streak lying on each still pond in view. */
function _adsCometWater(N, on) {
  const want = new Set();
  if (on) for (const s of adStill()) {
    if (!adInView(s.x, s.y, 3)) continue;
    const id = 'cw-' + s.id, len = Math.min(140, 30 + Math.sqrt(s.area) * 9), a = N.sky.comet;
    want.add(id);
    wdGlow('ad-' + id, `<g transform="rotate(-24)"><path d="M0 0L${-len} -3L${-len} 3Z" fill="#eef4ff" opacity="${(0.16 * a).toFixed(2)}"/><path d="M0 0L${-len * 0.6} -1.2L${-len * 0.6} 1.2Z" fill="#ffffff" opacity="${(0.3 * a).toFixed(2)}"/><circle r="${(2.2 + 2 * a).toFixed(1)}" fill="#ffffff" opacity="${(0.45 + 0.4 * a).toFixed(2)}"/></g>`, s.x + 1, s.y);
  }
  for (const s of adStill()) { const id = 'cw-' + s.id; if (!want.has(id)) wdGlowOff('ad-' + id); }
}
/** Frozen still water glows green under the vale lights. */
function _adsIce(N, on) {
  for (const s of adStill()) {
    const id = 'au-' + s.id, frozen = on && typeof gardenIceAt === 'function' && gardenIceAt(s.x, s.y) && adInView(s.x, s.y, 3);
    if (!frozen) { wdGlowOff('ad-' + id); continue; }
    const rx = Math.min(130, (s.box.x1 - s.box.x0) * 22), ry = Math.min(70, (s.box.y1 - s.box.y0) * 13);
    wdGlow('ad-' + id, `<ellipse class="ad-glow-b" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="#8af0b0" opacity="0.2"/>`, s.x, s.y);
  }
}
/* ---------- in the look-up view (94-garden-wonder-6sky.js _wdSkyDraw asks): the vale lights, the comet, the named moon ---------- */
function gardenNightSkySvg(P, m) {
  if (!adOn()) return '';
  const N = adNow(m || gardenHere()); let s = '';
  if (N.sky.aurora) s += '<defs><linearGradient id="ad-aug" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7affb0" stop-opacity="0"/><stop offset="0.45" stop-color="#7affb0" stop-opacity="0.5"/><stop offset="1" stop-color="#b080ff" stop-opacity="0"/></linearGradient></defs>' + [[60, 120, 260], [300, 70, 220], [520, 110, 300], [760, 60, 200]].map(([x, y, w], i) => `<path class="ad-aur-s" style="animation-delay:${-i * 2.1}s" d="M${x} ${y}C${x + w * 0.3} ${y - 40} ${x + w * 0.6} ${y + 50} ${x + w} ${y}L${x + w} ${y + 260}C${x + w * 0.6} ${y + 300} ${x + w * 0.3} ${y + 220} ${x} ${y + 260}Z" fill="url(#ad-aug)"/>`).join('');
  if (N.sky.comet) { const a = N.sky.comet; s += `<g transform="translate(300 150) rotate(-18)"><path d="M0 0L-${(180 * a + 60).toFixed(0)} -10L-${(180 * a + 60).toFixed(0)} 10Z" fill="#eaf2ff" opacity="${(0.25 + 0.3 * a).toFixed(2)}"/><path d="M0 0L-${(120 * a + 40).toFixed(0)} -3L-${(120 * a + 40).toFixed(0)} 3Z" fill="#ffffff" opacity="${(0.4 + 0.4 * a).toFixed(2)}"/><circle r="${(4 + 4 * a).toFixed(1)}" fill="#ffffff"/><circle r="${(12 + 10 * a).toFixed(1)}" fill="#dfe8ff" opacity="0.22"/></g>`; }
  const row = N.moon.full ? N.moon.row : null;
  if (row) s += `<circle cx="880" cy="96" r="70" fill="${row.css}" opacity="0.12"/><text x="880" y="160" text-anchor="middle" font-size="17" font-family="Georgia, serif" fill="${row.css}" opacity="0.9">${esc(row.name)}</text>`;
  if (row && row.id === 'frost') for (let i = 0; i < 90; i++) s += `<circle cx="${gardenHash('fx' + i) % 1000}" cy="${gardenHash('fy' + i) % 480}" r="0.8" fill="#eef6ff" opacity="0.6"/>`;
  return s;
}
/* ---------- falling stars ---------- */
function _adsStreak(N) {
  if (!_gl || !_gl.W || gardenFun() === 'off') return;
  if (_wd.t - _ads.starT < 30) return;
  _ads.starT = _wd.t + Math.random() * 30;
  const e = GL_EGG.get('shooting-star'); if (e) { try { GARDEN_LIFE_EFFECTS.streak(e, e.effect, _gl.W); } catch (err) { /* no sky layer */ } }
}
/** The shower nights the small days already mark with streaks of their own (94-garden-wonder-9days.js WD_DAYS rows with sky). */
function _adsDaysHave(N) { try { const md = N.night.slice(5); return WD_DAYS.some(r => r.sky && md >= r.from && md <= r.to); } catch (e) { return false; } }
wdMod({
  id: 'ad-sky', pref: 'night', visit: true,
  begin() { _ads.watch = 0; },
  tick(m) {
    if (!adOn()) { _adsCurtain(false); return; }
    const N = adNow(m), night = N.tod === 'night';
    _adsCurtain(night && N.sky.aurora);
    _adsIce(N, night && N.sky.aurora);
    _adsCometWater(N, night && N.sky.comet > 0);
    if (night && (N.sky.aurora || N.sky.comet)) {
      _ads.watch++;
      const what = N.sky.aurora ? 'aurora' : 'comet';
      if (!adGet('bs.' + what)) adSet('bs.' + what, N.night);
      if (_ads.watch === 12) {   // (after a little while out under it)
        const k = N.sky.aurora ? 'ad-vale-thread' : 'ad-comet-dust';
        if (!adHas(k)) { try { gardenLifeFound('k', k); } catch (e) { /* the book later */ } wdAmbient(N.sky.aurora ? 'The vale lights. Something fine as a thread came down with them: it is in your Field Journal.' : 'A comet. Its dust is on everything tonight, if you look closely: some of it is in your Field Journal now.', 7000, 'sky'); }
        else wdAmbient(N.sky.aurora ? 'The vale lights are out. Look at the water.' : 'The comet is up, brighter tonight.', 5000, 'sky');
      }
    } else _ads.watch = 0;
    if (night && N.sky.shower) {
      if (!adGet('bs.' + N.sky.shower.id)) { adSet('bs.' + N.sky.shower.id, N.night); setTimeout(() => { if (_wd.on) wdAmbient(`The ${N.sky.shower.name} tonight: falling stars, every minute or so. Make a wish on one.`, 7000, 'sky'); }, 3000); }
      if (!_adsDaysHave(N)) _adsStreak(N);
    }
  },
  end() { _adsCurtain(false); for (const s of adStill()) { wdGlowOff('ad-cw-' + s.id); wdGlowOff('ad-au-' + s.id); } },
});
