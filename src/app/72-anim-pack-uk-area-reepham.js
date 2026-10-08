/* ============================================================
   ANIMATION PACK "uk-area-reepham": Reepham, Norfolk, as composed scenes
   (docs/dev/SCENE_ENGINE.md 3 and 8): the Market Place, the churches in one
   churchyard, the Marriott's Way, the old station and the lanes and fields
   round the town. PURE classic script. The scenes are data rows
   (71-scene-uk-reepham-1.js) built by the broadland-village archetype
   (71-scene-uk-reepham-0arch.js) from the library (70-scene-lib-area-reepham.js
   and the shared kits). Each scene is ONE auto-season composed scene: the date
   picks the season, the live sky the light. Every item is a normal Norfolk
   county item of the UK East of England region, so the opening, the gallery,
   pins and the rotation treat it like the rest.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function') return;
  const county = 'norfolk', NATION = 'GB-ENG', NAME = 'Norfolk';
  const REGION = typeof ukCounty === 'function' && ukCounty(county) ? ukCounty(county).region : 'east';
  const items = sceneItems('uk-area-reepham').map(it => {
    const kind = it.ukKind || 'landscape';
    return Object.assign(it, {
      mood: it.mood || 'calm', intensity: it.intensity || 'subtle', region: [NATION], priority: 1,
      county, ukRegion: REGION, ukKind: kind, signature: false, ukArea: 'reepham', ukTown: 'Reepham', ukLocality: 'Reepham',
      label: it.label + ', ' + NAME,
      tags: ['uk', 'east of england', NAME.toLowerCase(), kind].concat(it.tags || []),
      when: (day, ctx) => !!ctx && !!ctx.county && ctx.county === county,
    });
  });
  animRegisterPack({ id: 'uk-area-reepham', name: 'UK: Reepham, Norfolk', version: '1.0.0',
    description: 'Composed, living scenes of Reepham: the Georgian Market Place, the two churches in one churchyard, the Marriott\'s Way and the old station, and the lanes and fields round the town, in four seasons under the live sky.', items });
})();
