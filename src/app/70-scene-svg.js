/* ============================================================
   SCENE ENGINE: the SVG still renderer and the helpers both renderers share
   (docs/dev/SCENE_ENGINE.md sections 4, 6.1, 6.2, 6.5 and 8.3; builder B).
   PURE classic script: no DOM and no page globals at load; it only defines
   functions and consts. The core (70-scene-0core.js: sceneCompile, sceneLight,
   sceneObjShapes, sceneColour, sceneWind ...) is called lazily, inside functions.

   sceneSvg(dataOrThunk, o)    ONE still frame of a composed scene (t = 0: every actor at its
                               offset, every hook at its phase) as the inner markup of a
                               <svg viewBox="0 0 1600 900">. Used by Node, tests, PNG sheets, tiny
                               sizes and browsers without a canvas. Symbols + <use>, fresh ids.
   sceneRendererFor(it, o)     'canvas' | 'svg' (the table in 6.1)
   sceneHostAttrs(it, o)       the data-sc-* attributes and the placeholder sky colours of a canvas host
   sceneSvgCss()               '' (a still needs no keyframes)
   Shared with 78-scene-canvas.js (pure, so Node tests them):
   sceneLodFor(size, detail)   the level of detail of a size (fill/hero 1, tile .5, lg/xl .3, smaller .15)
   sceneLightKey(L, season)    the quantised light: sprites and bitmaps re-bake only when it changes
   sceneSpriteKey(...)         the sprite cache key (6.3)
   sceneAnimPose(a, t, L, x)   one hook's object-local affine matrix [a b c d e f] and alpha at time t
   sceneActorAt(a, t)          an actor's place on its path at t: {x, y, s, dir, alpha}
   sceneFlockAt(f, i, t)       bird i of a flock at t: {x, y, s, dir}
   sceneParticleSet / sceneParticleAt   seeded season particles (petals, motes, leaves, snow) and rain
   sceneBakePlan(C)            which layers share a bake bitmap (at most 5 land bitmaps + the sky)
   sceneFrameDraws(C)          the animated draws per frame (the 300 budget)
   scenePathBox(d, m)          the (conservative) bounds of SVG path data, through a matrix
   sceneSignLayout(sign)       the board, bars and text box of a sign (both renderers draw the same)
   ============================================================ */
const SCENE_SVG_FILL_MAX_BYTES = 1000000, SCENE_SVG_TILE_MAX_BYTES = 150000;
const SCENE_SIGN_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SCENE_DRAW_BUDGET = 300;
const SCENE_MAX_BITMAPS = 6;

/** The level of detail for a size (6.1): fill / hero 1 (0.5 for Home's card, detail 'tile'), lg / xl 0.3, smaller 0.15. */
function sceneLodFor(size, detail) {
  if (!size || size === 'fill' || size === 'hero') return detail === 'tile' ? 0.5 : 1;
  return size === 'lg' || size === 'xl' ? 0.3 : 0.15;
}
const _SC_SMALL_SIZES = ['xs', 'sm', 'md', 'tip', 'dense'];
/** Which renderer draws a composed item at these options (6.1). The canvas only exists in the browser bundle. */
function sceneRendererFor(it, o) {
  o = o || {};
  if (o.renderer === 'svg') return 'svg';
  if (typeof sceneCanvasSupported !== 'function' || !sceneCanvasSupported()) return 'svg';
  if (_SC_SMALL_SIZES.includes(o.size || 'md')) return 'svg';
  return 'canvas';
}
/** The scene data of an item, a data object or a thunk (thunks are evaluated once). */
const _scThunks = new WeakMap();
function _scDataOf(x) {
  if (x && x.composed && typeof sceneData === 'function') return sceneData(x);
  const s = x && x.scene !== undefined && !x.layers && !x.place ? x.scene : x;
  if (typeof s !== 'function') return s;
  if (!_scThunks.has(s)) _scThunks.set(s, s());
  return _scThunks.get(s);
}
/** The season to draw (5.1): o.season, else a fixed scene season, else from the live clock, else 'summer'. */
function _scSeasonOf(data, o) {
  if (o && o.season) return o.season;
  if (data.season && data.season !== 'auto') return data.season;
  if (o && o.sky && Number.isFinite(o.sky.ms) && typeof sceneSeason === 'function') return sceneSeason(o.sky.ms, data.view && data.view.lat, data);
  return 'summer';
}
/** The light for a scene at these options (sceneLight with the view, the season and the authored moment). */
function _scLightOf(data, o, season) {
  const view = Object.assign({}, data.view || {}, { season, at: data.at || (data.view && data.view.at) });
  return typeof sceneLight === 'function' ? sceneLight(o || {}, view) : null;
}
/** The data-sc-* attributes of a canvas host (6.2) and the placeholder sky colours. */
function sceneHostAttrs(it, o) {
  o = o || {};
  const lod = sceneLodFor(o.size, o.detail);
  const reduced = !!o.reduced, still = reduced || !(o.live || o.hover);
  let top = '#3a80c4', low = '#dcebf2';
  try {
    const data = _scDataOf(it), season = _scSeasonOf(data, o), L = _scLightOf(data, o, season);
    if (L && /^#[0-9a-f]{6}$/i.test(L.top || '')) top = L.top;
    if (L && /^#[0-9a-f]{6}$/i.test(L.low || '')) low = L.low;
  } catch (e) { /* the placeholder stays the day sky */ }
  // the sky the host draws: "off" (the authored moment, QA), "ms,lat,lon" (the host keeps it fixed when it is far from now), else live
  const sk = o.sky && Number.isFinite(o.sky.ms) ? ` data-sc-sky="${Math.round(o.sky.ms)},${_scR2(o.sky.lat)},${_scR2(o.sky.lon)}"` : o.lighting === false ? ' data-sc-sky="off"' : '';
  const se = o.season && /^(spring|summer|autumn|winter)$/.test(o.season) ? ` data-sc-season="${o.season}"` : '';
  return ` data-sc-lod="${lod}" data-sc-still="${still ? 1 : 0}" data-sc-hover="${o.hover && !reduced ? 1 : 0}"${sk}${se} style="--sc-top:${top};--sc-low:${low}"`;
}
/** Keyframes the still SVG needs: none. */
function sceneSvgCss() { return ''; }

/* ---------- small pure helpers ---------- */
const _scR1 = v => Math.round(v * 10) / 10, _scR2 = v => Math.round(v * 100) / 100;
const _scClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _scFrac = v => v - Math.floor(v);
function _scEsc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function _scHex(c) { let s = String(c || '').replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function _scMixHex(a, b, t) { if (!t || !b) return a; const A = _scHex(a), B = _scHex(b), k = _scClamp(t, 0, 1); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
/** A colour graded for the light (sceneColour when the core is loaded). */
function _scCol(c, L, haze, tint) { return typeof sceneColour === 'function' && L ? sceneColour(c, { L, haze, tint }) : c; }
function _scRndOf(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

/** Conservative bounds [x0, y0, x1, y1] of SVG path data (control points included), mapped through m. */
function scenePathBox(d, m) {
  const tok = String(d || '').match(/[MLHVCSQTAZmlhvcsqtaz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g);
  if (!tok) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, cx = 0, cy = 0, sx = 0, sy = 0, cmd = 'M', i = 0;
  const add = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
  const N = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) { cmd = tok[i++]; if (cmd === 'Z' || cmd === 'z') { cx = sx; cy = sy; continue; } }
    const U = cmd.toUpperCase(), rel = cmd !== U, n = N[U];
    if (!n || i + n > tok.length) break;
    const a = tok.slice(i, i + n).map(Number); i += n;
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    if (U === 'H') { cx = ox + a[0]; add(cx, cy); }
    else if (U === 'V') { cy = oy + a[0]; add(cx, cy); }
    else if (U === 'A') { const ex = ox + a[5], ey = oy + a[6], r = Math.max(Math.abs(a[0]), Math.abs(a[1])); add(cx - r, cy - r); add(cx + r, cy + r); add(ex - r, ey - r); add(ex + r, ey + r); cx = ex; cy = ey; }
    else { for (let k = 0; k < n; k += 2) add(ox + a[k], oy + a[k + 1]); cx = ox + a[n - 2]; cy = oy + a[n - 1]; }
    if (U === 'M') { sx = cx; sy = cy; cmd = rel ? 'l' : 'L'; }
  }
  if (!isFinite(x0)) return null;
  if (!m) return [x0, y0, x1, y1];
  const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
}

/**
 * The quantised light (6.3): alt to 1 degree while |alt| < 12, else 5; cover to .1; the moon to .2; windows;
 * fog (the mist is baked); and the season. Sprites and bitmaps are re-made only when this changes.
 * C (optional): a compiled scene; for a v2 one (or a v1 one with fx) the render passes' keys are appended (V2 7.5).
 */
function sceneLightKey(L, season, C) {
  if (!L) return 'noL|' + (season || '');
  const alt = Number(L.alt) || 0, a = Math.abs(alt) < 12 ? Math.round(alt) : Math.round(alt / 5) * 5;
  const moon = L.moon && L.moon.show ? Math.round((L.moon.illum || 0) * 5) / 5 : 0;
  const k = [a, Math.round((L.cover || 0) * 10) / 10, moon, L.windows ? 1 : 0, L.fog ? 1 : 0, season || ''].join('|');
  // v2 scenes only (V2 7.5, 13.1): the render passes' own keys (the sun's side, the weather ...); v1 keys are unchanged
  const pk = C && typeof sceneRenderPassKey === 'function' ? sceneRenderPassKey(L, C) : '';
  return pk ? k + '|' + pk : k;
}
/** The sprite cache key: (obj, v, part, season, haze, tint, device scale, light). */
function sceneSpriteKey(o, v, part, season, haze, tint, scale, lightKey) {
  return o + '|' + v + '|' + part + '|' + season + '|' + _scR1(haze || 0) + '|' + (tint ? tint[0] + ':' + _scR2(tint[1]) : '-') + '|' + Math.round(scale * 64) / 64 + '|' + lightKey;
}

/* ---------- motion (shared by the canvas frames and the SVG still at t = 0) ---------- */
const _SC_ID = [1, 0, 0, 1, 0, 0];
function _scMul(A, B) { return [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]]; }
/** Rotate (degrees) and scale (sx, sy) about a pivot, then translate (tx, ty): an object-local matrix. */
function _scAbout(px, py, deg, sx, sy, tx, ty) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const a = c * sx, b = s * sx, cc = -s * sy, d = c * sy;
  return [a, b, cc, d, px - a * px - cc * py + tx, py - b * px - d * py + ty];
}
/**
 * One hook's pose at time t (seconds): { m: [a b c d e f] object-local, alpha, parts }. x: the placement's world x
 * (the wind is one shared field across the scene, 5.4). Kinds and parameters as in 2.4.
 */
function sceneAnimPose(a, t, L, x) {
  const k = a.k == null ? 1 : a.k, per = a.period || 3, ph = a.phase || 0, p = a.pivot || [0, 0], w = 2 * Math.PI * (t / per + ph);
  switch (a.kind) {
    case 'sway': { const wind = typeof sceneWind === 'function' ? sceneWind(t, x || 0, L) : Math.sin(t); return { m: _scAbout(p[0], p[1], (a.deg || 2) * k * wind, 1, 1, 0, 0), alpha: 1 }; }
    case 'bob': return { m: _scAbout(0, 0, 0, 1, 1, 0, (a.dy || 2) * k * Math.sin(w)), alpha: 1 };
    case 'flap': { const sy = a.sy || [0.3, 1], v = sy[0] + (sy[1] - sy[0]) * (0.5 + 0.5 * Math.sin(w)); return { m: _scAbout(p[0], p[1], 0, 1, v, 0, 0), alpha: 1 }; }
    case 'walk': return { m: _scAbout(p[0], p[1], (a.deg || 22) * k * Math.sin(w), 1, 1, 0, 0), m2: _scAbout(p[0], p[1], -(a.deg || 22) * k * Math.sin(w), 1, 1, 0, 0), bob: -(a.bob == null ? 1.5 : a.bob) * Math.abs(Math.sin(w)), alpha: 1 };
    case 'paddle': return { m: _scAbout(0, 0, (a.deg || 2) * k * Math.sin(w + 1.3), 1, 1, 0, (a.dy || 1.5) * k * Math.sin(w)), alpha: 1 };
    case 'turn': { const hold = a.hold == null ? 0.6 : a.hold, u = _scFrac(t / per + ph), v = u < hold ? 0 : Math.sin(Math.PI * (u - hold) / (1 - hold)); return { m: _scAbout(p[0], p[1], (a.deg || 14) * k * v, 1, 1, 0, 0), alpha: 1 }; }
    case 'flicker': { const op = a.op || [0.6, 1]; return { m: _SC_ID, alpha: op[0] + (op[1] - op[0]) * (0.5 + 0.5 * Math.sin(w)) }; }
    case 'spin': return { m: _scAbout(p[0], p[1], 360 * _scFrac(t / per + ph), 1, 1, 0, 0), alpha: 1 };
    case 'frames': {   // a raster object's frames (70-scene-0raster.js): one part shows at a time; hide: the first part (the body) never shows
      const ps = a.parts || [], h = a.hide ? 1 : 0, n = Math.max(1, ps.length - h), i = Math.floor(_scFrac(t / per + ph) * n) % n;
      return { m: _SC_ID, alpha: 1, alphas: ps.map((_, j) => (j - h === i ? 1 : 0)) };
    }
    default: return { m: _SC_ID, alpha: 1 };
  }
}
/** The parts a hook moves ('*' = the whole object). */
function _scAnimParts(a) { return a.parts ? a.parts : [a.part || '*']; }
/** The parts a still or a whole-object sprite draws: every part but 'lit' and the frames only a frames hook shows. */
function _scStillParts(sh) { return sh.still || sh.order.filter(p => p !== 'lit'); }
/** A pose's opacity for part j of its hook (a frames hook shows one part at a time). */
function _scPartAlpha(p, j) { return p.alphas ? p.alphas[j] * p.alpha : p.alpha; }
function _scLerpTab(tab, y) {
  if (!tab || !tab.length) return 1;
  if (y <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) { const [y0, s0] = tab[i - 1], [y1, s1] = tab[i]; return s0 + (s1 - s0) * (y - y0) / ((y1 - y0) || 1); }
  return tab[tab.length - 1][1];
}
/** An actor's place at t: along its path at `speed` units per second from `offset` (0..1 of the length). */
function sceneActorAt(a, t) {
  const path = a.path || [[0, 0], [1, 0]], len = a.len || 1, d0 = (a.offset || 0) * len + (a.speed || 0) * t;
  let d, back = false, alpha = 1;
  if (a.loop === 'pingpong') { const u = ((d0 % (2 * len)) + 2 * len) % (2 * len); back = u > len; d = back ? 2 * len - u : u; }
  else { d = ((d0 % len) + len) % len; if (a.loop === 'fade') alpha = _scClamp(Math.min(d, len - d) / 60, 0, 1); }
  let i = 1, acc = 0;
  for (; i < path.length; i++) { const sl = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); if (acc + sl >= d || i === path.length - 1) { const u = sl ? _scClamp((d - acc) / sl, 0, 1) : 0, x = path[i - 1][0] + (path[i][0] - path[i - 1][0]) * u, y = path[i - 1][1] + (path[i][1] - path[i - 1][1]) * u, dx = path[i][0] - path[i - 1][0];
    const dir = (dx < 0) !== back ? -1 : 1;
    return { x, y, s: (a.s || 1) * (a.sByY ? _scLerpTab(a.sByY, y) : 1), dir, alpha }; } acc += sl; }
  return { x: path[0][0], y: path[0][1], s: a.s || 1, dir: 1, alpha };
}
/** Bird i of a flock at t: seeded height, speed and drift; the flock crosses its area and wraps. */
function sceneFlockAt(f, i, t) {
  const r = _scRndOf((f.seed || 1) * 977 + i * 131 + 7), a = f.area || [0, 100, 1600, 300], W = a[2] - a[0] + 240;
  const r0 = r(), r1 = r(), r2 = r(), r3 = r(), dir = (f.seed + i) % 5 === 0 ? -1 : 1, sp = (f.speed || 30) * (0.8 + 0.4 * r1);
  const u = ((r0 * W + sp * t) % W + W) % W, x = dir > 0 ? a[0] - 120 + u : a[2] + 120 - u;
  const y = a[1] + r2 * (a[3] - a[1]) + 10 * Math.sin(t * 0.6 + r3 * 6.28);
  return { x, y, s: (f.s || 0.5) * (0.85 + 0.3 * r3), dir, phase: r3 };
}
/** Season particles (petals, motes, leaves, snow) and weather (rain, snow): seeded, positions are pure functions of t. */
function sceneParticleSet(kind, n, seed) {
  const r = _scRndOf(seed || 17), out = [];
  const pal = { petals: ['#fff4f6', '#f6c9d7', '#ffffff'], motes: ['#fff6d0', '#ffffff'], leaves: ['#c0702a', '#e0a040', '#8a4a1e'], snow: ['#ffffff', '#eef4fa'], rain: ['#c8d4e0'], wsnow: ['#ffffff'] }[kind] || ['#ffffff'];
  for (let i = 0; i < n; i++) out.push({ x0: -60 + r() * 1720, y0: r() * 1000, vy: kind === 'rain' ? 700 + r() * 300 : kind === 'motes' ? -4 - r() * 6 : kind === 'snow' || kind === 'wsnow' ? 22 + r() * 30 : 26 + r() * 30,
    vx: kind === 'rain' ? -60 : kind === 'motes' ? 3 : 10 + r() * 14, amp: kind === 'rain' ? 0 : 6 + r() * 18, f: 0.4 + r() * 0.9, ph: r() * 6.28, size: kind === 'rain' ? 14 + r() * 10 : kind === 'motes' ? 1.2 + r() * 1.6 : 2 + r() * 3, col: pal[i % pal.length], tw: r() });
  return out;
}
function sceneParticleAt(p, t) {
  const y = ((p.y0 + p.vy * t) % 1000 + 1000) % 1000 - 50, x = ((p.x0 + p.vx * t + p.amp * Math.sin(p.f * t + p.ph)) % 1760 + 1760) % 1760 - 80;
  return { x, y, a: 0.55 + 0.45 * Math.sin(t * (0.8 + p.tw) + p.ph) };
}
/** Is a layer drawn with moving content (animated parts, strips, actors, flocks, water shimmer)? */
function _scLayerDyn(C) {
  const dyn = C.layers.map(() => 0);
  for (const it of C.items) if (it.anim && it.anim.length && it.strip < 0) dyn[it.layer] += it.anim.length;
  for (const s of C.strips) dyn[s.layer] += 1;
  for (const a of C.actors) dyn[a.layer] += 1 + (a.anim ? a.anim.length : 0);
  for (const f of C.flocks) dyn[f.layer] += f.n;
  for (const w of C.water) if (w.shimmer || w.lightPath) dyn[w.layer] += 1;
  return dyn;
}
/**
 * Which layers share a bake bitmap (6.3): a new bitmap starts after a layer with moving content (so that content is drawn
 * between the bitmaps, in depth order). At most SCENE_MAX_BITMAPS - 1 land bitmaps (the sky is one): when there would be more,
 * the group with the fewest moving draws is merged into the next (its movers then draw over the next group's static layers).
 * Returns [{ layers: [i...], dyn: draws }].
 */
function sceneBakePlan(C) {
  const dyn = _scLayerDyn(C), groups = [];
  let cur = [];
  for (const l of C.layers) { cur.push(l.i); if (dyn[l.i]) { groups.push({ layers: cur, dyn: cur.reduce((n, i) => n + dyn[i], 0) }); cur = []; } }
  if (cur.length) groups.push({ layers: cur, dyn: 0 });
  while (groups.length > SCENE_MAX_BITMAPS - 1) {
    let k = 0;
    for (let i = 1; i < groups.length - 1; i++) if (groups[i].dyn < groups[k].dyn) k = i;
    const a = groups[k], b = groups[k + 1];
    groups.splice(k, 2, { layers: a.layers.concat(b.layers), dyn: a.dyn + b.dyn });
  }
  return groups;
}
/** The sprites drawn per frame (6.3, the 300 budget): animated parts, strips, actors (body + moving parts), flock birds. */
function sceneFrameDraws(C) {
  let n = 0;
  for (const it of C.items) if (it.strip < 0) for (const a of it.anim || []) n += _scAnimParts(a).length;
  n += C.strips.length;
  for (const a of C.actors) n += 1 + (a.anim || []).reduce((m, h) => m + (_scAnimParts(h)[0] === '*' ? 0 : _scAnimParts(h).length), 0);
  for (const f of C.flocks) n += f.n;
  // v2 (V2 12, 25): the flows' agents and the passes' effects (ripple bands, glints, rings, wakes, actor shadows ...), estimated by the compile
  const v2 = C.stats && C.stats.v2;
  if (v2) n += (v2.flowDraws || 0) + (v2.fxDraws || 0);
  return n;
}
/* ---------- v2 shared geometry: camera, water rows, ripple bands, glint, shadows (pure; V2 5, 6, 13.4; builder B) ----------
   Both renderers and the Node tests use these. The camera is A's C.cam in a v2 scene; a v1 scene that opted into an effect
   (fx, V2 14.2) gets the camera `scene migrate` would infer: eye 1.65 m, its view's fov and horizon, no water offset.

     sceneRenderCam(C)                     C.cam, or the inferred camera { eye, fov, horizon, x0, f, water, dMin, dMax, inferred }
     sceneCamProject(cam, x, d, h)         { X, Y, k } (A's sceneProject when the camera is real and A has landed)
     sceneCamDepthAt(cam, Y, h)            the ground depth of a screen row (Infinity at or above the horizon)
     sceneWaterRow(cam, d, level)          Yw(d): the waterline row of depth d (V2 5.3)
     sceneWaterMirrorY(cam, d, level, hb)  the row a base hb metres above the water mirrors to: Yw(d) + f * hb / d
     sceneWaterFresnel(mirror, u)          the reflection alpha at u (0 the near edge .. 1 the far edge)
     sceneWaterBands(y0, y1, unit, max)    the ripple bands [{ y, h }] of a region's device rows (2 px far .. 6 px near)
     sceneWaterRippleA(ripple, wind, u, unit)   the ripple amplitude (device px) at u (0 far .. 1 near)
     sceneWaterGlintSource(L, cam)         { kind: 'sun' | 'moon', x, col, k } or null: what makes the glitter road now
     sceneObjClassOf(id)                   A's sceneObjClass, or a fallback from the category and tags
     sceneShadowSun(L, C)                  the cast-shadow light now: { kind, g: [gx, gd], tan, op, blur, fade, contact } (V2 6.1)
     sceneShadowTip(cam, x, d, H, g, tan)  the ground tip [x, d] of a caster H metres tall (clamped in front of the camera)
     sceneShadowMatrix(cam, foot, s, hTop, flip, sh, vs, ox, oy)   the affine matrix that lays a sprite flat along a shadow
     sceneContactOf(id, cls, sh, s, d, cam)   the contact ellipses [[X offset, rx, ry]] (scene units) under a caster (V2 6.3)
     sceneWaterEdgeQuads(wv, d, cam)       a v2 region's bank edges as filled quads (coping, quay, wall, natural, beach)
     scenePolyPoints(d)                    polyline path data to points (null with curves) */
const SCENE_EYE_DEFAULT = 1.65;
const SCENE_SHADOW_CLASSES = Object.freeze(['person', 'animal', 'animal-graze', 'animal-dog', 'car', 'bus', 'tram', 'bike', 'cyclist', 'tractor', 'tree', 'building', 'structure', 'landmark', 'street', 'rock']);
const _scCamInferred = new WeakMap();
function sceneRenderCam(C) {
  if (!C) return null;
  if (C.cam && Number.isFinite(C.cam.f)) return C.cam;
  if (C.cam && Number.isFinite(C.cam.fov)) {
    const c = C.cam, f = 800 / Math.tan((c.fov / 2) * Math.PI / 180);
    return Object.assign({ x0: 800, water: 0, eye: SCENE_EYE_DEFAULT }, c, { f, dMin: f * (c.eye || SCENE_EYE_DEFAULT) / Math.max(1, 900 - c.horizon), dMax: 20000 });
  }
  let cam = _scCamInferred.get(C);
  if (!cam) {
    const v = C.view || {}, fov = v.fov || 80, horizon = v.horizon != null ? v.horizon : 560, f = 800 / Math.tan((fov / 2) * Math.PI / 180);
    cam = { eye: SCENE_EYE_DEFAULT, fov, horizon, heading: v.heading != null ? v.heading : 180, x0: 800, f, water: 0, dMin: f * SCENE_EYE_DEFAULT / Math.max(1, 900 - horizon), dMax: 20000, inferred: true };
    _scCamInferred.set(C, cam);
  }
  return cam;
}
function sceneCamProject(cam, x, d, h) {
  if (!cam.inferred && typeof sceneProject === 'function') { try { const p = sceneProject(cam, x, d, h == null ? null : h); if (p && Number.isFinite(p.Y)) return p; } catch (e) { /* the flat formula */ } }
  const dd = Math.max(1e-3, d);
  return { X: cam.x0 + cam.f * x / dd, Y: cam.horizon + cam.f * (cam.eye - (h || 0)) / dd, k: cam.f / dd };
}
function sceneCamDepthAt(cam, Y, h) { const dy = Y - cam.horizon; return dy > 1e-6 ? cam.f * (cam.eye - (h || 0)) / dy : Infinity; }
function sceneWaterRow(cam, d, level) { return cam.horizon + cam.f * (cam.eye - (level == null ? cam.water || 0 : level)) / Math.max(1e-3, d); }
function sceneWaterMirrorY(cam, d, level, hb) { return sceneWaterRow(cam, d, level) + cam.f * (hb || 0) / Math.max(1e-3, d); }
/** Fresnel (5.3): mirror * 0.25 at the near edge rising to mirror * 0.8 at the far edge (a grazing view reflects more). */
function sceneWaterFresnel(mirror, u) { const m = _scClamp(mirror == null ? 0.6 : mirror, 0, 1); return m * (0.25 + 0.55 * _scClamp(u, 0, 1)); }
/** Ripple bands over device rows y0..y1 (y0 the far edge): 2 px far .. 6 px near (times unit), at most max bands. */
function sceneWaterBands(y0, y1, unit, max) {
  unit = unit || 1; max = max || 90;
  const span = Math.max(0, y1 - y0);
  if (!span) return [];
  let k = 1;
  const plan = (kk) => { const out = []; let y = y0; while (y < y1) { const u = (y - y0) / span, h = Math.max(1, Math.round((2 + 4 * u) * unit * kk)); out.push({ y: Math.floor(y), h: Math.min(h, Math.ceil(y1 - y)) }); y += h; } return out; };
  let b = plan(k);
  while (b.length > max) { k *= b.length / max * 1.02; b = plan(k); }
  return b;
}
function sceneWaterRippleA(ripple, wind, u, unit) { return (ripple || 0) * (wind == null ? 1 : wind) * (2 + 10 * _scClamp(u, 0, 1)) * (unit || 1); }
/** What makes the glitter road now (5.3): the sun when it shows, low (under 35 degrees) and in view; else a bright moon (over 0.3 lit). */
function sceneWaterGlintSource(L, cam) {
  if (!L) return null;
  const fov = (cam && cam.fov) || L.fov || 80, inView = (b) => b && Number.isFinite(b.rel) && Math.abs(b.rel) < fov / 2 + 8;
  if (L.sun && L.sun.show && L.alt > -0.5 && L.alt < 35 && inView(L.sun)) return { kind: 'sun', x: L.sun.x, col: _scMixHex('#fff4d8', L.lowSun || '#ffffff', 0.4), k: _scClamp(1 - (L.cover || 0), 0.2, 1) };
  const m = L.moon;
  if (m && m.show && (L.dark || 0) > 0.5 && (m.illum || 0) > 0.3 && inView(m)) return { kind: 'moon', x: m.x, col: '#e8eef6', k: 0.6 * m.illum + 0.2 };
  return null;
}
/** A's sceneObjClass, or a fallback from the category and tags (class:<c> wins). */
function sceneObjClassOf(id) {
  if (typeof sceneObjClass === 'function') { try { const c = sceneObjClass(id); if (c) return c; } catch (e) { /* the fallback */ } }
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  if (!def) return null;
  const tags = def.tags || [], tag = (t) => tags.includes(t), ct = tags.find(t => /^class:/.test(t));
  if (ct) return ct.slice(6);
  const cat = def.category || String(id).split('.')[0];
  if (cat === 'vehicle') return tag('tram') ? 'tram' : tag('bus') ? 'bus' : tag('train') || /train/.test(id) ? 'train' : tag('tractor') ? 'tractor' : /bike|cycle/.test(id) ? 'bike' : 'car';
  if (cat === 'boat') return 'boat';
  if (cat === 'bird') return /flight|-fly/.test(id) || tag('air') || tag('flight') ? 'bird-air' : tag('water') || /swan|mallard|duck|coot|moorhen|grebe|goose/.test(id) ? 'bird-water' : 'bird-ground';
  if (cat === 'person') return /cyclist/.test(id) ? 'cyclist' : 'person';
  if (cat === 'animal') return /dog/.test(id) ? 'animal-dog' : /cow|sheep|horse|pony|deer/.test(id) ? 'animal-graze' : 'animal';
  if (cat === 'plant') return 'shrub';
  if (cat === 'ground') return 'cover';
  if (cat === 'sky') return 'air';
  return { tree: 'tree', building: 'building', street: 'street', rail: 'rail', structure: 'structure', landmark: 'landmark', rock: 'rock', prop: 'street', water: 'cover' }[cat] || null;
}
/**
 * The cast-shadow light (6.1): the sun by day; a bright high moon on a clear night; else none (contact shadows only).
 * Returns { kind: 'sun' | 'moon' | null, g: [gx, gd] (the ground way shadows fall, camera space), tan (length per metre of
 * height, at most 12), op, blur (scene px), fade (long shadows fade from the foot), contact (contact-shadow opacity) }.
 */
function sceneShadowSun(L, C) {
  const out = { kind: null, g: [0, 1], tan: 0, op: 0, blur: 0, fade: false, contact: 0.35 };
  if (!L) return out;
  const cover = _scClamp(L.cover || 0, 0, 1), alt = Number(L.alt) || 0, D = Math.PI / 180;
  const over = cover > 0.75 ? 0.25 : cover > 0.45 ? 1 - 0.75 * (cover - 0.45) / 0.3 : 1;
  out.contact = alt < 0 || cover > 0.75 ? 0.25 : 0.35;
  const gOf = (G, rel) => (Array.isArray(G) && G.length === 2 && G.every(Number.isFinite) ? [G[0], G[1]] : [-Math.sin((rel || 0) * D), -Math.cos((rel || 0) * D)]);
  if (alt > -1) {
    out.kind = 'sun';
    out.g = gOf(L.sunG, L.sun && L.sun.rel);
    out.tan = Number.isFinite(L.sunTan) ? Math.min(12, L.sunTan) : alt > 0.08 ? Math.min(12, 1 / Math.tan(alt * D)) : 12;
    // clear noon .42 / 1.5 px; golden hour (3..12) .34 / 4 px; between, a blend; under 3 degrees fading to nothing at -1
    let op, blur;
    if (alt >= 45) { op = 0.42; blur = 1.5; }
    else if (alt >= 12) { const u = (alt - 12) / 33; op = 0.34 + 0.08 * u; blur = 4 - 2.5 * u; }
    else if (alt >= 3) { op = 0.34; blur = 4; }
    else { op = 0.34 * _scClamp((alt + 1) / 4, 0, 1); blur = 4; }
    out.op = op * over; out.blur = over < 1 ? blur + (10 - blur) * (1 - over) / 0.75 : blur;
    out.fade = out.tan > 2.5;
    if (out.op < 0.01) out.kind = null;
    return out;
  }
  const m = L.moon;
  if (m && (m.alt || 0) > 15 && (m.illum || 0) > 0.6 && cover < 0.5) {
    out.kind = 'moon'; out.g = gOf(L.moonG, m.rel);
    out.tan = Number.isFinite(L.moonTan) ? Math.min(12, L.moonTan) : Math.min(12, 1 / Math.tan(m.alt * D));
    out.op = 0.12; out.blur = 6; out.fade = out.tan > 2.5;
  }
  return out;
}
/** The ground tip [x, d] of the shadow of a caster H metres tall standing at (x, d); kept in front of the camera. */
function sceneShadowTip(cam, x, d, H, g, tan) {
  let L = H * tan;
  const dMinTip = Math.max((cam.dMin || 1) * 0.6, d * 0.3);
  if (g[1] < 0 && d + g[1] * L < dMinTip) L = Math.max(0, (d - dMinTip) / -g[1]);
  const dMaxTip = d * 20;
  if (g[1] > 0 && d + g[1] * L > dMaxTip) L = (dMaxTip - d) / g[1];
  return [x + g[0] * L, d + g[1] * L];
}
/**
 * The device matrix that lays a sprite flat on the ground along a shadow (6.2): the foot stays put, sprite "up" (local -y,
 * hTop units to the top) goes to the projected tip, and sprite x goes along the ground perpendicular to the shadow (the
 * caster's width), so a side-lit shadow is foreshortened rather than flattened to a line.
 * foot: { X, Y, x, d } (scene units and ground metres); s: the placement scale; sh: { g, tan } (sceneShadowSun or a lamp's).
 */
function sceneShadowMatrix(cam, foot, s, hTop, flip, sh, vs, ox, oy) {
  const d = Math.max(0.5, foot.d), Hm = hTop * s * d / cam.f;
  const tip = sceneShadowTip(cam, foot.x, d, Hm, sh.g, sh.tan);
  const p0 = sceneCamProject(cam, foot.x, d), p1 = sceneCamProject(cam, tip[0], tip[1]);
  const tx = foot.X + (p1.X - p0.X), ty = foot.Y + (p1.Y - p0.Y);
  // the perpendicular on the ground, oriented so sprite +x keeps going right on the screen where it can
  let px = sh.g[1], pd = -sh.g[0];
  if (px < 0 || (px === 0 && pd < 0)) { px = -px; pd = -pd; }
  const ax = s * px, ay = -s * cam.eye * pd / d;                // linearised: per local unit along the ground perpendicular
  const fl = flip ? -1 : 1, h = Math.max(1e-3, hTop);
  return [vs * ax * fl, vs * ay * fl, vs * (foot.X - tx) / h, vs * (foot.Y - ty) / h, vs * foot.X + ox, vs * foot.Y + oy];
}
/** Polyline path data ('M x y L x y ... Z') to points, or null when it has curves. */
function scenePolyPoints(d) {
  if (/[CQSTAHVcqstahv]/.test(d || '')) return null;
  const n = String(d || '').match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g);
  if (!n || n.length < 6) return null;
  const P = [];
  for (let i = 0; i + 1 < n.length; i += 2) P.push([+n[i], +n[i + 1]]);
  return P;
}
function _scInPts(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
/**
 * The bank edges of a v2 water region (V2 5.3 step 2) as filled quads in scene units, in projected widths (dropped under 1
 * unit): [{ col, kind, quads: [[[x, y] x 4] ...] }]. Per segment the water side is found from the outline: seen from above, a
 * near bank's coping overlaps the water beyond it (the water lies just ABOVE the edge), else it is a far bank whose face looks
 * at the camera. coping: a .3 m stone strip on the land and its face down to the water with a dark wet band; quay and wall:
 * a top and a face; natural: a muddy band; beach: a wet sand band. Both renderers draw these.
 */
const SCENE_WATER_EDGES = Object.freeze({ coping: [['#b8b2a2', 0.3, 'top'], ['#5e5a50', 'level', 'face'], ['#262a26', 0.15, 'face']], quay: [['#6a665e', 0.25, 'top'], ['#34332f', 'level', 'face']],
  wall: [['#8a7a66', 0.2, 'top'], ['#3e3a34', 'level', 'face']], natural: [['#5a4a32', 0.5, 'band']], beach: [['#9a8a6a', 0.9, 'band']], none: [] });
function sceneWaterEdgeQuads(wv, d, cam) {
  const P = scenePolyPoints(d), out = [];
  if (!wv || !Array.isArray(wv.edges) || !cam) return out;
  const level = Number.isFinite(wv.level) ? wv.level : cam.water || 0;
  const inW = (x, y) => (P ? _scInPts(x, y, P) : false);
  for (const e of wv.edges) {
    const pts = e.pts || [];
    if (pts.length < 2) continue;
    for (const [col, m, part] of SCENE_WATER_EDGES[e.kind] || SCENE_WATER_EDGES.coping) {
      const quads = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dd = sceneCamDepthAt(cam, my, level);
        if (!Number.isFinite(dd)) continue;
        const farBank = !inW(mx, my - 3), wDir = farBank ? 1 : -1;
        if (part === 'face' && !farBank) continue;
        const mm = m === 'level' ? Math.max(0.15, -level) : m, dir = part === 'top' ? -wDir : wDir;
        if (part === 'face') {
          // a wall face is vertical: straight down the screen from the bank top
          const h = cam.f * mm / dd;
          if (h < 1) continue;
          quads.push([[a[0], a[1]], [b[0], b[1]], [b[0], b[1] + dir * h], [a[0], a[1] + dir * h]]);
          continue;
        }
        // a coping top or a muddy margin lies FLAT on the ground: offset the edge mm metres across it on the ground and project
        // (integration, 8 Oct: offsetting straight down the screen made a near bank that runs away from the camera a wide wedge)
        const da = sceneCamDepthAt(cam, a[1], level), db = sceneCamDepthAt(cam, b[1], level);
        if (!Number.isFinite(da) || !Number.isFinite(db)) continue;
        const ga = [(a[0] - cam.x0) * da / cam.f, da], gb = [(b[0] - cam.x0) * db / cam.f, db];
        let tx = gb[0] - ga[0], td = gb[1] - ga[1];
        const tl = Math.hypot(tx, td);
        if (tl < 1e-6) continue;
        tx /= tl; td /= tl;
        let nx = -td, nd = tx;   // a ground normal; flip it so it points to the land (top) or the water (band)
        const gm = [(ga[0] + gb[0]) / 2, (ga[1] + gb[1]) / 2], probe = sceneCamProject(cam, gm[0] + nx * 0.25, Math.max(0.5, gm[1] + nd * 0.25), level);
        const probeWet = inW(probe.X, probe.Y), wantWet = part !== 'top';
        if (probeWet !== wantWet) { nx = -nx; nd = -nd; }
        const pa = sceneCamProject(cam, ga[0] + nx * mm, Math.max(0.5, ga[1] + nd * mm), level), pb = sceneCamProject(cam, gb[0] + nx * mm, Math.max(0.5, gb[1] + nd * mm), level);
        if (Math.max(Math.abs(pa.X - a[0]), Math.abs(pa.Y - a[1]), Math.abs(pb.X - b[0]), Math.abs(pb.Y - b[1])) < 1) continue;
        quads.push([[a[0], a[1]], [b[0], b[1]], [pb.X, pb.Y], [pa.X, pa.Y]]);
      }
      if (quads.length) out.push({ col, kind: e.kind, quads });
    }
  }
  return out;
}
const _SC_FOOT = { person: [0.32, 0.26], cyclist: [0.8, 0.25], 'animal-dog': [0.45, 0.2], 'animal-graze': [1, 0.45], animal: [0.5, 0.3], tree: [0.9, 0.9], street: [0.3, 0.3], rock: [0.8, 0.6], bike: [0.8, 0.25], tractor: [1.6, 1], car: [0.55, 0.9], bus: [0.7, 1.2], tram: [0.7, 1.3] };
/**
 * The contact shadows (6.3) under a caster: [[dx, rx, ry]] in scene units (dx from the anchor). Vehicles get one per axle
 * (from the sprite's length); buildings, structures and landmarks a long soft band along their base.
 */
function sceneContactOf(id, cls, sh, s, d, cam) {
  if (!sh || !cam) return [];
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null, k = cam.f / Math.max(0.5, d), fk = cam.eye / Math.max(0.5, d);
  const w = (sh.box[2] - sh.box[0]) * s, cx = (sh.box[0] + sh.box[2]) / 2 * s;
  if (cls === 'building' || cls === 'structure' || cls === 'landmark') return [[cx, w * 0.5, Math.max(1.2, k * fk * 1.2)]];
  const foot = def && Array.isArray(def.foot) ? def.foot : _SC_FOOT[cls] || [0.4, 0.3];
  const rx = Math.max(1, Math.min(w * 0.55, k * foot[0])), ry = Math.max(0.8, Math.min(rx * 0.6, k * foot[1] * fk * 2));
  if (cls === 'car' || cls === 'bus' || cls === 'tram' || cls === 'tractor') return [[cx - w * 0.3, rx, ry], [cx + w * 0.3, rx, ry]];
  return [[0, rx, ry]];
}

/** A sign's layout in scene units (8.3): the board, up to 6 line-colour stripes below it, the text box and font size estimate. */
function sceneSignLayout(s) {
  const style = s.style || 'board', bars = (s.bars || []).slice(0, 6).filter(c => /^#[0-9a-f]{6}$/i.test(c));
  if (style === 'totem') {
    const bw = s.w, bh = s.h, bx = s.x - bw / 2, by = s.y - bh - s.h * 1.6;
    return { style, post: [s.x - 3, by + bh, 6, s.y - by - bh], board: [bx, by, bw, bh], frame: true, bars: bars.map((c, i) => [bx, by + bh + i * 4, bw, 4, c]), text: [s.x, by + bh / 2], tw: bw * 0.86, fs: bh * 0.5 };
  }
  const bx = s.x - s.w / 2, by = s.y - s.h, bh = Math.max(3, s.h * 0.1);
  const stripes = style === 'fascia' ? bars.map((c, i) => [bx + i * s.w / Math.max(1, bars.length), by - bh, s.w / Math.max(1, bars.length), bh, c]) : bars.map((c, i) => [bx, s.y + i * bh, s.w, bh, c]);
  return { style, post: null, board: [bx, by, s.w, s.h], frame: style === 'board', bars: stripes, text: [s.x, by + s.h / 2], tw: s.w * 0.9, fs: s.h * (style === 'fascia' ? 0.6 : 0.56) };
}
/** The sign text after the core's rules (8.3), or null when it is not allowed. */
function _scSignOk(s) {
  if (typeof sceneSignText !== 'function') return null;
  const r = sceneSignText(s.text);
  return r && r.ok ? r.text : null;
}

/* ---------- the SVG still (6.5) ---------- */
let _scSvgN = 0;
/** Give the kit's ids (us1, us2 ...) a per-render prefix, so two drawings on one page never share an id. */
function _scPrefixIds(markup, pre) { return String(markup).replace(/(id="|url\(#|href="#)(us[0-9a-z]+)/g, (_, a, id) => a + pre + id); }
function _scPaintSvg(p, colour, defs, nid, box) {
  if (!p) return 'none';
  if (typeof p === 'string') return colour(p);
  const id = nid(), stops = (p.lin || p.rad).map(([o, c, op]) => `<stop offset="${o}" stop-color="${colour(c)}"${op != null && op !== 1 ? ` stop-opacity="${op}"` : ''}/>`).join('');
  defs.push(p.lin ? `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${p.x1 || 0}" y1="${p.y1 || 0}" x2="${p.x2 || 0}" y2="${p.y2 != null ? p.y2 : 1}">${stops}</linearGradient>`
    : `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${p.cx || 0}" cy="${p.cy || 0}" r="${p.r || 1}">${stops}</radialGradient>`);
  return `url(#${id})`;
}
/**
 * A raster object's image shape (70-scene-0raster.js): the image once per render in the defs, placed with a <use>; the grade and
 * the season derivation as ONE feColorMatrix (sceneRasterMatrix fits the colour function); mask_lit as a luminance mask.
 * rs: the render's raster state { imgs, filters, L }. An image whose bytes are not available draws nothing.
 */
function _scImgSvg(sh, colour, defs, nid, rs) {
  const im = sh.img, pick = typeof sceneRasterPick === 'function' ? sceneRasterPick(im, rs && rs.L) : { key: im.key, night: false, skip: false };
  if (pick.skip) return '';
  const imgId = (key) => {
    const k = key + '|' + im.w + '|' + im.h;
    if (rs && rs.imgs.has(k)) return rs.imgs.get(k);
    const url = typeof sceneRasterUrl === 'function' ? sceneRasterUrl(key) : null;
    const id = url ? nid() : null;
    if (id) defs.push(`<image id="${id}" href="${url}" width="${_scR2(im.w)}" height="${_scR2(im.h)}" preserveAspectRatio="none"/>`);
    if (rs) rs.imgs.set(k, id);
    return id;
  };
  const id = imgId(pick.key);
  if (!id) return '';
  const col = pick.night && colour.ng ? colour.ng : colour;
  const M = typeof sceneRasterMatrix === 'function' ? sceneRasterMatrix(col, pick.night ? null : im.fx) : null;
  let a = `<use href="#${id}" x="${_scR2(im.x)}" y="${_scR2(im.y)}"`;
  if (M && !sceneRasterIsId(M)) {
    const vals = sceneRasterFilter(M);
    let fid = rs ? rs.filters.get(vals) : null;
    if (!fid) { fid = nid(); defs.push(`<filter id="${fid}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${vals}"/></filter>`); if (rs) rs.filters.set(vals, fid); }
    a += ` filter="url(#${fid})"`;
  }
  if (im.mask) {
    const mid = imgId(im.mask);
    if (!mid) return '';
    const mk = nid();
    defs.push(`<mask id="${mk}" maskUnits="userSpaceOnUse" x="${_scR2(im.x)}" y="${_scR2(im.y)}" width="${_scR2(im.w)}" height="${_scR2(im.h)}"><use href="#${mid}" x="${_scR2(im.x)}" y="${_scR2(im.y)}"/></mask>`);
    a += ` mask="url(#${mk})"`;
  }
  if (sh.op != null && sh.op !== 1) a += ` opacity="${sh.op}"`;
  if (sh.m) a += ` transform="matrix(${sh.m.map(_scR2).join(' ')})"`;
  return a + '/>';
}
function _scShapeSvg(sh, colour, defs, nid, rs) {
  if (sh.img) return _scImgSvg(sh, colour, defs, nid, rs);
  const f = _scPaintSvg(sh.f, colour, defs, nid);
  let a = `<path fill="${f}"`;
  if (sh.s) a += ` stroke="${_scPaintSvg(sh.s, colour, defs, nid)}" stroke-width="${sh.w || 1}"${sh.cap ? ` stroke-linecap="${sh.cap}"` : ''}`;
  if (sh.op != null && sh.op !== 1) a += ` opacity="${sh.op}"`;
  if (sh.m) a += ` transform="matrix(${sh.m.map(_scR2).join(' ')})"`;
  return a + ` d="${sh.d}"/>`;
}
/**
 * One still frame of a composed scene. o: the registry's svg options (size, sky, season, reduced, lod).
 * Returns the inner markup of <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">.
 */
function sceneSvg(x, o) {
  o = o || {};
  const data = _scDataOf(x);
  if (!data || typeof sceneCompile !== 'function') return '';
  const lod = o.lod != null ? o.lod : sceneLodFor(o.size, o.detail), season = _scSeasonOf(data, o), L = _scLightOf(data, o, season);
  const C = sceneCompile(data, { season, lod, L });
  // v2 (V2 13.4): a v2 compiled scene, or a v1 one with fx shadows / water; v1 scenes draw exactly as before
  const v2 = C.v === 2 || !!(C.fx && (C.fx.shadows === 2 || C.fx.water === 2)), v2Shadow = C.v === 2 || !!(C.fx && C.fx.shadows === 2);
  const pre = 'sc' + (++_scSvgN).toString(36) + '-';
  let n = 0;
  const nid = () => pre + (++n).toString(36), defs = [], ids = new Map();
  const lit = !!(L && L.windows), detailOk = lod >= 0.5;
  const rs = { imgs: new Map(), filters: new Map(), L };   // raster objects: each image and colour matrix once per render
  const toneFor = (haze, tint) => {
    const memo = new Map();
    const f = c => { let v = memo.get(c); if (v) return v; v = typeof sceneColour === 'function' ? sceneColour(c, { L, haze, tint }) : c; memo.set(c, v); return v; };
    // ng: the same without the light's grade (a raster object's own night image is already a night picture)
    f.ng = c => (typeof sceneColour === 'function' ? sceneColour(c, { haze, tint, hazeCol: L ? L.haze : null }) : c);
    return f;
  };
  const plain = c => c;
  /** Keep the detail shapes of `it` drawn at its scale? LOD 0.5 and up, and the object's size tier (sceneDetailAt, scene units). */
  const detailFor = (it, sh) => detailOk && (typeof sceneDetailAt !== 'function' || sceneDetailAt(it.o, sh, it.s == null ? 1 : it.s));
  /** A glow shape in its night colour (ungraded, full opacity, no stroke): the object's night.glow, else the default lamp / window. */
  const nightGlow = (o) => { const def = typeof sceneObj === 'function' ? sceneObj(o) : null; return (def && def.night && def.night.glow) || {}; };
  const litShape = (s0, nc) => Object.assign({}, s0, { f: nc[s0.glow] || (s0.glow === 'lamp' ? '#ffe2a0' : '#ffd98a'), s: null, op: 1 });
  /** The markup of the shapes of `names`; glowLit: glow shapes in their night colours (a moving object's lamps move with it). */
  const partsSvg = (it, sh, names, det, colour, glowLit) => {
    const nc = glowLit ? nightGlow(it.o) : null;
    let inner = '';
    for (const p of names) for (const s of sh.parts[p] || []) if (det || !s.detail) inner += glowLit && s.glow ? _scShapeSvg(litShape(s, nc), plain, defs, nid) : _scShapeSvg(s, colour, defs, nid, rs);
    return inner;
  };
  /** The <g id> for (obj, v, season, haze, tint, part, detail tier, lit glows): '*' = every part except 'lit'; 'lit' is drawn ungraded. */
  const sym = (it, part, glowLit) => {
    const sh = sceneObjShapes(it.o, it.v, it.season), det = !!sh && detailFor(it, sh);
    const key = [it.o, it.v, it.season, it.haze, it.tint ? it.tint.join(':') : '', part, det ? 1 : 0].join('|') + (glowLit ? '|g' : '');
    if (ids.has(key)) return ids.get(key);
    if (!sh) { ids.set(key, null); return null; }
    const names = part === '*' ? _scStillParts(sh) : [part];
    const inner = partsSvg(it, sh, names, det, part === 'lit' ? plain : toneFor(it.haze, it.tint), glowLit && part !== 'lit');
    const id = nid();
    defs.push(`<g id="${id}">${inner}</g>`);
    ids.set(key, id);
    return id;
  };
  /** Shapes of `parts` not moved by any hook (the static rest of an animated object); glowLit as sym. */
  const restSym = (it, moved, glowLit) => {
    const sh = sceneObjShapes(it.o, it.v, it.season), det = detailFor(it, sh);
    const key = [it.o, it.v, it.season, it.haze, it.tint ? it.tint.join(':') : '', 'rest:' + moved.join(','), det ? 1 : 0].join('|') + (glowLit ? '|g' : '');
    if (ids.has(key)) return ids.get(key);
    const inner = partsSvg(it, sh, _scStillParts(sh).filter(p => !moved.includes(p)), det, toneFor(it.haze, it.tint), glowLit);
    const id = inner ? nid() : null;
    if (id) defs.push(`<g id="${id}">${inner}</g>`);
    ids.set(key, id);
    return id;
  };
  const P = lod < 1 ? Math.round : _scR1;   // tiles: whole-unit positions (invisible at tile size, lighter markup)
  const tf = (x, y, s, flip, m) => `translate(${P(x)} ${P(y)})` + (s !== 1 || flip ? ` scale(${_scR2(flip ? -s : s)} ${_scR2(s)})` : '') + (m && m !== _SC_ID ? ` matrix(${m.map(v => _scR2(v)).join(' ')})` : '');
  const use = (id, x, y, s, flip, m, op) => id ? `<use href="#${id}" transform="${tf(x, y, s, flip, m)}"${op != null && op < 1 ? ` opacity="${_scR2(op)}"` : ''}/>` : '';
  /**
   * Lit windows and lamps of one placement (only with L.windows): the glow shapes in the object's night colours, as its glowOn
   * says. skip: parts drawn elsewhere (the moving parts of an animated placement carry their own lit glows in their symbols).
   */
  const glows = (it, x, y, s, flip, skip) => {
    if (!lit || !it.glowOn) return '';
    const sh = sceneObjShapes(it.o, it.v, it.season), nc = nightGlow(it.o);
    let gi = 0, out = '';
    for (const p of sh.order) for (const s0 of sh.parts[p] || []) if (s0.glow) { if (it.glowOn[gi % it.glowOn.length] && !(skip && skip.includes(p))) out += _scShapeSvg(litShape(s0, nc), plain, defs, nid); gi++; }
    return out ? `<g transform="${tf(x, y, s, flip)}">${out}</g>` : '';
  };
  let fade = null;
  /** One shared fade (dark at the foot, clear at the tip) for every cast shadow, as the kit's shadowFade. */
  const fadeId = () => { if (!fade) { fade = nid(); defs.push(`<linearGradient id="${fade}"><stop offset="0" stop-color="#142030"/><stop offset=".55" stop-color="#142030" stop-opacity=".7"/><stop offset="1" stop-color="#142030" stop-opacity="0"/></linearGradient>`); } return fade; };
  const shadowSyms = new Map();
  /** One shadow symbol per object (the foot and the cast shadow along the live sun at scale 1), placed with a <use>. Tiles (LOD < .5) skip shadows. */
  const shadowOf = (it) => {
    const def = typeof sceneObj === 'function' ? sceneObj(it.o) : null, sd = def && def.shadow;
    if (!it.shadow || !sd || !L || !detailOk) return '';
    let id = shadowSyms.get(it.o);
    if (id === undefined) {
      const w = (sd.rx || 20) * 2, h = sd.h || 40, sh = L.shadow || {};
      let g = `<ellipse rx="${_scR1(w / 2)}" ry="${_scR1(Math.max(2, sd.ry || w * 0.08))}" fill="#14261e" opacity="${_scR2(0.2 * (1 - (L.dark || 0) * 0.6))}"/>`;
      if (sh.op) {
        const Lg = Math.min(h * sh.len, h * 2.2), ax = sh.gx * Lg, ay = sh.gy * Lg * 0.3, rx = Math.max(w * 0.3, Math.hypot(ax, ay) / 2), ry = Math.max(2, Math.hypot(-sh.gy * w * 0.5, sh.gx * w * 0.15)), deg = Math.atan2(ay, ax) * 180 / Math.PI;
        g += `<ellipse rx="${_scR1(rx)}" ry="${_scR1(ry)}" transform="translate(${_scR1(ax / 2)} ${_scR1(ay / 2)}) rotate(${_scR1(deg)})" fill="url(#${fadeId()})" opacity="${_scR2(sh.op)}"/>`;
      }
      id = nid();
      defs.push(`<g id="${id}">${g}</g>`);
      shadowSyms.set(it.o, id);
    }
    return `<use href="#${id}" transform="translate(${_scR1(it.x)} ${_scR1(it.y)})${it.s !== 1 ? ` scale(${_scR2(it.s)})` : ''}"/>`;
  };
  /**
   * v2 shadows of one layer (V2 6, 13.4): every caster's symbol through the shadow shear, inside one <g filter> that floods
   * the silhouettes with the shadow colour (feFlood + feComposite) and blurs them (feGaussianBlur), at the sky's opacity;
   * then the contact shadows (soft ellipses). The same maths as the canvas pass (sceneShadowMatrix, sceneContactOf).
   */
  let shFilter = null, ctGrad = null;
  const v2Shadows = (li) => {
    if (!v2Shadow || !L || !detailOk) return v2 && !v2Shadow ? byLayer[li].map(shadowOf).join('') : '';
    const cam = sceneRenderCam(C), sun = sceneShadowSun(L, C), col = _scMixHex('#14202e', L.shade || '#14202e', 0.3);
    let cast = '', contact = '';
    for (const it of byLayer[li]) {
      if (it.strip >= 0 || it.direct) continue;
      const cls = it.cls || sceneObjClassOf(it.o), isC = SCENE_SHADOW_CLASSES.includes(cls);
      if ((!it.shadow && !isC) || ['boat', 'bird-water', 'bird-air', 'air', 'cover'].includes(cls)) continue;
      const sh = sceneObjShapes(it.o, it.v, it.season);
      const d = Number.isFinite(it.dz) ? it.dz : sceneCamDepthAt(cam, it.y);
      if (!sh || !Number.isFinite(d) || d <= 0) continue;
      const foot = { X: it.x, Y: it.y, x: it.g && Number.isFinite(it.g.x) ? it.g.x : (it.x - cam.x0) * d / cam.f, d };
      if (sun.kind && cls !== 'shrub') {
        // the symbols the placement itself is drawn with (an animated one: its rest and its moving parts), so no new defs
        const M = sceneShadowMatrix(cam, foot, it.s, Math.max(1, -sh.box[1]), it.flip, sun, 1, 0, 0), moving = it.anim && it.anim.length ? it.anim : null;
        const whole = moving && moving.find(a => _scAnimParts(a)[0] === '*'), moved = moving && !whole ? [...new Set(moving.flatMap(_scAnimParts))] : null;
        const ids = moved ? [restSym(it, moved), ...moved.map(p => sym(it, p))] : [sym(it, '*')];
        const inner = ids.filter(Boolean).map(id => `<use href="#${id}"/>`).join('');
        if (inner) cast += `<g transform="matrix(${M.map(v => _scR2(v)).join(' ')})">${inner}</g>`;
      }
      if (isC) for (const [dx, rx, ry] of sceneContactOf(it.o, cls, sh, it.s, d, cam)) {
        if (!ctGrad) { ctGrad = nid(); defs.push(`<radialGradient id="${ctGrad}"><stop offset="0" stop-color="#0c1218"/><stop offset=".45" stop-color="#0c1218" stop-opacity=".75"/><stop offset="1" stop-color="#0c1218" stop-opacity="0"/></radialGradient>`); }
        contact += `<ellipse cx="${_scR1(it.x + (it.flip ? -dx : dx))}" cy="${_scR1(it.y)}" rx="${_scR1(rx)}" ry="${_scR1(ry)}" fill="url(#${ctGrad})"/>`;
      }
    }
    let out = '';
    if (cast) {
      if (!shFilter) { shFilter = nid(); defs.push(`<filter id="${shFilter}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feFlood flood-color="${col}"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation="${_scR1(Math.max(0.5, sun.blur * 0.6))}"/></filter>`); }
      out += `<g class="sc-shadow" filter="url(#${shFilter})" opacity="${_scR2(sun.op)}">${cast}</g>`;
    }
    if (contact) out += `<g opacity="${_scR2(sun.contact)}">${contact}</g>`;
    return out;
  };
  /** One placement at t = 0: a whole-object <use>, or the static rest plus each moving part at its pose. */
  // After real dusk an animated object keeps its night look: the glow shapes of its moving parts are lit inside their own
  // symbols (every one, when any of the placement's glows is on, as the canvas sprites), the rest light as a static
  // placement's, and the lit part follows a whole-object pose. An actor carries no glowOn: all its glow shapes light.
  const placed = (it) => {
    const moving = it.strip < 0 && it.anim && it.anim.length ? it.anim : null, g = lit && !!it.glowOn && it.glowOn.some(Boolean);
    let out = '', skip = null, pm = null, pa = null;
    if (!moving) out += use(sym(it, '*'), it.x, it.y, it.s, it.flip);
    else {
      const whole = moving.find(a => _scAnimParts(a)[0] === '*');
      if (whole) { const p = sceneAnimPose(whole, 0, L, it.x); pm = p.m; pa = p.alpha; skip = sceneObjShapes(it.o, it.v, it.season).order; out += use(sym(it, '*', g), it.x, it.y, it.s, it.flip, pm, pa); }
      else {
        const moved = skip = [...new Set(moving.flatMap(_scAnimParts))];
        out += use(restSym(it, moved), it.x, it.y, it.s, it.flip);
        for (const a of moving) { const p = sceneAnimPose(a, 0, L, it.x), parts = _scAnimParts(a); parts.forEach((part, j) => { const al = _scPartAlpha(p, j); if (al > 0) out += use(sym(it, part, g), it.x, it.y, it.s, it.flip, j === 1 && p.m2 ? p.m2 : p.m, al); }); }
      }
    }
    if (lit && it.lit) out += use(sym(it, 'lit'), it.x, it.y, it.s, it.flip, pm, pa);
    return out + glows(it, it.x, it.y, it.s, it.flip, skip);
  };
  const actorSvg = (a) => {
    const at = sceneActorAt(a, 0), it = { o: a.o, v: a.v, season: C.season, haze: C.layers[a.layer] ? Math.round(C.layers[a.layer].haze * 10) / 10 : 0, tint: null, s: at.s };
    const flip = at.dir < 0, sh = sceneObjShapes(a.o, a.v, C.season);
    let out = '', wp = null;
    if (!a.anim || !a.anim.length) out = use(sym(it, '*', lit), at.x, at.y, at.s, flip, null, at.alpha);
    else {
      const moved = [...new Set(a.anim.flatMap(_scAnimParts))].filter(p => p !== '*');
      const whole = a.anim.find(h => _scAnimParts(h)[0] === '*');
      wp = whole ? sceneAnimPose(whole, 0, L, at.x) : null;
      out += use(moved.length ? restSym(it, moved, lit) : sym(it, '*', lit), at.x, at.y, at.s, flip, wp ? wp.m : null, at.alpha);
      for (const h of a.anim) { const parts = _scAnimParts(h); if (parts[0] === '*') continue; const p = sceneAnimPose(h, 0, L, at.x); parts.forEach((part, j) => { const al = _scPartAlpha(p, j) * at.alpha; if (al > 0) out += use(sym(it, part, lit), at.x, at.y, at.s, flip, j === 1 && p.m2 ? p.m2 : p.m, al); }); }
    }
    if (lit && sh && sh.parts.lit && sh.parts.lit.length) out += use(sym(it, 'lit'), at.x, at.y, at.s, flip, wp ? wp.m : null, at.alpha);
    return out;
  };
  const flockSvg = (f) => {
    const it = { o: f.o, v: 0, season: C.season, haze: C.layers[f.layer] ? Math.round(C.layers[f.layer].haze * 10) / 10 : 0, tint: null };
    let out = '';
    for (let i = 0; i < f.n; i++) { const b = sceneFlockAt(f, i, 0); out += use(sym(it, '*'), b.x, b.y, b.s, b.dir < 0); }
    return out;
  };
  const signSvg = (s) => {
    const text = _scSignOk(s);
    if (text == null) return '';
    const g = sceneSignLayout(s), [bx, by, bw, bh] = g.board;
    let out = '<g class="sc-sign">';
    if (g.post) out += `<rect x="${_scR1(g.post[0])}" y="${_scR1(g.post[1])}" width="${_scR1(g.post[2])}" height="${_scR1(g.post[3])}" fill="#3a3f44"/>`;
    out += `<rect x="${_scR1(bx)}" y="${_scR1(by)}" width="${_scR1(bw)}" height="${_scR1(bh)}" fill="${_scCol(s.board || "#f4f1e8", L)}"${g.frame ? ` stroke="${_scCol("#2a2e33", L)}" stroke-width="1.5"` : ''}/>`;
    for (const b of g.bars) out += `<rect x="${_scR1(b[0])}" y="${_scR1(b[1])}" width="${_scR1(b[2])}" height="${_scR1(b[3])}" fill="${b[4]}"/>`;
    const fs = Math.max(9, Math.min(g.fs, g.tw / Math.max(1, text.length * 0.56)));
    out += `<text x="${_scR1(g.text[0])}" y="${_scR1(g.text[1])}" font-family="${_scEsc(SCENE_SIGN_FAMILY)}" font-weight="600" font-size="${_scR1(fs)}" text-anchor="middle" dominant-baseline="central" fill="${_scCol(s.ink || "#1d2226", L)}">${_scEsc(text)}</text>`;
    return out + '</g>';
  };
  const edgeSvg = [];
  const waterSvg = (w, before) => {
    const cols = L && L.water ? L.water(w.base) : w.base, gid = nid(), cid = nid();
    // v2 water (V2 5.3, 13.4): the depth fade (lighter far, the bed and darker near); its reflection stays v1's in the still
    const wv = v2 && w.v2 ? w.v2 : null, wk = wv ? (typeof SCENE_WATER_KINDS !== 'undefined' && SCENE_WATER_KINDS[wv.kind]) || {} : null;
    const st = wv ? [_scMixHex(cols[0], (L && L.low) || '#dcebf2', 0.18), cols[1], _scMixHex(_scMixHex(cols[2], wv.bed || '#4a4030', (wv.clarity != null ? wv.clarity : wk.clarity || 0.08) * 2.5), '#000000', 0.12)] : cols;
    defs.push(`<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${w.y0}" x2="0" y2="${w.y1}"><stop offset="0" stop-color="${st[0]}"/><stop offset=".5" stop-color="${st[1]}"/><stop offset="1" stop-color="${st[2]}"/></linearGradient><clipPath id="${cid}"><path d="${w.d}"/></clipPath>`);
    let out = `<path fill="url(#${gid})" d="${w.d}"/>`;
    if (wv) for (const e of sceneWaterEdgeQuads(wv, w.d, sceneRenderCam(C))) edgeSvg.push(`<path fill="${_scCol(e.col, L)}" d="${e.quads.map(q => 'M' + q.map(p => _scR1(p[0]) + ' ' + _scR1(p[1])).join('L') + 'Z').join('')}"/>`);
    if (w.reflect && before) out += `<g clip-path="url(#${cid})"><g opacity=".35" transform="matrix(1 0 0 -1 0 ${2 * w.y0})">${before}</g></g>`;
    if (edgeSvg.length) { out += edgeSvg.join(''); edgeSvg.length = 0; }
    if (w.shimmer) {
      const r = _scRndOf(_scHashS(C.id + '|w|' + w.y0));
      let d = '';
      for (let i = 0; i < Math.min(40, w.shimmer); i++) { const y = w.y0 + 4 + r() * (w.y1 - w.y0 - 8), x = -100 + r() * 1800; d += `M${Math.round(x)} ${Math.round(y)}h${Math.round(10 + r() * 26)}`; }
      out += `<path fill="none" stroke="${_scMixHex(cols[0], '#ffffff', 0.5)}" stroke-width="1.6" stroke-linecap="round" opacity=".45" clip-path="url(#${cid})" d="${d}"/>`;
    }
    const src = L && w.lightPath ? (L.sun && L.sun.show && L.alt < 35 ? L.sun : L.moon && L.moon.show ? L.moon : null) : null;
    if (src) {
      const r = _scRndOf(43);
      let d = '';
      for (let i = 0; i < 30; i++) { const t = Math.pow(r(), 0.8), y = w.y0 + t * (w.y1 - w.y0), hw = 60 * (0.3 + t * 1.6); d += `M${Math.round(src.x + (r() * 2 - 1) * hw)} ${Math.round(y)}h${Math.round((6 + r() * 16) * (0.4 + t))}`; }
      out += `<path fill="none" stroke="${src === L.sun ? _scMixHex('#fff4d8', L.lowSun, 0.4) : '#e8eef6'}" stroke-width="2.4" stroke-linecap="round" opacity=".7" clip-path="url(#${cid})" d="${d}"/>`;
    }
    return out;
  };
  const K = typeof sceneKit === 'function' ? sceneKit('svg') : null;
  const ko = { size: o.size === 'fill' || o.size === 'hero' || !o.size ? 'fill' : 'lg' };
  // the sky: the kit's own live sky and clouds (identical skies to the Yateley scenes)
  let sky = '';
  if (C.sky && L && K) sky = _scPrefixIds(K.scene(ko, () => K.liveSky(L, { stars: C.sky.stars, sunR: C.sky.sunR, moonR: C.sky.moonR, seed: 41 }) + K.liveClouds(L, { seed: 5, n: Math.max(1, Math.round(C.sky.clouds.n / 2)), y0: C.sky.clouds.y0, y1: C.sky.clouds.y1 })), pre);
  else if (L) sky = `<rect x="-160" y="-80" width="1920" height="1060" fill="${L.top || '#3a80c4'}"/>`;
  // the land, far to near
  const byLayer = C.layers.map(() => []);
  C.items.forEach(it => byLayer[it.layer] && byLayer[it.layer].push(it));
  let land = '';
  const done = [];   // markup above each water line, for reflections
  for (const l of C.layers) {
    let out = '';
    for (const g of C.ground) if (g.layer === l.i) {
      // v2 at tile size (integration, 8 Oct): the surface markings (lines, kerbs, joints, wear) are under a pixel; the fills and the
      // canal channels stay
      if (C.v === 2 && lod < 1 && g.mark && g.mark !== 'channel') continue;
      out += `<path fill="${_scPaintSvg(g.fill, toneFor(Math.round(l.haze * 10) / 10, null), defs, nid)}" d="${g.d}"/>`;
    }
    for (const w of C.water) if (w.layer === l.i) {
      // v2 (integration, 8 Oct): the farther layers by reference (<use> of each layer's group), not copied into every water region:
      // a basin with five canal arms copied the whole land five times over (1.4 MB stills)
      if (v2) { out += waterSvg(w, w.reflect ? done.join('') : ''); continue; }
      const near = byLayer[l.i].filter(it => it.reflect && it.y <= w.y0 + 8).map(placed).join('');
      out += waterSvg(w, w.reflect ? done.join('') + out + near : '');
    }
    let sh = '';
    if (v2) sh += v2Shadows(l.i);
    else for (const it of byLayer[l.i]) sh += shadowOf(it);
    out += sh;
    const movers = [];
    for (const a of C.actors) if (a.layer === l.i) movers.push([sceneActorAt(a, 0).y, actorSvg(a)]);
    for (const it of byLayer[l.i]) {
      // v2 at tile size (integration, 8 Oct): a tile is 64 to 88 px across 1600 units, so what is under ~1 px tall is left out
      // (seasonal cover, far grass, ducks): the canvas draws the scene everywhere it can; this is the still's budget
      if (C.v === 2 && lod < 0.5 && !it.direct) {
        const sh = sceneObjShapes(it.o, it.v, it.season);
        if (it.cover || (sh && (sh.box[3] - sh.box[1]) * it.s < 24)) continue;
        // no tints: a tile cannot show a few per cent of colour shift, and every distinct tint is its own symbol
        if (it.tint) { movers.push([it.y, placed(Object.assign({}, it, { tint: null }))]); continue; }
      }
      movers.push([it.y, placed(it)]);
    }
    movers.sort((a, b) => a[0] - b[0]);
    out += movers.map(m => m[1]).join('');
    for (const f of C.flocks) if (f.layer === l.i) out += flockSvg(f);
    for (const s of C.signs) if (s.layer === l.i) out += signSvg(s);
    if (v2 && out && C.water.some(w => w.reflect && w.layer > l.i)) { const lid = nid(); defs.push(`<g id="${lid}">${out}</g>`); out = `<use href="#${lid}"/>`; }
    done.push(out);
    land += out;
  }
  // particles (season) at t = 0
  let parts = '';
  if (C.particles && C.particles.kind !== 'none' && C.particles.n) {
    const ps = sceneParticleSet(C.particles.kind, Math.min(250, Math.round(C.particles.n * Math.max(0.3, lod))), _scHashS(C.id + '|p'));
    const byCol = new Map();
    for (const p of ps) { const q = sceneParticleAt(p, 0); const r = _scR1(p.size); byCol.set(p.col, (byCol.get(p.col) || '') + `M${_scR1(q.x - r)} ${_scR1(q.y)}a${r} ${r} 0 1 0 ${_scR1(2 * r)} 0a${r} ${r} 0 1 0 ${_scR1(-2 * r)} 0z`); }
    for (const [c, d] of byCol) parts += `<path fill="${C.particles.kind !== "motes" ? _scCol(c, L) : c}" opacity=".8" d="${d}"/>`;
  }
  // the kit's .hx-tint rect (an unlit authored scene's dark-theme grade) needs a pack's css: composed scenes leave it out
  const over = L && K ? _scPrefixIds(K.scene(ko, () => K.weather(L) + K.grade(L)), pre).replace(/<rect class="hx-tint"[^>]*\/>/g, '') : '';
  return `<g class="sc-svg"><defs>${defs.join('')}</defs>${sky}${land}${parts}${over}</g>`;
}
/** sceneHash when the core has it (it always does once 70-scene-0core.js is in); a small FNV-1a otherwise. */
function _scHashS(s) {
  if (typeof sceneHash === 'function') return sceneHash(s);
  let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0;
}
