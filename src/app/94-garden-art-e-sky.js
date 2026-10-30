/* ============================================================
   GARDEN ART, weather and light (2.18, agent 'garden-art'). PURE: strings only.
   Overlays for a whole garden scene, in the scene's own units (w x h, the
   ground starting at y = top). The renderer (94-garden-3render.js) asks for
   them through two guarded hooks; anyone else may too (a friend's garden).

   gartWeather(kind, o)     kind: 'rain' | 'snow' | 'sun' | 'petals' | 'leaves' | 'mist' | 'fireflies' | 'auto'
                            o {w, h, top, size: 's'|'m'|'l', seed, season, tod, rain: {now, snow}}
                            'auto' picks from the scene: rain or snow when it falls; else spring petals, sun rays
                            on summer days, autumn leaves, mist at a cold dawn, fireflies on summer nights.
                            Returns a <g> ('' for nothing).
   gartLighting(tod, o)     the light of the hour over the garden (no gradients: soft stacked bands):
                            dawn a rosy haze low down, dusk a golden hour turning violet, night a cool
                            moonlit wash from the top. o {w, h, top, season}. '' by day.

   CHEAP. Rain and snow are three looping layers each (one path per layer, a pattern
   that repeats every P units, slid down by P: seamless), not a node per drop; the
   rest are a dozen small shapes. Motion is CSS (94-garden-art.css: gart-fall,
   gart-snowf, gart-rays, gart-leaf, gart-drift, gart-glimmer) and stops with the
   scene (reduced motion, the Fun level Off, a hidden tab).
   ============================================================ */
const _gartWxN = (o, s, m, l) => (o.size === 's' ? s : o.size === 'l' ? l : m);

/** A layer of streaks repeating every P units down, covering w x (h + P) from y = -P; slides down by P forever. */
function _gartRainLayer(r, o, n, P, len, slant, col, w, op, dur) {
  const A = GART, f1 = A.f1;
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = r() * (o.w + 40) - 20, y = r() * P;
    for (let k = -1; k * P < o.h; k++) d += `M${f1(x - slant * (y + k * P) / 40)} ${f1(y + k * P)}l${f1(-slant * len / 40)} ${f1(len)}`;
  }
  return `<g class="gart-fall" style="--gp:${P}px;--gx:${f1(-slant * P / 40)}px;animation-duration:${dur}s;animation-delay:-${f1(r() * dur)}s">${A.S(col, w, d, op)}</g>`;
}
function _gartSnowLayer(r, o, n, P, R, op, dur) {
  const A = GART, f1 = A.f1;
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = r() * (o.w + 20) - 10, y = r() * P, rad = R * (0.7 + r() * 0.6);
    for (let k = -1; k * P < o.h; k++) d += A.circ(x, y + k * P, rad);
  }
  return `<g class="gart-snowf" style="--gp:${P}px;animation-duration:${dur}s;animation-delay:-${f1(r() * dur)}s">${A.P('#ffffff', d, op)}</g>`;
}

/**
 * The garden's small residents, whether or not they count as visitors: butterflies and bees over what is in flower, dragonflies over
 * water, a bird or two crossing the sky by day, moths at dusk. Each is a few nodes; there are never more than about ten.
 */
function _gartAmbient(o) {
  const A = GART, f1 = A.f1, r = A.rng(A.hash('amb|' + o.seed + '|' + o.season)), W = GARDEN_WORLD;
  if (o.size === 's') return '';
  const blooms = (o.plants || []).filter(p => p.stage >= 3).slice(0, 80);
  const at = (p, lift) => [(p.x + 0.5) * W.cellW, W.sky + (p.y + 0.6) * W.cellH - lift];
  let s = '';
  const fly = (x, y, rad, d, inner) => `<g transform="translate(${f1(x)} ${f1(y)})"><g class="gart-amb" style="--r:${f1(rad)}px;--d:${f1(d)}s;--dl:-${f1(r() * d)}s">${inner}</g></g>`;
  const wings = (c, c2) => `<g class="gart-wing"><path fill="${c}" stroke="${A.dk(c, 0.55)}" stroke-width="0.4" d="M0 0C-2 -5 -7 -6 -7.4 -2.6C-7.6 -0.6 -4 0.4 0 0zM0 0C-3 1 -5.6 2 -4.8 4C-3.8 5.2 -1 3.4 0 0z"/>${A.P(c2, A.circ(-4.6, -2.8, 1))}</g><g class="gart-wing is-r"><path fill="${c}" stroke="${A.dk(c, 0.55)}" stroke-width="0.4" d="M0 0C2 -5 7 -6 7.4 -2.6C7.6 -0.6 4 0.4 0 0zM0 0C3 1 5.6 2 4.8 4C3.8 5.2 1 3.4 0 0z"/>${A.P(c2, A.circ(4.6, -2.8, 1))}</g><path fill="#3a2c24" d="M-0.5 -2.6h1l.2 5.2h-1.4z"/>`;
  const warm = o.season === 'spring' || o.season === 'summer' || o.season === 'autumn';
  if (o.tod === 'day' && warm && blooms.length) {
    const bcols = o.season === 'autumn' ? [['#d9671c', '#fbe0a0'], ['#8a4a24', '#f4c47a']] : [['#fbf7ee', '#3a3a3a'], ['#f2a832', '#3a2410'], ['#8ab4f0', '#fff0c0'], ['#e87a98', '#fff0c0']];
    const nb = Math.min(4, 1 + Math.floor(blooms.length / 8));
    for (let i = 0; i < nb; i++) { const [x, y] = at(blooms[Math.floor(r() * blooms.length)], 26), c = bcols[i % bcols.length]; s += fly(x, y, 30 + r() * 26, 15 + r() * 10, wings(c[0], c[1])); }
    const nq = Math.min(4, Math.floor(blooms.length / 6));
    for (let i = 0; i < nq; i++) { const [x, y] = at(blooms[Math.floor(r() * blooms.length)], 18); s += fly(x, y, 12 + r() * 10, 6 + r() * 5, `<g class="gart-wing is-fast"><path fill="#ffffff" fill-opacity="0.8" d="M0 -1.2C-1 -4 -4.4 -4 -4.4 -2C-4.4 -1 -2 -0.8 0 -1.2z"/></g><g class="gart-wing is-r is-fast"><path fill="#ffffff" fill-opacity="0.8" d="M0 -1.2C1 -4 4.4 -4 4.4 -2C4.4 -1 2 -0.8 0 -1.2z"/></g><path fill="#f2b81e" stroke="#6a4a10" stroke-width="0.35" d="${A.ell(0, 0, 2.6, 1.9)}"/><path fill="#2c2018" d="M-1 -1.8h0.9v3.6h-0.9zM0.8 -1.7h0.8v3.4h-0.8z"/>`); }
  }
  if ((o.tod === 'day' || o.tod === 'dusk') && warm && (o.areas || []).includes('lake')) {
    const a = gardenArea('lake');
    if (a && a.water) for (let i = 0; i < 2; i++) { const x = r() * W.cols * W.cellW, y = W.sky + (a.water.y + 0.4 + r()) * W.cellH - 18; s += fly(x, y, 34 + r() * 30, 11 + r() * 7, `<g class="gart-wing is-fast"><path fill="#cfe8f4" fill-opacity="0.75" d="M0 0L-9 -1.6Q-9.4 0.4 0 0z"/></g><g class="gart-wing is-r is-fast"><path fill="#cfe8f4" fill-opacity="0.75" d="M0 0L9 -1.6Q9.4 0.4 0 0z"/></g><path fill="#2a78a8" stroke="#123a58" stroke-width="0.35" d="M-0.7 -2.6Q0 -3.4 0.7 -2.6L0.4 7Q0 7.6 -0.4 7z"/>`); }
  }
  if (o.tod === 'dusk' && (o.plants || []).length) for (let i = 0; i < 2; i++) { const [x, y] = at(o.plants[Math.floor(r() * o.plants.length)], 30); s += fly(x, y, 26 + r() * 20, 9 + r() * 6, wings('#c8b89a', '#6a5a44')); }
  if (o.tod === 'day' && o.season !== 'winter') {
    // now and then a small flock crosses the sky
    const y = 24 + r() * 50, dir = r() < 0.5, w = W.cols * W.cellW;
    let b = ''; for (let i = 0; i < 4; i++) { const bx = (i % 2 ? -1 : 1) * i * 7, by = i * 4 + (i % 2) * 2; b += `<path fill="none" stroke="#3a4656" stroke-width="1.1" stroke-linecap="round" d="M${bx - 4} ${by - 1}q2 -2 4 0q2 -2 4 0"/>`; }
    s += `<g transform="translate(${dir ? -60 : w + 60} ${f1(y)})"><g class="gart-fly" style="--gx:${dir ? w + 120 : -w - 120}px;--gy:${f1((r() - 0.5) * 30)}px;--d:${f1(90 + r() * 60)}s;--dl:-${f1(r() * 100)}s">${b}</g></g>`;
  }
  return s ? `<g class="gart-wx gart-wx-life" aria-hidden="true">${s}</g>` : '';
}

function gartWeather(kind, o) {
  const A = GART, f1 = A.f1, rr = A.rr;
  o = Object.assign({ w: 960, h: 480, top: 150, size: 'm', season: 'summer', tod: 'day', seed: '' }, o || {});
  const r = A.rng(A.hash('wx|' + kind + '|' + o.seed));
  if (kind === 'auto') {
    const rain = o.rain || {};
    if (rain.snow) return gartWeather('snow', o);
    if (rain.now) return gartWeather('rain', o);
    const am = _gartAmbient(o);
    if (o.tod === 'night') return (o.season === 'summer' || o.season === 'spring' ? gartWeather('fireflies', o) : '') + am;
    if (o.tod === 'dawn' && (o.season === 'autumn' || o.season === 'winter')) return gartWeather('mist', o) + am;
    if (o.season === 'spring' && o.tod === 'day') return gartWeather('petals', o) + am;
    if (o.season === 'autumn' && o.tod !== 'dusk') return gartWeather('leaves', o) + am;
    if (o.season === 'summer' && (o.tod === 'day' || o.tod === 'dawn')) return gartWeather('sun', o) + am;
    return am;
  }
  let s = '';
  if (kind === 'rain') {
    // a grey veil, three depths of slanting rain (far: fine and pale), and rings where drops land on the ground
    s += A.P('#8a98a8', A.rect(0, 0, o.w, o.h), 0.1);
    s += _gartRainLayer(r, o, _gartWxN(o, 18, 34, 46), 70, 9, 6, '#e4eef6', 0.7, 0.45, 0.9);
    s += _gartRainLayer(r, o, _gartWxN(o, 12, 24, 32), 90, 13, 8, '#dce8f2', 1, 0.6, 0.7);
    s += _gartRainLayer(r, o, _gartWxN(o, 6, 12, 16), 120, 18, 10, '#f0f6fa', 1.3, 0.7, 0.55);
    let rings = '';
    for (let i = 0; i < _gartWxN(o, 6, 14, 20); i++) { const x = r() * o.w, y = o.top + 10 + r() * (o.h - o.top - 14); rings += `<g class="gda-ripple" style="animation-delay:-${f1(r() * 4.5)}s">${A.S('#ffffff', 0.8, A.ell(x, y, 4 + r() * 3, 1.4), 0.6)}</g>`; }
    return `<g class="gart-wx gart-wx-rain" aria-hidden="true">${s + rings}</g>`;
  }
  if (kind === 'snow') {
    s += A.P('#e8eef4', A.rect(0, 0, o.w, o.h), 0.12);
    s += _gartSnowLayer(r, o, _gartWxN(o, 16, 30, 40), 110, 1.2, 0.7, 14) + _gartSnowLayer(r, o, _gartWxN(o, 12, 22, 30), 140, 1.8, 0.85, 10) + _gartSnowLayer(r, o, _gartWxN(o, 6, 12, 16), 180, 2.6, 0.95, 7.5);
    return `<g class="gart-wx gart-wx-snow" aria-hidden="true">${s}</g>`;
  }
  if (kind === 'sun') {
    // motes of light drifting in the sun (long rays were tried: hard-edged wedges across the lake, so no)
    let motes = '';
    for (let i = 0; i < _gartWxN(o, 4, 9, 12); i++) motes += A.circ(r() * o.w * 0.7, o.top - 40 + r() * (o.h - o.top), 1 + r());
    return `<g class="gart-wx gart-wx-sun" aria-hidden="true"><g class="gart-glimmer">${A.P('#fffbe0', motes, 0.7)}</g></g>`;
  }
  if (kind === 'petals' || kind === 'leaves') {
    const cols = kind === 'petals' ? ['#f8c6d6', '#fbe3ec', '#ffffff'] : ['#d9671c', '#e8a23a', '#c0392b', '#b8862a'];
    for (let i = 0; i < _gartWxN(o, 4, 8, 11); i++) {
      const x = r() * o.w, y0 = -20 - r() * 60, d = kind === 'petals' ? A.petal(0, 0, r() * 6, 3.4, 1.8) : A.leaf(0, 0, r() * 6, 6, 2.2);
      s += `<g transform="translate(${f1(x)} ${f1(y0)})"><g class="gart-leaf" style="--gy:${f1(o.h + 60)}px;--gx:${f1(rr(r, -40, 40))}px;animation-duration:${f1(rr(r, 12, 20))}s;animation-delay:-${f1(r() * 20)}s">${A.P(cols[i % cols.length], d)}</g></g>`;
    }
    return `<g class="gart-wx gart-wx-${kind}" aria-hidden="true">${s}</g>`;
  }
  if (kind === 'mist') {
    // low soft banks of mist lying on the lawn at a cold dawn, drifting
    let banks = '';
    for (let i = 0; i < _gartWxN(o, 2, 3, 4); i++) { const y = o.top + 20 + i * (o.h - o.top) / 3.4, x = r() * o.w * 0.4; banks += A.blob(r, x + o.w * 0.3, y, o.w * 0.42, 14 + r() * 8, 12, 0.3); }
    return `<g class="gart-wx gart-wx-mist" aria-hidden="true"><g class="gart-drift" style="animation-delay:-${f1(r() * 40)}s">${A.P('#f2f4f6', banks, 0.32)}</g></g>`;
  }
  if (kind === 'fireflies') {
    for (let i = 0; i < _gartWxN(o, 6, 12, 16); i++) {
      const x = r() * o.w, y = o.top + 10 + r() * (o.h - o.top - 10), dot = A.P('#d8ff7a', A.circ(x, y, 6), 0.18) + A.P('#e8ff9a', A.circ(x, y, 3), 0.4) + A.P('#fbffd8', A.circ(x, y, 1.2));
      s += `<g class="gart-buzz" style="animation-duration:${f1(rr(r, 6, 11))}s;animation-delay:-${f1(r() * 10)}s"><g class="gda-glow" style="animation-delay:-${f1(r() * 3)}s">${dot}</g></g>`;
    }
    return `<g class="gart-wx gart-wx-fireflies" aria-hidden="true">${s}</g>`;
  }
  return '';
}

function gartLighting(tod, o) {
  const A = GART;
  o = Object.assign({ w: 960, h: 480, top: 150, season: 'summer' }, o || {});
  const band = (y0, y1, col, op) => A.P(col, A.rect(0, y0, o.w, y1 - y0), op);
  if (tod === 'dawn') return `<g class="gart-light gart-light-dawn" aria-hidden="true">${band(o.top - 30, o.h, '#ffb48a', 0.08) + band(o.top + (o.h - o.top) * 0.5, o.h, '#f6c8d8', 0.08)}</g>`;
  if (tod === 'dusk') return `<g class="gart-light gart-light-dusk" aria-hidden="true">${band(0, o.h, '#ffb070', 0.08) + band(o.top - 20, o.top + (o.h - o.top) * 0.4, '#ffd08a', 0.08) + band(o.top + (o.h - o.top) * 0.6, o.h, '#6a3a7a', 0.1)}</g>`;
  if (tod === 'night') return `<g class="gart-light gart-light-night" aria-hidden="true">${band(o.top - 16, o.top + (o.h - o.top) * 0.35, '#a8c0f0', 0.06) + band(o.top + (o.h - o.top) * 0.7, o.h, '#0b1630', 0.1)}</g>`;
  return '';
}

