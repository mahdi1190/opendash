/* ============================================================
   PACK scene-demo (docs/dev/SCENE_ENGINE.md section 11): the station archetype over the london-demo table.
   The items appear in the gallery but never in the daily rotation (when is false). Each scene is a
   thunk: nothing is built at load.
   ============================================================ */
(function () {
  if (typeof sceneBatch !== 'function' || typeof sceneArchetype !== 'function' || !sceneArchetype('station')) return;
  animRegisterPack({ id: 'scene-demo', name: 'Scene engine demo', description: 'Composed scenes: one station archetype, three public London stations.', version: '1.0.0', items: sceneBatch('station', 'london-demo', { when: () => false }) });
})();
