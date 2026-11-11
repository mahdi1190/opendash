/* Painted nature: one front door for the vale's painted water
 * (94-garden-paint-water-*.js) and woods (94-garden-paint-wood-*.js), called
 * by the world renderer (94-garden-native-world.js) when the Painted village
 * style is on. paint() after the ground is drawn, tick() once a frame with the
 * camera's world rectangle, clear() with the ground. Nothing runs at load. */
window.GardenPaintNature = (function () {
  'use strict';
  let lastError = null, on = false;
  const parts = () => [window.GardenPaintWater, window.GardenPaintWood].filter(Boolean);
  function paint(scene, root, objects, info) {
    clear(); on = !!(window.GardenPaintWater && GardenPaintWater.wanted()); if (!on) return;
    for (const p of parts()) try { p.paint(scene, root, info, objects); } catch (e) { lastError = String(e && e.stack || e); }
  }
  function tick(time, view) { if (!on) return; for (const p of parts()) try { p.tick(time, view); } catch (e) { lastError = String(e && e.stack || e); } }
  function clear() { for (const p of parts()) try { p.clear(); } catch (e) { lastError = String(e && e.stack || e); } on = false; }
  function status() { return { on, water: window.GardenPaintWater ? GardenPaintWater.status() : null, wood: window.GardenPaintWood ? GardenPaintWood.status() : null, lastError }; }
  return { paint, tick, clear, status };
})();
