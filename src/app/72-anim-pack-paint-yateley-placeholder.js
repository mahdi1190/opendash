/* ============================================================
   PACK paint-yateley-placeholder: a painted scene (docs/dev/PAINTED_SCENES.md; the scene is 71-scene-paint-yateley-placeholder.js). In the gallery; set the
   items' when (see 72-anim-pack-proof-yateley-green.js) to put it in the daily rotation for its place.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function' || !sceneItems("paint-yateley-placeholder").length) return;
  animRegisterPack({ id: "paint-yateley-placeholder", name: "Yateley Green (painted placeholder)", description: 'A painted scene: one painting of the place, animated by the engine.', version: '1.0.0', items: sceneItems("paint-yateley-placeholder") });
})();
