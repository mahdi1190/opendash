/* ============================================================
   PACK uk-area-sheffield: the composed Sheffield scenes (docs/dev/SCENE_ENGINE.md section 3).
   The scenes are rows of the sheffield-view archetype (71-scene-uk-sheffield-0arch.js,
   71-scene-uk-sheffield-views.js) drawn from the library (70-scene-lib-area-sheffield.js and the
   shared objects). Like the composed Yateley views, each item is a normal registry item
   (sceneItem) with the UK place fields, so county detection, nearby pools, pins and the rotation
   work; the season comes from the date and the light from the live sky.
   The rebuilt items keep the ids, places, views and captions of the old hand-drawn Sheffield
   studies (uk-north-west: south-yorkshire-diamond, -diamond-2, -arts-tower, -arts-tower-2,
   -winter-garden, -winter-garden-2, -kelham, -kelham-2).
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const COUNTY = 'south-yorkshire', TOWN = 'Sheffield';
  const area = typeof ukCounty === 'function' ? ukCounty(COUNTY) : null;
  if (!area) return;
  const items = sceneItems('uk-area-sheffield').map((it) => {
    const kind = it.ukKind || 'landmark', base = { county: COUNTY, ukTown: TOWN, ukLocality: TOWN, ukPlace: it.ukPlace, ukView: it.ukView, viewReason: it.viewReason };
    return Object.assign(it, base, {
      id: COUNTY + '-' + it.id, intensity: 'subtle', priority: 1, region: [area.nation], ukRegion: area.region, ukKind: kind, signature: kind === 'signature', ukPart: 'area-sheffield',
      tags: Array.from(new Set(['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind].concat(it.tags || []))),
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([Object.assign({ county: COUNTY }, base)], ctx).nearby.length > 0)),
    });
  });
  animRegisterPack({ id: 'uk-area-sheffield', name: 'UK: Sheffield', version: '1.0.0', css: '',
    description: 'Composed Sheffield scenes: the Arts Tower, the Diamond, the Winter Garden and Peace Gardens, Kelham Island, Park Hill, the Supertram, the Botanical Gardens and Endcliffe Park, with the live sky and four seasons.', items });
})();
