/* ============================================================
   ANIMATION PACK "uk-area-wokingham": Wokingham, Berkshire, as composed scenes
   (docs/dev/SCENE_ENGINE.md 3 and 8): the Town Hall and the Market Place,
   Broad Street and Rose Street, All Saints' Church, the station and its level
   crossing, Elms Field, the lakes of Dinton Pastures, the pine woods of
   California Country Park and the Finchampstead Ridges, and the farmland and
   railway of the Loddon valley. PURE classic script.
   The scenes are data rows (71-scene-uk-wokingham-1.js) built by two
   archetypes (71-scene-uk-wokingham-0arch.js) from the library
   (70-scene-lib-area-wokingham.js and the shared kits). Each scene is ONE
   auto-season composed scene: the date picks the season, the live sky the light.
   Every item is a normal Berkshire county item of the UK South East region, so
   the opening, the gallery, pins and the rotation treat it like the rest; it
   plays in Berkshire (Wokingham is in the county's town list).
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const county = 'berkshire', NATION = 'GB-ENG', NAME = 'Berkshire';
  const REGION = typeof ukCounty === 'function' && ukCounty(county) ? ukCounty(county).region : 'south-east';
  const items = sceneItems('uk-area-wokingham').map(it => {
    const kind = it.ukKind || 'landscape';
    return Object.assign(it, {
      mood: it.mood || 'calm', intensity: it.intensity || 'subtle', region: [NATION], priority: 1,
      county, ukRegion: REGION, ukKind: kind, signature: false, ukArea: 'wokingham', ukTown: 'Wokingham', ukLocality: 'Wokingham',
      label: it.label + ', ' + NAME,
      tags: ['uk', REGION.replace(/-/g, ' '), NAME.toLowerCase(), kind].concat(it.tags || []),
      when: (day, ctx) => !!ctx && !!ctx.county && ctx.county === county,
    });
  });
  // Below the bar (the composed lint and the tile budget fail them; the batch-2 run was stopped before they were fixed):
  // drafts, kept in the source and NOT registered until they are migrated to v2 and pass (docs/dev/SCENE_ENGINE_V2.md 29,
  // "Later stages"; integration, 8 Oct). Remove an id here once its scene passes `scene lint --strict-placement`.
  const DRAFTS = new Set(["berkshire-wokingham-elms-field","berkshire-dinton-pastures-lake","berkshire-wellingtonia-avenue","berkshire-california-pine-heath"]);
  for (let k = items.length - 1; k >= 0; k--) if (DRAFTS.has(items[k].id)) items.splice(k, 1);
  animRegisterPack({ id: 'uk-area-wokingham', name: 'UK: Wokingham', version: '1.0.0',
    description: 'Composed, living scenes of Wokingham: the Town Hall and the Market Place, the Georgian streets, All Saints\', the station and its level crossing, Elms Field, Dinton Pastures, the pine woods and the Berkshire farmland, in four seasons under the live sky.', items });
})();
