/* ============================================================
   SCENE LIBRARY: three-quarter views of the path movers defined in files that sort AFTER 70-scene-lib-mover-views.js
   (the proof packs, the canal and pond kits). docs/dev/SCENE_ENGINE_V2.md 4.3: a mover faces its ground heading; an object
   with no head-on view falls back to its nearest three-quarter view, which is still turned the right way.
   PURE: sceneObjDefine calls only (sceneMoverViews.foreshorten squeezes the side drawing along its length).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneObj !== 'function' || typeof sceneMoverViews === 'undefined') return;
  const MV = sceneMoverViews;
  const Q = [
    ['bird.wp-heron-stalk', { headPart: 'neck', lift: 2, k: 0.55 }], ['bird.proof-heron-stalk', { headPart: 'neck', lift: 2, k: 0.55 }],
    ['bird.proof-duckling', { headPart: 'head', lift: 1, k: 0.6 }], ['animal.proof-dog-ball', { headPart: 'head', lift: 1.4, k: 0.55 }],
    ['animal.squirrel', { headPart: 'head', lift: 1, k: 0.6 }], ['boat.dinghy', { k: 0.5 }],
  ];
  for (const [id, o] of Q) {
    const sd = sceneObj(id);
    if (!sd) continue;
    const hp = o.headPart && (sd.parts || []).includes(o.headPart) ? o.headPart : undefined;
    const qf = MV.foreshorten(id, Object.assign({}, o, { id: id + '-qfront', headPart: hp })), qb = MV.foreshorten(id, Object.assign({}, o, { id: id + '-qback', away: true, headPart: hp }));
    if (qf) sceneObjDefine(qf);
    if (qb) sceneObjDefine(qb);
    MV.link(id, { 'q-front': id + '-qfront', 'q-back': id + '-qback', q: id + '-qfront' });
  }
})();
