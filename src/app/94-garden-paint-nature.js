/* Painted nature: one front door for the vale's painted water
 * (94-garden-paint-water-*.js) and woods (94-garden-paint-wood-*.js), called
 * by the world renderer (94-garden-native-world.js) when the Painted village
 * style is on. paint() after the ground is drawn, tick() once a frame with the
 * camera's world rectangle, clear() with the ground. Nothing runs at load. */
window.GardenPaintNature = (function () {
  'use strict';
  let lastError = null, on = false;
  const parts = () => [window.GardenPaintWater, window.GardenPaintWood, window.GardenPaintVale].filter(Boolean);   // the vale: quay, ruins, crossings, plazas, orchard, mainland (94-garden-paint-vale-*.js)
  // The water is drawn from the layout alone (its shapes, the season, the time of
  // day), so a repaint for anything else (a gate opening, a plant) keeps it: the
  // world releases it first (release()), and paint() takes it back when nothing
  // it is drawn from has changed. Re-baking it in one go froze a gate opening.
  // The woods and the vale are repainted (the vale keeps its composition and baked textures).
  let waterKey = null, held = false;
  const others = () => [window.GardenPaintWood, window.GardenPaintVale].filter(Boolean);
  function paint(scene, root, objects, info) {
    const W = window.GardenPaintWater, key = [scene, root, objects, info && info.data, info && info.season, info && info.tod];
    const keep = held && on && waterKey && W && key.every((v, i) => v === waterKey[i]); held = false;
    if (keep) { for (const p of others()) try { p.clear(); p.paint(scene, root, info, objects); } catch (e) { lastError = String(e && e.stack || e); } return; }
    clear(); on = !!(W && W.wanted()) && !window.__gpnOff; if (!on) return;
    for (const p of parts()) try { p.paint(scene, root, info, objects); } catch (e) { lastError = String(e && e.stack || e); }
    waterKey = key;
  }
  /** Before a repaint: the woods go now, the water waits to see if paint() wants it back. */
  function release() { if (!on) return clear(); for (const p of others()) try { p.clear(); } catch (e) { lastError = String(e && e.stack || e); } held = true; }
  /** After a repaint: water nobody took back goes too. */
  function settle() { if (held) clear(); }
  function tick(time, view) { if (!on) return; for (const p of parts()) try { p.tick(time, view); } catch (e) { lastError = String(e && e.stack || e); } }
  function clear() { for (const p of parts()) try { p.clear(); } catch (e) { lastError = String(e && e.stack || e); } on = false; held = false; waterKey = null; }
  function status() { return { on, water: window.GardenPaintWater ? GardenPaintWater.status() : null, wood: window.GardenPaintWood ? GardenPaintWood.status() : null, vale: window.GardenPaintVale ? GardenPaintVale.status() : null, lastError }; }
  /** The world asks before drawing its own forest tree at world px (x, y). */
  function covers(W, x, y) { try { return !!(window.GardenPaintWood && window.GardenPaintWater && GardenPaintWater.wanted() && GardenPaintWood.covers(x / W.cellW, (y - W.sky) / W.cellH)); } catch (e) { return false; } }
  return { paint, tick, clear, release, settle, status, covers };
})();
