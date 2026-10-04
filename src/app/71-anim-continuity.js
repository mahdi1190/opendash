/* ============================================================
   SCENE CONTINUITY (shared; owner: Brief + Review, used by every area).
   render() rebuilds the DOM after every save, live-sync update or
   selection, so each animated scene would restart its loop from the first
   frame (and once-only motion, like the urgent nudge, would play again).
   CLAUDE.md: entrance animations play once per entry, never on re-renders.

   So a scene's timeline belongs to a KEY, not to the element: when a scene
   becomes live (.is-live, animActivate in 74-brief-ui.js, or markup that
   already carries it) it gets --as-t = how long that key has been playing,
   and 76-scenes.css turns it into a negative animation-delay. A rebuilt
   scene carries on exactly where the old one was; finished once-only
   motion stays finished.
     key = nearest [data-scene-key] or [data-id] + scene type + size
     (put data-scene-key="<item id>" on a wrapper when the item has no
     data-id ancestor).
   A key starts fresh on a real entry: when state.view changes, or when its
   scene has been gone for a few seconds (a card closed and opened again).
   The hover badge (.anim-tip), celebrations (.anim-pop) and the story
   player (.story) always start fresh. Time the tab spends hidden
   (html.anim-paused) is not counted.
   ============================================================ */
const _ASC_FORGET_MS = 2500;
const _ascKeys = new Map();          // key -> {t0, el, goneAt}
const _ascStamped = new WeakSet();   // live scenes already given their --as-t
let _ascView = null, _ascHiddenAt = 0, _ascSkyHidden = 0;   // _ascSkyHidden: ms the tab spent hidden (the sky clock pauses with it)

function _ascNow() {
  const t = document.timeline && document.timeline.currentTime;
  return typeof t === 'number' ? t : performance.now();
}
/** The key a scene's timeline is kept under (see above). */
function animSceneKey(el) {
  const host = el.closest('[data-scene-key], [data-id]');
  const id = host ? (host.getAttribute('data-scene-key') || host.getAttribute('data-id') || '') : '';
  const sz = /\bsz-([a-z]+)/.exec(el.getAttribute('class') || '');
  return id + '|' + (el.getAttribute('data-scene') || '') + '|' + (sz ? sz[1] : '');
}
function _ascStamp(el, now) {
  _ascStamped.add(el);
  if (el.closest('.anim-tip, .anim-pop, .story')) return;      // overlays and the story player run their own timing
  const key = animSceneKey(el);
  let e = _ascKeys.get(key);
  if (!e) { e = { t0: now, el, goneAt: 0 }; _ascKeys.set(key, e); }
  else { e.el = el; e.goneAt = 0; }
  const age = now - e.t0;
  if (age > 0) el.style.setProperty('--as-t', (age / 1000).toFixed(3) + 's');
  else el.style.removeProperty('--as-t');
}
// A sky scrolled out of view pauses its loops (77-sky-ambient.css .is-offscreen).
let _ascIO = null;
const _ascSkies = new Set();
function _ascSkyIO(sky) {
  if (typeof IntersectionObserver !== 'function') return;
  if (!_ascIO) _ascIO = new IntersectionObserver((es) => { for (const e of es) e.target.classList.toggle('is-offscreen', !e.isIntersecting); });
  for (const s of _ascSkies) if (!s.isConnected) { _ascIO.unobserve(s); _ascSkies.delete(s); }
  _ascSkies.add(sky);
  _ascIO.observe(sky);
}
function _ascSweep() {
  let view = '';
  // Keys start fresh on a SECTION change only: a sub move (person A to B, a Settings group,
  // a Review tab, a calendar mode) keeps the scenes that stay on screen running (C7).
  try { view = typeof navSectionOf === 'function' ? navSectionOf(state.view) : String(state.view || ''); } catch (e) { view = ''; }
  if (view !== _ascView) { _ascView = view; _ascKeys.clear(); }
  const now = _ascNow();
  // Weather skies run on one session clock: a rebuilt sky (a save, a re-click, live sync) gets
  // --sky-t = the time since the page loaded, and 74-brief.css subtracts it from every layer's
  // delay, so the stars, clouds and rain carry on where they were instead of restarting (C5).
  for (const sky of document.querySelectorAll('.bf-sky:not([data-sky-t]), .tc-hero-bg:not([data-sky-t])')) {
    sky.setAttribute('data-sky-t', '');
    sky.style.setProperty('--sky-t', ((now - _ascSkyHidden) / 1000).toFixed(3) + 's');
    if (sky.classList.contains('bf-sky')) _ascSkyIO(sky);
  }
  for (const [k, e] of _ascKeys) {
    if (e.el.isConnected) { e.goneAt = 0; continue; }
    if (!e.goneAt) e.goneAt = now;
    else if (now - e.goneAt > _ASC_FORGET_MS) _ascKeys.delete(k);
  }
  for (const el of document.querySelectorAll('.anim-scene.is-live')) if (!_ascStamped.has(el)) _ascStamp(el, now);
}
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.documentElement) {
  new MutationObserver((list) => {
    let run = false;
    for (const m of list) {
      if (m.type === 'childList') { run = true; continue; }
      const t = m.target;
      if (t.classList && t.classList.contains('anim-scene')) {
        run = true;
        if (!t.classList.contains('is-live')) _ascStamped.delete(t);   // live again later: stamped again
      }
    }
    if (run) _ascSweep();
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { _ascHiddenAt = _ascNow(); return; }
    if (!_ascHiddenAt) return;
    const away = _ascNow() - _ascHiddenAt;     // the scenes were paused that long: shift every key with them
    _ascHiddenAt = 0;
    _ascSkyHidden += away;
    for (const e of _ascKeys.values()) e.t0 += away;
  });
}
