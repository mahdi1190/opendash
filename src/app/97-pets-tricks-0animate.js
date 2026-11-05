/* Keep native WAAPI ownership (including finished, pause, finish and cancel).
 * The optional garden renderer tracks only these explicitly supplied targets;
 * it must use animation events, not replace callers' onfinish/oncancel handlers.
 * No frame loop or scene traversal belongs in this compatibility helper. */
function gardenVisualAnimate(target, keyframes, timing) {
  const animation = target.animate(keyframes, timing);
  if (gardenVisualIsNative(target)) return animation;
  try {
    const engine = typeof window !== 'undefined' && window.GardenPhaser;
    if (engine && typeof engine.trackAnimation === 'function') {
      const keys = new Set();
      for (const frame of Array.isArray(keyframes) ? keyframes : [keyframes]) if (frame && typeof frame === 'object') for (const key of Object.keys(frame)) keys.add(key === 'transform-origin' ? 'transformOrigin' : key);
      const properties = ['transform', 'translate', 'rotate', 'scale', 'opacity', 'transformOrigin'].filter(key => keys.has(key));
      if (properties.length) engine.trackAnimation(target, animation, properties);
    }
  } catch (e) { /* the native animation still plays on the standard view */ }
  return animation;
}
function gardenVisualIsNative(target) { return !!(target && window.GardenNativeArt && target instanceof GardenNativeArt.Node); }
function gardenVisualStyle(target, property) { return gardenVisualIsNative(target) ? target.style[property] || (property === 'translate' ? '0 0' : property === 'opacity' ? '1' : 'none') : getComputedStyle(target)[property]; }

/* CSS hush and the timed stopped-clock freeze also apply to retained ambient
 * motion. Keep the logical state on its own SVG so a late engine mount can
 * recover it without changing native Animation ownership or gameplay clocks. */
function gardenVisualAmbientPause(svg) {
  if (!svg) return;
  try {
    if (gardenVisualIsNative(svg)) { if (window.GardenNative && GardenNative.setAmbientPaused) GardenNative.setAmbientPaused({ hush: svg.classList.contains('gd-hush'), frozen: svg.hasAttribute('data-garden-frozen') }); return; }
    const engine = typeof window !== 'undefined' && window.GardenPhaser;
    if (engine && typeof engine.setAmbientPaused === 'function') engine.setAmbientPaused(svg, {
      hush: svg.classList.contains('gd-hush'),
      frozen: svg.hasAttribute('data-garden-frozen'),
    });
  } catch (e) { /* the standard view keeps its native pause behavior */ }
}
