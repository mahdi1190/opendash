/* ============================================================
   PACK uk-area-sheffield2: the second set of composed Sheffield scenes (docs/dev/SCENE_ENGINE.md section 3).
   The scenes are rows of the sheffield2-street and sheffield2-dale archetypes
   (71-scene-uk-sheffield2-0arch.js) and of the first set's sheffield-view archetype,
   listed in 71-scene-uk-sheffield2-scenes.js and drawn from the library
   (70-scene-lib-area-sheffield2.js, 70-scene-lib-area-sheffield.js and the shared objects).
   Each item is a normal registry item (sceneItem) with the UK place fields, so county
   detection, nearby pools, pins and the rotation work; the season comes from the date and
   the light from the live sky. Every scene is in Sheffield (county south-yorkshire).
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const COUNTY = 'south-yorkshire', TOWN = 'Sheffield';
  const area = typeof ukCounty === 'function' ? ukCounty(COUNTY) : null;
  if (!area) return;
  const items = sceneItems('uk-area-sheffield2').map((it) => {
    const kind = it.ukKind || 'landmark', base = { county: COUNTY, ukTown: TOWN, ukLocality: TOWN, ukPlace: it.ukPlace, ukView: it.ukView, viewReason: it.viewReason };
    return Object.assign(it, base, {
      id: COUNTY + '-' + it.id, intensity: 'subtle', priority: 1, region: [area.nation], ukRegion: area.region, ukKind: kind, signature: kind === 'signature', ukPart: 'area-sheffield2',
      tags: Array.from(new Set(['uk', area.region.replace(/-/g, ' '), area.name.toLowerCase(), kind].concat(it.tags || []))),
      when: (day, ctx) => !!ctx && !!ctx.county && (ctx.county === COUNTY || (typeof animUkScenePools === 'function' && animUkScenePools([Object.assign({ county: COUNTY }, base)], ctx).nearby.length > 0)),
    });
  });
  // Below the bar (the composed lint and the tile budget fail them; the batch-2 run was stopped before they were fixed):
  // drafts, kept in the source and NOT registered until they are migrated to v2 and pass (docs/dev/SCENE_ENGINE_V2.md 29,
  // "Later stages"; integration, 8 Oct). Remove an id here once its scene passes `scene lint --strict-placement`.
  const DRAFTS = new Set(["south-yorkshire-general-cemetery-gate","south-yorkshire-abbeydale-water-wheel"]);
  for (let k = items.length - 1; k >= 0; k--) if (DRAFTS.has(items[k].id)) items.splice(k, 1);
  animRegisterPack({ id: 'uk-area-sheffield2', name: 'UK: Sheffield (more)', version: '1.0.0', css: '',
    description: 'More composed Sheffield scenes: Division Street, West Street and Ecclesall Road by day and night, the Kelham and Neepsend pubs, the Moor Market, Bramall Lane on match day, Meadowhall, the Crucible and the Lyceum, Sheaf Square and the station, Weston Park, Hillsborough Park, the General Cemetery, the Rivelin valley, Forge Dam, Wardsend and Abbeydale Industrial Hamlet, with the live sky and four seasons.', items });
})();
