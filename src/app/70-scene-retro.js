/* ============================================================
   SCENE RETROFIT (docs/dev/SCENE_ENGINE.md section 7; builder A). PURE.
   The Yateley rules (live sky, real moon, lamps at real dusk, seasons, weather) for the hand-drawn
   region scenes WITHOUT redrawing them: sceneRetrofit(item, retro) wraps item.svg. With a live sky
   (o.sky) it returns the art, re-lit, inside <g class="sr-retro"><g class="sr-back">ART</g> + a small
   overlay (seasons, weather); without o.sky (Node, the lint corpus, sheets without --at) it returns the
   original art BYTE-IDENTICAL. A retrofitted scene is still the LEGACY tier (15.3).

   How the art is re-lit (7.2), nothing is veiled:
   - the sky: every scene of the kit starts with its sky, a full 1600 x 900 rect; its gradient's stops turn
     into the real sky as it gets dark, and the real stars, moon and sun glow go straight after it (g.sr-sky),
     so the skyline, mountains and clouds drawn later stand in front of them;
   - the land: every colour after the sky is graded in place (night blue, darker, golden warmth), except the
     lit pieces (us-lit / us-lamps), which keep their light; a sky painted at night (its top darker than
     PAINTED_NIGHT) is graded less, keeps its own moon and gets no second one;
   - the painted sun (the kit's sun() and rays()) fades out as the real sky takes over;
   - windows and lamps: the art's own us-lit / us-lamps, lit at real dusk by g.sr-lamps round the art (css).
   Art can only be darkened, never brightened: a painted sunset stays a sunset at noon.

   sceneRetrofit(item, retro)                        -> item with svg wrapped (retro false: the item unchanged)
   sceneRetrofitSvg(markup, L, retro, {season, lat}) -> the wrapped markup for a light L
   sceneRetroSeason(lat, ms)                         -> {season, tint, desat, fall}: the season overlay's strength (no snow in hot places)
   SCENE_RETRO_DEFAULTS, SCENE_RETRO_MAX_BYTES
   The classes it uses (sr-retro, sr-back, sr-lamps, sr-sky, x-srtw, x-srfall) live in src/styles/76-scene.css.
   ============================================================ */
const SCENE_RETRO_MAX_BYTES = 6000;
const SCENE_RETRO_DEFAULTS = Object.freeze({ horizon: 520, sky: null, heading: 180, fov: 80, sun: 'painted', moon: true, stars: 160, veil: true, grade: true,
  season: 'auto', particles: true, weather: true, lamps: true });
const sceneRetrofitSvg = (function () {
  const R = v => Math.round(v), F = v => Math.round(v * 100) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hx = c => { let s = String(c || '#000').replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const hex = a => '#' + a.map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const lum = c => { const [r, g, b] = hx(c); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
  // a sky whose top is darker than this was painted at night: it keeps its own moon (and so does a sky with a painted moon disc)
  const PAINTED_NIGHT = 0.13;
  // the grade at full night: the multiply per channel (about the art's own evening tint, .us-tint at tod-night)
  const NIGHT = [0.36, 0.4, 0.62];
  const LIT = ['us-lit', 'us-lamps', 'tx-lit', 'tx-lamps'];
  const COLOUR = /((?:fill|stroke|stop-color|flood-color|color)=")(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})"/g;
  // the painted sun: the kit's sun() (a halo and a disc, two circles on one centre in x-usglow / x-usrise) and rays() (a spinning fan)
  const SUN = /<g class="x-us(?:glow|rise)" style="[^"]*"><circle cx="([-\d.]+)" cy="([-\d.]+)" r="[\d.]+" fill="[^"]+"\/><circle cx="\1" cy="\2" r="[\d.]+" fill="#[0-9a-fA-F]{3,6}"\/><\/g>|<g class="x-usspin" style="--ad:40s;transform-box:view-box;transform-origin:[^"]*"><path fill="url\(#[^)"]+\)" d="[^"]*"\/><\/g>/g;
  // a painted moon: a pale disc high in the sky, drawn among the first layers (the first third of the drawing, before its land)
  const MOON = /<circle cx="[-\d.]+" cy="([-\d.]+)" r="([\d.]+)" fill="(#[0-9a-fA-F]{3,6})"/g;
  const paintedMoon = (markup, hor) => {
    for (const m of markup.slice(0, markup.length / 3).replace(SUN, '').matchAll(MOON)) {
      const c = hx(m[3]);
      if (+m[1] < hor && +m[2] >= 18 && +m[2] <= 90 && lum(m[3]) >= 0.9 && Math.max(...c) - Math.min(...c) <= 60) return true;
    }
    return false;
  };
  /** The elements of the art whose class names one of `classes`, outermost only, with balanced <g> nesting: [{ start, end }]. */
  function pick(markup, classes) {
    const out = [], re = new RegExp('<(g|path|circle|ellipse|rect|polygon|use)\\b[^>]*class="[^"]*\\b(' + classes.join('|') + ')\\b[^"]*"[^>]*>', 'g');
    let m;
    while ((m = re.exec(markup))) {
      const start = m.index, tag = m[1];
      if (tag !== 'g' || /\/>$/.test(m[0])) { const end = /\/>$/.test(m[0]) ? re.lastIndex : markup.indexOf('</' + tag + '>', re.lastIndex) + tag.length + 3; out.push({ start, end }); re.lastIndex = end; continue; }
      const t = /<g\b|<\/g>/g; t.lastIndex = re.lastIndex;
      let depth = 1, end = markup.length;
      for (let k; (k = t.exec(markup));) { depth += k[0] === '</g>' ? -1 : 1; if (!depth) { end = k.index + 4; break; } }
      out.push({ start, end }); re.lastIndex = end;
    }
    return out;
  }
  /**
   * The art's sky: the kit's full(sky), a 1600 x 900 rect filled with a gradient, as the first element after the leading <defs>
   * (228 of the 229 scenes; a scene that starts otherwise, a canyon wall, is graded but its sky is not restyled).
   * { end (of the rect), grad: {start, end, text}, top, avg (the luminance at the top, and of the upper stops) } or null.
   */
  function skyOf(markup) {
    let p = 0;
    while (markup.startsWith('<defs>', p)) { const e = markup.indexOf('</defs>', p); if (e < 0) return null; p = e + 7; }
    const m = /^<rect y="0" width="1600" height="900" fill="url\(#([\w-]+)\)"\/>/.exec(markup.slice(p));
    const g = m && new RegExp('<linearGradient id="' + m[1] + '"[^>]*>[\\s\\S]*?</linearGradient>').exec(markup);
    const stops = g ? [...g[0].matchAll(/offset="([\d.]+)" stop-color="(#[0-9a-fA-F]{3,6})"/g)].map(s => [+s[1], lum(s[2])]) : [];
    if (!stops.length) return null;
    const up = stops.filter(s => s[0] <= 0.6);
    return { end: p + m[0].length, grad: { start: g.index, end: g.index + g[0].length, text: g[0] }, top: stops[0][1], avg: (up.length ? up : stops).reduce((n, s, _, a) => n + s[1] / a.length, 0) };
  }
  /** The live sky colour at height y (0 the top of the drawing) for a view whose horizon is at hor. */
  const liveAt = (L, y, hor) => { const t = clamp(y / hor, 0, 1); return t <= 0.6 ? mix(L.top, L.mid, t / 0.6) : mix(L.mid, L.low, (t - 0.6) / 0.4); };
  /** The sky gradient with its stops turned toward the live sky by k (0 painted .. 1 live). */
  function restyle(text, L, k, hor) {
    const user = /gradientUnits="userSpaceOnUse"/.test(text), num = (a, d) => { const m = new RegExp('\\b' + a + '="([-\\d.]+)"').exec(text); return m ? +m[1] : d; };
    const y1 = num('y1', 0), y2 = num('y2', user ? 900 : 1), span = user ? 1 : 900;
    return text.replace(/(<stop offset="([\d.]+)%?" stop-color=")(#[0-9a-fA-F]{3,6})"/g, (_, a, o, c) => a + mix(c, liveAt(L, (y1 + (+o) * (y2 - y1)) * span, hor), k) + '"');
  }
  /** The land grade for one light: f(colour) -> colour (memoised), or null when it would change nothing. e: the darkness to add (0..1). */
  function toner(L, e) {
    const op = (L.shadeOp || 0) * (1 - clamp(L.dark || 0, 0, 1)), sh = hx(L.shade || '#fff').map(c => c / 255), li = hx(L.light || '#fff').map(c => c / 255);
    const warm = clamp(1 - Math.abs((L.alt || 0) - 3) / 10, 0, 1) * (1 - (L.cover || 0)) * 0.16, night = e * 0.45;
    if (e < 0.01 && op < 0.01 && warm < 0.01) return null;
    const memo = new Map();
    return c => {
      let v = memo.get(c);
      if (v) return v;
      let [r, g, b] = hx(c).map(x => x / 255);
      const y = r * 0.3 + g * 0.59 + b * 0.11;
      r += (y * 0.8 - r) * night; g += (y * 0.88 - g) * night; b += (y * 1.12 - b) * night;
      v = hex([r, g, b].map((x, i) => (x * (1 - e * (1 - NIGHT[i])) * (1 - op * (1 - sh[i])) + (li[i] - x) * warm) * 255));
      memo.set(c, v);
      return v;
    };
  }
  /** The markup with each range [start, end) replaced by its text (sorted, the first of two overlapping ranges wins), the rest graded by f. */
  function relight(markup, ranges, f) {
    const g = s => f ? s.replace(COLOUR, (_, a, c) => a + f(c) + '"') : s;
    let out = '', at = 0;
    for (const x of ranges.sort((a, b) => a.start - b.start)) {
      if (x.start < at) continue;
      out += g(markup.slice(at, x.start)) + x.text;
      at = x.end;
    }
    return out + g(markup.slice(at));
  }
  function build(markup, L, retro, o) {
    const r = Object.assign({}, SCENE_RETRO_DEFAULTS, retro || {}), hor = r.horizon, n = (sceneHash('retro|' + (o.key || '')) % 997) + 1, rnd = sceneRnd(n), u = 'sr' + n.toString(36);
    // dark: the real darkness (0 day .. 1 night); k: how far the painted sky has turned into the real one
    const dark = clamp(L.dark || 0, 0, 1), k = clamp(dark * 1.15, 0, 1);
    const sky = skyOf(markup);
    const paintedNight = sky && sky.top < PAINTED_NIGHT || paintedMoon(markup, hor);
    // how dark the painting already is, from its sky (0 a day or golden sky .. 1 a night sky): the grade adds only the rest of the real darkness
    const painted = sky ? clamp((0.34 - sky.avg) / 0.14, 0, 1) : 0, e = clamp(dark - painted, 0, 1);
    const parts = { glow: '', stars: '', moon: '', sun: '', season: '', particles: '', weather: '' };
    const clip = r.sky ? ` clip-path="url(#${u}s)"` : '';
    // the real sun's golden glow in the sky
    const gold = clamp(1 - Math.abs((L.alt || 0) - 2) / 10, 0, 1) * (1 - (L.cover || 0));
    if (r.veil && gold > 0.05 && L.sun) parts.glow = `<radialGradient id="${u}g"><stop offset="0" stop-color="${L.lowSun || L.low}" stop-opacity=".25"/><stop offset="1" stop-color="${L.lowSun || L.low}" stop-opacity="0"/></radialGradient><circle cx="${R(clamp(L.sun.x, -300, 1900))}" cy="${R(Math.min(L.sun.y, hor))}" r="520" fill="url(#${u}g)" opacity="${F(gold)}"/>`;
    // stars in three twinkle groups: each a round dot (a zero-length stroke, about 11 bytes), one in seven a little longer and brighter
    if (r.stars && (L.stars || 0) > 0.02) {
      const g = ['', '', ''], cnt = Math.min(220, r.stars | 0);
      for (let i = 0; i < cnt; i++) { const x = R(rnd() * 1600), y = R(rnd() * (hor - 20)), s = rnd() < 0.15 ? 1 : 0; g[i % 3] += `M${x} ${y}h${s}`; }
      parts.stars = `<g stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity="${F(L.stars)}">` + g.map((d, i) => `<path class="x-srtw" style="--d:-${i * 1.1}s;--ad:${F(2.6 + i * 0.8)}s" d="${d}"/>`).join('') + '</g>';
    }
    // the moon: real azimuth / altitude through the retro view, the real phase and limb (a sky painted at night keeps its own)
    const m = L.moon;
    if (r.moon && !paintedNight && m && m.show && dark > 0.15) {
      const mr = 16, f = Math.acos(clamp(1 - 2 * (m.illum || 0), -1, 1)) / (2 * Math.PI);
      const disc = typeof almMoonDiscPath === 'function' ? almMoonDiscPath(clamp(f, 0.001, 0.4995), mr) : sceneD.circ(0, 0, mr);
      // a soft glow (brighter as the moon fills), the dark disc, the lit part turned to the real limb
      parts.moon = `<radialGradient id="${u}m"><stop offset=".2" stop-color="#dfe8f6" stop-opacity="${F(0.2 + 0.25 * m.illum)}"/><stop offset="1" stop-color="#dfe8f6" stop-opacity="0"/></radialGradient>`
        + `<circle cx="${R(m.x)}" cy="${R(m.y)}" r="${R(mr * (4 + 3 * m.illum))}" fill="url(#${u}m)"/><g transform="translate(${R(m.x)} ${R(m.y)})"><circle r="${mr}" fill="#3a4660" opacity="${F(0.3 * dark)}"/><path transform="rotate(${F((m.limb == null ? 90 : m.limb) - 90)})" d="${disc}" fill="#f3eedc"/></g>`;
    }
    // the live sun (art without a painted sun)
    if (r.sun === 'live' && L.sun && L.sun.show) parts.sun = `<circle cx="${R(L.sun.x)}" cy="${R(L.sun.y)}" r="70" fill="${L.lowSun || '#fff2c8'}" opacity=".35"/><circle cx="${R(L.sun.x)}" cy="${R(L.sun.y)}" r="24" fill="#fff6dc"/>`;
    // the art, re-lit: the sky restyled, the painted sun faded, the land graded (the lit pieces kept)
    const lit = r.lamps || r.grade ? pick(markup, LIT) : [];
    const f = r.grade ? toner(L, e) : null, ranges = [];
    let removed = 0;
    // the sky is never graded: its gradient turns into the live sky by k
    if (sky) ranges.push({ start: sky.grad.start, end: sky.grad.end, text: r.veil && k > 0.01 ? restyle(sky.grad.text, L, k, hor) : sky.grad.text });
    for (const x of lit) ranges.push({ start: x.start, end: x.end, text: markup.slice(x.start, x.end) });
    if (r.veil && k > 0.03) for (const s of markup.matchAll(SUN)) {
      const fade = 1 - k, text = f ? s[0].replace(COLOUR, (_, a, c) => a + f(c) + '"') : s[0];
      ranges.push({ start: s.index, end: s.index + s[0].length, text: fade < 0.03 ? '' : `<g opacity="${F(fade)}">${text}</g>` });
      if (fade < 0.03) removed += s[0].length;
    }
    const art = relight(markup, ranges, f);
    // the season (a picture of 'any' season, outside the tropics; winter graded by latitude, sceneRetroSeason); winter's frost (a screen) fades at night, where it would grey the dark sky
    const season = o.season, sg = sceneRetroSeason(o.lat, NaN, season), tint = { spring: ['#cfe8a0', 'soft-light', 0.1, 12], summer: [null, null, 0, 8], autumn: ['#d27a2c', 'soft-light', 0.2, 16], winter: ['#e8eef6', 'screen', 0.18, 30] }[season];
    if (r.season === 'auto' && tint && !o.fixedSeason && (sg.tint || sg.desat || sg.fall)) {
      // a part-strength frost keeps three decimals, so it still fades at night instead of rounding away
      const op = tint[1] === 'screen' ? tint[2] * (1 - 0.8 * dark) : tint[2];
      if (tint[0]) parts.season = (sg.tint ? `<rect x="-160" y="-80" width="1920" height="1060" fill="${tint[0]}" opacity="${sg.tint < 1 ? Math.round(op * sg.tint * 1000) / 1000 : F(op)}" style="mix-blend-mode:${tint[1]}"/>` : '')
        + (season === 'winter' ? `<rect x="-160" y="-80" width="1920" height="1060" fill="#8a8f96" opacity="${sg.desat < 1 ? F(0.25 * sg.desat) : '.25'}" style="mix-blend-mode:saturation"/>` : '');
      const cnt = R((tint[3] + (season === 'winter' && L.snow ? 30 : 0)) * sg.fall);
      if (r.particles && cnt) {
        const col = { spring: '#f6d4e0', summer: '#fff6c8', autumn: '#c8682a', winter: '#ffffff' }[season];
        let d = '';
        for (let i = 0; i < cnt; i++) { const x = R(rnd() * 1600), y = R(rnd() * 200 - 60), s = season === 'autumn' ? 4 : 2.4; d += `<circle class="x-srfall" style="--d:-${F(rnd() * 14)}s;--dx:${R(20 + rnd() * 60)}px" cx="${x}" cy="${y}" r="${s}"/>`; }
        parts.particles = `<g fill="${col}" opacity=".8">${d}</g>`;
      }
    }
    // the live weather
    if (r.weather) {
      if (L.rain) { let d = ''; for (let i = 0; i < 90; i++) { const x = R(rnd() * 1700 - 50), y = R(rnd() * 900); d += `M${x} ${y}l-6 18`; } parts.weather += `<path d="${d}" stroke="#c8d4e0" stroke-width="1.2" opacity=".45"/>`; }
      if (L.snow && !(r.season === 'auto' && season === 'winter')) { let d = ''; for (let i = 0; i < 60; i++) d += `M${R(rnd() * 1600)} ${R(rnd() * 900)}h2.4v2.4h-2.4z`; parts.weather += `<path d="${d}" fill="#fff" opacity=".8"/>`; }
      if (L.fog) parts.weather += `<rect x="-160" y="-80" width="1920" height="1060" fill="${L.haze || '#d6e2e6'}" opacity=".35"/>`;
    }
    // windows and lamps: the art's own lit pieces, lit at real dusk by the class round the art (76-scene.css); no copies
    const lamps = r.lamps && L.windows && lit.length;
    // the live sky goes straight after the painted one (found again: the restyled stops moved it), behind everything else
    const defs = r.sky ? `<defs><clipPath id="${u}s"><path d="${r.sky}"/></clipPath></defs>` : '', at = sky ? (skyOf(art) || { end: 0 }).end : 0;
    const assemble = () => {
      const bits = parts.glow + parts.stars + parts.moon + parts.sun, inner = bits ? art.slice(0, at) + `<g class="sr-sky"${clip}>${bits}</g>` + art.slice(at) : art;
      return `<g class="sr-retro"><g class="sr-back">${lamps ? '<g class="sr-lamps">' + inner + '</g>' : inner}</g>${defs}${parts.season}${parts.particles}${parts.weather}</g>`;
    };
    // the budget counts every byte the retrofit adds (the graded art's growth included), and the painted sun it took away
    const size = () => assemble().length - markup.length + removed;
    for (const key of ['particles', 'stars', 'weather', 'season']) if (size() > SCENE_RETRO_MAX_BYTES) parts[key] = '';
    return assemble();
  }
  return function sceneRetrofitSvg(markup, L, retro, o) {
    if (!L) return markup;
    return build(String(markup), L, retro, o || {});
  };
})();
/**
 * The season overlay of a picture of 'any' season at latitude lat on the date ms (PURE; hemisphere aware through sceneSeason;
 * a season already known may be passed instead of the date): { season, tint, desat, fall }, each the share (0..1) of the
 * full overlay: tint the colour layer (winter's white frost), desat winter's grey saturation layer, fall the particles.
 * Within the tropics (|lat| < 23.5) nothing. Winter by how plausible snow is: 23.5..35 (Florida, the Gulf, the deserts) only
 * the mild desaturation at half strength, no frost and no flecks; 35..45 the frost and flecks ramp in; from 45 the full winter.
 */
function sceneRetroSeason(lat, ms, season) {
  const a = Math.abs(lat || 0), s = season || (typeof sceneSeason === 'function' ? sceneSeason(ms, lat, { season: 'auto', tropic: 'summer' }) : 'summer');
  if (a < 23.5) return { season: s, tint: 0, desat: 0, fall: 0 };
  if (s !== 'winter') return { season: s, tint: 1, desat: 1, fall: 1 };
  const snow = Math.max(0, Math.min(1, (a - 35) / 10));
  return { season: s, tint: snow, desat: 0.5 + 0.5 * snow, fall: snow };
}
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
    // the light is the viewer's real sky; the season is the picture's own place (a tropical scene never frosts, wherever it is seen from)
    const place = Number.isFinite(sky.lat) ? sky.lat : lat;
    const season = sceneRetroSeason(place, o.sky.ms).season;
    const L = sceneLight({ sky: o.sky }, { lat, lon, heading: r.heading, fov: r.fov, horizon: r.horizon, season });
    return sceneRetrofitSvg(markup, L, r, { season, lat: place, fixedSeason, key: item.id || '' });
  };
  // reduced: 'static' draws svg(o) (wrapped); a reduced() function keeps its own still art
  return Object.assign({}, item, { retro: retro || {}, svg: wrapped });
}
