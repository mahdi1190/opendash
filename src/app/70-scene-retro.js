/* ============================================================
   SCENE RETROFIT (docs/dev/SCENE_ENGINE.md section 7; builder A). PURE.
   The Yateley rules (live sky, real moon, lamps at real dusk, seasons, weather) for the hand-drawn
   region scenes WITHOUT redrawing them: sceneRetrofit(item, retro) wraps item.svg. With a live sky
   (o.sky) it returns the original art inside <g class="sr-retro"><g class="sr-back">ART</g> + a small
   overlay (at most SCENE_RETRO_MAX_BYTES); without o.sky (Node, the lint corpus, sheets without --at)
   it returns the original art BYTE-IDENTICAL. A retrofitted scene is still the LEGACY tier (15.3).

   sceneRetrofit(item, retro)                        -> item with svg wrapped (retro false: the item unchanged)
   sceneRetrofitSvg(markup, L, retro, {season, lat}) -> the wrapped markup for a light L
   SCENE_RETRO_DEFAULTS, SCENE_RETRO_MAX_BYTES
   The classes it uses (sr-retro, x-srtw, x-srfall, x-srglow) live in src/styles/76-scene.css.
   ============================================================ */
const SCENE_RETRO_MAX_BYTES = 6000;
const SCENE_RETRO_DEFAULTS = Object.freeze({ horizon: 520, sky: null, heading: 180, fov: 80, sun: 'painted', moon: true, stars: 160, veil: true, grade: true,
  season: 'auto', particles: true, weather: true, lamps: true });
const sceneRetrofitSvg = (function () {
  const R = v => Math.round(v), F = v => Math.round(v * 100) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hx = c => { let s = String(c || '#000').replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const hex = a => '#' + a.map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
  /** The elements of the art whose class names one of `classes`, outermost only, with balanced <g> nesting: [{ start, open }]. */
  function pick(markup, classes) {
    const out = [], re = new RegExp('<(g|path|circle|ellipse|rect|polygon|use)\\b[^>]*class="[^"]*\\b(' + classes.join('|') + ')\\b[^"]*"[^>]*>', 'g');
    let m;
    while ((m = re.exec(markup))) {
      const start = m.index, tag = m[1];
      if (tag !== 'g' || /\/>$/.test(m[0])) { const end = /\/>$/.test(m[0]) ? re.lastIndex : markup.indexOf('</' + tag + '>', re.lastIndex) + tag.length + 3; out.push({ start, open: m[0] }); re.lastIndex = end; continue; }
      const t = /<g\b|<\/g>/g; t.lastIndex = re.lastIndex;
      let depth = 1, end = markup.length;
      for (let k; (k = t.exec(markup));) { depth += k[0] === '</g>' ? -1 : 1; if (!depth) { end = k.index + 4; break; } }
      out.push({ start, open: m[0] }); re.lastIndex = end;
    }
    return out;
  }
  /** Rough budget guard: drop optional layers (particles, then stars) until the overlay fits. */
  function build(markup, L, retro, o) {
    const r = Object.assign({}, SCENE_RETRO_DEFAULTS, retro || {}), hor = r.horizon, n = (sceneHash('retro|' + (o.key || '')) % 997) + 1, rnd = sceneRnd(n);
    const skyD = r.sky || `M-160 -80H1760V${hor}H-160z`, u = 'sr' + n.toString(36);
    const defs = `<defs><clipPath id="${u}s"><path d="${skyD}"/></clipPath><mask id="${u}l"><rect x="-160" y="-80" width="1920" height="1060" fill="#fff"/><path d="${skyD}" fill="#000"/></mask></defs>`;
    const parts = { veil: '', stars: '', moon: '', sun: '', grade: '', lamps: '', season: '', particles: '', weather: '' };
    const dark = clamp(L.dark || 0, 0, 1);
    // the sky veil: the painted sky becomes the real one as it gets dark (and a golden glow round the real sun)
    if (r.veil) {
      const op = clamp(dark * 1.1, 0, 0.92);
      if (op > 0.02) parts.veil = `<g clip-path="url(#${u}s)" opacity="${F(op)}"><linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.top}"/><stop offset=".6" stop-color="${L.mid}"/><stop offset="1" stop-color="${L.low}"/></linearGradient><rect x="-160" y="-80" width="1920" height="${hor + 90}" fill="url(#${u}v)"/></g>`;
      const gold = clamp(1 - Math.abs((L.alt || 0) - 2) / 10, 0, 1) * (1 - (L.cover || 0));
      if (gold > 0.05 && L.sun) parts.veil += `<g clip-path="url(#${u}s)"><radialGradient id="${u}g"><stop offset="0" stop-color="${L.lowSun || L.low}" stop-opacity=".25"/><stop offset="1" stop-color="${L.lowSun || L.low}" stop-opacity="0"/></radialGradient><circle cx="${R(clamp(L.sun.x, -300, 1900))}" cy="${R(Math.min(L.sun.y, hor))}" r="520" fill="url(#${u}g)" opacity="${F(gold)}"/></g>`;
    }
    // stars in three twinkle groups
    if (r.stars && (L.stars || 0) > 0.02) {
      const g = ['', '', ''], cnt = Math.min(220, r.stars | 0);
      for (let i = 0; i < cnt; i++) { const x = R(rnd() * 1600), y = R(rnd() * (hor - 20)), s = rnd() < 0.15 ? 1.6 : 0.9; g[i % 3] += `M${x} ${y}h${s}v${s}h-${s}z`; }
      parts.stars = `<g clip-path="url(#${u}s)" fill="#fff" opacity="${F(L.stars)}">` + g.map((d, i) => `<path class="x-srtw" style="--d:-${i * 1.1}s;--ad:${F(2.6 + i * 0.8)}s" d="${d}"/>`).join('') + '</g>';
    }
    // the moon: real azimuth / altitude through the retro view, the real phase and limb
    const m = L.moon;
    if (r.moon && m && m.show && dark > 0.15) {
      const mr = 16, f = Math.acos(clamp(1 - 2 * (m.illum || 0), -1, 1)) / (2 * Math.PI);
      const disc = typeof almMoonDiscPath === 'function' ? almMoonDiscPath(clamp(f, 0.001, 0.4995), mr) : sceneD.circ(0, 0, mr);
      parts.moon = `<g clip-path="url(#${u}s)"><circle cx="${R(m.x)}" cy="${R(m.y)}" r="${R(mr * (3 + 4 * m.illum))}" fill="#cfdcf0" opacity="${F(0.12 + 0.2 * m.illum)}"/><g transform="translate(${R(m.x)} ${R(m.y)})"><circle r="${mr}" fill="#3a4660" opacity="${F(0.3 * dark)}"/><path transform="rotate(${F((m.limb == null ? 90 : m.limb) - 90)})" d="${disc}" fill="#f3eedc"/></g></g>`;
    }
    // the live sun (art without a painted sun)
    if (r.sun === 'live' && L.sun && L.sun.show) parts.sun = `<g clip-path="url(#${u}s)"><circle cx="${R(L.sun.x)}" cy="${R(L.sun.y)}" r="70" fill="${L.lowSun || '#fff2c8'}" opacity=".35"/><circle cx="${R(L.sun.x)}" cy="${R(L.sun.y)}" r="24" fill="#fff6dc"/></g>`;
    // the land grade: the K.tone multiply (exact), the night blue, the golden warmth
    if (r.grade) {
      const op = L.shadeOp || 0, sh = hx(L.shade), mul = hex(sh.map(c => 255 * (1 - op * (1 - c / 255))));
      const warm = clamp(1 - Math.abs((L.alt || 0) - 3) / 10, 0, 1) * (1 - (L.cover || 0)) * 0.16;
      let g = '';
      if (op > 0.01) g += `<rect mask="url(#${u}l)" x="-160" y="-80" width="1920" height="1060" fill="${mul}" style="mix-blend-mode:multiply"/>`;
      if (dark > 0.02) g += `<rect mask="url(#${u}l)" x="-160" y="-80" width="1920" height="1060" fill="#2a3a6a" opacity="${F(dark * 0.35)}" style="mix-blend-mode:multiply"/>`;
      if (warm > 0.01) g += `<rect mask="url(#${u}l)" x="-160" y="-80" width="1920" height="1060" fill="${L.light}" opacity="${F(warm)}"/>`;
      // the mask goes on each rect, not on a wrapping <g>: a masked group is isolated, so mix-blend-mode inside it would
      // blend with transparent and paint the land over (the land went white at noon, a slab at night)
      if (g) parts.grade = g;
    }
    // windows and lamps: copies of the art's lit groups ABOVE the grade (they light at real dusk through the tod-* class)
    // (the art gets an id on each lit group, so the copy is a few bytes of <use> however big the windows are)
    if (r.lamps && L.windows) {
      const lit = pick(markup, ['us-lit', 'us-lamps']);
      if (lit.length) {
        const uses = [];
        let art = '', at = 0;
        lit.forEach((e, i) => {
          const has = /\sid="([^"]+)"/.exec(e.open), id = has ? has[1] : u + 'k' + i;
          art += markup.slice(at, e.start) + (has ? e.open : e.open.replace(/^<([a-z]+)/, '<$1 id="' + id + '"'));
          at = e.start + e.open.length;
          uses.push(`<use href="#${id}"/>`);
        });
        markup = art + markup.slice(at);
        parts.lamps = `<g class="sr-lamps">${uses.join('')}</g>`;
      }
    }
    // the season (a picture of 'any' season, outside the tropics)
    const season = o.season, tint = { spring: ['#cfe8a0', 'soft-light', 0.1, 12], summer: [null, null, 0, 8], autumn: ['#d27a2c', 'soft-light', 0.2, 16], winter: ['#e8eef6', 'screen', 0.18, 30] }[season];
    if (r.season === 'auto' && tint && !o.fixedSeason && Math.abs(o.lat || 0) >= 23.5) {
      if (tint[0]) parts.season = `<rect x="-160" y="-80" width="1920" height="1060" fill="${tint[0]}" opacity="${tint[2]}" style="mix-blend-mode:${tint[1]}"/>` + (season === 'winter' ? '<rect x="-160" y="-80" width="1920" height="1060" fill="#8a8f96" opacity=".25" style="mix-blend-mode:saturation"/>' : '');
      if (r.particles) {
        const col = { spring: '#f6d4e0', summer: '#fff6c8', autumn: '#c8682a', winter: '#ffffff' }[season], k = tint[3] + (season === 'winter' && L.snow ? 30 : 0);
        let d = '';
        for (let i = 0; i < k; i++) { const x = R(rnd() * 1600), y = R(rnd() * 200 - 60), s = season === 'autumn' ? 4 : 2.4; d += `<circle class="x-srfall" style="--d:-${F(rnd() * 14)}s;--dx:${R(20 + rnd() * 60)}px" cx="${x}" cy="${y}" r="${s}"/>`; }
        parts.particles = `<g fill="${col}" opacity=".8">${d}</g>`;
      }
    }
    // the live weather
    if (r.weather) {
      if (L.rain) { let d = ''; for (let i = 0; i < 90; i++) { const x = R(rnd() * 1700 - 50), y = R(rnd() * 900); d += `M${x} ${y}l-6 18`; } parts.weather += `<path d="${d}" stroke="#c8d4e0" stroke-width="1.2" opacity=".45"/>`; }
      if (L.snow && !(r.season === 'auto' && season === 'winter')) { let d = ''; for (let i = 0; i < 60; i++) d += `M${R(rnd() * 1600)} ${R(rnd() * 900)}h2.4v2.4h-2.4z`; parts.weather += `<path d="${d}" fill="#fff" opacity=".8"/>`; }
      if (L.fog) parts.weather += `<rect x="-160" y="-80" width="1920" height="1060" fill="${L.haze || '#d6e2e6'}" opacity=".35"/>`;
    }
    const order = ['veil', 'stars', 'moon', 'sun', 'grade', 'lamps', 'season', 'particles', 'weather'];
    const size = () => defs.length + order.reduce((s, k) => s + parts[k].length, 0) + 60;
    for (const k of ['particles', 'stars', 'weather', 'season']) if (size() > SCENE_RETRO_MAX_BYTES) parts[k] = '';
    return `<g class="sr-retro"><g class="sr-back">${markup}</g>${defs}${order.map(k => parts[k]).join('')}</g>`;
  }
  return function sceneRetrofitSvg(markup, L, retro, o) {
    if (!L) return markup;
    return build(String(markup), L, retro, o || {});
  };
})();
/**
 * Wrap an item so its svg(o) carries the retrofit overlay when o.sky is given (7.1). retro: SCENE_RETRO_DEFAULTS overrides,
 * or false (the item unchanged). The light is the item's live sky seen through retro.heading / fov / horizon.
 */
function sceneRetrofit(item, retro) {
  if (!item || retro === false || typeof item.svg !== 'function' || item.composed) return item;
  const r = Object.assign({}, SCENE_RETRO_DEFAULTS, retro || {}), art = item.svg;
  const fixedSeason = item.season && item.season !== 'any' && !(Array.isArray(item.season) && item.season.includes('any'));
  const wrapped = function (o) {
    const markup = art(o);
    if (!o || !o.sky || !Number.isFinite(o.sky.ms)) return markup;
    const sky = item.liveSky && typeof item.liveSky === 'object' ? item.liveSky : {};
    const lat = Number.isFinite(o.sky.lat) ? o.sky.lat : sky.lat, lon = Number.isFinite(o.sky.lon) ? o.sky.lon : sky.lon;
    const season = typeof sceneSeason === 'function' ? sceneSeason(o.sky.ms, lat, { season: 'auto', tropic: 'summer' }) : 'summer';
    const L = sceneLight({ sky: o.sky }, { lat, lon, heading: r.heading, fov: r.fov, horizon: r.horizon, season });
    return sceneRetrofitSvg(markup, L, r, { season, lat, fixedSeason, key: item.id || '' });
  };
  // reduced: 'static' draws svg(o) (wrapped); a reduced() function keeps its own still art
  return Object.assign({}, item, { retro: retro || {}, svg: wrapped });
}
