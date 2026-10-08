/* ============================================================
   SCENE ENGINE: the canvas host (docs/dev/SCENE_ENGINE.md 6.4; builder B). Browser only.
   animItemHtml draws a composed item at a canvas size as
     <span class="anim-scene ... ap-composed" data-anim="<ref>" data-sc-lod data-sc-still data-sc-hover data-sc-sky
           style="--sc-top;--sc-low"><canvas class="sc-canvas"></canvas></span>
   and this file brings it to life, wherever it was inserted (the opening sequence, the county welcome,
   the gallery stage and tiles, Home's animation-of-the-day card): none of them need changes.

   - Mount: one MutationObserver on the document; each new host gets a renderer (sceneRendererCreate).
     A host removed and added again with the same key (animSceneKey: a re-render) within 2.5 s takes
     over the old renderer AND its canvas: no re-bake, no blank frame.
   - Size: a ResizeObserver; a resize re-bakes (debounced 150 ms; meanwhile CSS stretches the old canvas).
   - Light: sceneLight({ sky: almSceneLight(now, lat, lon, zone) + the weather }, view), the same inputs as
     animItemHtml's live sky; refreshed every 120 s (the renderer re-bakes only when the light key changes).
   - Time: the age of the scene's key (71-anim-continuity.js), minus the time the tab was hidden.
   - Pausing: offscreen (.is-offscreen), document.hidden, .is-held (one rich scene plays at a time),
     .is-rested (the Home card after 60 s), html.anim-paused, reduced motion, or not live (tiles: the
     still frame; data-sc-hover="1" plays on pointer enter and returns to the still on leave).
   - Fallback: no 2d context, or a bake that throws: the host gets the SVG still (sceneSvg) instead.
   - Debug: window.__sceneStats() -> [{ ref, ...renderer.stats() }] for every live host.
   - v2 (docs/dev/SCENE_ENGINE_V2.md 7.5, 8.1, 14.2; builder C): a v2 scene (data.camera) and a v1 scene that opted in to
     effects (data.fx) are lit with sceneLightV2 (the light plus the sun on the ground, the local hour, the resolved weather
     and atmosphere); every other scene keeps sceneLight exactly as before. Previews: sceneHostSet(el, { at, wx, season })
     (the editor, the gallery, the console) and the attribute data-sc-wx (a weather kind or a JSON object). ?scenefx=2 in the
     page address turns on every v2 effect for the v1 scenes in the animation gallery (review only; nothing is stored).
   ============================================================ */
const _SCH_FORGET_MS = 2500, _SCH_RELIGHT_MS = 120000, _SCH_RESIZE_MS = 150;
const _schHosts = new Map();       // host element -> record
const _schGone = new Map();        // key -> { rec, at } (removed hosts, kept for _SCH_FORGET_MS)
let _schHiddenMs = 0, _schHiddenAt = 0, _schInit = false, _schRO = null, _schIO = null, _schTimer = 0;
const _schT0 = new Map();          // key -> own start time (hosts the continuity file does not stamp: tiles, stills)

function _schNowMs() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
function _schReduced() { try { return !!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
/** The item for a host: the page harness' own items first (window.__sceneItems), then the registry. */
function _schItem(ref) {
  const own = typeof window !== 'undefined' && window.__sceneItems ? window.__sceneItems[ref] : null;
  return own || (typeof animItem === 'function' ? animItem(ref) : null);
}
/** The key a host's timeline and renderer are kept under (the continuity key + the ref). */
function _schKey(el) { return (typeof animSceneKey === 'function' ? animSceneKey(el) : '') + '|' + el.getAttribute('data-anim'); }
/** Seconds since the key started, without the time the tab was hidden. */
function _schTime(rec) {
  const ak = typeof _ascKeys !== 'undefined' && typeof animSceneKey === 'function' ? _ascKeys.get(animSceneKey(rec.el)) : null;
  if (ak && typeof _ascNow === 'function') return Math.max(0, (_ascNow() - ak.t0) / 1000);
  let t0 = _schT0.get(rec.key);
  if (t0 == null) { t0 = _schNowMs() - _schHiddenMs; _schT0.set(rec.key, t0); }
  return Math.max(0, (_schNowMs() - _schHiddenMs - t0) / 1000);
}
/** The sky a host draws: data-sc-sky "off" (the authored moment), "ms,lat,lon" (a fixed moment for QA) or live (the clock). */
function _schSky(rec, data) {
  const attr = rec.el.getAttribute('data-sc-sky') || '';
  if (attr === 'off' || typeof almSceneLight !== 'function') return null;
  const now = typeof Clock !== 'undefined' && Clock.now ? Clock.now() : Date.now();   // clock-ok: the scene's sky follows the app clock
  const fx = /^(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)$/.exec(attr);
  // a moment far from now (a sheet at --at, a test) stays fixed; a moment near now is the live sky and moves on
  if (fx && Math.abs(+fx[1] - now) > 600000) return almSceneLight(+fx[1], +fx[2], +fx[3], 'UTC');
  let lat = NaN, lon = NaN, tz;
  try {
    const ctx = typeof animCtx === 'function' ? animCtx() : null;
    if (ctx) { lat = Number.isFinite(ctx.ukLat) ? ctx.ukLat : ctx.lat; lon = Number.isFinite(ctx.ukLon) ? ctx.ukLon : ctx.lon; tz = ctx.tz; }
  } catch (e) { /* no location: the scene's own place */ }
  if (fx && !Number.isFinite(lat)) { lat = +fx[2]; lon = +fx[3]; }
  if (!Number.isFinite(lat)) { const v = data.view || {}; lat = v.lat; lon = v.lon; }
  const sky = almSceneLight(now, lat, lon, typeof Clock !== 'undefined' && Clock.zone ? Clock.zone() : tz);
  if (sky && typeof _bf !== 'undefined' && _bf.weather && _bf.weather.ok && _bf.weather.current) {
    const w = _bf.weather, c = w.current, mph = /mp/i.test((w.units && w.units.wind) || '');
    sky.wx = { cond: c.cond, wind: Number.isFinite(c.wind) ? c.wind * (mph ? 1.609 : 1) : null, temp: c.temp };
  }
  return sky;
}
/** The light and season for a host now. */
function _schLight(rec) {
  const data = rec.data, sky = _schSky(rec, data), o = sky ? { sky } : {};
  const fixedSeason = rec.el.getAttribute('data-sc-season');
  if (fixedSeason) o.season = fixedSeason;
  const season = _scSeasonOf(data, o);
  const at = rec.el.getAttribute('data-sc-at');
  const view = Object.assign({}, data.view || {}, { season, at: at || data.at || (data.view && data.view.at) });
  // v2 scenes and v1 scenes with effects: the v2 light (7.5) with the weather override; every other scene exactly as before
  if (_schIsV2(data) && typeof sceneLightV2 === 'function') {
    const wx = _schWx(rec);
    if (wx != null) o.wx = wx;
    return { L: sceneLightV2(o, view, data), season };
  }
  return { L: typeof sceneLight === 'function' ? sceneLight(o, view) : null, season };
}
/** Is this data lit with sceneLightV2? A v2 camera, or v1 effects (fx). */
function _schIsV2(data) {
  if (!data) return false;
  if (typeof sceneAtmosIsV2 === 'function' && sceneAtmosIsV2(data)) return true;
  return !!(data.fx && typeof data.fx === 'object' && Object.keys(data.fx).length);
}
/** The host's weather override: data-sc-wx ('rain', 'snow', ... or a JSON object), else null (the scene's own weather). */
function _schWx(rec) {
  const a = rec.el.getAttribute('data-sc-wx');
  if (!a) return null;
  if (a.charAt(0) === '{') { try { const o = JSON.parse(a); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
  return /^[a-z]{2,12}$/.test(a) ? a : null;
}
/** ?scenefx=2 in the page address: every v2 effect on the v1 scenes in the animation gallery (14.2; review only). */
const SCENE_FX_ALL = Object.freeze({ shadows: 2, water: 2, atmos: 2, weather: 2 });
function _schFxPreview(el, data) {
  if (!data || (typeof sceneAtmosIsV2 === 'function' && sceneAtmosIsV2(data)) || data.fx) return data;
  let on = false;
  try { on = typeof location !== 'undefined' && /(?:[?&#]|^)scenefx=2(?:&|$)/.test(String(location.search || '') + '&' + String(location.hash || '').replace(/^#/, '')); } catch (e) { on = false; }
  if (!on || !el || typeof el.closest !== 'function' || !el.closest('.apg')) return data;
  return Object.assign({}, data, { fx: SCENE_FX_ALL });
}
/** Should this host be animating right now? */
function _schShouldPlay(rec) {
  const el = rec.el, c = el.classList;
  if (rec.still || rec.fallback || document.hidden) return false;
  if (c.contains('is-offscreen') || c.contains('is-held') || c.contains('is-rested')) return false;
  if (document.documentElement.classList.contains('anim-paused')) return false;
  return c.contains('is-live') || rec.hovering;
}
function _schUpdate(rec) {
  if (!rec.r) return;
  const play = _schShouldPlay(rec);
  if (play && !rec.r.running) rec.r.start();
  else if (!play && rec.r.running) { rec.r.stop(); if (rec.hoverOnly && !rec.hovering) rec.r.frame(0); }
}
/** Replace a host's canvas with the SVG still: nothing is ever left blank. */
function _schFallback(rec, err) {
  rec.fallback = true;
  if (rec.r) { try { rec.r.destroy(); } catch (e) { /* gone */ } rec.r = null; }
  try {
    const size = (/\bsz-([a-z]+)/.exec(rec.el.className) || [])[1] || 'fill';
    rec.el.innerHTML = `<svg class="as ap-svg sc-fallback" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${sceneSvg(rec.data || rec.item, { size, reduced: true })}</svg>`;
  } catch (e) { /* the placeholder gradient stays */ }
  rec.el.classList.add('sc-ready', 'sc-svg-fallback');
  if (err && typeof console !== 'undefined') console.warn('scene canvas fell back to SVG:', rec.ref, err && err.message);
}
function _schEnsureInit() {
  if (_schInit || typeof document === 'undefined') return;
  _schInit = true;
  if (typeof ResizeObserver === 'function') _schRO = new ResizeObserver((es) => {
    for (const e of es) {
      const rec = _schHosts.get(e.target);
      if (!rec || !rec.r) continue;
      const w = e.contentRect.width, h = e.contentRect.height;
      if (!w || !h) continue;
      clearTimeout(rec.rt);
      if (rec.lazy) continue;
      if (!rec.r.baked) { if (!rec.r.baking) rec.r.resize(w, h); continue; }
      rec.rt = setTimeout(() => { if (rec.r) rec.r.resize(w, h); }, _SCH_RESIZE_MS);
    }
  });
  if (typeof IntersectionObserver === 'function') _schIO = new IntersectionObserver((es) => {
    for (const e of es) {
      e.target.classList.toggle('is-offscreen', !e.isIntersecting);
      const rec = _schHosts.get(e.target);
      if (!rec) continue;
      if (rec.lazy && e.isIntersecting) _schWake(rec);
      _schUpdate(rec);
    }
  });
  new MutationObserver((list) => {
    let added = false, removed = false;
    for (const m of list) {
      if (m.type === 'childList') { if (m.addedNodes.length) added = true; if (m.removedNodes.length) removed = true; continue; }
      const t = m.target;
      if (t === document.documentElement) { for (const rec of _schHosts.values()) _schUpdate(rec); continue; }
      const rec = _schHosts.get(t);
      if (rec) _schUpdate(rec);
    }
    if (removed) _schSweep();
    if (added) sceneHostScan(document);
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) _schHiddenAt = _schNowMs();
    else if (_schHiddenAt) { _schHiddenMs += _schNowMs() - _schHiddenAt; _schHiddenAt = 0; }
    for (const rec of _schHosts.values()) _schUpdate(rec);
  });
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { for (const rec of _schHosts.values()) { rec.still = rec.stillAttr || _schReduced(); _schUpdate(rec); if (rec.still && rec.r) rec.r.frame(0); } }); } catch (e) { /* old browsers */ }
  _schTimer = setInterval(sceneHostRelight, _SCH_RELIGHT_MS);
}
/** Re-light every visible host (the light key decides whether anything is re-baked). */
function sceneHostRelight() {
  for (const rec of _schHosts.values()) {
    if (!rec.r || document.hidden || rec.el.classList.contains('is-offscreen')) continue;
    try { const { L, season } = _schLight(rec); rec.r.setSeason(season); rec.r.setLight(L); } catch (e) { /* keep the current light */ }
  }
}
/** Hosts no longer in the page: stop them and keep them for a re-mount with the same key; destroy them later. */
function _schSweep() {
  const now = _schNowMs();
  for (const [el, rec] of _schHosts) {
    if (el.isConnected) continue;
    _schHosts.delete(el);
    if (_schRO) _schRO.unobserve(el);
    if (_schIO) _schIO.unobserve(el);
    if (rec.r) { rec.r.stop(); _schGone.set(rec.key, { rec, at: now }); }
  }
  for (const [k, g] of _schGone) if (now - g.at > _SCH_FORGET_MS) { _schGone.delete(k); if (g.rec.r) g.rec.r.destroy(); }
  if (_schGone.size) setTimeout(_schSweep, _SCH_FORGET_MS + 100);
}
function _schMount(el) {
  if (_schHosts.has(el)) return;
  const canvas = el.querySelector('canvas.sc-canvas');
  if (!canvas) return;
  const ref = el.getAttribute('data-anim'), item = _schItem(ref);
  if (!item) return;
  const key = _schKey(el), stillAttr = el.getAttribute('data-sc-still') === '1';
  const rec = { el, ref, item, key, data: null, r: null, canvas, still: stillAttr || _schReduced(), stillAttr, hoverOnly: el.getAttribute('data-sc-hover') === '1', hovering: false, fallback: false, rt: 0 };
  _schHosts.set(el, rec);
  _schEnsureInit();
  const gone = _schGone.get(key);
  if (gone && _schNowMs() - gone.at <= _SCH_FORGET_MS && gone.rec.r) {
    // the same scene again (a re-render): take over the renderer and its canvas, so nothing is re-baked
    _schGone.delete(key);
    rec.r = gone.rec.r; rec.data = gone.rec.data;
    if (gone.rec.canvas !== canvas) { canvas.replaceWith(gone.rec.canvas); rec.canvas = gone.rec.canvas; }
    rec.r.attach(rec.canvas);
    // the new markup may carry another sky or season (data-sc-sky / data-sc-season): the renderer re-bakes only when the light key changes
    try { const { L, season } = _schLight(rec); rec.r.setSeason(season); rec.r.setLight(L); } catch (e) { /* keep the current light */ }
  } else {
    try {
      rec.data = _schFxPreview(el, typeof sceneData === 'function' && item.composed ? sceneData(item) : _scDataOf(item));
      const { L, season } = _schLight(rec);
      const lod = Number(el.getAttribute('data-sc-lod')) || 1;
      const so = typeof window !== 'undefined' && window.__sceneOpts ? window.__sceneOpts : {}, flush = so.flush || false, profile = !!so.profile;
      rec.r = sceneRendererCreate(canvas, rec.data, { lod, still: rec.still, season, L, time: () => _schTime(rec), flush, profile, onBaked: () => el.classList.add('sc-ready') });
      // a live scene (the opening, the gallery stage, the Home card) bakes at once; tiles and stills bake in idle slices
      // once they are on screen, so a page of gallery tiles never blocks the main thread
      rec.lazy = !(el.classList.contains('is-live') && !rec.still);
      if (!rec.lazy) {
        const b = el.getBoundingClientRect();
        if (b.width && b.height) rec.r.resize(b.width, b.height);
        rec.r.frame(_schTime(rec));
      } else if (!_schIO) _schWake(rec);
    } catch (e) { _schFallback(rec, e); return; }
  }
  if (rec.r && rec.r.baked) el.classList.add('sc-ready');
  if (_schRO) _schRO.observe(el);
  if (_schIO) _schIO.observe(el);
  if (rec.hoverOnly) {
    el.addEventListener('pointerenter', () => { rec.hovering = true; _schUpdate(rec); });
    el.addEventListener('pointerleave', () => { rec.hovering = false; _schUpdate(rec); });
  }
  _schUpdate(rec);
}
/** A lazy host comes on screen: its first bake, in idle slices. */
function _schWake(rec) {
  if (!rec.lazy || !rec.r) return;
  rec.lazy = false;
  const b = rec.el.getBoundingClientRect();
  rec.r.bakeIdle(b.width || 320, b.height || 180);
}
/** Mount every composed host under root now (the observer does this by itself; tools and tests call it directly). */
function sceneHostScan(root) {
  if (typeof document === 'undefined' || typeof sceneCanvasSupported !== 'function' || !sceneCanvasSupported()) return 0;
  root = root || document;
  const list = [];
  if (root.matches && root.matches('.ap-composed[data-anim]')) list.push(root);
  if (root.querySelectorAll) list.push(...root.querySelectorAll('.ap-composed[data-anim]'));
  for (const el of list) if (el.isConnected) _schMount(el);
  return list.length;
}
/**
 * Preview a host at another moment, weather or season (V2 8.1; the editor's environment panel, the gallery, the console),
 * without changing the scene: o.at: a time (ms or an ISO string: that moment's live sky at the scene's place), a moment
 * name ('dawn' ... 'night': the authored moment) or null (back to the host's own sky); o.wx: a weather kind or object
 * ({ kind, intensity, wind, ... }), or null (the scene's own); o.season: a season or null. Only the keys given change.
 * The renderer re-bakes in idle slices when the light key changes. Returns true when el is a mounted scene host.
 */
function sceneHostSet(el, o) {
  o = o || {};
  const rec = el ? _schHosts.get(el) : null;
  if (!el || typeof el.setAttribute !== 'function') return false;
  const set = (k, v) => { if (v == null || v === '') el.removeAttribute(k); else el.setAttribute(k, String(v)); };
  if ('at' in o) {
    const at = o.at, data = rec && rec.data ? rec.data : {}, v = data.view || {}, cam = data.camera || {};
    const lat = Number.isFinite(cam.lat) ? cam.lat : v.lat || 0, lon = Number.isFinite(cam.lon) ? cam.lon : v.lon || 0;
    const ms = typeof at === 'number' ? at : typeof at === 'string' && /^\d{4}-\d\d-\d\d/.test(at) ? Date.parse(at) : NaN;
    if (Number.isFinite(ms)) { set('data-sc-sky', Math.round(ms) + ',' + lat + ',' + lon); set('data-sc-at', null); }
    else if (typeof at === 'string' && typeof SCENE_MOMENTS !== 'undefined' && SCENE_MOMENTS.includes(at)) { set('data-sc-sky', 'off'); set('data-sc-at', at); }
    else if (at == null) { set('data-sc-sky', null); set('data-sc-at', null); }
  }
  if ('wx' in o) set('data-sc-wx', o.wx == null ? null : typeof o.wx === 'object' ? JSON.stringify(o.wx) : o.wx);
  if ('season' in o) set('data-sc-season', o.season && /^(spring|summer|autumn|winter)$/.test(o.season) ? o.season : null);
  if (!rec || !rec.r) return !!rec;
  try { const { L, season } = _schLight(rec); rec.r.setSeason(season); rec.r.setLight(L); } catch (e) { /* keep the current light */ }
  return true;
}
/** Resolves (with the number of hosts) once every mounted, on-screen host has drawn its first frame (with its raster images) or fallen back (at most 15 s). */
function sceneHostReady() {
  const t0 = _schNowMs();
  return new Promise((res) => {
    const check = () => {
      sceneHostScan(document);
      const list = [..._schHosts.values()];
      // a raster object still decoding counts as not ready (its renderer bakes again once the image is decoded)
      const waiting = list.filter(r => !r.fallback && r.r && (!r.r.baked || r.r.waiting) && !r.el.classList.contains('is-offscreen'));
      if (!waiting.length || _schNowMs() - t0 > 15000) { res(list.filter(r => (r.r && r.r.baked) || r.fallback).length); return; }
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(check); else setTimeout(check, 16);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(check)); else setTimeout(check, 0);
  });
}
if (typeof window !== 'undefined') {
  window.__sceneStats = () => [..._schHosts.values()].filter(r => r.r).map(r => Object.assign({ ref: r.ref, playing: r.r.running }, r.r.stats()));
  window.__sceneStatsReset = () => { for (const r of _schHosts.values()) if (r.r) r.r.resetStats(); };
  /** Tools (scene perf --rebake): put every host at a fixed moment (ms) and re-light it now (a re-bake in idle slices when the light key changes). */
  window.__sceneForceSky = (ms) => { for (const r of _schHosts.values()) { const v = (r.data && r.data.view) || {}; r.el.setAttribute('data-sc-sky', Math.round(ms) + ',' + (v.lat || 0) + ',' + (v.lon || 0)); } sceneHostRelight(); };
  if (typeof document !== 'undefined' && document.documentElement && typeof MutationObserver === 'function') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => sceneHostScan(document));
    else setTimeout(() => sceneHostScan(document), 0);
    _schEnsureInit();
  }
}
