/* ============================================================
   PACK raster-demo (docs/dev/OBJECT_IMPORT.md, "The demo"): one composed scene built from image-backed (raster) library
   objects. In the gallery, never in the daily rotation (when is false).
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || !sceneItems('raster-demo').length) return;
  animRegisterPack({ id: 'raster-demo', name: 'Raster object demo', description: 'A composed scene from objects imported as images and AI sprite sheets.', version: '1.0.0', items: sceneItems('raster-demo') });
})();
