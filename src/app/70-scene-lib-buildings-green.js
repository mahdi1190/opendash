/* ============================================================
   SCENE LIBRARY: buildings-green (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.

   building.green-cottage: the library's building.cottage (70-scene-lib-buildings.js:
   the brick, rendered-and-thatched and tile-hung cottages round Yateley Green) in a
   LIGHT form for views that show them small across the green. The same drawing,
   built lazily from the source (so the two always match), re-flagged for the level
   of detail: the brick courses, thatch and tile-hanging lines (thin strokes) and the
   front-garden shrubs and flowers are detail (fill / hero only); the walls, roofs, chimneys,
   windows (with their night glow) stay at every size. It keeps
   the SVG tile of a view with three cottages under the budget (section 10.2).
   Anchor: the middle of the front wall's foot. Check: object lint building.green-cottage.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneObjShapes !== 'function') return;
  const light = (src, v, season) => {
    const sh = sceneObjShapes(src, v, season), body = [];
    if (!sh) return { body };
    for (const part of sh.order) for (const s of sh.parts[part] || []) {
      const thin = !s.glow && s.s && !s.f && (s.w || 0) <= 1.4;
      const busy = !s.glow && s.f && (s.d.match(/M/g) || []).length > 8;   // the front-garden shrubs and flowers
      body.push({ f: s.f || undefined, s: s.s || undefined, w: s.w || undefined, cap: s.cap || undefined, op: s.op, m: s.m || undefined, glow: s.glow || undefined, d: s.d, detail: !!s.detail || thin || busy });
    }
    return { body };
  };
  sceneObjDefine({
    id: 'building.green-cottage', category: 'building', size: [188, 188], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: { base: {}, spring: {}, summer: {}, autumn: {}, winter: {} },
    parts: ['body'],
    night: { glow: { window: '#ffd98a' }, on: 0.65 },
    shadow: { rx: 100, ry: 10, h: 150 },
    tags: ['uk', 'village', 'green', 'cottage', 'house', 'light', 'kit:temperate', 'role:building-mid'],
    credit: 'the light form of building.cottage (the Yateley Green view art, redrawn)',
    build(v, rnd, ctx) { return light('building.cottage', v, (ctx && ctx.season) || 'summer'); },
  });
})();
